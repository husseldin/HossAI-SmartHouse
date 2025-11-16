import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Zap, Play, Trash2, Power, PowerOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AutomationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiClient.getAutomations({ pageSize: 50 }),
  });

  const executeMutation = useMutation({
    mutationFn: (automationId: string) => apiClient.executeAutomation(automationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiClient.updateAutomation(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (automationId: string) => apiClient.deleteAutomation(automationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const enabledCount = data?.items.filter((a) => a.enabled).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automations</h1>
          <p className="text-muted-foreground mt-1">Manage automation rules and workflows</p>
        </div>
        <Button>
          <Zap className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{data?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Automations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Power className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{enabledCount}</p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <PowerOff className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-2xl font-bold">{(data?.total || 0) - enabledCount}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>Your configured automation workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="space-y-3">
              {data.items.map((automation) => (
                <div key={automation.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{automation.name}</h3>
                        <Badge variant={automation.enabled ? 'success' : 'default'}>
                          {automation.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>

                      {automation.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {automation.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Trigger: </span>
                          <Badge variant="outline" className="ml-2">
                            {automation.trigger.type}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actions: </span>
                          <span className="font-medium">{automation.actions.length}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Created {formatDate(automation.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: automation.id,
                            enabled: !automation.enabled,
                          })
                        }
                        disabled={toggleMutation.isPending}
                      >
                        {automation.enabled ? (
                          <>
                            <PowerOff className="w-4 h-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Enable
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => executeMutation.mutate(automation.id)}
                        disabled={executeMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run Now
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(automation.id)}
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
              <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No automations configured yet.</p>
              <p className="text-sm mt-2">Create your first automation to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
