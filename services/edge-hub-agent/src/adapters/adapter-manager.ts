/**
 * Protocol Adapter Manager
 * Manages all protocol adapters (Zigbee, Z-Wave, Bluetooth, etc.)
 */

import { createLogger } from '@smart-home/shared';
import { BaseAdapter, AdapterDevice } from './base-adapter';
import { ZigbeeAdapter } from './zigbee-adapter';
import { ZwaveAdapter } from './zwave-adapter';
import { ControllerClient } from '../controller-client';

const logger = createLogger('adapter-manager');

export interface AdapterManagerConfig {
  hubId: string;
  controllerClient: ControllerClient;
  enableZigbee?: boolean;
  enableZwave?: boolean;
  enableBluetooth?: boolean;
  zigbeePort?: string;
  zigbeeAdapter?: string;
  zwavePort?: string;
}

export class ProtocolAdapterManager {
  private config: AdapterManagerConfig;
  private adapters: Map<string, BaseAdapter> = new Map();
  private controllerClient: ControllerClient;

  constructor(config: AdapterManagerConfig) {
    this.config = config;
    this.controllerClient = config.controllerClient;
  }

  /**
   * Initialize all enabled adapters
   */
  async initializeAdapters(): Promise<void> {
    logger.info('Initializing protocol adapters');

    // Initialize Zigbee adapter
    if (this.config.enableZigbee) {
      const zigbeeAdapter = new ZigbeeAdapter({
        hubId: this.config.hubId,
        protocol: 'zigbee',
        port: this.config.zigbeePort || '/dev/ttyUSB0',
        adapter: this.config.zigbeeAdapter || 'ezsp',
        channel: parseInt(process.env.ZIGBEE_CHANNEL || '11'),
        panId: parseInt(process.env.ZIGBEE_PAN_ID || '0x1a62'),
      });

      this.registerAdapter('zigbee', zigbeeAdapter);
      await this.initializeAdapter('zigbee');
    }

    // Initialize Z-Wave adapter
    if (this.config.enableZwave) {
      const zwaveAdapter = new ZwaveAdapter({
        hubId: this.config.hubId,
        protocol: 'zwave',
        port: this.config.zwavePort || '/dev/ttyACM0',
      });

      this.registerAdapter('zwave', zwaveAdapter);
      await this.initializeAdapter('zwave');
    }

    logger.info({ adapterCount: this.adapters.size }, 'All adapters initialized');
  }

  /**
   * Register an adapter
   */
  private registerAdapter(name: string, adapter: BaseAdapter): void {
    this.adapters.set(name, adapter);

    // Listen to adapter events
    adapter.on('deviceDiscovered', (device: AdapterDevice) => {
      this.handleDeviceDiscovered(device);
    });

    adapter.on('deviceStateChange', (event: { deviceId: string; state: any }) => {
      this.handleDeviceStateChange(event.deviceId, event.state);
    });

    adapter.on('deviceRemoved', (deviceId: string) => {
      this.handleDeviceRemoved(deviceId);
    });

    logger.info({ name }, 'Adapter registered');
  }

  /**
   * Initialize a specific adapter
   */
  private async initializeAdapter(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter ${name} not found`);
    }

    try {
      logger.info({ name }, 'Initializing adapter');
      await adapter.initialize();
      logger.info({ name }, 'Adapter initialized successfully');
    } catch (error) {
      logger.error({ error, name }, 'Failed to initialize adapter');
      throw error;
    }
  }

  /**
   * Handle device discovery
   */
  private async handleDeviceDiscovered(device: AdapterDevice): Promise<void> {
    logger.info({ device }, 'New device discovered');

    // Report to controller
    await this.controllerClient.reportDevice({
      ...device,
      hubId: this.config.hubId,
      discoveredAt: new Date().toISOString(),
    });
  }

  /**
   * Handle device state change
   */
  private async handleDeviceStateChange(deviceId: string, state: any): Promise<void> {
    logger.debug({ deviceId, state }, 'Device state changed');

    // Report to controller
    await this.controllerClient.reportDeviceState(deviceId, state);
  }

  /**
   * Handle device removal
   */
  private async handleDeviceRemoved(deviceId: string): Promise<void> {
    logger.info({ deviceId }, 'Device removed');

    // Report to controller
    await this.controllerClient.reportEvent('device_removed', { deviceId });
  }

  /**
   * Discover devices on all adapters
   */
  async discoverAllDevices(): Promise<AdapterDevice[]> {
    const allDevices: AdapterDevice[] = [];

    for (const [name, adapter] of this.adapters) {
      try {
        logger.info({ adapter: name }, 'Starting device discovery');
        const devices = await adapter.discoverDevices();
        allDevices.push(...devices);
        logger.info({ adapter: name, deviceCount: devices.length }, 'Discovery complete');
      } catch (error) {
        logger.error({ error, adapter: name }, 'Discovery failed');
      }
    }

    return allDevices;
  }

  /**
   * Control a device
   */
  async controlDevice(deviceId: string, protocol: string, command: any): Promise<void> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(`Adapter ${protocol} not found`);
    }

    await adapter.controlDevice(deviceId, command);
  }

  /**
   * Get device state
   */
  async getDeviceState(deviceId: string, protocol: string): Promise<any> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(`Adapter ${protocol} not found`);
    }

    return await adapter.getDeviceState(deviceId);
  }

  /**
   * Enable pairing mode
   */
  async permitJoin(protocol: string, duration: number): Promise<void> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(`Adapter ${protocol} not found`);
    }

    await adapter.permitJoin(duration);
  }

  /**
   * Remove a device
   */
  async removeDevice(deviceId: string, protocol: string): Promise<void> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(`Adapter ${protocol} not found`);
    }

    await adapter.removeDevice(deviceId);
  }

  /**
   * Get status of all adapters
   */
  getAdapterStatus(): Record<string, { status: string; deviceCount: number }> {
    const status: Record<string, { status: string; deviceCount: number }> = {};

    for (const [name, adapter] of this.adapters) {
      const adapterStatus = adapter.getStatus();
      status[name] = {
        status: adapterStatus.status,
        deviceCount: adapterStatus.deviceCount,
      };
    }

    return status;
  }

  /**
   * Shutdown all adapters
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down all adapters');

    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.shutdown();
        logger.info({ name }, 'Adapter shut down');
      } catch (error) {
        logger.error({ error, name }, 'Failed to shutdown adapter');
      }
    }

    this.adapters.clear();
  }
}
