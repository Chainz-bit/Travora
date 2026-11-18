#!/bin/bash
# ============================================================================
# TRAVORA QUICK RE-DEPLOY SCRIPT
# Pulls latest code, rebuilds, and restarts services
# ============================================================================

set -euo pipefail

DOMAIN="sanditeguharizal.com"      # Domain production
APP_DIR="/opt/travora"
BRANCH="main"

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[✓]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Gunakan: sudo bash redeploy.sh"
  exit 1
fi

export PATH=$PATH:/usr/local/go/bin

echo ""
echo "── Travora Quick Re-deploy ──"
echo ""

# 1. Pull latest
log "Pulling latest code..."
cd "$APP_DIR/src"
git fetch origin
git reset --hard "origin/$BRANCH"

# 2. Rebuild backend
log "Building Go API..."
cd "$APP_DIR/src/services/api"
go build -ldflags="-s -w" -o "$APP_DIR/bin/travora-api" ./cmd/api

# 3. Rebuild frontend
log "Building React frontend..."
cd "$APP_DIR/src/apps/web"
npm ci --production=false
VITE_API_BASE_URL="https://${DOMAIN}" npm run build

# 4. Deploy frontend
log "Deploying frontend..."
rm -rf /var/www/travora/*
cp -r "$APP_DIR/src/apps/web/dist/"* /var/www/travora/
chown -R www-data:www-data /var/www/travora

# 5. Restart backend
log "Restarting API service..."
systemctl restart travora-api

# 6. Verify
sleep 2
if systemctl is-active --quiet travora-api; then
  log "API berjalan! ✅"
else
  echo "⚠️  API gagal start. Cek: sudo journalctl -u travora-api -n 50"
fi

echo ""
log "Re-deploy selesai! 🎉"
echo ""
