#!/bin/bash
# Backup Script for Smart Home Platform

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="smarthome_backup_${TIMESTAMP}"

echo "💾 Smart Home Platform - Backup"
echo "================================"
echo ""

# Create backup directory
mkdir -p ${BACKUP_DIR}/${BACKUP_NAME}

# Load environment
if [ -f .env.production ]; then
  source .env.production
else
  echo "❌ Error: .env.production not found"
  exit 1
fi

echo "📦 Backing up database..."
docker exec smarthome-postgres pg_dump \
  -U ${POSTGRES_USER:-smarthome} \
  -d ${POSTGRES_DB:-smarthome} \
  -F c \
  -f /backups/${BACKUP_NAME}/database.dump

echo "📦 Backing up Redis data..."
docker exec smarthome-redis redis-cli --raw SAVE
docker cp smarthome-redis:/data/dump.rdb ${BACKUP_DIR}/${BACKUP_NAME}/redis.rdb

echo "📦 Backing up configuration..."
cp -r config ${BACKUP_DIR}/${BACKUP_NAME}/
cp .env.production ${BACKUP_DIR}/${BACKUP_NAME}/

echo "📦 Backing up MQTT data..."
docker cp smarthome-mqtt:/mosquitto/data ${BACKUP_DIR}/${BACKUP_NAME}/mosquitto-data

echo "🗜️  Compressing backup..."
cd ${BACKUP_DIR}
tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}
rm -rf ${BACKUP_NAME}

BACKUP_SIZE=$(du -h ${BACKUP_NAME}.tar.gz | cut -f1)

echo ""
echo "✅ Backup complete!"
echo "📁 Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "💾 Size: ${BACKUP_SIZE}"
echo ""

# Cleanup old backups (keep last 30 days)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "smarthome_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "✅ Cleanup complete!"
