'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'

const WS_URL =
  typeof window !== 'undefined'
    ? window.location.protocol === 'https:'
      ? `wss://${window.location.host}`
      : `ws://${window.location.host}`
    : 'ws://localhost:3000'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const reconnectAttemptRef = useRef(0)

  const connect = useCallback(() => {
    const token = localStorage.getItem('passport_token')
    if (!token) return

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
      reconnectAttemptRef.current = 0
      for (const channel of subscriptionsRef.current) {
        ws.send(JSON.stringify({ type: 'subscribe', channel }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'event') {
          setLastMessage(msg)
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30000)
      reconnectAttemptRef.current += 1
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const subscribe = useCallback((channel: string) => {
    subscriptionsRef.current.add(channel)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }))
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }))
    }
  }, [])

  return { connected, lastMessage, send, subscribe, unsubscribe }
}

export function useRealtime<T = any>(
  channel: string,
  swrKey?: string | null,
  fetcher?: (key: string) => Promise<T>,
  swrOptions?: any
) {
  const ws = useWebSocket()

  useEffect(() => {
    if (!ws.connected) return
    ws.subscribe(channel)
    return () => ws.unsubscribe(channel)
  }, [ws.connected, channel, ws.subscribe, ws.unsubscribe])

  const options = {
    ...swrOptions,
    refreshInterval: ws.connected ? 0 : (swrOptions?.refreshInterval || 0),
  }

  const { data: swrData, ...swrRest } = useSWR(swrKey, fetcher ?? null, options)

  const wsData = ws.lastMessage?.channel === channel ? ws.lastMessage.data : undefined
  const data = ws.connected && wsData !== undefined ? wsData : swrData

  return {
    data: data as T | undefined,
    connected: ws.connected,
    ...swrRest,
  }
}
