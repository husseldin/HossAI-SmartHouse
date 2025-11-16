import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Settings, Plug, Trash2, TestTube } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiClient.getIntegrations({ pageSize: 50 }),
  });

  const testMutation = useMutation({
    mutationFn: (integrationId: string) => apiClient.testIntegration(integrationId),
  });

  const deleteMutation = useMutation({
    mutationFn: (integrationId: string) => apiClient.deleteIntegration(integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform configuration and integrations</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your user account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Username</label>
              <p className="font-medium">{user?.username}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Role</label>
              <Badge className="mt-1">{user?.role}</Badge>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">User ID</label>
              <p className="font-mono text-xs mt-1">{user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect to device ecosystems and services</CardDescription>
            </div>
            <Button>
              <Plug className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="space-y-3">
              {data.items.map((integration) => (
                <div key={integration.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{integration.name}</h3>
                        <Badge variant={integration.enabled ? 'success' : 'default'}>
                          {integration.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">{integration.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Protocol: {integration.protocol}
                      </p>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testMutation.mutate(integration.id)}
                        disabled={testMutation.isPending}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Test
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(integration.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No integrations configured.</p>
              <p className="text-sm mt-2">Add an integration to connect your devices.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Information</CardTitle>
          <CardDescription>System details and version</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Platform Name:</span>
              <span className="font-medium ml-2">Smart Home Platform</span>
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium ml-2">1.0.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">Environment:</span>
              <span className="font-medium ml-2">
                {import.meta.env.MODE}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">API URL:</span>
              <span className="font-mono text-xs ml-2">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
