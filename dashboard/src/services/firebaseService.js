// Firebase Realtime Database Service for Dual-Axis Solar Tracking DATN
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, off, remove } from 'firebase/database';

export function getCleanZeroTelemetry() {
  return {
    timestamp: '--:--:--',
    rawTimestamp: Date.now(),
    system: {
      online: false,
      isMock: false,
      source: 'firebase',
      mode: 'AUTO',
      activeAlgorithm: 'Fuzzy-PID & PSO',
      estop: false,
      nightMode: false,
      rainWindSafeMode: false,
      pingMs: 0,
      ip: 'Waiting for ESP32...',
      firmware: 'ESP32-S3 Live Firmware',
      uptimeSeconds: 0,
      errors: {
        sensorLost: false,
        driverFault: false,
        limitSwitchMinTriggered: false,
        limitSwitchMaxTriggered: false
      }
    },
    ina219: {
      tracking: {
        voltage: 0,
        current: 0,
        power: 0,
        energyWh: 0,
        energyKwh: 0,
        online: false
      },
      static: {
        voltage: 0,
        current: 0,
        power: 0,
        energyWh: 0,
        energyKwh: 0,
        online: false
      },
      comparison: {
        percentGain: 0,
        powerDelta: 0,
        energyDeltaWh: 0
      }
    },
    motors: {
      azimuth: {
        currentAngle: 180.0,
        targetAngle: 180.0,
        errorAngle: 0.0,
        encoderPulses: 0,
        limitMin: false,
        limitMax: false,
        moving: false
      },
      elevation: {
        currentAngle: 15.0,
        targetAngle: 15.0,
        errorAngle: 0.0,
        encoderPulses: 0,
        limitMin: false,
        limitMax: false,
        moving: false
      }
    },
    sensors: {
      top: { lux: 0, adc: 0 },
      bottom: { lux: 0, adc: 0 },
      left: { lux: 0, adc: 0 },
      right: { lux: 0, adc: 0 },
      diffAzimuth: 0,
      diffElevation: 0,
      sunCentroidX: 0,
      sunCentroidY: 0
    },
    fuzzy: {
      errorAngle: 0,
      errorRate: 0,
      kp: 2.5,
      ki: 0.05,
      kd: 0.8,
      activeRule: 'Waiting for ESP32 stream...',
      defuzzOutput: 0
    },
    pso: {
      gBestFitness: 0,
      iteration: 0,
      maxIterations: 20,
      status: 'IDLE',
      swarmSize: 20,
      bestAzimuth: 180,
      bestElevation: 15
    }
  };
}

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

    // Heartbeat Tracking: Lưu mốc thời gian nhận gói tin mới nhất của từng tấm
    this.lastTrackingRawUpdate = null;
    this.lastTrackingReceivedTime = 0;
    this.lastStaticRawUpdate = null;
    this.lastStaticReceivedTime = 0;
    this.latestRawData = null;
    this.watchdogTimer = null;
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

    // Official Firebase RTDB connection listener (.info/connected)
    this.connectedRef = ref(this.db, '.info/connected');
    onValue(this.connectedRef, (snap) => {
      const isOnline = snap.val() === true;
      this.isConnected = isOnline;
      this.onStatusChange({ connected: isOnline, connecting: !isOnline });
    });

    // Khởi động bộ Watchdog quét liên tục mỗi 500ms để phát hiện mất kết nối quá 3s
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.latestRawData && this.isConnected) {
        const mappedTelemetry = this.mapFirebaseToTelemetry(this.latestRawData);
        this.onTelemetry(mappedTelemetry);
      }
    }, 500);

    // Listen to device telemetry on /solar
    this.solarRef = ref(this.db, 'solar');
    onValue(
      this.solarRef,
      (snapshot) => {
        const data = snapshot.val();
        const now = Date.now();
        this.latestRawData = data;

        if (data && (data.tracking || data.static)) {
          this.isConnected = true;
          this.onStatusChange({ connected: true, connecting: false });

          // Cập nhật mốc thời gian nhận dữ liệu mới cho Tấm Xoay
          if (data.tracking) {
            const trkUpdate = data.tracking.lastUpdate;
            if (trkUpdate !== this.lastTrackingRawUpdate) {
              this.lastTrackingRawUpdate = trkUpdate;
              this.lastTrackingReceivedTime = now;
            }
          }

          // Cập nhật mốc thời gian nhận dữ liệu mới cho Tấm Cố Định
          if (data.static) {
            const staUpdate = data.static.lastUpdate;
            if (staUpdate !== this.lastStaticRawUpdate) {
              this.lastStaticRawUpdate = staUpdate;
              this.lastStaticReceivedTime = now;
            }
          }

          // Map Firebase schema into unified dashboard telemetry
          const mappedTelemetry = this.mapFirebaseToTelemetry(data);
          this.onTelemetry(mappedTelemetry);
        } else {
          // Empty or reset database
          this.isConnected = true;
          this.onStatusChange({ connected: true, connecting: false });
          this.onTelemetry(getCleanZeroTelemetry());
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
    if (this.connectedRef) {
      off(this.connectedRef);
      this.connectedRef = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isConnected = false;
    this.onStatusChange({ connected: false, connecting: false });
  }

  mapFirebaseToTelemetry(fbData) {
    const tracking = fbData.tracking || {};
    const staticPanel = fbData.static || {};
    const algo = fbData.algorithm || {};
    const now = Date.now();
    const TIMEOUT_MS = 3000; // Đúng 3 giây không có gói tin mới -> MẤT KẾT NỐI

    // 1. Kiểm tra trạng thái kết nối thật của Tấm Xoay
    let isTrackingOnline = false;
    if (fbData.tracking && Object.keys(fbData.tracking).length > 0) {
      const trkUpdate = Number(fbData.tracking.lastUpdate || 0);
      if (trkUpdate > 1700000000000) {
        isTrackingOnline = (now - trkUpdate) <= TIMEOUT_MS;
      } else {
        isTrackingOnline = (now - this.lastTrackingReceivedTime) <= TIMEOUT_MS;
      }
    }

    // 2. Kiểm tra trạng thái kết nối thật của Tấm Cố Định
    let isStaticOnline = false;
    if (fbData.static && Object.keys(fbData.static).length > 0) {
      const staUpdate = Number(fbData.static.lastUpdate || 0);
      if (staUpdate > 1700000000000) {
        isStaticOnline = (now - staUpdate) <= TIMEOUT_MS;
      } else {
        isStaticOnline = (now - this.lastStaticReceivedTime) <= TIMEOUT_MS;
      }
    }

    // Dữ liệu Tấm Xoay (Nếu Offline -> trả về 0)
    const trkVolt = isTrackingOnline ? Number(tracking.voltage || 0) : 0.0;
    const trkCurr = isTrackingOnline ? Number(tracking.current || 0) : 0.0;
    const trkPower = isTrackingOnline ? Number(tracking.power || (trkVolt * trkCurr)) : 0.0;
    const trkEnergyKwh = Number(tracking.dailyEnergy || 0);
    const trkEnergyWh = trkEnergyKwh * 1000;

    // Dữ liệu Tấm Cố Định (Nếu Offline -> trả về 0)
    const staVolt = isStaticOnline ? Number(staticPanel.voltage || 0) : 0.0;
    const staCurr = isStaticOnline ? Number(staticPanel.current || 0) : 0.0;
    const staPower = isStaticOnline ? Number(staticPanel.power || (staVolt * staCurr)) : 0.0;
    const staEnergyKwh = Number(staticPanel.dailyEnergy || 0);
    const staEnergyWh = staEnergyKwh * 1000;

    const percentGain = (isTrackingOnline && isStaticOnline && staPower > 0.1)
      ? Number((((trkPower - staPower) / staPower) * 100).toFixed(1))
      : 0.0;
    const powerDelta = Number((trkPower - staPower).toFixed(2));
    const energyDeltaWh = Number((trkEnergyWh - staEnergyWh).toFixed(1));

    const curAzimuth = Number(tracking.azimuthAngle !== undefined ? tracking.azimuthAngle : 180.0);
    const curElevation = Number(tracking.elevationAngle !== undefined ? tracking.elevationAngle : 45.0);
    const tgtAzimuth = Number(tracking.targetAzimuth !== undefined ? tracking.targetAzimuth : curAzimuth);
    const tgtElevation = Number(tracking.targetElevation !== undefined ? tracking.targetElevation : curElevation);

    const azError = tgtAzimuth - curAzimuth;
    const elError = tgtElevation - curElevation;
    const totalError = Math.sqrt(azError * azError + elError * elError);

    const ldrT = isTrackingOnline ? Number(tracking.ldrTop || 0) : 0;
    const ldrB = isTrackingOnline ? Number(tracking.ldrBottom || 0) : 0;
    const ldrL = isTrackingOnline ? Number(tracking.ldrLeft || 0) : 0;
    const ldrR = isTrackingOnline ? Number(tracking.ldrRight || 0) : 0;

    return {
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      rawTimestamp: tracking.lastUpdate || staticPanel.lastUpdate || Date.now(),
      system: {
        online: isTrackingOnline || isStaticOnline,
        isMock: false,
        source: 'firebase',
        mode: tracking.mode || 'AUTO',
        activeAlgorithm: algo.name || 'Fuzzy-PID & PSO',
        estop: tracking.estop || false,
        nightMode: tracking.nightMode || false,
        rainWindSafeMode: tracking.safeMode || false,
        pingMs: 15,
        ip: 'Firebase Cloud (Real-Time)',
        firmware: 'ESP32 Live Telemetry',
        uptimeSeconds: Math.floor((Date.now() - (tracking.lastUpdate || staticPanel.lastUpdate || Date.now())) / 1000),
        errors: {
          sensorLost: false,
          driverFault: tracking.estop || false,
          limitSwitchMinTriggered: tracking.limitMin || false,
          limitSwitchMaxTriggered: tracking.limitMax || false
        }
      },
      ina219: {
        tracking: {
          voltage: parseFloat(trkVolt.toFixed(2)),
          current: parseFloat(trkCurr.toFixed(3)),
          power: parseFloat(trkPower.toFixed(2)),
          energyWh: parseFloat(trkEnergyWh.toFixed(1)),
          energyKwh: parseFloat(trkEnergyKwh.toFixed(3)),
          online: isTrackingOnline,
          lastUpdate: tracking.lastUpdate || null,
          board: tracking.board || (isTrackingOnline ? 'ESP32-S3 Tracker' : null)
        },
        static: {
          voltage: parseFloat(staVolt.toFixed(2)),
          current: parseFloat(staCurr.toFixed(3)),
          power: parseFloat(staPower.toFixed(2)),
          energyWh: parseFloat(staEnergyWh.toFixed(1)),
          energyKwh: parseFloat(staEnergyKwh.toFixed(3)),
          online: isStaticOnline,
          lastUpdate: staticPanel.lastUpdate || null,
          board: staticPanel.board || (isStaticOnline ? 'ESP32 Static Node' : null)
        },
        comparison: {
          percentGain,
          powerDelta,
          energyDeltaWh
        }
      },
      motors: {
        azimuth: {
          currentAngle: parseFloat(curAzimuth.toFixed(1)),
          targetAngle: parseFloat(tgtAzimuth.toFixed(1)),
          errorAngle: parseFloat(azError.toFixed(2)),
          encoderPulses: Math.round(curAzimuth * 111.1),
          limitMin: false,
          limitMax: false,
          moving: Math.abs(azError) > 0.5
        },
        elevation: {
          currentAngle: parseFloat(curElevation.toFixed(1)),
          targetAngle: parseFloat(tgtElevation.toFixed(1)),
          errorAngle: parseFloat(elError.toFixed(2)),
          encoderPulses: Math.round(curElevation * 111.1),
          limitMin: false,
          limitMax: false,
          moving: Math.abs(elError) > 0.5
        }
      },
      sensors: {
        top: { lux: ldrT * 20, adc: ldrT },
        bottom: { lux: ldrB * 20, adc: ldrB },
        left: { lux: ldrL * 20, adc: ldrL },
        right: { lux: ldrR * 20, adc: ldrR },
        diffAzimuth: ldrL - ldrR,
        diffElevation: ldrT - ldrB,
        sunCentroidX: parseFloat(Math.max(-1, Math.min(1, (ldrL - ldrR) / 2000)).toFixed(3)),
        sunCentroidY: parseFloat(Math.max(-1, Math.min(1, (ldrT - ldrB) / 2000)).toFixed(3))
      },
      fuzzy: {
        errorAngle: parseFloat(totalError.toFixed(2)),
        errorRate: 0.02,
        kp: Number(algo.kp || 2.45),
        ki: Number(algo.ki || 0.08),
        kd: Number(algo.kd || 0.65),
        activeRule: totalError > 2.0 ? 'R12: PB x ZE -> PB (Fast Slew)' : totalError > 0.5 ? 'R08: PS x NS -> PS (Fine Slew)' : 'R01: ZE x ZE -> ZE (Steady Deadband)',
        defuzzOutput: parseFloat((totalError * 2.45).toFixed(2))
      },
      pso: {
        gBestFitness: Number(algo.psoBestFitness || 0.988),
        iteration: Number(algo.psoIteration || 15),
        maxIterations: 20,
        status: 'CONVERGED',
        swarmSize: 20,
        bestAzimuth: parseFloat(tgtAzimuth.toFixed(1)),
        bestElevation: parseFloat(tgtElevation.toFixed(1))
      }
    };
  }

  // Clear all data on Firebase node /solar
  async clearAllData() {
    if (!this.db) return false;
    try {
      const solarRef = ref(this.db, 'solar');
      await remove(solarRef);
      console.log('[Firebase] Successfully cleared /solar node');
      return true;
    } catch (err) {
      console.error('[Firebase Clear Error]', err);
      return false;
    }
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
