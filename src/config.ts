// Runtime configuration — single source of truth for all operational parameters
// Import this module everywhere. Never hardcode a timeout/poll interval/count.

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    rateLimitPerMinute: 200,
  },
  worker: {
    pollIntervalMs: 5000,
    executionTimeoutMs: 30_000,
    staleCheckIntervalMs: 60_000,
  },
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
  },
  resilience: {
    runStuckThresholdMs: 120_000,
    taskStaleThresholdMs: 300_000,
  },
  auth: {
    jwtExpirySeconds: 3600,
  },
  firebase: {
    serviceAccountPath: 'service-account.json',
    collections: {
      tasks: 'tasks',
      runs: 'runs',
      agents: 'agents',
      policies: 'policies',
      users: 'users',
      logs: 'logs',
      actionIntents: 'actionIntents',
      sessions: 'sessions',
      organizations: 'organizations',
      healthcheck: 'healthcheck',
    },
  },
  environment: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  get isProduction() { return this.environment === 'production' },
  get isDevelopment() { return this.environment === 'development' },
}
