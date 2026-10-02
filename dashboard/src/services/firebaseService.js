// Firebase Realtime Database Service for Dual-Axis Solar Tracking DATN
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, off } from 'firebase/database';

export class FirebaseSolarService {
  constructor(config = {}) {
    this.config = config;
    this.app = null;
    this.db = null;
    this.solarRef = null;
    this.controlRef = null;
    this.isConnected = false;
    this.onTelemetry = () => {};
    this.onStatusChange = () => {};
    this.onError = () => {};
  }

  init(config, callbacks = {}) {
    this.config = config;
    this.onTelemetry = callbacks.onTelemetry || (() => {});
    this.onStatusChange = callbacks.onStatusChange || (() => {});
    this.onError = callbacks.onError || (() => {});

    if (!config.databaseURL || !config.apiKey) {
      console.warn('[Firebase] Incomplete Firebase configuration');
      return false;
    }

    try {
      this.app = getApps().length === 0 ? initializeApp(config) : getApp();
      this.db = getDatabase(this.app);
      this.connect();
      return true;
    } catch (err) {
      console.error('[Firebase Init Error]', err);
      this.onError(err);
      return false;
    }
  }

  connect() {
    if (!this.db) return;

    this.onStatusChange({ connected: false, connecting: true });

    // Listen to device telemetry
    this.solarRef = ref(this.db, 'solar');
    onValue(
      this.solarRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          this.isConnected = true;
          this.onStatusChange({ connected: true, connecting: false });

          // Map Firebase schema into unified dashboard telemetry
          const mappedTelemetry = this.mapFirebaseToTelemetry(data);
          this.onTelemetry(mappedTelemetry);
        }
      },
      (error) => {
        this.isConnected = false;
        this.onStatusChange({ connected: false, connecting: false });
        this.onError(error);
      }
    );
  }

  disconnect() {
    if (this.solarRef) {
      off(this.solarRef);
      this.solarRef = null;
    }
    this.isConnected = false;
    this.onStatusChange({ connected: false, connecting: false });
  }

  mapFirebaseToTelemetry(fbData) {
    const tracking = fbData.tracking || {};
    const staticPanel = fbData.static || {};
    const algo = fbData.algorithm || {};

    const trkVolt = Number(tracking.voltage || 0);
    const trkCurr = Number(tracking.current || 0);
    const trkPower = Number(tracking.power || trkVolt * trkCurr);

    const staVolt = Number(staticPanel.voltage || 0);
    const staCurr = Number(staticPanel.current || 0);
    const staPower = Number(staticPanel.power || staVolt * staCurr);

    const efficiencyGain = staPower > 0 ? ((trkPower - staPower) / staPower) * 100 : 0;

    return {
      timestamp: tracking.lastUpdate || Date.now(),
      system: {
        online: true,
        isMock: false,
        source: 'firebase',
        mode: tracking.mode || 'AUTO',
        activeAlgorithm: algo.name || 'Fuzzy-PID & PSO',
        estop: tracking.estop || false,
        nightMode: tracking.nightMode || false,
        rainWindSafeMode: tracking.safeMode || false
      },
      ina219: {
        tracking: {
          voltage: trkVolt,
          current: trkCurr,
          power: trkPower,
          dailyEnergyKWh: Number(tracking.dailyEnergy || 0)
        },
        static: {
          voltage: staVolt,
          current: staCurr,
          power: staPower,
          dailyEnergyKWh: Number(staticPanel.dailyEnergy || 0)
        },
        efficiencyGainPercent: Math.max(0, efficiencyGain)
      },
      angles: {
        azimuth: Number(tracking.azimuthAngle || 0),
        elevation: Number(tracking.elevationAngle || 0),
        targetAzimuth: Number(tracking.targetAzimuth || tracking.azimuthAngle || 0),
        targetElevation: Number(tracking.targetElevation || tracking.elevationAngle || 0),
        staticAzimuth: Number(staticPanel.fixedAzimuth || 180),
        staticElevation: Number(staticPanel.fixedElevation || 15)
      },
      ldr: {
        top: Number(tracking.ldrTop || 0),
        bottom: Number(tracking.ldrBottom || 0),
        left: Number(tracking.ldrLeft || 0),
        right: Number(tracking.ldrRight || 0)
      },
      algorithmMetrics: {
        kp: Number(algo.kp || 2.5),
        ki: Number(algo.ki || 0.05),
        kd: Number(algo.kd || 0.8),
        psoBestFitness: Number(algo.psoBestFitness || 0.98),
        psoIteration: Number(algo.psoIteration || 10)
      }
    };
  }

  // Send Remote Control Command from Web to ESP32
  async sendCommand(commandObj) {
    if (!this.db) {
      console.warn('[Firebase] Database not connected');
      return false;
    }

    try {
      const controlRef = ref(this.db, 'solar/control');
      await set(controlRef, {
        ...commandObj,
        timestamp: Date.now()
      });
      return true;
    } catch (err) {
      console.error('[Firebase Send Command Error]', err);
      return false;
    }
  }

  async setMode(mode) {
    return this.sendCommand({ cmd: 'set_mode', mode });
  }

  async jogMotor(axis, direction, step = 5) {
    return this.sendCommand({ cmd: 'jog', axis, direction, step });
  }

  async setEstop(enabled) {
    return this.sendCommand({ cmd: 'estop', state: enabled });
  }
}
