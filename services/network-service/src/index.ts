/**
 * Network Service - Network scanning and inventory
 */

import Fastify from 'fastify';
import {
  createLogger,
  getPrismaClient,
  getMqttClient,
  createScanJobSchema,
  createNetworkDeviceSchema,
  networkDeviceQuerySchema,
  scanJobQuerySchema,
  ValidationError,
  NotFoundError,
  ScanStatus,
  EventType,
} from '@smart-home/shared';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('network-service');
const db = getPrismaClient();
const mqtt = getMqttClient();

const PORT = parseInt(process.env.NETWORK_SERVICE_PORT || '8002');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({ logger: false });

// ===========================================================================
// NETWORK DEVICE ROUTES
// ===========================================================================

server.get('/network/devices', async (request, reply) => {
  try {
    const parsed = networkDeviceQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error);
    }

    const { page, pageSize, deviceType, status, search } = parsed.data;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (deviceType) where.deviceType = deviceType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { ipAddress: { contains: search } },
        { macAddress: { contains: search } },
        { hostname: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [devices, total] = await Promise.all([
      db.networkDevice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lastSeen: 'desc' },
      }),
      db.networkDevice.count({ where }),
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
    logger.error({ error }, 'Failed to list network devices');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'LIST_NETWORK_DEVICES_FAILED', message: error.message },
    });
  }
});

server.get('/network/devices/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const device = await db.networkDevice.findUnique({
      where: { id },
      include: {
        scanResults: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        trafficStats: {
          orderBy: { windowStart: 'desc' },
          take: 10,
        },
      },
    });

    if (!device) {
      throw new NotFoundError('Network device');
    }

    return { success: true, data: device };
  } catch (error: any) {
    logger.error({ error }, 'Failed to get network device');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'GET_NETWORK_DEVICE_FAILED', message: error.message },
    });
  }
});

// ===========================================================================
// SCAN ROUTES
// ===========================================================================

server.post('/network/scans', async (request, reply) => {
  try {
    const parsed = createScanJobSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid scan job data', parsed.error);
    }

    const scanJob = await db.scanJob.create({
      data: {
        ...parsed.data,
        initiatedBy: 'system', // TODO: Get from authenticated user
        status: ScanStatus.PENDING,
      },
    });

    // Start scan asynchronously
    executeScan(scanJob.id).catch((error) => {
      logger.error({ error, scanJobId: scanJob.id }, 'Scan execution failed');
    });

    // Publish event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.NETWORK_SCAN_STARTED,
      source: 'network-service',
      sourceId: scanJob.id,
      payload: scanJob,
      timestamp: new Date(),
    });

    logger.info({ scanJobId: scanJob.id, scanType: scanJob.scanType }, 'Scan job created');

    return reply.status(202).send({ success: true, data: scanJob });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create scan job');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'CREATE_SCAN_JOB_FAILED', message: error.message },
    });
  }
});

server.get('/network/scans', async (request, reply) => {
  try {
    const parsed = scanJobQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error);
    }

    const { page, pageSize, scanType, status } = parsed.data;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (scanType) where.scanType = scanType;
    if (status) where.status = status;

    const [scans, total] = await Promise.all([
      db.scanJob.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.scanJob.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: scans,
        total,
        page,
        pageSize,
        hasMore: skip + scans.length < total,
      },
    };
  } catch (error: any) {
    logger.error({ error }, 'Failed to list scan jobs');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'LIST_SCAN_JOBS_FAILED', message: error.message },
    });
  }
});

server.get('/network/scans/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const scan = await db.scanJob.findUnique({
      where: { id },
      include: { scanResults: true },
    });

    if (!scan) {
      throw new NotFoundError('Scan job');
    }

    return { success: true, data: scan };
  } catch (error: any) {
    logger.error({ error }, 'Failed to get scan job');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'GET_SCAN_JOB_FAILED', message: error.message },
    });
  }
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'network-service', timestamp: new Date().toISOString() };
});

// ===========================================================================
// SCAN EXECUTION
// ===========================================================================

async function executeScan(scanJobId: string) {
  try {
    // Update status to running
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: ScanStatus.RUNNING, startedAt: new Date() },
    });

    const scanJob = await db.scanJob.findUnique({ where: { id: scanJobId } });
    if (!scanJob) return;

    // Execute nmap scan (simplified for MVP)
    const targets = (scanJob.targets as string[]).join(' ');
    const command = `nmap -sn -T3 ${targets}`;

    logger.info({ scanJobId, command }, 'Executing scan');

    const { stdout } = await execAsync(command);

    // Parse nmap output (simplified)
    const ipMatches = stdout.matchAll(/Nmap scan report for (?:([^\s]+) \()?(\d+\.\d+\.\d+\.\d+)\)?/g);

    for (const match of ipMatches) {
      const hostname = match[1] || null;
      const ipAddress = match[2];

      // Create or update network device
      const existing = await db.networkDevice.findUnique({ where: { ipAddress } });

      if (existing) {
        await db.networkDevice.update({
          where: { ipAddress },
          data: {
            lastSeen: new Date(),
            status: 'online',
            hostname: hostname || existing.hostname,
          },
        });
      } else {
        const device = await db.networkDevice.create({
          data: {
            ipAddress,
            macAddress: `00:00:00:00:00:00`, // Placeholder - real implementation would extract from nmap
            hostname,
            status: 'online',
          },
        });

        // Publish discovery event
        await mqtt.publishEvent({
          id: crypto.randomUUID(),
          type: EventType.NETWORK_DEVICE_DISCOVERED,
          source: 'network-service',
          sourceId: device.id,
          payload: device,
          timestamp: new Date(),
        });
      }
    }

    // Update scan job status
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: ScanStatus.COMPLETED, completedAt: new Date() },
    });

    // Publish completion event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.NETWORK_SCAN_COMPLETED,
      source: 'network-service',
      sourceId: scanJobId,
      payload: { scanJobId },
      timestamp: new Date(),
    });

    logger.info({ scanJobId }, 'Scan completed');
  } catch (error) {
    logger.error({ error, scanJobId }, 'Scan failed');

    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: ScanStatus.FAILED, completedAt: new Date() },
    });
  }
}

// ===========================================================================
// STARTUP
// ===========================================================================

async function start() {
  try {
    await mqtt.connect();
    logger.info('Connected to MQTT broker');

    await server.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT }, 'Network Service started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Network Service');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await mqtt.disconnect();
  await server.close();
  process.exit(0);
});

start();
