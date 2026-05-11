'use strict';

const { verifyOrgApiKey, ok, error, handleOptions } = require('../src/lib/auth');
const { rotateAgentKey } = require('../src/models/agent');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return error('METHOD_NOT_ALLOWED', 'Use POST', 405);

  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error('BAD_REQUEST', 'Invalid JSON body');
  }

  if (!body.id) return error('VALIDATION_ERROR', 'Agent ID is required');

  const result = await rotateAgentKey(body.id, auth.org.id);

  if (result.error) return error(result.error.code, result.error.message, result.error.code === 'AGENT_UNKNOWN' ? 404 : 403);

  // Return new key — shown once
  return ok({
    agentId: result.agentId,
    newSecretKey: result.newSecretKey,
    newSecretKeyPrefix: result.newSecretKeyPrefix,
    rotatedAt: result.rotatedAt,
    warning: 'Store this key securely. It will not be shown again.',
  });
};
