import { useEffect, useRef } from 'react'

function GoogleSignInButton({ mode = 'signin', disabled = false, onCredential, onError }) {
  const containerRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const errorRef = useRef(onError)

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    errorRef.current = onError
  }, [onError])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    if (!clientId) {
      return
    }

    let cancelled = false

    const renderGoogleButton = () => {
      const googleIdentity = window.google?.accounts?.id
      if (!googleIdentity || !containerRef.current || cancelled) {
        return false
      }

      googleIdentity.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response?.credential) {
            errorRef.current?.(new Error('Google did not return a credential.'))
            return
          }

          try {
            await callbackRef.current?.(response.credential)
          } catch (error) {
            errorRef.current?.(error)
          }
        },
      })

      googleIdentity.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'pill',
        width: 320,
        logo_alignment: 'left',
      })

      return true
    }

    if (renderGoogleButton()) {
      return () => {
        cancelled = true
      }
    }

    const retryTimer = window.setInterval(() => {
      if (renderGoogleButton()) {
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
  }, [mode])

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <div ref={containerRef} className="min-h-[44px]" />
      {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <p className="mt-2 text-xs text-white/45">Add `VITE_GOOGLE_CLIENT_ID` to enable Google Sign-In.</p>
      )}
    </div>
  )
}

export default GoogleSignInButton
