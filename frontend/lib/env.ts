export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function validateEnv(): void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    if (isProduction()) {
      throw new Error(
        '[Passport Agent] NEXT_PUBLIC_API_URL is required in production. ' +
          'Set it to your deployed API URL (e.g. https://api.passport-agent.com)'
      )
    } else {
      console.warn(
        '[Passport Agent] NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3000'
      )
    }
  }
}
