#!/bin/bash
#
# backup.sh - Backup script for OpenClaw VPS
# Usage: ./backup.sh

set -e

BACKUP_DIR="/backup/openclaw"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"

# Backup configuration
echo "Backing up configuration..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" -C /opt openclaw/config openclaw/ssl/live 2> /dev/null || echo "Warning: Config backup partial"

# Backup data
echo "Backing up data..."
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" -C /opt openclaw/data 2> /dev/null || echo "Warning: Data backup partial"

# Backup scripts
echo "Backing up scripts..."
tar -czf "$BACKUP_DIR/scripts_$DATE.tar.gz" -C /opt openclaw/scripts 2> /dev/null || echo "Warning: Scripts backup partial"

# Clean old backups
echo "Cleaning old backups (retain $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "Current backups:"
ls -lah "$BACKUP_DIR"

echo ""
echo "Backup completed at $(date)"
