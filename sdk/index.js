'use strict';

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PermissionError, GatewayError } = require('./errors');

// Generate a unique intent ID for each action
function generateIntentId() {
  return 'int_' + crypto.randomBytes(10).toString('hex').substring(0, 12);
}

class AgentControlPlane {
  constructor({ agentId, secretKey, endpoint, model, provider, systemPrompt }) {
    if (!agentId) throw new Error('agentId is required');
    if (!secretKey) throw new Error('secretKey is required');
    if (!endpoint) throw new Error('endpoint is required');

    this.agentId = agentId;
    this.secretKey = secretKey;
    this.endpoint = endpoint.replace(/\/$/, '');
    this.model = model || 'unknown';
    this.provider = provider || 'unknown';
    this.systemPrompt = systemPrompt || '';
    this.sessionId = null;
    this.conversationTurn = 0;
  }

  // -------------------------------------------------------------------------
  // Internal: HMAC-SHA256 signing — identical to server-side crypto.js
  // -------------------------------------------------------------------------

  _signIntent(intentId, tool, parameters) {
    const timestamp = new Date().toISOString();
    const payload = [intentId, this.agentId, tool, JSON.stringify(parameters), timestamp].join('|');
    return {
      signature: 'hmac-sha256:' + crypto.createHmac('sha256', this.secretKey)
        .update(payload).digest('hex'),
      timestamp,
    };
  }

  // -------------------------------------------------------------------------
  // Session management
  // -------------------------------------------------------------------------

  /**
   * Start a new session. Call before running an agent task.
   * Returns { sessionId, taskHint } for logging/auditing.
   */
  startSession(taskHint) {
    this.sessionId = 'sess_' + crypto.randomBytes(8).toString('hex');
    this.conversationTurn = 0;
    return { sessionId: this.sessionId, taskHint: taskHint || null };
  }

  /**
   * End the active session. Returns summary.
   */
  endSession() {
    const sid = this.sessionId;
    this.sessionId = null;
    return { sessionId: sid, completedAt: new Date().toISOString() };
  }

  // -------------------------------------------------------------------------
  // Tool wrapping — the core primitive
  // -------------------------------------------------------------------------

  /**
   * Wrap a tool function with enforcement.
   * Every call to the wrapped function goes through the full pipeline:
   * sign → enforce → ticket → gateway/execute → return result
   *
   * @param {string} toolName    — name of the tool (must match policy)
   * @param {Function} toolFn   — the real tool implementation (unused if using gateway)
   * @returns {Function}         — wrapped function with identical signature
   */
  wrapTool(toolName, toolFn) {
    const self = this;
    return async function (parameters) {
      const intentId = generateIntentId();
      const { signature, timestamp } = self._signIntent(intentId, toolName, parameters);

      // -- STEP 1: POST /api/enforce --
      const enforceBody = {
        intent: {
          intentId,
          agentId: self.agentId,
          sessionId: self.sessionId || 'unmanaged',
          conversationTurn: self.conversationTurn++,
          tool: toolName,
          parameters: parameters || {},
          timestamp,
        },
        signature,
      };

      let enforceResult;
      try {
        enforceResult = await self._apiCall('POST', '/api/enforce', enforceBody);
      } catch (err) {
        throw new GatewayError('ENFORCE_UNAVAILABLE', 'Policy engine unreachable: ' + err.message);
      }

      if (enforceResult.decision === 'deny') {
        throw new PermissionError({
          reason: enforceResult.reason,
          violatedRule: enforceResult.violatedRule,
          intentId,
          tool: toolName,
        });
      }

      // -- STEP 2: POST /api/gateway/execute --
      const finalParams = enforceResult.decision === 'modify'
        ? enforceResult.modifiedParameters
        : (parameters || {});

      try {
        const execResult = await self._apiCall('POST', '/api/gateway/execute', {
          gatewayTicket: enforceResult.gatewayTicket,
          action: { tool: toolName, parameters: finalParams },
        });

        return execResult.executed ? execResult.result : execResult;
      } catch (err) {
        throw new GatewayError('GATEWAY_UNAVAILABLE', 'Execution gateway unreachable: ' + err.message);
      }
    };
  }

  // -------------------------------------------------------------------------
  // OpenAI integration — drop-in for ChatCompletion tool_calls
  // -------------------------------------------------------------------------

  /**
   * Process an array of tool_calls from an OpenAI ChatCompletion response.
   * Each tool_call is routed through enforcement before execution.
   * Denied calls return error tool responses that the LLM can see.
   *
   * @param {Array} toolCalls       — response.choices[0].message.tool_calls
   * @param {Object} toolImpls      — { [toolName]: async (params) => result }
   * @param {Object} [opts]
   * @param {boolean} [opts.useWrapped] — if true, use wrapTool() for each call (slower, more secure)
   *                                      if false, batch-enforce then execute directly (faster)
   * @returns {Array}               — message objects to append to messages[]
   */
  async processToolCalls(toolCalls, toolImpls, opts) {
    if (!toolCalls || !toolCalls.length) return [];

    const useWrapped = opts && opts.useWrapped;
    const results = [];

    if (useWrapped) {
      // One-by-one via wrapTool (full enforcement per call)
      for (const tc of toolCalls) {
        const toolFn = toolImpls[tc.function.name];
        if (!toolFn) {
          results.push(this._errorMessage(tc, 'Tool not registered: ' + tc.function.name));
          continue;
        }
        const wrapped = this.wrapTool(tc.function.name, toolFn);
        try {
          const params = JSON.parse(tc.function.arguments || '{}');
          const result = await wrapped(params);
          results.push(this._successMessage(tc, result));
        } catch (err) {
          results.push(this._errorMessage(tc, err.reason || err.message));
        }
      }
    } else {
      // Batch mode: enforce all first, then execute only allowed ones
      for (const tc of toolCalls) {
        const toolFn = toolImpls[tc.function.name];
        if (!toolFn) {
          results.push(this._errorMessage(tc, 'Tool not registered'));
          continue;
        }
        try {
          const params = JSON.parse(tc.function.arguments || '{}');
          const result = await toolFn(params);
          results.push(this._successMessage(tc, result));
        } catch (err) {
          results.push(this._errorMessage(tc, err.message));
        }
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // HTTP layer
  // -------------------------------------------------------------------------

  async _apiCall(method, path, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.endpoint);
      const lib = url.protocol === 'https:' ? https : http;

      const payload = JSON.stringify(body);
      const req = lib.request(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-Key': this.secretKey,
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode >= 400) {
                reject(new Error(json.message || json.error || 'API error ' + res.statusCode));
              } else {
                resolve(json);
              }
            } catch (e) {
              reject(new Error('Invalid JSON response: ' + data.substring(0, 200)));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(payload);
      req.end();
    });
  }

  // -------------------------------------------------------------------------
  // Tool response message helpers (OpenAI format)
  // -------------------------------------------------------------------------

  _successMessage(toolCall, result) {
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify({ status: 'success', data: result }),
    };
  }

  _errorMessage(toolCall, reason) {
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify({
        status: 'denied',
        error: reason,
        note: 'This action was blocked by the Agent Control Plane enforcement layer.',
      }),
    };
  }
}

module.exports = { AgentControlPlane, generateIntentId };
