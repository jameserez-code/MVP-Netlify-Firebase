// Passport Verification Endpoint
// Validates a passport hash and returns credential status
// Called by QR code scans or third-party services
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let passportNumber, hash;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      passportNumber = body.passportNumber;
      hash = body.hash;
    } else {
      // GET - extract from query params (QR code link format)
      const q = event.queryStringParameters || {};
      passportNumber = q.passport || q.pn;
      hash = q.hash || q.h;
      // Also support combined QR data format: PASSPORT_AGENT_V1|PP-XXXX|0x...|verify@...
      const raw = q.data || q.q || "";
      if (raw.startsWith("PASSPORT_AGENT_V1")) {
        const parts = raw.includes("|") ? raw.split("|") : raw.split(":");
        passportNumber = parts[1] || passportNumber;
        hash = parts[2] || hash;
      }
    }

    if (!passportNumber || !hash) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ verified: false, error: "Passport number and hash required" })
      };
    }

    // In production: query Firestore / database
    // For MVP: return verification based on valid hash format
    const validHashFormat = /^0x[0-9a-f]{8}[.][.][.][0-9a-f]{4}$/i;

    if (!validHashFormat.test(hash)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: false,
          passportNumber,
          reason: "invalid_hash_format"
        })
      };
    }

    // Hash matches format - in production, check against stored hash
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified: true,
        passportNumber,
        hash: hash.substring(0, 12) + "...",
        timestamp: new Date().toISOString(),
        issuer: "passport-agent.netlify.app",
        // In production, return full credential profile
      })
    };

  } catch (error) {
    console.error('Verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ verified: false, error: "Verification service unavailable" })
    };
  }
};