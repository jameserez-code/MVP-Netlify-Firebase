import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, generateSecurePassword } from '../../dist/lib/password.js'

test('hashPassword produces hash and salt', () => {
  const result = hashPassword('my_secure_password')
  assert.ok(typeof result.hash === 'string')
  assert.ok(typeof result.salt === 'string')
  assert.ok(result.hash.length > 60)
  assert.ok(result.salt.length === 64)
})

test('hashPassword produces different salts for same input', () => {
  const r1 = hashPassword('same_password')
  const r2 = hashPassword('same_password')
  assert.notEqual(r1.salt, r2.salt)
  assert.notEqual(r1.hash, r2.hash)
})

test('verifyPassword returns true for correct password', () => {
  const { hash, salt } = hashPassword('correct_password')
  assert.equal(verifyPassword('correct_password', hash, salt), true)
})

test('verifyPassword returns false for wrong password', () => {
  const { hash, salt } = hashPassword('my_password')
  assert.equal(verifyPassword('wrong_password', hash, salt), false)
})

test('verifyPassword returns false for empty password', () => {
  const { hash, salt } = hashPassword('real_password')
  assert.equal(verifyPassword('', hash, salt), false)
})

test('verifyPassword throws for empty hash (timingSafeEqual requires matching lengths)', () => {
  const { salt } = hashPassword('test')
  assert.throws(() => verifyPassword('test', '', salt), /Input buffers must have the same byte length/)
})

test('verifyPassword returns false for empty salt', () => {
  const { hash } = hashPassword('test')
  // With empty salt, PBKDF2 won't produce the same hash
  assert.equal(verifyPassword('test', hash, ''), false)
})

test('verifyPassword is case-sensitive', () => {
  const { hash, salt } = hashPassword('CaseSensitive')
  assert.equal(verifyPassword('casesensitive', hash, salt), false)
  assert.equal(verifyPassword('CaseSensitive', hash, salt), true)
})

test('generateSecurePassword produces unique passwords', () => {
  const passwords = new Set()
  for (let i = 0; i < 100; i++) {
    passwords.add(generateSecurePassword())
  }
  assert.equal(passwords.size, 100)
})

test('generateSecurePassword default length is 48 hex chars (24 bytes)', () => {
  const pwd = generateSecurePassword()
  assert.equal(pwd.length, 48)
})

test('generateSecurePassword respects custom length', () => {
  const pwd = generateSecurePassword(16)
  assert.equal(pwd.length, 32)
})

test('hashPassword works with special characters', () => {
  const pwd = 'p@ssw0rd! ñó基 🤖'
  const { hash, salt } = hashPassword(pwd)
  assert.ok(verifyPassword(pwd, hash, salt))
  assert.equal(verifyPassword('p@ssw0rd! ñó基', hash, salt), false)
})

test('hashPassword works with very long password', () => {
  const longPwd = 'a'.repeat(10000)
  const { hash, salt } = hashPassword(longPwd)
  assert.ok(verifyPassword(longPwd, hash, salt))
})
