import { useCallback, useEffect, useRef, useState } from 'react'

const YOUTUBE_SCOPE =
  'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid profile email'
const OAUTH_READY_TIMEOUT_MS = 10000
const TOKEN_REQUEST_TIMEOUT_MS = 20000

function formatGoogleAuthError(errorCode) {
  const code = String(errorCode || '').trim()

  switch (code) {
    case 'popup_failed_to_open':
      return 'Google sign-in popup was blocked. Allow popups for this site and try again.'
    case 'popup_closed':
      return 'Google sign-in was closed before it finished.'
    case 'access_denied':
      return 'Google sign-in was canceled before access was granted.'
    case 'origin_mismatch':
      return 'This Google client is not allowed to run from this app URL. Add this origin in Google Cloud and try again.'
    default:
      return code ? `Google sign-in failed: ${code}.` : 'Google sign-in failed.'
  }
}

export function useYouTubeAuth() {
  const [token, setToken] = useState('')
  const [userInfo, setUserInfo] = useState(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const tokenClientRef = useRef(null)
  const tokenExpiresAtRef = useRef(0)
  const pendingTokenRequestRef = useRef(null)
  const grantedAccessRef = useRef(false)
  const requestTimeoutRef = useRef(null)

  const clearPendingRequest = useCallback((nextError) => {
    if (requestTimeoutRef.current) {
      window.clearTimeout(requestTimeoutRef.current)
      requestTimeoutRef.current = null
    }

    const pendingRequest = pendingTokenRequestRef.current
    pendingTokenRequestRef.current = null
    setLoading(false)

    if (nextError) {
      const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError || 'Google sign-in failed.'))
      setError(normalizedError.message || 'Google sign-in failed.')
      pendingRequest?.reject(normalizedError)
      return null
    }

    return pendingRequest
  }, [])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setReady(false)
      setError('Add VITE_GOOGLE_CLIENT_ID to enable YouTube connection.')
      return
    }

    let cancelled = false

    const initializeTokenClient = () => {
      const gsi = window.google?.accounts?.oauth2
      if (!gsi || cancelled) {
        return false
      }

      tokenClientRef.current = gsi.initTokenClient({
        client_id: clientId,
        scope: YOUTUBE_SCOPE,
        callback: (response) => {
          if (response?.error) {
            clearPendingRequest(new Error(formatGoogleAuthError(response.error)))
            return
          }

          if (response?.access_token) {
            const pendingRequest = clearPendingRequest()
            const expiresInSeconds = Number(response.expires_in || 0)
            tokenExpiresAtRef.current = Date.now() + Math.max(expiresInSeconds - 30, 0) * 1000
            grantedAccessRef.current = true
            setToken(response.access_token)
            setError('')
            pendingRequest?.resolve(response.access_token)
          }
        },
        error_callback: (error) => {
          clearPendingRequest(new Error(formatGoogleAuthError(error?.type || error?.message || '')))
        },
      })

      setError('')
      setReady(true)
      return true
    }

    if (initializeTokenClient()) {
      return () => {
        cancelled = true
      }
    }

    setReady(false)

    const retryTimer = window.setInterval(() => {
      if (initializeTokenClient()) {
        window.clearInterval(retryTimer)
      }
    }, 250)

    const stopRetryTimer = window.setTimeout(() => {
      window.clearInterval(retryTimer)
      if (!cancelled && !tokenClientRef.current) {
        setError('Google OAuth did not finish loading. Disable blockers for Google scripts and refresh the page.')
      }
    }, OAUTH_READY_TIMEOUT_MS)

    return () => {
      cancelled = true
      window.clearInterval(retryTimer)
      window.clearTimeout(stopRetryTimer)
    }
  }, [clearPendingRequest])

  useEffect(() => {
    if (!token) {
      setUserInfo(null)
      return
    }

    const loadUser = async () => {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Could not load user profile.')
        const data = await response.json()
        setUserInfo(data)
      } catch {
        setUserInfo(null)
      }
    }

    loadUser()
  }, [token])

  const requestAccessToken = useCallback((prompt) => {
    if (!tokenClientRef.current) {
      const nextError = new Error(error || 'Google OAuth is not ready yet.')
      setError(nextError.message)
      return Promise.reject(nextError)
    }

    if (pendingTokenRequestRef.current) {
      const nextError = new Error('A YouTube sign-in request is already in progress.')
      setError(nextError.message)
      return Promise.reject(nextError)
    }

    return new Promise((resolve, reject) => {
      setLoading(true)
      setError('')
      pendingTokenRequestRef.current = { resolve, reject }
      requestTimeoutRef.current = window.setTimeout(() => {
        clearPendingRequest(new Error('Google sign-in timed out. Check popup permissions and your Google OAuth origin settings, then try again.'))
      }, TOKEN_REQUEST_TIMEOUT_MS)
      tokenClientRef.current.requestAccessToken({ prompt })
    })
  }, [clearPendingRequest, error])

  const login = useCallback(() => {
    return requestAccessToken(grantedAccessRef.current ? '' : 'consent')
  }, [requestAccessToken])

  const ensureValidToken = useCallback(async () => {
    if (token && Date.now() < tokenExpiresAtRef.current) {
      return token
    }

    return requestAccessToken(grantedAccessRef.current ? '' : 'consent')
  }, [requestAccessToken, token])

  const logout = useCallback(() => {
    setToken('')
    setUserInfo(null)
    setError('')
    setLoading(false)
    tokenExpiresAtRef.current = 0
    grantedAccessRef.current = false
    clearPendingRequest()
  }, [clearPendingRequest])

  return { token, userInfo, ready, loading, error, login, logout, ensureValidToken }
}
