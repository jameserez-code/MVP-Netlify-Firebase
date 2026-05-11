'use strict';

const { verifyOrgApiKey, ok, created, error, handleOptions } = require('../src/lib/auth');
const {
  createPolicy, getPolicy, listPolicies, updatePolicy,
} = require('../src/models/policy');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  const q = event.queryStringParameters || {};

  switch (event.httpMethod) {

    // CREATE
    case 'POST': {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch {
        return error('BAD_REQUEST', 'Invalid JSON body');
      }
      if (!body.name) return error('VALIDATION_ERROR', 'Policy name is required');
      if (!body.rules) return error('VALIDATION_ERROR', 'Policy rules are required');
      if (!body.rules.allowedTools || !Array.isArray(body.rules.allowedTools)) {
        return error('VALIDATION_ERROR', 'rules.allowedTools must be an array');
      }

      const result = await createPolicy({
        orgId: auth.org.id,
        name: body.name,
        description: body.description || '',
        scope: body.scope || { agentId: '*', environment: ['*'] },
        priority: body.priority || 50,
        rules: body.rules,
        createdBy: auth.org.ownerId || 'unknown',
      });

      return created(result);
    }

    // READ
    case 'GET': {
      if (q.id) {
        const result = await getPolicy(q.id, auth.org.id);
        if (result.error) return error(result.error.code, result.error.message,
          result.error.code === 'NOT_FOUND' ? 404 : 403);
        return ok(result.policy);
      }
      const policies = await listPolicies(auth.org.id, {
        status: q.status || null,
        agentId: q.agentId || null,
        limit: q.limit || 100,
      });
      return ok({ data: policies, total: policies.length });
    }

    // UPDATE
    case 'PATCH': {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch {
        return error('BAD_REQUEST', 'Invalid JSON body');
      }
      if (!body.id) return error('VALIDATION_ERROR', 'Policy ID is required');

      const updates = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.rules !== undefined) updates.rules = body.rules;
      if (body.status !== undefined) updates.status = body.status;
      if (body.priority !== undefined) updates.priority = body.priority;
      if (body.scope !== undefined) updates.scope = body.scope;

      const result = await updatePolicy(body.id, auth.org.id, updates);
      if (result.error) return error(result.error.code, result.error.message,
        result.error.code === 'NOT_FOUND' ? 404 : 403);
      return ok(result.policy);
    }

    default:
      return error('METHOD_NOT_ALLOWED', 'Use GET, POST, or PATCH', 405);
  }
};
