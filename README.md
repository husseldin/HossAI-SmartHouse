# Smart Home + Network Control Platform

A **local-first, privacy-focused** smart home and network control platform that runs on your Mac Studio with support for Raspberry Pi edge hubs.

## Overview

This platform provides:

- **Smart Home Control**: Unified device registry for lights, plugs, sensors, cameras, and more
- **Network Management**: Device inventory, traffic monitoring, and router/firewall integration
- **Security & Vulnerability Scanning**: Safe network scanning, port detection, and risk assessment
- **Automation Engine**: Rule-based automation with triggers, conditions, and actions
- **Web Dashboard**: Rich SPA for controlling everything via browser
- **LLM-Ready APIs**: Agent-friendly endpoints for future voice/AI assistant integration

## Architecture

- **Microservices-based**: 6 core services with clear responsibilities
- **Event-driven**: MQTT message bus for real-time updates
- **API-first**: RESTful APIs + WebSockets
- **Self-hosted**: No cloud dependencies
- **Dockerized**: Easy deployment via docker-compose

## Quick Start

### Prerequisites

- **Mac Studio** (or any modern macOS/Linux machine)
- Docker Desktop 4.0+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- 8GB+ RAM, 20GB+ disk space

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd smart-home-platform
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Generate TLS certificates** (for MQTT and edge hubs)
   ```bash
   ./scripts/generate-certs.sh
   ```

4. **Start the platform**
   ```bash
   docker-compose up -d
   ```

5. **Access the dashboard**
   ```
   https://localhost (or your configured domain)
   ```

   Default credentials:
   - Username: `admin`
   - Password: (set in .env as `ADMIN_PASSWORD`)

### Development Setup

```bash
# Install dependencies for all services
npm install

# Start services in development mode
docker-compose -f docker-compose.dev.yml up

# Run tests
npm test
```

## Project Structure

```
smart-home-platform/
├── services/              # Backend microservices
│   ├── api-gateway/      # Authentication, routing, WebSocket hub
│   ├── device-service/   # Device registry and control
│   ├── network-service/  # Network inventory and scanning
│   ├── security-service/ # Vulnerability detection and alerts
│   ├── automation-engine/ # Rules and automation
│   ├── integration-manager/ # Device connectors and adapters
│   └── shared/           # Shared libraries and types
├── edge-agent/           # Raspberry Pi edge hub agent
├── web-ui/               # React web dashboard
├── infrastructure/       # Config files (nginx, mosquitto, etc.)
└── docs/                 # Documentation
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | Main entry point, auth, routing |
| Device Service | 8001 | Device CRUD and control |
| Network Service | 8002 | Network scanning and inventory |
| Security Service | 8003 | Vulnerability scanning and alerts |
| Automation Engine | 8004 | Rules and automation execution |
| Integration Manager | 8005 | Device connector management |
| Web UI | 3000 | React dashboard |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache and sessions |
| MQTT Broker | 1883/8883 | Event bus |

## Key Features

### Smart Home Control
- Multi-protocol device support (Wi-Fi, Zigbee, Z-Wave, MQTT, HTTP)
- Device grouping by room, floor, or custom tags
- Real-time state updates via WebSocket
- Scene and routine management

### Network Management
- Automatic device discovery
- Traffic monitoring and analysis
- Router/firewall integration (UniFi, Asus, etc.)
- Bandwidth usage per device

### Security & Scanning
- Safe network scanning (nmap integration)
- Port and service detection
- OS fingerprinting
- CVE mapping and risk scoring
- Alert notifications

### Automation
- Visual rule builder
- Multiple trigger types (device, network, schedule, webhook)
- Conditional logic
- Multi-step actions
- Execution history and logging

## Documentation

- [Architecture Overview](docs/architecture/architecture.md)
- [Data Model](docs/architecture/data-model.md)
- [API Documentation](docs/architecture/api-design.md)
- [Installation Guide](docs/deployment/installation.md)
- [Adding New Devices](docs/integrations/adding-new-device.md)
- [LLM Agent Integration](docs/agent-api/llm-agent-guide.md)

## Security

This platform is designed with security and privacy as top priorities:

- ✅ All data stays local (no cloud dependencies)
- ✅ TLS encryption for all network communication
- ✅ mTLS for edge hub authentication
- ✅ Role-based access control (RBAC)
- ✅ Encrypted secrets at rest
- ✅ Safe scanning only (no exploitation)
- ✅ Audit logging for admin actions

See [Security Architecture](docs/architecture/architecture.md#security) for details.

## Deployment

### Mac Studio (Main Controller)
```bash
docker-compose up -d
```

### Raspberry Pi (Edge Hub)
```bash
# On your Raspberry Pi
curl -sSL https://<your-controller>/edge-agent/install.sh | bash
```

See [Deployment Guide](docs/deployment/installation.md) for detailed instructions.

## Roadmap

- [x] Phase 1: Architecture and design
- [x] Phase 2: Core backend platform
- [ ] Phase 3: Web UI and dashboard
- [ ] Phase 4: Network scanning and security features
- [ ] Phase 5: Edge hub support (Raspberry Pi)
- [ ] Phase 6: Advanced automation and LLM-ready APIs
- [ ] Phase 7: Docker deployment and operations
- [ ] Phase 8: Testing, self-checks, and QA

## Contributing

This is a private project. For questions or issues, please contact the maintainer.

## License

Private - All Rights Reserved
