/**
 * Hub Event Handler
 * Listens to MQTT events from edge hubs and processes them
 */

import { mqttClient, createLogger, database } from '@smart-home/shared';

const logger = createLogger('hub-event-handler');

export class HubEventHandler {
  private initialized = false;

  /**
   * Initialize hub event listener
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing hub event handler');

    // Subscribe to hub events
    await mqttClient.subscribeToEvents('hub/+/heartbeat', this.handleHeartbeat.bind(this));
    await mqttClient.subscribeToEvents('hub/+/device/discovered', this.handleDeviceDiscovered.bind(this));
    await mqttClient.subscribeToEvents('hub/+/event', this.handleHubEvent.bind(this));
    await mqttClient.subscribeToEvents('hub/register', this.handleHubRegistration.bind(this));
    await mqttClient.subscribeToEvents('device/+/state', this.handleDeviceState.bind(this));

    this.initialized = true;
    logger.info('Hub event handler initialized');
  }

  /**
   * Handle hub registration
   */
  private async handleHubRegistration(payload: any): Promise<void> {
    const { id, name, location, ipAddress, capabilities, status } = payload;

    logger.info({ hubId: id, name }, 'Hub registration via MQTT');

    try {
      // Check if hub exists
      const existing = await database.edgeHub.findUnique({
        where: { id },
      });

      if (existing) {
        // Update existing hub
        await database.edgeHub.update({
          where: { id },
          data: {
            name,
            location,
            ipAddress,
            capabilities,
            status: status || 'online',
            lastHeartbeat: new Date(),
          },
        });
        logger.info({ hubId: id }, 'Hub updated via MQTT');
      } else {
        // Create new hub
        await database.edgeHub.create({
          data: {
            id,
            name,
            location,
            ipAddress,
            capabilities,
            status: status || 'online',
            lastHeartbeat: new Date(),
          },
        });
        logger.info({ hubId: id }, 'Hub registered via MQTT');
      }
    } catch (error) {
      logger.error({ error, payload }, 'Failed to handle hub registration');
    }
  }

  /**
   * Handle hub heartbeat
   */
  private async handleHeartbeat(payload: any, topic: string): Promise<void> {
    // Extract hub ID from topic: hub/{hubId}/heartbeat
    const hubId = topic.split('/')[1];
    const { health } = payload;

    logger.debug({ hubId }, 'Heartbeat received via MQTT');

    try {
      // Update hub status
      await database.edgeHub.update({
        where: { id: hubId },
        data: {
          status: health?.status === 'healthy' || health?.status === 'degraded' ? 'online' : 'offline',
          lastHeartbeat: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error, hubId }, 'Failed to handle heartbeat');
    }
  }

  /**
   * Handle device discovery
   */
  private async handleDeviceDiscovered(payload: any, topic: string): Promise<void> {
    const hubId = topic.split('/')[1];
    logger.info({ deviceId: payload.id, hubId }, 'Device discovered via MQTT');

    try {
      // Check if device already exists
      const existing = await database.device.findUnique({
        where: { id: payload.id },
      });

      if (existing) {
        logger.debug({ deviceId: payload.id }, 'Device already exists');
        return;
      }

      // Create integration if it doesn't exist
      let integration = await database.integration.findFirst({
        where: {
          name: `${payload.protocol}-${hubId}`,
        },
      });

      if (!integration) {
        integration = await database.integration.create({
          data: {
            id: `integration-${payload.protocol}-${hubId}`,
            name: `${payload.protocol}-${hubId}`,
            type: payload.protocol as any,
            config: {},
            credentials: {},
            status: 'connected',
            enabled: true,
          },
        });
      }

      // Create new device
      await database.device.create({
        data: {
          id: payload.id,
          name: payload.name,
          type: payload.type as any,
          status: 'online',
          integrationId: integration.id,
          edgeHubId: hubId,
          capabilities: payload.capabilities as any[],
          metadata: {
            ...payload.metadata,
            manufacturer: payload.manufacturer,
            model: payload.model,
            protocol: payload.protocol,
          },
        },
      });

      logger.info({ deviceId: payload.id, hubId }, 'Device created via MQTT');

      // Publish event for other services
      await mqttClient.publishEvent('device.discovered', {
        deviceId: payload.id,
        hubId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, payload }, 'Failed to handle device discovery');
    }
  }

  /**
   * Handle device state updates
   */
  private async handleDeviceState(payload: any, topic: string): Promise<void> {
    // Extract device ID from topic: device/{deviceId}/state
    const deviceId = topic.split('/')[1];
    const { hubId, state } = payload;

    logger.debug({ deviceId, hubId }, 'Device state update via MQTT');

    try {
      // Update device state
      await database.deviceState.create({
        data: {
          id: `state-${deviceId}-${Date.now()}`,
          deviceId,
          state,
          timestamp: new Date(),
        },
      });

      // Publish event for other services
      await mqttClient.publishEvent('device.stateChanged', {
        deviceId,
        hubId,
        state,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, deviceId }, 'Failed to handle device state');
    }
  }

  /**
   * Handle generic hub events
   */
  private async handleHubEvent(payload: any, topic: string): Promise<void> {
    const hubId = topic.split('/')[1];
    const { eventType, data } = payload;

    logger.info({ hubId, eventType }, 'Hub event received via MQTT');

    // Handle specific event types
    switch (eventType) {
      case 'health_degraded':
        logger.warn({ hubId, health: data }, 'Hub health degraded');
        // Could create an alert here
        break;

      case 'device_removed':
        logger.info({ hubId, deviceId: data.deviceId }, 'Device removed');
        try {
          await database.device.update({
            where: { id: data.deviceId },
            data: { status: 'offline' },
          });
        } catch (error) {
          logger.error({ error }, 'Failed to mark device as offline');
        }
        break;

      default:
        logger.debug({ hubId, eventType, data }, 'Unhandled hub event');
    }
  }

  /**
   * Shutdown handler
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down hub event handler');
    this.initialized = false;
  }
}

export const hubEventHandler = new HubEventHandler();
