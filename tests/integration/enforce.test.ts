// Integration test for enforce pipeline — run against local server
// npx tsx tests/integration/enforce.test.ts
// Requires: npm run dev running on localhost:3000

const API = 'http://localhost:3000';
let token = '';
let agentId = '';
const runCount = { passed: 0, failed: 0 };

function pass(name: string) { runCount.passed++; console.log('  ✓ ' + name); }
function fail(name: string, msg: string) { runCount.failed++; console.log('  ✗ ' + name + ': ' + msg); }

async function api(method: string, path: string, body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + path, opts);
    return await res.json();
  } catch (e: any) { return { error: { code: 'network', message: e.message } }; }
}

async function run() {
  console.log('\nEnforce Pipeline Integration Test\n');

  const login = await api('POST', '/auth/login', { email: 'admin@acmecorp.com', password: 'admin' });
  if (login.token) { token = login.token; pass('login'); }
  else { fail('login', JSON.stringify(login)); }

  const agent = await api('POST', '/agents/register', { name: 'Test Agent', model: 'gpt-4o', provider: 'openai' });
  if (agent.agentId) { agentId = agent.agentId; pass('agent registered'); }
  else { fail('agent registered', JSON.stringify(agent)); }

  const policy = await api('POST', '/policies', {
    name: 'Test Enforce Policy', priority: 1, scope: { agentId },
    rules: {
      allowedTools: [
        { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
        { toolName: 'http_request', parameterConstraints: { url: { type: 'string' } } },
      ],
      deniedTools: ['send_email'],
      allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
      deniedDomains: ['*.evil.com', '169.254.169.254'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  });
  if (policy.id) { pass('policy created'); }
  else { fail('policy created', JSON.stringify(policy)); }

  const r1 = await api('POST', '/enforce', {
    intent: { intentId: 'int_test_allow', agentId, tool: 'lookup_order', parameters: { orderId: '123' } },
  });
  if (r1.decision === 'allow' && r1.gatewayTicket) { pass('enforce ALLOW + ticket'); }
  else { fail('enforce ALLOW', JSON.stringify(r1)); }

  const r2 = await api('POST', '/enforce', {
    intent: { intentId: 'int_test_deny', agentId, tool: 'send_email', parameters: { to: 'evil@evil.com' } },
  });
  if (r2.decision === 'deny' && r2.reason === 'tool_explicitly_blocked') { pass('enforce DENY (blocked)'); }
  else { fail('enforce DENY', JSON.stringify(r2)); }

  const r3 = await api('POST', '/enforce', {
    intent: { intentId: 'int_test_ssrf', agentId, tool: 'http_request', parameters: { url: 'http://169.254.169.254/' } },
  });
  if (r3.decision === 'deny' && r3.reason === 'domain_blocked') { pass('enforce DENY (SSRF)'); }
  else { fail('enforce SSRF', JSON.stringify(r3)); }

  const r4 = await api('POST', '/enforce', {
    intent: { intentId: 'int_test_pii', agentId, tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } },
  });
  if (r4.decision === 'deny' && r4.reason === 'pii_detected') { pass('enforce DENY (PII)'); }
  else { fail('enforce PII', JSON.stringify(r4)); }

  const ticket = r1.gatewayTicket;
  const gw = await api('POST', '/gateway/execute', { gatewayTicket: ticket, action: { tool: 'lookup_order', parameters: { orderId: '42' } } });
  if (gw.executed === true) { pass('gateway execute'); }
  else { fail('gateway execute', JSON.stringify(gw)); }

  const replay = await api('POST', '/gateway/execute', { gatewayTicket: ticket, action: { tool: 'lookup_order', parameters: { orderId: '42' } } });
  if (replay.error?.code === 'ticket_replayed') { pass('gateway replay blocked'); }
  else { fail('gateway replay', JSON.stringify(replay)); }

  const audit = await api('GET', '/audit');
  if (audit.data && audit.data.length >= 4) { pass('audit has ' + audit.data.length + ' entries'); }
  else { fail('audit', JSON.stringify(audit)); }

  console.log('\n' + runCount.passed + '/' + (runCount.passed + runCount.failed) + ' tests passed\n');
  process.exit(runCount.failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
