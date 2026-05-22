const exportRateMap = new Map<string, { count: number; resetAt: number }>()
const MAX_EXPORTS_PER_HOUR = 5
const WINDOW_MS = 60 * 60 * 1000

export function checkExportRateLimit(orgId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = exportRateMap.get(orgId)

  if (!entry || now > entry.resetAt) {
    exportRateMap.set(orgId, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= MAX_EXPORTS_PER_HOUR) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}
