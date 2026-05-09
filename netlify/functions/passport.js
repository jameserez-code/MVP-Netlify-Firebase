exports.handler = async function(event, context) {
  // Placeholder Passport JWT-style token (do not use in production)
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passport: { token } })
  };
};
