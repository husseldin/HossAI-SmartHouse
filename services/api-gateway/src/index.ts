/**
 * API Gateway - Main entry point
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createLogger } from '@smart-home/shared';
import authRoutes from './routes/auth';
import proxyRoutes from './routes/proxy';
import healthRoutes from './routes/health';
import { authMiddleware } from './middleware/auth';

const logger = createLogger('api-gateway');

const PORT = parseInt(process.env.API_GATEWAY_PORT || '8000');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({
  logger: false, // Use our custom logger
  trustProxy: true,
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: process.env.NODE_ENV === 'production' ? process.env.PLATFORM_DOMAIN || false : true,
      credentials: true,
    });

    await server.register(helmet, {
      contentSecurityPolicy: false, // Disable for WebSocket
    });

    await server.register(rateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    });

    await server.register(websocket);

    // Register routes
    await server.register(healthRoutes, { prefix: '/health' });
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(proxyRoutes, { prefix: '/api' });

    // Start server
    await server.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT, host: HOST }, 'API Gateway started');
  } catch (error) {
    logger.error({ error }, 'Failed to start API Gateway');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

start();
