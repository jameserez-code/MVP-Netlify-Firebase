import { redis } from './redis.js'

const memoryBlacklist = new Map<string, number>()

export async function storeSession(sessionId: string, data: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data))
  } catch (err) {
    console.error('Redis storeSession error:', err)
  }
}

export async function getSession<T>(sessionId: string): Promise<T | null> {
  try {
    const value = await redis.get(`session:${sessionId}`)
    if (!value) return null
    return JSON.parse(value) as T
  } catch (err) {
    console.error('Redis getSession error:', err)
    return null
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await redis.del(`session:${sessionId}`)
  } catch (err) {
    console.error('Redis deleteSession error:', err)
  }
}

export async function storeBlacklist(tokenJti: string, exp: number): Promise<void> {
  const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000))
  if (ttl > 0) {
    memoryBlacklist.set(tokenJti, exp)
    setTimeout(() => memoryBlacklist.delete(tokenJti), ttl * 1000)
  }

  try {
    if (ttl > 0) {
      await redis.setex(`blacklist:${tokenJti}`, ttl, '1')
    }
  } catch (err) {
    console.error('Redis storeBlacklist error:', err)
  }
}

export async function isBlacklisted(tokenJti: string): Promise<boolean> {
  // Check memory fallback first
  const memExp = memoryBlacklist.get(tokenJti)
  if (memExp && memExp > Date.now() / 1000) return true
  if (memExp) memoryBlacklist.delete(tokenJti)

  try {
    const value = await redis.get(`blacklist:${tokenJti}`)
    return value !== null
  } catch (err) {
    console.error('Redis isBlacklisted error:', err)
    return false
  }
}
