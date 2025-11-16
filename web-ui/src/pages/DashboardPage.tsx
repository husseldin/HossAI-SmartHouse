import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Lightbulb, Network, Shield, Zap, AlertTriangle, Activity } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => apiClient.getDevices({ pageSize: 100 }),
  });

  const { data: networkDevices } = useQuery({
    queryKey: ['networkDevices'],
    queryFn: () => apiClient.getNetworkDevices({ pageSize: 100 }),
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiClient.getAlerts({ pageSize: 10, acknowledged: false }),
  });

  const { data: automations } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiClient.getAutomations({ pageSize: 100 }),
  });

  const stats = [
    {
      title: 'Total Devices',
      value: devices?.total || 0,
      subtitle: `${devices?.items.filter((d) => d.status === 'online').length || 0} online`,
      icon: Lightbulb,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Network Devices',
      value: networkDevices?.total || 0,
      subtitle: `${networkDevices?.items.filter((d) => d.status === 'online').length || 0} active`,
      icon: Network,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Alerts',
      value: alerts?.total || 0,
      subtitle: 'Unacknowledged',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Automations',
      value: automations?.total || 0,
      subtitle: `${automations?.items.filter((a) => a.enabled).length || 0} enabled`,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to your Smart Home Platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest security and system alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts && alerts.items.length > 0 ? (
              <div className="space-y-3">
                {alerts.items.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge
                          variant={
                            alert.severity === 'critical' || alert.severity === 'high'
                              ? 'danger'
                              : alert.severity === 'medium'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(alert.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Status */}
        <Card>
          <CardHeader>
            <CardTitle>Device Status</CardTitle>
            <CardDescription>Overview of your smart devices</CardDescription>
          </CardHeader>
          <CardContent>
            {devices && devices.items.length > 0 ? (
              <div className="space-y-3">
                {devices.items.slice(0, 5).map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground">{device.type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {device.room && (
                        <Badge variant="outline" className="text-xs">
                          {device.room}
                        </Badge>
                      )}
                      <Badge variant={device.status === 'online' ? 'success' : 'default'}>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No devices configured</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Health
          </CardTitle>
          <CardDescription>Platform services status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'API Gateway', status: 'operational' },
              { name: 'Device Service', status: 'operational' },
              { name: 'Network Service', status: 'operational' },
              { name: 'Automation Engine', status: 'operational' },
            ].map((service) => (
              <div key={service.name} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">{service.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
