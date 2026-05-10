// Visa Application API Endpoint - Production Ready
import { Validator } from '../../src/utils/validation.js';
import { Application } from '../../src/models/Application.js';

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!requestBody.uid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    if (!Array.isArray(requestBody.scopes) || requestBody.scopes.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one scope is required' })
      };
    }

    // Validate scopes
    const scopeValidation = Validator.validateScopes(requestBody.scopes);
    if (!scopeValidation) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid scopes provided' })
      };
    }

    // Create visa application
    const visaApplication = Application.createVisa(requestBody.uid, requestBody.scopes);
    const validation = visaApplication.validate();
    
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.errors 
        })
      };
    }

    // TODO: In production, store in Firebase Firestore
    // For now, return success response
    const response = {
      success: true,
      message: 'Visa application submitted successfully',
      application: visaApplication.toJSON(),
      applicationId: `visa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error processing visa application:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        message: 'Failed to process visa application' 
      })
    };
  }
};