import type { WebSocket } from 'ws'
import { redis } from './redis.js'

const rooms = new Map<string, Set<WebSocket>>()

export function subscribeClient(client: WebSocket, orgId: string, channel: string) {
  const key = `${orgId}:${channel}`
  if (!rooms.has(key)) {
    rooms.set(key, new Set())
  }
  rooms.get(key)!.add(client)
}

export function unsubscribeClient(client: WebSocket, orgId: string, channel: string) {
  const key = `${orgId}:${channel}`
  const clients = rooms.get(key)
  if (clients) {
    clients.delete(client)
    if (clients.size === 0) {
      rooms.delete(key)
    }
  }
}

export function removeClient(client: WebSocket) {
  for (const [key, clients] of rooms.entries()) {
    clients.delete(client)
    if (clients.size === 0) {
      rooms.delete(key)
    }
  }
}

export function broadcastToOrgClients(orgId: string, channel: string, data: unknown) {
  const key = `${orgId}:${channel}`
  const clients = rooms.get(key)
  if (!clients || clients.size === 0) return

  const message = JSON.stringify({ type: 'event', channel, data })
  for (const client of clients) {
    if (client.readyState === 1) {
      // OPEN
      client.send(message)
    }
  }
}

export async function publishEvent(orgId: string, channel: string, data: unknown) {
  // Local broadcast
  broadcastToOrgClients(orgId, channel, data)

  // Redis pub/sub for cross-instance broadcast
  try {
    await redis.publish(`org:${orgId}:events`, JSON.stringify({ channel, data }))
  } catch {
    // silent fail — Redis pub/sub is best-effort
  }
}
