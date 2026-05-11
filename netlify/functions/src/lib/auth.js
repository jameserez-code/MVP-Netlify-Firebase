'use strict';

const { getFirestore } = require('./firestore');
const { verifyKey } = require('./crypto');

// ---------------------------------------------------------------------------
// Org API key middleware — validates Admin/org-level Bearer token
// ---------------------------------------------------------------------------

async function verifyOrgApiKey(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } };
  }

  const providedKey = authHeader.substring(7);
  if (!providedKey || providedKey.length < 20) {
    return { error: { code: 'UNAUTHORIZED', message: 'Invalid API key format' } };
  }

  try {
    const db = getFirestore();
    const snapshot = await db.collection('organizations')
      .where('orgApiKeyPrefix', '==', providedKey.substring(0, 12))
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } };
    }

    const org = snapshot.docs[0];
    const data = org.data();

    const valid = verifyKey(providedKey, data.orgApiKeyHash, data.orgApiKeySalt, data.orgApiKeyIterations);
    if (!valid) {
      return { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } };
    }

    return { org: { id: org.id, ...data } };
  } catch (err) {
    console.error('Org auth error:', err);
    return { error: { code: 'AUTH_ERROR', message: 'Authentication service unavailable' } };
  }
}

// ---------------------------------------------------------------------------
// Agent key middleware — validates X-Agent-Key header
// ---------------------------------------------------------------------------

async function verifyAgentKey(event) {
  const agentKey = event.headers['x-agent-key'] || '';
  if (!agentKey || agentKey.length < 20) {
    return { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid X-Agent-Key header' } };
  }

  try {
    const db = getFirestore();
    const snapshot = await db.collection('agents')
      .where('signingKey.keyId', '==', agentKey.substring(0, 14))
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { error: { code: 'AGENT_UNKNOWN', message: 'No agent found for this key' } };
    }

    const agent = snapshot.docs[0];
    const data = agent.data();

    if (data.status === 'revoked') {
      return { error: { code: 'AGENT_REVOKED', message: 'This agent has been revoked' } };
    }

    if (data.status === 'suspended') {
      return { error: { code: 'AGENT_SUSPENDED', message: 'This agent is suspended' } };
    }

    const valid = verifyKey(
      agentKey,
      data.signingKey.secretHash,
      data.signingKey.secretSalt,
      data.signingKey.iterations
    );
    if (!valid) {
      return { error: { code: 'UNAUTHORIZED', message: 'Invalid agent key' } };
    }

    return { agent: { id: agent.id, ...data } };
  } catch (err) {
    console.error('Agent auth error:', err);
    return { error: { code: 'AUTH_ERROR', message: 'Authentication service unavailable' } };
  }
}

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Key',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function ok(body) {
  return json(200, body);
}

function created(body) {
  return json(201, body);
}

function error(code, message, statusCode) {
  return json(statusCode || 400, { error: code, message });
}

function handleOptions() {
  return { statusCode: 200, headers: json(200, {}).headers, body: '' };
}

module.exports = { verifyOrgApiKey, verifyAgentKey, json, ok, created, error, handleOptions };
