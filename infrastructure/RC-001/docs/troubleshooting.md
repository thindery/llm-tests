# Troubleshooting Guide - RC-001

## Common Issues

### Cannot SSH to Server

**Symptom:** Connection refused/timeout

**Solutions:**
1. Wait 2-5 minutes after provisioning (cloud-init running)
2. Verify your IP hasn't changed
3. Check SSH key permissions:
   ```bash
   chmod 600 ~/.ssh/openclaw_hetzner
   ```
4. Try with verbose output:
   ```bash
   ssh -v -i ~/.ssh/openclaw_hetzner root@<IP>
   ```

### OpenClaw Container Won't Start

**Check logs:**
```bash
ssh -i ~/.ssh/openclaw_hetzner root@<IP> "docker compose -f /opt/openclaw/docker-compose.yml logs openclaw-gateway"
```

**Common causes:**
- Missing `OPENCLAW_TOKEN` in `.env`
- Port 8080 already in use
- Container image not found

**Fix:**
```bash
# On server
cd /opt/openclaw
docker compose down
docker compose pull
docker compose up -d
```

### Nginx Container Won't Start

**Symptom:** Container exits immediately

**Check:**
1. SSL certificates missing:
   ```bash
   ls -la /opt/openclaw/ssl/live/<domain>/
   ```
2. Domain not configured in `.env`

**Fix:**
```bash
# Run SSL initialization
/opt/openclaw/init-ssl.sh
docker compose -f /opt/openclaw/docker-compose.yml restart nginx
```

### SSL Certificate Issues

**Renewal failed:**
1. Check DNS still points to server
2. Port 80 must be open for ACME challenge
3. Manually renew:
   ```bash
   certbot renew --force-renewal
   ```

### Health Checks Failing

**Run extended diagnostics:**
```bash
# Container status
docker ps -a
docker stats --no-stream

# Resource usage
df -h
free -h

# Service logs
journalctl -u docker -n 50
docker compose logs --tail 100
```

### Disk Space Full

**Check usage:**
```bash
df -h /opt/openclaw
docker system df -v
```

**Cleanup:**
```bash
# Remove unused containers/images
docker system prune -a

# Rotate logs
docker logs --tail 100 <container>
journalctl --vacuum-time=2d
```

### Firewall Blocking Access

**Check UFW:**
```bash
ufw status verbose
```

**Reset if needed:**
```bash
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Container Logs Filling Disk

**Set limits in docker-compose.yml:**
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Recovery Procedures

### Server Unreachable

1. Access Hetzner console
2. Reboot from console
3. Check status:
   ```bash
   curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
     "https://api.hetzner.cloud/v1/servers"
   ```

### Restore from Backup

```bash
# On server
BACKUP_DATE=20240101_120000
cd /opt/openclaw
docker compose down

# Restore config
tar -xzf /backup/openclaw/config_$BACKUP_DATE.tar.gz
tar -xzf /backup/openclaw/data_$BACKUP_DATE.tar.gz

docker compose up -d
```

### Complete Rebuild

If server is unrecoverable:
1. Run health-check.sh to verify
2. Backup any data if accessible
3. Destroy old server
4. Re-run provision.sh + setup.sh

## Logs Locations

| Service | Log Command |
|---------|-------------|
| OpenClaw | `docker logs openclaw-gateway` |
| Nginx | `docker logs openclaw-nginx` |
| System | `journalctl -xe` |
| Auth | `tail -f /var/log/auth.log` |
| UFW | `tail -f /var/log/ufw.log` |
| Backup | `tail -f /var/log/openclaw-backup.log` |

## Support Resources

- Hetzner Cloud Console: https://console.hetzner.cloud
- OpenClaw Documentation: In `/opt/openclaw/docs`
- Emergency access: `ssh -i ~/.ssh/openclaw_hetzner root@<IP>`
