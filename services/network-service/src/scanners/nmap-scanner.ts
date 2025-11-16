/**
 * Enhanced Network Scanner using nmap
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@smart-home/shared';

const execAsync = promisify(exec);
const logger = createLogger('nmap-scanner');

export interface NmapScanOptions {
  targets: string[];
  scanType: 'discovery' | 'port_scan' | 'full_scan' | 'vulnerability';
  timing?: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  enableServiceDetection?: boolean;
  enableOsDetection?: boolean;
  portRange?: string;
}

export interface NmapHost {
  ipAddress: string;
  hostname?: string;
  macAddress?: string;
  vendor?: string;
  state: 'up' | 'down';
  openPorts: Array<{
    port: number;
    protocol: 'tcp' | 'udp';
    state: 'open' | 'closed' | 'filtered';
    service?: string;
    version?: string;
  }>;
  osGuess?: string;
  latency?: number;
}

export class NmapScanner {
  private readonly defaultTiming = 'T3';
  private readonly maxHosts = 256;

  /**
   * Execute nmap scan
   */
  async scan(options: NmapScanOptions): Promise<NmapHost[]> {
    const command = this.buildCommand(options);

    logger.info({ command, targets: options.targets }, 'Executing nmap scan');

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes max
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr && !stderr.includes('Warning')) {
        logger.warn({ stderr }, 'Nmap scan stderr output');
      }

      return this.parseOutput(stdout);
    } catch (error: any) {
      logger.error({ error, command }, 'Nmap scan failed');
      throw new Error(`Nmap scan failed: ${error.message}`);
    }
  }

  /**
   * Build nmap command based on options
   */
  private buildCommand(options: NmapScanOptions): string {
    const timing = options.timing || this.defaultTiming;
    const targets = options.targets.join(' ');

    let command = `nmap -${timing}`;

    switch (options.scanType) {
      case 'discovery':
        // Ping scan only
        command += ' -sn';
        break;

      case 'port_scan':
        // TCP SYN scan (requires root/sudo)
        command += ' -sS';
        if (options.portRange) {
          command += ` -p ${options.portRange}`;
        } else {
          command += ' -F'; // Fast scan (100 most common ports)
        }
        break;

      case 'full_scan':
        // Full TCP connect scan
        command += ' -sT -p-';
        if (options.enableServiceDetection) {
          command += ' -sV';
        }
        if (options.enableOsDetection) {
          command += ' -O';
        }
        break;

      case 'vulnerability':
        // Vulnerability scan with NSE scripts
        command += ' -sV --script vuln';
        break;
    }

    // Output format
    command += ' -oX -'; // XML output to stdout

    // Add targets
    command += ` ${targets}`;

    return command;
  }

  /**
   * Parse nmap XML output
   */
  private parseOutput(xmlOutput: string): NmapHost[] {
    const hosts: NmapHost[] = [];

    // Simple regex-based parsing (in production, use proper XML parser)
    const hostRegex = /<host[^>]*>[\s\S]*?<\/host>/g;
    const hostMatches = xmlOutput.match(hostRegex) || [];

    for (const hostXml of hostMatches) {
      try {
        const host = this.parseHost(hostXml);
        if (host) {
          hosts.push(host);
        }
      } catch (error) {
        logger.error({ error, hostXml }, 'Failed to parse host');
      }
    }

    return hosts;
  }

  /**
   * Parse individual host from XML
   */
  private parseHost(hostXml: string): NmapHost | null {
    // Extract IP address
    const ipMatch = hostXml.match(/<address addr="([^"]+)" addrtype="ipv4"/);
    if (!ipMatch) return null;

    const ipAddress = ipMatch[1];

    // Extract state
    const stateMatch = hostXml.match(/<status state="([^"]+)"/);
    const state = stateMatch?.[1] === 'up' ? 'up' : 'down';

    // Extract hostname
    const hostnameMatch = hostXml.match(/<hostname name="([^"]+)"/);
    const hostname = hostnameMatch?.[1];

    // Extract MAC address and vendor
    const macMatch = hostXml.match(/<address addr="([^"]+)" addrtype="mac".*?vendor="([^"]*)"/);
    const macAddress = macMatch?.[1];
    const vendor = macMatch?.[2];

    // Extract open ports
    const openPorts = this.parseOpenPorts(hostXml);

    // Extract OS guess
    const osMatch = hostXml.match(/<osmatch name="([^"]+)"/);
    const osGuess = osMatch?.[1];

    // Extract latency
    const latencyMatch = hostXml.match(/<times.*?srtt="([^"]+)"/);
    const latency = latencyMatch ? parseFloat(latencyMatch[1]) / 1000 : undefined; // Convert to ms

    return {
      ipAddress,
      hostname,
      macAddress,
      vendor,
      state,
      openPorts,
      osGuess,
      latency,
    };
  }

  /**
   * Parse open ports from host XML
   */
  private parseOpenPorts(hostXml: string): NmapHost['openPorts'] {
    const ports: NmapHost['openPorts'] = [];

    const portRegex = /<port protocol="([^"]+)" portid="([^"]+)">[\s\S]*?<state state="([^"]+)"[\s\S]*?(?:<service name="([^"]*)"(?:.*?product="([^"]*)")?(?:.*?version="([^"]*)")?)?/g;

    let match;
    while ((match = portRegex.exec(hostXml)) !== null) {
      ports.push({
        port: parseInt(match[2]),
        protocol: match[1] as 'tcp' | 'udp',
        state: match[3] as 'open' | 'closed' | 'filtered',
        service: match[4] || undefined,
        version: match[5] && match[6] ? `${match[5]} ${match[6]}` : match[5] || undefined,
      });
    }

    return ports;
  }

  /**
   * Quick ping sweep to find live hosts
   */
  async pingSweep(cidr: string): Promise<string[]> {
    const command = `nmap -sn -T4 ${cidr} -oG -`;

    try {
      const { stdout } = await execAsync(command, { timeout: 60000 });

      const ipRegex = /Host: (\d+\.\d+\.\d+\.\d+) \(.*?\)\s+Status: Up/g;
      const liveHosts: string[] = [];

      let match;
      while ((match = ipRegex.exec(stdout)) !== null) {
        liveHosts.push(match[1]);
      }

      return liveHosts;
    } catch (error: any) {
      logger.error({ error, cidr }, 'Ping sweep failed');
      return [];
    }
  }

  /**
   * Check if nmap is installed
   */
  async checkInstalled(): Promise<boolean> {
    try {
      await execAsync('nmap --version');
      return true;
    } catch {
      return false;
    }
  }
}

export const nmapScanner = new NmapScanner();
