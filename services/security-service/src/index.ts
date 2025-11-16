/**
 * Security Service - Vulnerability detection and alerts
 */

import Fastify from 'fastify';
import {
  createLogger,
  getPrismaClient,
  getMqttClient,
  createAlertSchema,
  alertQuerySchema,
  ValidationError,
  NotFoundError,
  VulnerabilitySeverity,
  EventType,
} from '@smart-home/shared';

const logger = createLogger('security-service');
const db = getPrismaClient();
const mqtt = getMqttClient();

const PORT = parseInt(process.env.SECURITY_SERVICE_PORT || '8003');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({ logger: false });

// Get vulnerabilities
server.get('/security/vulnerabilities', async (request, reply) => {
  try {
    const { page = 1, pageSize = 20, severity, acknowledged } = request.query as any;
    const skip = ((page as number) - 1) * (pageSize as number);

    const where: any = {};
    if (severity) where.severity = severity;
    if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';

    const [vulnerabilities, total] = await Promise.all([
      db.vulnerability.findMany({
        where,
        skip,
        take: pageSize as number,
        orderBy: { detectedAt: 'desc' },
        include: { scanResult: { include: { networkDevice: true } } },
      }),
      db.vulnerability.count({ where }),
    ]);

    return {
      success: true,
      data: { items: vulnerabilities, total, page, pageSize, hasMore: skip + vulnerabilities.length < total },
    };
  } catch (error: any) {
    logger.error({ error }, 'Failed to list vulnerabilities');
    return reply.status(500).send({ success: false, error: { code: 'LIST_VULNERABILITIES_FAILED', message: error.message } });
  }
});

// Get alerts
server.get('/security/alerts', async (request, reply) => {
  try {
    const parsed = alertQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error);
    }

    const { page, pageSize, type, severity, acknowledged } = parsed.data;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (acknowledged !== undefined) where.acknowledged = acknowledged;

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.alert.count({ where }),
    ]);

    return {
      success: true,
      data: { items: alerts, total, page, pageSize, hasMore: skip + alerts.length < total },
    };
  } catch (error: any) {
    logger.error({ error }, 'Failed to list alerts');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'LIST_ALERTS_FAILED', message: error.message },
    });
  }
});

// Create alert
server.post('/security/alerts', async (request, reply) => {
  try {
    const parsed = createAlertSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid alert data', parsed.error);
    }

    const alert = await db.alert.create({
      data: parsed.data as any,
    });

    // Publish event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.SECURITY_ALERT_CREATED,
      source: 'security-service',
      sourceId: alert.id,
      payload: alert,
      timestamp: new Date(),
    });

    logger.info({ alertId: alert.id, type: alert.type, severity: alert.severity }, 'Alert created');

    return reply.status(201).send({ success: true, data: alert });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create alert');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'CREATE_ALERT_FAILED', message: error.message },
    });
  }
});

// Acknowledge alert
server.patch('/security/alerts/:id/acknowledge', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const alert = await db.alert.update({
      where: { id },
      data: { acknowledged: true },
    });

    logger.info({ alertId: id }, 'Alert acknowledged');

    return { success: true, data: alert };
  } catch (error: any) {
    logger.error({ error }, 'Failed to acknowledge alert');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'ACKNOWLEDGE_ALERT_FAILED', message: error.message },
    });
  }
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'security-service', timestamp: new Date().toISOString() };
});

async function start() {
  try {
    await mqtt.connect();
    logger.info('Connected to MQTT broker');

    // Subscribe to scan completed events to analyze for vulnerabilities
    await mqtt.subscribeToEvents('network.scan.completed', async (event) => {
      // Analyze scan results for vulnerabilities (simplified for MVP)
      logger.info({ scanJobId: event.sourceId }, 'Analyzing scan for vulnerabilities');
      // Real implementation would check CVE databases, etc.
    });

    await server.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT }, 'Security Service started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Security Service');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await mqtt.disconnect();
  await server.close();
  process.exit(0);
});

start();
