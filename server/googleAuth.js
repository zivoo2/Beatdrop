import { createPublicKey, createVerify } from 'node:crypto'

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

let cachedKeys = new Map()
let cachedKeysExpireAt = 0

function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, 'base64')
}

function parseJwt(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) {
    throw new Error('Google credential format is invalid.')
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8'))
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'))
  const signature = decodeBase64Url(encodedSignature)

  return {
    encodedHeader,
    encodedPayload,
    header,
    payload,
    signature,
    signedContent: `${encodedHeader}.${encodedPayload}`,
  }
}

function readMaxAgeSeconds(cacheControl = '') {
  const match = String(cacheControl || '').match(/max-age=(\d+)/i)
  return match ? Number(match[1]) : 300
}

async function getGoogleSigningKeys() {
  if (cachedKeys.size > 0 && Date.now() < cachedKeysExpireAt) {
    return cachedKeys
  }

  const response = await fetch(GOOGLE_JWKS_URL)
  if (!response.ok) {
    throw new Error('Could not reach Google key service.')
  }

  const data = await response.json()
  const nextKeys = new Map()

  for (const key of data.keys || []) {
    if (!key?.kid) continue
    nextKeys.set(key.kid, key)
  }

  if (nextKeys.size === 0) {
    throw new Error('Google signing keys are unavailable.')
  }

  cachedKeys = nextKeys
  cachedKeysExpireAt = Date.now() + readMaxAgeSeconds(response.headers.get('cache-control')) * 1000
  return cachedKeys
}

function verifyJwtSignature({ jwk, signedContent, signature }) {
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
  const verifier = createVerify('RSA-SHA256')
  verifier.update(signedContent)
  verifier.end()
  return verifier.verify(publicKey, signature)
}

export async function verifyGoogleIdToken(idToken, audience) {
  if (!idToken) {
    throw new Error('Missing Google credential.')
  }

  if (!audience) {
    throw new Error('Google Sign-In is not configured on the server.')
  }

  const parsed = parseJwt(idToken)
  const { header, payload, signature, signedContent } = parsed

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Google credential header is invalid.')
  }

  const signingKeys = await getGoogleSigningKeys()
  const jwk = signingKeys.get(header.kid)
  if (!jwk) {
    cachedKeysExpireAt = 0
    throw new Error('Google signing key could not be found.')
  }

  if (!verifyJwtSignature({ jwk, signedContent, signature })) {
    throw new Error('Google credential signature is invalid.')
  }

  const issuedByGoogle = GOOGLE_ISSUERS.has(String(payload.iss || ''))
  const audienceMatches = payload.aud === audience
  const expiresAtMs = Number(payload.exp || 0) * 1000

  if (!issuedByGoogle || !audienceMatches || !expiresAtMs || Date.now() >= expiresAtMs) {
    throw new Error('Google credential is not valid for this app.')
  }

  return payload
}
