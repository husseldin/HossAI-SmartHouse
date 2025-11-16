/**
 * Edge Hub Agent - Runs on Raspberry Pi
 * Manages local protocol adapters and communicates with main controller
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createLogger } from '@smart-home/shared';
import { ControllerClient } from './controller-client';
import { HealthMonitor } from './health-monitor';
import { ProtocolAdapterManager } from './adapters/adapter-manager';

const logger = createLogger('edge-hub-agent');

const HUB_ID = process.env.HUB_ID || 'edge-hub-unknown';
const HUB_NAME = process.env.HUB_NAME || 'Edge Hub';
const HUB_LOCATION = process.env.HUB_LOCATION || 'Unknown';
const PORT = parseInt(process.env.PORT || '8080');
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({
  logger: logger as any,
});

// Controller communication client
let controllerClient: ControllerClient;
let healthMonitor: HealthMonitor;
let adapterManager: ProtocolAdapterManager;

async function main() {
  // Register plugins
  await app.register(cors);
  await app.register(helmet);

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    const health = healthMonitor.getHealthStatus();
    reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  // Hub info endpoint
  app.get('/info', async (request, reply) => {
    return {
      hubId: HUB_ID,
      name: HUB_NAME,
      location: HUB_LOCATION,
      uptime: process.uptime(),
      adapters: adapterManager.getAdapterStatus(),
      health: healthMonitor.getHealthStatus(),
    };
  });

  // Adapter status endpoint
  app.get('/adapters', async (request, reply) => {
    return adapterManager.getAdapterStatus();
  });

  // Manual device discovery
  app.post('/discover', async (request, reply) => {
    logger.info('Starting manual device discovery');
    await adapterManager.discoverAllDevices();
    return { status: 'discovery_started' };
  });

  // Initialize controller client
  controllerClient = new ControllerClient({
    hubId: HUB_ID,
    hubName: HUB_NAME,
    location: HUB_LOCATION,
    controllerHost: process.env.CONTROLLER_HOST || 'localhost',
    mqttPort: parseInt(process.env.CONTROLLER_MQTT_PORT || '1883'),
    mqttUsername: process.env.MQTT_USERNAME,
    mqttPassword: process.env.MQTT_PASSWORD,
    useTLS: process.env.MQTT_USE_TLS === 'true',
    caCert: process.env.MQTT_CA_CERT,
    clientCert: process.env.MQTT_CLIENT_CERT,
    clientKey: process.env.MQTT_CLIENT_KEY,
  });

  // Initialize protocol adapter manager
  adapterManager = new ProtocolAdapterManager({
    hubId: HUB_ID,
    controllerClient,
    enableZigbee: process.env.ENABLE_ZIGBEE === 'true',
    enableZwave: process.env.ENABLE_ZWAVE === 'true',
    enableBluetooth: process.env.ENABLE_BLUETOOTH === 'true',
    zigbeePort: process.env.ZIGBEE_PORT,
    zigbeeAdapter: process.env.ZIGBEE_ADAPTER,
    zwavePort: process.env.ZWAVE_PORT,
  });

  // Initialize health monitor
  healthMonitor = new HealthMonitor({
    hubId: HUB_ID,
    controllerClient,
    adapterManager,
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '10000'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  });

  // Connect to controller
  await controllerClient.connect();
  logger.info('Connected to controller');

  // Register hub with controller
  await controllerClient.registerHub();
  logger.info('Hub registered with controller');

  // Initialize adapters
  await adapterManager.initializeAdapters();
  logger.info('Protocol adapters initialized');

  // Start health monitoring
  healthMonitor.start();
  logger.info('Health monitoring started');

  // Start local API server
  await app.listen({ port: PORT, host: HOST });
  logger.info({ port: PORT, host: HOST }, 'Edge hub agent started');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down edge hub agent...');
    healthMonitor.stop();
    await adapterManager.shutdown();
    await controllerClient.disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start edge hub agent');
  process.exit(1);
});
