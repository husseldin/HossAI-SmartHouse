# Installation Guide

## Prerequisites

### Mac Studio (Main Controller)

- **OS**: macOS 12+ (Monterey or later)
- **Docker**: Docker Desktop 4.0+
- **RAM**: 8GB minimum, 16GB recommended
- **Disk Space**: 20GB minimum for platform + data
- **Network**: Ethernet connection recommended for stability

### Optional: Raspberry Pi (Edge Hubs)

- **Model**: Raspberry Pi 4 (4GB+ RAM recommended)
- **OS**: Raspberry Pi OS (64-bit) or Ubuntu 22.04 LTS
- **Accessories**: USB Zigbee/Z-Wave dongles if needed

## Installation Steps

### 1. Clone Repository

```bash
git clone <repo-url>
cd smart-home-platform
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and set secure values
nano .env
```

**Important environment variables to change:**

- `POSTGRES_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis password
- `MQTT_PASSWORD` - MQTT broker password
- `JWT_SECRET` - JWT signing secret (generate with `openssl rand -base64 32`)
- `ENCRYPTION_KEY` - Encryption key for secrets (generate with `openssl rand -base64 32`)
- `ADMIN_PASSWORD` - Initial admin user password

### 3. Run Setup Script

```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

This script will:
- Check prerequisites
- Install dependencies
- Generate Prisma client
- Create necessary directories
- Set up MQTT authentication

### 4. Start the Platform

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 5. Run Database Migrations

```bash
# Enter the device-service container
docker-compose exec device-service sh

# Run Prisma migrations
npx prisma migrate deploy

# Exit container
exit
```

### 6. Create First Admin User

The first user created automatically becomes an admin. Register via the API:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@localhost",
    "password": "your-secure-password"
  }'
```

### 7. Login and Get Token

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'
```

Save the returned `token` for API requests.

### 8. Test the Platform

```bash
# Check API Gateway health
curl http://localhost:8000/health

# List devices (should be empty initially)
curl http://localhost:8000/api/devices \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Service URLs

Once running, services are available at:

- **API Gateway**: http://localhost:8000
- **Device Service**: http://localhost:8001
- **Network Service**: http://localhost:8002
- **Security Service**: http://localhost:8003
- **Automation Engine**: http://localhost:8004
- **Integration Manager**: http://localhost:8005
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MQTT**: localhost:1883

## Stopping the Platform

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Troubleshooting

### Services Won't Start

Check logs:
```bash
docker-compose logs <service-name>
```

### Database Connection Issues

Ensure PostgreSQL is healthy:
```bash
docker-compose ps postgres
docker-compose logs postgres
```

### MQTT Connection Issues

Test MQTT broker:
```bash
docker-compose exec mosquitto mosquitto_sub -t "#" -v
```

### Port Conflicts

If ports are already in use, edit `.env` and change:
- `API_GATEWAY_PORT`
- `POSTGRES_PORT`
- `REDIS_PORT`
- `MQTT_PORT`

## Next Steps

- [Configure integrations](../integrations/adding-new-device.md)
- [Set up network scanning](../architecture/api-design.md#network-service)
- [Create automation rules](../architecture/api-design.md#automation-engine)
- [Install edge hub agents](./edge-hub-setup.md) (Raspberry Pi)

## Backup & Restore

### Backup

```bash
./scripts/backup.sh
```

Backs up:
- PostgreSQL database
- Redis data
- Configuration files

### Restore

```bash
./scripts/restore.sh <backup-file>
```

## Security Hardening

For production deployment:

1. **Change all default passwords**
2. **Enable TLS for MQTT** (use port 8883)
3. **Use reverse proxy** (Nginx/Traefik) with HTTPS
4. **Restrict network access** (firewall rules)
5. **Regular updates** (Docker images, dependencies)
6. **Enable audit logging**
7. **Set up automated backups**

See [Security Best Practices](../architecture/security.md) for details.
