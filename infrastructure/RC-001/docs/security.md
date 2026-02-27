# Security Documentation - RC-001

## Overview
This document outlines security measures implemented on the Hetzner CX32 VPS for OpenClaw.

## Security Measures Implemented

### 1. Network Security

#### Hetzner Cloud Firewall
Default firewall rules applied via Hetzner API:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22   | TCP      | Your IP only | SSH access |
| 80   | TCP      | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443  | TCP      | 0.0.0.0/0 | HTTPS |

#### UFW (Host Firewall)
Configured in `setup.sh`:
- Default deny incoming
- Default allow outgoing
- Only ports 22, 80, 443 allowed
- Port 8080 bound to localhost only

### 2. SSH Hardening

Applied in `setup.sh`:
- SSH only via key authentication (password auth disabled)
- Fail2ban configured for brute force protection

### 3. SSL/TLS Security

Nginx configuration includes:
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS headers (manual uncomment required)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### 4. Secrets Management

Sensitive data in `.env` file (DO NOT COMMIT):
- `OPENCLAW_TOKEN` - Gateway authentication
- `HETZNER_API_TOKEN` - VPS management
- `DOMAIN_NAME` - Server domain

### 5. Container Security

Docker security:
- OpenClaw bound to localhost:8080 only
- Containers run with minimal privileges
- Read-only mounts where possible

### 6. System Security

- Automatic security updates enabled
- Fail2ban active
- Minimal services running
- No password authentication

## Security Checklist

Before production:
- [ ] Domain configured with proper DNS
- [ ] SSL certificates provisioned
- [ ] SSH key stored securely
- [ ] Fail2ban confirmed running
- [ ] UFW enabled
- [ ] Automatic updates enabled
- [ ] Health checks passing
- [ ] Backups tested

## Emergency Contacts/Incident Response

1. SSH into server: `ssh -i ~/.ssh/openclaw_hetzner root@<IP>`
2. Check logs: `docker compose -f /opt/openclaw/docker-compose.yml logs`
3. Restart services: `systemctl restart docker`
4. Restore from backup: `/opt/openclaw/scripts/restore.sh`

## Vulnerability Disclosure

If you find security issues:
1. Do not create public issues
2. Contact: <admin-email>
3. Allow 72 hours for response
