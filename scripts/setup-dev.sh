#!/bin/bash

# Development setup script for Smart Home Platform

set -e

echo "=========================================="
echo "Smart Home Platform - Development Setup"
echo "=========================================="

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

echo "✓ Prerequisites check passed"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠ Please edit .env and set secure passwords!"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
cd services/shared
npx prisma generate
cd ../..

# Create necessary directories
echo "Creating directories..."
mkdir -p infrastructure/mosquitto/config
mkdir -p infrastructure/mosquitto/data
mkdir -p infrastructure/mosquitto/log
mkdir -p infrastructure/postgres/data

# Generate MQTT password file
echo "Setting up MQTT authentication..."
MQTT_USER="${MQTT_USERNAME:-smarthome}"
MQTT_PASS="${MQTT_PASSWORD:-changeme}"

# Note: This requires mosquitto_passwd to be installed
if command -v mosquitto_passwd &> /dev/null; then
    mosquitto_passwd -c -b infrastructure/mosquitto/config/passwd "$MQTT_USER" "$MQTT_PASS"
    echo "✓ MQTT password file created"
else
    echo "⚠ mosquitto_passwd not found. MQTT auth will need to be configured manually."
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env and set secure passwords"
echo "2. Run: docker-compose up -d"
echo "3. Run migrations: npm run db:migrate"
echo "4. Access the platform at http://localhost:8000"
echo ""
