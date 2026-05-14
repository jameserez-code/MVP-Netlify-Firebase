// Demo store — file-based Firestore replacement for local demos
// Uses ~/.passport-agent/data.json. Zero configuration required.
// Imports the same interface as the Firestore client.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'

const DATA_DIR = resolve(homedir(), '.passport-agent')
const DATA_FILE = resolve(DATA_DIR, 'data.json')

function load(): Record<string, Record<string, Record<string, unknown>>> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) { writeFileSync(DATA_FILE, '{}'); return {} }
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) }
  catch { return {} }
}

function save(data: Record<string, Record<string, Record<string, unknown>>>) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// ---------------------------------------------------------------------------
// Demo Firestore API — mirrors firebase-admin/firestore interface
// ---------------------------------------------------------------------------
export class DemoCollection {
  private name: string

  constructor(name: string) { this.name = name }

  doc(id?: string): DemoDocRef {
    const actualId = id || `demo_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    return new DemoDocRef(this.name, actualId)
  }

  async where(_field: string, _op: string, _value: any): Promise<DemoQuerySnapshot> {
    const data = load()
    const coll = data[this.name] || {}
    return new DemoQuerySnapshot(Object.entries(coll).map(([id, doc]) => new DemoDocSnapshot(id, doc as Record<string, unknown>)))
  }

  async get(): Promise<DemoQuerySnapshot> {
    return this.where('_', '==', '_')
  }

  async add(doc: Record<string, unknown>): Promise<DemoDocRef> {
    const ref = this.doc()
    await ref.set(doc)
    return ref
  }
}

export class DemoDocRef {
  coll: string
  id: string

  constructor(coll: string, id: string) { this.coll = coll; this.id = id }

  async set(doc: Record<string, unknown>) {
    const data = load()
    if (!data[this.coll]) data[this.coll] = {}
    data[this.coll][this.id] = { ...doc, _id: this.id }
    save(data)
  }

  async get(): Promise<DemoDocSnapshot> {
    const data = load()
    const doc = (data[this.coll] || {})[this.id]
    return new DemoDocSnapshot(this.id, doc || null)
  }

  async update(updates: Record<string, unknown>) {
    const data = load()
    if (!data[this.coll]) data[this.coll] = {}
    const existing = data[this.coll][this.id] || { _id: this.id }
    data[this.coll][this.id] = { ...existing, ...updates, _id: this.id }
    save(data)
  }

  async delete() {
    const data = load()
    if (data[this.coll]) delete data[this.coll][this.id]
    save(data)
  }
}

export class DemoDocSnapshot {
  id: string
  data: Record<string, unknown> | null
  exists: boolean

  constructor(id: string, data: Record<string, unknown> | null) {
    this.id = id; this.data = data; this.exists = data !== null
  }

  data(): Record<string, unknown> | undefined { return this.data || undefined }
}

export class DemoQuerySnapshot {
  docs: DemoDocSnapshot[]
  empty: boolean
  size: number

  constructor(docs: DemoDocSnapshot[]) {
    this.docs = docs; this.empty = docs.length === 0; this.size = docs.length
  }

  forEach(fn: (doc: DemoDocSnapshot) => void) { this.docs.forEach(fn) }
}

// ---------------------------------------------------------------------------
// Demo Firestore instance
// ---------------------------------------------------------------------------
export class DemoFirestore {
  collection(name: string): DemoCollection { return new DemoCollection(name) }

  // Transaction support (simplified — no real atomicity needed for demo)
  async runTransaction(fn: (tx: any) => Promise<void>) {
    await fn({
      get: async (ref: DemoDocRef) => await ref.get(),
      set: async (ref: DemoDocRef, doc: Record<string, unknown>) => await ref.set(doc),
      update: async (ref: DemoDocRef, updates: Record<string, unknown>) => await ref.update(updates),
    })
  }

  batch(): { update: (ref: DemoDocRef, data: Record<string, unknown>) => void; commit: () => Promise<void> } {
    const ops: Array<() => Promise<void>> = []
    return {
      update: (ref, data) => ops.push(() => ref.update(data)),
      commit: async () => { for (const op of ops) await op() },
    }
  }
}

// Singleton
let _db: DemoFirestore | null = null
export function getDemoDb(): DemoFirestore {
  if (!_db) _db = new DemoFirestore()
  return _db
}

// Seed demo data (called on first run)
export function seedDemo(db: DemoFirestore) {
  const now = new Date().toISOString()
  db.collection('users').doc('admin@acmecorp.com').set({ email: 'admin@acmecorp.com', displayName: 'Admin', role: 'org_admin', orgId: 'demo_org', password: 'admin', createdAt: now })
  db.collection('agents').doc('agent_demo').set({ id: 'agent_demo', name: 'Demo Bot', model: 'gpt-4o', provider: 'openai', orgId: 'demo_org', status: 'active', registeredAt: now, capabilities: ['task:execute', 'network:http'] })
  db.collection('policies').doc('policy_demo').set({ id: 'policy_demo', name: 'Demo Policy', orgId: 'demo_org', status: 'active', priority: 10, scope: { agentId: 'agent_demo', environment: ['*'] }, rules: { allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string' } } }], deniedTools: ['send_email'], allowedDomains: [{ pattern: '*.demo.com', methods: ['GET'] }], deniedDomains: ['*.evil.com'], dataRestrictions: {} }, createdAt: now, updatedAt: now })
}
