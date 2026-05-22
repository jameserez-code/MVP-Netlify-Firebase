import { emailQueue } from '../lib/queue.js'
import { sendEmail } from '../lib/email.js'
import { generateEmail } from '../lib/email-templates.js'
import { log } from '../lib/logger.js'

emailQueue.process(async (job) => {
  const { template, to, data, orgId } = job.data
  try {
    const { subject, html, text } = generateEmail(template, data)
    const result = await sendEmail({ to, subject, html, text, orgId })
    if (!result.success) {
      throw new Error(result.error || 'sendEmail failed')
    }
    return result
  } catch (err: any) {
    log.error('email worker failed', { jobId: job.id, template, to, error: err.message })
    throw err
  }
})

emailQueue.on('failed', async (job, err) => {
  const maxAttempts = (job.opts.attempts as number) || 1
  if (job.attemptsMade >= maxAttempts) {
    log.error('email permanently failed', { jobId: job.id, error: err.message })
    try {
      const { storeDeadLetter } = await import('../lib/dead-letter.js')
      await storeDeadLetter('emails', job)
    } catch (e: any) {
      log.error('failed to store dead letter', { error: e.message })
    }
  }
})
