/**
 * Agent API Routes - LLM-friendly endpoints
 * Designed for AI assistants, voice control, and conversational interfaces
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { database, createLogger } from '@smart-home/shared';
import { authMiddleware, requireRole } from '../middleware/auth';
import axios from 'axios';

const logger = createLogger('agent-api');

interface NaturalLanguageQuery {
  query: string;
  context?: Record<string, any>;
}

interface DeviceAction {
  device?: string; // Device name or ID
  action: string; // "turn on", "set brightness", "lock", etc.
  parameters?: Record<string, any>;
}

interface SceneAction {
  scene: string;
  action: 'activate' | 'deactivate';
}

export async function agentRoutes(app: FastifyInstance) {
  /**
   * Natural Language Query
   * POST /api/agent/query
   *
   * Accepts natural language queries and returns structured responses
   *
   * Examples:
   * - "What devices are currently on?"
   * - "Show me all lights in the living room"
   * - "What's the temperature in the bedroom?"
   * - "List all offline devices"
   */
  app.post<{ Body: NaturalLanguageQuery }>(
    '/agent/query',
    {
      preHandler: [authMiddleware, requireRole('agent')],
    },
    async (request, reply) => {
      const { query, context } = request.body;

      logger.info({ query, context }, 'Processing natural language query');

      try {
        // Parse the query intent
        const intent = await parseQueryIntent(query);

        logger.debug({ intent }, 'Query intent parsed');

        // Route to appropriate handler
        let result;
        switch (intent.type) {
          case 'device_status':
            result = await handleDeviceStatusQuery(intent);
            break;

          case 'device_list':
            result = await handleDeviceListQuery(intent);
            break;

          case 'sensor_reading':
            result = await handleSensorReadingQuery(intent);
            break;

          case 'automation_status':
            result = await handleAutomationStatusQuery(intent);
            break;

          case 'system_status':
            result = await handleSystemStatusQuery(intent);
            break;

          default:
            result = {
              success: false,
              message: 'I did not understand that query. Please try rephrasing.',
            };
        }

        return result;
      } catch (error: any) {
        logger.error({ error, query }, 'Failed to process query');
        return reply.code(500).send({
          success: false,
          message: 'Failed to process your query',
          error: error.message,
        });
      }
    }
  );

  /**
   * Execute Device Action
   * POST /api/agent/action
   *
   * Execute actions using natural language
   *
   * Examples:
   * {
   *   "device": "living room light",
   *   "action": "turn on"
   * }
   * {
   *   "device": "bedroom light",
   *   "action": "set brightness",
   *   "parameters": { "brightness": 50 }
   * }
   */
  app.post<{ Body: DeviceAction }>(
    '/agent/action',
    {
      preHandler: [authMiddleware, requireRole('agent')],
    },
    async (request, reply) => {
      const { device, action, parameters } = request.body;

      logger.info({ device, action, parameters }, 'Executing device action');

      try {
        // Find the device by name or ID
        const deviceRecord = await findDevice(device);

        if (!deviceRecord) {
          return reply.code(404).send({
            success: false,
            message: `Device "${device}" not found`,
          });
        }

        // Parse the action
        const command = parseAction(action, parameters);

        // Execute the action via device service
        const response = await axios.post(
          `http://device-service:8001/devices/${deviceRecord.id}/control`,
          command
        );

        return {
          success: true,
          message: `Successfully executed "${action}" on "${deviceRecord.name}"`,
          device: deviceRecord.name,
          result: response.data,
        };
      } catch (error: any) {
        logger.error({ error, device, action }, 'Failed to execute action');
        return reply.code(500).send({
          success: false,
          message: 'Failed to execute action',
          error: error.message,
        });
      }
    }
  );

  /**
   * Get Context (for LLM)
   * GET /api/agent/context
   *
   * Returns current system context for LLM to understand state
   */
  app.get(
    '/agent/context',
    {
      preHandler: [authMiddleware, requireRole('agent')],
    },
    async (request, reply) => {
      try {
        // Get summary of system state
        const [devices, alerts, automations, hubs] = await Promise.all([
          database.device.findMany({
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              room: true,
              floor: true,
            },
          }),
          database.alert.findMany({
            where: { acknowledged: false },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          database.automationRule.findMany({
            where: { enabled: true },
            select: {
              id: true,
              name: true,
              description: true,
            },
          }),
          database.edgeHub.findMany({
            select: {
              id: true,
              name: true,
              status: true,
              location: true,
            },
          }),
        ]);

        // Get device stats
        const deviceStats = await database.device.groupBy({
          by: ['status'],
          _count: true,
        });

        return {
          timestamp: new Date().toISOString(),
          devices: {
            total: devices.length,
            byStatus: deviceStats.reduce(
              (acc, stat) => {
                acc[stat.status] = stat._count;
                return acc;
              },
              {} as Record<string, number>
            ),
            list: devices,
          },
          alerts: {
            total: alerts.length,
            recent: alerts,
          },
          automations: {
            total: automations.length,
            enabled: automations,
          },
          hubs: {
            total: hubs.length,
            list: hubs,
          },
        };
      } catch (error: any) {
        logger.error({ error }, 'Failed to get context');
        return reply.code(500).send({
          error: 'Failed to get system context',
        });
      }
    }
  );

  /**
   * Create Automation from Natural Language
   * POST /api/agent/automation/create
   *
   * Create automation rules using natural language descriptions
   *
   * Example:
   * {
   *   "description": "Turn on the living room lights when motion is detected after sunset"
   * }
   */
  app.post<{ Body: { description: string } }>(
    '/agent/automation/create',
    {
      preHandler: [authMiddleware, requireRole('agent')],
    },
    async (request, reply) => {
      const { description } = request.body;

      logger.info({ description }, 'Creating automation from natural language');

      try {
        // Parse automation description (simplified - in production use NLP)
        const automation = parseAutomationDescription(description);

        // Create automation rule
        const rule = await database.automationRule.create({
          data: {
            id: `auto-${Date.now()}`,
            name: automation.name,
            description: description,
            trigger: automation.trigger as any,
            conditions: automation.conditions as any,
            actions: automation.actions as any,
            enabled: true,
            createdBy: 'agent',
          },
        });

        return {
          success: true,
          message: 'Automation created successfully',
          automation: rule,
        };
      } catch (error: any) {
        logger.error({ error, description }, 'Failed to create automation');
        return reply.code(500).send({
          success: false,
          message: 'Failed to create automation',
          error: error.message,
        });
      }
    }
  );

  /**
   * List Available Actions
   * GET /api/agent/actions
   *
   * Returns list of all available actions for LLM to choose from
   */
  app.get(
    '/agent/actions',
    {
      preHandler: [authMiddleware, requireRole('agent')],
    },
    async (request, reply) => {
      return {
        deviceActions: [
          {
            action: 'turn_on',
            description: 'Turn on a device (lights, switches, plugs)',
            parameters: [],
          },
          {
            action: 'turn_off',
            description: 'Turn off a device',
            parameters: [],
          },
          {
            action: 'set_brightness',
            description: 'Set brightness of a light (0-100)',
            parameters: [{ name: 'brightness', type: 'number', min: 0, max: 100 }],
          },
          {
            action: 'set_temperature',
            description: 'Set thermostat temperature',
            parameters: [{ name: 'temperature', type: 'number', min: 10, max: 30 }],
          },
          {
            action: 'lock',
            description: 'Lock a door lock',
            parameters: [],
          },
          {
            action: 'unlock',
            description: 'Unlock a door lock',
            parameters: [],
          },
        ],
        queryTypes: [
          'device_status',
          'device_list',
          'sensor_reading',
          'automation_status',
          'system_status',
        ],
        supportedDeviceTypes: [
          'light',
          'switch',
          'plug',
          'sensor',
          'thermostat',
          'lock',
          'camera',
          'speaker',
        ],
      };
    }
  );
}

// Helper functions

/**
 * Parse natural language query to extract intent
 */
async function parseQueryIntent(query: string): Promise<any> {
  const lowerQuery = query.toLowerCase();

  // Simple keyword-based intent detection
  // In production, use proper NLP or LLM for intent classification

  if (
    lowerQuery.includes('what') &&
    (lowerQuery.includes('on') || lowerQuery.includes('off') || lowerQuery.includes('status'))
  ) {
    return { type: 'device_status', query };
  }

  if (lowerQuery.includes('list') || lowerQuery.includes('show me') || lowerQuery.includes('all')) {
    return { type: 'device_list', query };
  }

  if (
    lowerQuery.includes('temperature') ||
    lowerQuery.includes('humidity') ||
    lowerQuery.includes('reading')
  ) {
    return { type: 'sensor_reading', query };
  }

  if (lowerQuery.includes('automation') || lowerQuery.includes('rule')) {
    return { type: 'automation_status', query };
  }

  if (lowerQuery.includes('system') || lowerQuery.includes('overall')) {
    return { type: 'system_status', query };
  }

  return { type: 'unknown', query };
}

/**
 * Handle device status query
 */
async function handleDeviceStatusQuery(intent: any): Promise<any> {
  const devices = await database.device.findMany({
    where: { status: 'online' },
  });

  const onDevices = await database.deviceState.findMany({
    where: {
      deviceId: { in: devices.map((d) => d.id) },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['deviceId'],
  });

  const onDeviceIds = onDevices
    .filter((ds) => ds.state.power === 'ON' || ds.state.power === true)
    .map((ds) => ds.deviceId);

  const onDevicesList = devices.filter((d) => onDeviceIds.includes(d.id));

  return {
    success: true,
    message: `There are ${onDevicesList.length} devices currently on`,
    devices: onDevicesList.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      room: d.room,
    })),
  };
}

/**
 * Handle device list query
 */
async function handleDeviceListQuery(intent: any): Promise<any> {
  const devices = await database.device.findMany({
    orderBy: { name: 'asc' },
  });

  return {
    success: true,
    message: `Found ${devices.length} devices`,
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      status: d.status,
      room: d.room,
      floor: d.floor,
    })),
  };
}

/**
 * Handle sensor reading query
 */
async function handleSensorReadingQuery(intent: any): Promise<any> {
  const sensors = await database.device.findMany({
    where: { type: 'sensor' },
  });

  const readings = await database.deviceState.findMany({
    where: {
      deviceId: { in: sensors.map((s) => s.id) },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['deviceId'],
  });

  return {
    success: true,
    message: `Found ${readings.length} sensor readings`,
    sensors: readings.map((r) => {
      const sensor = sensors.find((s) => s.id === r.deviceId);
      return {
        id: r.deviceId,
        name: sensor?.name,
        room: sensor?.room,
        readings: r.state,
        timestamp: r.timestamp,
      };
    }),
  };
}

/**
 * Handle automation status query
 */
async function handleAutomationStatusQuery(intent: any): Promise<any> {
  const automations = await database.automationRule.findMany({
    orderBy: { name: 'asc' },
  });

  return {
    success: true,
    message: `Found ${automations.length} automation rules`,
    automations: automations.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      enabled: a.enabled,
    })),
  };
}

/**
 * Handle system status query
 */
async function handleSystemStatusQuery(intent: any): Promise<any> {
  const [deviceCount, onlineDevices, alerts, automations] = await Promise.all([
    database.device.count(),
    database.device.count({ where: { status: 'online' } }),
    database.alert.count({ where: { acknowledged: false } }),
    database.automationRule.count({ where: { enabled: true } }),
  ]);

  return {
    success: true,
    message: 'System status retrieved',
    status: {
      devices: {
        total: deviceCount,
        online: onlineDevices,
        offline: deviceCount - onlineDevices,
      },
      alerts: {
        unacknowledged: alerts,
      },
      automations: {
        enabled: automations,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Find device by name or ID
 */
async function findDevice(deviceIdentifier: string | undefined): Promise<any> {
  if (!deviceIdentifier) return null;

  // Try to find by ID first
  let device = await database.device.findUnique({
    where: { id: deviceIdentifier },
  });

  if (device) return device;

  // Try to find by name (case-insensitive partial match)
  const devices = await database.device.findMany();
  device = devices.find((d) => d.name.toLowerCase().includes(deviceIdentifier.toLowerCase()));

  return device || null;
}

/**
 * Parse action into device command
 */
function parseAction(action: string, parameters?: Record<string, any>): any {
  const lowerAction = action.toLowerCase();

  if (lowerAction.includes('turn on') || lowerAction === 'on') {
    return { type: 'power', value: 'ON' };
  }

  if (lowerAction.includes('turn off') || lowerAction === 'off') {
    return { type: 'power', value: 'OFF' };
  }

  if (lowerAction.includes('brightness') || lowerAction.includes('dim')) {
    return { type: 'brightness', value: parameters?.brightness || 50 };
  }

  if (lowerAction.includes('temperature')) {
    return { type: 'temperature', value: parameters?.temperature || 22 };
  }

  if (lowerAction.includes('lock')) {
    return { type: 'lock', value: true };
  }

  if (lowerAction.includes('unlock')) {
    return { type: 'lock', value: false };
  }

  // Default: treat as custom command
  return { type: 'custom', action, parameters };
}

/**
 * Parse automation description into structured automation
 */
function parseAutomationDescription(description: string): any {
  // Simplified parser - in production use NLP or LLM
  const lowerDesc = description.toLowerCase();

  let trigger = {};
  let conditions = [];
  let actions = [];

  // Extract trigger
  if (lowerDesc.includes('motion')) {
    trigger = { type: 'state', entity: 'motion_sensor', state: 'detected' };
  } else if (lowerDesc.includes('door')) {
    trigger = { type: 'state', entity: 'door_sensor', state: 'open' };
  } else if (lowerDesc.includes('time') || lowerDesc.includes('at ')) {
    trigger = { type: 'time', time: '20:00' }; // Default
  }

  // Extract conditions
  if (lowerDesc.includes('after sunset') || lowerDesc.includes('after dark')) {
    conditions.push({ type: 'sun', event: 'sunset' });
  }

  if (lowerDesc.includes('when home') || lowerDesc.includes('if home')) {
    conditions.push({ type: 'presence', state: 'home' });
  }

  // Extract actions
  if (lowerDesc.includes('turn on')) {
    actions.push({ type: 'device_control', device: 'light', command: { power: 'ON' } });
  }

  if (lowerDesc.includes('turn off')) {
    actions.push({ type: 'device_control', device: 'light', command: { power: 'OFF' } });
  }

  if (lowerDesc.includes('notify') || lowerDesc.includes('alert')) {
    actions.push({ type: 'notification', message: 'Automation triggered' });
  }

  return {
    name: description.substring(0, 50),
    trigger,
    conditions,
    actions,
  };
}
