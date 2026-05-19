import {
  setToken,
  getToken,
  clearToken,
  isLoggedIn,
  login,
  getMetrics,
} from '../api'

describe('API Client', () => {
  beforeEach(() => {
    clearToken()
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // JWT Storage & Retrieval
  // ---------------------------------------------------------------------------
  describe('Token Management', () => {
    it('stores and retrieves JWT token', () => {
      const mockToken = 'test_jwt_token_123'
      setToken(mockToken)
      expect(getToken()).toBe(mockToken)
    })

    it('clears JWT token', () => {
      setToken('test_token')
      clearToken()
      expect(getToken()).toBeNull()
    })

    it('reports logged in status correctly', () => {
      expect(isLoggedIn()).toBe(false)
      setToken('valid_token')
      expect(isLoggedIn()).toBe(true)
      clearToken()
      expect(isLoggedIn()).toBe(false)
    })

    it('persists token to localStorage', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
      setToken('persisted_token')
      expect(setItemSpy).toHaveBeenCalledWith('passport_token', 'persisted_token')
    })

    it('removes token from localStorage on clear', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem')
      setToken('token_to_remove')
      clearToken()
      expect(removeItemSpy).toHaveBeenCalledWith('passport_token')
    })
  })

  // ---------------------------------------------------------------------------
  // Fetch Mocking
  // ---------------------------------------------------------------------------
  describe('HTTP Requests', () => {
    it('sends Authorization header when token is set', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      )
      setToken('bearer_token_xyz')

      await getMetrics()

      const call = fetchSpy.mock.calls[0]
      const headers = call[1]?.headers as Record<string, string>
      expect(headers?.Authorization).toBe('Bearer bearer_token_xyz')
    })

    it('does not send Authorization header when no token', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      )

      await getMetrics()

      const call = fetchSpy.mock.calls[0]
      const headers = call[1]?.headers as Record<string, string>
      expect(headers?.Authorization).toBeUndefined()
    })

    it('returns parsed JSON on success', async () => {
      const mockData = { tasks: { total: 5, pending: 2 } }
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 })
      )

      const result = await getMetrics()
      expect(result).toEqual(mockData)
    })
  })

  // ---------------------------------------------------------------------------
  // 401 Redirect Behavior
  // ---------------------------------------------------------------------------
  describe('401 Handling', () => {
    it('clears token and redirects on 401', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401 })
      )
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem')
      const assignSpy = jest.spyOn(window.location, 'assign').mockImplementation(() => {})

      setToken('expired_token')

      await expect(getMetrics()).rejects.toThrow('Session expired. Please sign in again.')

      expect(removeItemSpy).toHaveBeenCalledWith('passport_token')
      expect(assignSpy).toHaveBeenCalledWith('/login')

      assignSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('throws with server message on 400', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Bad request' } }), { status: 400 })
      )

      await expect(getMetrics()).rejects.toThrow('Bad request')
    })

    it('throws with server message on 403', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403 })
      )

      await expect(getMetrics()).rejects.toThrow('Forbidden')
    })

    it('throws with server message on 404', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
      )

      await expect(getMetrics()).rejects.toThrow('Not found')
    })

    it('throws with server message on 409', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Conflict' } }), { status: 409 })
      )

      await expect(getMetrics()).rejects.toThrow('Conflict')
    })

    it('throws with server message on 500', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Internal error' } }), { status: 500 })
      )

      await expect(getMetrics()).rejects.toThrow('Internal error')
    })

    it('throws generic error for unknown status codes', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 418 })
      )

      await expect(getMetrics()).rejects.toThrow('Request failed (HTTP 418)')
    })

    it('handles network errors gracefully', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

      await expect(getMetrics()).rejects.toThrow('Network failure')
    })
  })

  // ---------------------------------------------------------------------------
  // Auth Endpoint
  // ---------------------------------------------------------------------------
  describe('Auth Endpoint', () => {
    it('calls login endpoint with correct payload', async () => {
      const mockResponse = { token: 'new_jwt_token', user: { email: 'test@example.com' } }
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      )

      const result = await login('test@example.com', 'password123')

      expect(result).toEqual(mockResponse)
      const [url, options] = fetchSpy.mock.calls[0]
      expect(url).toContain('/auth/login')
      expect(options?.method).toBe('POST')
      expect(JSON.parse(options?.body as string)).toEqual({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})
