'use strict';

const { error, ok, handleOptions } = require('../src/lib/auth');
const { verifyGatewayTicket } = require('../src/lib/crypto');
const { markTicketUsed, getFirestore } = require('../src/lib/firestore');

// Registered tool implementations
const TOOLS = {
  http_request: async (params) => {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    const parsedUrl = new URL(params.url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.request(
        params.url,
        {
          method: (params.method || 'GET').toUpperCase(),
          headers: params.headers || {},
          timeout: 30000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body.substring(0, 100000), // cap at 100KB
          }));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      if (params.body && params.method !== 'GET') {
        req.write(typeof params.body === 'string' ? params.body : JSON.stringify(params.body));
      }
      req.end();
    });
  },
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return error('METHOD_NOT_ALLOWED', 'Use POST', 405);

  // --- PARSE ---
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error('BAD_REQUEST', 'Invalid JSON body');
  }

  if (!body.gatewayTicket) return error('VALIDATION_ERROR', 'gatewayTicket is required');
  if (!body.action) return error('VALIDATION_ERROR', 'action is required');
  if (!body.action.tool) return error('VALIDATION_ERROR', 'action.tool is required');

  // --- VERIFY TICKET ---
  let ticketPayload;
  try {
    ticketPayload = verifyGatewayTicket(body.gatewayTicket);
  } catch (err) {
    if (err.message === 'ticket_expired') return error('TICKET_EXPIRED', 'Gateway ticket has expired', 403);
    if (err.message === 'invalid_ticket_signature') return error('INVALID_TICKET', 'Gateway ticket signature is invalid', 403);
    return error('INVALID_TICKET', 'Gateway ticket is invalid: ' + err.message, 403);
  }

  // --- REPLAY PREVENTION (atomic Firestore transaction) ---
  try {
    await markTicketUsed(ticketPayload.iid);
  } catch (err) {
    if (err.message === 'ticket_replayed') return error('TICKET_REPLAYED', 'Ticket has already been used (replay detected)', 403);
    if (err.message === 'ticket_expired') return error('TICKET_EXPIRED', 'Ticket expired', 403);
    if (err.message === 'ticket_not_found') return error('TICKET_NOT_FOUND', 'Ticket not found', 404);
    console.error('Ticket marking error:', err);
    return error('GATEWAY_ERROR', 'Ticket validation failed', 500);
  }

  // --- DISPATCH TOOL ---
  const toolFn = TOOLS[body.action.tool];
  if (!toolFn) {
    return error('TOOL_NOT_FOUND', 'No registered tool: ' + body.action.tool, 404);
  }

  const startMs = Date.now();
  try {
    const result = await toolFn(ticketPayload.params);
    const latencyMs = Date.now() - startMs;

    const auditId = require('../src/lib/crypto').generateId('aud_', 10);

    // Log execution result (ASYNC)
    logExecution(ticketPayload.iid, true, { success: true, statusCode: result.statusCode || 200, latencyMs }).catch(() => {});

    return ok({
      executed: true,
      result,
      latencyMs,
      auditId,
    });
  } catch (execErr) {
    const latencyMs = Date.now() - startMs;
    logExecution(ticketPayload.iid, false, { success: false, error: execErr.message, latencyMs }).catch(() => {});
    return error('EXECUTION_FAILED', 'Tool execution failed: ' + execErr.message, 502);
  }
};

async function logExecution(intentId, executed, result) {
  const db = getFirestore();
  try {
    await db.collection('actionIntents').doc(intentId).update({
      executed,
      executionResult: result,
    });
  } catch (e) {
    console.error('Execution log error:', e);
  }
}
