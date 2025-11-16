/**
 * Health check routes
 */

import { FastifyInstance } from 'fastify';
import { checkDatabaseHealth, getMqttClient, createLogger } from '@smart-home/shared';

const logger = createLogger('health-routes');

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      checks: {
        database: await checkDatabaseHealth(),
        mqtt: getMqttClient().isConnected(),
      },
    };

    const allHealthy = Object.values(health.checks).every((check) => check === true);

    return reply.status(allHealthy ? 200 : 503).send(health);
  });
}
