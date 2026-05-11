const crypto = require('crypto');

exports.handler = async function(event, context) {
  // Simulate data for the passport
  const passportData = {
    id: 'APP-2024-0012',
    name: 'James Sterling',
    issuedAt: new Date().toISOString(),
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString(),
    status: 'Verified'
  };

  // Generate a mock blockchain transaction hash (SHA-256)
  const dataString = JSON.stringify(passportData);
  const blockchainHash = crypto.createHash('sha256').update(dataString + Date.now()).digest('hex');

  // Generate a QR code URL (using Google Charts API for simplicity)
  // The QR code contains the passport ID and the blockchain hash for verification
  const qrData = `Passport ID: ${passportData.id}\nHash: ${blockchainHash}`;
  const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      passport: {
        ...passportData,
        blockchainHash,
        qrCodeUrl,
        securityLevel: 'Very High',
        verifiedOnBlockchain: true
      }
    })
  };
};
