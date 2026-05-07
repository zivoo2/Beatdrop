import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { existsSync } from 'node:fs'
import Stripe from 'stripe'
import { fileURLToPath } from 'node:url'
import { getRecordByCustomerId, getRecordByEmail, upsertRecord } from './billingStore.js'
import {
  authenticateUser,
  createSession,
  createUser,
  deleteSession,
  getSession,
  sanitizeUser,
} from './authStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distPath = path.join(projectRoot, 'dist')

const PORT = Number(process.env.PORT || 4242)
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:4173'
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null
const app = express()
const allowedOrigins = new Set([
  APP_URL,
  'http://127.0.0.1:4173',
  'http://localhost:4173',
])

app.use((req, res, next) => {
  const origin = String(req.headers.origin || '')
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Upload-Url, X-Upload-Size')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
})

function readRawRequestBody(req, { limitBytes = 512 * 1024 * 1024 } = {}) {
  if (Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body)
  }

  if (req.body instanceof Uint8Array) {
    return Promise.resolve(Buffer.from(req.body))
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let totalBytes = 0
    let settled = false

    const cleanup = () => {
      req.off('data', handleData)
      req.off('end', handleEnd)
      req.off('error', handleError)
      req.off('aborted', handleAborted)
    }

    const finish = (callback) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }

    const handleData = (chunk) => {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += bufferChunk.length

      if (totalBytes > limitBytes) {
        finish(() => reject(new Error('Upload body exceeded the 512 MB relay limit.')))
        req.destroy()
        return
      }

      chunks.push(bufferChunk)
    }

    const handleEnd = () => {
      finish(() => resolve(Buffer.concat(chunks)))
    }

    const handleError = (error) => {
      finish(() => reject(error))
    }

    const handleAborted = () => {
      finish(() => reject(new Error('Upload request was aborted before the body finished streaming.')))
    }

    req.on('data', handleData)
    req.on('end', handleEnd)
    req.on('error', handleError)
    req.on('aborted', handleAborted)
  })
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || '')
  if (!authorization.startsWith('Bearer ')) return ''
  return authorization.slice('Bearer '.length).trim()
}

async function loadAuthenticatedUser(req, _res, next) {
  const token = getBearerToken(req)
  if (!token) {
    req.auth = { token: '', user: null }
    next()
    return
  }

  const session = await getSession(token)
  req.auth = {
    token,
    user: session?.user || null,
  }
  next()
}

function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    res.status(401).json({ error: 'Log in to continue.' })
    return
  }

  next()
}

function billingConfigured() {
  return Boolean(stripe && STRIPE_PRICE_ID)
}

function hasProAccess(status) {
  return ['trialing', 'active', 'past_due'].includes(status)
}

function freeRecord(email = '') {
  return {
    email,
    plan: 'free',
    accessActive: false,
    status: 'free',
    customerId: '',
    subscriptionId: '',
    priceId: '',
    currentPeriodEnd: '',
    cancelAtPeriodEnd: false,
  }
}

async function resolveCustomerEmail(customerId) {
  const existing = await getRecordByCustomerId(customerId)
  if (existing?.email) return existing.email

  if (!stripe || !customerId) return ''
  const customer = await stripe.customers.retrieve(customerId)
  return customer.deleted ? '' : customer.email || ''
}

async function ensureCustomer({ email, name }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error('A valid email address is required to create a checkout session.')
  }

  const existingRecord = await getRecordByEmail(normalizedEmail)
  if (existingRecord?.customerId && stripe) {
    const customer = await stripe.customers.retrieve(existingRecord.customerId)
    if (!customer.deleted) {
      return customer
    }
  }

  const existingCustomers = await stripe.customers.list({
    email: normalizedEmail,
    limit: 1,
  })

  const customer =
    existingCustomers.data[0] ||
    (await stripe.customers.create({
      email: normalizedEmail,
      name: name || undefined,
      metadata: {
        app: 'beatdrop-studio',
        plan_interest: 'beatdrop-pro',
      },
    }))

  await upsertRecord(normalizedEmail, {
    customerId: customer.id,
    name: customer.name || name || '',
  })

  return customer
}

async function syncSubscriptionState({ email, customerId }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const fallbackRecord = (await getRecordByEmail(normalizedEmail)) || freeRecord(normalizedEmail)

  if (!stripe || !(customerId || fallbackRecord.customerId)) {
    return fallbackRecord
  }

  const resolvedCustomerId = customerId || fallbackRecord.customerId
  const subscriptions = await stripe.subscriptions.list({
    customer: resolvedCustomerId,
    status: 'all',
    limit: 10,
  })

  const preferredSubscription =
    subscriptions.data.find((subscription) => hasProAccess(subscription.status)) ||
    subscriptions.data[0]

  if (!preferredSubscription) {
    return upsertRecord(normalizedEmail, {
      ...freeRecord(normalizedEmail),
      customerId: resolvedCustomerId,
      name: fallbackRecord.name || '',
    })
  }

  return upsertRecord(normalizedEmail, {
    customerId: resolvedCustomerId,
    subscriptionId: preferredSubscription.id,
    status: preferredSubscription.status,
    plan: hasProAccess(preferredSubscription.status) ? 'pro' : 'free',
    accessActive: hasProAccess(preferredSubscription.status),
    priceId: preferredSubscription.items.data[0]?.price?.id || '',
    currentPeriodEnd: preferredSubscription.current_period_end
      ? new Date(preferredSubscription.current_period_end * 1000).toISOString()
      : '',
    cancelAtPeriodEnd: Boolean(preferredSubscription.cancel_at_period_end),
  })
}

async function handleSubscriptionUpdate(subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (!customerId) return

  const email = await resolveCustomerEmail(customerId)
  if (!email) return

  await upsertRecord(email, {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    plan: hasProAccess(subscription.status) ? 'pro' : 'free',
    accessActive: hasProAccess(subscription.status),
    priceId: subscription.items.data[0]?.price?.id || '',
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : '',
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  })
}

app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      res.status(503).json({ error: 'Stripe webhook is not configured.' })
      return
    }

    const signature = req.headers['stripe-signature']
    if (!signature) {
      res.status(400).json({ error: 'Missing Stripe signature header.' })
      return
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (error) {
      res.status(400).json({ error: error.message || 'Invalid Stripe webhook signature.' })
      return
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
          const email = session.customer_details?.email || session.metadata?.email || ''
          if (email) {
            await upsertRecord(email, {
              customerId: customerId || '',
              checkoutSessionId: session.id,
              subscriptionId:
                typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || '',
            })
            await syncSubscriptionState({ email, customerId })
          }
          break
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          await handleSubscriptionUpdate(event.data.object)
          break
        }

        case 'invoice.paid':
        case 'invoice.payment_failed': {
          const invoice = event.data.object
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
          const email = await resolveCustomerEmail(customerId)
          if (email) {
            await syncSubscriptionState({ email, customerId })
          }
          break
        }

        default:
          break
      }

      res.json({ received: true })
    } catch (error) {
      res.status(500).json({ error: error.message || 'Stripe webhook processing failed.' })
    }
  },
)

app.use(express.json())
app.use(loadAuthenticatedUser)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/youtube/upload/initiate', async (req, res) => {
  const accessToken = String(req.body?.accessToken || '').trim()
  const uploadMimeType = String(req.body?.uploadMimeType || '').trim()
  const uploadSize = Number(req.body?.uploadSize || 0)
  const notifySubscribers = req.body?.notifySubscribers
  const details = req.body?.details || {}
  const publishAt = String(details.publishAt || '').trim()

  if (!accessToken) {
    res.status(400).json({ error: 'Missing YouTube access token.' })
    return
  }

  if (!uploadMimeType || !Number.isFinite(uploadSize) || uploadSize <= 0) {
    res.status(400).json({ error: 'Missing upload file metadata.' })
    return
  }

  let normalizedPublishAt = ''
  if (publishAt) {
    const parsedDate = new Date(publishAt)

    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'Scheduled publish time is invalid.' })
      return
    }

    if (parsedDate.getTime() <= Date.now()) {
      res.status(400).json({ error: 'Scheduled publish time must be in the future.' })
      return
    }

    normalizedPublishAt = parsedDate.toISOString()
  }

  const params = new URLSearchParams({
    part: 'snippet,status',
    uploadType: 'resumable',
    notifySubscribers: String(Boolean(notifySubscribers)),
  })

  const metadata = {
    snippet: {
      title: details.title || 'Untitled Beat',
      description: details.description || '',
      tags: Array.isArray(details.tags) ? details.tags : [],
      categoryId: details.categoryId || '10',
    },
    status: {
      privacyStatus: normalizedPublishAt ? 'private' : details.visibility || 'private',
      ...(normalizedPublishAt ? { publishAt: normalizedPublishAt } : {}),
      selfDeclaredMadeForKids: Boolean(details.madeForKids),
      embeddable: details.embeddable ?? true,
      license: details.license || 'youtube',
    },
  }

  try {
    const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/videos?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': uploadMimeType,
        'X-Upload-Content-Length': String(uploadSize),
      },
      body: JSON.stringify(metadata),
    })

    if (!response.ok) {
      const message = await response.text()
      res.status(response.status).json({
        error: message || 'Could not start resumable upload session.',
      })
      return
    }

    const uploadUrl = response.headers.get('Location')
    if (!uploadUrl) {
      res.status(502).json({ error: 'Missing upload URL from YouTube.' })
      return
    }

    res.json({ uploadUrl })
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Could not reach YouTube upload service.',
    })
  }
})

app.post('/api/youtube/upload/thumbnail', express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  const accessToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const videoId = String(req.query.videoId || '').trim()

  if (!accessToken) {
    res.status(400).json({ error: 'Missing YouTube access token.' })
    return
  }

  if (!videoId) {
    res.status(400).json({ error: 'Missing YouTube video id.' })
    return
  }

  const contentType = String(req.headers['content-type'] || '').trim()
  if (!contentType) {
    res.status(400).json({ error: 'Missing thumbnail content type.' })
    return
  }

  try {
    const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: Buffer.from(req.body),
    })

    if (!response.ok) {
      const message = await response.text()
      res.status(response.status).json({
        error: message || 'Video uploaded, but thumbnail upload failed.',
      })
      return
    }

    const data = await response.json().catch(() => ({}))
    res.json(data)
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Could not reach YouTube thumbnail service.',
    })
  }
})

app.post('/api/youtube/upload/transfer', async (req, res) => {
  const uploadUrl = String(req.headers['x-upload-url'] || '').trim()
  const contentType = String(req.headers['content-type'] || '').trim()
  const contentLength = Number(req.headers['x-upload-size'] || req.headers['content-length'] || req.body?.length || 0)

  if (!uploadUrl) {
    res.status(400).json({ error: 'Missing YouTube upload URL.' })
    return
  }

  if (!contentType) {
    res.status(400).json({ error: 'Missing upload content type.' })
    return
  }

  let requestBody
  try {
    requestBody = await readRawRequestBody(req)
  } catch (error) {
    res.status(413).json({
      error: error instanceof Error ? error.message : 'Could not read the upload body.',
    })
    return
  }

  if (!Buffer.isBuffer(requestBody) || !requestBody.length) {
    console.warn('Upload relay received an empty body.', {
      contentType,
      contentLengthHeader: req.headers['content-length'] || '',
      uploadSizeHeader: req.headers['x-upload-size'] || '',
    })
    res.status(400).json({ error: 'Missing upload body.' })
    return
  }

  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(contentLength || requestBody.length),
      },
      body: requestBody,
    })

    const responseText = await response.text()
    res.status(response.status)
    res.type(response.headers.get('content-type') || 'application/json')
    res.send(responseText)
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Could not transfer the upload to YouTube.',
    })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const name = String(req.body?.name || '').trim()

  try {
    const user = await createUser({ email, password, name })
    const session = await createSession(user.email)
    res.status(201).json({
      token: session.token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Could not create your account.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  try {
    const user = await authenticateUser({ email, password })
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password.' })
      return
    }

    const session = await createSession(user.email)
    res.json({
      token: session.token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not log in.' })
  }
})

app.get('/api/auth/session', (req, res) => {
  res.json({
    user: req.auth?.user || null,
  })
})

app.post('/api/auth/logout', async (req, res) => {
  await deleteSession(req.auth?.token || '')
  res.json({ ok: true })
})

app.get('/api/billing/config', (_req, res) => {
  res.json({
    configured: billingConfigured(),
    priceId: STRIPE_PRICE_ID,
    appUrl: APP_URL,
    planName: 'BeatDrop Pro',
    priceLabel: 'Set your recurring price in Stripe and point STRIPE_PRICE_ID at it.',
  })
})

app.get('/api/billing/subscription-status', requireAuth, async (req, res) => {
  const email = req.auth.user.email

  try {
    const record = billingConfigured()
      ? await syncSubscriptionState({ email })
      : (await getRecordByEmail(email)) || freeRecord(email)

    res.json({
      configured: billingConfigured(),
      subscription: record,
    })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not load subscription status.' })
  }
})

app.post('/api/billing/create-checkout-session', requireAuth, async (req, res) => {
  if (!billingConfigured()) {
    res.status(503).json({ error: 'Stripe billing is not configured on the server.' })
    return
  }

  const email = req.auth.user.email
  const name = req.auth.user.name || ''

  try {
    const customer = await ensureCustomer({ email, name })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${APP_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#upgrade`,
      cancel_url: `${APP_URL}/?checkout=canceled#upgrade`,
      metadata: {
        email,
        product: 'beatdrop-pro',
      },
    })

    await upsertRecord(email, {
      customerId: customer.id,
      checkoutSessionId: session.id,
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not create the checkout session.' })
  }
})

app.post('/api/billing/create-portal-session', requireAuth, async (req, res) => {
  if (!billingConfigured()) {
    res.status(503).json({ error: 'Stripe billing is not configured on the server.' })
    return
  }

  const email = req.auth.user.email
  if (!email) {
    res.status(400).json({ error: 'A valid email address is required to open the billing portal.' })
    return
  }

  try {
    const customer = await ensureCustomer({
      email,
      name: req.auth.user.name || '',
    })
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${APP_URL}/#upgrade`,
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not open the billing portal.' })
  }
})

if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`BeatDrop billing server listening on http://127.0.0.1:${PORT}`)
})
