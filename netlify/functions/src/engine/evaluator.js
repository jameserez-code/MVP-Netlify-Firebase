'use strict';

// ---------------------------------------------------------------------------
// Pure policy evaluator — no I/O, no side effects, unit-testable
// ---------------------------------------------------------------------------
// Given an ACTION_INTENT, the agent's passport, and a list of active policies,
// returns a decision: { decision: "allow"|"deny"|"modify", reason?, violatedRule?,
//                       modifiedParameters?, modifications? }
// ---------------------------------------------------------------------------
// Evaluation order (short-circuit):
//   1. BLOCKED TOOLS — if tool in any policy.deniedTools → DENY
//   2. ALLOWED TOOLS — if tool NOT in any active policy → DENY (no-policy = no-permission)
//   3. DOMAIN CHECK — for HTTP tools: check deniedDomains first (SSRF prevention)
//   4. PARAMETER CONSTRAINTS — validate against matching tool's parameterConstraints
//   5. DATA RESTRICTIONS — PII + secret detection in parameters
//   6. COST LIMIT — check cost estimate (requires external input)
//   7. MODIFY TRANSFORMATIONS — apply modifyParameters rewrites
//   8. If all passed → ALLOW (or MODIFY if transformations applied)
// ---------------------------------------------------------------------------

// Minimum API surface for parameter constraint matching
// Supports: type, enum, pattern (regex), minLength, maxLength, minimum, maximum

function matchesConstraint(value, constraint) {
  if (constraint === undefined || constraint === null) return true;

  // Type check
  if (constraint.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== constraint.type) return false;
  }

  // Enum (exact match)
  if (constraint.enum) {
    if (!constraint.enum.includes(value)) return false;
  }

  // Regex pattern (string values only)
  if (constraint.pattern && typeof value === 'string') {
    try {
      const re = new RegExp(constraint.pattern);
      if (!re.test(value)) return false;
    } catch {
      return false; // invalid regex in policy → deny
    }
  }

  // String length
  if (typeof value === 'string') {
    if (constraint.minLength !== undefined && value.length < constraint.minLength) return false;
    if (constraint.maxLength !== undefined && value.length > constraint.maxLength) return false;
  }

  // Numeric bounds
  if (typeof value === 'number') {
    if (constraint.minimum !== undefined && value < constraint.minimum) return false;
    if (constraint.maximum !== undefined && value > constraint.maximum) return false;
  }

  return true;
}

// Domain glob matching: "*.evil.com" matches "sub.evil.com" and "evil.com"
function domainMatches(pattern, domain) {
  // Escape regex special chars except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // * matches one or more segments
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  try {
    return new RegExp(regexStr, 'i').test(domain);
  } catch {
    return false;
  }
}

// Extract domain from URL string
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// PII detection — basic regex patterns (not comprehensive, but catches common leaks)
const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,                          // SSN
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,    // Credit card
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,    // Email in unexpected places
];

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[\w-]{16,}['"]?/i,
  /\b(sk|pk|rk)_(live|test)_[\w]{16,}\b/i,          // Stripe-style keys
  /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/i,               // JWT in params
];

// Scan parameters for PII and secrets
function scanParams(params, flags) {
  const issues = [];
  const paramsStr = JSON.stringify(params);

  if (flags.denyPiiInParameters) {
    for (const pattern of PII_PATTERNS) {
      if (pattern.test(paramsStr)) {
        issues.push('pii_detected');
        break;
      }
    }
  }

  if (flags.denySecretsInParameters) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(paramsStr)) {
        issues.push('secret_detected');
        break;
      }
    }
  }

  return issues;
}

// ===== MAIN EXPORT =====

function evaluateIntent({
  intent,       // { tool, parameters }
  agentStatus,  // string: "active" | "revoked" | "suspended"
  policies,     // array of active policy documents
  sessionCost,  // number | null — current session cost in USD
  dailyCost,    // number | null — current daily cost in USD
  toolCost,     // number | null — estimated cost of this action
}) {
  const tool = intent.tool;
  const params = intent.parameters || {};

  // --- FAST: agent status ---
  if (agentStatus === 'revoked') {
    return { decision: 'deny', reason: 'agent_revoked', violatedRule: 'agent_status' };
  }
  if (agentStatus === 'suspended') {
    return { decision: 'deny', reason: 'agent_suspended', violatedRule: 'agent_status' };
  }

  // --- STEP 1: BLOCKED TOOLS ---
  for (const policy of policies) {
    if (!policy.rules) continue;
    const denied = policy.rules.deniedTools || [];
    if (denied.includes(tool)) {
      return {
        decision: 'deny',
        reason: 'tool_explicitly_blocked',
        violatedRule: `policy "${policy.name}": deniedTools includes "${tool}"`,
      };
    }
  }

  // --- STEP 2: ALLOWED TOOLS — find matching ToolPolicy ---
  let matchedPolicy = null;
  let matchedToolPolicy = null;

  // Sort policies by priority (ascending)
  const sorted = [...policies].sort((a, b) => (a.priority || 999) - (b.priority || 999));

  for (const policy of sorted) {
    if (!policy.rules || !policy.rules.allowedTools) continue;
    const toolPolicy = policy.rules.allowedTools.find(tp => tp.toolName === tool);
    if (toolPolicy) {
      matchedPolicy = policy;
      matchedToolPolicy = toolPolicy;
      break; // first matching policy wins (highest priority)
    }
  }

  if (!matchedPolicy || !matchedToolPolicy) {
    return {
      decision: 'deny',
      reason: 'tool_not_permitted',
      violatedRule: `No active policy permits tool "${tool}"`,
    };
  }

  // --- STEP 2.5: MODIFY TRANSFORMATIONS (pre-domain, pre-params)
  // Apply modifyParameters rewrites BEFORE domain/param checks
  // so that security-enforced rewrites (like forcing method to GET)
  // take effect before those checks run.
  let workingParams = { ...params };
  const modifications = [];

  if (matchedToolPolicy.modifyParameters) {
    for (const [paramName, forcedValue] of Object.entries(matchedToolPolicy.modifyParameters)) {
      if (workingParams[paramName] !== forcedValue) {
        modifications.push(paramName + ': "' + workingParams[paramName] + '" → "' + forcedValue + '"');
        workingParams[paramName] = forcedValue;
      }
    }
  }
  if (tool === 'http_request' && params.url) {
    const domain = extractDomain(params.url);

    // Blocklist first (overrides allowlist)
    const deniedDomains = matchedPolicy.rules.deniedDomains || [];
    for (const blocked of deniedDomains) {
      if (domainMatches(blocked, domain)) {
        return {
          decision: 'deny',
          reason: 'domain_blocked',
          violatedRule: `policy "${matchedPolicy.name}": domain "${domain}" matches denied "${blocked}"`,
        };
      }
    }

    // Allowlist check
    const allowedDomains = matchedPolicy.rules.allowedDomains || [];
    if (allowedDomains.length > 0) {
      let domainAllowed = false;
      for (const allowed of allowedDomains) {
        if (domainMatches(allowed.pattern, domain)) {
          if (workingParams.method && allowed.methods && !allowed.methods.includes(workingParams.method)) {
            return {
              decision: 'deny',
              reason: 'method_not_permitted',
              violatedRule: `policy "${matchedPolicy.name}": method "${params.method}" not in allowed [${allowed.methods.join(', ')}] for "${allowed.pattern}"`,
            };
          }
          domainAllowed = true;
          break;
        }
      }
      if (!domainAllowed) {
        return {
          decision: 'deny',
          reason: 'domain_not_permitted',
          violatedRule: `policy "${matchedPolicy.name}": domain "${domain}" does not match any allowed pattern`,
        };
      }
    }
  }

  // --- STEP 4: PARAMETER CONSTRAINTS (use workingParams, post-modify) ---
  const constraints = matchedToolPolicy.parameterConstraints || {};
  for (const [paramName, constraint] of Object.entries(constraints)) {
    const paramValue = workingParams[paramName];
    if (!matchesConstraint(paramValue, constraint)) {
      return {
        decision: 'deny',
        reason: 'parameter_constraint_violation',
        violatedRule: `policy "${matchedPolicy.name}": "${paramName}" must satisfy ${JSON.stringify(constraint)}, got ${JSON.stringify(paramValue)}`,
      };
    }
  }

  // --- STEP 5: DATA RESTRICTIONS ---
  if (matchedPolicy.rules.dataRestrictions) {
    const issues = scanParams(workingParams, matchedPolicy.rules.dataRestrictions);
    if (issues.length > 0) {
      return {
        decision: 'deny',
        reason: issues[0],
        violatedRule: `policy "${matchedPolicy.name}": ${issues.join(', ')} detected in parameters`,
      };
    }
  }

  // --- STEP 6: COST LIMIT ---
  if (matchedPolicy.rules.costLimit && toolCost !== null && toolCost !== undefined) {
    const limit = matchedPolicy.rules.costLimit;
    if (limit.maxUsdPerSession && sessionCost !== null && (sessionCost + toolCost) > limit.maxUsdPerSession) {
      return {
        decision: 'deny',
        reason: 'cost_limit_exceeded',
        violatedRule: `policy "${matchedPolicy.name}": session cost would be $${(sessionCost + toolCost).toFixed(4)} > limit $${limit.maxUsdPerSession}`,
      };
    }
    if (limit.maxUsdPerDay && dailyCost !== null && (dailyCost + toolCost) > limit.maxUsdPerDay) {
      return {
        decision: 'deny',
        reason: 'cost_limit_exceeded',
        violatedRule: `policy "${matchedPolicy.name}": daily cost would be $${(dailyCost + toolCost).toFixed(4)} > limit $${limit.maxUsdPerDay}`,
      };
    }
  }

  // --- STEP 7: RETURN DECISION ---
  if (modifications.length > 0) {
    return {
      decision: 'modify',
      modifiedParameters: workingParams,
      modifications,
    };
  }

  return { decision: 'allow' };
}

module.exports = { evaluateIntent };
