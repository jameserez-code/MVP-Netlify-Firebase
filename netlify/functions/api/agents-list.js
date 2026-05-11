'use strict';

const { verifyOrgApiKey, ok, error, handleOptions } = require('../src/lib/auth');
const { listAgents } = require('../src/models/agent');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return error('METHOD_NOT_ALLOWED', 'Use GET', 405);

  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  const q = event.queryStringParameters || {};
  const agents = await listAgents(auth.org.id, {
    status: q.status || null,
    limit: q.limit || 50,
  });

  return ok({ data: agents, total: agents.length });
};
