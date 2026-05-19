'use strict';

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PermissionError, GatewayError, RequestError } = require('./errors');

// Generate a unique intent ID for each action
function generateIntentId() {
  return 'int_' + crypto.randomBytes(10).toString('hex').substring(0, 12);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AgentControlPlane {
  constructor({ agentId, secretKey, endpoint, apiKey, model, provider, systemPrompt }) {
    if (!agentId) throw new Error('agentId is required');
    if (!secretKey) throw new Error('secretKey is required');
    if (!endpoint) throw new Error('endpoint is required');

    this.agentId = agentId;
    this.secretKey = secretKey;
    this.endpoint = endpoint.replace(/\/$/, '');
    this.apiKey = apiKey || null;
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
  // Agent management
  // -------------------------------------------------------------------------

  /**
   * List all registered agents.
   */
  async listAgents() {
    return this._apiCall('GET', '/agents', null);
  }

  /**
   * Query the audit log.
   * @param {Object} [options]
   * @param {string} [options.decision] — filter by decision
   * @param {string} [options.tool]     — filter by tool name
   * @param {number} [options.limit]    — page size
   * @param {number} [options.offset]   — page offset
   */
  async getAuditLog(options = {}) {
    const search = new URLSearchParams();
    if (options.decision) search.set('decision', options.decision);
    if (options.tool) search.set('tool', options.tool);
    if (options.limit) search.set('limit', String(options.limit));
    if (options.offset) search.set('offset', String(options.offset));
    const query = search.toString();
    return this._apiCall('GET', '/audit' + (query ? `?${query}` : ''), null);
  }

  /**
   * Revoke an agent by ID.
   */
  async revokeAgent(id) {
    return this._apiCall('PATCH', `/agents/${id}/revoke`, {});
  }

  // -------------------------------------------------------------------------
  // HTTP layer with retries and timeout
  // -------------------------------------------------------------------------

  async _apiCall(method, path, body, attempt = 1) {
    const url = new URL(path, this.endpoint);
    const lib = url.protocol === 'https:' ? https : http;

    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'X-Agent-Key': this.secretKey,
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    return new Promise((resolve, reject) => {
      const req = lib.request(
        url,
        {
          method,
          headers,
          timeout: 30000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode >= 400) {
                const err = new Error(json.message || json.error || 'API error ' + res.statusCode);
                // Attach metadata for downstream handling
                err.statusCode = res.statusCode;
                err.code = json.code || 'API_ERROR';
                reject(err);
              } else {
                resolve(json);
              }
            } catch (e) {
              reject(new Error('Invalid JSON response: ' + data.substring(0, 200)));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error('Network error: ' + err.message));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (payload) req.write(payload);
      req.end();
    }).catch(async (err) => {
      const isRetryable =
        err.message.includes('Network error') ||
        err.message.includes('Request timeout') ||
        (err.statusCode >= 500 && err.statusCode < 600);

      if (isRetryable && attempt < 3) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        return this._apiCall(method, path, body, attempt + 1);
      }

      if (attempt >= 3) {
        throw new RequestError(
          err.code || 'REQUEST_FAILED',
          err.message,
          err.statusCode || null
        );
      }

      throw err;
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
