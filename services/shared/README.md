# @smart-home/shared

Shared libraries and utilities for the Smart Home Platform.

## Overview

This package provides common functionality used across all microservices:

- **Types**: TypeScript types and interfaces for all entities
- **Database**: Prisma client and database utilities
- **MQTT Client**: Event bus communication
- **Authentication**: JWT and password hashing utilities
- **Validation**: Zod schemas for data validation
- **Logging**: Centralized logging with Pino
- **Utilities**: Common helper functions

## Usage

### In other services

```typescript
import {
  getPrismaClient,
  getMqttClient,
  createLogger,
  Device,
  DeviceType,
  hashPassword,
  verifyToken,
} from '@smart-home/shared';

// Database
const db = getPrismaClient();
const devices = await db.device.findMany();

// MQTT
const mqtt = getMqttClient();
await mqtt.connect();
await mqtt.publishEvent({
  id: '123',
  type: EventType.DEVICE_STATE_CHANGED,
  source: 'device-service',
  payload: { deviceId: 'abc', state: { power: true } },
  timestamp: new Date(),
});

// Logger
const logger = createLogger('my-service');
logger.info({ deviceId: '123' }, 'Device state changed');
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## Prisma

### Generate Prisma Client

```bash
cd prisma
npx prisma generate
```

### Create Migration

```bash
npx prisma migrate dev --name <migration_name>
```

### Apply Migrations

```bash
npx prisma migrate deploy
```

### Open Prisma Studio

```bash
npx prisma studio
```
