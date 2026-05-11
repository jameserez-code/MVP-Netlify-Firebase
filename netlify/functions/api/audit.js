'use strict';

const { verifyOrgApiKey, ok, error, handleOptions } = require('../src/lib/auth');
const { getFirestore } = require('../src/lib/firestore');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return error('METHOD_NOT_ALLOWED', 'Use GET', 405);

  const auth = await verifyOrgApiKey(event);
  if (auth.error) return error(auth.error.code, auth.error.message, 401);

  const q = event.queryStringParameters || {};
  const db = getFirestore();

  try {
    let query = db.collection('actionIntents')
      .where('orgId', '==', auth.org.id)
      .orderBy('createdAt', 'desc');

    if (q.agentId) query = query.where('agentId', '==', q.agentId);
    if (q.decision) query = query.where('decision', '==', q.decision);
    if (q.tool) query = query.where('tool', '==', q.tool);

    const limit = Math.min(parseInt(q.limit || '50', 10), 100);
    const page = Math.max(parseInt(q.page || '1', 10), 1);

    query = query.limit(limit);

    const snapshot = await query.get();
    const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Simple offset pagination (Fine for MVP; cursor-based later)
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);

    return ok({
      data,
      pagination: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    });
  } catch (err) {
    console.error('Audit query error:', err);
    return error('AUDIT_ERROR', 'Failed to query audit log', 500);
  }
};
