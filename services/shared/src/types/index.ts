/**
 * Shared types for Smart Home Platform
 */

// =================================================================
// USER & AUTHENTICATION
// =================================================================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  READONLY = 'readonly',
  AGENT = 'agent', // For LLM/AI agents
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
}

// =================================================================
// DEVICE TYPES
// =================================================================

export enum DeviceType {
  LIGHT = 'light',
  SWITCH = 'switch',
  PLUG = 'plug',
  SENSOR = 'sensor',
  THERMOSTAT = 'thermostat',
  CAMERA = 'camera',
  LOCK = 'lock',
  SPEAKER = 'speaker',
  CLIMATE = 'climate',
  COVER = 'cover', // Blinds, garage door, etc.
  FAN = 'fan',
  VACUUM = 'vacuum',
  MEDIA_PLAYER = 'media_player',
  UNKNOWN = 'unknown',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
}

export enum DeviceCapability {
  ON_OFF = 'on_off',
  BRIGHTNESS = 'brightness',
  COLOR = 'color',
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  MOTION = 'motion',
  CONTACT = 'contact',
  BATTERY = 'battery',
  LOCK = 'lock',
  VOLUME = 'volume',
  PLAYBACK = 'playback',
  POSITION = 'position', // For covers/blinds
  SPEED = 'speed', // For fans
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  integrationId: string;
  edgeHubId?: string;
  capabilities: DeviceCapability[];
  metadata: Record<string, any>;
  room?: string;
  floor?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceState {
  id: string;
  deviceId: string;
  state: Record<string, any>; // e.g., { power: true, brightness: 80, color: '#FF0000' }
  timestamp: Date;
}

export interface DeviceControlCommand {
  deviceId: string;
  capability: DeviceCapability;
  value: any;
  userId?: string;
  reason?: string;
}

// =================================================================
// INTEGRATION & CONNECTORS
// =================================================================

export enum IntegrationType {
  MQTT = 'mqtt',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  SSH = 'ssh',
  ZIGBEE = 'zigbee',
  ZWAVE = 'zwave',
  BLUETOOTH = 'bluetooth',
  VENDOR_API = 'vendor_api', // e.g., Philips Hue, LIFX, etc.
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  protocol: string;
  config: Record<string, any>;
  credentials?: Record<string, any>; // Encrypted
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EdgeHub {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  capabilities: string[]; // e.g., ['zigbee', 'zwave', 'bluetooth']
  status: 'online' | 'offline';
  lastHeartbeat: Date;
  createdAt: Date;
}

// =================================================================
// NETWORK & SCANNING
// =================================================================

export enum NetworkDeviceType {
  ROUTER = 'router',
  SWITCH = 'switch',
  ACCESS_POINT = 'access_point',
  FIREWALL = 'firewall',
  NAS = 'nas',
  COMPUTER = 'computer',
  PHONE = 'phone',
  TABLET = 'tablet',
  IOT_DEVICE = 'iot_device',
  PRINTER = 'printer',
  CAMERA = 'camera',
  UNKNOWN = 'unknown',
}

export interface NetworkDevice {
  id: string;
  ipAddress: string;
  macAddress: string;
  hostname?: string;
  vendor?: string;
  deviceType: NetworkDeviceType;
  metadata: Record<string, any>;
  firstSeen: Date;
  lastSeen: Date;
  status: 'online' | 'offline';
}

export enum ScanType {
  DISCOVERY = 'discovery', // Find new devices
  PORT_SCAN = 'port_scan', // Scan specific device ports
  VULNERABILITY = 'vulnerability', // Vulnerability assessment
  TRAFFIC_CAPTURE = 'traffic_capture', // Packet capture
}

export enum ScanStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface ScanJob {
  id: string;
  scanType: ScanType;
  targets: string[]; // IP addresses or ranges
  status: ScanStatus;
  initiatedBy: string; // User ID
  config?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface ScanResult {
  id: string;
  scanJobId: string;
  networkDeviceId: string;
  openPorts?: PortInfo[];
  services?: ServiceInfo[];
  osFingerprint?: string;
  timestamp: Date;
}

export interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service?: string;
}

export interface ServiceInfo {
  port: number;
  name: string;
  product?: string;
  version?: string;
  extraInfo?: string;
}

export interface TrafficStat {
  id: string;
  networkDeviceId: string;
  bytesSent: number;
  bytesReceived: number;
  topDestinations: { ip: string; bytes: number }[];
  protocolBreakdown: Record<string, number>; // e.g., { http: 1024, https: 2048 }
  windowStart: Date;
  windowEnd: Date;
}

// =================================================================
// SECURITY & VULNERABILITIES
// =================================================================

export enum VulnerabilitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export interface Vulnerability {
  id: string;
  scanResultId: string;
  cveId?: string;
  severity: VulnerabilitySeverity;
  description: string;
  affectedService: ServiceInfo;
  recommendation?: string;
  acknowledged: boolean;
  detectedAt: Date;
}

export enum AlertType {
  NEW_DEVICE = 'new_device',
  DEVICE_OFFLINE = 'device_offline',
  SUSPICIOUS_PORT = 'suspicious_port',
  VULNERABILITY_DETECTED = 'vulnerability_detected',
  FIRMWARE_OUTDATED = 'firmware_outdated',
  UNUSUAL_TRAFFIC = 'unusual_traffic',
  AUTOMATION_FAILED = 'automation_failed',
  SYSTEM_ERROR = 'system_error',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: VulnerabilitySeverity;
  source: string; // Service name
  sourceId: string; // Related entity ID
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  createdAt: Date;
}

// =================================================================
// AUTOMATION & RULES
// =================================================================

export enum TriggerType {
  DEVICE_STATE = 'device_state',
  NETWORK_EVENT = 'network_event',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  SECURITY_EVENT = 'security_event',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN = 'in',
  AND = 'and',
  OR = 'or',
}

export enum ActionType {
  DEVICE_CONTROL = 'device_control',
  SCENE_ACTIVATE = 'scene_activate',
  NOTIFICATION = 'notification',
  WEBHOOK = 'webhook',
  NETWORK_ACTION = 'network_action', // e.g., block device
  DELAY = 'delay',
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    config: Record<string, any>;
  };
  conditions?: {
    operator: ConditionOperator;
    config: Record<string, any>;
  }[];
  actions: {
    type: ActionType;
    config: Record<string, any>;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export enum AutomationRunStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  status: AutomationRunStatus;
  triggerData: Record<string, any>;
  actionsExecuted: {
    type: ActionType;
    config: Record<string, any>;
    success: boolean;
    error?: string;
  }[];
  errorLog?: string;
  startedAt: Date;
  completedAt?: Date;
}

// =================================================================
// EVENTS
// =================================================================

export enum EventType {
  DEVICE_STATE_CHANGED = 'device.state.changed',
  DEVICE_ADDED = 'device.added',
  DEVICE_REMOVED = 'device.removed',
  DEVICE_OFFLINE = 'device.offline',
  DEVICE_ONLINE = 'device.online',

  NETWORK_DEVICE_DISCOVERED = 'network.device.discovered',
  NETWORK_SCAN_STARTED = 'network.scan.started',
  NETWORK_SCAN_COMPLETED = 'network.scan.completed',

  SECURITY_VULNERABILITY_FOUND = 'security.vulnerability.found',
  SECURITY_ALERT_CREATED = 'security.alert.created',

  AUTOMATION_TRIGGERED = 'automation.triggered',
  AUTOMATION_COMPLETED = 'automation.completed',
  AUTOMATION_FAILED = 'automation.failed',

  EDGE_HUB_CONNECTED = 'edge.hub.connected',
  EDGE_HUB_DISCONNECTED = 'edge.hub.disconnected',

  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
}

export interface Event<T = any> {
  id: string;
  type: EventType;
  source: string; // Service name
  sourceId?: string; // Related entity ID
  payload: T;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// =================================================================
// API RESPONSES
// =================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =================================================================
// CONFIGURATION
// =================================================================

export interface PlatformConfig {
  name: string;
  version: string;
  domain: string;
  features: {
    networkScanning: boolean;
    vulnerabilityScanning: boolean;
    trafficMonitoring: boolean;
    automation: boolean;
    voiceControl: boolean;
  };
}
