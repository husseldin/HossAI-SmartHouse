/**
 * Automation Flow Editor Page
 * Visual flow builder for creating complex automations
 */

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  Save,
  Play,
  Trash2,
  Clock,
  Zap,
  Filter,
  GitBranch,
  Pause,
  CheckCircle2,
} from 'lucide-react';

interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'branch';
  config: Record<string, any>;
  position: { x: number; y: number };
  next?: string[];
}

interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  enabled: boolean;
}

export function AutomationFlowEditorPage() {
  const [flow, setFlow] = useState<Flow>({
    id: 'new-flow',
    name: 'New Automation Flow',
    description: '',
    nodes: [],
    enabled: true,
  });

  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showNodePalette, setShowNodePalette] = useState(false);

  const nodeTypes = [
    {
      type: 'trigger',
      icon: Zap,
      label: 'Trigger',
      color: 'bg-green-500',
      description: 'Start the automation when an event occurs',
    },
    {
      type: 'condition',
      icon: Filter,
      label: 'Condition',
      color: 'bg-blue-500',
      description: 'Check if conditions are met before continuing',
    },
    {
      type: 'action',
      icon: CheckCircle2,
      label: 'Action',
      color: 'bg-purple-500',
      description: 'Execute an action (control device, send notification)',
    },
    {
      type: 'delay',
      icon: Pause,
      label: 'Delay',
      color: 'bg-orange-500',
      description: 'Wait for a specified duration',
    },
    {
      type: 'branch',
      icon: GitBranch,
      label: 'Branch',
      color: 'bg-pink-500',
      description: 'Split flow based on a condition (if/else)',
    },
  ];

  const addNode = (type: string) => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: type as any,
      config: {},
      position: { x: 100, y: flow.nodes.length * 100 + 100 },
      next: [],
    };

    setFlow({
      ...flow,
      nodes: [...flow.nodes, newNode],
    });

    setSelectedNode(newNode);
    setShowNodePalette(false);
  };

  const deleteNode = (nodeId: string) => {
    setFlow({
      ...flow,
      nodes: flow.nodes.filter((n) => n.id !== nodeId),
    });
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, any>) => {
    setFlow({
      ...flow,
      nodes: flow.nodes.map((n) => (n.id === nodeId ? { ...n, config } : n)),
    });
  };

  const saveFlow = async () => {
    console.log('Saving flow:', flow);
    // In production: POST /api/automations/flows
    alert('Flow saved successfully!');
  };

  const testFlow = async () => {
    console.log('Testing flow:', flow);
    // In production: POST /api/automations/flows/{id}/test
    alert('Flow test started!');
  };

  return (
    <div className="p-6 max-w-full h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Flow Editor</h1>
          <p className="text-gray-600 mt-1">Visual automation flow builder</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={testFlow}>
            <Play className="w-4 h-4 mr-2" />
            Test Flow
          </Button>
          <Button onClick={saveFlow}>
            <Save className="w-4 h-4 mr-2" />
            Save Flow
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <Card className="h-full p-6 bg-gray-50 overflow-auto">
            {/* Flow Info */}
            <div className="mb-4">
              <input
                type="text"
                value={flow.name}
                onChange={(e) => setFlow({ ...flow, name: e.target.value })}
                className="text-lg font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                placeholder="Flow Name"
              />
              <textarea
                value={flow.description}
                onChange={(e) => setFlow({ ...flow, description: e.target.value })}
                className="text-sm text-gray-600 bg-transparent mt-2 w-full resize-none focus:outline-none"
                placeholder="Description (optional)"
                rows={2}
              />
            </div>

            {/* Add Node Button */}
            {flow.nodes.length === 0 && (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
                <Button onClick={() => setShowNodePalette(!showNodePalette)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Node
                </Button>
              </div>
            )}

            {/* Flow Nodes */}
            <div className="space-y-4">
              {flow.nodes.map((node, index) => {
                const nodeType = nodeTypes.find((t) => t.type === node.type);
                const Icon = nodeType?.icon || Zap;

                return (
                  <div key={node.id}>
                    {/* Node Card */}
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        selectedNode?.id === node.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                      }`}
                      onClick={() => setSelectedNode(node)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`${nodeType?.color} p-2 rounded-lg text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{nodeType?.label}</span>
                              <Badge variant="default" className="text-xs">
                                {node.type}
                              </Badge>
                            </div>

                            {node.type === 'trigger' && (
                              <div className="text-sm text-gray-600">
                                Trigger: {node.config.triggerType || 'Not configured'}
                              </div>
                            )}

                            {node.type === 'condition' && (
                              <div className="text-sm text-gray-600">
                                Conditions:{' '}
                                {node.config.conditions?.length || 0} rule(s)
                              </div>
                            )}

                            {node.type === 'action' && (
                              <div className="text-sm text-gray-600">
                                Action: {node.config.actionType || 'Not configured'}
                              </div>
                            )}

                            {node.type === 'delay' && (
                              <div className="text-sm text-gray-600">
                                Delay: {node.config.duration ? `${node.config.duration / 1000}s` : 'Not set'}
                              </div>
                            )}

                            {node.type === 'branch' && (
                              <div className="text-sm text-gray-600">If/Else Branch</div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>

                    {/* Connection Line */}
                    {index < flow.nodes.length - 1 && (
                      <div className="flex items-center justify-center py-2">
                        <div className="w-0.5 h-8 bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Node Button (after nodes) */}
              {flow.nodes.length > 0 && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowNodePalette(!showNodePalette)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Node
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Node Palette Sidebar */}
        {showNodePalette && (
          <Card className="w-80 p-4">
            <h3 className="font-semibold mb-4">Add Node</h3>
            <div className="space-y-2">
              {nodeTypes.map((nodeType) => {
                const Icon = nodeType.icon;
                return (
                  <button
                    key={nodeType.type}
                    onClick={() => addNode(nodeType.type)}
                    className="w-full text-left p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${nodeType.color} p-2 rounded text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{nodeType.label}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {nodeType.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Properties Panel */}
        {selectedNode && (
          <Card className="w-96 p-4 overflow-auto">
            <h3 className="font-semibold mb-4">Node Properties</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Node Type</label>
                <Badge variant="default">{selectedNode.type}</Badge>
              </div>

              {selectedNode.type === 'trigger' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Trigger Type</label>
                    <select
                      value={selectedNode.config.triggerType || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode.id, {
                          ...selectedNode.config,
                          triggerType: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select trigger...</option>
                      <option value="state">Device State Change</option>
                      <option value="time">Time/Schedule</option>
                      <option value="event">Event</option>
                      <option value="webhook">Webhook</option>
                    </select>
                  </div>

                  {selectedNode.config.triggerType === 'state' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Entity</label>
                        <input
                          type="text"
                          placeholder="Device ID or name"
                          value={selectedNode.config.entity || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.config,
                              entity: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Attribute</label>
                        <input
                          type="text"
                          placeholder="e.g., power, temperature"
                          value={selectedNode.config.attribute || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.config,
                              attribute: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Value</label>
                        <input
                          type="text"
                          placeholder="e.g., ON, detected, 22"
                          value={selectedNode.config.value || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.config,
                              value: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    </>
                  )}

                  {selectedNode.config.triggerType === 'time' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Time</label>
                      <input
                        type="time"
                        value={selectedNode.config.time || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            ...selectedNode.config,
                            time: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  )}
                </>
              )}

              {selectedNode.type === 'action' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Action Type</label>
                    <select
                      value={selectedNode.config.actionType || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode.id, {
                          ...selectedNode.config,
                          actionType: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select action...</option>
                      <option value="device_control">Device Control</option>
                      <option value="notification">Send Notification</option>
                      <option value="http_request">HTTP Request</option>
                      <option value="mqtt_publish">MQTT Publish</option>
                      <option value="script">Run Script</option>
                    </select>
                  </div>

                  {selectedNode.config.actionType === 'device_control' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Device</label>
                        <input
                          type="text"
                          placeholder="Device ID or name"
                          value={selectedNode.config.target || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.config,
                              target: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Command</label>
                        <textarea
                          placeholder='e.g., { "type": "power", "value": "ON" }'
                          value={JSON.stringify(selectedNode.config.params || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const params = JSON.parse(e.target.value);
                              updateNodeConfig(selectedNode.id, {
                                ...selectedNode.config,
                                params,
                              });
                            } catch {}
                          }}
                          className="w-full p-2 border rounded font-mono text-sm"
                          rows={4}
                        />
                      </div>
                    </>
                  )}

                  {selectedNode.config.actionType === 'notification' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          placeholder="Notification title"
                          value={selectedNode.config.params?.title || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.config,
                              params: {
                                ...selectedNode.config.params,
                                title: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Message</label>
                        <textarea
                          placeholder="Notification message"
                          value={selectedNode.config.params?.message || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.config,
                              params: {
                                ...selectedNode.config.params,
                                message: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border rounded"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {selectedNode.type === 'delay' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 60"
                    value={(selectedNode.config.duration || 0) / 1000}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.config,
                        duration: parseInt(e.target.value) * 1000,
                      })
                    }
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Flow will pause for this duration before continuing
                  </p>
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Conditions are advanced. Use JSON editor:
                  </p>
                  <textarea
                    value={JSON.stringify(selectedNode.config, null, 2)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        updateNodeConfig(selectedNode.id, config);
                      } catch {}
                    }}
                    className="w-full p-2 border rounded font-mono text-xs"
                    rows={8}
                  />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
