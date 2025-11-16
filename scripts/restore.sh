#!/bin/bash
# Restore Script for Smart Home Platform

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore.sh <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh backups/*.tar.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  WARNING: This will restore from backup and OVERWRITE current data!"
echo "📁 Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [ "$REPLY" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo ""
echo "🔄 Smart Home Platform - Restore"
echo "================================"
echo ""

# Extract backup
RESTORE_DIR="./backups/restore_temp"
mkdir -p ${RESTORE_DIR}

echo "📦 Extracting backup..."
tar -xzf ${BACKUP_FILE} -C ${RESTORE_DIR}

BACKUP_NAME=$(basename ${BACKUP_FILE} .tar.gz)
BACKUP_PATH="${RESTORE_DIR}/${BACKUP_NAME}"

# Load environment
if [ -f .env.production ]; then
  source .env.production
else
  echo "❌ Error: .env.production not found"
  exit 1
fi

echo "🛑 Stopping services..."
docker-compose -f docker-compose.prod.yml down

echo "🗄️  Restoring database..."
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 5

docker exec -i smarthome-postgres pg_restore \
  -U ${POSTGRES_USER:-smarthome} \
  -d ${POSTGRES_DB:-smarthome} \
  -c \
  -F c \
  ${BACKUP_PATH}/database.dump

echo "💾 Restoring Redis data..."
docker-compose -f docker-compose.prod.yml up -d redis
sleep 3

docker cp ${BACKUP_PATH}/redis.rdb smarthome-redis:/data/dump.rdb
docker-compose -f docker-compose.prod.yml restart redis

echo "📝 Restoring configuration..."
cp -r ${BACKUP_PATH}/config/* ./config/

echo "📨 Restoring MQTT data..."
docker cp ${BACKUP_PATH}/mosquitto-data/. smarthome-mqtt:/mosquitto/data/

echo "🚀 Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

echo "🧹 Cleaning up temporary files..."
rm -rf ${RESTORE_DIR}

echo ""
echo "✅ Restore complete!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Your Smart Home Platform has been restored!"
