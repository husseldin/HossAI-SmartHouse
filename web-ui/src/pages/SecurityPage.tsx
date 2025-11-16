import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function SecurityPage() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiClient.getAlerts({ pageSize: 50 }),
  });

  const { data: vulnerabilities, isLoading: vulnsLoading } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: () => apiClient.getVulnerabilities({ pageSize: 50 }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => apiClient.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const criticalAlerts = alerts?.items.filter((a) => a.severity === 'critical' && !a.acknowledged).length || 0;
  const highAlerts = alerts?.items.filter((a) => a.severity === 'high' && !a.acknowledged).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="text-muted-foreground mt-1">Monitor security alerts and vulnerabilities</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{criticalAlerts}</p>
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">{highAlerts}</p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{vulnerabilities?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Vulnerabilities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>Recent security events and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : alerts && alerts.items.length > 0 ? (
            <div className="space-y-3">
              {alerts.items.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
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
                        <Badge variant="outline" className="text-xs">
                          {alert.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(alert.createdAt)}
                        </span>
                      </div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Source: {alert.source}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={acknowledgeMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No security alerts. Your system is secure.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vulnerabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Vulnerabilities</CardTitle>
          <CardDescription>Security issues found during scans</CardDescription>
        </CardHeader>
        <CardContent>
          {vulnsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : vulnerabilities && vulnerabilities.items.length > 0 ? (
            <div className="space-y-3">
              {vulnerabilities.items.map((vuln) => (
                <div key={vuln.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {vuln.cveId && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {vuln.cveId}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            vuln.severity === 'critical' || vuln.severity === 'high'
                              ? 'danger'
                              : vuln.severity === 'medium'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {vuln.severity}
                        </Badge>
                      </div>
                      <p className="font-medium mb-1">{vuln.description}</p>
                      {vuln.recommendation && (
                        <p className="text-sm text-muted-foreground">
                          Recommendation: {vuln.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No vulnerabilities detected.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
