'use client'
import { useState, useEffect, useCallback } from 'react'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    setConnected(false)
    return () => {}
  }, [])

  const send = useCallback((_data: any) => {}, [])
  const subscribe = useCallback((_channel: string) => {}, [])
  const unsubscribe = useCallback((_channel: string) => {}, [])

  return { connected, lastMessage, send, subscribe, unsubscribe }
}

export function useRealtime(channel: string, swrKey: string, fetcher: any, options?: any): {
  data: any
  error: Error | null
  isLoading: boolean
  isError: boolean
  connected: boolean
  mutate: () => Promise<any>
} {
  const { connected } = useWebSocket()
  return {
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    connected,
    mutate: async () => {},
  }
}
