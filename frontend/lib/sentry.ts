export function captureApiError(error: any, context?: string) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Passport]', context || 'API Error', error)
  }
}

export function initSentry() {
  // Sentry disabled by default. Set NEXT_PUBLIC_SENTRY_DSN to enable.
}
