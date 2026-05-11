'use strict';

/**
 * Thrown when the policy engine denies an agent action.
 * Contains structured fields for error handling and auditing.
 */
class PermissionError extends Error {
  constructor({ reason, violatedRule, intentId, tool }) {
    super(`Agent action denied: ${reason}`);
    this.name = 'PermissionError';
    this.code = 'PERMISSION_DENIED';
    this.reason = reason || 'unknown';
    this.violatedRule = violatedRule || null;
    this.intentId = intentId || null;
    this.tool = tool || 'unknown';
  }

  toJSON() {
    return {
      error: this.code,
      reason: this.reason,
      violatedRule: this.violatedRule,
      intentId: this.intentId,
      tool: this.tool,
      message: this.message,
    };
  }
}

/**
 * Thrown when the enforcement gateway is unreachable or returns an error.
 */
class GatewayError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
    };
  }
}

module.exports = { PermissionError, GatewayError };
