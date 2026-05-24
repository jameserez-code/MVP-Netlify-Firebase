import test from 'node:test'
import assert from 'node:assert/strict'
import { DdosProtection } from '../../dist/lib/ddos-protection.js'

test('ddos protection allows normal requests', async () => {
  const ddos = new DdosProtection()
  const result = await ddos.check('192.168.1.100')
  assert.equal(result.allowed, true)
})

test('ddos protection blocks requests exceeding per-minute limit', async () => {
  const ddos = new DdosProtection()
  const ip = '10.0.0.99'
  for (let i = 0; i < 100; i++) {
    const result = await ddos.check(ip)
    assert.equal(result.allowed, true, `request ${i + 1} should pass`)
    await ddos.release(ip)
  }
  const blocked = await ddos.check(ip)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.reason.includes('Rate limit exceeded'))
})

test('ddos protection tracks concurrent connections', async () => {
  const ddos = new DdosProtection()
  const ip = '172.16.0.50'
  for (let i = 0; i < 10; i++) {
    const result = await ddos.check(ip)
    assert.equal(result.allowed, true)
  }
  const blocked = await ddos.check(ip)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.reason.includes('concurrent'))
})

test('ddos protection release decrements concurrent count', async () => {
  const ddos = new DdosProtection()
  const ip = '172.16.0.51'
  await ddos.check(ip)
  await ddos.check(ip)
  await ddos.release(ip)
  const result = await ddos.check(ip)
  assert.equal(result.allowed, true)
})

test('ddos protection blocks IP after excessive errors', async () => {
  const ddos = new DdosProtection()
  const ip = '10.20.30.40'
  for (let i = 0; i < 499; i++) {
    await ddos.recordError(ip)
  }
  await ddos.recordError(ip)
  const blocked = await ddos.check(ip)
  assert.equal(blocked.allowed, false, '500th error should block the IP')
  assert.ok(blocked.reason.includes('excessive errors'))
})

test('ddos protection does not block below error threshold', async () => {
  const ddos = new DdosProtection()
  const ip = '10.20.30.41'
  for (let i = 0; i < 400; i++) {
    await ddos.recordError(ip)
  }
  const result = await ddos.check(ip)
  assert.equal(result.allowed, true)
})

test('ddos protection IP blocking is time-limited', async () => {
  const ddos = new DdosProtection()
  const ip = '10.30.40.55'
  for (let i = 0; i < 500; i++) {
    await ddos.recordError(ip)
  }
  const blocked = await ddos.check(ip)
  assert.equal(blocked.allowed, false)

  await new Promise(r => setTimeout(r, 10))
  const stillBlocked = await ddos.check(ip)
  assert.equal(stillBlocked.allowed, false)
})

test('ddos protection request window resets after 1 minute', async () => {
  const originalDateNow = Date.now
  let fakeTime = Date.now()

  Date.now = () => fakeTime

  try {
    const ddos = new DdosProtection()
    const ip = '10.40.50.60'
    for (let i = 0; i < 100; i++) {
      await ddos.check(ip)
      await ddos.release(ip)
    }
    const blocked = await ddos.check(ip)
    assert.equal(blocked.allowed, false)

    fakeTime += 65_000
    const afterWindow = await ddos.check(ip)
    assert.equal(afterWindow.allowed, true)
  } finally {
    Date.now = originalDateNow
  }
})

test('ddos protection error window resets hourly', async () => {
  const originalDateNow = Date.now
  let fakeTime = Date.now()

  Date.now = () => fakeTime

  try {
    const ddos = new DdosProtection()
    const ip = '10.50.60.70'
    for (let i = 0; i < 500; i++) {
      await ddos.recordError(ip)
    }
    const blocked = await ddos.check(ip)
    assert.equal(blocked.allowed, false)

    fakeTime += 3_600_001
    const afterHour = await ddos.check(ip)
    assert.equal(afterHour.allowed, true)
  } finally {
    Date.now = originalDateNow
  }
})

test('ddos protection different IPs isolated', async () => {
  const ddos = new DdosProtection()
  const ip1 = '10.0.0.1'
  const ip2 = '10.0.0.2'

  for (let i = 0; i < 100; i++) {
    await ddos.check(ip1)
    await ddos.release(ip1)
  }
  const blocked = await ddos.check(ip1)
  assert.equal(blocked.allowed, false)

  const allowed = await ddos.check(ip2)
  assert.equal(allowed.allowed, true)
})
