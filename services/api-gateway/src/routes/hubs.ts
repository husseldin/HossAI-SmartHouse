/**
 * Edge Hub Management Routes
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { database, createLogger, EdgeHub } from '@smart-home/shared';
import { authMiddleware, requireRole } from '../middleware/auth';

const logger = createLogger('hub-routes');

interface RegisterHubBody {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  capabilities: string[];
}

interface HeartbeatBody {
  timestamp: string;
  health: any;
}

interface DeviceDiscoveredBody {
  id: string;
  name: string;
  type: string;
  protocol: string;
  manufacturer?: string;
  model?: string;
  capabilities: string[];
  metadata: Record<string, any>;
  hubId: string;
  discoveredAt: string;
}

export async function hubRoutes(app: FastifyInstance) {
  // Register hub (called by edge hub agents)
  app.post<{ Body: RegisterHubBody }>(
    '/hubs/register',
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const { id, name, location, ipAddress, capabilities } = request.body;

      logger.info({ hubId: id, name }, 'Hub registration request');

      try {
        // Check if hub already exists
        const existing = await database.edgeHub.findUnique({
          where: { id },
        });

        let hub: EdgeHub;

        if (existing) {
          // Update existing hub
          hub = (await database.edgeHub.update({
            where: { id },
            data: {
              name,
              location,
              ipAddress,
              capabilities,
              status: 'online',
              lastHeartbeat: new Date(),
            },
          })) as any;

          logger.info({ hubId: id }, 'Hub updated');
        } else {
          // Create new hub
          hub = (await database.edgeHub.create({
            data: {
              id,
              name,
              location,
              ipAddress,
              capabilities,
              status: 'online',
              lastHeartbeat: new Date(),
            },
          })) as any;

          logger.info({ hubId: id }, 'Hub registered');
        }

        return hub;
      } catch (error) {
        logger.error({ error, hubId: id }, 'Failed to register hub');
        return reply.code(500).send({ error: 'Failed to register hub' });
      }
    }
  );

  // Hub heartbeat (called by edge hub agents)
  app.post<{ Params: { id: string }; Body: HeartbeatBody }>(
    '/hubs/:id/heartbeat',
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { health } = request.body;

      try {
        // Update hub heartbeat
        await database.edgeHub.update({
          where: { id },
          data: {
            status: health.status === 'healthy' || health.status === 'degraded' ? 'online' : 'offline',
            lastHeartbeat: new Date(),
          },
        });

        logger.debug({ hubId: id }, 'Heartbeat received');

        return { status: 'ok' };
      } catch (error) {
        logger.error({ error, hubId: id }, 'Failed to process heartbeat');
        return reply.code(500).send({ error: 'Failed to process heartbeat' });
      }
    }
  );

  // Device discovered (called by edge hub agents)
  app.post<{ Body: DeviceDiscoveredBody }>(
    '/hubs/device/discovered',
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const deviceData = request.body;

      logger.info({ deviceId: deviceData.id, hubId: deviceData.hubId }, 'Device discovered');

      try {
        // Check if device already exists
        const existing = await database.device.findUnique({
          where: { id: deviceData.id },
        });

        if (existing) {
          logger.debug({ deviceId: deviceData.id }, 'Device already exists');
          return { status: 'exists', device: existing };
        }

        // Create integration if it doesn't exist
        let integration = await database.integration.findFirst({
          where: {
            name: `${deviceData.protocol}-${deviceData.hubId}`,
          },
        });

        if (!integration) {
          integration = await database.integration.create({
            data: {
              id: `integration-${deviceData.protocol}-${deviceData.hubId}`,
              name: `${deviceData.protocol}-${deviceData.hubId}`,
              type: deviceData.protocol as any,
              config: {},
              credentials: {},
              status: 'connected',
              enabled: true,
            },
          });
        }

        // Create new device
        const device = await database.device.create({
          data: {
            id: deviceData.id,
            name: deviceData.name,
            type: deviceData.type as any,
            status: 'online',
            integrationId: integration.id,
            edgeHubId: deviceData.hubId,
            capabilities: deviceData.capabilities as any[],
            metadata: {
              ...deviceData.metadata,
              manufacturer: deviceData.manufacturer,
              model: deviceData.model,
              protocol: deviceData.protocol,
            },
          },
        });

        logger.info({ deviceId: device.id, hubId: deviceData.hubId }, 'Device created');

        return { status: 'created', device };
      } catch (error) {
        logger.error({ error, deviceData }, 'Failed to process device discovery');
        return reply.code(500).send({ error: 'Failed to process device discovery' });
      }
    }
  );

  // Get all hubs (admin only)
  app.get(
    '/hubs',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (request, reply) => {
      try {
        const hubs = await database.edgeHub.findMany({
          orderBy: { createdAt: 'desc' },
        });

        // Enrich with device count
        const hubsWithDevices = await Promise.all(
          hubs.map(async (hub) => {
            const deviceCount = await database.device.count({
              where: { edgeHubId: hub.id },
            });

            return {
              ...hub,
              deviceCount,
            };
          })
        );

        return hubsWithDevices;
      } catch (error) {
        logger.error({ error }, 'Failed to fetch hubs');
        return reply.code(500).send({ error: 'Failed to fetch hubs' });
      }
    }
  );

  // Get hub details (admin only)
  app.get<{ Params: { id: string } }>(
    '/hubs/:id',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const hub = await database.edgeHub.findUnique({
          where: { id },
        });

        if (!hub) {
          return reply.code(404).send({ error: 'Hub not found' });
        }

        // Get devices for this hub
        const devices = await database.device.findMany({
          where: { edgeHubId: id },
        });

        return {
          ...hub,
          devices,
          deviceCount: devices.length,
        };
      } catch (error) {
        logger.error({ error, hubId: id }, 'Failed to fetch hub details');
        return reply.code(500).send({ error: 'Failed to fetch hub details' });
      }
    }
  );

  // Update hub (admin only)
  app.patch<{ Params: { id: string }; Body: Partial<EdgeHub> }>(
    '/hubs/:id',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      try {
        const hub = await database.edgeHub.update({
          where: { id },
          data: updates,
        });

        logger.info({ hubId: id, updates }, 'Hub updated');

        return hub;
      } catch (error) {
        logger.error({ error, hubId: id }, 'Failed to update hub');
        return reply.code(500).send({ error: 'Failed to update hub' });
      }
    }
  );

  // Delete hub (admin only)
  app.delete<{ Params: { id: string } }>(
    '/hubs/:id',
    {
      preHandler: [authMiddleware, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        // Check if hub has devices
        const deviceCount = await database.device.count({
          where: { edgeHubId: id },
        });

        if (deviceCount > 0) {
          return reply.code(400).send({
            error: 'Cannot delete hub with devices. Remove devices first.',
          });
        }

        await database.edgeHub.delete({
          where: { id },
        });

        logger.info({ hubId: id }, 'Hub deleted');

        return { status: 'deleted' };
      } catch (error) {
        logger.error({ error, hubId: id }, 'Failed to delete hub');
        return reply.code(500).send({ error: 'Failed to delete hub' });
      }
    }
  );
}
