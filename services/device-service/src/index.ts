/**
 * Device Service - Main entry point
 */

import Fastify from 'fastify';
import {
  createLogger,
  getPrismaClient,
  getMqttClient,
  createDeviceSchema,
  updateDeviceSchema,
  deviceControlSchema,
  deviceQuerySchema,
  ValidationError,
  NotFoundError,
  EventType,
} from '@smart-home/shared';

const logger = createLogger('device-service');
const db = getPrismaClient();
const mqtt = getMqttClient();

const PORT = parseInt(process.env.DEVICE_SERVICE_PORT || '8001');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({ logger: false });

// ===========================================================================
// ROUTES
// ===========================================================================

// List devices
server.get('/devices', async (request, reply) => {
  try {
    const parsed = deviceQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error);
    }

    const { page, pageSize, type, status, room, floor, tags, search, sortBy, sortOrder } = parsed.data;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (room) where.room = room;
    if (floor) where.floor = floor;
    if (tags && tags.length > 0) where.tags = { hasSome: tags };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { room: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [devices, total] = await Promise.all([
      db.device.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          integration: { select: { name: true, type: true } },
          edgeHub: { select: { name: true } },
        },
      }),
      db.device.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: devices,
        total,
        page,
        pageSize,
        hasMore: skip + devices.length < total,
      },
    };
  } catch (error: any) {
    logger.error({ error }, 'Failed to list devices');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'LIST_DEVICES_FAILED', message: error.message },
    });
  }
});

// Get device by ID
server.get('/devices/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const device = await db.device.findUnique({
      where: { id },
      include: {
        integration: true,
        edgeHub: true,
        deviceStates: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!device) {
      throw new NotFoundError('Device');
    }

    return { success: true, data: device };
  } catch (error: any) {
    logger.error({ error }, 'Failed to get device');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'GET_DEVICE_FAILED', message: error.message },
    });
  }
});

// Create device
server.post('/devices', async (request, reply) => {
  try {
    const parsed = createDeviceSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid device data', parsed.error);
    }

    const device = await db.device.create({
      data: parsed.data as any,
    });

    // Publish event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.DEVICE_ADDED,
      source: 'device-service',
      sourceId: device.id,
      payload: device,
      timestamp: new Date(),
    });

    logger.info({ deviceId: device.id, deviceName: device.name }, 'Device created');

    return reply.status(201).send({ success: true, data: device });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create device');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'CREATE_DEVICE_FAILED', message: error.message },
    });
  }
});

// Update device
server.patch('/devices/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const parsed = updateDeviceSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid device data', parsed.error);
    }

    const device = await db.device.update({
      where: { id },
      data: parsed.data as any,
    });

    logger.info({ deviceId: device.id }, 'Device updated');

    return { success: true, data: device };
  } catch (error: any) {
    logger.error({ error }, 'Failed to update device');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'UPDATE_DEVICE_FAILED', message: error.message },
    });
  }
});

// Delete device
server.delete('/devices/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    await db.device.delete({ where: { id } });

    // Publish event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.DEVICE_REMOVED,
      source: 'device-service',
      sourceId: id,
      payload: { deviceId: id },
      timestamp: new Date(),
    });

    logger.info({ deviceId: id }, 'Device deleted');

    return { success: true };
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete device');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'DELETE_DEVICE_FAILED', message: error.message },
    });
  }
});

// Control device
server.post('/devices/:id/control', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const parsed = deviceControlSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid control command', parsed.error);
    }

    const device = await db.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundError('Device');
    }

    const { capability, value, reason } = parsed.data;

    // Update device state
    const newState = { [capability]: value };
    await db.deviceState.create({
      data: {
        deviceId: id,
        state: newState,
      },
    });

    // Publish command to MQTT
    await mqtt.publish(`devices/${id}/command`, {
      capability,
      value,
      timestamp: new Date(),
    });

    // Publish state changed event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.DEVICE_STATE_CHANGED,
      source: 'device-service',
      sourceId: id,
      payload: { deviceId: id, state: newState, reason },
      timestamp: new Date(),
    });

    logger.info({ deviceId: id, capability, value }, 'Device control command sent');

    return { success: true, data: { deviceId: id, state: newState } };
  } catch (error: any) {
    logger.error({ error }, 'Failed to control device');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'CONTROL_DEVICE_FAILED', message: error.message },
    });
  }
});

// Get device state history
server.get('/devices/:id/states', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { limit = '100' } = request.query as { limit?: string };

    const states = await db.deviceState.findMany({
      where: { deviceId: id },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
    });

    return { success: true, data: states };
  } catch (error: any) {
    logger.error({ error }, 'Failed to get device states');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'GET_STATES_FAILED', message: error.message },
    });
  }
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'device-service', timestamp: new Date().toISOString() };
});

// ===========================================================================
// STARTUP
// ===========================================================================

async function start() {
  try {
    // Connect to MQTT
    await mqtt.connect();
    logger.info('Connected to MQTT broker');

    // Subscribe to device state updates from integrations/edge hubs
    await mqtt.subscribe('devices/+/state');
    mqtt.on('message', async (topic, message) => {
      const match = topic.match(/^devices\/([^/]+)\/state$/);
      if (match) {
        const deviceId = match[1];
        await db.deviceState.create({
          data: {
            deviceId,
            state: message,
          },
        });
      }
    });

    // Start HTTP server
    await server.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT }, 'Device Service started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Device Service');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mqtt.disconnect();
  await server.close();
  process.exit(0);
});

start();
