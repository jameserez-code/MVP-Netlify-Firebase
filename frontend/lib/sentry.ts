export async function initSentry() {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') return

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  const Sentry = await import('@sentry/browser')
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  })
}

export async function captureApiError(error: Error, context?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') return

  try {
    const Sentry = await import('@sentry/browser')
    Sentry.captureException(error, { extra: context })
  } catch {
    // silently fail if Sentry is not available
  }
}
