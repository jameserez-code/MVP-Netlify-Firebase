// Passport Application API Endpoint - Production Ready
import { Validator } from '../../src/utils/validation.js';
import { Application } from '../../src/models/Application.js';
import { passportService } from '../../src/services/passport-service.js';

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    const requiredFields = ['uid', 'fullName', 'passportNumber'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields', 
          details: `Required: ${missingFields.join(', ')}` 
        })
      };
    }

    // Validate inputs
    if (!Validator.validateFullName(body.fullName)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid full name format' }) };
    }
    if (!Validator.validatePassportNumber(body.passportNumber)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid passport number format' }) };
    }

    // Create passport application
    const passportApp = Application.createPassport(
      body.uid,
      Validator.sanitizeInput(body.fullName),
      body.passportNumber.toUpperCase(),
      body.dateOfBirth || null,
      body.nationality || null
    );

    const validation = passportApp.validate();
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Validation failed', details: validation.errors })
      };
    }

    // Issue passport with JWT token
    const passportId = `pass_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    passportApp.id = passportId;

    const issuedPassport = passportService.createPassport(passportApp.toJSON());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Passport issued successfully',
        passport: {
          id: passportId,
          fullName: issuedPassport.fullName,
          passportNumber: issuedPassport.passportNumber,
          issuedAt: issuedPassport.issuedAt,
          status: 'issued',
          token: issuedPassport.token
        }
      })
    };

  } catch (error) {
    console.error('Error issuing passport:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: 'Failed to issue passport' })
    };
  }
};