/**
 * Edge Hubs Management Page
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime, getStatusColor } from '@/lib/utils';
import { Wifi, WifiOff, Trash2, Settings, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HubsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch hubs
  const { data: hubs, isLoading } = useQuery({
    queryKey: ['hubs'],
    queryFn: () => apiClient.getHubs(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Delete hub mutation
  const deleteMutation = useMutation({
    mutationFn: (hubId: string) => apiClient.deleteHub(hubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
    },
  });

  const handleDeleteHub = async (hubId: string, hubName: string) => {
    if (window.confirm(`Are you sure you want to delete hub "${hubName}"?`)) {
      try {
        await deleteMutation.mutateAsync(hubId);
      } catch (error: any) {
        alert(error.message || 'Failed to delete hub');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Edge Hubs</h1>
        <div className="text-gray-500">Loading hubs...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edge Hubs</h1>
          <p className="text-gray-600 mt-1">Manage Raspberry Pi edge hubs and protocol adapters</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hubs</p>
              <p className="text-2xl font-bold">{hubs?.length || 0}</p>
            </div>
            <Cpu className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Online</p>
              <p className="text-2xl font-bold text-green-600">
                {hubs?.filter((h: any) => h.status === 'online').length || 0}
              </p>
            </div>
            <Wifi className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Offline</p>
              <p className="text-2xl font-bold text-red-600">
                {hubs?.filter((h: any) => h.status === 'offline').length || 0}
              </p>
            </div>
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold">
                {hubs?.reduce((sum: number, h: any) => sum + (h.deviceCount || 0), 0) || 0}
              </p>
            </div>
            <Settings className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Hubs List */}
      <div className="space-y-4">
        {hubs && hubs.length > 0 ? (
          hubs.map((hub: any) => (
            <Card key={hub.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{hub.name}</h3>
                    <Badge variant={hub.status === 'online' ? 'success' : 'error'}>
                      {hub.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <span className="ml-2 font-medium">{hub.location || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-gray-600">IP Address:</span>
                      <span className="ml-2 font-medium font-mono">{hub.ipAddress}</span>
                    </div>

                    <div>
                      <span className="text-gray-600">Devices:</span>
                      <span className="ml-2 font-medium">{hub.deviceCount || 0}</span>
                    </div>

                    <div>
                      <span className="text-gray-600">Last Heartbeat:</span>
                      <span className="ml-2 font-medium">
                        {formatRelativeTime(hub.lastHeartbeat)}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {hub.capabilities && hub.capabilities.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-gray-600">Capabilities: </span>
                      <div className="inline-flex gap-2 mt-1">
                        {hub.capabilities.map((cap: string) => (
                          <Badge key={cap} variant="default" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/hubs/${hub.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteHub(hub.id, hub.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center">
            <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Edge Hubs Found</h3>
            <p className="text-gray-600 mb-4">
              Configure and connect Raspberry Pi edge hubs to manage Zigbee, Z-Wave, and Bluetooth devices.
            </p>
            <p className="text-sm text-gray-500">
              Deploy the edge-hub-agent service on your Raspberry Pi to get started.
            </p>
          </Card>
        )}
      </div>

      {/* Documentation Card */}
      <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 text-blue-900">Setting Up Edge Hubs</h3>
        <p className="text-sm text-blue-800 mb-3">
          Edge hubs run on Raspberry Pi devices and handle protocol-specific device communication (Zigbee, Z-Wave, Bluetooth).
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Deploy edge-hub-agent Docker container on Raspberry Pi</li>
          <li>Configure MQTT connection to main controller</li>
          <li>Connect Zigbee/Z-Wave USB adapters</li>
          <li>Hubs will automatically register and start discovering devices</li>
        </ul>
      </Card>
    </div>
  );
}
