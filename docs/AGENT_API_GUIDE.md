# Smart Home Agent API Guide

**For LLMs, AI Assistants, and Voice Control Systems**

This guide is designed for AI agents to understand and interact with the Smart Home Platform using natural language and structured API calls.

## Table of Contents

1. [Authentication](#authentication)
2. [Natural Language Queries](#natural-language-queries)
3. [Device Control](#device-control)
4. [Automation Creation](#automation-creation)
5. [System Context](#system-context)
6. [Available Actions](#available-actions)
7. [Examples](#examples)

---

## Authentication

All API requests require a Bearer token with the `agent` role.

```http
Authorization: Bearer <your-token>
```

**Getting a Token:**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "agent",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "username": "agent",
      "role": "agent"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Natural Language Queries

### Endpoint: POST /api/agent/query

Process natural language queries to get system information.

**Request:**

```json
{
  "query": "What devices are currently on?",
  "context": {}
}
```

**Supported Query Types:**

1. **Device Status**
   - "What devices are currently on?"
   - "Which lights are on in the living room?"
   - "Show me all active devices"

2. **Device List**
   - "List all devices"
   - "Show me all lights"
   - "What devices are in the bedroom?"

3. **Sensor Readings**
   - "What's the temperature in the bedroom?"
   - "Show me all sensor readings"
   - "What's the humidity level?"

4. **Automation Status**
   - "List all automations"
   - "Which automations are enabled?"
   - "Show me active automation rules"

5. **System Status**
   - "What's the system status?"
   - "How many devices are online?"
   - "Are there any alerts?"

**Response:**

```json
{
  "success": true,
  "message": "There are 5 devices currently on",
  "devices": [
    {
      "id": "device-123",
      "name": "Living Room Light",
      "type": "light",
      "room": "Living Room"
    }
  ]
}
```

---

## Device Control

### Endpoint: POST /api/agent/action

Execute device control actions using natural language.

**Request:**

```json
{
  "device": "living room light",
  "action": "turn on",
  "parameters": {}
}
```

**Supported Actions:**

| Action | Description | Parameters | Example |
|--------|-------------|------------|---------|
| `turn on` | Turn device on | None | `{ "device": "light", "action": "turn on" }` |
| `turn off` | Turn device off | None | `{ "device": "light", "action": "turn off" }` |
| `set brightness` | Set light brightness | `brightness: 0-100` | `{ "device": "light", "action": "set brightness", "parameters": { "brightness": 75 } }` |
| `set temperature` | Set thermostat temp | `temperature: number` | `{ "device": "thermostat", "action": "set temperature", "parameters": { "temperature": 22 } }` |
| `lock` | Lock door | None | `{ "device": "front door", "action": "lock" }` |
| `unlock` | Unlock door | None | `{ "device": "front door", "action": "unlock" }` |

**Device Identification:**

Devices can be identified by:
- **ID**: `device-123`
- **Name**: `"living room light"` (case-insensitive, partial match)
- **Alias**: `"main light"`, `"bedroom lamp"`

**Response:**

```json
{
  "success": true,
  "message": "Successfully executed \"turn on\" on \"Living Room Light\"",
  "device": "Living Room Light",
  "result": {
    "success": true,
    "state": "ON"
  }
}
```

---

## Automation Creation

### Endpoint: POST /api/agent/automation/create

Create automation rules from natural language descriptions.

**Request:**

```json
{
  "description": "Turn on the living room lights when motion is detected after sunset"
}
```

**Natural Language Patterns:**

1. **Trigger Keywords:**
   - "when motion is detected" → Motion sensor trigger
   - "when door opens" → Door sensor trigger
   - "at 7:00 AM" → Time-based trigger
   - "every morning at" → Scheduled trigger

2. **Condition Keywords:**
   - "after sunset" / "after dark" → Sun condition
   - "when home" / "if home" → Presence condition
   - "if temperature above X" → Numeric condition

3. **Action Keywords:**
   - "turn on the lights" → Device control action
   - "send notification" → Notification action
   - "set temperature to X" → Thermostat control

**Response:**

```json
{
  "success": true,
  "message": "Automation created successfully",
  "automation": {
    "id": "auto-1234567890",
    "name": "Turn on the living room lights when motion is...",
    "description": "Turn on the living room lights when motion is detected after sunset",
    "enabled": true
  }
}
```

---

## System Context

### Endpoint: GET /api/agent/context

Get current system state to understand what's available.

**Request:**

```bash
GET /api/agent/context
Authorization: Bearer <token>
```

**Response:**

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "devices": {
    "total": 25,
    "byStatus": {
      "online": 23,
      "offline": 2
    },
    "list": [
      {
        "id": "device-123",
        "name": "Living Room Light",
        "type": "light",
        "status": "online",
        "room": "Living Room",
        "floor": "Ground Floor"
      }
    ]
  },
  "alerts": {
    "total": 3,
    "recent": [
      {
        "id": "alert-456",
        "type": "new_device",
        "severity": "info",
        "message": "New device discovered",
        "createdAt": "2024-01-15T10:25:00Z"
      }
    ]
  },
  "automations": {
    "total": 10,
    "enabled": [
      {
        "id": "auto-789",
        "name": "Morning Routine",
        "description": "Turn on lights and adjust temperature in the morning"
      }
    ]
  },
  "hubs": {
    "total": 2,
    "list": [
      {
        "id": "edge-hub-living-room",
        "name": "Living Room Hub",
        "status": "online",
        "location": "Living Room"
      }
    ]
  }
}
```

**Use Cases:**

- **Before Control:** Check if device exists and is online
- **Planning Actions:** Understand available devices and their locations
- **Conversational Context:** Provide relevant information to users
- **Error Prevention:** Validate actions before execution

---

## Available Actions

### Endpoint: GET /api/agent/actions

Get list of all available actions and capabilities.

**Request:**

```bash
GET /api/agent/actions
Authorization: Bearer <token>
```

**Response:**

```json
{
  "deviceActions": [
    {
      "action": "turn_on",
      "description": "Turn on a device (lights, switches, plugs)",
      "parameters": []
    },
    {
      "action": "set_brightness",
      "description": "Set brightness of a light (0-100)",
      "parameters": [
        {
          "name": "brightness",
          "type": "number",
          "min": 0,
          "max": 100
        }
      ]
    }
  ],
  "queryTypes": [
    "device_status",
    "device_list",
    "sensor_reading",
    "automation_status",
    "system_status"
  ],
  "supportedDeviceTypes": [
    "light",
    "switch",
    "plug",
    "sensor",
    "thermostat",
    "lock",
    "camera",
    "speaker"
  ]
}
```

---

## Examples

### Example 1: Check Temperature and Adjust

**LLM Thought Process:**

1. User asks: "What's the bedroom temperature?"
2. Query system for sensor data
3. If too hot/cold, suggest or execute temperature adjustment

**API Calls:**

```bash
# 1. Query temperature
POST /api/agent/query
{
  "query": "What's the temperature in the bedroom?"
}

# Response: 18°C (user wants 22°C)

# 2. Adjust temperature
POST /api/agent/action
{
  "device": "bedroom thermostat",
  "action": "set temperature",
  "parameters": {
    "temperature": 22
  }
}
```

### Example 2: Turn Off All Lights Before Bedtime

**LLM Thought Process:**

1. User says: "Turn off all lights"
2. Get list of all light devices
3. Execute turn off for each light

**API Calls:**

```bash
# 1. Get context to find all lights
GET /api/agent/context

# 2. Turn off each light (or create automation)
POST /api/agent/action
{
  "device": "living room light",
  "action": "turn off"
}

POST /api/agent/action
{
  "device": "bedroom light",
  "action": "turn off"
}
```

### Example 3: Create Morning Routine

**User Request:**

"Create an automation that turns on the bedroom light at 7 AM on weekdays"

**API Call:**

```bash
POST /api/agent/automation/create
{
  "description": "Turn on the bedroom light at 7:00 AM on weekdays"
}
```

**Alternative (Advanced):**

Use the Flow API for complex automations:

```bash
POST /api/automations
{
  "name": "Morning Routine",
  "description": "Turn on bedroom light at 7 AM on weekdays",
  "trigger": {
    "type": "time",
    "time": "07:00",
    "weekdays": [1, 2, 3, 4, 5]
  },
  "conditions": [],
  "actions": [
    {
      "type": "device_control",
      "deviceId": "bedroom-light",
      "command": {
        "type": "power",
        "value": "ON"
      }
    }
  ],
  "enabled": true
}
```

### Example 4: Security Alert Response

**Scenario:** Motion detected at night

**LLM Response Flow:**

1. Receive alert via webhook or polling
2. Check time (is it night?)
3. Query: "Are any users home?"
4. If no users home: Execute security protocol
   - Turn on exterior lights
   - Send notification
   - Lock all doors

**API Calls:**

```bash
# 1. Check context
GET /api/agent/context

# 2. Execute security actions
POST /api/agent/action
{
  "device": "exterior lights",
  "action": "turn on"
}

POST /api/agent/action
{
  "device": "front door lock",
  "action": "lock"
}
```

### Example 5: Voice Command Processing

**User Voice Command:**

"Hey Assistant, turn on the living room lights to 50% brightness"

**LLM Processing:**

1. Parse intent: Device control
2. Extract entities:
   - Device: "living room lights"
   - Action: "turn on" + "set brightness"
   - Parameter: brightness = 50

**API Calls:**

```bash
# Single action with brightness
POST /api/agent/action
{
  "device": "living room light",
  "action": "set brightness",
  "parameters": {
    "brightness": 50
  }
}

# Note: Setting brightness also turns on the light
```

---

## Best Practices for LLMs

### 1. Always Get Context First

Before executing actions, call `/api/agent/context` to:
- Verify devices exist
- Check device status
- Understand current state

### 2. Graceful Error Handling

If action fails:
- Check if device is online
- Verify device supports the action
- Suggest alternatives to user

### 3. Confirm Before Critical Actions

For security-sensitive actions (unlock doors, disable alarms):
- Always confirm with user first
- Explain what will happen
- Provide option to cancel

### 4. Batch Similar Actions

Instead of multiple API calls:
- Create automation for recurring actions
- Use scripting for complex multi-step operations

### 5. Natural Responses

Convert API responses to natural language:

❌ Bad: `{"success": true, "devices": [...]}`

✅ Good: "I found 5 lights that are currently on: Living Room Light, Bedroom Light..."

### 6. Context Awareness

Maintain conversation context:
- Remember recently mentioned devices
- Track user preferences
- Learn from corrections

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `404 Device not found` | Device name/ID invalid | Check spelling, use context API |
| `403 Forbidden` | Insufficient permissions | Verify token has `agent` role |
| `500 Internal error` | Service unavailable | Retry with exponential backoff |
| `400 Invalid action` | Device doesn't support action | Check device capabilities |

### Example Error Response

```json
{
  "success": false,
  "message": "Device \"magic lamp\" not found",
  "error": "DEVICE_NOT_FOUND"
}
```

**LLM Response:**

"I couldn't find a device called 'magic lamp'. Did you mean 'living room lamp'?"

---

## Rate Limits

- **Query API**: 60 requests/minute
- **Action API**: 30 requests/minute
- **Automation API**: 10 requests/minute

Exceeding limits returns `429 Too Many Requests`.

---

## Webhooks (Future)

For real-time events, subscribe to webhooks:

```json
{
  "url": "https://your-assistant.com/webhook",
  "events": ["device.state_changed", "alert.created", "automation.triggered"]
}
```

---

## Support

- **Documentation**: [https://docs.smarthome.local](https://docs.smarthome.local)
- **API Reference**: [OpenAPI Spec](/api/docs)
- **Examples**: [GitHub Repository](https://github.com/your-repo)

---

**Last Updated:** January 2025
**API Version:** 1.0
**Compatibility:** All LLM agents with HTTP API support
