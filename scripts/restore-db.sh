#!/bin/bash
# Usage: ./restore-db.sh /path/to/backup.sql.gz
set -e

BACKUP_FILE="$1"
DB_NAME="${POSTGRES_DB:-budget_db}"
DB_USER="${POSTGRES_USER:-budget_user}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5435}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

echo "[$(date)] Restoring $BACKUP_FILE to $DB_NAME..."
PGPASSWORD="$POSTGRES_PASSWORD" gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
echo "[$(date)] Restore complete."
