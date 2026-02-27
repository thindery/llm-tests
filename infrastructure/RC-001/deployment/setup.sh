#!/bin/bash
#
# setup.sh - Configure Hetzner VPS with Ubuntu 22.04 + Docker + OpenClaw
# Usage: ./setup.sh <server_ip>
# Prereq: Server provisioned with provision.sh

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../config"
SSH_KEY_PATH="$HOME/.ssh/openclaw_hetzner"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_cmd() { echo -e "${BLUE}[CMD]${NC} $1"; }

# Validate arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <server_ip>"
    echo "Example: $0 78.46.200.123"
    exit 1
fi

SERVER_IP=$1
log_info "Setting up OpenClaw gateway on $SERVER_IP..."

# Check SSH key exists
if [[ ! -f "$SSH_KEY_PATH" ]]; then
    log_error "SSH key not found at $SSH_KEY_PATH"
    log_error "Run provision.sh first to generate keys"
    exit 1
fi

# Wait for SSH to be available
log_info "Waiting for SSH to be available on $SERVER_IP..."
for i in {1..30}; do
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "root@$SERVER_IP" "echo 'SSH ready'" > /dev/null 2>&1; then
        log_info "SSH connection established!"
        break
    fi
    echo -n "."
    sleep 5
done

# SSH helper function
ssh_cmd() {
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "root@$SERVER_IP" "$1"
}

# SCP helper function
scp_cmd() {
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "$1" "root@$SERVER_IP:$2"
}

# SCP recursive helper
scp_dir() {
    scp -o StrictHostKeyChecking=no -r -i "$SSH_KEY_PATH" "$1" "root@$SERVER_IP:$2"
}

log_info "========================================="
log_info "Step 1: System Update & Security Hardening"
log_info "========================================="

ssh_cmd "
# Update system
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release ufw fail2ban

# Configure automatic security updates
apt-get install -y unattended-upgrades
sed -i 's|//\\s*\\\"\\${distro_id}:\\${distro_codename}-security\\\";|\\\"\\${distro_id}:\\${distro_codename}-security\\\";|g' /etc/apt/apt.conf.d/50unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

log_info 'System updated and auto-upgrades configured'
"

log_info "========================================="
log_info "Step 2: Configure Firewall"
log_info "========================================="

ssh_cmd "
# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/S
ufw allow 80/tcp
ufw  allow 443/tcp

# Enable firewall
echo 'y' | ufw enable

# Verify
ufw status verbose

log_info 'UFW firewall configured'
"

log_info "========================================="
log_info "Step 3: Install Docker"
log_info "========================================="

ssh_cmd "
# Install Docker
apt-get update
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \"deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
systemctl enable docker
systemctl start docker

# Add user to docker group
usermod -aG docker root

# Verify
service docker version

docker compose version

log_info 'Docker installed successfully'
"

log_info "========================================="
log_info "Step 4: Create OpenClaw Directory Structure"
log_info "========================================="

ssh_cmd "
mkdir -p /opt/openclaw/{config,data,ssl,logs}
mkdir -p /opt/openclaw/nginx/logs
mkdir -p /var/www/certbot
chmod 755 /opt/openclaw /opt/openclaw/*

log_info 'Directory structure created'
"

log_info "========================================="
log_info "Step 5: Deploy Configuration Files"
log_info "========================================="

# Copy docker-compose.yml
if [[ -f "$CONFIG_DIR/docker-compose.yml" ]]; then
    scp_cmd "$CONFIG_DIR/docker-compose.yml" "/opt/openclaw/"
    log_info "Deployed docker-compose.yml"
fi

# Copy nginx config
if [[ -f "$CONFIG_DIR/nginx-site.conf" ]]; then
    log_info "Uploading nginx configuration..."
    ssh_cmd "mkdir -p /opt/openclaw/nginx/conf.d"
    scp_cmd "$CONFIG_DIR/nginx-site.conf" "/opt/openclaw/nginx/conf.d/default.conf"
    log_info "Deployed nginx-site.conf"
fi

# Copy environment file if exists
if [[ -f "$SCRIPT_DIR/../.env" ]]; then
    scp_cmd "$SCRIPT_DIR/../.env" "/opt/openclaw/.env"
    log_info "Deployed environment file"
else
    log_warn "No .env file found. Create one from .env.example"
fi

log_info "========================================="
log_info "Step 6: Install Certbot (Let's Encrypt)"
log_info "========================================="

ssh_cmd "
apt-get install -y certbot

# Install certbot for Dockerized nginx
systemctl stop certbot.timer 2> /dev/null || true

touch /opt/openclaw/init-ssl.sh
cat > /opt/openclaw/init-ssl.sh << 'SSLSCRIPT'
#!/bin/bash
# Initialize SSL certificates
DOMAIN=\"\${DOMAIN_NAME}\"
EMAIL=\"\${LETSENCRYPT_EMAIL}\"

if [[ -z \"\$DOMAIN\" ]] || [[ -z \"\$EMAIL\" ]]; then
    echo \"DOMAIN_NAME and LETSENCRYPT_EMAIL must be set\"
    exit 1
fi

# Create web root for certbot
mkdir -p /var/www/certbot

# Request certificate
certbot certonly --standalone \\
    --agree-tos \\
    --non-interactive \\
    --email \"\$EMAIL\" \\
    -d \"\$DOMAIN\" \\
    --preferred-challenges http-01

# Copy certs to Docker bind mount location
mkdir -p /opt/openclaw/ssl/live/\$DOMAIN
cp /etc/letsencrypt/live/\$DOMAIN/fullchain.pem /opt/openclaw/ssl/live/\$DOMAIN/
cp /etc/letsencrypt/live/\$DOMAIN/privkey.pem /opt/openclaw/ssl/live/\$DOMAIN/

echo \"SSL certificates provisioned\"
SSLSCRIPT

chmod +x /opt/openclaw/init-ssl.sh

echo '0 3 * * * certbot renew --quiet --post-hook \"docker compose -f /opt/openclaw/docker-compose.yml restart nginx\"' | crontab -

log_info 'Certbot installed and auto-renewal configured'
"

log_info "========================================="
log_info "Step 7: Start OpenClaw Services"
log_info "========================================="

ssh_cmd "
cd /opt/openclaw

# Pull images
docker compose pull

# Start services
docker compose up -d

# Wait for OpenClaw to be ready
sleep 10

# Check if running
if docker ps | grep -q openclaw-gateway; then
    log_info 'OpenClaw container is running'
else
    log_error 'OpenClaw container failed to start'
    docker compose logs
    exit 1
fi

# Check nginx
if docker ps | grep -q openclaw-nginx; then
    log_info 'Nginx container is running'
else
    log_warn 'Nginx container not running - may need SSL first'
fi

log_info 'Services started. Check: docker compose logs -f'
"

log_info "========================================="
log_info "Step 8: Configure Backups"
log_info "========================================="

ssh_cmd "
# Create backup script
cat > /opt/openclaw/scripts/backup.sh << 'BACKUPSCRIPT'
#!/bin/bash
# Backup script for OpenClaw VPS
BACKUP_DIR=\"/backup/openclaw\"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup config
tar -czf \$BACKUP_DIR/config_\$DATE.tar.gz /opt/openclaw/config /opt/openclaw/ssl/ 2> /dev/null || true

# Backup data
tar -czf \$BACKUP_DIR/data_\$DATE.tar.gz /opt/openclaw/data 2> /dev/null || true

# Keep only last 7 backups
ls -t \$BACKUP_DIR/*.tar.gz | tail -n +8 | xargs -r rm  

echo \"Backup completed: \$DATE\"
BACKUPSCRIPT

chmod +x /opt/openclaw/scripts/backup.sh

# Daily backup at 2 AM
echo '0 2 * * * /opt/openclaw/scripts/backup.sh >> /var/log/openclaw-backup.log 2>&1' | crontab -

log_info 'Backup script created and scheduled'
"

log_info "========================================="
log_info "Step 9: Final Security Hardening"
log_info "========================================="

ssh_cmd "
# Configure fail2ban for SSH
cat > /etc/fail2ban/jail.local <> 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
FAIL2BAN

systemctl restart fail2ban
systemctl enable fail2ban

# Disable password authentication for SSH
sed -i 's/#PasswordAuthentication no/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

log_info 'Security hardening applied'
log_warn 'Note: Password authentication disabled. Use SSH key only.'
"

log_info "========================================="
log_info "Setup Complete!"
log_info "========================================="
log_info ""
log_info "OpenClaw gateway is now configured on $SERVER_IP"
log_info ""
log_info "Services:"
log_info "  - OpenClaw: http://$SERVER_IP:8080 (internal only)"
log_info "  - Nginx:    https://$SERVER_IP (after SSL)"
log_info ""
log_info "Commands:"
log_info "  SSH:        ssh -i $SSH_KEY_PATH root@$SERVER_IP"
log_info "  Logs:       ssh -i $SSH_KEY_PATH root@$SERVER_IP 'docker compose -f /opt/openclaw/docker-compose.yml logs -f'"
log_info "  Status:     ssh -i $SSH_KEY_PATH root@$SERVER_IP 'docker ps'"
log_info "  Backup:     ssh -i $SSH_KEY_PATH root@$SERVER_IP '/opt/openclaw/scripts/backup.sh}'"
log_info ""
log_warn "IMPORTANT: Set up your domain and SSL certificates!"
log_warn "  1. Point DNS A record: yourdomain.com → $SERVER_IP"
log_warn "  2. Then run SSL init: ssh -i $SSH_KEY_PATH root@$SERVER_IP '/opt/openclaw/init-ssl.sh'"
log_warn "  3. Restart nginx: ssh -i $SSH_KEY_PATH root@$SERVER_IP 'docker compose -f /opt/openclaw/docker-compose.yml restart nginx'"
log_info ""
log_info "Run health check: ./health-check.sh $SERVER_IP"
