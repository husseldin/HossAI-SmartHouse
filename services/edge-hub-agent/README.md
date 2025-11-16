# Edge Hub Agent

Lightweight agent for Raspberry Pi that manages Zigbee, Z-Wave, and Bluetooth devices.

## Features

- **Zigbee Support**: Connect Zigbee devices via USB adapter
- **Z-Wave Support**: Connect Z-Wave devices via USB adapter
- **Bluetooth Support**: Connect Bluetooth LE devices (coming soon)
- **MQTT Communication**: Real-time communication with main controller
- **Health Monitoring**: Automatic heartbeat and health reporting
- **Device Discovery**: Automatic device pairing and discovery
- **Local API**: REST API for local management

## Hardware Requirements

### Recommended Setup
- **Raspberry Pi 4** (4GB RAM or more) - Best performance
- **Raspberry Pi 3B+** - Minimum, works well for most setups
- **MicroSD Card**: 32GB or larger, Class 10
- **Power Supply**: Official Raspberry Pi power supply recommended
- **Network**: Ethernet connection recommended (WiFi works but less reliable)

### USB Adapters

#### Zigbee Adapters (choose one):
- **ConBee II** (recommended) - Works out of the box
- **Sonoff Zigbee 3.0 USB Dongle Plus** - Good value
- **HUSBZB-1** - Zigbee + Z-Wave combo (North America only)

#### Z-Wave Adapters (choose one):
- **Aeotec Z-Stick Gen5+** (recommended)
- **Zooz Z-Wave Plus S2 Stick ZST10**
- **HUSBZB-1** - Zigbee + Z-Wave combo

## Installation

### Option 1: Docker Compose (Recommended)

1. **Clone repository** on your Raspberry Pi:
   ```bash
   git clone <repo-url>
   cd services/edge-hub-agent
   ```

2. **Create .env file**:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Configure .env**:
   ```env
   # Set unique hub ID
   HUB_ID=edge-hub-living-room
   HUB_NAME=Living Room Hub
   HUB_LOCATION=Living Room

   # Point to your main controller
   CONTROLLER_HOST=192.168.1.100
   CONTROLLER_MQTT_PORT=1883

   # MQTT credentials (must match controller)
   MQTT_USERNAME=edge-hub
   MQTT_PASSWORD=your-secure-password

   # Enable protocols you have adapters for
   ENABLE_ZIGBEE=true
   ENABLE_ZWAVE=true

   # USB device paths (check with: ls /dev/tty*)
   ZIGBEE_PORT=/dev/ttyUSB0
   ZWAVE_PORT=/dev/ttyACM0
   ```

4. **Find your USB adapter paths**:
   ```bash
   ls /dev/tty*
   # Look for /dev/ttyUSB0, /dev/ttyACM0, etc.

   # Check adapter details:
   dmesg | grep tty
   ```

5. **Start the agent**:
   ```bash
   docker-compose up -d
   ```

6. **Check logs**:
   ```bash
   docker-compose logs -f
   ```

### Option 2: Direct Installation

1. **Install Node.js 20**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd services/edge-hub-agent
   npm install
   npm run build
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Start agent**:
   ```bash
   npm start
   ```

5. **Run as systemd service** (optional):
   ```bash
   sudo cp edge-hub-agent.service /etc/systemd/system/
   sudo systemctl enable edge-hub-agent
   sudo systemctl start edge-hub-agent
   ```

## Configuration

### Zigbee Configuration

#### Adapter Types
- `ezsp` - For ConBee II, Sonoff, HUSBZB-1
- `deconz` - For ConBee/RaspBee
- `zigate` - For ZiGate
- `zstack` - For CC2531

#### Channel Selection
- Channel 11 (default) - Good choice if WiFi on channel 1-6
- Channel 15 - If WiFi on channel 1-6
- Channel 20 - If WiFi on channel 6-11
- Channel 25 - If WiFi on channel 11+

**Recommendation**: Keep Zigbee and WiFi on non-overlapping channels.

### Z-Wave Configuration

Z-Wave operates on different frequencies by region:
- **US/Canada**: 908.42 MHz
- **EU**: 868.42 MHz
- **ANZ**: 921.42 MHz

Ensure your Z-Wave adapter matches your region!

## Usage

### Pairing Devices

#### Zigbee Devices:
1. Open Web UI → Edge Hubs
2. Click on your hub
3. Click "Enable Pairing Mode" (60 seconds)
4. Put Zigbee device in pairing mode (consult device manual)
5. Device will auto-discover and appear in Devices page

#### Z-Wave Devices:
1. Open Web UI → Edge Hubs
2. Click on your hub
3. Click "Enable Z-Wave Inclusion" (60 seconds)
4. Press inclusion button on Z-Wave device (consult device manual)
5. Device will appear in Devices page

### Monitoring

- **Web UI**: Dashboard → Edge Hubs shows all hubs and their status
- **Local API**: `http://<raspberry-pi-ip>:8080/info`
- **Logs**: `docker-compose logs -f edge-hub-agent`

### Health Checks

The agent sends heartbeats every 10 seconds with:
- CPU usage
- Memory usage
- Disk usage
- CPU temperature (Raspberry Pi only)
- Network connectivity
- Adapter status
- Device count

## Troubleshooting

### Hub shows offline
1. Check network connectivity: `ping <controller-ip>`
2. Verify MQTT credentials in .env
3. Check logs: `docker-compose logs -f`
4. Restart: `docker-compose restart`

### USB adapter not detected
1. List USB devices: `lsusb`
2. Check /dev devices: `ls -la /dev/tty*`
3. Verify permissions: `docker-compose logs | grep "permission denied"`
4. Try different USB port
5. Check USB adapter is compatible

### Devices not pairing
1. Ensure adapter is working: check hub status in Web UI
2. Verify pairing mode is enabled
3. Reset device and try again (consult device manual)
4. Check Zigbee channel conflicts with WiFi
5. Move device closer to hub during pairing

### High CPU/Memory usage
1. Reduce device count per hub
2. Increase HEALTH_CHECK_INTERVAL in .env
3. Disable unused protocol adapters
4. Check for firmware updates on adapters

## Security

### MQTT Authentication
Always use strong passwords for MQTT:
```env
MQTT_PASSWORD=$(openssl rand -base64 32)
```

### mTLS (Production)
For production deployments, enable mTLS:

1. Generate certificates (on controller):
   ```bash
   # CA certificate
   openssl genrsa -out ca.key 4096
   openssl req -new -x509 -days 1826 -key ca.key -out ca.crt

   # Client certificate
   openssl genrsa -out client.key 4096
   openssl req -new -key client.key -out client.csr
   openssl x509 -req -days 730 -in client.csr -CA ca.crt -CAkey ca.key -out client.crt
   ```

2. Copy to hub:
   ```bash
   scp ca.crt client.crt client.key pi@<hub-ip>:/home/pi/edge-hub-agent/certs/
   ```

3. Enable in .env:
   ```env
   MQTT_USE_TLS=true
   ```

### Firewall
If using firewall, allow:
- **Outbound**: MQTT to controller (port 1883 or 8883)
- **Inbound**: Local API (port 8080, optional)

## Performance

### Recommended Limits
- **Devices per hub**: 50-100 (depends on traffic)
- **Zigbee devices**: Up to 50 per hub
- **Z-Wave devices**: Up to 100 per hub
- **Bluetooth devices**: Up to 20 per hub (limited by Bluetooth spec)

### Scaling
For large deployments:
- Deploy multiple Raspberry Pi hubs
- Distribute devices geographically
- Use wired Ethernet for hub connectivity

## Updates

### Update Docker Image
```bash
cd services/edge-hub-agent
docker-compose pull
docker-compose up -d
```

### Update Source Code
```bash
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

## Support

- Documentation: See `docs/PHASE5_SUMMARY.md`
- Issues: GitHub Issues
- Logs: `docker-compose logs -f`

## License

See main project LICENSE file.
