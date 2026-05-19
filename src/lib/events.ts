import type { WebSocket } from 'ws'

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

export function publishEvent(orgId: string, channel: string, data: unknown) {
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
