import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Network, Scan, RefreshCw, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function NetworkPage() {
  const queryClient = useQueryClient();
  const [scanTarget, setScanTarget] = useState('192.168.1.0/24');

  const { data: networkDevices, isLoading } = useQuery({
    queryKey: ['networkDevices'],
    queryFn: () => apiClient.getNetworkDevices({ pageSize: 100 }),
  });

  const { data: scans } = useQuery({
    queryKey: ['scans'],
    queryFn: () => apiClient.getScans({ pageSize: 10 }),
  });

  const scanMutation = useMutation({
    mutationFn: (targets: string[]) => apiClient.createScan('discovery', targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
      }, 5000);
    },
  });

  const handleStartScan = () => {
    scanMutation.mutate([scanTarget]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Network</h1>
        <p className="text-muted-foreground mt-1">Monitor and scan your network devices</p>
      </div>

      {/* Scan Control */}
      <Card>
        <CardHeader>
          <CardTitle>Network Scan</CardTitle>
          <CardDescription>Discover devices on your network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Target Network (CIDR)</label>
              <input
                type="text"
                value={scanTarget}
                onChange={(e) => setScanTarget(e.target.value)}
                placeholder="192.168.1.0/24"
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              onClick={handleStartScan}
              disabled={scanMutation.isPending}
            >
              <Scan className="w-4 h-4 mr-2" />
              {scanMutation.isPending ? 'Scanning...' : 'Start Scan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Network className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{networkDevices?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Devices</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">
                {networkDevices?.items.filter((d) => d.status === 'online').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Online</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{scans?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Scans</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Devices List */}
      <Card>
        <CardHeader>
          <CardTitle>Network Devices</CardTitle>
          <CardDescription>Discovered devices on your network</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : networkDevices && networkDevices.items.length > 0 ? (
            <div className="space-y-2">
              {networkDevices.items.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">
                          {device.hostname || 'Unknown Device'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {device.ipAddress} • {device.macAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {device.vendor && (
                      <span className="text-sm text-muted-foreground">{device.vendor}</span>
                    )}
                    <Badge variant={device.status === 'online' ? 'success' : 'default'}>
                      {device.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(device.lastSeen)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No network devices found. Run a scan to discover devices.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Scan history and status</CardDescription>
        </CardHeader>
        <CardContent>
          {scans && scans.items.length > 0 ? (
            <div className="space-y-2">
              {scans.items.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{scan.scanType} Scan</p>
                    <p className="text-xs text-muted-foreground">
                      {scan.targets.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={
                        scan.status === 'completed'
                          ? 'success'
                          : scan.status === 'running'
                          ? 'warning'
                          : scan.status === 'failed'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {scan.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(scan.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Scan className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No scans yet. Start your first scan to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
