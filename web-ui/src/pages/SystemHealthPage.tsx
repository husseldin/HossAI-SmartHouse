/**
 * System Health Monitoring Page
 * Real-time monitoring of all services and infrastructure
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: string;
  metrics?: {
    cpu?: number;
    memory?: number;
    requests?: number;
    errors?: number;
  };
}

interface SystemMetrics {
  timestamp: string;
  services: ServiceHealth[];
  infrastructure: {
    database: {
      status: string;
      connections: number;
      size: string;
    };
    redis: {
      status: string;
      memory: string;
      keys: number;
    };
    mqtt: {
      status: string;
      clients: number;
      messages: number;
    };
  };
  platform: {
    totalDevices: number;
    onlineDevices: number;
    automations: number;
    alerts: number;
    edgeHubs: number;
  };
}

export function SystemHealthPage() {
  // Fetch system health
  const { data: health, isLoading, refetch } = useQuery<SystemMetrics>({
    queryKey: ['system-health'],
    queryFn: async () => {
      // Mock data - in production, call actual health endpoint
      return {
        timestamp: new Date().toISOString(),
        services: [
          {
            name: 'API Gateway',
            status: 'healthy',
            uptime: 86400,
            lastCheck: new Date().toISOString(),
            metrics: { cpu: 15, memory: 45, requests: 1250, errors: 2 },
          },
          {
            name: 'Device Service',
            status: 'healthy',
            uptime: 86400,
            lastCheck: new Date().toISOString(),
            metrics: { cpu: 10, memory: 38, requests: 850, errors: 0 },
          },
          {
            name: 'Network Service',
            status: 'degraded',
            uptime: 86400,
            lastCheck: new Date().toISOString(),
            metrics: { cpu: 35, memory: 62, requests: 450, errors: 5 },
          },
          {
            name: 'Security Service',
            status: 'healthy',
            uptime: 86400,
            lastCheck: new Date().toISOString(),
            metrics: { cpu: 12, memory: 42, requests: 320, errors: 1 },
          },
          {
            name: 'Automation Engine',
            status: 'healthy',
            uptime: 86400,
            lastCheck: new Date().toISOString(),
            metrics: { cpu: 8, memory: 35, requests: 180, errors: 0 },
          },
          {
            name: 'Integration Manager',
            status: 'healthy',
            uptime: 86400,
            lastCheck: new Date().toISOString(),
            metrics: { cpu: 5, memory: 28, requests: 95, errors: 0 },
          },
        ],
        infrastructure: {
          database: {
            status: 'healthy',
            connections: 24,
            size: '1.2 GB',
          },
          redis: {
            status: 'healthy',
            memory: '256 MB',
            keys: 1450,
          },
          mqtt: {
            status: 'healthy',
            clients: 8,
            messages: 45230,
          },
        },
        platform: {
          totalDevices: 25,
          onlineDevices: 23,
          automations: 12,
          alerts: 3,
          edgeHubs: 2,
        },
      };
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">System Health</h1>
        <div className="text-gray-500">Loading health metrics...</div>
      </div>
    );
  }

  const healthyServices = health?.services.filter((s) => s.status === 'healthy').length || 0;
  const totalServices = health?.services.length || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of services and infrastructure
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {healthyServices === totalServices ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {healthyServices === totalServices ? 'All Systems Operational' : 'Degraded Performance'}
                </h2>
                <p className="text-sm text-gray-600">
                  {healthyServices} of {totalServices} services healthy
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Last updated</div>
            <div className="font-medium">{formatRelativeTime(health?.timestamp || new Date().toISOString())}</div>
          </div>
        </div>
      </Card>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Devices</p>
              <p className="text-2xl font-bold">
                {health?.platform.onlineDevices}/{health?.platform.totalDevices}
              </p>
            </div>
            <Server className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Edge Hubs</p>
              <p className="text-2xl font-bold">{health?.platform.edgeHubs}</p>
            </div>
            <Cpu className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Automations</p>
              <p className="text-2xl font-bold">{health?.platform.automations}</p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold">{health?.platform.alerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Services</p>
              <p className="text-2xl font-bold">{healthyServices}/{totalServices}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Microservices Health */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Microservices</h3>
        <div className="space-y-3">
          {health?.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(service.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{service.name}</span>
                    <Badge className={getStatusColor(service.status)}>{service.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Uptime: {formatUptime(service.uptime)}</span>
                    {service.metrics && (
                      <>
                        <span>CPU: {service.metrics.cpu}%</span>
                        <span>Memory: {service.metrics.memory}%</span>
                        <span>
                          Requests: {service.metrics.requests}
                          {service.metrics.errors > 0 && (
                            <span className="text-red-600 ml-1">({service.metrics.errors} errors)</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Infrastructure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold">PostgreSQL</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <Badge className={getStatusColor(health?.infrastructure.database.status || 'healthy')}>
                {health?.infrastructure.database.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Connections</span>
              <span className="font-medium">{health?.infrastructure.database.connections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database Size</span>
              <span className="font-medium">{health?.infrastructure.database.size}</span>
            </div>
          </div>
        </Card>

        {/* Redis */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-semibold">Redis</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <Badge className={getStatusColor(health?.infrastructure.redis.status || 'healthy')}>
                {health?.infrastructure.redis.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory Usage</span>
              <span className="font-medium">{health?.infrastructure.redis.memory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Keys</span>
              <span className="font-medium">{health?.infrastructure.redis.keys}</span>
            </div>
          </div>
        </Card>

        {/* MQTT */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wifi className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold">MQTT Broker</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <Badge className={getStatusColor(health?.infrastructure.mqtt.status || 'healthy')}>
                {health?.infrastructure.mqtt.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Connected Clients</span>
              <span className="font-medium">{health?.infrastructure.mqtt.clients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Messages</span>
              <span className="font-medium">{health?.infrastructure.mqtt.messages.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
