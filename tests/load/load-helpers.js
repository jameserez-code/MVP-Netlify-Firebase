// Artillery load test helper functions
// Used by tests/load/basic-load.yml

module.exports = {
  // Log response metrics for debugging
  logResponse: (requestParams, response, context, ee, next) => {
    if (response.statusCode >= 400) {
      console.error(`[LOAD TEST ERROR] ${requestParams.url} → ${response.statusCode}`)
    }
    return next()
  },

  // Verify health response structure
  verifyHealth: (requestParams, response, context, ee, next) => {
    try {
      const body = JSON.parse(response.body)
      if (body.status !== 'ok') {
        ee.emit('error', `Health check failed: ${JSON.stringify(body)}`)
      }
    } catch (e) {
      ee.emit('error', `Invalid health response: ${response.body}`)
    }
    return next()
  },

  // Add random jitter to think time to simulate realistic clients
  randomThinkTime: (context, next) => {
    const jitter = Math.random() * 100
    context.vars.thinkTime = jitter
    return next()
  },
}
