exports.handler = async function(event, context) {
  // Simple in-memory placeholder waitlist response (no persistence during MVP)
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waitlist: { ok: true, timestamp: Date.now() } })
  };
};
