// Execution capability enforcement system
// Integrates with the existing policy engine for fine-grained execution control

import type { Firestore } from 'firebase-admin/firestore'
import { log } from './lib/logger.js'

// ---------------------------------------------------------------------------
// Capability definitions
// ---------------------------------------------------------------------------
export const CAPABILITIES = [
  'filesystem:read',
  'filesystem:write',
  'network:http',
  'network:internal',
  'task:execute',
  'task:create',
  'task:cancel',
  'audit:read',
  'agent:register',
  'policy:manage',
  'run:retry',
  'run:cancel',
] as const;

export type Capability = typeof CAPABILITIES[number];

// Each agent registers with required capabilities
export interface CapabilityProfile {
  agentId: string;
  capabilities: Capability[];
  orgId: string;
}

// ---------------------------------------------------------------------------
// Capability check — must pass before execution
// ---------------------------------------------------------------------------
export async function checkCapability(
  db: Firestore,
  agentId: string,
  requiredCapability: Capability,
): Promise<{ allowed: boolean; reason?: string }> {
  const snap = await db.collection('agents').doc(agentId).get();
  if (!snap.exists) return { allowed: false, reason: 'agent_not_found' };

  const agent = snap.data() as any;
  if (agent.status !== 'active') return { allowed: false, reason: `agent_${agent.status}` };

  const caps: string[] = agent.capabilities || [];
  if (!caps.includes(requiredCapability)) {
    // Log denied capability
    await db.collection('logs').add({
      agentId, tool: 'system.capability', decision: 'deny',
      reason: `missing_capability: ${requiredCapability}`,
      parameters: { requiredCapability, agentCapabilities: caps },
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    log.warn('capability denied', { agentId, requiredCapability });
    return { allowed: false, reason: `missing_capability: ${requiredCapability}` };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Org scoping — enforce org isolation on every query
// ---------------------------------------------------------------------------
export function orgScopedQuery(db: Firestore, collection: string, orgId: string) {
  return db.collection(collection).where('orgId', '==', orgId);
}

// ---------------------------------------------------------------------------
// Org seed — generate isolated demo environments
// ---------------------------------------------------------------------------
export async function seedOrg(
  db: Firestore,
  orgName: string,
  orgEmail: string,
): Promise<{ orgId: string; agentId: string; userId: string }> {
  const orgRef = db.collection('organizations').doc();
  const orgId = orgRef.id;
  const now = new Date().toISOString();

  await orgRef.set({
    id: orgId, name: orgName, slug: orgName.toLowerCase().replace(/\s+/g, '-'),
    plan: 'free', monthlyCredentialLimit: 100, credentialsIssuedThisMonth: 0,
    ownerId: orgEmail, members: [orgEmail], createdAt: now,
  });

  const userRef = db.collection('users').doc(orgEmail);
  await userRef.set({ email: orgEmail, displayName: orgName + ' Admin', role: 'org_admin', orgId, createdAt: now });

  const agentRef = db.collection('agents').doc();
  await agentRef.set({
    id: agentRef.id, name: orgName + ' Bot', model: 'gpt-4o', provider: 'openai',
    orgId, status: 'active',
    capabilities: ['task:execute', 'network:http', 'audit:read'],
    passport: { passportNumber: 'PP-' + Date.now().toString(16).substring(0, 8).toUpperCase(), systemPromptHash: 'sha256:default' },
    registeredAt: now,
  });

  // Create a default policy for the org
  await db.collection('policies').add({
    orgId, name: 'Default Policy', priority: 10, status: 'active',
    scope: { agentId: agentRef.id, environment: ['*'] },
    rules: {
      allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string' } } }],
      deniedTools: ['send_email', 'delete_record'],
      allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
      deniedDomains: ['*.evil.com', '169.254.169.254'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
    createdAt: now, updatedAt: now,
  });

  // Seed 3 demo tasks
  for (let i = 0; i < 3; i++) {
    await db.collection('tasks').add({
      orgId, payload: { description: `Demo task ${i+1} for ${orgName}`, type: 'demo' },
      status: 'pending', createdAt: now, updatedAt: now,
      runCount: 0, retryCount: 0,
    });
  }

  log.success('org seeded', { orgId, orgName, agentId: agentRef.id });
  return { orgId, agentId: agentRef.id, userId: orgEmail };
}

// ---------------------------------------------------------------------------
// Org metrics — scoped operational data
// ---------------------------------------------------------------------------
export async function getOrgMetrics(db: Firestore, orgId: string) {
  const [tasksSnap, agentsSnap, runsSnap] = await Promise.all([
    db.collection('tasks').where('orgId', '==', orgId).get(),
    db.collection('agents').where('orgId', '==', orgId).get(),
    db.collection('runs').where('orgId', '==', orgId).where('status', '==', 'running').get(),
  ]);

  const tasks = tasksSnap.docs.map(d => d.data());
  return {
    orgId,
    tasks: {
      total: tasks.length,
      pending: tasks.filter(t => (t as any).status === 'pending').length,
      running: tasks.filter(t => (t as any).status === 'running').length,
      completed: tasks.filter(t => (t as any).status === 'completed').length,
      failed: tasks.filter(t => (t as any).status === 'failed').length,
    },
    agents: { total: agentsSnap.size, active: agentsSnap.docs.filter(d => d.data().status === 'active').length },
    runs: { active: runsSnap.size },
  };
}
