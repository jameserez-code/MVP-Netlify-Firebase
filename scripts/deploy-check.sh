#!/usr/bin/env bash
# Deployment pre-flight check
# Usage: bash scripts/deploy-check.sh

set -e

echo "=== Passport Agent Deployment Check ==="

# 1. Service account
if [ -f service-account.json ]; then
  echo "  ✓ service-account.json found"
else
  echo "  ✗ service-account.json missing — get from Firebase Console"
  exit 1
fi

# 2. Node version
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [[ "$NODE_VERSION" == v18* ]] || [[ "$NODE_VERSION" == v20* ]] || [[ "$NODE_VERSION" == v22* ]]; then
  echo "  ✓ Node.js $NODE_VERSION"
else
  echo "  ✗ Node.js 18+ required (got $NODE_VERSION)"
  exit 1
fi

# 3. Dependencies installed
if [ -d node_modules ]; then
  echo "  ✓ node_modules found"
else
  echo "  ⚠ node_modules missing — run npm install"
fi

# 4. Firestore healthcheck
echo "  … checking Firestore"
npx tsx src/healthcheck.ts > /dev/null 2>&1 && echo "  ✓ Firestore connected" || echo "  ✗ Firestore unreachable"

# 5. Env vars
[ -n "$JWT_SECRET" ] && echo "  ✓ JWT_SECRET set" || echo "  ⚠ JWT_SECRET not set — using default"
[ -n "$ENGINE_SECRET" ] && echo "  ✓ ENGINE_SECRET set" || echo "  ⚠ ENGINE_SECRET not set — using default"

# 6. Port
echo "  → API would run on :${PORT:-3000}"

echo "=== Check complete ==="
