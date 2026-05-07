import { useCallback, useEffect, useState } from 'react'
import { getApiUrl } from '../utils/api'

const STORAGE_KEY = 'beatdrop_auth_token'

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.')
  }
  return data
}

function getStoredToken() {
  return window.localStorage.getItem(STORAGE_KEY) || ''
}

function persistToken(token) {
  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token)
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export function useAuth() {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const fetchSession = useCallback(
    async (tokenOverride = token) => {
      if (!tokenOverride) {
        setUser(null)
        setLoading(false)
        return null
      }

      setLoading(true)

      try {
        const response = await fetch(getApiUrl('/api/auth/session'), {
          headers: {
            Authorization: `Bearer ${tokenOverride}`,
          },
        })
        const data = await readJson(response)
        const nextUser = data.user || null
        if (!nextUser) {
          persistToken('')
          setToken('')
        }
        setUser(nextUser)
        setError('')
        return nextUser
      } catch (sessionError) {
        persistToken('')
        setToken('')
        setUser(null)
        setError(sessionError.message || 'Could not restore your session.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    fetchSession().catch(() => {})
  }, [fetchSession])

  const authenticate = useCallback(async (path, payload, action) => {
    setActionLoading(action)
    setError('')

    try {
      const response = await fetch(getApiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await readJson(response)
      persistToken(data.token || '')
      setToken(data.token || '')
      setUser(data.user || null)
      return data.user || null
    } catch (authError) {
      setError(authError.message || 'Authentication failed.')
      throw authError
    } finally {
      setActionLoading('')
      setLoading(false)
    }
  }, [])

  const login = useCallback(
    async ({ email, password }) => authenticate('/api/auth/login', { email, password }, 'login'),
    [authenticate],
  )

  const signup = useCallback(
    async ({ name, email, password }) => authenticate('/api/auth/signup', { name, email, password }, 'signup'),
    [authenticate],
  )

  const logout = useCallback(async () => {
    const currentToken = token
    persistToken('')
    setToken('')
    setUser(null)
    setError('')

    if (!currentToken) return

    try {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })
    } catch {
      // Ignore logout network errors because the local session is already cleared.
    }
  }, [token])

  return {
    token,
    user,
    loading,
    error,
    actionLoading,
    isAuthenticated: Boolean(user?.email),
    login,
    signup,
    logout,
    refreshSession: fetchSession,
  }
}
