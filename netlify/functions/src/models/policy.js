'use strict';

const { getFirestore } = require('../lib/firestore');
const { generateId } = require('../lib/crypto');

async function createPolicy({ orgId, name, description, scope, priority, rules, createdBy }) {
  const db = getFirestore();
  const policyId = generateId('pol_');

  const doc = {
    id: policyId,
    orgId,
    name: name || 'Unnamed Policy',
    description: description || '',
    status: 'active',
    scope: {
      agentId: (scope && scope.agentId) || '*',
      environment: (scope && scope.environment) || ['*'],
    },
    rules: {
      allowedTools: (rules && rules.allowedTools) || [],
      deniedTools: (rules && rules.deniedTools) || [],
      allowedDomains: (rules && rules.allowedDomains) || [],
      deniedDomains: (rules && rules.deniedDomains) || [],
      costLimit: rules && rules.costLimit ? rules.costLimit : null,
      dataRestrictions: rules && rules.dataRestrictions ? rules.dataRestrictions : null,
      timeConstraints: rules && rules.timeConstraints ? rules.timeConstraints : null,
    },
    priority: priority || 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: rules && rules.expiresAt ? rules.expiresAt : null,
    createdBy: createdBy || 'unknown',
  };

  await db.collection('policies').doc(policyId).set(doc);
  return { policyId, ...doc };
}

async function getPolicy(policyId, orgId) {
  const db = getFirestore();
  const doc = await db.collection('policies').doc(policyId).get();
  if (!doc.exists) return { error: { code: 'NOT_FOUND', message: 'Policy not found' } };
  const data = doc.data();
  if (orgId && data.orgId !== orgId) return { error: { code: 'FORBIDDEN', message: 'Access denied' } };
  return { policy: { id: doc.id, ...data } };
}

async function listPolicies(orgId, opts) {
  const db = getFirestore();
  let q = db.collection('policies').where('orgId', '==', orgId);
  if (opts && opts.status) q = q.where('status', '==', opts.status);
  if (opts && opts.agentId) q = q.where('scope.agentId', '==', opts.agentId);
  q = q.orderBy('priority', 'asc');
  if (opts && opts.limit) q = q.limit(parseInt(opts.limit, 10));
  const snapshot = await q.get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updatePolicy(policyId, orgId, updates) {
  const db = getFirestore();
  const ref = db.collection('policies').doc(policyId);
  const doc = await ref.get();
  if (!doc.exists) return { error: { code: 'NOT_FOUND', message: 'Policy not found' } };
  const data = doc.data();
  if (orgId && data.orgId !== orgId) return { error: { code: 'FORBIDDEN', message: 'Access denied' } };

  const payload = { ...updates, updatedAt: new Date().toISOString() };
  delete payload.id;
  delete payload.orgId;
  delete payload.createdAt;
  delete payload.createdBy;

  await ref.update(payload);
  return { policy: { id: policyId, ...data, ...payload } };
}

async function getActivePoliciesForAgent(orgId, agentId, environment) {
  const db = getFirestore();
  // Get policies that:
  // - Belong to the org
  // - Status is active
  // - Scope matches agentId OR scope is '*'
  // - Scope environment matches or is '*'
  // Fetch all active org policies, then filter in-memory (Firestore limitation)
  const snapshot = await db.collection('policies')
    .where('orgId', '==', orgId)
    .where('status', '==', 'active')
    .orderBy('priority', 'asc')
    .get();

  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => {
      const scope = p.scope || {};
      const scopeAgent = scope.agentId || '*';
      const scopeEnv = scope.environment || ['*'];
      const agentMatch = scopeAgent === '*' || scopeAgent === agentId;
      const envMatch = scopeEnv.includes('*') || scopeEnv.includes(environment);
      return agentMatch && envMatch;
    });
}

module.exports = { createPolicy, getPolicy, listPolicies, updatePolicy, getActivePoliciesForAgent };
