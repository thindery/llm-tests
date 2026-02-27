#!/bin/bash
#
# health-check.sh - Verify OpenClaw VPS setup
# Usage: ./health-check.sh <server_ip>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Validate arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <server_ip>"
    echo "Example: $0 78.46.200.123"
    exit 1
fi

SERVER_IP=$1
SSH_KEY_PATH="$HOME/.ssh/openclaw_hetzner"

echo "========================================="
echo "OpenClaw VPS Health Check"
echo "========================================="
echo "Server: $SERVER_IP"
echo ""

# Check SSH key exists
if [[ ! -f "$SSH_KEY_PATH" ]]; then
    log_fail "SSH key not found at $SSH_KEY_PATH"
    log_info "Run provision.sh first to set up SSH keys"
else
    log_pass "SSH key found"
fi

# SSH helper
ssh_cmd() {
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$SSH_KEY_PATH" "root@$SERVER_IP" "$1" 2> /dev/null
}

# Check 1: Server connectivity
echo "Checking server connectivity..."
if ping -c 1 -W 3 "$SERVER_IP" > /dev/null 2>&1; then
    log_pass "Server responds to ping"
else
    log_fail "Server not responding to ping (may still be accessible)"
fi

# Check 2: SSH access
echo ""
echo "Checking SSH access..."
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$SSH_KEY_PATH" "root@$SERVER_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    log_pass "SSH connection successful"
else
    log_fail "SSH connection failed"
    echo ""
    echo "========================================="
    echo "Health Check Summary: FAILED"
    echo "========================================="
    echo "Critical: Cannot connect via SSH. Cannot proceed with checks."
    exit 1
fi

# Check 3: Docker status
echo ""
echo "Checking Docker..."
DOCKER_STATUS=$(ssh_cmd "systemctl is-active docker" || echo "failed")
if [[ "$DOCKER_STATUS" == "active" ]]; then
    log_pass "Docker service is running"
else
    log_fail "Docker service is not running"
fi

# Check 4: Docker Compose
echo ""
echo "Checking containers..."
CONTAINERS=$(ssh_cmd "docker ps --format '{{.Names}}'" || echo "")

if echo "$CONTAINERS" | grep -q "openclaw-gateway"; then
    log_pass "OpenClaw container is running"
else
    log_fail "OpenClaw container is NOT running"
fi

if echo "$CONTAINERS" | grep -q "openclaw-nginx"; then
    log_pass "Nginx container is running"
else
    log_fail "Nginx container is NOT running"
fi

# Check 5: OpenClaw health endpoint
echo ""
echo "Checking OpenClaw health endpoint..."
HEALTH_STATUS=$(ssh_cmd "docker exec openclaw-gateway wget -q -O - http://localhost:8080/health 2> /dev/null || echo 'unhealthy'")

if [[ "$HEALTH_STATUS" == *"healthy"* ]] || [[ "$HEALTH_STATUS" == *"ok"* ]]; then
    log_pass "OpenClaw health endpoint responds OK"
else
    log_fail "OpenClaw health endpoint not responding"
    log_info "Response: $HEALTH_STATUS"
fi

# Check 6: Nginx health endpoint
echo ""
echo "Checking Nginx health endpoint..."
NGINX_HEALTH=$(ssh_cmd "docker exec openclaw-nginx wget -q -O - http://localhost/nginx-health 2> /dev/null || echo 'unhealthy'")

if [[ "$NGINX_HEALTH" == *"healthy"* ]]; then
    log_pass "Nginx health endpoint responds OK"
else
    log_fail "Nginx health endpoint not responding"
fi

# Check 7: Firewall status
echo ""
echo "Checking firewall..."
UFW_STATUS=$(ssh_cmd "ufw status | head -1" || echo """)

if [[ "$UFW_STATUS" == *"active"* ]]; then
    log_pass "UFW firewall is active"
else
    log_warn "UFW firewall is not active"
fi

# Check 8: SSL Certificates (if domain configured)
echo ""
echo "Checking SSL certificates..."
DOMAIN=$(ssh_cmd "cat /opt/openclaw/.env | grep DOMAIN_NAME | cut -d '=' -f2" || echo "")

if [[ -n "$DOMAIN" ]] && [[ "$DOMAIN" != "openclaw.example.com" ]]; then
    SSL_EXISTS=$(ssh_cmd "test -f /opt/openclaw/ssl/live/$DOMAIN/fullchain.pem && echo 'yes' || echo 'no'")
    if [[ "$SSL_EXISTS" == "yes" ]]; then
        log_pass "SSL certificates exist for $DOMAIN"
        
        # Check cert expiry
        CERT_EXPIRY=$(ssh_cmd "openssl x509 -in /opt/openclaw/ssl/live/$DOMAIN/fullchain.pem -noout -dates | grep notAfter | cut -d= -f2" || echo "")
        if [[ -n "$CERT_EXPIRY" ]]; then
            log_info "Certificate expires: $CERT_EXPIRY"
        fi
    else
        log_warn "SSL certificates not found for $DOMAIN"
        log_info "Run init-ssl.sh after pointing DNS"
    fi
else
    log_warn "Domain not configured (using example.com)"
fi

# Check 9: System resources
echo ""
echo "Checking system resources..."
DISK_USAGE=$(ssh_cmd "df -h / | tail -1 | awk '{print \$5}' | tr -d '%'")
MEMORY_USAGE=$(ssh_cmd "free | grep Mem | awk '{printf \"%.0f\", \$3/\$2 * 100.0}'")

if [[ -n "$DISK_USAGE" ]] && [[ "$DISK_USAGE" -lt "90" ]]; then
    log_pass "Disk usage: ${DISK_USAGE}%"
else
    log_fail "Disk usage critical: ${DISK_USAGE}%"
fi

if [[ -n "$MEMORY_USAGE" ]] && [[ "$MEMORY_USAGE" -lt "95" ]]; then
    log_pass "Memory usage: ${MEMORY_USAGE}%"
else
    log_fail "Memory usage critical: ${MEMORY_USAGE}%"
fi

# Check 10: Uptime
echo ""
echo "Getting server information..."
UPTIME=$(ssh_cmd "uptime -p" || echo "unknown")
log_info "Uptime: $UPTIME"

# Check 11: Security
SECURITY_CHECK=$(ssh_cmd "systemctl is-active fail2ban" || echo "inactive")
if [[ "$SECURITY_CHECK" == "active" ]]; then
    log_pass "Fail2ban is active"
else
    log_warn "Fail2ban is not active"
fi

# Summary
echo ""
echo "========================================="
echo "Health Check Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "========================================="
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo "========================================="
    exit 1
fi
