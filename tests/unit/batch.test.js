import test from 'node:test'
import assert from 'node:assert/strict'
import { batchWrite, batchDelete, batchUpdate, queueAuditEntry, flushAuditQueue } from '../../dist/lib/batch.js'

function createMockDb() {
  const writtenDocs = []
  const deletedIds = []
  const updatedDocs = []

  return {
    _writtenDocs: writtenDocs,
    _deletedIds: deletedIds,
    _updatedDocs: updatedDocs,
    collection(name) {
      return {
        doc(id) {
          return { id, collection: name }
        },
      }
    },
    batch() {
      const ops = []
      return {
        _ops: ops,
        set(ref, data) {
          ops.push({ type: 'set', ref, data })
        },
        update(ref, data) {
          ops.push({ type: 'update', ref, data })
        },
        delete(ref) {
          ops.push({ type: 'delete', ref })
        },
        async commit() {
          for (const op of ops) {
            if (op.type === 'set') writtenDocs.push({ id: op.ref.id, data: op.data })
            if (op.type === 'delete') deletedIds.push(op.ref.id)
            if (op.type === 'update') updatedDocs.push({ id: op.ref.id, data: op.data })
          }
        },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// batchWrite
// ---------------------------------------------------------------------------

test('batchWrite writes documents and returns count', async () => {
  const db = createMockDb()
  const docs = [
    { id: 'doc_1', data: { name: 'Alice' } },
    { id: 'doc_2', data: { name: 'Bob' } },
    { id: 'doc_3', data: { name: 'Charlie' } },
  ]
  const count = await batchWrite(db, 'users', docs)
  assert.equal(count, 3)
  assert.equal(db._writtenDocs.length, 3)
  assert.equal(db._writtenDocs[0].id, 'doc_1')
  assert.equal(db._writtenDocs[1].id, 'doc_2')
  assert.equal(db._writtenDocs[2].id, 'doc_3')
})

test('batchWrite returns 0 for empty array', async () => {
  const db = createMockDb()
  const count = await batchWrite(db, 'users', [])
  assert.equal(count, 0)
  assert.equal(db._writtenDocs.length, 0)
})

test('batchWrite writes single document', async () => {
  const db = createMockDb()
  const count = await batchWrite(db, 'users', [{ id: 'single', data: { solo: true } }])
  assert.equal(count, 1)
  assert.equal(db._writtenDocs.length, 1)
})

test('batchWrite handles complex document data', async () => {
  const db = createMockDb()
  const docs = [{
    id: 'complex',
    data: {
      nested: { a: { b: [1, 2, 3] } },
      array: [{ x: 1 }, { y: 2 }],
      timestamp: new Date().toISOString(),
      nullVal: null,
      boolVal: false,
      numVal: 0,
    },
  }]
  const count = await batchWrite(db, 'complex_items', docs)
  assert.equal(count, 1)
  assert.deepEqual(db._writtenDocs[0].data, docs[0].data)
})

// ---------------------------------------------------------------------------
// Batch Size Limit (500) and Splitting
// ---------------------------------------------------------------------------

test('batchWrite splits documents into chunks of 500', async () => {
  const db = createMockDb()
  const BATCH_SIZE = 500

  // Generate 1200 documents
  const docs = Array.from({ length: 1200 }, (_, i) => ({
    id: `doc_${i}`,
    data: { index: i },
  }))

  const count = await batchWrite(db, 'large_collection', docs)
  assert.equal(count, 1200)
  assert.equal(db._writtenDocs.length, 1200)

  // Verify ordering
  assert.equal(db._writtenDocs[0].id, 'doc_0')
  assert.equal(db._writtenDocs[499].id, 'doc_499')
  assert.equal(db._writtenDocs[500].id, 'doc_500')
  assert.equal(db._writtenDocs[999].id, 'doc_999')
  assert.equal(db._writtenDocs[1000].id, 'doc_1000')
  assert.equal(db._writtenDocs[1199].id, 'doc_1199')
})

test('batchWrite handles exactly 500 documents (boundary)', async () => {
  const db = createMockDb()
  const docs = Array.from({ length: 500 }, (_, i) => ({
    id: `doc_${i}`,
    data: { index: i },
  }))
  const count = await batchWrite(db, 'boundary', docs)
  assert.equal(count, 500)
  assert.equal(db._writtenDocs.length, 500)
})

test('batchWrite handles 501 documents (just over boundary)', async () => {
  const db = createMockDb()
  const docs = Array.from({ length: 501 }, (_, i) => ({
    id: `doc_${i}`,
    data: { index: i },
  }))
  const count = await batchWrite(db, 'boundary_plus', docs)
  assert.equal(count, 501)
  assert.equal(db._writtenDocs.length, 501)
})

test('batchWrite handles 1000 documents (two full batches)', async () => {
  const db = createMockDb()
  const docs = Array.from({ length: 1000 }, (_, i) => ({
    id: `doc_${i}`,
    data: { index: i },
  }))
  const count = await batchWrite(db, 'two_batches', docs)
  assert.equal(count, 1000)
  assert.equal(db._writtenDocs.length, 1000)
})

test('batchWrite handles 1 document (lower boundary)', async () => {
  const db = createMockDb()
  const count = await batchWrite(db, 'single', [{ id: 'one', data: { x: 1 } }])
  assert.equal(count, 1)
})

// ---------------------------------------------------------------------------
// batchDelete
// ---------------------------------------------------------------------------

test('batchDelete deletes documents by ID and returns count', async () => {
  const db = createMockDb()
  const ids = ['doc_a', 'doc_b', 'doc_c']
  const count = await batchDelete(db, 'users', ids)
  assert.equal(count, 3)
  assert.deepEqual(db._deletedIds, ['doc_a', 'doc_b', 'doc_c'])
})

test('batchDelete returns 0 for empty array', async () => {
  const db = createMockDb()
  const count = await batchDelete(db, 'users', [])
  assert.equal(count, 0)
  assert.equal(db._deletedIds.length, 0)
})

test('batchDelete handles single ID', async () => {
  const db = createMockDb()
  const count = await batchDelete(db, 'users', ['only_one'])
  assert.equal(count, 1)
  assert.equal(db._deletedIds[0], 'only_one')
})

test('batchDelete splits large ID list into chunks', async () => {
  const db = createMockDb()
  const ids = Array.from({ length: 750 }, (_, i) => `delete_me_${i}`)
  const count = await batchDelete(db, 'big_collection', ids)
  assert.equal(count, 750)
  assert.equal(db._deletedIds.length, 750)
  assert.equal(db._deletedIds[0], 'delete_me_0')
  assert.equal(db._deletedIds[749], 'delete_me_749')
})

test('batchDelete handles exactly 500 IDs', async () => {
  const db = createMockDb()
  const ids = Array.from({ length: 500 }, (_, i) => `id_${i}`)
  const count = await batchDelete(db, 'boundary', ids)
  assert.equal(count, 500)
})

// ---------------------------------------------------------------------------
// batchUpdate
// ---------------------------------------------------------------------------

test('batchUpdate updates documents and returns count', async () => {
  const db = createMockDb()
  const updates = [
    { id: 'doc_a', data: { status: 'active' } },
    { id: 'doc_b', data: { status: 'revoked' } },
  ]
  const count = await batchUpdate(db, 'agents', updates)
  assert.equal(count, 2)
  assert.equal(db._updatedDocs.length, 2)
  assert.equal(db._updatedDocs[0].id, 'doc_a')
  assert.deepEqual(db._updatedDocs[0].data, { status: 'active' })
  assert.equal(db._updatedDocs[1].id, 'doc_b')
  assert.deepEqual(db._updatedDocs[1].data, { status: 'revoked' })
})

test('batchUpdate returns 0 for empty array', async () => {
  const db = createMockDb()
  const count = await batchUpdate(db, 'agents', [])
  assert.equal(count, 0)
})

test('batchUpdate handles single update', async () => {
  const db = createMockDb()
  const count = await batchUpdate(db, 'agents', [{ id: 'single', data: { counter: 42 } }])
  assert.equal(count, 1)
  assert.deepEqual(db._updatedDocs[0].data, { counter: 42 })
})

test('batchUpdate splits large update list into chunks', async () => {
  const db = createMockDb()
  const updates = Array.from({ length: 600 }, (_, i) => ({
    id: `update_${i}`,
    data: { seq: i },
  }))
  const count = await batchUpdate(db, 'big_table', updates)
  assert.equal(count, 600)
  assert.equal(db._updatedDocs.length, 600)
  assert.equal(db._updatedDocs[0].id, 'update_0')
  assert.equal(db._updatedDocs[599].id, 'update_599')
})

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

test('batchWrite propagates batch commit errors', async () => {
  const db = {
    collection() {
      return {
        doc(id) {
          return { id }
        },
      }
    },
    batch() {
      return {
        set() {},
        async commit() {
          throw new Error('Firestore commit failed')
        },
      }
    },
  }
  await assert.rejects(
    batchWrite(db, 'test', [{ id: 'fail', data: {} }]),
    { message: 'Firestore commit failed' }
  )
})

test('batchDelete propagates batch commit errors', async () => {
  const db = {
    collection() {
      return {
        doc(id) {
          return { id }
        },
      }
    },
    batch() {
      return {
        delete() {},
        async commit() {
          throw new Error('Delete commit failed')
        },
      }
    },
  }
  await assert.rejects(
    batchDelete(db, 'test', ['fail']),
    { message: 'Delete commit failed' }
  )
})

test('batchUpdate propagates batch commit errors', async () => {
  const db = {
    collection() {
      return {
        doc(id) {
          return { id }
        },
      }
    },
    batch() {
      return {
        update() {},
        async commit() {
          throw new Error('Update commit failed')
        },
      }
    },
  }
  await assert.rejects(
    batchUpdate(db, 'test', [{ id: 'fail', data: {} }]),
    { message: 'Update commit failed' }
  )
})

test('batch error on first chunk stops processing subsequent chunks', async () => {
  let commitCount = 0
  let setCount = 0
  const db = {
    collection() {
      return {
        doc(id) {
          return { id }
        },
      }
    },
    batch() {
      return {
        set() {
          setCount++
        },
        async commit() {
          commitCount++
          throw new Error('Commit failure')
        },
      }
    },
  }
  const docs = Array.from({ length: 600 }, (_, i) => ({ id: `doc_${i}`, data: { i } }))
  await assert.rejects(batchWrite(db, 'test', docs))
  // Should only have committed the first batch before failing
  assert.equal(commitCount, 1)
  assert.equal(setCount, 500) // First chunk has 500 docs
})

// ---------------------------------------------------------------------------
// Audit Queue Tests
// ---------------------------------------------------------------------------

test('queueAuditEntry adds entry to queue', async () => {
  const db = createMockDb()

  // Reset audit queue state by flushing
  await flushAuditQueue(db)

  queueAuditEntry(db, { id: 'audit_1', data: { action: 'test', timestamp: '2024-01-01' } })
  queueAuditEntry(db, { id: 'audit_2', data: { action: 'test2', timestamp: '2024-01-02' } })

  const count = await flushAuditQueue(db)
  assert.equal(count, 2)
  assert.equal(db._writtenDocs.length, 2)
  assert.equal(db._writtenDocs[0].id, 'audit_1')
  assert.equal(db._writtenDocs[1].id, 'audit_2')
})

test('flushAuditQueue returns 0 when queue is empty', async () => {
  const db = createMockDb()
  await flushAuditQueue(db) // clear any pending
  const count = await flushAuditQueue(db) // flush empty queue
  assert.equal(count, 0)
})

test('flushAuditQueue clears the queue after flush', async () => {
  const db = createMockDb()
  await flushAuditQueue(db) // clear first

  queueAuditEntry(db, { id: 'flush_test', data: { x: 1 } })
  const count1 = await flushAuditQueue(db)
  assert.equal(count1, 1)

  const count2 = await flushAuditQueue(db)
  assert.equal(count2, 0) // Queue should be empty now
})

test('queueAuditEntry auto-flushes when queue reaches AUDIT_FLUSH_SIZE (100)', async () => {
  const db = createMockDb()
  await flushAuditQueue(db) // clear

  // Add 100 entries - should trigger auto-flush
  for (let i = 0; i < 100; i++) {
    queueAuditEntry(db, { id: `auto_${i}`, data: { idx: i } })
  }

  // Allow async flush to complete
  await new Promise(resolve => setTimeout(resolve, 50))

  const remaining = await flushAuditQueue(db)
  // After auto-flush at 100, queue should be empty
  assert.equal(remaining, 0)
})

// ---------------------------------------------------------------------------
// Batch Write Ordering
// ---------------------------------------------------------------------------

test('batchWrite preserves document order across chunks', async () => {
  const db = createMockDb()
  const docs = Array.from({ length: 800 }, (_, i) => ({
    id: `ordered_${String(i).padStart(4, '0')}`,
    data: { order: i },
  }))
  await batchWrite(db, 'ordered', docs)

  for (let i = 0; i < 800; i++) {
    assert.equal(db._writtenDocs[i].id, `ordered_${String(i).padStart(4, '0')}`)
    assert.equal(db._writtenDocs[i].data.order, i)
  }
})

// ---------------------------------------------------------------------------
// Mixed Operations
// ---------------------------------------------------------------------------

test('mixed batch operations: write, then delete, then update', async () => {
  const db = createMockDb()

  await batchWrite(db, 'items', [{ id: 'item_1', data: { name: 'Original' } }])
  await batchDelete(db, 'items', ['item_1'])
  await batchUpdate(db, 'items', [{ id: 'item_1', data: { name: 'Updated' } }])

  assert.equal(db._writtenDocs.length, 1)
  assert.equal(db._deletedIds.length, 1)
  assert.equal(db._updatedDocs.length, 1)
})

// ---------------------------------------------------------------------------
// Large Data Tests
// ---------------------------------------------------------------------------

test('batchWrite handles documents with large data payloads', async () => {
  const db = createMockDb()
  const largeDoc = {
    id: 'large_doc',
    data: {
      description: 'x'.repeat(10000),
      items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })),
    },
  }
  const count = await batchWrite(db, 'heavy', [largeDoc])
  assert.equal(count, 1)
  assert.equal(db._writtenDocs[0].data.description.length, 10000)
  assert.equal(db._writtenDocs[0].data.items.length, 100)
})

test('batchDelete with 1000+ IDs splits correctly', async () => {
  const db = createMockDb()
  const ids = Array.from({ length: 1500 }, (_, i) => `id_${i}`)
  const count = await batchDelete(db, 'mass_delete', ids)
  assert.equal(count, 1500)
  assert.equal(db._deletedIds.length, 1500)
  assert.equal(db._deletedIds[0], 'id_0')
  assert.equal(db._deletedIds[1499], 'id_1499')
})
