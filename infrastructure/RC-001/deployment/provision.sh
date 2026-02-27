#!/bin/bash
#
# provision.sh - Provision Hetzner CX32 VPS for OpenClaw Gateway
# Usage: ./provision.sh
# Requires: HETZNER_API_TOKEN environment variable

set -e

# Configuration
SERVER_NAME="openclaw-gateway"
SERVER_TYPE="cx32"
IMAGE="ubuntu-22.04"
LOCATION="fsn1"  # Falkenstein
SSH_KEY_NAME="openclaw-admin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required environment variable
if [[ -z "$HETZNER_API_TOKEN" ]]; then
    log_error "HETZNER_API_TOKEN environment variable is required"
    echo "Set it with: export HETZNER_API_TOKEN=your_token"
    exit 1
fi

log_info "Starting Hetzner CX32 provisioning..."

# Create SSH key if it doesn't exist
SSH_KEY_PATH="$HOME/.ssh/openclaw_hetzner"
if [[ ! -f "$SSH_KEY_PATH" ]]; then
    log_info "Generating SSH key pair..."
    ssh-keygen -t ed25519 -C "openclaw@$(hostname)" -f "$SSH_KEY_PATH" -N ""
    log_warn "Public key generated at $SSH_KEY_PATH.pub"
    log_warn "Add this key to Hetzner Cloud Console manually for first time"
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required. Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Get or create SSH key in Hetzner
log_info "Checking for existing SSH keys in Hetzner..."
SSH_KEY_ID=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
    "https://api.hetzner.cloud/v1/ssh_keys" | \
    jq -r ".ssh_keys[] | select(.name == \"$SSH_KEY_NAME\") | .id")

if [[ -z "$SSH_KEY_ID" ]]; then
    log_info "Creating SSH key in Hetzner Cloud..."
    SSH_KEY_ID=$(curl -s -X POST -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$SSH_KEY_NAME\",\"public_key\":\"$(cat $SSH_KEY_PATH.pub)\"}" \
        "https://api.hetzner.cloud/v1/ssh_keys" | jq -r '.ssh_key.id')
    log_info "SSH key created with ID: $SSH_KEY_ID"
else
    log_info "Using existing SSH key (ID: $SSH_KEY_ID)"
fi

# Check if server already exists
EXISTING_SERVER=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
    "https://api.hetzner.cloud/v1/servers" | \
    jq -r ".servers[] | select(.name == \"$SERVER_NAME\") | .id")

if [[ -n "$EXISTING_SERVER" ]]; then
    log_warn "Server '$SERVER_NAME' already exists! Aborting."
    log_warn "To recreate: 1) Delete in Hetzner console 2) Run this script again"
    exit 1
fi

# Create the CX32 server
log_info "Provisioning CX32 server in $LOCATION..."
SERVER_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $HETZNER_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$SERVER_NAME\",
        \"server_type\": \"$SERVER_TYPE\",
        \"image\": \"$IMAGE\",
        \"location\": \"$LOCATION\",
        \"ssh_keys\": [$SSH_KEY_ID],
        \"labels\": {
            \"environment\": \"production\",
            \"service\": \"openclaw\",
            \"ticket\": \"RC-001\"
        }
    }" \
    "https://api.hetzner.cloud/v1/servers")

SERVER_ID=$(echo "$SERVER_RESPONSE" | jq -r '.server.id')
SERVER_IP=$(echo "$SERVER_RESPONSE" | jq -r '.server.public_net.ipv4.ip')

if [[ "$SERVER_ID" == "null" ]] || [[ -z "$SERVER_ID" ]]; then
    log_error "Failed to create server. Response: $SERVER_RESPONSE"
    exit 1
fi

log_info "Server created with ID: $SERVER_ID"
log_info "Server IP: $SERVER_IP"

# Wait for server to be running
log_info "Waiting for server to be running (approx 1 minute)..."
for i in {1..30}; do
    sleep 2
    STATUS=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://api.hetzner.cloud/v1/servers/$SERVER_ID" | jq -r '.server.status')
    
    if [[ "$STATUS" == "running" ]]; then
        log_info "Server is running!"
        break
    fi
    
    echo -n "."
done

# Save server details
cat > server-details.txt << EOF
RC-001: Hetzner CX32 Server Details
====================================
Server ID: $SERVER_ID
Server Name: $SERVER_NAME
Server Type: $SERVER_TYPE
Public IP: $SERVER_IP
SSH Key: $SSH_KEY_PATH
Location: $LOCATION
Status: running

To connect:
  ssh -i $SSH_KEY_PATH root@$SERVER_IP

To configure:
  ./setup.sh $SERVER_IP
EOF

log_info "Server details saved to server-details.txt"
log_info ""
log_info "========================================="
log_info "✓ Provisioned successfully!"
log_info "========================================="
log_info "Server IP: $SERVER_IP"
log_info ""
log_info "Next steps:"
log_info "  1. Point your domain to: $SERVER_IP"
log_info "  2. Wait 2-5 minutes for SSH to be ready"
log_info "  3. Run: ./setup.sh $SERVER_IP"
log_info ""
log_warn "IMPORTANT: Keep $SSH_KEY_PATH safe!"
