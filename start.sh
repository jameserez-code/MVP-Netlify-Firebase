#!/usr/bin/env bash
# One-command local startup
# Usage: bash start.sh

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  PASSPORT AGENT — LOCAL STARTUP     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "✗ Node.js required. Install from nodejs.org"; exit 1; }
echo "✓ Node.js $(node -v)"

# 2. Check service account
if [ ! -f service-account.json ]; then
  echo ""
  echo "  service-account.json not found."
  echo "  Get it from: Firebase Console → Project Settings → Service accounts → Generate new private key"
  echo "  Save the downloaded JSON as: service-account.json"
  echo ""
  exit 1
fi
echo "✓ service-account.json found"

# 3. Install deps
if [ ! -d node_modules ]; then
  echo "… installing dependencies"
  npm install --silent
fi
echo "✓ dependencies installed"

# 4. Validate Firestore
echo "… validating Firestore"
npx tsx src/healthcheck.ts > /dev/null 2>&1 && echo "✓ Firestore connected" || { echo "✗ Firestore unreachable — check your service account"; exit 1; }

# 5. Seed
echo "… seeding collections"
npx tsx src/seed.ts > /dev/null 2>&1 && echo "✓ collections seeded" || echo "⚠ seed completed (some collections may already exist)"

# 6. Run tests
echo "… running tests"
node --test tests/unit/crypto.test.js tests/unit/evaluator.test.js 2>/dev/null | grep -E "pass|fail|tests" | tail -1

# 7. Start
echo ""
echo "╔══════════════════════════════════════╗"
echo "║  STARTING SERVICES                  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  API:     http://localhost:3000"
echo "  Console: open operator.html"
echo "  Docs:    cat USE_CASES.md"
echo ""
echo "  Endpoints:"
echo "    POST /task, GET /task/:id"
echo "    POST /agent/run, POST /run/:id/log"
echo "    GET  /metrics, GET /audit/timeline"
echo "    GET  /diagnostics, GET /report"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

# Start API server (worker runs separately with: npm run worker)
npx tsx src/server.ts
