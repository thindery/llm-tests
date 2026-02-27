# RC-001: Hetzner CX32 VPS Infrastructure

## Overview
This project provisions a Hetzner CX32 VPS (€5.35/mo, 4 vCPU, 8GB RAM, 80GB NVMe) running Ubuntu 22.04 LTS with OpenClaw gateway, secured behind Nginx with SSL.

## Server Specifications

| Resource | Value |
|----------|-------|
| **Server Type** | CX32 (Hetzner Cloud) |
| **vCPU** | 4 |
| **RAM** | 8 GB |
| **Storage** | 80 GB NVMe SSD |
| **Location** | Falkenstein (fsn1) |
| **Cost** | €5.35/month |

## Architecture

```
                    ┌─────────────────────────────────┐
                    │           User/Browser          │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
          ┌────────────────────────┴────────────────────────┐
          │                     Nginx                        │
          │              (Port 443, SSL/TLS)               │
          └────────────────────────┬────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────┴────────────────────────┐
          │                  OpenClaw                        │
          │  (Port 8080, internal, Docker containerized)     │
          └──────────────────────────────────────────────────┘
```

## File Structure

```
infrastructure/RC-001/
├── README.md                    # This file
├── deployment/                    # Deployment scripts
│   ├── provision.sh             # Hetzner server provisioning
│   ├── setup.sh                 # Server configuration
│   └── health-check.sh          # Health monitoring
├── config/                      # Configuration files
│   ├── docker-compose.yml       # OpenClaw container config
│   ├── nginx-site.conf          # Nginx reverse proxy config
│   └── .env.example            # Environment variables template
└── docs/                        # Documentation
    ├── security.md              # Security hardening notes
    └── troubleshooting.md     # Common issues & fixes
```

## Quick Start

1. **Provision Server**: `./deployment/provision.sh`
2. **Configure Server**: `./deployment/setup.sh <server_ip>`
3. **Verify Health**: `./deployment/health-check.sh <server_ip>`

## Required Secrets

- `HETZNER_API_TOKEN` - Hetzner Cloud API token
- `DOMAIN_NAME` - Domain pointing to server (e.g., openclaw.example.com)
- `OPENCLAW_TOKEN` - OpenClaw gateway authentication token
- `LETSENCRYPT_EMAIL` - Email for SSL certificate notifications

## Network Configuration

### Firewall Rules (Hetzner Cloud)
| Port | Protocol | Direction | Source | Description |
|------|----------|-----------|--------|-------------|
| 22   | TCP      | Inbound   | Your IP | SSH access |
| 80   | TCP      | Inbound   | 0.0.0.0/0 | HTTP (redirect to HTTPS) |
| 443  | TCP      | Inbound   | 0.0.0.0/0 | HTTPS |
| 8080 | TCP      | Inbound   | 127.0.0.1 | OpenClaw internal only |

### UFW (Uncomplicated Firewall)
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Services

| Service | Status | Description |
|---------|--------|-------------|
| Nginx | Enabled | Reverse proxy with SSL termination |
| Docker | Enabled | Container runtime for OpenClaw |
| OpenClaw | Enabled | Gateway on port 8080 |
| UFW | Enabled | Host-based firewall |

## Backups

- **Automated**: Daily snapshots via Hetzner (retention: 7 days)
- **Manual**: Before major updates - `./deployment/backup.sh`
- **Critical Data**: OpenClaw config, SSL certs, Nginx configs

## Monitoring

Health checks run every 60 seconds:
- OpenClaw responsive on port 8080
- Nginx reverse proxy functional
- SSL certificate validity
- Disk space > 20%

## Logs

| Service | Log Location |
|---------|--------------|
| Nginx | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` |
| OpenClaw | `docker logs openclaw-gateway` |
| System | `/var/log/syslog` |

## Support

For issues, see `docs/troubleshooting.md` or run `./deployment/health-check.sh`.
