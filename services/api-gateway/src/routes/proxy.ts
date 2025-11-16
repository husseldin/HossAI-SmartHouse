/**
 * Proxy routes to microservices
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import httpProxy from 'http-proxy';
import { authMiddleware } from '../middleware/auth';
import { createLogger } from '@smart-home/shared';

const logger = createLogger('proxy-routes');

const proxy = httpProxy.createProxyServer({});

const services = {
  devices: process.env.DEVICE_SERVICE_URL || 'http://device-service:8001',
  network: process.env.NETWORK_SERVICE_URL || 'http://network-service:8002',
  security: process.env.SECURITY_SERVICE_URL || 'http://security-service:8003',
  automation: process.env.AUTOMATION_ENGINE_URL || 'http://automation-engine:8004',
  integrations: process.env.INTEGRATION_MANAGER_URL || 'http://integration-manager:8005',
};

export default async function proxyRoutes(fastify: FastifyInstance) {
  // Device service routes
  fastify.all('/devices*', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    return proxyRequest(request, reply, services.devices);
  });

  // Network service routes
  fastify.all('/network*', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    return proxyRequest(request, reply, services.network);
  });

  // Security service routes
  fastify.all('/security*', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    return proxyRequest(request, reply, services.security);
  });

  // Automation service routes
  fastify.all('/automations*', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    return proxyRequest(request, reply, services.automation);
  });

  // Integration service routes
  fastify.all('/integrations*', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    return proxyRequest(request, reply, services.integrations);
  });
}

function proxyRequest(request: FastifyRequest, reply: FastifyReply, target: string) {
  return new Promise((resolve, reject) => {
    proxy.web(
      request.raw,
      reply.raw,
      {
        target,
        changeOrigin: true,
      },
      (err) => {
        if (err) {
          logger.error({ error: err, target }, 'Proxy error');
          reject(err);
        }
      }
    );

    reply.hijack();
    resolve(undefined);
  });
}
