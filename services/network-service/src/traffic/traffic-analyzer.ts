/**
 * Traffic Analyzer - Basic packet flow monitoring
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { createLogger } from '@smart-home/shared';

const execAsync = promisify(exec);
const logger = createLogger('traffic-analyzer');

export interface TrafficStats {
  deviceIp: string;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  topDestinations: Array<{
    ip: string;
    bytes: number;
    packets: number;
  }>;
  protocolBreakdown: {
    tcp: number;
    udp: number;
    icmp: number;
    other: number;
  };
  topPorts: Array<{
    port: number;
    protocol: string;
    bytes: number;
  }>;
}

export interface FlowSummary {
  totalDevices: number;
  totalBytes: number;
  totalPackets: number;
  topTalkers: Array<{
    ip: string;
    bytes: number;
  }>;
  protocolDistribution: Record<string, number>;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

export class TrafficAnalyzer extends EventEmitter {
  private captureProcess: any = null;
  private statsCache: Map<string, TrafficStats> = new Map();
  private readonly cacheExpiry = 60000; // 1 minute

  /**
   * Start packet capture on a specific interface
   */
  async startCapture(interfaceName: string = 'any', duration: number = 60): Promise<void> {
    if (this.captureProcess) {
      throw new Error('Capture already running');
    }

    logger.info({ interfaceName, duration }, 'Starting packet capture');

    // Use tcpdump for packet capture (requires root/sudo)
    const command = `timeout ${duration} tcpdump -i ${interfaceName} -nn -q -t -l`;

    this.captureProcess = exec(command);

    this.captureProcess.stdout.on('data', (data: Buffer) => {
      this.processPacket(data.toString());
    });

    this.captureProcess.stderr.on('data', (data: Buffer) => {
      logger.debug({ data: data.toString() }, 'tcpdump stderr');
    });

    this.captureProcess.on('close', (code: number) => {
      logger.info({ code }, 'Packet capture ended');
      this.captureProcess = null;
      this.emit('captureEnded');
    });
  }

  /**
   * Stop active packet capture
   */
  stopCapture(): void {
    if (this.captureProcess) {
      this.captureProcess.kill();
      this.captureProcess = null;
      logger.info('Packet capture stopped');
    }
  }

  /**
   * Process individual packet line from tcpdump
   */
  private processPacket(line: string): void {
    // Parse tcpdump output (simplified)
    // Format: "IP src > dst: proto, length N"
    const ipRegex = /IP (\d+\.\d+\.\d+\.\d+)\.?(\d+)? > (\d+\.\d+\.\d+\.\d+)\.?(\d+)?.*length (\d+)/;
    const match = line.match(ipRegex);

    if (match) {
      const srcIp = match[1];
      const srcPort = match[2] ? parseInt(match[2]) : 0;
      const dstIp = match[3];
      const dstPort = match[4] ? parseInt(match[4]) : 0;
      const bytes = parseInt(match[5]);

      this.updateStats(srcIp, dstIp, bytes, line);
    }
  }

  /**
   * Update traffic statistics
   */
  private updateStats(srcIp: string, dstIp: string, bytes: number, rawLine: string): void {
    // Update source stats
    let srcStats = this.statsCache.get(srcIp);
    if (!srcStats) {
      srcStats = this.createEmptyStats(srcIp);
      this.statsCache.set(srcIp, srcStats);
    }

    srcStats.bytesSent += bytes;
    srcStats.packetsSent++;

    // Update destination in top destinations
    let destEntry = srcStats.topDestinations.find((d) => d.ip === dstIp);
    if (!destEntry) {
      destEntry = { ip: dstIp, bytes: 0, packets: 0 };
      srcStats.topDestinations.push(destEntry);
    }
    destEntry.bytes += bytes;
    destEntry.packets++;

    // Update protocol breakdown (simplified detection)
    if (rawLine.includes('tcp')) {
      srcStats.protocolBreakdown.tcp += bytes;
    } else if (rawLine.includes('udp')) {
      srcStats.protocolBreakdown.udp += bytes;
    } else if (rawLine.includes('icmp')) {
      srcStats.protocolBreakdown.icmp += bytes;
    } else {
      srcStats.protocolBreakdown.other += bytes;
    }

    // Update destination stats (bytes received)
    let dstStats = this.statsCache.get(dstIp);
    if (!dstStats) {
      dstStats = this.createEmptyStats(dstIp);
      this.statsCache.set(dstIp, dstStats);
    }
    dstStats.bytesReceived += bytes;
    dstStats.packetsReceived++;

    // Emit update event
    this.emit('statsUpdate', srcIp, srcStats);
  }

  /**
   * Create empty stats structure
   */
  private createEmptyStats(ip: string): TrafficStats {
    return {
      deviceIp: ip,
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      topDestinations: [],
      protocolBreakdown: {
        tcp: 0,
        udp: 0,
        icmp: 0,
        other: 0,
      },
      topPorts: [],
    };
  }

  /**
   * Get traffic stats for a specific device
   */
  getDeviceStats(ipAddress: string): TrafficStats | null {
    return this.statsCache.get(ipAddress) || null;
  }

  /**
   * Get overall flow summary
   */
  getFlowSummary(): FlowSummary {
    const allStats = Array.from(this.statsCache.values());

    const totalBytes = allStats.reduce((sum, s) => sum + s.bytesSent, 0);
    const totalPackets = allStats.reduce((sum, s) => sum + s.packetsSent, 0);

    // Top talkers (by bytes sent)
    const topTalkers = allStats
      .map((s) => ({ ip: s.deviceIp, bytes: s.bytesSent }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10);

    // Protocol distribution
    const protocolDistribution: Record<string, number> = {
      tcp: 0,
      udp: 0,
      icmp: 0,
      other: 0,
    };

    allStats.forEach((s) => {
      protocolDistribution.tcp += s.protocolBreakdown.tcp;
      protocolDistribution.udp += s.protocolBreakdown.udp;
      protocolDistribution.icmp += s.protocolBreakdown.icmp;
      protocolDistribution.other += s.protocolBreakdown.other;
    });

    return {
      totalDevices: allStats.length,
      totalBytes,
      totalPackets,
      topTalkers,
      protocolDistribution,
      timeWindow: {
        start: new Date(Date.now() - this.cacheExpiry),
        end: new Date(),
      },
    };
  }

  /**
   * Get interface statistics using netstat
   */
  async getInterfaceStats(): Promise<
    Array<{
      interface: string;
      rxBytes: number;
      txBytes: number;
      rxPackets: number;
      txPackets: number;
    }>
  > {
    try {
      const { stdout } = await execAsync('cat /proc/net/dev');
      const lines = stdout.split('\n').slice(2); // Skip header

      const stats = [];
      for (const line of lines) {
        const match = line.trim().match(/^(\S+):\s+(\d+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(\d+)\s+(\d+)/);
        if (match) {
          stats.push({
            interface: match[1],
            rxBytes: parseInt(match[2]),
            rxPackets: parseInt(match[3]),
            txBytes: parseInt(match[4]),
            txPackets: parseInt(match[5]),
          });
        }
      }

      return stats;
    } catch (error) {
      logger.error({ error }, 'Failed to get interface stats');
      return [];
    }
  }

  /**
   * Clear cached statistics
   */
  clearStats(): void {
    this.statsCache.clear();
    logger.info('Traffic statistics cleared');
  }

  /**
   * Check if tcpdump is installed
   */
  async checkInstalled(): Promise<boolean> {
    try {
      await execAsync('tcpdump --version');
      return true;
    } catch {
      return false;
    }
  }
}

export const trafficAnalyzer = new TrafficAnalyzer();
