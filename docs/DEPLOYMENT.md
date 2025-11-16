# Deployment Guide - Smart Home Platform

Complete guide for deploying the Smart Home Platform in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Production Deployment](#production-deployment)
4. [Configuration](#configuration)
5. [Backup & Restore](#backup--restore)
6. [Monitoring](#monitoring)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum**:
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB SSD
- OS: Ubuntu 20.04 LTS or later

**Recommended**:
- CPU: 8+ cores
- RAM: 16 GB
- Disk: 100 GB SSD
- OS: Ubuntu 22.04 LTS

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- (Optional) nginx for reverse proxy
- (Optional) Let's Encrypt for SSL certificates

### Network Requirements

- Open ports:
  - 3000 (Web UI)
  - 8000 (API Gateway)
  - 1883 (MQTT)
  - 8883 (MQTT over TLS, optional)

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/HossAI-SmartHouse.git
cd HossAI-SmartHouse
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.production.example .env.production

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
MQTT_PASSWORD=$(openssl rand -base64 32)

# Update .env.production with generated passwords
sed -i "s/POSTGRES_PASSWORD=CHANGE_ME_PLEASE/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env.production
sed -i "s/REDIS_PASSWORD=CHANGE_ME_PLEASE/REDIS_PASSWORD=$REDIS_PASSWORD/" .env.production
sed -i "s/JWT_SECRET=CHANGE_ME_PLEASE/JWT_SECRET=$JWT_SECRET/" .env.production
sed -i "s/MQTT_PASSWORD=CHANGE_ME_PLEASE/MQTT_PASSWORD=$MQTT_PASSWORD/" .env.production

# Update your domain
sed -i "s|PLATFORM_DOMAIN=https://smarthome.yourdomain.com|PLATFORM_DOMAIN=https://your-actual-domain.com|" .env.production
```

### 3. Deploy

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run deployment script
./scripts/deploy.sh
```

### 4. Access Platform

- Web UI: http://localhost:3000
- API: http://localhost:8000

**First Login**:
1. Navigate to Web UI
2. Create admin account (first user becomes admin automatically)
3. Start adding devices!

---

## Production Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group to take effect
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/HossAI-SmartHouse.git
cd HossAI-SmartHouse

# Copy and configure environment
cp .env.production.example .env.production
nano .env.production  # Edit with your values
```

### Step 3: Set Up SSL (Optional but Recommended)

#### Using Let's Encrypt with nginx

```bash
# Install nginx and certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot certonly --nginx -d your-domain.com

# Create nginx config
sudo nano /etc/nginx/sites-available/smarthome
```

**nginx configuration**:

```nginx
upstream api {
  server localhost:8000;
}

upstream web {
  server localhost:3000;
}

server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;

  # API proxy
  location /api {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # WebSocket support
  location /ws {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  # Web UI
  location / {
    proxy_pass http://web;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/smarthome /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Auto-renew SSL
sudo systemctl enable certbot.timer
```

### Step 4: Deploy Platform

```bash
# Deploy
./scripts/deploy.sh

# Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps
```

### Step 5: Configure Firewall

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1883/tcp  # MQTT (if external access needed)
sudo ufw enable
```

---

## Configuration

### Environment Variables

Key variables in `.env.production`:

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `$(openssl rand -base64 32)` |
| `REDIS_PASSWORD` | Redis password | `$(openssl rand -base64 32)` |
| `JWT_SECRET` | JWT signing secret | `$(openssl rand -base64 32)` |
| `PLATFORM_DOMAIN` | Your domain | `https://smarthome.example.com` |
| `SMTP_HOST` | Email server (optional) | `smtp.gmail.com` |
| `BACKUP_RETENTION_DAYS` | Backup retention | `30` |

### MQTT Configuration

Edit `config/mosquitto/mosquitto.conf`:

```conf
# Basic config
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd

# TLS config (recommended)
listener 8883
allow_anonymous false
password_file /mosquitto/config/passwd
cafile /mosquitto/config/ca.crt
certfile /mosquitto/config/server.crt
keyfile /mosquitto/config/server.key
```

Generate MQTT passwords:

```bash
docker run --rm -v $(pwd)/config/mosquitto:/mosquitto/config eclipse-mosquitto:2 \
  mosquitto_passwd -b /mosquitto/config/passwd username password
```

---

## Backup & Restore

### Automated Backups

Set up daily backups with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/HossAI-SmartHouse/scripts/backup.sh >> /var/log/smarthome-backup.log 2>&1
```

### Manual Backup

```bash
./scripts/backup.sh
```

Backup includes:
- PostgreSQL database
- Redis data
- MQTT data
- Configuration files
- Environment variables

Backup location: `./backups/smarthome_backup_YYYYMMDD_HHMMSS.tar.gz`

### Restore from Backup

```bash
./scripts/restore.sh backups/smarthome_backup_20240115_020000.tar.gz
```

**Warning**: This will overwrite current data!

---

## Monitoring

### System Health

Access health dashboard:
- Web UI: `https://your-domain.com/system/health`
- API: `curl http://localhost:8000/health`

### Logs

**View logs**:

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# With timestamp and tail
docker-compose -f docker-compose.prod.yml logs -f --tail=100 --timestamps
```

**Log viewer in Web UI**:
- Navigate to: `https://your-domain.com/system/logs`
- Filter by service, level, or search

### Resource Monitoring

```bash
# Docker stats
docker stats

# Individual service
docker stats smarthome-api-gateway

# Disk usage
docker system df
```

### Alerts

Configure email alerts in `.env.production`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=Smart Home <smarthome@yourdomain.com>
```

---

## Maintenance

### Update Platform

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm api-gateway npx prisma migrate deploy

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### Database Maintenance

```bash
# Vacuum database
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "VACUUM ANALYZE;"

# Check database size
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "\l+"

# Backup database only
docker exec smarthome-postgres pg_dump -U smarthome -d smarthome > backup_$(date +%Y%m%d).sql
```

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything
docker system prune -a
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies (test thoroughly!)
npm update

# Rebuild
docker-compose -f docker-compose.prod.yml build
```

---

## Troubleshooting

### Services Won't Start

**Check logs**:

```bash
docker-compose -f docker-compose.prod.yml logs
```

**Common issues**:

1. **Port already in use**:
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :8000
   ```

2. **Database connection failed**:
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env.production
   - Check password is correct

3. **Insufficient memory**:
   ```bash
   free -h
   docker stats
   ```

### Performance Issues

**High CPU usage**:

```bash
# Check which service
docker stats

# Increase resource limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

**Slow database queries**:

```bash
# Enable query logging
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Check slow queries
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Data Loss Prevention

**Enable WAL archiving** (PostgreSQL):

```bash
# In docker-compose.prod.yml, add volume for WAL
volumes:
  - postgres-data:/var/lib/postgresql/data
  - ./wal_archive:/wal_archive

# Configure PostgreSQL
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "ALTER SYSTEM SET wal_level = 'replica';"
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "ALTER SYSTEM SET archive_mode = 'on';"
docker exec smarthome-postgres psql -U smarthome -d smarthome -c "ALTER SYSTEM SET archive_command = 'cp %p /wal_archive/%f';"
```

### Network Issues

**MQTT connection problems**:

```bash
# Test MQTT connection
docker run --rm --network=host eclipse-mosquitto:2 mosquitto_sub -h localhost -t '#' -v

# Check MQTT logs
docker-compose -f docker-compose.prod.yml logs mosquitto
```

**API not accessible**:

```bash
# Test API directly
curl http://localhost:8000/health

# Check nginx config
sudo nginx -t

# Check firewall
sudo ufw status
```

---

## Security Best Practices

1. **Use strong passwords**: Generate with `openssl rand -base64 32`
2. **Enable SSL/TLS**: Use Let's Encrypt for free certificates
3. **Regular updates**: Keep dependencies and Docker images updated
4. **Backup regularly**: Automate backups with cron
5. **Monitor logs**: Check for suspicious activity
6. **Limit network exposure**: Only expose necessary ports
7. **Use firewall**: Configure UFW or iptables
8. **Rotate secrets**: Change passwords periodically

---

## Support

- **Documentation**: `docs/`
- **Issues**: GitHub Issues
- **Health Check**: `https://your-domain.com/system/health`
- **Logs**: `https://your-domain.com/system/logs`

---

**Last Updated**: January 2025
**Platform Version**: 1.0.0
