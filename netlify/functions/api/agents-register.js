'use strict';

const { verifyOrgApiKey, json, created, error, handleOptions } = require('../src/lib/auth');
const { createAgent } = require('../src/models/agent');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return error('METHOD_NOT_ALLOWED', 'Use POST', 405);

  // Authenticate — org API key required
  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  // Parse and validate body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error('BAD_REQUEST', 'Invalid JSON body');
  }

  if (!body.name || !body.name.trim()) {
    return error('VALIDATION_ERROR', 'Agent name is required');
  }
  if (!body.model) {
    return error('VALIDATION_ERROR', 'Model is required');
  }
  if (!body.provider) {
    return error('VALIDATION_ERROR', 'Provider is required');
  }

  try {
    const result = await createAgent({
      orgId: auth.org.id,
      name: body.name.trim(),
      model: body.model,
      provider: body.provider,
      systemPrompt: body.systemPrompt || '',
      environment: body.environment || 'production',
      metadata: body.metadata || {},
      createdBy: auth.org.ownerId || 'unknown',
    });

    return created(result);
  } catch (err) {
    console.error('Agent registration error:', err);
    return error('INTERNAL_ERROR', 'Failed to register agent: ' + err.message, 500);
  }
};
