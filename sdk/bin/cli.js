#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Simple ANSI color helpers (no deps)
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(message, color = c.reset) {
  console.log(`${color}${message}${c.reset}`);
}

function error(message) {
  console.error(`${c.red}Error: ${message}${c.reset}`);
  process.exit(1);
}

function loadConfig() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.passport-agent.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      error(`Invalid .passport-agent.json: ${e.message}`);
    }
  }
  // Env vars override config file
  if (process.env.PASSPORT_API_KEY) config.apiKey = process.env.PASSPORT_API_KEY;
  if (process.env.PASSPORT_API_URL) config.apiUrl = process.env.PASSPORT_API_URL;
  if (process.env.PASSPORT_AGENT_ID) config.agentId = process.env.PASSPORT_AGENT_ID;
  if (process.env.PASSPORT_SECRET_KEY) config.secretKey = process.env.PASSPORT_SECRET_KEY;
  return config;
}

function apiCall(method, urlPath, body, config) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, config.apiUrl || 'http://localhost:3000');
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = lib.request(
      url,
      { method, headers, timeout: 30000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(json.message || json.error?.message || `HTTP ${res.statusCode}`));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function cmdInit() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.passport-agent.json');
  if (fs.existsSync(configPath)) {
    log('Config already exists at .passport-agent.json', c.yellow);
    return;
  }
  const template = {
    apiUrl: 'http://localhost:3000',
    apiKey: null,
    agentId: null,
    secretKey: null,
  };
  fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
  log('Created .passport-agent.json', c.green);
}

async function cmdAgentCreate(args) {
  const config = loadConfig();
  if (!config.apiUrl) error('PASSPORT_API_URL or apiUrl in config is required');

  const nameIdx = args.indexOf('--name');
  const name = nameIdx !== -1 ? args[nameIdx + 1] : null;
  if (!name) error('--name is required');

  log(`Creating agent "${name}"...`, c.cyan);
  try {
    const result = await apiCall('POST', '/agents/register', { name, model: 'unknown', provider: 'cli' }, config);
    log('Agent created successfully', c.green);
    log(`  Agent ID:     ${c.bold}${result.agentId}${c.reset}`);
    log(`  Passport:     ${result.passportNumber}`);
    log(`  Secret Key:   ${c.yellow}${result.secretKey}${c.reset}`);
    log(`  Registered:   ${result.registeredAt}`);
    log('');
    log('Store the secret key securely — it will not be shown again.', c.yellow);
  } catch (err) {
    error(err.message);
  }
}

async function cmdEnforce(args) {
  const config = loadConfig();
  if (!config.apiUrl) error('PASSPORT_API_URL or apiUrl in config is required');
  if (!config.agentId) error('PASSPORT_AGENT_ID or agentId in config is required');
  if (!config.secretKey) error('PASSPORT_SECRET_KEY or secretKey in config is required');

  const toolIdx = args.indexOf('--tool');
  const paramIdx = args.indexOf('--param');
  const tool = toolIdx !== -1 ? args[toolIdx + 1] : null;
  const paramsRaw = paramIdx !== -1 ? args[paramIdx + 1] : '{}';

  if (!tool) error('--tool is required');

  let parameters;
  try {
    parameters = JSON.parse(paramsRaw);
  } catch {
    error('Invalid JSON in --param');
  }

  const crypto = require('crypto');
  const intentId = 'int_' + crypto.randomBytes(10).toString('hex').substring(0, 12);
  const timestamp = new Date().toISOString();
  const payload = [intentId, config.agentId, tool, JSON.stringify(parameters), timestamp].join('|');
  const signature = 'hmac-sha256:' + crypto.createHmac('sha256', config.secretKey)
    .update(payload).digest('hex');

  log(`Enforcing tool "${tool}"...`, c.cyan);
  try {
    const result = await apiCall('POST', '/api/enforce', {
      intent: {
        intentId,
        agentId: config.agentId,
        sessionId: 'cli',
        conversationTurn: 0,
        tool,
        parameters,
        timestamp,
      },
      signature,
    }, config);

    if (result.decision === 'allow') {
      log(`Decision: ${c.green}${c.bold}ALLOW${c.reset}`, c.green);
      if (result.gatewayTicket) log(`Gateway ticket: ${result.gatewayTicket.substring(0, 24)}...`);
    } else if (result.decision === 'deny') {
      log(`Decision: ${c.red}${c.bold}DENY${c.reset}`, c.red);
      log(`Reason: ${result.reason || 'No reason provided'}`);
      if (result.violatedRule) log(`Violated rule: ${result.violatedRule}`);
    } else if (result.decision === 'modify') {
      log(`Decision: ${c.yellow}${c.bold}MODIFY${c.reset}`, c.yellow);
      if (result.modifiedParameters) log(`Modified parameters: ${JSON.stringify(result.modifiedParameters, null, 2)}`);
    }
  } catch (err) {
    error(err.message);
  }
}

async function cmdAudit(args) {
  const config = loadConfig();
  if (!config.apiUrl) error('PASSPORT_API_URL or apiUrl in config is required');

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10;

  log(`Fetching last ${limit} audit entries...`, c.cyan);
  try {
    const result = await apiCall('GET', `/audit?limit=${limit}`, null, config);
    const entries = Array.isArray(result) ? result : result.data || [];
    if (entries.length === 0) {
      log('No audit entries found.', c.gray);
      return;
    }
    log(`Found ${entries.length} entries:\n`, c.green);
    for (const entry of entries.slice(0, limit)) {
      const color = entry.decision === 'allow' ? c.green : entry.decision === 'deny' ? c.red : c.yellow;
      const ts = entry.timestamp || entry.createdAt || '—';
      log(`  [${color}${entry.decision?.toUpperCase() || 'UNKNOWN'}${c.reset}] ${entry.tool || '—'} — ${entry.agentId || '—'} — ${ts}`, color);
      if (entry.reason) log(`    Reason: ${entry.reason}`, c.gray);
    }
  } catch (err) {
    error(err.message);
  }
}

async function cmdStatus() {
  const config = loadConfig();
  const url = config.apiUrl || 'http://localhost:3000';
  log(`Checking status of ${url}...`, c.cyan);
  try {
    await apiCall('GET', '/health', null, config);
    log('API is reachable and healthy.', c.green);
  } catch (err) {
    log(`API status check failed: ${err.message}`, c.red);
    process.exit(1);
  }
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case 'init':
      await cmdInit();
      break;
    case 'agent':
      if (args[0] === 'create') {
        await cmdAgentCreate(args.slice(1));
      } else {
        error('Unknown agent subcommand. Try: passport-agent agent create --name "My Agent"');
      }
      break;
    case 'enforce':
      await cmdEnforce(args);
      break;
    case 'audit':
      await cmdAudit(args);
      break;
    case 'status':
      await cmdStatus();
      break;
    default:
      log(`${c.bold}passport-agent CLI${c.reset} — AI Agent Passport SDK`, c.cyan);
      log('');
      log('Usage:');
      log('  passport-agent init                           Create .passport-agent.json');
      log('  passport-agent agent create --name "<name>"   Register a new agent');
      log('  passport-agent enforce --tool <tool>          Test policy enforcement');
      log('                        --param \'<json>\'');
      log('  passport-agent audit --limit <n>              View recent audit log');
      log('  passport-agent status                         Check API connectivity');
      log('');
      log('Config sources (in order of precedence):');
      log('  1. Environment variables (PASSPORT_API_KEY, PASSPORT_API_URL, ...)');
      log('  2. .passport-agent.json in current directory');
      log('');
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
