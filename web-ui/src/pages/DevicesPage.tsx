import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Power, Sun, Trash2, RefreshCw } from 'lucide-react';
import { Device, DeviceCapability } from '@/types';
import { getStatusColor } from '@/lib/utils';

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', selectedRoom, selectedStatus],
    queryFn: () =>
      apiClient.getDevices({
        pageSize: 50,
        room: selectedRoom !== 'all' ? selectedRoom : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      }),
  });

  const controlMutation = useMutation({
    mutationFn: ({
      deviceId,
      capability,
      value,
    }: {
      deviceId: string;
      capability: string;
      value: any;
    }) => apiClient.controlDevice(deviceId, capability, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => apiClient.deleteDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const handleToggleDevice = (device: Device) => {
    if (device.capabilities.includes(DeviceCapability.ON_OFF)) {
      // Toggle power state (simplified - would need to check current state)
      controlMutation.mutate({
        deviceId: device.id,
        capability: DeviceCapability.ON_OFF,
        value: true,
      });
    }
  };

  const rooms = data?.items
    ? Array.from(new Set(data.items.map((d) => d.room).filter(Boolean))) as string[]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Devices</h1>
          <p className="text-muted-foreground mt-1">Manage and control your smart devices</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Room</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Rooms</option>
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            {data && (
              <div className="ml-auto text-sm text-muted-foreground">
                {data.total} devices found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Devices Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading devices...</p>
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((device) => (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {device.type}
                      </Badge>
                      <Badge variant={device.status === 'online' ? 'success' : 'default'}>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                  {device.capabilities.includes(DeviceCapability.ON_OFF) && (
                    <Button
                      size="icon"
                      variant={device.status === 'online' ? 'default' : 'outline'}
                      onClick={() => handleToggleDevice(device)}
                      disabled={controlMutation.isPending}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {device.room && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Room: </span>
                      <span className="font-medium">{device.room}</span>
                    </div>
                  )}

                  {device.capabilities.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Capabilities</div>
                      <div className="flex flex-wrap gap-2">
                        {device.capabilities.slice(0, 3).map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {device.capabilities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{device.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {device.capabilities.includes(DeviceCapability.BRIGHTNESS) && (
                    <div>
                      <label className="text-sm text-muted-foreground flex items-center mb-2">
                        <Sun className="w-4 h-4 mr-2" />
                        Brightness
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full"
                        onChange={(e) =>
                          controlMutation.mutate({
                            deviceId: device.id,
                            capability: DeviceCapability.BRIGHTNESS,
                            value: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(device.id)}
                      disabled={deleteMutation.isPending}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Device
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No devices found. Add your first device to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
