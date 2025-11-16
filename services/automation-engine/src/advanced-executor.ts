/**
 * Advanced Automation Executor
 * Handles complex conditions, multi-step actions, and context passing
 */

import { createLogger, getPrismaClient, getMqttClient } from '@smart-home/shared';
import { EventEmitter } from 'events';

const logger = createLogger('automation-executor');
const db = getPrismaClient();
const mqtt = getMqttClient();

export interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'branch';
  config: Record<string, any>;
  next?: string[]; // Next node IDs
}

export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  variables?: Record<string, any>;
  enabled: boolean;
}

export interface ExecutionContext {
  flowId: string;
  runId: string;
  variables: Record<string, any>;
  triggerData: any;
  timestamp: Date;
  history: ExecutionStep[];
}

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export class AdvancedAutomationExecutor extends EventEmitter {
  private activeExecutions: Map<string, ExecutionContext> = new Map();

  /**
   * Execute a flow
   */
  async executeFlow(flow: FlowDefinition, triggerData: any): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const context: ExecutionContext = {
      flowId: flow.id,
      runId,
      variables: { ...flow.variables },
      triggerData,
      timestamp: new Date(),
      history: [],
    };

    this.activeExecutions.set(runId, context);

    logger.info({ flowId: flow.id, runId }, 'Starting flow execution');

    try {
      // Find trigger nodes
      const triggerNodes = flow.nodes.filter((n) => n.type === 'trigger');

      if (triggerNodes.length === 0) {
        throw new Error('Flow has no trigger nodes');
      }

      // Execute from first trigger node
      const triggerNode = triggerNodes[0];
      await this.executeNode(flow, triggerNode, context);

      // Mark as successful
      this.emit('flowCompleted', { flowId: flow.id, runId, status: 'success' });
      logger.info({ flowId: flow.id, runId }, 'Flow execution completed');

      return runId;
    } catch (error: any) {
      logger.error({ error, flowId: flow.id, runId }, 'Flow execution failed');
      this.emit('flowFailed', { flowId: flow.id, runId, error: error.message });
      throw error;
    } finally {
      // Save execution history to database
      await this.saveExecutionHistory(context);
      this.activeExecutions.delete(runId);
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    flow: FlowDefinition,
    node: FlowNode,
    context: ExecutionContext
  ): Promise<void> {
    const step: ExecutionStep = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'running',
      startedAt: new Date(),
    };

    context.history.push(step);

    logger.debug({ nodeId: node.id, nodeType: node.type, runId: context.runId }, 'Executing node');

    try {
      let result: any;

      switch (node.type) {
        case 'trigger':
          result = await this.executeTrigger(node, context);
          break;

        case 'condition':
          result = await this.executeCondition(node, context);
          break;

        case 'action':
          result = await this.executeAction(node, context);
          break;

        case 'delay':
          result = await this.executeDelay(node, context);
          break;

        case 'branch':
          result = await this.executeBranch(node, context);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      step.status = 'success';
      step.completedAt = new Date();
      step.result = result;

      // Execute next nodes
      if (node.next && node.next.length > 0) {
        for (const nextNodeId of node.next) {
          const nextNode = flow.nodes.find((n) => n.id === nextNodeId);
          if (nextNode) {
            await this.executeNode(flow, nextNode, context);
          } else {
            logger.warn({ nextNodeId, nodeId: node.id }, 'Next node not found');
          }
        }
      }
    } catch (error: any) {
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = error.message;
      throw error;
    }
  }

  /**
   * Execute trigger node
   */
  private async executeTrigger(node: FlowNode, context: ExecutionContext): Promise<any> {
    // Trigger is already fired, just pass through
    return { triggered: true, data: context.triggerData };
  }

  /**
   * Execute condition node (complex AND/OR logic)
   */
  private async executeCondition(node: FlowNode, context: ExecutionContext): Promise<boolean> {
    const { operator = 'and', conditions } = node.config;

    if (!conditions || conditions.length === 0) {
      return true;
    }

    const results = await Promise.all(
      conditions.map((cond: any) => this.evaluateCondition(cond, context))
    );

    if (operator === 'and') {
      return results.every((r) => r);
    } else if (operator === 'or') {
      return results.some((r) => r);
    }

    return false;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, context: ExecutionContext): Promise<boolean> {
    const { type, entity, attribute, operator, value } = condition;

    switch (type) {
      case 'state':
        return await this.evaluateStateCondition(entity, attribute, operator, value);

      case 'time':
        return this.evaluateTimeCondition(condition);

      case 'numeric':
        return this.evaluateNumericCondition(entity, attribute, operator, value);

      case 'template':
        return this.evaluateTemplateCondition(condition, context);

      default:
        logger.warn({ type }, 'Unknown condition type');
        return false;
    }
  }

  /**
   * Evaluate state condition
   */
  private async evaluateStateCondition(
    entityId: string,
    attribute: string,
    operator: string,
    value: any
  ): Promise<boolean> {
    try {
      // Get device state
      const deviceState = await db.deviceState.findFirst({
        where: { deviceId: entityId },
        orderBy: { timestamp: 'desc' },
      });

      if (!deviceState) {
        return false;
      }

      const currentValue = deviceState.state[attribute];

      switch (operator) {
        case 'equals':
          return currentValue === value;
        case 'not_equals':
          return currentValue !== value;
        case 'contains':
          return String(currentValue).includes(String(value));
        case 'greater_than':
          return Number(currentValue) > Number(value);
        case 'less_than':
          return Number(currentValue) < Number(value);
        default:
          return false;
      }
    } catch (error) {
      logger.error({ error, entityId }, 'Failed to evaluate state condition');
      return false;
    }
  }

  /**
   * Evaluate time condition
   */
  private evaluateTimeCondition(condition: any): boolean {
    const now = new Date();
    const { after, before, weekdays } = condition;

    // Check time range
    if (after) {
      const [afterHour, afterMin] = after.split(':').map(Number);
      const afterTime = new Date(now);
      afterTime.setHours(afterHour, afterMin, 0, 0);
      if (now < afterTime) return false;
    }

    if (before) {
      const [beforeHour, beforeMin] = before.split(':').map(Number);
      const beforeTime = new Date(now);
      beforeTime.setHours(beforeHour, beforeMin, 0, 0);
      if (now > beforeTime) return false;
    }

    // Check weekdays
    if (weekdays && weekdays.length > 0) {
      const dayOfWeek = now.getDay(); // 0-6
      if (!weekdays.includes(dayOfWeek)) return false;
    }

    return true;
  }

  /**
   * Evaluate numeric condition
   */
  private evaluateNumericCondition(
    entityId: string,
    attribute: string,
    operator: string,
    value: number
  ): boolean {
    // Similar to state condition but numeric-specific
    return true; // Simplified for now
  }

  /**
   * Evaluate template condition
   */
  private evaluateTemplateCondition(condition: any, context: ExecutionContext): boolean {
    // Template evaluation with variables
    const { template } = condition;
    // Simple template evaluation (in production, use a proper template engine)
    return true;
  }

  /**
   * Execute action node
   */
  private async executeAction(node: FlowNode, context: ExecutionContext): Promise<any> {
    const { actionType, target, params } = node.config;

    logger.info({ actionType, target, runId: context.runId }, 'Executing action');

    switch (actionType) {
      case 'device_control':
        return await this.executeDeviceControl(target, params);

      case 'notification':
        return await this.executeNotification(params);

      case 'http_request':
        return await this.executeHttpRequest(params);

      case 'mqtt_publish':
        return await this.executeMqttPublish(params);

      case 'script':
        return await this.executeScript(params, context);

      case 'set_variable':
        return this.executeSetVariable(params, context);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Execute device control action
   */
  private async executeDeviceControl(deviceId: string, params: any): Promise<any> {
    await mqtt.publishEvent('device.control', {
      deviceId,
      command: params,
      timestamp: new Date().toISOString(),
    });

    return { success: true, deviceId, params };
  }

  /**
   * Execute notification action
   */
  private async executeNotification(params: any): Promise<any> {
    const { title, message, priority = 'normal' } = params;

    // Publish notification event
    await mqtt.publishEvent('notification.send', {
      title,
      message,
      priority,
      timestamp: new Date().toISOString(),
    });

    return { success: true, notification: { title, message } };
  }

  /**
   * Execute HTTP request action
   */
  private async executeHttpRequest(params: any): Promise<any> {
    const { method, url, headers, body } = params;

    const axios = require('axios');
    const response = await axios({
      method,
      url,
      headers,
      data: body,
      timeout: 10000,
    });

    return { success: true, status: response.status, data: response.data };
  }

  /**
   * Execute MQTT publish action
   */
  private async executeMqttPublish(params: any): Promise<any> {
    const { topic, payload } = params;

    await mqtt.publishEvent(topic, payload);

    return { success: true, topic, payload };
  }

  /**
   * Execute script action
   */
  private async executeScript(params: any, context: ExecutionContext): Promise<any> {
    const { script } = params;

    // In production, use a safe script execution environment
    // For now, just log the script
    logger.info({ script, runId: context.runId }, 'Script execution (mock)');

    return { success: true, script };
  }

  /**
   * Set variable in context
   */
  private executeSetVariable(params: any, context: ExecutionContext): any {
    const { name, value } = params;
    context.variables[name] = value;
    return { success: true, name, value };
  }

  /**
   * Execute delay node
   */
  private async executeDelay(node: FlowNode, context: ExecutionContext): Promise<any> {
    const { duration } = node.config; // Duration in milliseconds

    logger.debug({ duration, runId: context.runId }, 'Delaying execution');

    await new Promise((resolve) => setTimeout(resolve, duration));

    return { delayed: duration };
  }

  /**
   * Execute branch node (if/else)
   */
  private async executeBranch(node: FlowNode, context: ExecutionContext): Promise<any> {
    const { condition, trueBranch, falseBranch } = node.config;

    const conditionResult = await this.evaluateCondition(condition, context);

    if (conditionResult && trueBranch) {
      logger.debug({ runId: context.runId }, 'Taking true branch');
      return { branch: 'true', condition: conditionResult };
    } else if (!conditionResult && falseBranch) {
      logger.debug({ runId: context.runId }, 'Taking false branch');
      return { branch: 'false', condition: conditionResult };
    }

    return { branch: 'none', condition: conditionResult };
  }

  /**
   * Save execution history to database
   */
  private async saveExecutionHistory(context: ExecutionContext): Promise<void> {
    try {
      const status = context.history.some((s) => s.status === 'failed') ? 'failed' : 'success';

      await db.automationRun.create({
        data: {
          id: context.runId,
          automationRuleId: context.flowId,
          status: status as any,
          startedAt: context.timestamp,
          completedAt: new Date(),
          output: {
            steps: context.history,
            variables: context.variables,
            triggerData: context.triggerData,
          },
        },
      });
    } catch (error) {
      logger.error({ error, runId: context.runId }, 'Failed to save execution history');
    }
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel execution
   */
  async cancelExecution(runId: string): Promise<void> {
    const context = this.activeExecutions.get(runId);
    if (context) {
      logger.info({ runId }, 'Cancelling execution');
      this.activeExecutions.delete(runId);
      this.emit('flowCancelled', { runId });
    }
  }
}

export const automationExecutor = new AdvancedAutomationExecutor();
