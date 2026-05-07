import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const STORE_PATH = path.resolve(process.cwd(), 'server', 'data', 'auth-store.json')
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/
const PASSWORD_SYMBOL_REGEX = /[^A-Za-z0-9]/

function createEmptyStore() {
  return {
    usersByEmail: {},
    sessionsByToken: {},
    updatedAt: new Date().toISOString(),
  }
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

async function ensureStoreFile() {
  try {
    await readFile(STORE_PATH, 'utf8')
  } catch {
    await mkdir(path.dirname(STORE_PATH), { recursive: true })
    await writeFile(STORE_PATH, JSON.stringify(createEmptyStore(), null, 2))
  }
}

async function readStore() {
  await ensureStoreFile()

  try {
    const raw = await readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      usersByEmail: parsed.usersByEmail || {},
      sessionsByToken: parsed.sessionsByToken || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    const emptyStore = createEmptyStore()
    await writeStore(emptyStore)
    return emptyStore
  }
}

async function writeStore(store) {
  const nextStore = {
    usersByEmail: store.usersByEmail || {},
    sessionsByToken: store.sessionsByToken || {},
    updatedAt: new Date().toISOString(),
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true })
  await writeFile(STORE_PATH, JSON.stringify(nextStore, null, 2))
  return nextStore
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = String(storedHash || '').split(':')
  if (!salt || !expectedHash) return false

  const derivedHash = scryptSync(password, salt, 64)
  const expectedBuffer = Buffer.from(expectedHash, 'hex')
  if (derivedHash.length !== expectedBuffer.length) return false

  return timingSafeEqual(derivedHash, expectedBuffer)
}

function validatePassword(password) {
  const nextPassword = String(password || '')

  if (nextPassword.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`)
  }

  if (!PASSWORD_UPPERCASE_REGEX.test(nextPassword)) {
    throw new Error('Password must include at least one capital letter.')
  }

  if (!PASSWORD_SYMBOL_REGEX.test(nextPassword)) {
    throw new Error('Password must include at least one symbol.')
  }
}

export function sanitizeUser(user) {
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
  }
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  const store = await readStore()
  return store.usersByEmail[normalizedEmail] || null
}

export async function createUser({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    throw new Error('A valid email address is required.')
  }

  const trimmedPassword = String(password || '')
  validatePassword(trimmedPassword)

  const store = await readStore()
  if (store.usersByEmail[normalizedEmail]) {
    throw new Error('An account already exists for that email.')
  }

  const now = new Date().toISOString()
  const nextUser = {
    id: randomUUID(),
    email: normalizedEmail,
    name: String(name || '').trim(),
    passwordHash: hashPassword(trimmedPassword),
    createdAt: now,
    updatedAt: now,
  }

  store.usersByEmail[normalizedEmail] = nextUser
  await writeStore(store)
  return nextUser
}

export async function authenticateUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const user = await getUserByEmail(normalizedEmail)
  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    return null
  }

  return user
}

export async function createSession(email) {
  const normalizedEmail = normalizeEmail(email)
  const user = await getUserByEmail(normalizedEmail)
  if (!user) {
    throw new Error('Account not found.')
  }

  const store = await readStore()
  const token = randomBytes(32).toString('hex')
  store.sessionsByToken[token] = {
    token,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  }
  await writeStore(store)

  return { token, user: sanitizeUser(user) }
}

export async function getSession(token) {
  if (!token) return null

  const store = await readStore()
  const session = store.sessionsByToken[token]
  if (!session?.email) return null

  const user = store.usersByEmail[session.email]
  if (!user) {
    delete store.sessionsByToken[token]
    await writeStore(store)
    return null
  }

  store.sessionsByToken[token] = {
    ...session,
    lastSeenAt: new Date().toISOString(),
  }
  await writeStore(store)

  return {
    token,
    user: sanitizeUser(user),
  }
}

export async function deleteSession(token) {
  if (!token) return

  const store = await readStore()
  if (!store.sessionsByToken[token]) return

  delete store.sessionsByToken[token]
  await writeStore(store)
}
