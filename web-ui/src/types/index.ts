/**
 * Frontend types (mirrors backend types)
 */

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  READONLY = 'readonly',
  AGENT = 'agent',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

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
  COVER = 'cover',
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
  POSITION = 'position',
  SPEED = 'speed',
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
  createdAt: string;
  updatedAt: string;
}

export interface DeviceState {
  id: string;
  deviceId: string;
  state: Record<string, any>;
  timestamp: string;
}

export interface NetworkDevice {
  id: string;
  ipAddress: string;
  macAddress: string;
  hostname?: string;
  vendor?: string;
  deviceType: string;
  metadata: Record<string, any>;
  firstSeen: string;
  lastSeen: string;
  status: 'online' | 'offline';
}

export interface ScanJob {
  id: string;
  scanType: string;
  targets: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  initiatedBy: string;
  config?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  source: string;
  sourceId: string;
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  createdAt: string;
}

export interface Vulnerability {
  id: string;
  scanResultId: string;
  cveId?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  affectedService: any;
  recommendation?: string;
  acknowledged: boolean;
  detectedAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  enabled: boolean;
  trigger: {
    type: string;
    config: Record<string, any>;
  };
  conditions?: Array<{
    operator: string;
    config: Record<string, any>;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  protocol: string;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  criticalAlerts: number;
  totalAutomations: number;
  activeAutomations: number;
  networkDevices: number;
  recentScans: number;
}
