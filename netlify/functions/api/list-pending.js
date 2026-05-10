// List Pending Applications API Endpoint - Production Ready
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { uid, status, type, page = 1, limit = 20 } = event.queryStringParameters || {};
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // In production, fetch from Firestore
    // For MVP, return structured mock data demonstrating the schema
    const mockApplications = [
      {
        id: 'app_001',
        uid: uid || 'demo_user',
        type: 'visa',
        status: 'pending',
        scopes: ['api:read', 'api:write'],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'app_002',
        uid: uid || 'demo_user',
        type: 'passport',
        status: 'issued',
        fullName: 'James Sterling',
        passportNumber: 'PS789012',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        token: 'eyJhbGciOiJIUzI1NiIs...'
      },
      {
        id: 'app_003',
        uid: uid || 'demo_admin',
        type: 'visa',
        status: 'approved',
        scopes: ['api:read', 'config:admin'],
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        updatedAt: new Date(Date.now() - 5400000).toISOString()
      }
    ];

    // Filter by query params
    let filtered = mockApplications;
    if (uid) filtered = filtered.filter(a => a.uid === uid);
    if (status) filtered = filtered.filter(a => a.status === status);
    if (type) filtered = filtered.filter(a => a.type === type);

    // Paginate
    const total = filtered.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: paginated,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      })
    };

  } catch (error) {
    console.error('Error listing applications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: 'Failed to fetch applications' })
    };
  }
};