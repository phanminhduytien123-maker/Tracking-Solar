// ESP32-S3 Real-time WebSocket & REST Communication Service

export class ESP32CommunicationService {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || 'ws://192.168.4.1/ws';
    this.restUrl = options.restUrl || 'http://192.168.4.1/api/telemetry';
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.onTelemetry = options.onTelemetry || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});

    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.lastPingTime = 0;
    this.latencyMs = 0;
    this.useMock = options.useMock !== undefined ? options.useMock : true;
  }

  setWsUrl(url) {
    this.wsUrl = url;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }

  setUseMock(value) {
    this.useMock = value;
    if (value && this.ws) {
      this.disconnect();
    } else if (!value && !this.isConnected) {
      this.connect();
    }
  }

  connect() {
    if (this.useMock) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.onStatusChange({ connected: false, connecting: true, latency: 0 });

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.lastPingTime = Date.now();
        this.onStatusChange({ connected: true, connecting: false, latency: this.latencyMs });
        console.log('[ESP32-S3] WebSocket Connected to', this.wsUrl);

        // Start ping loop
        this.sendPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            this.latencyMs = Date.now() - this.lastPingTime;
            this.onStatusChange({ connected: true, connecting: false, latency: this.latencyMs });
            return;
          }

          // Format incoming telemetry
          this.onTelemetry(data);
        } catch (e) {
          console.error('[ESP32-S3] Malformed JSON received:', event.data, e);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.onStatusChange({ connected: false, connecting: false, latency: 0 });
        console.warn('[ESP32-S3] WebSocket Closed:', event.reason || 'Connection lost');
        
        if (!this.useMock) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.onError(err);
        this.onStatusChange({ connected: false, connecting: false, latency: 0 });
      };
    } catch (err) {
      this.onError(err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.useMock && !this.isConnected) {
        console.log('[ESP32-S3] Retrying WebSocket connection...');
        this.connect();
      }
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.onStatusChange({ connected: false, connecting: false, latency: 0 });
  }

  sendPing() {
    if (!this.isConnected || !this.ws) return;
    this.lastPingTime = Date.now();
    try {
      this.ws.send(JSON.stringify({ cmd: 'ping', t: this.lastPingTime }));
    } catch (e) {
      console.error('[ESP32-S3] Ping failed', e);
    }
  }

  sendCommand(commandObj) {
    if (this.useMock) {
      console.log('[Mock Mode] Command executed locally:', commandObj);
      return true;
    }

    if (!this.isConnected || !this.ws) {
      console.warn('[ESP32-S3] Cannot send command: Not connected to ESP32');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(commandObj));
      return true;
    } catch (e) {
      console.error('[ESP32-S3] Send command failed:', e);
      return false;
    }
  }

  // Helper command wrappers
  setMode(mode) {
    return this.sendCommand({ cmd: 'set_mode', mode });
  }

  jog(axis, steps, deg = 1.0) {
    return this.sendCommand({ cmd: 'jog', axis, steps, deg });
  }

  calibrate() {
    return this.sendCommand({ cmd: 'calibrate', action: 'ZERO_ENCODER' });
  }

  triggerPSO() {
    return this.sendCommand({ cmd: 'pso_trigger' });
  }

  park() {
    return this.sendCommand({ cmd: 'park' });
  }

  setEstop(state) {
    return this.sendCommand({ cmd: 'estop', state });
  }

  // REST API Fallback
  async fetchTelemetryHttp() {
    try {
      const response = await fetch(this.restUrl, { method: 'GET', cache: 'no-cache' });
      if (response.ok) {
        const data = await response.json();
        this.onTelemetry(data);
        return data;
      }
    } catch (err) {
      this.onError(err);
    }
    return null;
  }
}
