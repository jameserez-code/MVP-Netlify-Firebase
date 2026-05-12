'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Registered tool implementations for the enforcement gateway.
// Each tool receives validated parameters (already checked by policy engine).
// Tools are registered server-side — agents never call these directly.

const TOOLS = {
  /**
   * Proxy an HTTP request through the gateway.
   * The URL and method have already been validated by the policy engine.
   */
  async http_request(params) {
    const parsedUrl = new URL(params.url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.request(
        params.url,
        {
          method: (params.method || 'GET').toUpperCase(),
          headers: Object.fromEntries(
            Object.entries(params.headers || {}).filter(([k]) =>
              !['host', 'x-gateway-ticket', 'authorization'].includes(k.toLowerCase())
            )
          ),
          timeout: 30000,
        },
        (res) => {
          const chunks = [];
          const maxBytes = params.maxResponseBytes || 100000;
          let totalBytes = 0;

          res.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes <= maxBytes) chunks.push(chunk);
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks).toString('utf8').substring(0, maxBytes),
            });
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error(`HTTP request failed: ${err.message}`));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout (30s)'));
      });

      if (params.body && params.method !== 'GET' && params.method !== 'HEAD') {
        const body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        req.write(body);
      }
      req.end();
    });
  },

  /**
   * Execute a JavaScript function in a sandboxed VM context.
   * DISABLED by default — enable only with code_exec policy scope.
   */
  async exec_code(params) {
    throw new Error('code_exec tool is disabled by default (security policy)');
  },

  /**
   * Stub for database read operations.
   * Replace with actual DB adapter in production.
   */
  async db_read(params) {
    throw new Error('db_read tool requires a configured database adapter');
  },
};

function getTool(name) {
  const fn = TOOLS[name];
  if (!fn) return null;
  return fn;
}

function listTools() {
  return Object.keys(TOOLS);
}

module.exports = { TOOLS, getTool, listTools };
