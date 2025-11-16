#!/bin/bash
# Production Deployment Script

set -e

echo "🚀 Smart Home Platform - Production Deployment"
echo "=============================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  WARNING: Running as root. Consider using a non-root user with docker permissions."
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production file not found"
  echo "📝 Please copy .env.production.example to .env.production and configure it"
  exit 1
fi

# Check for required secrets
source .env.production
if [ "$POSTGRES_PASSWORD" == "CHANGE_ME_PLEASE" ] || \
   [ "$REDIS_PASSWORD" == "CHANGE_ME_PLEASE" ] || \
   [ "$JWT_SECRET" == "CHANGE_ME_PLEASE" ]; then
  echo "❌ Error: Please update secrets in .env.production"
  echo "   Use: openssl rand -base64 32"
  exit 1
fi

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo "❌ Error: Docker Compose is not installed"
  exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Create required directories
echo "📁 Creating required directories..."
mkdir -p backups
mkdir -p config/mosquitto
mkdir -p logs

# Generate Mosquitto password file if it doesn't exist
if [ ! -f config/mosquitto/passwd ]; then
  echo "🔐 Generating MQTT password file..."
  docker run --rm -v $(pwd)/config/mosquitto:/mosquitto/config eclipse-mosquitto:2 \
    mosquitto_passwd -b /mosquitto/config/passwd ${MQTT_USERNAME:-smarthome} ${MQTT_PASSWORD}
fi

# Create Mosquitto config if it doesn't exist
if [ ! -f config/mosquitto/mosquitto.conf ]; then
  echo "📝 Creating MQTT configuration..."
  cat > config/mosquitto/mosquitto.conf <<EOF
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information
EOF
fi

echo ""
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "🗄️  Running database migrations..."
# Run Prisma migrations
docker-compose -f docker-compose.prod.yml run --rm api-gateway npx prisma migrate deploy

echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
for i in {1..30}; do
  if docker-compose -f docker-compose.prod.yml ps | grep -q "unhealthy"; then
    echo "   Attempt $i/30: Some services still starting..."
    sleep 2
  else
    echo "✅ All services are healthy!"
    break
  fi

  if [ $i -eq 30 ]; then
    echo "⚠️  Warning: Some services may not be healthy yet"
    docker-compose -f docker-compose.prod.yml ps
  fi
done

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Access your Smart Home Platform:"
echo "   Web UI: http://localhost:3000"
echo "   API: http://localhost:8000"
echo ""
echo "📝 Next steps:"
echo "   1. Access Web UI and create your admin account"
echo "   2. Configure your first devices"
echo "   3. Set up automations"
echo ""
echo "📚 Documentation: docs/DEPLOYMENT.md"
echo "🔧 Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "🛑 Stop: docker-compose -f docker-compose.prod.yml down"
