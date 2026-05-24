import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePayloadSize, sanitizeString, hasInjectionPatterns, sanitizeObject } from '../../dist/lib/input-validation.js'

test('validatePayloadSize accepts body within limit', () => {
  assert.equal(validatePayloadSize('small body'), true)
})

test('validatePayloadSize rejects body exceeding 100KB', () => {
  const bigBody = 'x'.repeat(100_001)
  assert.equal(validatePayloadSize(bigBody), false)
})

test('validatePayloadSize accepts body at exact 100KB limit', () => {
  const exact = 'x'.repeat(100_000)
  assert.equal(validatePayloadSize(exact), true)
})

test('validatePayloadSize accepts empty string', () => {
  assert.equal(validatePayloadSize(''), true)
})

test('sanitizeString escapes HTML angle brackets', () => {
  const result = sanitizeString('<div>hello</div>')
  assert.equal(result, '&lt;div&gt;hello&lt;/div&gt;')
})

test('sanitizeString truncates to 5000 chars', () => {
  const long = 'a'.repeat(6000)
  const result = sanitizeString(long)
  assert.equal(result.length, 5000)
})

test('sanitizeString handles string under truncation limit', () => {
  const short = 'hello world'
  assert.equal(sanitizeString(short), 'hello world')
})

test('hasInjectionPatterns detects script tags', () => {
  assert.equal(hasInjectionPatterns('<script>alert(1)</script>'), true)
})

test('hasInjectionPatterns detects template injection', () => {
  assert.equal(hasInjectionPatterns('${process.env.SECRET}'), true)
})

test('hasInjectionPatterns detects eval', () => {
  assert.equal(hasInjectionPatterns('eval("alert(1)")'), true)
  assert.equal(hasInjectionPatterns('eval (123)'), true)
})

test('hasInjectionPatterns detects Function constructor', () => {
  assert.equal(hasInjectionPatterns('Function("return 1")'), true)
})

test('hasInjectionPatterns detects __proto__', () => {
  assert.equal(hasInjectionPatterns('__proto__'), true)
  assert.equal(hasInjectionPatterns('constructor['), true)
})

test('hasInjectionPatterns allows benign strings', () => {
  assert.equal(hasInjectionPatterns('hello world'), false)
  assert.equal(hasInjectionPatterns('user@example.com'), false)
  assert.equal(hasInjectionPatterns('regular text with <mark> emphasis'), false)
})

test('sanitizeObject deeply sanitizes nested objects', () => {
  const input = {
    name: '<b>John</b>',
    details: {
      bio: '<script>xss</script>',
    }
  }
  const result = sanitizeObject(input)
  assert.equal(result.name, '&lt;b&gt;John&lt;/b&gt;')
  assert.equal(result.details.bio, '&lt;script&gt;xss&lt;/script&gt;')
})

test('sanitizeObject skips keys with injection patterns', () => {
  const input = {
    'normal_key': 'value',
    'protokey': 'should survive',
    'eval(': 'also_dangerous',
  }
  const result = sanitizeObject(input)
  assert.equal(result.normal_key, 'value')
  assert.equal(result.protokey, 'should survive')
  assert.equal(result['eval('], undefined)
})

test('sanitizeObject passes arrays through as-is (no recursive array sanitization)', () => {
  const input = {
    items: ['<img>', 'normal'],
    nested: { values: ['clean', '<div>dirty</div>'] }
  }
  const result = sanitizeObject(input)
  assert.equal(result.items[0], '<img>')
  assert.equal(result.items[1], 'normal')
  assert.deepEqual(result.nested.values, ['clean', '<div>dirty</div>'])
})

test('sanitizeObject handles max depth', () => {
  let deep = {}
  let current = deep
  for (let i = 0; i < 20; i++) {
    current.inner = {}
    current = current.inner
  }
  current.value = '<test>'
  const result = sanitizeObject(deep)
  assert.ok(!result.value)
})
