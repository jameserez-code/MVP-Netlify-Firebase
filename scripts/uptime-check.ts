/**
 * Uptime check script
 * Usage: tsx scripts/uptime-check.ts [url]
 * Exit code 0 if healthy, 1 if not
 */

const url = process.argv[2] || `http://localhost:${process.env.PORT || '3000'}/health`

async function check() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      console.error(`UNHEALTHY: HTTP ${res.status} from ${url}`)
      process.exit(1)
    }
    const body = await res.json()
    if (body.status !== 'ok' && body.status !== 'healthy') {
      console.error(`UNHEALTHY: status="${body.status}" from ${url}`)
      process.exit(1)
    }
    console.log(`HEALTHY: ${url} — status="${body.status}"`)
    process.exit(0)
  } catch (err: any) {
    console.error(`UNHEALTHY: ${err.message} (${url})`)
    process.exit(1)
  }
}

check()
