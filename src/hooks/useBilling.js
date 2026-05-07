import { useCallback, useEffect, useState } from 'react'
import { getApiUrl } from '../utils/api'

const DEFAULT_SUBSCRIPTION = {
  email: '',
  plan: 'free',
  accessActive: false,
  status: 'free',
  customerId: '',
  subscriptionId: '',
  priceId: '',
  currentPeriodEnd: '',
  cancelAtPeriodEnd: false,
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Billing request failed.')
  }
  return data
}

function authHeaders(token, extraHeaders = {}) {
  if (!token) return extraHeaders

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  }
}

export function useBilling(authToken, accountUser) {
  const [config, setConfig] = useState({ configured: false })
  const [subscription, setSubscription] = useState(DEFAULT_SUBSCRIPTION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const email = accountUser?.email || ''

  const loadConfig = useCallback(async () => {
    const response = await fetch(getApiUrl('/api/billing/config'))
    const data = await readJson(response)
    setConfig(data)
  }, [])

  const refreshSubscription = useCallback(async () => {
    if (!authToken || !email) {
      setSubscription(DEFAULT_SUBSCRIPTION)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(getApiUrl('/api/billing/subscription-status'), {
        headers: authHeaders(authToken),
      })
      const data = await readJson(response)
      setConfig((current) => ({ ...current, configured: data.configured ?? current.configured }))
      setSubscription(data.subscription || { ...DEFAULT_SUBSCRIPTION, email })
    } catch (loadError) {
      setError(loadError.message || 'Could not load billing status.')
      setSubscription({ ...DEFAULT_SUBSCRIPTION, email })
    } finally {
      setLoading(false)
    }
  }, [authToken, email])

  useEffect(() => {
    loadConfig().catch(() => {})
  }, [loadConfig])

  useEffect(() => {
    refreshSubscription().catch(() => {})
  }, [refreshSubscription])

  const startCheckout = useCallback(async () => {
    if (!authToken || !email) {
      throw new Error('Log in before starting BeatDrop Pro checkout.')
    }

    setActionLoading('checkout')
    setError('')

    try {
      const response = await fetch(getApiUrl('/api/billing/create-checkout-session'), {
        method: 'POST',
        headers: authHeaders(authToken, { 'Content-Type': 'application/json' }),
      })
      const data = await readJson(response)
      if (!data.url) {
        throw new Error('Stripe did not return a checkout URL.')
      }
      window.location.assign(data.url)
    } catch (checkoutError) {
      setError(checkoutError.message || 'Could not start checkout.')
      setActionLoading('')
      throw checkoutError
    }
  }, [authToken, email])

  const openBillingPortal = useCallback(async () => {
    if (!authToken || !email) {
      throw new Error('Log in before opening the billing portal.')
    }

    setActionLoading('portal')
    setError('')

    try {
      const response = await fetch(getApiUrl('/api/billing/create-portal-session'), {
        method: 'POST',
        headers: authHeaders(authToken, { 'Content-Type': 'application/json' }),
      })
      const data = await readJson(response)
      if (!data.url) {
        throw new Error('Stripe did not return a billing portal URL.')
      }
      window.location.assign(data.url)
    } catch (portalError) {
      setError(portalError.message || 'Could not open the billing portal.')
      setActionLoading('')
      throw portalError
    }
  }, [authToken, email])

  return {
    config,
    subscription,
    loading,
    error,
    actionLoading,
    isProPlan: Boolean(subscription.accessActive),
    refreshSubscription,
    startCheckout,
    openBillingPortal,
  }
}
