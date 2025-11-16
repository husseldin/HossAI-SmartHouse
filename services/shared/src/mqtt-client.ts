/**
 * MQTT Client wrapper for event bus communication
 */

import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { createLogger } from './logger';
import type { Event, EventType } from './types';

const logger = createLogger('mqtt-client');

export interface MqttConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
  tls?: boolean;
}

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private config: MqttConfig;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  constructor(config: MqttConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = this.config.tls ? 'mqtts' : 'mqtt';
      const url = `${protocol}://${this.config.host}:${this.config.port}`;

      logger.info({ url, clientId: this.config.clientId }, 'Connecting to MQTT broker');

      this.client = mqtt.connect(url, {
        clientId: this.config.clientId || `smarthome_${Math.random().toString(16).slice(2, 8)}`,
        username: this.config.username,
        password: this.config.password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker');
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.client.on('error', (error) => {
        logger.error({ error }, 'MQTT connection error');
        this.emit('error', error);

        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.warn(
          { attempt: this.reconnectAttempts, max: this.MAX_RECONNECT_ATTEMPTS },
          'Reconnecting to MQTT broker'
        );

        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
          logger.error('Max reconnection attempts reached');
          this.client?.end(true);
        }
      });

      this.client.on('close', () => {
        logger.info('MQTT connection closed');
        this.emit('disconnected');
      });

      this.client.on('message', (topic, payload) => {
        try {
          const message = JSON.parse(payload.toString());
          this.emit('message', topic, message);
        } catch (error) {
          logger.error({ error, topic }, 'Failed to parse MQTT message');
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          logger.info('Disconnected from MQTT broker');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async subscribe(topic: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to subscribe to topic');
          reject(error);
        } else {
          logger.debug({ topic }, 'Subscribed to topic');
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.unsubscribe(topic, {}, (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to unsubscribe from topic');
          reject(error);
        } else {
          logger.debug({ topic }, 'Unsubscribed from topic');
          resolve();
        }
      });
    });
  }

  async publish(topic: string, message: any, options?: { retain?: boolean; qos?: 0 | 1 | 2 }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const payload = JSON.stringify(message);
      const publishOptions = {
        qos: options?.qos ?? 1,
        retain: options?.retain ?? false,
      };

      this.client.publish(topic, payload, publishOptions as any, (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to publish message');
          reject(error);
        } else {
          logger.debug({ topic, payloadSize: payload.length }, 'Published message');
          resolve();
        }
      });
    });
  }

  /**
   * Publish an event to the event bus
   */
  async publishEvent<T = any>(event: Event<T>): Promise<void> {
    const topic = `events/${event.type.replace(/\./g, '/')}`;
    await this.publish(topic, event);
  }

  /**
   * Subscribe to events by type pattern
   * @param pattern - Event type pattern (e.g., 'device.*' or 'device.state.changed')
   */
  async subscribeToEvents(pattern: string, handler: (event: Event) => void): Promise<void> {
    const topic = `events/${pattern.replace(/\./g, '/')}`;

    await this.subscribe(topic);

    this.on('message', (receivedTopic, message) => {
      if (this.topicMatches(topic, receivedTopic)) {
        handler(message as Event);
      }
    });
  }

  /**
   * Check if a received topic matches a subscription pattern
   */
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    if (patternParts.length !== topicParts.length && !pattern.includes('#')) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') {
        return true; // Multi-level wildcard
      }
      if (patternParts[i] === '+') {
        continue; // Single-level wildcard
      }
      if (patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return true;
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Singleton instance for services
let mqttClientInstance: MqttClient | null = null;

export const getMqttClient = (): MqttClient => {
  if (!mqttClientInstance) {
    const config: MqttConfig = {
      host: process.env.MQTT_HOST || 'localhost',
      port: parseInt(process.env.MQTT_PORT || '1883'),
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      tls: process.env.MQTT_TLS === 'true',
    };

    mqttClientInstance = new MqttClient(config);
  }

  return mqttClientInstance;
};

export default MqttClient;
