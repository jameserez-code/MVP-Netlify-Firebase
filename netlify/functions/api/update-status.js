'use strict';

const { verifyOrgApiKey, ok, error, handleOptions } = require('../src/lib/auth');

// Update Application Status API Endpoint
// Requires Org API Key (Bearer token)
exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  if (event.httpMethod !== 'PATCH') {
    return error('METHOD_NOT_ALLOWED', 'Use PATCH', 405);
  }

  // --- AUTH: verify administrative access ---
  const auth = await verifyOrgApiKey(event);
  if (auth.error) {
    return error(auth.error.code, auth.error.message, 401);
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (!body.id) {
      return error('VALIDATION_ERROR', 'Application ID is required', 400);
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'issued'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return error(
        'VALIDATION_ERROR',
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      );
    }

    // In production: update Firestore document
    // For MVP: return success (frontend handles localStorage persistence)

    return ok({
      success: true,
      message: `Application ${body.id} status updated to ${body.status}`,
      id: body.id,
      status: body.status,
      orgId: auth.org.id,
      updatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error updating application status:', err);
    return error('INTERNAL_ERROR', 'Failed to update application status', 500);
  }
};
