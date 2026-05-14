#!/usr/bin/env bash
# Passport Agent — One-Liner Installer + Auto-Launch TUI
# curl -fsSL https://raw.githubusercontent.com/jameserez-code/MVP-Netlify-Firebase/main/install.sh | bash
set -e

REPO="https://github.com/jameserez-code/MVP-Netlify-Firebase.git"
DIR="$HOME/passport-agent"

# Colors
G='\033[0;32m' C='\033[0;36m' Y='\033[0;33m' R='\033[0;31m' N='\033[0m'
BOLD='\033[1m'

clear
echo ""
echo -e "${G}${BOLD}╔══════════════════════════════════════╗${N}"
echo -e "${G}${BOLD}║       PASSPORT AGENT — INSTALL      ║${N}"
echo -e "${G}${BOLD}╚══════════════════════════════════════╝${N}"
echo ""

# Prerequisites
echo -e "${C}→${N} Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo -e "${R}✗ Node.js required. Install from nodejs.org${N}"; exit 1; }
echo -e "  ${G}✓${N} Node.js $(node -v)"
command -v npm >/dev/null 2>&1 || { echo -e "${R}✗ npm required${N}"; exit 1; }
echo -e "  ${G}✓${N} npm $(npm -v)"

# Clone or update
echo ""
echo -e "${C}→${N} Cloning repository..."
if [ -d "$DIR" ]; then
  echo -e "  ${Y}⚠${N} Directory exists — updating..."
  cd "$DIR" && git pull --ff-only origin main 2>/dev/null || true
else
  git clone --depth 1 "$REPO" "$DIR" 2>/dev/null
fi
cd "$DIR"
echo -e "  ${G}✓${N} Repository ready"

# Install deps
echo ""
echo -e "${C}→${N} Installing dependencies..."
npm install --silent 2>/dev/null
echo -e "  ${G}✓${N} Dependencies installed"

# Mode selection
echo ""
echo -e "${BOLD}Select mode:${N}"
echo -e "  ${G}[1]${N} Demo mode — no setup required, runs immediately"
echo -e "  ${C}[2]${N} Production — requires Firestore service account"
echo ""
read -p "  Choose [1]: " MODE
MODE=${MODE:-1}

if [ "$MODE" = "2" ]; then
  if [ ! -f service-account.json ]; then
    echo ""
    echo -e "  ${Y}⚠  service-account.json not found${N}"
    echo -e "  ${C}→${N} Get it from Firebase Console → Project Settings → Service accounts"
    echo -e "  ${C}→${N} Save as: ${DIR}/service-account.json"
    echo ""
    echo -e "  ${BOLD}Starting in DEMO mode instead...${N}"
    echo ""
  fi
fi

# Start server in background
echo ""
echo -e "${G}${BOLD}╔══════════════════════════════════════╗${N}"
echo -e "${G}${BOLD}║  STARTING PASSPORT AGENT             ║${N}"
echo -e "${G}${BOLD}╚══════════════════════════════════════╝${N}"
echo ""
echo -e "  ${G}→${N} API:   http://localhost:3000"
echo -e "  ${G}→${N} TUI:   auto-launching in terminal"
echo -e "  ${C}→${N} Press Ctrl+C to stop"
echo ""

# Start server in background
npx tsx src/demo-server.ts &
SERVER_PID=$!

# Wait for server to be ready
echo -e "  ${Y}…${N} waiting for server..."
for i in $(seq 1 20); do
  curl -s http://localhost:3000/metrics > /dev/null 2>&1 && break
  sleep 0.5
done

# Launch TUI
npx tsx src/tui.ts

# Cleanup on TUI exit
kill $SERVER_PID 2>/dev/null
echo ""
echo -e "${G}Passport Agent stopped.${N}"
