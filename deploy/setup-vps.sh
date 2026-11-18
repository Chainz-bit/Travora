#!/bin/bash
# ============================================================================
# TRAVORA VPS SETUP SCRIPT
# Target: Ubuntu 24.04 LTS (AWS)
# Installs: PostgreSQL 16, Go 1.22, Node.js 22 LTS, Nginx, Certbot
# ============================================================================

set -euo pipefail

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
  err "Script harus dijalankan sebagai root (gunakan: sudo bash setup-vps.sh)"
fi

echo ""
echo "============================================"
echo "  TRAVORA - VPS Setup Script"
echo "  Ubuntu 24.04 LTS"
echo "============================================"
echo ""

# ── 1. Update & Essential Packages ──
log "Memperbarui sistem..."
apt update -y && apt upgrade -y
apt install -y curl wget git build-essential ufw fail2ban unzip

# ── 2. Install PostgreSQL 16 ──
log "Menginstall PostgreSQL 16..."
if ! command -v psql &> /dev/null; then
  apt install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
  log "PostgreSQL terinstall dan berjalan"
else
  warn "PostgreSQL sudah terinstall, skip."
fi

# ── 3. Setup Database ──
log "Menyiapkan database Travora..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='travora_user'" | grep -q 1 || {
  sudo -u postgres psql -c "CREATE USER travora_user WITH PASSWORD 'GANTI_PASSWORD_INI';"
  log "User 'travora_user' dibuat"
}

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='travora_db'" | grep -q 1 || {
  sudo -u postgres psql -c "CREATE DATABASE travora_db OWNER travora_user;"
  log "Database 'travora_db' dibuat"
}

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE travora_db TO travora_user;"

# ── 4. Install Go 1.22 ──
log "Menginstall Go 1.22..."
if ! command -v go &> /dev/null; then
  GO_VERSION="1.22.9"
  wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tar.gz
  rm /tmp/go.tar.gz

  # Set PATH untuk semua user
  echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
  export PATH=$PATH:/usr/local/go/bin
  log "Go $(go version) terinstall"
else
  warn "Go sudah terinstall: $(go version)"
fi

# ── 5. Install Node.js 22 LTS (via NodeSource) ──
log "Menginstall Node.js 22 LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
  log "Node.js $(node -v) terinstall"
else
  warn "Node.js sudah terinstall: $(node -v)"
fi

# ── 6. Install Nginx ──
log "Menginstall Nginx..."
if ! command -v nginx &> /dev/null; then
  apt install -y nginx
  systemctl enable nginx
  systemctl start nginx
  log "Nginx terinstall dan berjalan"
else
  warn "Nginx sudah terinstall"
fi

# ── 7. Install Certbot (untuk SSL/HTTPS) ──
log "Menginstall Certbot..."
if ! command -v certbot &> /dev/null; then
  apt install -y certbot python3-certbot-nginx
  log "Certbot terinstall"
else
  warn "Certbot sudah terinstall"
fi

# ── 8. Konfigurasi Firewall (UFW) ──
log "Mengkonfigurasi firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
log "Firewall aktif: SSH, HTTP, HTTPS diizinkan"

# ── 9. Buat user aplikasi ──
log "Menyiapkan user aplikasi..."
if ! id "travora" &>/dev/null; then
  useradd -m -s /bin/bash travora
  usermod -aG sudo travora
  log "User 'travora' dibuat"
else
  warn "User 'travora' sudah ada"
fi

# ── 10. Buat direktori aplikasi ──
log "Menyiapkan direktori aplikasi..."
mkdir -p /opt/travora
chown -R travora:travora /opt/travora

echo ""
echo "============================================"
echo "  SETUP SELESAI!"
echo "============================================"
echo ""
echo "Langkah selanjutnya:"
echo "  1. GANTI password database di script ini (baris CREATE USER)"
echo "  2. Jalankan: sudo bash deploy.sh"
echo ""
echo "Info:"
echo "  - PostgreSQL: postgresql://travora_user@localhost:5432/travora_db"
echo "  - App dir:    /opt/travora"
echo "  - App user:   travora"
echo ""
