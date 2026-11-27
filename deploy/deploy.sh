#!/bin/bash
# ============================================================================
# TRAVORA DEPLOYMENT SCRIPT
# Clones repo, builds frontend & backend, configures services
# ============================================================================

set -euo pipefail

# ── Konfigurasi (WAJIB DIGANTI) ──
DOMAIN="sanditeguharizal.com"      # Domain production
REPO_URL="https://github.com/sandiwira20/Travora.git"
APP_DIR="/opt/travora"
BRANCH="main"

# Database
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="travora_db"
DB_USER="travora_user"
DB_PASSWORD="GANTI_PASSWORD_INI"   # <-- WAJIB GANTI

# Session
SESSION_SECRET="$(openssl rand -hex 32)"

# ── Warna output ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Cek root ──
if [[ $EUID -ne 0 ]]; then
  err "Script harus dijalankan sebagai root (gunakan: sudo bash deploy.sh)"
fi

echo ""
echo "============================================"
echo "  TRAVORA - Deployment Script"
echo "============================================"
echo ""

# ── Validasi ──
if [[ "$DB_PASSWORD" == "GANTI_PASSWORD_INI" ]]; then
  err "Anda HARUS mengganti DB_PASSWORD di script ini sebelum menjalankan!"
fi

# ── 1. Clone/Pull Repository ──
log "Menyiapkan source code..."
export PATH=$PATH:/usr/local/go/bin

if [[ -d "$APP_DIR/src" ]]; then
  cd "$APP_DIR/src"
  git fetch origin
  git reset --hard "origin/$BRANCH"
  log "Repository di-update"
else
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR/src"
  log "Repository di-clone"
fi

cd "$APP_DIR/src"

# ── 2. Run Database Migrations ──
log "Menjalankan migrasi database..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f database/migrations/000001_initial_schema.up.sql 2>/dev/null || {
  warn "Migrasi mungkin sudah pernah dijalankan (tabel sudah ada), lanjut..."
}

# ── 3. Build Go Backend ──
log "Membangun Go API backend..."
cd "$APP_DIR/src/services/api"
/usr/local/go/bin/go mod tidy
/usr/local/go/bin/go build -ldflags="-s -w" -o "$APP_DIR/bin/travora-api" ./cmd/api
log "Binary backend: $APP_DIR/bin/travora-api"

# ── 4. Build React Frontend ──
log "Membangun React frontend..."
cd "$APP_DIR/src/apps/web"
npm ci --production=false
VITE_API_BASE_URL="https://${DOMAIN}" npm run build
log "Frontend build selesai"

# ── 5. Deploy Frontend ke Nginx ──
log "Mendeploy frontend..."
rm -rf /var/www/travora
mkdir -p /var/www/travora
cp -r "$APP_DIR/src/apps/web/dist/"* /var/www/travora/
chown -R www-data:www-data /var/www/travora
log "Frontend di-deploy ke /var/www/travora"

# ── 6. Buat file .env untuk backend ──
log "Membuat konfigurasi environment..."
mkdir -p "$APP_DIR/bin"
cat > "$APP_DIR/bin/.env" << EOF
# Travora Production Environment
APP_ENV=production
APP_PORT=8080

DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSLMODE=disable

DB_POOL_MAX_CONNS=25
DB_POOL_MIN_CONNS=5

SESSION_SECRET=${SESSION_SECRET}
SESSION_DURATION=24h
COOKIE_SECURE=true
EOF

chown travora:travora "$APP_DIR/bin/.env"
chmod 600 "$APP_DIR/bin/.env"
log "File .env dibuat di $APP_DIR/bin/.env"

# ── 7. Install Systemd Service ──
log "Mengkonfigurasi systemd service..."
cat > /etc/systemd/system/travora-api.service << 'EOF'
[Unit]
Description=Travora API Server
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=travora
Group=travora
WorkingDirectory=/opt/travora/bin
ExecStart=/opt/travora/bin/travora-api
EnvironmentFile=/opt/travora/bin/.env
Restart=on-failure
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/travora/bin
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=travora-api

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable travora-api
systemctl restart travora-api
log "Service travora-api aktif"

# ── 8. Konfigurasi Nginx ──
log "Mengkonfigurasi Nginx..."
cat > /etc/nginx/sites-available/travora << NGINXEOF
# Travora - Nginx Configuration
# Frontend (React SPA) + Reverse Proxy ke Go API

server {
    listen 80;
    server_name ${DOMAIN};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend (React SPA)
    root /var/www/travora;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # API Reverse Proxy → Go backend (port 8080)
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }

    # Health check endpoint
    location /health/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # SPA fallback - semua route non-file diarahkan ke index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

# Aktifkan site
ln -sf /etc/nginx/sites-available/travora /etc/nginx/sites-enabled/travora
rm -f /etc/nginx/sites-enabled/default

# Test konfigurasi
nginx -t || err "Konfigurasi Nginx tidak valid!"
systemctl reload nginx
log "Nginx dikonfigurasi dan di-reload"

# ── 9. Set ownership ──
chown -R travora:travora "$APP_DIR"

echo ""
echo "============================================"
echo "  DEPLOYMENT SELESAI! 🎉"
echo "============================================"
echo ""
echo "Service status:"
systemctl status travora-api --no-pager -l | head -10
echo ""
echo "Akses:"
echo "  - Frontend: http://${DOMAIN}"
echo "  - API:      http://${DOMAIN}/api/v1/..."
echo "  - Health:   http://${DOMAIN}/health/live"
echo ""
echo "Perintah berguna:"
echo "  - Log API:      sudo journalctl -u travora-api -f"
echo "  - Restart API:  sudo systemctl restart travora-api"
echo "  - Status API:   sudo systemctl status travora-api"
echo ""
echo "NEXT STEP - Setup SSL (HTTPS):"
echo "  sudo certbot --nginx -d ${DOMAIN}"
echo ""
