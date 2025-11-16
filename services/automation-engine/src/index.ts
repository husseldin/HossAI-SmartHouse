/**
 * Automation Engine - Rules and automation execution
 */

import Fastify from 'fastify';
import {
  createLogger,
  getPrismaClient,
  getMqttClient,
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
  ValidationError,
  NotFoundError,
  TriggerType,
  ActionType,
  AutomationRunStatus,
  EventType,
} from '@smart-home/shared';

const logger = createLogger('automation-engine');
const db = getPrismaClient();
const mqtt = getMqttClient();

const PORT = parseInt(process.env.AUTOMATION_ENGINE_PORT || '8004');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({ logger: false });

// List automation rules
server.get('/automations', async (request, reply) => {
  try {
    const { page = 1, pageSize = 20, enabled } = request.query as any;
    const skip = ((page as number) - 1) * (pageSize as number);

    const where: any = {};
    if (enabled !== undefined) where.enabled = enabled === 'true';

    const [rules, total] = await Promise.all([
      db.automationRule.findMany({
        where,
        skip,
        take: pageSize as number,
        orderBy: { createdAt: 'desc' },
      }),
      db.automationRule.count({ where }),
    ]);

    return {
      success: true,
      data: { items: rules, total, page, pageSize, hasMore: skip + rules.length < total },
    };
  } catch (error: any) {
    logger.error({ error }, 'Failed to list automation rules');
    return reply.status(500).send({ success: false, error: { code: 'LIST_AUTOMATIONS_FAILED', message: error.message } });
  }
});

// Get automation rule
server.get('/automations/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const rule = await db.automationRule.findUnique({
      where: { id },
      include: {
        automationRuns: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!rule) {
      throw new NotFoundError('Automation rule');
    }

    return { success: true, data: rule };
  } catch (error: any) {
    logger.error({ error }, 'Failed to get automation rule');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'GET_AUTOMATION_FAILED', message: error.message },
    });
  }
});

// Create automation rule
server.post('/automations', async (request, reply) => {
  try {
    const parsed = createAutomationRuleSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid automation rule data', parsed.error);
    }

    const rule = await db.automationRule.create({
      data: {
        ...parsed.data,
        createdBy: 'system', // TODO: Get from authenticated user
      } as any,
    });

    logger.info({ ruleId: rule.id, name: rule.name }, 'Automation rule created');

    return reply.status(201).send({ success: true, data: rule });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create automation rule');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'CREATE_AUTOMATION_FAILED', message: error.message },
    });
  }
});

// Update automation rule
server.patch('/automations/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const parsed = updateAutomationRuleSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid automation rule data', parsed.error);
    }

    const rule = await db.automationRule.update({
      where: { id },
      data: parsed.data as any,
    });

    logger.info({ ruleId: id }, 'Automation rule updated');

    return { success: true, data: rule };
  } catch (error: any) {
    logger.error({ error }, 'Failed to update automation rule');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'UPDATE_AUTOMATION_FAILED', message: error.message },
    });
  }
});

// Delete automation rule
server.delete('/automations/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    await db.automationRule.delete({ where: { id } });

    logger.info({ ruleId: id }, 'Automation rule deleted');

    return { success: true };
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete automation rule');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'DELETE_AUTOMATION_FAILED', message: error.message },
    });
  }
});

// Execute automation rule manually
server.post('/automations/:id/execute', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const rule = await db.automationRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundError('Automation rule');
    }

    await executeAutomation(rule, { manual: true });

    return { success: true, message: 'Automation executed' };
  } catch (error: any) {
    logger.error({ error }, 'Failed to execute automation');
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: error.code || 'EXECUTE_AUTOMATION_FAILED', message: error.message },
    });
  }
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'automation-engine', timestamp: new Date().toISOString() };
});

// Execute automation rule
async function executeAutomation(rule: any, triggerData: any = {}) {
  const runId = crypto.randomUUID();

  try {
    // Create automation run
    const run = await db.automationRun.create({
      data: {
        ruleId: rule.id,
        status: AutomationRunStatus.RUNNING,
        triggerData,
        actionsExecuted: [],
      },
    });

    // Publish trigger event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.AUTOMATION_TRIGGERED,
      source: 'automation-engine',
      sourceId: rule.id,
      payload: { ruleId: rule.id, runId: run.id, triggerData },
      timestamp: new Date(),
    });

    logger.info({ ruleId: rule.id, runId: run.id }, 'Executing automation rule');

    const actionsExecuted: any[] = [];

    // Execute actions (simplified for MVP)
    for (const action of rule.actions) {
      try {
        if (action.type === ActionType.DEVICE_CONTROL) {
          // Publish device control command
          await mqtt.publish(`devices/${action.config.deviceId}/command`, {
            capability: action.config.capability,
            value: action.config.value,
          });
        } else if (action.type === ActionType.NOTIFICATION) {
          // Create alert
          await db.alert.create({
            data: {
              type: 'automation_notification',
              severity: 'info',
              source: 'automation-engine',
              sourceId: rule.id,
              message: action.config.message,
              details: {},
            },
          });
        }

        actionsExecuted.push({
          type: action.type,
          config: action.config,
          success: true,
        });
      } catch (error: any) {
        logger.error({ error, action }, 'Action execution failed');
        actionsExecuted.push({
          type: action.type,
          config: action.config,
          success: false,
          error: error.message,
        });
      }
    }

    // Update run status
    await db.automationRun.update({
      where: { id: run.id },
      data: {
        status: AutomationRunStatus.COMPLETED,
        actionsExecuted,
        completedAt: new Date(),
      },
    });

    // Publish completion event
    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.AUTOMATION_COMPLETED,
      source: 'automation-engine',
      sourceId: rule.id,
      payload: { ruleId: rule.id, runId: run.id },
      timestamp: new Date(),
    });

    logger.info({ ruleId: rule.id, runId: run.id }, 'Automation rule executed successfully');
  } catch (error: any) {
    logger.error({ error, ruleId: rule.id }, 'Automation execution failed');

    await mqtt.publishEvent({
      id: crypto.randomUUID(),
      type: EventType.AUTOMATION_FAILED,
      source: 'automation-engine',
      sourceId: rule.id,
      payload: { ruleId: rule.id, error: error.message },
      timestamp: new Date(),
    });
  }
}

async function start() {
  try {
    await mqtt.connect();
    logger.info('Connected to MQTT broker');

    // Subscribe to events that may trigger automations
    await mqtt.subscribeToEvents('device.state.changed', async (event) => {
      // Find rules triggered by device state changes
      const rules = await db.automationRule.findMany({
        where: {
          enabled: true,
          trigger: {
            path: ['type'],
            equals: TriggerType.DEVICE_STATE,
          },
        },
      });

      for (const rule of rules) {
        // Simplified trigger matching (real implementation would be more sophisticated)
        await executeAutomation(rule, event.payload);
      }
    });

    await server.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT }, 'Automation Engine started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Automation Engine');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await mqtt.disconnect();
  await server.close();
  process.exit(0);
});

start();
