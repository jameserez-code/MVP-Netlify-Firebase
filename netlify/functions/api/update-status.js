// Update Application Status API Endpoint
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (!body.id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Application ID is required' }) };
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'issued'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
      };
    }

    // In production: update Firestore document
    // For MVP: return success (frontend handles localStorage persistence)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Application ${body.id} status updated to ${body.status}`,
        id: body.id,
        status: body.status,
        updatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error updating application status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: 'Failed to update application status' })
    };
  }
};
