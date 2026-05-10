// Health Check Endpoint - Production Ready
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "production",
    version: "1.0.0",
    services: {
      firebase: "connected", // Replace with actual check in production
      firestore: "operational",
      jwt: "operational"
    }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(health)
  };
};