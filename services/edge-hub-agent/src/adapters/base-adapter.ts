/**
 * Base Protocol Adapter Interface
 */

import { EventEmitter } from 'events';
import { createLogger } from '@smart-home/shared';

export interface AdapterDevice {
  id: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  protocol: string;
  capabilities: string[];
  metadata: Record<string, any>;
}

export interface AdapterConfig {
  hubId: string;
  protocol: string;
}

export abstract class BaseAdapter extends EventEmitter {
  protected logger: ReturnType<typeof createLogger>;
  protected config: AdapterConfig;
  protected devices: Map<string, AdapterDevice> = new Map();
  protected initialized = false;
  protected status: 'stopped' | 'initializing' | 'running' | 'error' = 'stopped';

  constructor(config: AdapterConfig) {
    super();
    this.config = config;
    this.logger = createLogger(`adapter-${config.protocol}`);
  }

  /**
   * Initialize the adapter
   */
  abstract initialize(): Promise<void>;

  /**
   * Shutdown the adapter
   */
  abstract shutdown(): Promise<void>;

  /**
   * Discover devices on the network
   */
  abstract discoverDevices(): Promise<AdapterDevice[]>;

  /**
   * Control a device
   */
  abstract controlDevice(deviceId: string, command: any): Promise<void>;

  /**
   * Get device state
   */
  abstract getDeviceState(deviceId: string): Promise<any>;

  /**
   * Pair a new device
   */
  abstract permitJoin(duration: number): Promise<void>;

  /**
   * Remove a device
   */
  abstract removeDevice(deviceId: string): Promise<void>;

  /**
   * Get adapter status
   */
  getStatus(): {
    protocol: string;
    status: string;
    deviceCount: number;
    initialized: boolean;
  } {
    return {
      protocol: this.config.protocol,
      status: this.status,
      deviceCount: this.devices.size,
      initialized: this.initialized,
    };
  }

  /**
   * Get all discovered devices
   */
  getDevices(): AdapterDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Handle device state change
   */
  protected handleDeviceStateChange(deviceId: string, state: any): void {
    this.logger.debug({ deviceId, state }, 'Device state changed');
    this.emit('deviceStateChange', { deviceId, state });
  }

  /**
   * Handle new device discovery
   */
  protected handleDeviceDiscovered(device: AdapterDevice): void {
    this.devices.set(device.id, device);
    this.logger.info({ device }, 'Device discovered');
    this.emit('deviceDiscovered', device);
  }

  /**
   * Handle device removal
   */
  protected handleDeviceRemoved(deviceId: string): void {
    this.devices.delete(deviceId);
    this.logger.info({ deviceId }, 'Device removed');
    this.emit('deviceRemoved', deviceId);
  }
}
