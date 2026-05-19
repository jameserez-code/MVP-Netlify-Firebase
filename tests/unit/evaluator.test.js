import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateIntent } from '../../netlify/functions/src/engine/evaluator.js';

const PRODUCTION_POLICY = {
  name: 'Customer Support Bot — Production Policy',
  priority: 10,
  rules: {
    allowedTools: [
      {
        toolName: 'lookup_order',
        parameterConstraints: { orderId: { type: 'string', minLength: 1 } },
      },
      {
        toolName: 'http_request',
        parameterConstraints: { url: { type: 'string' } },
        modifyParameters: { method: 'GET' },
      },
    ],
    deniedTools: ['send_email', 'delete_record'],
    allowedDomains: [
      { pattern: '*.internal.com', methods: ['GET'] },
      { pattern: 'api.partner.io', methods: ['GET', 'POST'] },
    ],
    deniedDomains: ['*.evil.com', '169.254.169.254', 'localhost', '127.0.0.1'],
    dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    costLimit: { maxUsdPerSession: 0.05, maxUsdPerDay: 1.00 },
  },
};

function run(desc, input, expected) {
  test(desc, () => {
    const result = evaluateIntent(input);
    assert.equal(result.decision, expected.decision);
    if (expected.reason) assert.equal(result.reason, expected.reason);
    if (expected.modifications) assert.deepEqual(result.modifications, expected.modifications);
  });
}

run('1. blocked tool → deny(tool_explicitly_blocked)', {
  intent: { tool: 'send_email', parameters: {} },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'tool_explicitly_blocked' });

run('2. unlisted tool → deny(tool_not_permitted)', {
  intent: { tool: 'rm_rf_everything', parameters: {} },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'tool_not_permitted' });

run('3. valid lookup → allow', {
  intent: { tool: 'lookup_order', parameters: { orderId: '12345' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'allow' });

run('4. empty orderId → deny(parameter_constraint_violation)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'parameter_constraint_violation' });

run('5. HTTP to evil.com → deny(domain_not_permitted)', {
  intent: { tool: 'http_request', parameters: { url: 'https://evil.com/data' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'domain_not_permitted' });

run('6. HTTP to 169.254.169.254 → deny(domain_blocked)', {
  intent: { tool: 'http_request', parameters: { url: 'http://169.254.169.254/latest/meta-data' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'domain_blocked' });

run('7. POST to internal → modify to GET', {
  intent: { tool: 'http_request', parameters: { url: 'https://api.internal.com/data', method: 'POST' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'modify' });

run('8. no policies → deny(tool_not_permitted)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1' } },
  agentStatus: 'active',
  policies: [],
}, { decision: 'deny', reason: 'tool_not_permitted' });

run('9. revoked agent → deny(agent_revoked)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1' } },
  agentStatus: 'revoked',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'agent_revoked' });

run('10. session cost exceeded → deny(cost_limit_exceeded)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
  sessionCost: 0.04,
  toolCost: 0.02,
}, { decision: 'deny', reason: 'cost_limit_exceeded' });

run('11. PII in parameters → deny(pii_detected)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'pii_detected' });

run('12. suspended agent → deny(agent_suspended)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1' } },
  agentStatus: 'suspended',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'agent_suspended' });

run('13. API key in params → deny(secret_detected)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1', api_key: 'sk_live_abc123def456ghi789' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'deny', reason: 'secret_detected' });

run('14. DELETE on allowed domain → modify (modified to GET before domain check)', {
  intent: { tool: 'http_request', parameters: { url: 'https://api.internal.com/admin', method: 'DELETE' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'modify' });

run('15. daily cost exceeded → deny(cost_limit_exceeded)', {
  intent: { tool: 'lookup_order', parameters: { orderId: '1' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
  dailyCost: 0.99,
  toolCost: 0.02,
}, { decision: 'deny', reason: 'cost_limit_exceeded' });

run('16. domain precision — subdomain with GET (no change needed) → allow', {
  intent: { tool: 'http_request', parameters: { url: 'https://orders.internal.com/status', method: 'GET' } },
  agentStatus: 'active',
  policies: [PRODUCTION_POLICY],
}, { decision: 'allow' });

test('17. blocked tools are global — deny trumps allow across all policies', () => {
  const permissivePolicy = {
    name: 'Permissive',
    priority: 1,
    rules: {
      allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string' } } }],
      deniedTools: [],
    },
  };
  const restrictivePolicy = {
    name: 'Restrictive',
    priority: 100,
    rules: {
      allowedTools: [],
      deniedTools: ['lookup_order'],
    },
  };
  const result = evaluateIntent({
    intent: { tool: 'lookup_order', parameters: { orderId: '1' } },
    agentStatus: 'active',
    policies: [permissivePolicy, restrictivePolicy],
  });
  assert.equal(result.decision, 'deny', 'Denied because restrictPolicy (any policy) blocks lookup_order');
});
