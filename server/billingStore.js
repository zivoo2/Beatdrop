import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const STORE_PATH = path.resolve(process.cwd(), 'server', 'data', 'billing-store.json')

function createEmptyStore() {
  return {
    recordsByEmail: {},
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

export async function readStore() {
  await ensureStoreFile()
  try {
    const raw = await readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      recordsByEmail: parsed.recordsByEmail || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    const emptyStore = createEmptyStore()
    await writeStore(emptyStore)
    return emptyStore
  }
}

export async function writeStore(store) {
  const nextStore = {
    recordsByEmail: store.recordsByEmail || {},
    updatedAt: new Date().toISOString(),
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true })
  await writeFile(STORE_PATH, JSON.stringify(nextStore, null, 2))
  return nextStore
}

export async function getRecordByEmail(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const store = await readStore()
  return store.recordsByEmail[normalizedEmail] || null
}

export async function getRecordByCustomerId(customerId) {
  if (!customerId) return null
  const store = await readStore()
  return (
    Object.values(store.recordsByEmail).find((record) => record.customerId === customerId) || null
  )
}

export async function upsertRecord(email, patch) {
  const normalizedEmail = normalizeEmail(email || patch?.email)
  if (!normalizedEmail) {
    throw new Error('An email address is required to store billing state.')
  }

  const store = await readStore()
  const current = store.recordsByEmail[normalizedEmail] || {
    email: normalizedEmail,
    plan: 'free',
    accessActive: false,
  }

  const nextRecord = {
    ...current,
    ...patch,
    email: normalizedEmail,
    updatedAt: new Date().toISOString(),
  }

  store.recordsByEmail[normalizedEmail] = nextRecord
  await writeStore(store)
  return nextRecord
}
