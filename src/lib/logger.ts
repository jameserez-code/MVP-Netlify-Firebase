type Level = 'info' | 'warn' | 'error' | 'success'

const PREFIX: Record<Level, string> = {
  info:    '•',
  warn:    '⚠',
  error:   '✗',
  success: '✓',
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

function format(level: Level, message: string, context?: Record<string, unknown>): string {
  const parts = [
    `[${timestamp()}]`,
    PREFIX[level],
    message,
  ]
  if (context) parts.push(JSON.stringify(context))
  return parts.join(' ')
}

export const log = {
  info(msg: string, ctx?: Record<string, unknown>) {
    console.log(format('info', msg, ctx))
  },
  warn(msg: string, ctx?: Record<string, unknown>) {
    console.warn(format('warn', msg, ctx))
  },
  error(msg: string, ctx?: Record<string, unknown>) {
    console.error(format('error', msg, ctx))
  },
  success(msg: string, ctx?: Record<string, unknown>) {
    console.log(format('success', msg, ctx))
  },
}
