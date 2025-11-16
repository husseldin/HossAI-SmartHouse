/**
 * Logs Viewer Page
 * Centralized log viewing for all services
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

export function LogsPage() {
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch logs
  const { data: logs, isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ['logs', selectedService, selectedLevel],
    queryFn: async () => {
      // Mock data - in production, call actual logs endpoint
      return Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        level: ['error', 'warn', 'info', 'debug'][Math.floor(Math.random() * 4)] as any,
        service: [
          'api-gateway',
          'device-service',
          'network-service',
          'security-service',
          'automation-engine',
        ][Math.floor(Math.random() * 5)],
        message: [
          'Successfully processed device control command',
          'Network scan completed for subnet 192.168.1.0/24',
          'New device discovered: Living Room Light',
          'Automation "Morning Routine" executed successfully',
          'Failed to connect to device: timeout after 5000ms',
          'Database query took 245ms',
          'MQTT message published to topic: device/123/state',
          'User authentication successful',
          'Rate limit exceeded for IP 192.168.1.50',
          'Security alert: suspicious port scan detected',
        ][Math.floor(Math.random() * 10)],
        metadata: {
          requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
          userId: Math.random() > 0.5 ? 'user-123' : undefined,
        },
      }));
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const services = [
    'all',
    'api-gateway',
    'device-service',
    'network-service',
    'security-service',
    'automation-engine',
    'integration-manager',
  ];

  const levels = ['all', 'error', 'warn', 'info', 'debug'];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warn':
        return 'bg-yellow-100 text-yellow-700';
      case 'info':
        return 'bg-blue-100 text-blue-700';
      case 'debug':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'debug':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredLogs = logs?.filter((log) => {
    if (selectedService !== 'all' && log.service !== selectedService) return false;
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const downloadLogs = () => {
    const logsText = filteredLogs
      ?.map((log) => {
        return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.service}] ${log.message}`;
      })
      .join('\n');

    const blob = new Blob([logsText || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarthome-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Logs</h1>
        <div className="text-gray-500">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-gray-600 mt-1">Centralized logging from all services</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={downloadLogs}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Service</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {services.map((service) => (
                <option key={service} value={service}>
                  {service === 'all' ? 'All Services' : service}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level === 'all' ? 'All Levels' : level.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredLogs?.length}</span> of{' '}
            <span className="font-medium">{logs?.length}</span> logs
          </div>
          <div className="flex gap-2">
            <Badge className="bg-red-100 text-red-700">
              {logs?.filter((l) => l.level === 'error').length} errors
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-700">
              {logs?.filter((l) => l.level === 'warn').length} warnings
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              {logs?.filter((l) => l.level === 'info').length} info
            </Badge>
          </div>
        </div>
      </Card>

      {/* Logs List */}
      <Card className="p-0 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredLogs && filteredLogs.length > 0 ? (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${getLevelColor(log.level)}`}>
                      {getLevelIcon(log.level)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <Badge variant="default" className="text-xs">
                          {log.service}
                        </Badge>
                        <Badge className={`text-xs ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-900 mb-1">{log.message}</div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-xs text-gray-500 font-mono mt-2">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {JSON.stringify(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No logs found matching your filters</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
