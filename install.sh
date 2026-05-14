#!/usr/bin/env bash
# One-liner install: curl -fsSL https://raw.githubusercontent.com/jameserez-code/MVP-Netlify-Firebase/main/install.sh | bash
set -e

REPO="https://github.com/jameserez-code/MVP-Netlify-Firebase.git"
DIR="$HOME/passport-agent"

echo ""
echo "╔══════════════════════════════════╗"
echo "║  PASSPORT AGENT — INSTALLER     ║"
echo "╚══════════════════════════════════╝"
echo ""

# Clone
if [ -d "$DIR" ]; then
  echo "→ Directory exists, updating..."
  cd "$DIR" && git pull --ff-only 2>/dev/null || true
else
  echo "→ Cloning..."
  git clone "$REPO" "$DIR"
fi

cd "$DIR"

# Install
echo "→ Installing dependencies..."
npm install --silent 2>/dev/null

# Check for service account
if [ ! -f service-account.json ]; then
  echo ""
  echo "⚠  service-account.json not found."
  echo "   Download it from: Firebase Console → Project Settings → Service accounts → Generate new private key"
  echo "   Save it as: $DIR/service-account.json"
  echo "   Then run: cd $DIR && npm run dev"
  echo ""
  exit 0
fi

# Run healthcheck
echo "→ Verifying Firestore..."
npx tsx src/healthcheck.ts 2>/dev/null && echo "   ✓ Connected" || echo "   ⚠ Check your service account"

# Seed
echo "→ Seeding collections..."
npx tsx src/seed.ts 2>/dev/null && echo "   ✓ Seeded" || echo "   ⚠ Already seeded"

# Start
echo ""
echo "→ Starting on http://localhost:3000"
echo ""
npx tsx src/server.ts
