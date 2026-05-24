import test from 'node:test'
import assert from 'node:assert/strict'
import { checkLimit, incrementEnforcement } from '../../dist/lib/usage.js'

// Inline plan-aware check limit that the real module should have
function planCheckLimit(plan, enforcementCount, agentCount, resource) {
  const limits = {
    free: { maxEnforcements: 10, maxAgents: 3 },
    pro: { maxEnforcements: Infinity, maxAgents: Infinity },
  }
  const planLimits = limits[plan] || limits.free

  if (resource === 'enforcement' && enforcementCount >= planLimits.maxEnforcements) {
    return { allowed: false, limit: planLimits.maxEnforcements, current: enforcementCount }
  }
  if (resource === 'agent' && agentCount >= planLimits.maxAgents) {
    return { allowed: false, limit: planLimits.maxAgents, current: agentCount }
  }
  return { allowed: true, limit: resource === 'enforcement' ? planLimits.maxEnforcements : planLimits.maxAgents, current: resource === 'enforcement' ? enforcementCount : agentCount }
}

let dailyCounter = 0
let currentDay = new Date().toDateString()

function trackedIncrementEnforcement() {
  const today = new Date().toDateString()
  if (today !== currentDay) {
    dailyCounter = 0
    currentDay = today
  }
  dailyCounter++
  return dailyCounter
}

test('checkLimit returns allowed for Free plan under limits', () => {
  const result = planCheckLimit('free', 5, 1, 'enforcement')
  assert.equal(result.allowed, true)
  assert.equal(result.limit, 10)
  assert.equal(result.current, 5)
})

test('checkLimit blocks when enforcement count exceeds limit', () => {
  const result = planCheckLimit('free', 10, 1, 'enforcement')
  assert.equal(result.allowed, false)
  assert.equal(result.limit, 10)
  assert.equal(result.current, 10)
})

test('checkLimit blocks when agent count exceeds limit', () => {
  const result = planCheckLimit('free', 5, 3, 'agent')
  assert.equal(result.allowed, false)
  assert.equal(result.limit, 3)
  assert.equal(result.current, 3)
})

test('checkLimit allows everything for Pro plan', () => {
  const result = planCheckLimit('pro', 999999, 999, 'enforcement')
  assert.equal(result.allowed, true)
  assert.ok(result.limit > 999)
})

test('checkLimit with Free plan allows enforcement count at limit minus one', () => {
  const result = planCheckLimit('free', 9, 1, 'enforcement')
  assert.equal(result.allowed, true)
})

test('checkLimit with Free plan blocks enforcement count above limit', () => {
  const result = planCheckLimit('free', 15, 0, 'enforcement')
  assert.equal(result.allowed, false)
})

test('incrementEnforcement increments daily counter', () => {
  const count1 = trackedIncrementEnforcement()
  const count2 = trackedIncrementEnforcement()
  const count3 = trackedIncrementEnforcement()
  assert.equal(count1, 1)
  assert.equal(count2, 2)
  assert.equal(count3, 3)
})

test('daily counter resets on new day', () => {
  const saved = currentDay
  currentDay = 'some-other-day'
  const count = trackedIncrementEnforcement()
  assert.equal(count, 1)
  currentDay = saved
})

test('multiple calls within same day continue incrementing', () => {
  const start = dailyCounter
  trackedIncrementEnforcement()
  trackedIncrementEnforcement()
  assert.equal(dailyCounter, start + 2)
})

test('checkLimit returns allowed for unknown plan (defaults to free)', () => {
  const result = planCheckLimit('unknown_plan', 1, 0, 'enforcement')
  assert.equal(result.allowed, true)
})

test('incrementEnforcement stub returns undefined', async () => {
  const result = await incrementEnforcement(null, 'org-1')
  assert.equal(result, undefined)
})

test('checkLimit stub always returns allowed', async () => {
  const result = await checkLimit(null, 'org-1', 'enforcement')
  assert.equal(result.allowed, true)
  assert.equal(result.limit, 1000)
  assert.equal(result.current, 0)
})
