type Level = 'info' | 'warn' | 'error' | 'success'

const isProduction = process.env.NODE_ENV === 'production'

const PREFIX: Record<Level, string> = {
  info:    '•',
  warn:    '⚠',
  error:   '✗',
  success: '✓',
}

function timestamp(): string {
  return new Date().toISOString()
}

function formatPretty(level: Level, message: string, context?: Record<string, unknown>): string {
  const parts = [
    `[${timestamp().replace('T', ' ').substring(0, 19)}]`,
    PREFIX[level],
    message,
  ]
  if (context) parts.push(JSON.stringify(context))
  return parts.join(' ')
}

function formatJson(level: Level, message: string, context?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: timestamp(),
    level,
    message,
    service: 'passport-agent',
    version: '2.1.0',
  }

  if (context) {
    if (context.correlationId) {
      entry.correlationId = context.correlationId
    }
    // Merge remaining context fields
    for (const [key, value] of Object.entries(context)) {
      if (key !== 'correlationId') {
        entry[key] = value
      }
    }
  }

  return JSON.stringify(entry)
}

function logLine(level: Level, message: string, context?: Record<string, unknown>) {
  const line = isProduction
    ? formatJson(level, message, context)
    : formatPretty(level, message, context)

  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const log = {
  info(msg: string, ctx?: Record<string, unknown>) {
    logLine('info', msg, ctx)
  },
  warn(msg: string, ctx?: Record<string, unknown>) {
    logLine('warn', msg, ctx)
  },
  error(msg: string, ctx?: Record<string, unknown>) {
    logLine('error', msg, ctx)
  },
  success(msg: string, ctx?: Record<string, unknown>) {
    logLine('success', msg, ctx)
  },
}
