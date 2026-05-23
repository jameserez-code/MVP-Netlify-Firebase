import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { generateId } from './crypto.js'

const DATA_DIR = resolve(process.cwd(), 'data')

type CollectionData = Record<string, Record<string, unknown>>

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function loadCollection(name: string): Record<string, Record<string, unknown>> {
  ensureDataDir()
  const file = resolve(DATA_DIR, `${name}.json`)
  if (!existsSync(file)) return {}
  try { return JSON.parse(readFileSync(file, 'utf-8')) }
  catch { return {} }
}

function saveCollection(name: string, data: Record<string, Record<string, unknown>>) {
  ensureDataDir()
  const file = resolve(DATA_DIR, `${name}.json`)
  writeFileSync(file, JSON.stringify(data, null, 2))
}

function matchesFilter(doc: Record<string, unknown>, field: string, op: string, value: unknown): boolean {
  const docVal = doc[field]

  switch (op) {
    case '==':
      return docVal === value
    case '<=':
      if (docVal == null || value == null) return false
      return (docVal as any) <= value
    case '>=':
      if (docVal == null || value == null) return false
      return (docVal as any) >= value
    case 'in':
      return Array.isArray(value) && value.includes(docVal)
    default:
      return false
  }
}

function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  if (a == null && b == null) return 0
  if (a == null) return dir === 'asc' ? -1 : 1
  if (b == null) return dir === 'asc' ? 1 : -1

  let cmp = 0
  if (typeof a === 'string' && typeof b === 'string') {
    cmp = a.localeCompare(b)
  } else if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b
  } else {
    cmp = String(a).localeCompare(String(b))
  }
  return dir === 'asc' ? cmp : -cmp
}

export class LocalDocSnapshot {
  id: string
  _data: Record<string, unknown> | null
  exists: boolean

  constructor(id: string, _data: Record<string, unknown> | null) {
    this.id = id
    this._data = _data
    this.exists = _data !== null
  }

  data(): Record<string, unknown> | undefined {
    return this._data || undefined
  }
}

export class LocalDocRef {
  coll: string
  id: string

  constructor(coll: string, id: string) {
    this.coll = coll
    this.id = id
  }

  async set(doc: Record<string, unknown>) {
    const data = loadCollection(this.coll)
    data[this.id] = { ...doc }
    saveCollection(this.coll, data)
  }

  async get(): Promise<LocalDocSnapshot> {
    const data = loadCollection(this.coll)
    const doc = data[this.id] || null
    return new LocalDocSnapshot(this.id, doc)
  }

  async update(updates: Record<string, unknown>) {
    const data = loadCollection(this.coll)
    const existing = data[this.id] || {}
    data[this.id] = { ...existing, ...updates }
    saveCollection(this.coll, data)
  }

  async delete() {
    const data = loadCollection(this.coll)
    delete data[this.id]
    saveCollection(this.coll, data)
  }
}

export class LocalQuerySnapshot {
  docs: LocalDocSnapshot[]
  empty: boolean
  size: number

  constructor(docs: LocalDocSnapshot[]) {
    this.docs = docs
    this.empty = docs.length === 0
    this.size = docs.length
  }

  forEach(fn: (doc: LocalDocSnapshot) => void) {
    this.docs.forEach(fn)
  }
}

class LocalCountResult {
  private collection: string
  private filters: Array<{ field: string; op: string; value: unknown }>

  constructor(collection: string, filters: Array<{ field: string; op: string; value: unknown }>) {
    this.collection = collection
    this.filters = filters
  }

  async get(): Promise<{ data: { count: number } }> {
    const data = loadCollection(this.collection)
    const docs = Object.entries(data).map(([id, doc]) => ({ id, ...doc }))

    let filtered = docs
    for (const f of this.filters) {
      filtered = filtered.filter(d => matchesFilter(d, f.field, f.op, f.value))
    }

    return { data: { count: filtered.length } }
  }
}

export class LocalQuery {
  private collection: string
  private filters: Array<{ field: string; op: string; value: unknown }> = []
  private orderField: string | null = null
  private orderDir: 'asc' | 'desc' = 'asc'
  private limitVal: number | null = null
  private startAfterVal: unknown = null

  constructor(collection: string) {
    this.collection = collection
  }

  where(field: string, op: string, value: unknown): LocalQuery {
    this.filters.push({ field, op, value })
    return this
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): LocalQuery {
    this.orderField = field
    this.orderDir = dir
    return this
  }

  limit(n: number): LocalQuery {
    this.limitVal = n
    return this
  }

  startAfter(cursor: unknown): LocalQuery {
    this.startAfterVal = cursor
    return this
  }

  count(): LocalCountResult {
    return new LocalCountResult(this.collection, this.filters)
  }

  async get(): Promise<LocalQuerySnapshot> {
    const data = loadCollection(this.collection)
    let docs: Array<Record<string, unknown> & { id: string }> = Object.entries(data).map(([id, doc]) => ({ id, ...doc }))

    for (const f of this.filters) {
      docs = docs.filter(d => matchesFilter(d, f.field, f.op, f.value))
    }

    if (this.orderField) {
      docs.sort((a, b) => compareValues(a[this.orderField!], b[this.orderField!], this.orderDir))
    }

    if (this.startAfterVal != null && this.orderField) {
      const startIdx = docs.findIndex(
        d => compareValues(d[this.orderField!], this.startAfterVal, this.orderDir) > 0
      )
      if (startIdx >= 0) docs = docs.slice(startIdx)
    }

    if (this.limitVal != null && this.limitVal > 0) {
      docs = docs.slice(0, this.limitVal)
    }

    return new LocalQuerySnapshot(docs.map(d => {
      const { id: docId, ...rest } = d as Record<string, unknown> & { id: string }
      return new LocalDocSnapshot(docId, rest)
    }))
  }
}

export class LocalCollection {
  private name: string

  constructor(name: string) {
    this.name = name
  }

  doc(id?: string): LocalDocRef {
    const actualId = id || generateId('doc_', 20)
    return new LocalDocRef(this.name, actualId)
  }

  where(field: string, op: string, value: unknown): LocalQuery {
    return new LocalQuery(this.name).where(field, op, value)
  }

  limit(n: number): LocalQuery {
    return new LocalQuery(this.name).limit(n)
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): LocalQuery {
    return new LocalQuery(this.name).orderBy(field, dir)
  }

  count(): LocalCountResult {
    return new LocalCountResult(this.name, [])
  }

  async get(): Promise<LocalQuerySnapshot> {
    return new LocalQuery(this.name).get()
  }

  async add(doc: Record<string, unknown>): Promise<LocalDocRef> {
    const ref = this.doc()
    await ref.set(doc)
    return ref
  }
}

class LocalTransaction {
  get(ref: LocalDocRef): Promise<LocalDocSnapshot> {
    return ref.get()
  }

  set(ref: LocalDocRef, data: Record<string, unknown>): void {
    // Deferred writes are collected in the transaction
    ;(this as any)._writes = (this as any)._writes || []
    ;(this as any)._writes.push(() => ref.set(data))
  }

  update(ref: LocalDocRef, data: Record<string, unknown>): void {
    ;(this as any)._writes = (this as any)._writes || []
    ;(this as any)._writes.push(() => ref.update(data))
  }

  delete(ref: LocalDocRef): void {
    ;(this as any)._writes = (this as any)._writes || []
    ;(this as any)._writes.push(() => ref.delete())
  }
}

class LocalBatch {
  private ops: Array<() => Promise<void>> = []

  set(ref: LocalDocRef, data: Record<string, unknown>): LocalBatch {
    this.ops.push(() => ref.set(data))
    return this
  }

  update(ref: LocalDocRef, data: Record<string, unknown>): LocalBatch {
    this.ops.push(() => ref.update(data))
    return this
  }

  delete(ref: LocalDocRef): LocalBatch {
    this.ops.push(() => ref.delete())
    return this
  }

  async commit(): Promise<void> {
    for (const op of this.ops) await op()
  }
}

export class LocalFirestore {
  collection(name: string): LocalCollection {
    return new LocalCollection(name)
  }

  async runTransaction(fn: (tx: LocalTransaction) => Promise<void>): Promise<void> {
    const tx = new LocalTransaction()
    await fn(tx)
    const writes: Array<() => Promise<void>> = (tx as any)._writes || []
    for (const w of writes) await w()
  }

  batch(): LocalBatch {
    return new LocalBatch()
  }
}

let _instance: LocalFirestore | null = null

export function getLocalDb(): LocalFirestore {
  if (!_instance) _instance = new LocalFirestore()
  return _instance
}

export function isLocalStore(db: unknown): boolean {
  return db instanceof LocalFirestore
}

export function localStoreLoaded(): boolean {
  return _instance !== null
}

export function getDataDir(): string {
  return DATA_DIR
}
