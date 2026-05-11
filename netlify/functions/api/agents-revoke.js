'use strict';

const { verifyOrgApiKey, ok, error, handleOptions } = require('../src/lib/auth');
const { revokeAgent } = require('../src/models/agent');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'PATCH') return error('METHOD_NOT_ALLOWED', 'Use PATCH', 405);

  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error('BAD_REQUEST', 'Invalid JSON body');
  }

  if (!body.id) return error('VALIDATION_ERROR', 'Agent ID is required');

  const reason = body.reason || 'Revoked by org admin';
  const result = await revokeAgent(body.id, auth.org.id, reason, auth.org.ownerId || 'unknown');

  if (result.error) return error(result.error.code, result.error.message, result.error.code === 'AGENT_UNKNOWN' ? 404 : 403);

  return ok(result.agent);
};
