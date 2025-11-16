/**
 * Security Insights Engine
 * Analyzes scan results and provides risk assessments
 */

import { createLogger, VulnerabilitySeverity, AlertType } from '@smart-home/shared';

const logger = createLogger('security-insights');

export interface SecurityInsight {
  id: string;
  type: 'risk' | 'recommendation' | 'compliance' | 'anomaly';
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  affectedDevices: string[];
  recommendation: string;
  category: string;
  detectedAt: Date;
}

export interface RiskScore {
  deviceId: string;
  score: number; // 0-100
  factors: Array<{
    factor: string;
    impact: number; // 0-10
    description: string;
  }>;
  level: 'critical' | 'high' | 'medium' | 'low';
}

export class SecurityInsightsEngine {
  private readonly CRITICAL_PORTS = [21, 23, 135, 139, 445, 3389, 5900];
  private readonly DANGEROUS_SERVICES = ['telnet', 'ftp', 'rsh', 'rexec', 'rlogin'];
  private readonly OUTDATED_PROTOCOLS = ['SSLv2', 'SSLv3', 'TLSv1.0'];

  /**
   * Analyze scan results and generate security insights
   */
  async analyzeScans(scanResults: any[]): Promise<SecurityInsight[]> {
    const insights: SecurityInsight[] = [];

    for (const result of scanResults) {
      insights.push(...this.analyzeScanResult(result));
    }

    return insights;
  }

  /**
   * Analyze individual scan result
   */
  private analyzeScanResult(scanResult: any): SecurityInsight[] {
    const insights: SecurityInsight[] = [];

    const { networkDeviceId, openPorts = [], services = [], osFingerprint } = scanResult;

    // Check for critical open ports
    const criticalPorts = (openPorts as any[]).filter((p: any) =>
      this.CRITICAL_PORTS.includes(p.port)
    );

    if (criticalPorts.length > 0) {
      insights.push({
        id: `critical-ports-${networkDeviceId}`,
        type: 'risk',
        severity: VulnerabilitySeverity.HIGH,
        title: 'Critical Ports Exposed',
        description: `Device has ${criticalPorts.length} critical port(s) open: ${criticalPorts.map((p: any) => p.port).join(', ')}`,
        affectedDevices: [networkDeviceId],
        recommendation: 'Close unnecessary ports or restrict access using firewall rules. Critical ports should only be accessible from trusted networks.',
        category: 'network_security',
        detectedAt: new Date(),
      });
    }

    // Check for dangerous services
    const dangerousServices = (services as any[]).filter((s: any) =>
      this.DANGEROUS_SERVICES.includes(s.name?.toLowerCase())
    );

    if (dangerousServices.length > 0) {
      insights.push({
        id: `dangerous-services-${networkDeviceId}`,
        type: 'risk',
        severity: VulnerabilitySeverity.CRITICAL,
        title: 'Insecure Services Detected',
        description: `Device is running insecure services: ${dangerousServices.map((s: any) => s.name).join(', ')}`,
        affectedDevices: [networkDeviceId],
        recommendation: 'Disable insecure services like Telnet and FTP. Use secure alternatives like SSH and SFTP instead.',
        category: 'service_security',
        detectedAt: new Date(),
      });
    }

    // Check for too many open ports
    if ((openPorts as any[]).length > 20) {
      insights.push({
        id: `many-ports-${networkDeviceId}`,
        type: 'recommendation',
        severity: VulnerabilitySeverity.MEDIUM,
        title: 'Excessive Open Ports',
        description: `Device has ${openPorts.length} open ports, which increases attack surface`,
        affectedDevices: [networkDeviceId],
        recommendation: 'Review and close unnecessary ports. Apply the principle of least privilege.',
        category: 'attack_surface',
        detectedAt: new Date(),
      });
    }

    // Check for SMB/Windows file sharing
    const smbPorts = (openPorts as any[]).filter((p: any) => [139, 445].includes(p.port));
    if (smbPorts.length > 0) {
      insights.push({
        id: `smb-exposed-${networkDeviceId}`,
        type: 'risk',
        severity: VulnerabilitySeverity.HIGH,
        title: 'SMB/File Sharing Exposed',
        description: 'Device has SMB ports open, vulnerable to various attacks including WannaCry and EternalBlue',
        affectedDevices: [networkDeviceId],
        recommendation: 'Disable SMB if not needed, or restrict access to local network only. Ensure latest patches are applied.',
        category: 'ransomware_risk',
        detectedAt: new Date(),
      });
    }

    // Check for RDP exposure
    const rdpPort = (openPorts as any[]).find((p: any) => p.port === 3389);
    if (rdpPort) {
      insights.push({
        id: `rdp-exposed-${networkDeviceId}`,
        type: 'risk',
        severity: VulnerabilitySeverity.HIGH,
        title: 'RDP Exposed to Network',
        description: 'Remote Desktop Protocol is accessible, common target for brute-force attacks',
        affectedDevices: [networkDeviceId],
        recommendation: 'Use VPN for RDP access, enable Network Level Authentication, and implement IP whitelisting.',
        category: 'remote_access',
        detectedAt: new Date(),
      });
    }

    // Check for web servers with default configs
    const webPorts = (openPorts as any[]).filter((p: any) => [80, 8080, 8000, 8888].includes(p.port));
    if (webPorts.length > 0) {
      const hasHttps = (openPorts as any[]).some((p: any) => p.port === 443);
      if (!hasHttps) {
        insights.push({
          id: `http-no-https-${networkDeviceId}`,
          type: 'recommendation',
          severity: VulnerabilitySeverity.MEDIUM,
          title: 'HTTP Without HTTPS',
          description: 'Web server running on HTTP without HTTPS encryption',
          affectedDevices: [networkDeviceId],
          recommendation: 'Enable HTTPS with valid SSL/TLS certificate to encrypt traffic.',
          category: 'encryption',
          detectedAt: new Date(),
        });
      }
    }

    return insights;
  }

  /**
   * Calculate risk score for a device
   */
  calculateRiskScore(device: any, scanResult: any): RiskScore {
    const factors: RiskScore['factors'] = [];
    let totalScore = 0;

    const { openPorts = [], services = [] } = scanResult;

    // Factor 1: Critical ports
    const criticalPortCount = (openPorts as any[]).filter((p: any) =>
      this.CRITICAL_PORTS.includes(p.port)
    ).length;

    if (criticalPortCount > 0) {
      const impact = Math.min(10, criticalPortCount * 3);
      factors.push({
        factor: 'Critical Ports Open',
        impact,
        description: `${criticalPortCount} critical port(s) exposed`,
      });
      totalScore += impact;
    }

    // Factor 2: Dangerous services
    const dangerousServiceCount = (services as any[]).filter((s: any) =>
      this.DANGEROUS_SERVICES.includes(s.name?.toLowerCase())
    ).length;

    if (dangerousServiceCount > 0) {
      const impact = 10; // Maximum impact
      factors.push({
        factor: 'Insecure Services',
        impact,
        description: `${dangerousServiceCount} insecure service(s) running`,
      });
      totalScore += impact;
    }

    // Factor 3: Number of open ports
    const openPortCount = (openPorts as any[]).length;
    if (openPortCount > 0) {
      const impact = Math.min(7, Math.floor(openPortCount / 5));
      factors.push({
        factor: 'Attack Surface',
        impact,
        description: `${openPortCount} open ports increase attack surface`,
      });
      totalScore += impact;
    }

    // Factor 4: Outdated or no OS detection
    if (!scanResult.osFingerprint) {
      factors.push({
        factor: 'Unknown OS',
        impact: 3,
        description: 'Cannot assess patch level without OS information',
      });
      totalScore += 3;
    }

    // Factor 5: No firewall evidence
    const filteredPorts = (openPorts as any[]).filter((p: any) => p.state === 'filtered').length;
    if (filteredPorts === 0 && openPortCount > 0) {
      factors.push({
        factor: 'No Firewall Protection',
        impact: 5,
        description: 'No evidence of firewall protection',
      });
      totalScore += 5;
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, (totalScore / 45) * 100);

    // Determine risk level
    let level: RiskScore['level'];
    if (normalizedScore >= 75) level = 'critical';
    else if (normalizedScore >= 50) level = 'high';
    else if (normalizedScore >= 25) level = 'medium';
    else level = 'low';

    return {
      deviceId: device.id,
      score: Math.round(normalizedScore),
      factors,
      level,
    };
  }

  /**
   * Generate recommendations based on insights
   */
  generateRecommendations(insights: SecurityInsight[]): Array<{
    priority: number;
    title: string;
    description: string;
    impact: string;
  }> {
    const recommendations: Map<
      string,
      { priority: number; title: string; description: string; impact: string; count: number }
    > = new Map();

    for (const insight of insights) {
      const key = insight.category;
      const existing = recommendations.get(key);

      if (existing) {
        existing.count++;
      } else {
        recommendations.set(key, {
          priority: this.getSeverityPriority(insight.severity),
          title: insight.title,
          description: insight.recommendation,
          impact: `Affects ${insight.affectedDevices.length} device(s)`,
          count: 1,
        });
      }
    }

    return Array.from(recommendations.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  }

  /**
   * Get priority number for severity
   */
  private getSeverityPriority(severity: VulnerabilitySeverity): number {
    const priorities = {
      [VulnerabilitySeverity.CRITICAL]: 5,
      [VulnerabilitySeverity.HIGH]: 4,
      [VulnerabilitySeverity.MEDIUM]: 3,
      [VulnerabilitySeverity.LOW]: 2,
      [VulnerabilitySeverity.INFO]: 1,
    };
    return priorities[severity] || 0;
  }

  /**
   * Detect anomalies in network behavior
   */
  detectAnomalies(currentStats: any, historicalStats: any[]): SecurityInsight[] {
    const insights: SecurityInsight[] = [];

    // Check for sudden spike in open ports
    if (historicalStats.length > 0) {
      const avgOpenPorts =
        historicalStats.reduce((sum, s) => sum + (s.openPorts?.length || 0), 0) / historicalStats.length;

      const currentOpenPorts = currentStats.openPorts?.length || 0;

      if (currentOpenPorts > avgOpenPorts * 2) {
        insights.push({
          id: `anomaly-ports-${currentStats.id}`,
          type: 'anomaly',
          severity: VulnerabilitySeverity.HIGH,
          title: 'Unusual Number of Open Ports',
          description: `Device has ${currentOpenPorts} open ports, significantly higher than average (${Math.round(avgOpenPorts)})`,
          affectedDevices: [currentStats.id],
          recommendation: 'Investigate recent changes. This could indicate compromise or misconfiguration.',
          category: 'anomaly_detection',
          detectedAt: new Date(),
        });
      }
    }

    return insights;
  }
}

export const securityInsightsEngine = new SecurityInsightsEngine();
