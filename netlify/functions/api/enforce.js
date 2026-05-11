'use strict';

const { verifyAgentKey, error, ok, handleOptions } = require('../src/lib/auth');
const { verifyIntentSignature, generateGatewayTicket, TICKET_TTL_SECONDS, generateId } = require('../src/lib/crypto');
const { evaluateIntent } = require('../src/engine/evaluator');
const { getActivePoliciesForAgent } = require('../src/models/policy');
const { getFirestore } = require('../src/lib/firestore');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return error('METHOD_NOT_ALLOWED', 'Use POST', 405);

  // --- AUTH: agent key ---
  const auth = await verifyAgentKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);
  const agent = auth.agent;

  // --- PARSE ---
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error('BAD_REQUEST', 'Invalid JSON body');
  }

  const intent = body.intent;
  if (!intent) return error('VALIDATION_ERROR', 'Field "intent" is required');
  if (!intent.intentId) return error('VALIDATION_ERROR', 'intent.intentId is required');
  if (!intent.tool) return error('VALIDATION_ERROR', 'intent.tool is required');

  // --- VERIFY SIGNATURE ---
  const agentSecret = event.headers['x-agent-key'];
  const sigValid = verifyIntentSignature(
    { ...intent, signature: body.signature || '' },
    agentSecret
  );
  if (!sigValid) {
    return error('INVALID_SIGNATURE', 'Action intent signature verification failed', 403);
  }

  // --- FETCH POLICIES ---
  const env = (agent.passport && agent.passport.origin && agent.passport.origin.environment) || 'production';
  const policies = await getActivePoliciesForAgent(agent.orgId, agent.id, env);

  // --- EVALUATE (pure function call) ---
  const decision = evaluateIntent({
    intent: { tool: intent.tool, parameters: intent.parameters || {} },
    agentStatus: agent.status,
    policies,
    sessionCost: null,
    dailyCost: null,
    toolCost: null,
  });

  // --- RESPONSE ---
  const response = {
    decision: decision.decision,
    intentId: intent.intentId,
    decidedAt: new Date().toISOString(),
  };

  if (decision.reason) {
    response.reason = decision.reason;
    response.violatedRule = decision.violatedRule;
  }

  // Issue gateway ticket for allow/modify
  if (decision.decision === 'allow' || decision.decision === 'modify') {
    const finalParams = decision.decision === 'modify'
      ? decision.modifiedParameters
      : (intent.parameters || {});

    response.gatewayTicket = generateGatewayTicket(
      intent.intentId,
      agent.id,
      intent.tool,
      finalParams
    );
    response.ticketExpiresAt = new Date(
      Date.now() + TICKET_TTL_SECONDS * 1000
    ).toISOString();

    if (decision.modifications) {
      response.modifications = decision.modifications;
    }
    if (decision.modifiedParameters) {
      response.modifiedParameters = decision.modifiedParameters;
    }
  }

  // --- LOG to actionIntents (ASYNC — do not await) ---
  logIntent({
    intentId: intent.intentId,
    orgId: agent.orgId,
    agentId: agent.id,
    passportNumber: (agent.passport && agent.passport.passportNumber) || 'unknown',
    sessionId: intent.sessionId || 'unknown',
    conversationTurn: intent.conversationTurn || 0,
    tool: intent.tool,
    parameters: intent.parameters || {},
    modifiedParameters: decision.modifiedParameters || null,
    signature: body.signature || '',
    signedAt: new Date().toISOString(),
    decision: decision.decision,
    decisionReason: decision.reason || null,
    violatedRule: decision.violatedRule || null,
    decidedAt: new Date().toISOString(),
    decisionLatencyMs: 0,
    executed: false,
    executionResult: null,
    createdAt: new Date().toISOString(),
  }).catch(err => console.error('Intent logging error:', err));

  // --- UPDATE agent lastSeenAt (ASYNC) ---
  getFirestore().collection('agents').doc(agent.id)
    .update({ lastSeenAt: new Date().toISOString() })
    .catch(() => {});

  return ok(response);
};

// ---------------------------------------------------------------------------
// Internal: log action intent to Firestore (non-blocking)
// ---------------------------------------------------------------------------
async function logIntent(data) {
  const db = getFirestore();
  await db.collection('actionIntents').doc(data.intentId).set(data);
}
