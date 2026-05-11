'use strict';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

function generateAgentSecretKey() {
  const seed = crypto.randomBytes(32);
  return `ak_live_${seed.toString('hex')}`;
}

function generatePassportNumber() {
  const segments = [];
  for (let i = 0; i < 2; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').substring(0, 4).toUpperCase());
  }
  return `PP-${segments.join('-')}`;
}

// ---------------------------------------------------------------------------
// Key hashing — PBKDF2 with configurable iterations
// ---------------------------------------------------------------------------

const KEY_ITERATIONS = 50000;
const KEY_DIGEST = 'sha512';
const KEY_LENGTH = 64;

function hashKey(plaintext) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(plaintext, salt, KEY_ITERATIONS, KEY_LENGTH, KEY_DIGEST).toString('hex');
  return { hash, salt, iterations: KEY_ITERATIONS, digest: KEY_DIGEST };
}

function verifyKey(plaintext, hash, salt, iterations) {
  const iter = iterations || KEY_ITERATIONS;
  const computed = crypto.pbkdf2Sync(plaintext, salt, iter, KEY_LENGTH, KEY_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

// ---------------------------------------------------------------------------
// Intent signing — HMAC-SHA256
// ---------------------------------------------------------------------------

function signIntent(intentFields, secret) {
  const payload = [
    intentFields.intentId,
    intentFields.agentId,
    intentFields.tool,
    JSON.stringify(intentFields.parameters),
    intentFields.timestamp || new Date().toISOString()
  ].join('|');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `hmac-sha256:${hmac.digest('hex')}`;
}

function verifyIntentSignature(intentFields, secret) {
  const expected = signIntent(intentFields, secret);
  const provided = intentFields.signature;
  if (!provided) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

// ---------------------------------------------------------------------------
// Passport JWT — short-lived, HMAC-SHA256 signed
// ---------------------------------------------------------------------------

const PASSPORT_TTL_SECONDS = 900; // 15 minutes

function generatePassportJWT(agentId, passportNumber, keyId, secret) {
  const header = { alg: 'HS256', typ: 'JWT', kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: agentId,
    pn: passportNumber,
    iat: now,
    exp: now + PASSPORT_TTL_SECONDS,
    jti: crypto.randomBytes(8).toString('hex')
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');
  return `${signatureInput}.${sig}`;
}

function verifyPassportJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('invalid_token_format');

    const sigInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(sigInput).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(parts[2]))) {
      throw new Error('invalid_signature');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('token_expired');
    }

    return payload; // { sub, pn, iat, exp, jti }
  } catch (err) {
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Gateway ticket JWT — ultra-short-lived, 30 second TTL
// ---------------------------------------------------------------------------

const TICKET_TTL_SECONDS = 30;
let ENGINE_SECRET = null;

function getEngineSecret() {
  if (!ENGINE_SECRET) {
    ENGINE_SECRET = process.env.ENGINE_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return ENGINE_SECRET;
}

function generateGatewayTicket(intentId, agentId, tool, parameters) {
  const secret = getEngineSecret();
  const header = { alg: 'HS256', typ: 'GATEWAY_TICKET' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iid: intentId,
    aid: agentId,
    tool,
    params: typeof parameters === 'string' ? parameters : JSON.stringify(parameters),
    iat: now,
    exp: now + TICKET_TTL_SECONDS,
    jti: crypto.randomBytes(8).toString('hex')
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64url');
  return `${headerB64}.${payloadB64}.${sig}`;
}

function verifyGatewayTicket(token) {
  const secret = getEngineSecret();
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('invalid_ticket_format');

    const sigInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(sigInput).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(parts[2]))) {
      throw new Error('invalid_ticket_signature');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('ticket_expired');
    }

    payload.params = JSON.parse(payload.params);
    return payload; // { iid, aid, tool, params, iat, exp, jti }
  } catch (err) {
    throw err;
  }
}

// ---------------------------------------------------------------------------
// System prompt hashing
// ---------------------------------------------------------------------------

function hashSystemPrompt(systemPrompt) {
  const hash = crypto.createHash('sha256');
  hash.update(systemPrompt);
  return `sha256:${hash.digest('hex')}`;
}

// ---------------------------------------------------------------------------
// Random ID generation
// ---------------------------------------------------------------------------

function generateId(prefix, length) {
  const len = length || 16;
  return `${prefix}${crypto.randomBytes(len).toString('hex').substring(0, len)}`;
}

function generateIntentId() {
  return generateId('int_', 12);
}

// ---------------------------------------------------------------------------
// Benchmark helper (for development testing)
// ---------------------------------------------------------------------------

function benchPbkdf2(sampleKey) {
  const testKey = sampleKey || 'test_key_for_benchmarking_12345';
  const label = `PBKDF2-${KEY_DIGEST} x${KEY_ITERATIONS}`;
  console.time(label);
  hashKey(testKey);
  console.timeEnd(label);
}

module.exports = {
  // Config
  KEY_ITERATIONS,
  KEY_DIGEST,
  KEY_LENGTH,
  PASSPORT_TTL_SECONDS,
  TICKET_TTL_SECONDS,

  // Key generation
  generateAgentSecretKey,
  generatePassportNumber,

  // Key hashing
  hashKey,
  verifyKey,

  // Intent signing
  signIntent,
  verifyIntentSignature,

  // Passport JWT
  generatePassportJWT,
  verifyPassportJWT,

  // Gateway tickets
  generateGatewayTicket,
  verifyGatewayTicket,
  getEngineSecret,

  // System prompt
  hashSystemPrompt,

  // IDs
  generateId,
  generateIntentId,

  // Dev helpers
  benchPbkdf2,
};
