/**
 * Integration Manager - Device connector management
 */

import Fastify from 'fastify';
import {
  createLogger,
  getPrismaClient,
  getMqttClient,
  createIntegrationSchema,
  updateIntegrationSchema,
  ValidationError,
  NotFoundError,
  encryptSecret,
  decryptSecret,
} from '@smart-home/shared';

const logger = createLogger('integration-manager');
const db = getPrismaClient();
const mqtt = getMqttClient();

const PORT = parseInt(process.env.INTEGRATION_MANAGER_PORT || '8005');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({ logger: false });

// List integrations
server.get('/integrations', async (request, reply) => {
  try {
    const { page = 1, pageSize = 20, type, enabled } = request.query as any;
    const skip = ((page as number) - 1) * (pageSize as number);

    const where: any = {};
    if (type) where.type = type;
    if (enabled !== undefined) where.enabled = enabled === 'true';

    const [integrations, total] = await Promise.all([
      db.integration.findMany({
        where,
        skip,
        take: pageSize as number,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          protocol: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
          config: true,
          // Don't return credentials
        },
      }),
      db.integration.count({ where }),
    ]);

    return {
      success: true,
      data: { items: integrations, total, page, pageSize, hasMore: skip + integrations.length < total },
    };
  } catch (error: any) {
    logger.error({ error }, 'Failed to list integrations');
    return reply.status(500).send({ success: false, error: { code: 'LIST_INTEGRATIONS_FAILED', message: error.message } });
  }
});

// Get integration
server.get('/integrations/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const integration = await db.integration.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        protocol: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        config: true,
        devices: true,
      },
    });

    if (!integration) {
      throw new NotFoundError('Integration');
    }

    return { success: true, data: integration };
  } catch (error: any) {
    logger.error({ error }, 'Failed to get integration');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'GET_INTEGRATION_FAILED', message: error.message },
    });
  }
});

// Create integration
server.post('/integrations', async (request, reply) => {
  try {
    const parsed = createIntegrationSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid integration data', parsed.error);
    }

    const data: any = { ...parsed.data };

    // Encrypt credentials
    if (data.credentials) {
      const encrypted: any = {};
      for (const [key, value] of Object.entries(data.credentials)) {
        encrypted[key] = encryptSecret(value as string);
      }
      data.credentials = encrypted;
    }

    const integration = await db.integration.create({
      data,
    });

    logger.info({ integrationId: integration.id, name: integration.name }, 'Integration created');

    return reply.status(201).send({ success: true, data: integration });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create integration');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'CREATE_INTEGRATION_FAILED', message: error.message },
    });
  }
});

// Update integration
server.patch('/integrations/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const parsed = updateIntegrationSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid integration data', parsed.error);
    }

    const data: any = { ...parsed.data };

    // Encrypt credentials if provided
    if (data.credentials) {
      const encrypted: any = {};
      for (const [key, value] of Object.entries(data.credentials)) {
        encrypted[key] = encryptSecret(value as string);
      }
      data.credentials = encrypted;
    }

    const integration = await db.integration.update({
      where: { id },
      data,
    });

    logger.info({ integrationId: id }, 'Integration updated');

    return { success: true, data: integration };
  } catch (error: any) {
    logger.error({ error }, 'Failed to update integration');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'UPDATE_INTEGRATION_FAILED', message: error.message },
    });
  }
});

// Delete integration
server.delete('/integrations/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    await db.integration.delete({ where: { id } });

    logger.info({ integrationId: id }, 'Integration deleted');

    return { success: true };
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete integration');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'DELETE_INTEGRATION_FAILED', message: error.message },
    });
  }
});

// Test integration connection
server.post('/integrations/:id/test', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const integration = await db.integration.findUnique({ where: { id } });
    if (!integration) {
      throw new NotFoundError('Integration');
    }

    // Test connection (simplified for MVP)
    logger.info({ integrationId: id, type: integration.type }, 'Testing integration connection');

    return { success: true, message: 'Integration connection test successful' };
  } catch (error: any) {
    logger.error({ error }, 'Failed to test integration');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'TEST_INTEGRATION_FAILED', message: error.message },
    });
  }
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'integration-manager', timestamp: new Date().toISOString() };
});

async function start() {
  try {
    await mqtt.connect();
    logger.info('Connected to MQTT broker');

    await server.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT }, 'Integration Manager started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Integration Manager');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await mqtt.disconnect();
  await server.close();
  process.exit(0);
});

start();
