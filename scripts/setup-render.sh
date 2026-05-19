#!/usr/bin/env bash
set -e

echo "============================================"
echo "  Passport Agent — Render Setup Script"
echo "============================================"
echo ""

# Check for render CLI (optional but helpful)
if command -v render &> /dev/null; then
  echo "✓ Render CLI detected"
else
  echo "⚠ Render CLI not found. Install via:"
  echo "    brew install render"
  echo "    or visit https://render.com/docs/cli"
  echo ""
fi

# Prompt for required env vars
echo "This script sets environment variables for your Render web service."
echo "Make sure you have created the service first (via render.yaml or dashboard)."
echo ""

read -rp "Render service name [passport-agent-api]: " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-passport-agent-api}

read -rp "Firebase Project ID: " FIREBASE_PROJECT_ID
read -rp "Firebase Client Email: " FIREBASE_CLIENT_EMAIL
read -rp "Firebase Private Key (single line with \\n): " FIREBASE_PRIVATE_KEY
read -rp "Allowed Origins (comma-separated, e.g. https://your-site.netlify.app): " ALLOWED_ORIGINS
read -rp "Admin Password (leave blank to auto-generate): " ADMIN_PASSWORD

# Generate secrets if not provided
JWT_SECRET=${JWT_SECRET:-$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")}
ENGINE_SECRET=${ENGINE_SECRET:-$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")}

DEFAULT_ORG_ID="org_prod_001"

echo ""
echo "Setting environment variables on Render service: $SERVICE_NAME"
echo ""

set_env() {
  local key="$1"
  local value="$2"
  if command -v render &> /dev/null; then
    render env set "$key" "$value" --service "$SERVICE_NAME" > /dev/null 2>&1 && echo "  ✓ $key" || echo "  ✗ $key (failed)"
  else
    echo "  [MANUAL] $key=$value"
  fi
}

set_env "NODE_ENV" "production"
set_env "PORT" "10000"
set_env "ALLOWED_ORIGINS" "$ALLOWED_ORIGINS"
set_env "JWT_SECRET" "$JWT_SECRET"
set_env "ENGINE_SECRET" "$ENGINE_SECRET"
set_env "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
set_env "DEFAULT_ORG_ID" "$DEFAULT_ORG_ID"
set_env "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
set_env "FIREBASE_CLIENT_EMAIL" "$FIREBASE_CLIENT_EMAIL"
set_env "FIREBASE_PRIVATE_KEY" "$FIREBASE_PRIVATE_KEY"

echo ""
echo "============================================"
echo "  Setup Complete"
echo "============================================"
echo ""
echo "Admin Password: $ADMIN_PASSWORD"
echo "JWT_SECRET:     $JWT_SECRET"
echo "ENGINE_SECRET:  $ENGINE_SECRET"
echo ""
echo "⚠️  SAVE THESE CREDENTIALS NOW — they won't be shown again."
echo ""
echo "Next steps:"
echo "  1. Deploy the service on Render"
echo "  2. Run: npm run setup:prod"
echo "  3. Run: npm run test:integration"
echo ""
