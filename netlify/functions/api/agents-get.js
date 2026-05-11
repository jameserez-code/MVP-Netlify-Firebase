'use strict';

const { verifyOrgApiKey, ok, error, handleOptions } = require('../src/lib/auth');
const { getAgent } = require('../src/models/agent');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return error('METHOD_NOT_ALLOWED', 'Use GET', 405);

  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  // Extract agent ID from path: /api/agents-get?id=agent_xxx
  const agentId = (event.queryStringParameters || {}).id;
  if (!agentId) return error('VALIDATION_ERROR', 'Query parameter "id" is required');

  const result = await getAgent(agentId, auth.org.id);
  if (result.error) return error(result.error.code, result.error.message, result.error.code === 'AGENT_UNKNOWN' ? 404 : 403);

  return ok(result.agent);
};
