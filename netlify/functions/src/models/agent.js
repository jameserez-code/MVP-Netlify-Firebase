'use strict';

const { getFirestore } = require('../lib/firestore');
const {
  hashKey,
  generateAgentSecretKey,
  generatePassportNumber,
  hashSystemPrompt,
  generateId,
} = require('../lib/crypto');

async function createAgent({ orgId, name, model, provider, systemPrompt, environment, metadata, createdBy }) {
  const db = getFirestore();
  const secretKey = generateAgentSecretKey();
  const { hash, salt } = hashKey(secretKey);
  const passportNumber = generatePassportNumber();
  const systemPromptHash = hashSystemPrompt(systemPrompt || '');
  const agentId = generateId('agent_');

  const doc = {
    id: agentId,
    orgId,
    name,
    description: '',
    status: 'active',

    passport: {
      passportNumber,
      model,
      provider,
      modelVersion: model,
      systemPromptHash,
      origin: {
        createdBy,
        createdAt: new Date().toISOString(),
        environment: environment || 'production',
      },
    },

    signingKey: {
      keyId: secretKey.substring(0, 14),
      secretHash: hash,
      secretSalt: salt,
      algorithm: 'hmac-sha256',
      iterations: require('../lib/crypto').KEY_ITERATIONS,
      rotatedAt: null,
    },

    registeredAt: new Date().toISOString(),
    lastSeenAt: null,
    revokedAt: null,
    revokedBy: null,
    revokedReason: null,
    metadata: metadata || {},
  };

  await db.collection('agents').doc(agentId).set(doc);

  return {
    agentId,
    passportNumber,
    secretKey,       // plaintext — returned ONCE
    secretKeyPrefix: secretKey.substring(0, 14),
    systemPromptHash,
    registeredAt: doc.registeredAt,
    sdkConfig: {
      agentId,
      model,
      provider,
      environment: environment || 'production',
    },
  };
}

async function getAgent(agentId, orgId) {
  const db = getFirestore();
  const doc = await db.collection('agents').doc(agentId).get();

  if (!doc.exists) {
    return { error: { code: 'AGENT_UNKNOWN', message: 'Agent not found' } };
  }

  const data = doc.data();
  if (orgId && data.orgId !== orgId) {
    return { error: { code: 'FORBIDDEN', message: 'Access denied' } };
  }

  return { agent: { id: doc.id, ...data } };
}

async function listAgents(orgId, opts) {
  const db = getFirestore();
  let q = db.collection('agents').where('orgId', '==', orgId);

  if (opts && opts.status) {
    q = q.where('status', '==', opts.status);
  }

  q = q.orderBy('registeredAt', 'desc');

  if (opts && opts.limit) {
    q = q.limit(parseInt(opts.limit, 10));
  }

  const snapshot = await q.get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function revokeAgent(agentId, orgId, reason, revokedBy) {
  const db = getFirestore();
  const ref = db.collection('agents').doc(agentId);
  const doc = await ref.get();

  if (!doc.exists) {
    return { error: { code: 'AGENT_UNKNOWN', message: 'Agent not found' } };
  }

  const data = doc.data();
  if (orgId && data.orgId !== orgId) {
    return { error: { code: 'FORBIDDEN', message: 'Access denied' } };
  }

  if (data.status === 'revoked') {
    return { agent: { id: agentId, status: 'revoked', message: 'Already revoked' } };
  }

  await ref.update({
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy,
    revokedReason: reason || 'No reason provided',
  });

  return {
    agent: {
      id: agentId,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    }
  };
}

async function rotateAgentKey(agentId, orgId) {
  const db = getFirestore();
  const ref = db.collection('agents').doc(agentId);
  const doc = await ref.get();

  if (!doc.exists) {
    return { error: { code: 'AGENT_UNKNOWN', message: 'Agent not found' } };
  }

  const data = doc.data();
  if (orgId && data.orgId !== orgId) {
    return { error: { code: 'FORBIDDEN', message: 'Access denied' } };
  }

  const newSecretKey = generateAgentSecretKey();
  const { hash, salt } = hashKey(newSecretKey);

  await ref.update({
    'signingKey.keyId': newSecretKey.substring(0, 14),
    'signingKey.secretHash': hash,
    'signingKey.secretSalt': salt,
    'signingKey.iterations': require('../lib/crypto').KEY_ITERATIONS,
    'signingKey.rotatedAt': new Date().toISOString(),
  });

  return {
    agentId,
    newSecretKey,
    newSecretKeyPrefix: newSecretKey.substring(0, 14),
    rotatedAt: new Date().toISOString(),
  };
}

module.exports = { createAgent, getAgent, listAgents, revokeAgent, rotateAgentKey };
