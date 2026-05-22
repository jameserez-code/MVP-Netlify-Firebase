import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { verify } from './jwt.js'
import { log } from './logger.js'
import { subscribeClient, unsubscribeClient, removeClient, broadcastToOrgClients } from './events.js'
import { redis } from './redis.js'

interface WsClient extends WebSocket {
  isAlive?: boolean
  orgId?: string
  subscriptions?: Set<string>
  heartbeatTimer?: ReturnType<typeof setTimeout>
}

const HEARTBEAT_INTERVAL = 30000
const HEARTBEAT_TIMEOUT = 10000

let _wss: WebSocketServer | null = null
let _subscriber: ReturnType<typeof redis.duplicate> | null = null

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server })
  _wss = wss

  // Set up Redis Pub/Sub for cross-instance broadcast
  const subscriber = redis.duplicate()
  _subscriber = subscriber

  subscriber.on('error', (err) => log.error('Redis subscriber error', { error: err.message }))

  subscriber.psubscribe('org:*:events').catch((err) => {
    log.error('Redis psubscribe failed', { error: err.message })
  })

  subscriber.on('pmessage', (_pattern, channel, message) => {
    try {
      const orgId = channel.split(':')[1]
      const { channel: msgChannel, data } = JSON.parse(message)
      broadcastToOrgClients(orgId, msgChannel, data)
    } catch {
      // ignore malformed messages
    }
  })

  wss.on('connection', async (ws: WsClient, req) => {
    // Auth via query param ?token=... or Authorization header
    let token: string | null = null
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      token = url.searchParams.get('token')
    } catch {
      // ignore malformed URL
    }

    if (!token && req.headers.authorization) {
      const auth = req.headers.authorization.toString()
      if (auth.startsWith('Bearer ')) token = auth.substring(7)
    }

    const claims = await verify(token || '')
    if (!claims) {
      ws.close(4001, 'Unauthorized')
      return
    }

    ws.orgId = claims.orgId || process.env.DEFAULT_ORG_ID || 'default'
    ws.subscriptions = new Set()
    ws.isAlive = true

    log.info('websocket connected', { orgId: ws.orgId })

    const handleMessage = (raw: Buffer) => {
      let msg: any
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'invalid json' }))
        return
      }

      if (msg.type === 'subscribe' && typeof msg.channel === 'string') {
        ws.subscriptions!.add(msg.channel)
        subscribeClient(ws, ws.orgId!, msg.channel)
        return
      }

      if (msg.type === 'unsubscribe' && typeof msg.channel === 'string') {
        ws.subscriptions!.delete(msg.channel)
        unsubscribeClient(ws, ws.orgId!, msg.channel)
        return
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      if (msg.type === 'pong') {
        ws.isAlive = true
        if (ws.heartbeatTimer) {
          clearTimeout(ws.heartbeatTimer)
          ws.heartbeatTimer = undefined
        }
        return
      }

      ws.send(JSON.stringify({ type: 'error', message: 'unknown message type' }))
    }

    ws.on('message', handleMessage)

    const heartbeatInterval = setInterval(() => {
      if (!ws.isAlive) {
        ws.terminate()
        return
      }
      ws.isAlive = false
      ws.send(JSON.stringify({ type: 'ping' }))
      ws.heartbeatTimer = setTimeout(() => {
        if (!ws.isAlive) {
          ws.terminate()
        }
      }, HEARTBEAT_TIMEOUT)
    }, HEARTBEAT_INTERVAL)

    ws.on('close', () => {
      clearInterval(heartbeatInterval)
      if (ws.heartbeatTimer) clearTimeout(ws.heartbeatTimer)
      if (ws.subscriptions) {
        for (const channel of ws.subscriptions) {
          unsubscribeClient(ws, ws.orgId!, channel)
        }
      }
      removeClient(ws)
      log.info('websocket disconnected', { orgId: ws.orgId })
    })

    ws.on('error', (err) => {
      log.error('websocket error', { error: (err as Error).message, orgId: ws.orgId })
    })
  })

  return wss
}

export function closeWebSocketServer() {
  if (_subscriber) {
    _subscriber.punsubscribe('org:*:events').catch(() => {})
    _subscriber.disconnect()
    _subscriber = null
  }
  if (_wss) {
    log.info('closing websocket server')
    for (const client of _wss.clients) {
      client.terminate()
    }
    _wss.close()
    _wss = null
  }
}
