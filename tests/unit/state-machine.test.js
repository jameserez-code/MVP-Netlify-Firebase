import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidTransition, requireTransition, TASK_TRANSITIONS, RUN_TRANSITIONS } from '../../dist/state-machine.js'

test('pending → queued is valid task transition', () => {
  assert.equal(isValidTransition('pending', 'queued', TASK_TRANSITIONS), true)
})

test('pending → cancelled is valid task transition', () => {
  assert.equal(isValidTransition('pending', 'cancelled', TASK_TRANSITIONS), true)
})

test('pending → running is invalid task transition', () => {
  assert.equal(isValidTransition('pending', 'running', TASK_TRANSITIONS), false)
})

test('pending → completed is invalid task transition', () => {
  assert.equal(isValidTransition('pending', 'completed', TASK_TRANSITIONS), false)
})

test('queued → running is valid task transition', () => {
  assert.equal(isValidTransition('queued', 'running', TASK_TRANSITIONS), true)
})

test('running → completed is valid task transition', () => {
  assert.equal(isValidTransition('running', 'completed', TASK_TRANSITIONS), true)
})

test('running → failed is valid task transition', () => {
  assert.equal(isValidTransition('running', 'failed', TASK_TRANSITIONS), true)
})

test('running → cancelled is valid task transition', () => {
  assert.equal(isValidTransition('running', 'cancelled', TASK_TRANSITIONS), true)
})

test('failed → pending is valid task transition (retry)', () => {
  assert.equal(isValidTransition('failed', 'pending', TASK_TRANSITIONS), true)
})

test('completed is terminal (no transitions out)', () => {
  assert.equal(isValidTransition('completed', 'queued', TASK_TRANSITIONS), false)
  assert.equal(isValidTransition('completed', 'running', TASK_TRANSITIONS), false)
  assert.equal(isValidTransition('completed', 'failed', TASK_TRANSITIONS), false)
})

test('cancelled is terminal (no transitions out)', () => {
  assert.equal(isValidTransition('cancelled', 'pending', TASK_TRANSITIONS), false)
  assert.equal(isValidTransition('cancelled', 'queued', TASK_TRANSITIONS), false)
})

test('starting → running is valid run transition', () => {
  assert.equal(isValidTransition('starting', 'running', RUN_TRANSITIONS), true)
})

test('starting → failed is valid run transition', () => {
  assert.equal(isValidTransition('starting', 'failed', RUN_TRANSITIONS), true)
})

test('running → completed is valid run transition', () => {
  assert.equal(isValidTransition('running', 'completed', RUN_TRANSITIONS), true)
})

test('running → timed_out is valid run transition', () => {
  assert.equal(isValidTransition('running', 'timed_out', RUN_TRANSITIONS), true)
})

test('invalid transition returns false for unknown start state', () => {
  assert.equal(isValidTransition('unknown', 'running', TASK_TRANSITIONS), false)
})

test('invalid transition returns false for unknown target state', () => {
  assert.equal(isValidTransition('pending', 'unknown', TASK_TRANSITIONS), false)
})

test('requireTransition throws on invalid transition', () => {
  assert.throws(
    () => requireTransition('pending', 'completed', TASK_TRANSITIONS, 'task_001'),
    (err) => err.message.includes('INVALID_TRANSITION') && err.message.includes('pending') && err.message.includes('completed')
  )
})

test('requireTransition does not throw on valid transition', () => {
  assert.doesNotThrow(
    () => requireTransition('pending', 'queued', TASK_TRANSITIONS, 'task_001')
  )
})

test('requireTransition error message includes resourceId', () => {
  const errMsg = ''
  try {
    requireTransition('running', 'pending', TASK_TRANSITIONS, 'task_ABC123')
  } catch (e) {
    assert.ok(e.message.includes('task_ABC123'))
    assert.ok(e.message.includes('running'))
    assert.ok(e.message.includes('pending'))
  }
})

test('TASK_TRANSITIONS covers all status keys', () => {
  const keys = Object.keys(TASK_TRANSITIONS)
  assert.deepEqual(keys.sort(), ['cancelled', 'completed', 'failed', 'pending', 'queued', 'running'].sort())
})

test('RUN_TRANSITIONS covers all status keys', () => {
  const keys = Object.keys(RUN_TRANSITIONS)
  assert.deepEqual(keys.sort(), ['completed', 'failed', 'running', 'starting', 'timed_out'].sort())
})

test('failed tasks cannot transition to completed directly', () => {
  assert.equal(isValidTransition('failed', 'completed', TASK_TRANSITIONS), false)
})

test('queued → completed is invalid (must go through running)', () => {
  assert.equal(isValidTransition('queued', 'completed', TASK_TRANSITIONS), false)
})
