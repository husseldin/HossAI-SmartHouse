/**
 * Validation schemas using Zod
 */

import { z } from 'zod';
import {
  UserRole,
  DeviceType,
  DeviceStatus,
  DeviceCapability,
  IntegrationType,
  NetworkDeviceType,
  ScanType,
  ScanStatus,
  TriggerType,
  ActionType,
  ConditionOperator,
  AlertType,
  VulnerabilitySeverity,
} from './types';

// =================================================================
// USER SCHEMAS
// =================================================================

export const userRoleSchema = z.nativeEnum(UserRole);

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: userRoleSchema.optional().default(UserRole.USER),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// =================================================================
// DEVICE SCHEMAS
// =================================================================

export const deviceTypeSchema = z.nativeEnum(DeviceType);
export const deviceStatusSchema = z.nativeEnum(DeviceStatus);
export const deviceCapabilitySchema = z.nativeEnum(DeviceCapability);

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: deviceTypeSchema,
  integrationId: z.string().uuid(),
  edgeHubId: z.string().uuid().optional(),
  capabilities: z.array(deviceCapabilitySchema),
  metadata: z.record(z.any()).optional().default({}),
  room: z.string().optional(),
  floor: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const updateDeviceSchema = createDeviceSchema.partial();

export const deviceControlSchema = z.object({
  capability: deviceCapabilitySchema,
  value: z.any(),
  reason: z.string().optional(),
});

// =================================================================
// INTEGRATION SCHEMAS
// =================================================================

export const integrationTypeSchema = z.nativeEnum(IntegrationType);

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  type: integrationTypeSchema,
  protocol: z.string(),
  config: z.record(z.any()),
  credentials: z.record(z.any()).optional(),
  enabled: z.boolean().optional().default(true),
});

export const updateIntegrationSchema = createIntegrationSchema.partial();

// =================================================================
// NETWORK SCHEMAS
// =================================================================

export const networkDeviceTypeSchema = z.nativeEnum(NetworkDeviceType);
export const scanTypeSchema = z.nativeEnum(ScanType);
export const scanStatusSchema = z.nativeEnum(ScanStatus);

export const ipAddressSchema = z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/);
export const cidrSchema = z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/);
export const macAddressSchema = z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/);

export const createNetworkDeviceSchema = z.object({
  ipAddress: ipAddressSchema,
  macAddress: macAddressSchema,
  hostname: z.string().optional(),
  vendor: z.string().optional(),
  deviceType: networkDeviceTypeSchema.optional().default(NetworkDeviceType.UNKNOWN),
  metadata: z.record(z.any()).optional().default({}),
});

export const createScanJobSchema = z.object({
  scanType: scanTypeSchema,
  targets: z.array(z.union([ipAddressSchema, cidrSchema])),
  config: z.record(z.any()).optional(),
});

// =================================================================
// SECURITY SCHEMAS
// =================================================================

export const vulnerabilitySeveritySchema = z.nativeEnum(VulnerabilitySeverity);
export const alertTypeSchema = z.nativeEnum(AlertType);

export const createAlertSchema = z.object({
  type: alertTypeSchema,
  severity: vulnerabilitySeveritySchema,
  source: z.string(),
  sourceId: z.string().uuid(),
  message: z.string(),
  details: z.record(z.any()).optional().default({}),
});

// =================================================================
// AUTOMATION SCHEMAS
// =================================================================

export const triggerTypeSchema = z.nativeEnum(TriggerType);
export const actionTypeSchema = z.nativeEnum(ActionType);
export const conditionOperatorSchema = z.nativeEnum(ConditionOperator);

export const automationTriggerSchema = z.object({
  type: triggerTypeSchema,
  config: z.record(z.any()),
});

export const automationConditionSchema = z.object({
  operator: conditionOperatorSchema,
  config: z.record(z.any()),
});

export const automationActionSchema = z.object({
  type: actionTypeSchema,
  config: z.record(z.any()),
});

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  trigger: automationTriggerSchema,
  conditions: z.array(automationConditionSchema).optional(),
  actions: z.array(automationActionSchema).min(1),
});

export const updateAutomationRuleSchema = createAutomationRuleSchema.partial();

// =================================================================
// PAGINATION & FILTERING
// =================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const filterSchema = z.record(z.any()).optional();

// =================================================================
// QUERY SCHEMAS
// =================================================================

export const deviceQuerySchema = paginationSchema.extend({
  type: deviceTypeSchema.optional(),
  status: deviceStatusSchema.optional(),
  room: z.string().optional(),
  floor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

export const networkDeviceQuerySchema = paginationSchema.extend({
  deviceType: networkDeviceTypeSchema.optional(),
  status: z.enum(['online', 'offline']).optional(),
  search: z.string().optional(),
});

export const scanJobQuerySchema = paginationSchema.extend({
  scanType: scanTypeSchema.optional(),
  status: scanStatusSchema.optional(),
});

export const alertQuerySchema = paginationSchema.extend({
  type: alertTypeSchema.optional(),
  severity: vulnerabilitySeveritySchema.optional(),
  acknowledged: z.coerce.boolean().optional(),
});
