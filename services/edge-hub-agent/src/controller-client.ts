/**
 * Controller Client - Handles communication with main controller
 */

import mqtt, { MqttClient } from 'mqtt';
import axios, { AxiosInstance } from 'axios';
import { createLogger } from '@smart-home/shared';
import { readFileSync } from 'fs';

const logger = createLogger('controller-client');

export interface ControllerClientConfig {
  hubId: string;
  hubName: string;
  location: string;
  controllerHost: string;
  mqttPort: number;
  mqttUsername?: string;
  mqttPassword?: string;
  useTLS?: boolean;
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
}

export class ControllerClient {
  private mqttClient: MqttClient | null = null;
  private httpClient: AxiosInstance;
  private config: ControllerClientConfig;
  private connected = false;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();

  constructor(config: ControllerClientConfig) {
    this.config = config;

    // HTTP client for REST API calls
    this.httpClient = axios.create({
      baseURL: process.env.CONTROLLER_API_URL || `http://${config.controllerHost}:8000`,
      timeout: 10000,
    });
  }

  /**
   * Connect to controller via MQTT
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mqttUrl = this.config.useTLS
        ? `mqtts://${this.config.controllerHost}:${this.config.mqttPort}`
        : `mqtt://${this.config.controllerHost}:${this.config.mqttPort}`;

      const options: any = {
        clientId: `${this.config.hubId}-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      };

      if (this.config.mqttUsername && this.config.mqttPassword) {
        options.username = this.config.mqttUsername;
        options.password = this.config.mqttPassword;
      }

      // mTLS certificates
      if (this.config.useTLS && this.config.caCert) {
        options.ca = readFileSync(this.config.caCert);
        if (this.config.clientCert && this.config.clientKey) {
          options.cert = readFileSync(this.config.clientCert);
          options.key = readFileSync(this.config.clientKey);
        }
      }

      logger.info({ mqttUrl }, 'Connecting to controller MQTT broker');

      this.mqttClient = mqtt.connect(mqttUrl, options);

      this.mqttClient.on('connect', () => {
        logger.info('Connected to controller MQTT broker');
        this.connected = true;
        this.setupSubscriptions();
        resolve();
      });

      this.mqttClient.on('error', (error) => {
        logger.error({ error }, 'MQTT connection error');
        reject(error);
      });

      this.mqttClient.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.mqttClient.on('reconnect', () => {
        logger.info('Reconnecting to controller MQTT broker');
      });

      this.mqttClient.on('close', () => {
        logger.warn('Disconnected from controller MQTT broker');
        this.connected = false;
      });
    });
  }

  /**
   * Subscribe to relevant topics
   */
  private setupSubscriptions(): void {
    if (!this.mqttClient) return;

    const topics = [
      `hub/${this.config.hubId}/command/#`,
      `hub/${this.config.hubId}/config/#`,
      `device/+/control`,
    ];

    topics.forEach((topic) => {
      this.mqttClient!.subscribe(topic, (err) => {
        if (err) {
          logger.error({ err, topic }, 'Failed to subscribe to topic');
        } else {
          logger.debug({ topic }, 'Subscribed to topic');
        }
      });
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      logger.debug({ topic, payload }, 'Received MQTT message');

      // Find matching handler
      for (const [pattern, handler] of this.messageHandlers) {
        if (this.topicMatches(topic, pattern)) {
          handler(payload);
        }
      }
    } catch (error) {
      logger.error({ error, topic }, 'Failed to handle MQTT message');
    }
  }

  /**
   * Check if topic matches pattern (simple wildcard support)
   */
  private topicMatches(topic: string, pattern: string): boolean {
    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    if (patternParts.length !== topicParts.length && !pattern.includes('#')) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return true;
  }

  /**
   * Register message handler
   */
  onMessage(topicPattern: string, handler: (payload: any) => void): void {
    this.messageHandlers.set(topicPattern, handler);
  }

  /**
   * Publish message to controller
   */
  async publish(topic: string, payload: any): Promise<void> {
    if (!this.mqttClient || !this.connected) {
      throw new Error('Not connected to controller');
    }

    return new Promise((resolve, reject) => {
      this.mqttClient!.publish(topic, JSON.stringify(payload), (err) => {
        if (err) {
          logger.error({ err, topic }, 'Failed to publish message');
          reject(err);
        } else {
          logger.debug({ topic, payload }, 'Published message');
          resolve();
        }
      });
    });
  }

  /**
   * Register hub with controller
   */
  async registerHub(): Promise<void> {
    try {
      const registration = {
        id: this.config.hubId,
        name: this.config.hubName,
        location: this.config.location,
        capabilities: ['zigbee', 'zwave'],
        ipAddress: this.getLocalIP(),
        status: 'online',
      };

      await this.publish('hub/register', registration);
      logger.info({ hubId: this.config.hubId }, 'Hub registration sent');
    } catch (error) {
      logger.error({ error }, 'Failed to register hub');
      throw error;
    }
  }

  /**
   * Send heartbeat to controller
   */
  async sendHeartbeat(health: any): Promise<void> {
    await this.publish(`hub/${this.config.hubId}/heartbeat`, {
      timestamp: new Date().toISOString(),
      health,
    });
  }

  /**
   * Report device discovery
   */
  async reportDevice(device: any): Promise<void> {
    await this.publish(`hub/${this.config.hubId}/device/discovered`, device);
  }

  /**
   * Report device state change
   */
  async reportDeviceState(deviceId: string, state: any): Promise<void> {
    await this.publish(`device/${deviceId}/state`, {
      hubId: this.config.hubId,
      timestamp: new Date().toISOString(),
      state,
    });
  }

  /**
   * Report adapter event
   */
  async reportEvent(eventType: string, data: any): Promise<void> {
    await this.publish(`hub/${this.config.hubId}/event`, {
      eventType,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Get local IP address
   */
  private getLocalIP(): string {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }

    return '127.0.0.1';
  }

  /**
   * Disconnect from controller
   */
  async disconnect(): Promise<void> {
    if (this.mqttClient) {
      await this.publish(`hub/${this.config.hubId}/status`, { status: 'offline' });
      this.mqttClient.end();
      this.mqttClient = null;
      this.connected = false;
      logger.info('Disconnected from controller');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
