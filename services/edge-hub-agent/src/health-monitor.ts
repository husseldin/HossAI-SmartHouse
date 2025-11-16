/**
 * Health Monitor - Monitors hub health and sends heartbeats
 */

import { createLogger } from '@smart-home/shared';
import * as os from 'os';
import * as schedule from 'node-schedule';
import { ControllerClient } from './controller-client';
import { ProtocolAdapterManager } from './adapters/adapter-manager';

const logger = createLogger('health-monitor');

export interface HealthMonitorConfig {
  hubId: string;
  controllerClient: ControllerClient;
  adapterManager: ProtocolAdapterManager;
  heartbeatInterval: number;
  healthCheckInterval: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    controllerConnected: boolean;
    lastHeartbeat: string;
  };
  adapters: Record<string, { status: string; deviceCount: number }>;
}

export class HealthMonitor {
  private config: HealthMonitorConfig;
  private heartbeatJob: schedule.Job | null = null;
  private healthCheckJob: schedule.Job | null = null;
  private lastHeartbeat: Date = new Date();
  private currentHealth: HealthStatus | null = null;

  constructor(config: HealthMonitorConfig) {
    this.config = config;
  }

  /**
   * Start health monitoring
   */
  start(): void {
    logger.info('Starting health monitor');

    // Send heartbeat periodically
    const heartbeatInterval = Math.floor(this.config.heartbeatInterval / 1000);
    this.heartbeatJob = schedule.scheduleJob(`*/${heartbeatInterval} * * * * *`, async () => {
      await this.sendHeartbeat();
    });

    // Run health checks periodically
    const healthCheckInterval = Math.floor(this.config.healthCheckInterval / 1000);
    this.healthCheckJob = schedule.scheduleJob(`*/${healthCheckInterval} * * * * *`, async () => {
      await this.runHealthCheck();
    });

    // Initial health check
    this.runHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    logger.info('Stopping health monitor');
    if (this.heartbeatJob) {
      this.heartbeatJob.cancel();
      this.heartbeatJob = null;
    }
    if (this.healthCheckJob) {
      this.healthCheckJob.cancel();
      this.healthCheckJob = null;
    }
  }

  /**
   * Send heartbeat to controller
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const health = this.getHealthStatus();
      await this.config.controllerClient.sendHeartbeat(health);
      this.lastHeartbeat = new Date();
      logger.debug('Heartbeat sent');
    } catch (error) {
      logger.error({ error }, 'Failed to send heartbeat');
    }
  }

  /**
   * Run comprehensive health check
   */
  private async runHealthCheck(): Promise<void> {
    try {
      const health = await this.collectHealthMetrics();
      this.currentHealth = health;

      // Report if status changed to unhealthy
      if (health.status !== 'healthy') {
        await this.config.controllerClient.reportEvent('health_degraded', health);
        logger.warn({ health }, 'Health degraded');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to run health check');
    }
  }

  /**
   * Collect health metrics
   */
  private async collectHealthMetrics(): Promise<HealthStatus> {
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();
    const temperature = await this.getCPUTemperature();

    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        temperature,
      },
      memory: memoryUsage,
      disk: diskUsage,
      network: {
        controllerConnected: this.config.controllerClient.isConnected(),
        lastHeartbeat: this.lastHeartbeat.toISOString(),
      },
      adapters: this.config.adapterManager.getAdapterStatus(),
    };

    // Determine overall health status
    if (!health.network.controllerConnected) {
      health.status = 'unhealthy';
    } else if (
      health.memory.usagePercent > 90 ||
      (health.disk && health.disk.usagePercent > 90) ||
      (health.cpu.temperature && health.cpu.temperature > 80)
    ) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    if (!this.currentHealth) {
      // Return basic health if not yet collected
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cpu: {
          usage: 0,
          loadAverage: os.loadavg(),
        },
        memory: this.getMemoryUsage(),
        network: {
          controllerConnected: this.config.controllerClient.isConnected(),
          lastHeartbeat: this.lastHeartbeat.toISOString(),
        },
        adapters: this.config.adapterManager.getAdapterStatus(),
      };
    }
    return this.currentHealth;
  }

  /**
   * Get CPU usage percentage
   */
  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor((100 * idle) / total);

    return usage;
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usagePercent = Math.floor((used / total) * 100);

    return {
      total,
      used,
      free,
      usagePercent,
    };
  }

  /**
   * Get disk usage (Linux only)
   */
  private async getDiskUsage(): Promise<
    { total: number; used: number; free: number; usagePercent: number } | undefined
  > {
    try {
      const { execSync } = require('child_process');
      const output = execSync("df / | tail -1 | awk '{print $2,$3,$4,$5}'").toString().trim();
      const [total, used, free, percent] = output.split(' ');

      return {
        total: parseInt(total) * 1024, // Convert to bytes
        used: parseInt(used) * 1024,
        free: parseInt(free) * 1024,
        usagePercent: parseInt(percent),
      };
    } catch (error) {
      logger.debug({ error }, 'Could not get disk usage');
      return undefined;
    }
  }

  /**
   * Get CPU temperature (Raspberry Pi only)
   */
  private async getCPUTemperature(): Promise<number | undefined> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('cat /sys/class/thermal/thermal_zone0/temp').toString().trim();
      return parseInt(output) / 1000; // Convert to Celsius
    } catch (error) {
      logger.debug({ error }, 'Could not get CPU temperature');
      return undefined;
    }
  }
}
