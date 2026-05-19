import { Resend } from 'resend'
import { log } from './logger.js'

let resendInstance: Resend | null = null

function getResend(): Resend | null {
  if (resendInstance) return resendInstance
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendInstance = new Resend(apiKey)
  return resendInstance
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const isDev = process.env.NODE_ENV !== 'production'

// Rate limiting: max 10 emails/minute per org
interface RateLimitEntry {
  count: number
  resetAt: number
}
const emailRateLimitMap = new Map<string, RateLimitEntry>()

function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, entry] of emailRateLimitMap.entries()) {
    if (now > entry.resetAt) {
      emailRateLimitMap.delete(key)
    }
  }
}

function isRateLimited(orgId: string): boolean {
  cleanupRateLimits()
  const key = `email:${orgId}`
  const now = Date.now()
  const entry = emailRateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    emailRateLimitMap.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 10) {
    return true
  }
  entry.count++
  return false
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  orgId?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, text, orgId } = options

  if (isDev) {
    log.info('[dev] email not sent (console log)', {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      preview: text.substring(0, 200),
    })
    return { success: true }
  }

  if (orgId && isRateLimited(orgId)) {
    log.warn('email rate limit exceeded', { orgId, to: Array.isArray(to) ? to.join(', ') : to, subject })
    return { success: false, error: 'rate_limited' }
  }

  const resend = getResend()
  if (!resend) {
    log.error('RESEND_API_KEY not configured, cannot send email')
    return { success: false, error: 'missing_api_key' }
  }

  let lastError: string | undefined

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text,
      })

      if (result.error) {
        lastError = result.error.message
        log.error('resend error', { attempt, error: result.error.message })
      } else {
        log.success('email sent', { to: Array.isArray(to) ? to.join(', ') : to, subject, attempt })
        return { success: true }
      }
    } catch (e: any) {
      lastError = e.message
      log.error('email send failed', { attempt, error: e.message })
    }

    if (attempt < 3) {
      await sleep(1000 * Math.pow(2, attempt - 1))
    }
  }

  return { success: false, error: lastError || 'send_failed' }
}

// Helpers to resolve org admin emails
export async function getOrgAdminEmails(db: any, orgId: string): Promise<string[]> {
  try {
    const snap = await db.collection('users').where('orgId', '==', orgId).get()
    const emails: string[] = []
    for (const doc of snap.docs) {
      const data = doc.data() as any
      if (data.email) emails.push(data.email)
    }
    // Fallback to org owner if no users found
    if (emails.length === 0) {
      const orgSnap = await db.collection('organizations').doc(orgId).get()
      if (orgSnap.exists) {
        const orgData = orgSnap.data() as any
        if (orgData.ownerId && orgData.ownerId.includes('@')) {
          emails.push(orgData.ownerId)
        }
      }
    }
    return emails
  } catch (e: any) {
    log.error('failed to fetch org admin emails', { orgId, error: e.message })
    return []
  }
}
