class PermissionError extends Error { constructor(message) { super(message); this.name = 'PermissionError'; } }
class GatewayError extends Error { constructor(message) { super(message); this.name = 'GatewayError'; } }
module.exports = { PermissionError, GatewayError };
