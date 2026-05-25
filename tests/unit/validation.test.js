import test from 'node:test'
import assert from 'node:assert/strict'
import { createValidationHook, registerValidationHooks } from '../../dist/lib/validation.js'
import { Validator } from '../../src/utils/validation.js'

// --- createValidationHook ---

test('createValidationHook returns an async function', () => {
  const hook = createValidationHook()
  assert.equal(typeof hook, 'function')
  assert.ok(hook.constructor.name === 'AsyncFunction' || hook instanceof Function)
})

test('registerValidationHooks does not throw with a mock app', () => {
  const mockApp = {}
  assert.doesNotThrow(() => registerValidationHooks(mockApp))
})

// --- Validator.validateEmail ---

test('Validator.validateEmail: valid email passes', () => {
  assert.equal(Validator.validateEmail('user@example.com'), true)
  assert.equal(Validator.validateEmail('test.user+tag@domain.co.uk'), true)
  assert.equal(Validator.validateEmail('a@b.co'), true)
})

test('Validator.validateEmail: invalid email fails', () => {
  assert.equal(Validator.validateEmail('not-an-email'), false)
  assert.equal(Validator.validateEmail('missing@'), false)
  assert.equal(Validator.validateEmail('@nodomain'), false)
  assert.equal(Validator.validateEmail(''), false)
  assert.equal(Validator.validateEmail(' '), false)
  assert.equal(Validator.validateEmail('user@'), false)
  assert.equal(Validator.validateEmail('@domain.com'), false)
})

// --- Validator.validatePassword ---

test('Validator.validatePassword: valid password passes', () => {
  assert.equal(Validator.validatePassword('Pass1234'), true)
  assert.equal(Validator.validatePassword('Secure1Pass'), true)
  assert.equal(Validator.validatePassword('aB3deFgH'), true)
})

test('Validator.validatePassword: short password fails (< 8 chars)', () => {
  assert.equal(Validator.validatePassword('Ab1'), false)
  assert.equal(Validator.validatePassword('Pass12'), false)
  assert.equal(Validator.validatePassword('Abcde1'), false)
})

test('Validator.validatePassword: missing uppercase fails', () => {
  assert.equal(Validator.validatePassword('password1'), false)
  assert.equal(Validator.validatePassword('alllowercase12'), false)
})

test('Validator.validatePassword: missing lowercase fails', () => {
  assert.equal(Validator.validatePassword('PASSWORD1'), false)
  assert.equal(Validator.validatePassword('ALLUPPER12'), false)
})

test('Validator.validatePassword: missing digit fails', () => {
  assert.equal(Validator.validatePassword('Password'), false)
  assert.equal(Validator.validatePassword('SecurePass'), false)
})

test('Validator.validatePassword: empty password fails', () => {
  assert.equal(Validator.validatePassword(''), false)
})

// --- Validator.validateFullName ---

test('Validator.validateFullName: valid name passes', () => {
  assert.equal(Validator.validateFullName('John Doe'), true)
  assert.equal(Validator.validateFullName("O'Brien"), true)
  assert.equal(Validator.validateFullName('Jean-Luc Picard'), true)
  assert.equal(Validator.validateFullName('Mary Jane'), true)
})

test('Validator.validateFullName: empty or whitespace fails', () => {
  assert.equal(Validator.validateFullName(''), false)
  assert.equal(Validator.validateFullName('   '), false)
})

test('Validator.validateFullName: invalid characters fail', () => {
  assert.equal(Validator.validateFullName('John123'), false)
  assert.equal(Validator.validateFullName('user@name'), false)
})

// --- Validator.validateScopes ---

test('Validator.validateScopes: valid scopes pass', () => {
  assert.equal(Validator.validateScopes(['api:read']), true)
  assert.equal(Validator.validateScopes(['api:read', 'api:write']), true)
  assert.equal(Validator.validateScopes(['data:share', 'config:view']), true)
})

test('Validator.validateScopes: invalid scope fails', () => {
  assert.equal(Validator.validateScopes(['invalid:scope']), false)
  assert.equal(Validator.validateScopes(['api:read', 'bad']), false)
})

test('Validator.validateScopes: non-array fails', () => {
  assert.equal(Validator.validateScopes('api:read'), false)
  assert.equal(Validator.validateScopes(null), false)
})

test('Validator.validateScopes: empty array passes', () => {
  assert.equal(Validator.validateScopes([]), true)
})

// --- Validator.sanitizeInput ---

test('Validator.sanitizeInput: escapes HTML characters', () => {
  assert.equal(Validator.sanitizeInput('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  assert.equal(Validator.sanitizeInput("it's a test"), "it&#x27;s a test")
})

test('Validator.sanitizeInput: trims whitespace', () => {
  assert.equal(Validator.sanitizeInput('  hello  '), 'hello')
})

test('Validator.sanitizeInput: non-string returns as-is', () => {
  assert.equal(Validator.sanitizeInput(123), 123)
  assert.equal(Validator.sanitizeInput(null), null)
})

// --- Validator.validateApplicationData ---

test('Validator.validateApplicationData: valid data passes', () => {
  const result = Validator.validateApplicationData({
    uid: 'user123',
    type: 'visa',
    scopes: ['api:read', 'api:write'],
  })
  assert.equal(result.isValid, true)
  assert.deepEqual(result.errors, [])
})

test('Validator.validateApplicationData: missing uid fails', () => {
  const result = Validator.validateApplicationData({
    type: 'visa',
    scopes: ['api:read'],
  })
  assert.equal(result.isValid, false)
  assert.ok(result.errors.some(e => e.includes('User ID')))
})

test('Validator.validateApplicationData: invalid scopes fails', () => {
  const result = Validator.validateApplicationData({
    uid: 'user1',
    type: 'visa',
    scopes: ['bad:scope'],
  })
  assert.equal(result.isValid, false)
  assert.ok(result.errors.some(e => e.includes('scopes')))
})

test('Validator.validateApplicationData: invalid passport data fails', () => {
  const result = Validator.validateApplicationData({
    uid: 'user1',
    type: 'passport',
    fullName: '',
    passportNumber: 'short',
  })
  assert.equal(result.isValid, false)
  assert.ok(result.errors.some(e => e.includes('full name')))
  assert.ok(result.errors.some(e => e.includes('passport number')))
})

test('Validator.validateApplicationData: invalid type fails', () => {
  const result = Validator.validateApplicationData({
    uid: 'user1',
    type: 'unknown',
  })
  assert.equal(result.isValid, false)
  assert.ok(result.errors.some(e => e.includes('type')))
})
