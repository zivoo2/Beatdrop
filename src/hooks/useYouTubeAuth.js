import { useCallback, useEffect, useRef, useState } from 'react'

const YOUTUBE_SCOPE =
  'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid profile email'

export function useYouTubeAuth() {
  const [token, setToken] = useState('')
  const [userInfo, setUserInfo] = useState(null)
  const [ready, setReady] = useState(false)
  const tokenClientRef = useRef(null)
  const tokenExpiresAtRef = useRef(0)
  const pendingTokenRequestRef = useRef(null)
  const grantedAccessRef = useRef(false)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setReady(false)
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
          const pendingRequest = pendingTokenRequestRef.current
          pendingTokenRequestRef.current = null

          if (response?.error) {
            pendingRequest?.reject(new Error(response.error))
            return
          }

          if (response?.access_token) {
            const expiresInSeconds = Number(response.expires_in || 0)
            tokenExpiresAtRef.current = Date.now() + Math.max(expiresInSeconds - 30, 0) * 1000
            grantedAccessRef.current = true
            setToken(response.access_token)
            pendingRequest?.resolve(response.access_token)
          }
        },
      })

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
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(retryTimer)
      window.clearTimeout(stopRetryTimer)
    }
  }, [])

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
      return Promise.reject(new Error('Google OAuth is not ready yet.'))
    }

    if (pendingTokenRequestRef.current) {
      return Promise.reject(new Error('A YouTube sign-in request is already in progress.'))
    }

    return new Promise((resolve, reject) => {
      pendingTokenRequestRef.current = { resolve, reject }
      tokenClientRef.current.requestAccessToken({ prompt })
    })
  }, [])

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
    tokenExpiresAtRef.current = 0
    grantedAccessRef.current = false
    pendingTokenRequestRef.current = null
  }, [])

  return { token, userInfo, ready, login, logout, ensureValidToken }
}
