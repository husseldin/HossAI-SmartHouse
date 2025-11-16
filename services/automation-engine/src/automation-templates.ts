/**
 * Automation Templates
 * Pre-built automation scenarios that users can easily customize
 */

import { FlowDefinition } from './advanced-executor';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'comfort' | 'energy' | 'convenience' | 'safety';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  flow: FlowDefinition;
  variables: {
    name: string;
    description: string;
    type: 'device' | 'time' | 'number' | 'string' | 'boolean';
    default?: any;
    required: boolean;
  }[];
}

export const automationTemplates: AutomationTemplate[] = [
  // Security Templates
  {
    id: 'motion-light-security',
    name: 'Motion-Activated Security Lights',
    description: 'Turn on lights when motion is detected at night',
    category: 'security',
    difficulty: 'beginner',
    variables: [
      {
        name: 'motion_sensor',
        description: 'Motion sensor device',
        type: 'device',
        required: true,
      },
      {
        name: 'light',
        description: 'Light to turn on',
        type: 'device',
        required: true,
      },
      {
        name: 'start_time',
        description: 'Start time (24h format)',
        type: 'time',
        default: '20:00',
        required: false,
      },
      {
        name: 'end_time',
        description: 'End time (24h format)',
        type: 'time',
        default: '06:00',
        required: false,
      },
    ],
    flow: {
      id: 'motion-light-security',
      name: 'Motion-Activated Security Lights',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'state',
            entity: '{{motion_sensor}}',
            attribute: 'motion',
            value: 'detected',
          },
          next: ['condition-1'],
        },
        {
          id: 'condition-1',
          type: 'condition',
          config: {
            operator: 'and',
            conditions: [
              {
                type: 'time',
                after: '{{start_time}}',
                before: '{{end_time}}',
              },
            ],
          },
          next: ['action-1'],
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'device_control',
            target: '{{light}}',
            params: { type: 'power', value: 'ON' },
          },
          next: ['delay-1'],
        },
        {
          id: 'delay-1',
          type: 'delay',
          config: {
            duration: 300000, // 5 minutes
          },
          next: ['action-2'],
        },
        {
          id: 'action-2',
          type: 'action',
          config: {
            actionType: 'device_control',
            target: '{{light}}',
            params: { type: 'power', value: 'OFF' },
          },
        },
      ],
    },
  },

  {
    id: 'door-alert',
    name: 'Door Open Alert',
    description: 'Notify when door is left open for too long',
    category: 'security',
    difficulty: 'beginner',
    variables: [
      {
        name: 'door_sensor',
        description: 'Door sensor device',
        type: 'device',
        required: true,
      },
      {
        name: 'delay_minutes',
        description: 'Minutes before alert',
        type: 'number',
        default: 5,
        required: false,
      },
    ],
    flow: {
      id: 'door-alert',
      name: 'Door Open Alert',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'state',
            entity: '{{door_sensor}}',
            attribute: 'contact',
            value: 'open',
          },
          next: ['delay-1'],
        },
        {
          id: 'delay-1',
          type: 'delay',
          config: {
            duration: '{{delay_minutes * 60000}}', // Convert to ms
          },
          next: ['condition-1'],
        },
        {
          id: 'condition-1',
          type: 'condition',
          config: {
            operator: 'and',
            conditions: [
              {
                type: 'state',
                entity: '{{door_sensor}}',
                attribute: 'contact',
                operator: 'equals',
                value: 'open',
              },
            ],
          },
          next: ['action-1'],
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'notification',
            params: {
              title: 'Door Left Open',
              message: 'The door has been left open for {{delay_minutes}} minutes',
              priority: 'high',
            },
          },
        },
      ],
    },
  },

  // Comfort Templates
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Gradually brighten lights and adjust temperature in the morning',
    category: 'comfort',
    difficulty: 'intermediate',
    variables: [
      {
        name: 'bedroom_light',
        description: 'Bedroom light',
        type: 'device',
        required: true,
      },
      {
        name: 'thermostat',
        description: 'Thermostat',
        type: 'device',
        required: false,
      },
      {
        name: 'wake_time',
        description: 'Wake up time',
        type: 'time',
        default: '07:00',
        required: true,
      },
      {
        name: 'target_temp',
        description: 'Target temperature',
        type: 'number',
        default: 22,
        required: false,
      },
    ],
    flow: {
      id: 'morning-routine',
      name: 'Morning Routine',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'time',
            time: '{{wake_time}}',
          },
          next: ['action-1', 'action-2'],
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'device_control',
            target: '{{bedroom_light}}',
            params: { type: 'brightness', value: 10 },
          },
          next: ['delay-1'],
        },
        {
          id: 'delay-1',
          type: 'delay',
          config: {
            duration: 60000, // 1 minute
          },
          next: ['action-3'],
        },
        {
          id: 'action-3',
          type: 'action',
          config: {
            actionType: 'device_control',
            target: '{{bedroom_light}}',
            params: { type: 'brightness', value: 50 },
          },
          next: ['delay-2'],
        },
        {
          id: 'delay-2',
          type: 'delay',
          config: {
            duration: 120000, // 2 minutes
          },
          next: ['action-4'],
        },
        {
          id: 'action-4',
          type: 'action',
          config: {
            actionType: 'device_control',
            target: '{{bedroom_light}}',
            params: { type: 'brightness', value: 100 },
          },
        },
        {
          id: 'action-2',
          type: 'action',
          config: {
            actionType: 'device_control',
            target: '{{thermostat}}',
            params: { type: 'temperature', value: '{{target_temp}}' },
          },
        },
      ],
    },
  },

  {
    id: 'goodnight-scene',
    name: 'Goodnight Scene',
    description: 'Turn off all lights and lock doors at bedtime',
    category: 'convenience',
    difficulty: 'beginner',
    variables: [
      {
        name: 'bedtime',
        description: 'Bedtime',
        type: 'time',
        default: '22:30',
        required: true,
      },
    ],
    flow: {
      id: 'goodnight-scene',
      name: 'Goodnight Scene',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'time',
            time: '{{bedtime}}',
          },
          next: ['action-1', 'action-2', 'action-3'],
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'script',
            params: {
              script: 'turn_off_all_lights',
            },
          },
        },
        {
          id: 'action-2',
          type: 'action',
          config: {
            actionType: 'script',
            params: {
              script: 'lock_all_doors',
            },
          },
        },
        {
          id: 'action-3',
          type: 'action',
          config: {
            actionType: 'notification',
            params: {
              title: 'Goodnight',
              message: 'All lights off and doors locked',
              priority: 'normal',
            },
          },
        },
      ],
    },
  },

  // Energy Templates
  {
    id: 'away-mode',
    name: 'Away Mode Energy Saver',
    description: 'Turn off devices when everyone leaves home',
    category: 'energy',
    difficulty: 'intermediate',
    variables: [
      {
        name: 'presence_sensor',
        description: 'Presence sensor',
        type: 'device',
        required: true,
      },
      {
        name: 'delay_minutes',
        description: 'Delay before turning off (minutes)',
        type: 'number',
        default: 10,
        required: false,
      },
    ],
    flow: {
      id: 'away-mode',
      name: 'Away Mode Energy Saver',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'state',
            entity: '{{presence_sensor}}',
            attribute: 'presence',
            value: 'away',
          },
          next: ['delay-1'],
        },
        {
          id: 'delay-1',
          type: 'delay',
          config: {
            duration: '{{delay_minutes * 60000}}',
          },
          next: ['condition-1'],
        },
        {
          id: 'condition-1',
          type: 'condition',
          config: {
            operator: 'and',
            conditions: [
              {
                type: 'state',
                entity: '{{presence_sensor}}',
                attribute: 'presence',
                operator: 'equals',
                value: 'away',
              },
            ],
          },
          next: ['action-1', 'action-2'],
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'script',
            params: {
              script: 'turn_off_all_lights',
            },
          },
        },
        {
          id: 'action-2',
          type: 'action',
          config: {
            actionType: 'script',
            params: {
              script: 'set_thermostat_eco_mode',
            },
          },
        },
      ],
    },
  },

  // Safety Templates
  {
    id: 'smoke-alarm',
    name: 'Smoke Alarm Response',
    description: 'Turn on all lights and unlock doors when smoke detected',
    category: 'safety',
    difficulty: 'advanced',
    variables: [
      {
        name: 'smoke_detector',
        description: 'Smoke detector',
        type: 'device',
        required: true,
      },
    ],
    flow: {
      id: 'smoke-alarm',
      name: 'Smoke Alarm Response',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'state',
            entity: '{{smoke_detector}}',
            attribute: 'smoke',
            value: 'detected',
          },
          next: ['action-1', 'action-2', 'action-3'],
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'script',
            params: {
              script: 'turn_on_all_lights',
            },
          },
        },
        {
          id: 'action-2',
          type: 'action',
          config: {
            actionType: 'script',
            params: {
              script: 'unlock_all_doors',
            },
          },
        },
        {
          id: 'action-3',
          type: 'action',
          config: {
            actionType: 'notification',
            params: {
              title: 'EMERGENCY: Smoke Detected',
              message: 'Smoke alarm triggered! All lights on and doors unlocked.',
              priority: 'critical',
            },
          },
        },
      ],
    },
  },

  {
    id: 'temperature-alert',
    name: 'Temperature Alert',
    description: 'Alert when temperature goes outside safe range',
    category: 'safety',
    difficulty: 'beginner',
    variables: [
      {
        name: 'temperature_sensor',
        description: 'Temperature sensor',
        type: 'device',
        required: true,
      },
      {
        name: 'min_temp',
        description: 'Minimum safe temperature',
        type: 'number',
        default: 10,
        required: true,
      },
      {
        name: 'max_temp',
        description: 'Maximum safe temperature',
        type: 'number',
        default: 30,
        required: true,
      },
    ],
    flow: {
      id: 'temperature-alert',
      name: 'Temperature Alert',
      enabled: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            triggerType: 'state',
            entity: '{{temperature_sensor}}',
            attribute: 'temperature',
            numeric: true,
          },
          next: ['branch-1'],
        },
        {
          id: 'branch-1',
          type: 'branch',
          config: {
            condition: {
              type: 'numeric',
              entity: '{{temperature_sensor}}',
              attribute: 'temperature',
              operator: 'less_than',
              value: '{{min_temp}}',
            },
            trueBranch: 'action-1',
            falseBranch: 'branch-2',
          },
        },
        {
          id: 'branch-2',
          type: 'branch',
          config: {
            condition: {
              type: 'numeric',
              entity: '{{temperature_sensor}}',
              attribute: 'temperature',
              operator: 'greater_than',
              value: '{{max_temp}}',
            },
            trueBranch: 'action-2',
          },
        },
        {
          id: 'action-1',
          type: 'action',
          config: {
            actionType: 'notification',
            params: {
              title: 'Temperature Too Low',
              message: 'Temperature has dropped below {{min_temp}}°C',
              priority: 'high',
            },
          },
        },
        {
          id: 'action-2',
          type: 'action',
          config: {
            actionType: 'notification',
            params: {
              title: 'Temperature Too High',
              message: 'Temperature has risen above {{max_temp}}°C',
              priority: 'high',
            },
          },
        },
      ],
    },
  },
];

/**
 * Get all templates
 */
export function getAllTemplates(): AutomationTemplate[] {
  return automationTemplates;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: 'security' | 'comfort' | 'energy' | 'convenience' | 'safety'
): AutomationTemplate[] {
  return automationTemplates.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AutomationTemplate | undefined {
  return automationTemplates.find((t) => t.id === id);
}

/**
 * Apply template with variables
 */
export function applyTemplate(
  templateId: string,
  variables: Record<string, any>
): FlowDefinition | null {
  const template = getTemplateById(templateId);
  if (!template) return null;

  // Clone the flow
  const flow = JSON.parse(JSON.stringify(template.flow));

  // Replace variables in the flow
  const flowString = JSON.stringify(flow);
  let replacedString = flowString;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    replacedString = replacedString.replace(regex, String(value));
  }

  return JSON.parse(replacedString);
}
