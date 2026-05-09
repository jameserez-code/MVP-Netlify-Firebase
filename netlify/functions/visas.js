exports.handler = async function(event, context) {
  // Placeholder Visa generator (MVP). In production, implement proper auth and persistence.
  const response = {
    id: 'visa-demo-001',
    scopes: ['api:read'],
    issuedAt: new Date().toISOString()
  };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visa: response })
  };
};
