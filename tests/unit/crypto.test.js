import test from 'node:test';
import assert from 'node:assert/strict';
import cp from '../../netlify/functions/src/lib/crypto.js';

test('generateAgentSecretKey', () => {
  const key = cp.generateAgentSecretKey();
  assert.ok(key.startsWith('ak_live_'));
  assert.ok(key.length > 30);
});

test('generatePassportNumber', () => {
  const pn = cp.generatePassportNumber();
  assert.match(pn, /^PP-[A-F0-9]{4}-[A-F0-9]{4}$/);
});

test('hashKey and verifyKey', () => {
  const key = 'test_secret_key_12345';
  const { hash, salt } = cp.hashKey(key);

  assert.ok(hash.length > 60);
  assert.ok(salt.length > 30);

  assert.ok(cp.verifyKey(key, hash, salt));
  assert.ok(!cp.verifyKey('wrong_key', hash, salt));
  assert.ok(!cp.verifyKey(key, hash, 'wrong_salt'));
});

test('verifyKey rejects empty strings', () => {
  const { hash, salt } = cp.hashKey('some_key');
  assert.ok(!cp.verifyKey('', hash, salt));
});

test('signIntent and verifyIntentSignature', () => {
  const intent = {
    intentId: 'int_001',
    agentId: 'agent_01',
    tool: 'http_request',
    parameters: { url: 'https://api.test.com' },
    timestamp: new Date().toISOString(),
  };
  const secret = 'my_secret_key_12345';

  intent.signature = cp.signIntent(intent, secret);
  assert.ok(intent.signature.startsWith('hmac-sha256:'));

  assert.ok(cp.verifyIntentSignature(intent, secret));
  assert.ok(!cp.verifyIntentSignature(intent, 'wrong_secret'));

  // Tampered intent
  const tampered = { ...intent, tool: 'send_email' };
  tampered.signature = intent.signature;
  assert.ok(!cp.verifyIntentSignature(tampered, secret));
});

test('generatePassportJWT and verifyPassportJWT', () => {
  const jwt = cp.generatePassportJWT('agent_01', 'PP-TEST-0001', 'key_001', 'jwt_secret');
  assert.ok(jwt.split('.').length === 3);

  const decoded = cp.verifyPassportJWT(jwt, 'jwt_secret');
  assert.equal(decoded.sub, 'agent_01');
  assert.equal(decoded.pn, 'PP-TEST-0001');
  assert.ok(decoded.iat);
  assert.ok(decoded.exp > decoded.iat);
  assert.ok(decoded.jti);
});

test('verifyPassportJWT rejects wrong secret', () => {
  const jwt = cp.generatePassportJWT('agent_01', 'PP-TEST', 'key_001', 'secret_A');
  assert.throws(() => cp.verifyPassportJWT(jwt, 'secret_B'), { message: 'invalid_signature' });
});

test('verifyPassportJWT rejects malformed token', () => {
  assert.throws(() => cp.verifyPassportJWT('not.a.jwt', 'secret'));
  assert.throws(() => cp.verifyPassportJWT('a.b', 'secret'));
});

test('generateGatewayTicket and verifyGatewayTicket', () => {
  process.env.ENGINE_SECRET = 'test_engine_secret_42';
  const ticket = cp.generateGatewayTicket('int_001', 'agent_01', 'http_request', { url: 'https://test.com' });
  assert.ok(ticket.split('.').length === 3);

  const payload = cp.verifyGatewayTicket(ticket);
  assert.equal(payload.iid, 'int_001');
  assert.equal(payload.aid, 'agent_01');
  assert.equal(payload.tool, 'http_request');
  assert.deepEqual(payload.params, { url: 'https://test.com' });
  assert.ok(payload.jti);
  assert.ok(payload.exp > payload.iat);
});

test('gateway ticket is unique per call', () => {
  const t1 = cp.generateGatewayTicket('int_001', 'a1', 'tool', {});
  const t2 = cp.generateGatewayTicket('int_001', 'a1', 'tool', {});
  assert.notEqual(t1, t2);
  assert.notEqual(cp.verifyGatewayTicket(t1).jti, cp.verifyGatewayTicket(t2).jti);
});

test('hashSystemPrompt is deterministic', () => {
  const h1 = cp.hashSystemPrompt('You are a helpful assistant');
  const h2 = cp.hashSystemPrompt('You are a helpful assistant');
  const h3 = cp.hashSystemPrompt('You are an EVIL assistant');

  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.ok(h1.startsWith('sha256:'));
  assert.ok(h1.length === 71);
});

test('generateId produces unique IDs', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) ids.add(cp.generateId('test_', 8));
  assert.equal(ids.size, 100);
});

test('generateIntentId produces unique IDs', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) ids.add(cp.generateIntentId());
  assert.equal(ids.size, 100);
});

// Edge case tests
test('hashKey rejects empty string', () => {
  assert.throws(() => cp.hashKey(''), { message: 'plaintext must not be empty' });
});

test('verifyKey handles empty strings safely', () => {
  const { hash, salt } = cp.hashKey('valid_key');
  assert.ok(!cp.verifyKey('', hash, salt));
  assert.ok(!cp.verifyKey('valid', '', salt));
  assert.ok(!cp.verifyKey('valid', hash, ''));
  assert.ok(!cp.verifyKey('', '', ''));
});

test('verifyKey with very long key (1000+ chars)', () => {
  const longKey = 'x'.repeat(2000);
  const { hash, salt } = cp.hashKey(longKey);
  assert.ok(cp.verifyKey(longKey, hash, salt));
  assert.ok(!cp.verifyKey(longKey + '!', hash, salt));
});

test('hashKey with non-ASCII characters', () => {
  const key = 'café_naïve_🔥_密钥';
  const { hash, salt } = cp.hashKey(key);
  assert.ok(hash.length > 60);
  assert.ok(cp.verifyKey(key, hash, salt));
  assert.ok(!cp.verifyKey('cafe_naive', hash, salt));
});

test('hashSystemPrompt with empty string', () => {
  const h = cp.hashSystemPrompt('');
  assert.ok(h.startsWith('sha256:'));
});

test('hashSystemPrompt with very long prompt', () => {
  const longPrompt = 'You are a helpful assistant. '.repeat(1000);
  const h = cp.hashSystemPrompt(longPrompt);
  assert.ok(h.startsWith('sha256:'));
});

test('generateGatewayTicket with empty parameters', () => {
  process.env.ENGINE_SECRET = 'test_secret';
  const ticket = cp.generateGatewayTicket('int_001', 'agent_01', 'http_request', {});
  const payload = cp.verifyGatewayTicket(ticket);
  assert.deepEqual(payload.params, {});
});

test('generateGatewayTicket with deeply nested parameters', () => {
  process.env.ENGINE_SECRET = 'test_secret';
  const nested = { a: { b: { c: { d: { e: 'deep' } } } } };
  const ticket = cp.generateGatewayTicket('int_001', 'agent_01', 'tool', nested);
  const payload = cp.verifyGatewayTicket(ticket);
  assert.deepEqual(payload.params, nested);
});

test('concurrent generateId produces unique IDs', () => {
  const ids = new Set();
  const batch = [];
  for (let i = 0; i < 1000; i++) batch.push(cp.generateId('id_'));
  batch.forEach(id => ids.add(id));
  assert.equal(ids.size, 1000);
});

test('concurrent verifyKey operations', () => {
  const { hash, salt } = cp.hashKey('concurrent_test');
  const results = [];
  for (let i = 0; i < 100; i++) results.push(cp.verifyKey('concurrent_test', hash, salt));
  assert.ok(results.every(r => r === true));
});
