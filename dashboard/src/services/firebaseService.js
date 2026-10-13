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
      state: 'DEEP_SLEEP', // 'HOMING' | 'MOVE' | 'TRACKING' | 'PARK' | 'DEEP_SLEEP' | 'FAULT' | 'MANUAL'
      wakeAt: '03:00',
      isSleeping: false,
      activeAlgorithm: 'PSO_FUZZY_PID', // 'PID' | 'FUZZY_PID' | 'PSO_FUZZY_PID'
      estop: false,
      nightMode: false,
      rainWindSafeMode: false,
      pingMs: 0,
      ip: 'Waiting for ESP32...',
      firmware: 'ESP32-S3 Live Firmware',
      uptimeSeconds: 0,
      rtcOffsetMs: 0,
      errors: {
        sensorLost: false,
        driverFault: false,
        limitSwitchMinTriggered: false,
        limitSwitchMaxTriggered: false,
        earlyWake: false,
        zenithClamp: false,
        psoTimeout: false,
        stepLossWarn: false
      }
    },
    INA226: {
      tracking: {
        voltage: 0,
        current: 0,
        power: 0,
        energyWh: 0,
        energyKwh: 0,
        online: false,
        isSleeping: false,
        wakeAt: '03:00'
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
        hasValidGain: false,
        powerDelta: 0,
        energyDeltaWh: 0,
        calibrationK: 1.018
      }
    },
    motors: {
      azimuth: {
        phi: 0.0,
        targetPhi: 0.0,
        currentAngle: 180.0, // AZ la bàn = G + H + φ
        targetAngle: 180.0,
        errorAngle: 0.0,
        encoderPulses: 0, // K_enc = 20 count/độ
        commandPulses: 0,
        stepLoss: 0,
        limitHome: false,
        softLimitViolated: false,
        moving: false,
        isHomed: false
      },
      elevation: {
        epsilon: 90.0,
        targetEpsilon: 90.0,
        currentAngle: 90.0, // EL = ε
        targetAngle: 90.0,
        errorAngle: 0.0,
        encoderPulses: 1800,
        commandPulses: 1800,
        stepLoss: 0,
        limitSwitch90: false,
        softLimitViolated: false,
        moving: false,
        isHomed: false
      }
    },
    sensors: {
      top: { lux: 0, adc: 0 },
      bottom: { lux: 0, adc: 0 },
      left: { lux: 0, adc: 0 },
      right: { lux: 0, adc: 0 },
      esAz: 0,
      esEl: 0,
      totalLightAdc: 0,
      totalLux: 0,
      weightWs: 0.0,
      isSaturated: false,
      dayNightState: 'NIGHT_SLEEP',
      thresholdX: 40,
      thresholdY: 200,
      diffAzimuth: 0,
      diffElevation: 0,
      sunCentroidX: 0,
      sunCentroidY: 0
    },
    fuzzy: {
      activeAlgorithm: 'PSO_FUZZY_PID',
      errorAngle: 0,
      errorRate: 0,
      az: {
        kpBase: 2.4,
        kiBase: 0.10,
        kdBase: 0.60,
        deltaKp: 0,
        deltaKi: 0,
        deltaKd: 0,
        kpTotal: 2.4,
        kiTotal: 0.10,
        kdTotal: 0.60
      },
      el: {
        kpBase: 2.8,
        kiBase: 0.12,
        kdBase: 0.75,
        deltaKp: 0,
        deltaKi: 0,
        deltaKd: 0,
        kpTotal: 2.8,
        kiTotal: 0.12,
        kdTotal: 0.75
      },
      kp: 2.4,
      ki: 0.10,
      kd: 0.60,
      activeRule: 'Waiting for ESP32 stream...',
      defuzzOutput: 0
    },
    pso: {
      source: 'ONLINE', // 'OFFLINE_DEFAULT' | 'ONLINE' | 'FALLBACK'
      costJ: 0.038, // Fitness cost J
      gBestFitness: 0.038,
      runTimeMs: 142,
      swarmSize: 10,
      iteration: 25,
      maxIterations: 25,
      status: 'IDLE',
      bestAzimuth: 180,
      bestElevation: 90
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
    this.onTelemetry = () => { };
    this.onStatusChange = () => { };
    this.onError = () => { };

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
    this.onTelemetry = callbacks.onTelemetry || (() => { });
    this.onStatusChange = callbacks.onStatusChange || (() => { });
    this.onError = callbacks.onError || (() => { });

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
    const TIMEOUT_MS = 3000; // 3 giây không có gói tin mới -> MẤT KẾT NỐI

    // 1. Kiểm tra trạng thái kết nối thật của Tấm Xoay & Chế độ ngủ đông ban đêm
    let isTrackingOnline = false;
    const isSleeping = tracking.state === 'DEEP_SLEEP' || tracking.isSleeping === true;
    const wakeAt = tracking.wake_at || tracking.wakeAt || '03:00';

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
    const trkEnergyRaw = Number(tracking.dailyEnergyWh !== undefined ? tracking.dailyEnergyWh : (tracking.dailyEnergy || 0));
    const trkEnergyWh = tracking.dailyEnergyWh !== undefined ? Number(tracking.dailyEnergyWh) : (trkEnergyRaw < 1.0 && trkEnergyRaw > 0 ? trkEnergyRaw * 1000 : trkEnergyRaw);
    const trkEnergyKwh = trkEnergyWh / 1000;

    // Dữ liệu Tấm Cố Định (Nếu Offline -> trả về 0)
    const staVolt = isStaticOnline ? Number(staticPanel.voltage || 0) : 0.0;
    const staCurr = isStaticOnline ? Number(staticPanel.current || 0) : 0.0;
    const staPower = isStaticOnline ? Number(staticPanel.power || (staVolt * staCurr)) : 0.0;
    const staEnergyRaw = Number(staticPanel.dailyEnergyWh !== undefined ? staticPanel.dailyEnergyWh : (staticPanel.dailyEnergy || 0));
    const staEnergyWh = staticPanel.dailyEnergyWh !== undefined ? Number(staticPanel.dailyEnergyWh) : (staEnergyRaw < 1.0 && staEnergyRaw > 0 ? staEnergyRaw * 1000 : staEnergyRaw);
    const staEnergyKwh = staEnergyWh / 1000;

    // TÍCH PHÂN NĂNG LƯỢNG NGÀY: % Gain = (ΣE_trk / (k * ΣE_sta) - 1) * 100%
    // k = 1.018 (hệ số hiệu chuẩn chéo). Ngưỡng tối thiểu: ΣE_sta >= 5 Wh
    const K_CROSS = Number(algo.crossCalibrationK || 1.018);
    let percentGain = 0.0;
    let hasValidGain = false;
    if (staEnergyWh >= 5.0) {
      percentGain = Number((((trkEnergyWh / (K_CROSS * staEnergyWh)) - 1) * 100).toFixed(1));
      hasValidGain = true;
    }

    const powerDelta = Number((trkPower - staPower).toFixed(2));
    const energyDeltaWh = Number((trkEnergyWh - staEnergyWh).toFixed(1));

    // QUY ƯỚC GÓC: φ tính từ công tắc Azimuth (-120° đến +120°), ε tính từ mặt phẳng đỗ (25° đến 90°)
    // AZ la bàn = G + H + φ (G = 180°, H = 0°); EL = ε
    const curPhi = Number(tracking.phi !== undefined ? tracking.phi : (tracking.azimuthAngle !== undefined ? tracking.azimuthAngle - 180.0 : 0.0));
    const curEpsilon = Number(tracking.epsilon !== undefined ? tracking.epsilon : (tracking.elevationAngle !== undefined ? tracking.elevationAngle : 90.0));
    const tgtPhi = Number(tracking.targetPhi !== undefined ? tracking.targetPhi : (tracking.targetAzimuth !== undefined ? tracking.targetAzimuth - 180.0 : curPhi));
    const tgtEpsilon = Number(tracking.targetEpsilon !== undefined ? tracking.targetEpsilon : (tracking.targetElevation !== undefined ? tracking.targetElevation : curEpsilon));

    const compassAzimuth = parseFloat((180.0 + curPhi).toFixed(1));
    const compassTarget = parseFloat((180.0 + tgtPhi).toFixed(1));

    const phiError = tgtPhi - curPhi;
    const elError = tgtEpsilon - curEpsilon;
    const totalError = Math.sqrt(phiError * phiError + elError * elError);

    // Xung Encoder: Đọc trực tiếp từ firmware, không tự quy đổi cứng 111.1!
    // K_enc = 20 count/độ
    const azEncPulses = Number(tracking.azEncoder !== undefined ? tracking.azEncoder : (tracking.encoderPulses !== undefined ? tracking.encoderPulses : Math.round(curPhi * 20)));
    const elEncPulses = Number(tracking.elEncoder !== undefined ? tracking.elEncoder : Math.round(curEpsilon * 20));
    const azCmdPulses = Number(tracking.azCommandPulses !== undefined ? tracking.azCommandPulses : Math.round(tgtPhi * 20));
    const elCmdPulses = Number(tracking.elCommandPulses !== undefined ? tracking.elCommandPulses : Math.round(tgtEpsilon * 20));
    const azStepLoss = azCmdPulses - azEncPulses;
    const elStepLoss = elCmdPulses - elEncPulses;

    // Cảm biến quang trở TEMT6000
    const ldrT = isTrackingOnline ? Number(tracking.ldrTop || 0) : 0;
    const ldrB = isTrackingOnline ? Number(tracking.ldrBottom || 0) : 0;
    const ldrL = isTrackingOnline ? Number(tracking.ldrLeft || 0) : 0;
    const ldrR = isTrackingOnline ? Number(tracking.ldrRight || 0) : 0;

    const sumLR = Math.max(1, ldrL + ldrR);
    const sumTB = Math.max(1, ldrT + ldrB);
    const esAz = parseFloat(((ldrL - ldrR) / sumLR).toFixed(3));
    const esEl = parseFloat(((ldrT - ldrB) / sumTB).toFixed(3));
    const totalLightAdc = ldrT + ldrB + ldrL + ldrR;
    const totalLux = Math.round(totalLightAdc / 4 * 20);
    const isSaturated = Math.max(ldrT, ldrB, ldrL, ldrR) >= 3950;
    const ws = Number(tracking.weightWs !== undefined ? tracking.weightWs : (totalLux >= 200 ? 0.85 : (totalLux >= 40 ? 0.35 : 0.0)));
    const dayNightState = totalLux < 40 ? 'NIGHT_SLEEP' : (totalLux < 200 ? 'CLOUDY_ORBIT' : 'SUNNY_FUSION');

    // Tách bộ Kp/Ki/Kd riêng cho từng trục (Base + Delta)
    const kpAzBase = Number(algo.kpAzBase || 2.40);
    const kiAzBase = Number(algo.kiAzBase || 0.10);
    const kdAzBase = Number(algo.kdAzBase || 0.60);
    const deltaKpAz = Number(algo.deltaKpAz || (Math.min(0.8, Math.abs(phiError) * 0.2)));
    const deltaKiAz = Number(algo.deltaKiAz || (Math.min(0.05, Math.abs(phiError) * 0.01)));
    const deltaKdAz = Number(algo.deltaKdAz || (Math.min(0.3, Math.abs(phiError) * 0.08)));

    const kpElBase = Number(algo.kpElBase || 2.80);
    const kiElBase = Number(algo.kiElBase || 0.12);
    const kdElBase = Number(algo.kdElBase || 0.75);
    const deltaKpEl = Number(algo.deltaKpEl || (Math.min(0.9, Math.abs(elError) * 0.22)));
    const deltaKiEl = Number(algo.deltaKiEl || (Math.min(0.06, Math.abs(elError) * 0.012)));
    const deltaKdEl = Number(algo.deltaKdEl || (Math.min(0.35, Math.abs(elError) * 0.09)));

    // Hệ thống trạng thái & Chế độ thuật toán
    const activeAlgorithm = tracking.activeAlgorithm || algo.name || 'PSO_FUZZY_PID';
    const systemState = isSleeping ? 'DEEP_SLEEP' : (tracking.state || (tracking.mode === 'PARK' ? 'PARK' : (totalError > 1.0 ? 'MOVE' : 'TRACKING')));

    return {
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      rawTimestamp: tracking.lastUpdate || staticPanel.lastUpdate || Date.now(),
      system: {
        online: isTrackingOnline || isStaticOnline,
        isMock: false,
        source: 'firebase',
        mode: tracking.mode || 'AUTO',
        state: systemState,
        wakeAt,
        isSleeping,
        activeAlgorithm,
        estop: tracking.estop || false,
        nightMode: tracking.nightMode || isSleeping,
        rainWindSafeMode: tracking.safeMode || false,
        pingMs: 15,
        ip: 'Firebase Cloud (Real-Time)',
        firmware: 'ESP32 Live Telemetry',
        uptimeSeconds: Math.floor((Date.now() - (tracking.lastUpdate || staticPanel.lastUpdate || Date.now())) / 1000),
        rtcOffsetMs: Number(tracking.rtcOffsetMs || 0),
        errors: {
          sensorLost: Boolean(tracking.sensorLost),
          driverFault: Boolean(tracking.estop || tracking.driverFault),
          limitSwitchMinTriggered: Boolean(tracking.limitMinFault),
          limitSwitchMaxTriggered: Boolean(tracking.limitMaxFault),
          earlyWake: Boolean(tracking.earlyWake),
          zenithClamp: curEpsilon >= 89.0,
          psoTimeout: Boolean(algo.psoTimeout),
          stepLossWarn: Math.abs(azStepLoss) > 50 || Math.abs(elStepLoss) > 50
        }
      },
      INA226: {
        tracking: {
          voltage: parseFloat(trkVolt.toFixed(2)),
          current: parseFloat(trkCurr.toFixed(3)),
          power: parseFloat(trkPower.toFixed(2)),
          energyWh: parseFloat(trkEnergyWh.toFixed(1)),
          energyKwh: parseFloat(trkEnergyKwh.toFixed(3)),
          online: isTrackingOnline,
          isSleeping,
          wakeAt,
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
          hasValidGain,
          powerDelta,
          energyDeltaWh,
          calibrationK: K_CROSS
        }
      },
      motors: {
        azimuth: {
          phi: parseFloat(curPhi.toFixed(1)),
          targetPhi: parseFloat(tgtPhi.toFixed(1)),
          currentAngle: compassAzimuth, // AZ la bàn
          targetAngle: compassTarget,
          errorAngle: parseFloat(phiError.toFixed(2)),
          encoderPulses: azEncPulses, // count thô từ firmware
          commandPulses: azCmdPulses,
          stepLoss: azStepLoss,
          limitHome: Math.abs(curPhi) <= 0.3,
          softLimitViolated: curPhi <= -120 || curPhi >= 120,
          moving: Math.abs(phiError) > 0.3,
          isHomed: tracking.isHomed !== false
        },
        elevation: {
          epsilon: parseFloat(curEpsilon.toFixed(1)),
          targetEpsilon: parseFloat(tgtEpsilon.toFixed(1)),
          currentAngle: parseFloat(curEpsilon.toFixed(1)), // EL = ε
          targetAngle: parseFloat(tgtEpsilon.toFixed(1)),
          errorAngle: parseFloat(elError.toFixed(2)),
          encoderPulses: elEncPulses, // count thô từ firmware
          commandPulses: elCmdPulses,
          stepLoss: elStepLoss,
          limitSwitch90: curEpsilon >= 89.5,
          softLimitViolated: curEpsilon <= 25 || curEpsilon >= 90,
          moving: Math.abs(elError) > 0.3,
          isHomed: tracking.isHomed !== false
        }
      },
      sensors: {
        top: { lux: ldrT * 20, adc: ldrT },
        bottom: { lux: ldrB * 20, adc: ldrB },
        left: { lux: ldrL * 20, adc: ldrL },
        right: { lux: ldrR * 20, adc: ldrR },
        esAz,
        esEl,
        totalLightAdc,
        totalLux,
        weightWs: ws,
        isSaturated,
        dayNightState,
        thresholdX: 40,
        thresholdY: 200,
        diffAzimuth: ldrL - ldrR,
        diffElevation: ldrT - ldrB,
        sunCentroidX: parseFloat(Math.max(-1, Math.min(1, (ldrL - ldrR) / 2000)).toFixed(3)),
        sunCentroidY: parseFloat(Math.max(-1, Math.min(1, (ldrT - ldrB) / 2000)).toFixed(3))
      },
      fuzzy: {
        activeAlgorithm,
        errorAngle: parseFloat(totalError.toFixed(2)),
        errorRate: 0.02,
        az: {
          kpBase: kpAzBase,
          kiBase: kiAzBase,
          kdBase: kdAzBase,
          deltaKp: parseFloat(deltaKpAz.toFixed(2)),
          deltaKi: parseFloat(deltaKiAz.toFixed(3)),
          deltaKd: parseFloat(deltaKdAz.toFixed(2)),
          kpTotal: parseFloat((kpAzBase + deltaKpAz).toFixed(2)),
          kiTotal: parseFloat((kiAzBase + deltaKiAz).toFixed(3)),
          kdTotal: parseFloat((kdAzBase + deltaKdAz).toFixed(2))
        },
        el: {
          kpBase: kpElBase,
          kiBase: kiElBase,
          kdBase: kdElBase,
          deltaKp: parseFloat(deltaKpEl.toFixed(2)),
          deltaKi: parseFloat(deltaKiEl.toFixed(3)),
          deltaKd: parseFloat(deltaKdEl.toFixed(2)),
          kpTotal: parseFloat((kpElBase + deltaKpEl).toFixed(2)),
          kiTotal: parseFloat((kiElBase + deltaKiEl).toFixed(3)),
          kdTotal: parseFloat((kdElBase + deltaKdEl).toFixed(2))
        },
        kp: parseFloat((kpAzBase + deltaKpAz).toFixed(2)),
        ki: parseFloat((kiAzBase + deltaKiAz).toFixed(3)),
        kd: parseFloat((kdAzBase + deltaKdAz).toFixed(2)),
        activeRule: totalError > 2.0 ? 'R12: PB x ZE -> PB (Fast Slew)' : totalError > 0.5 ? 'R08: PS x NS -> PS (Fine Slew)' : 'R01: ZE x ZE -> ZE (Steady Deadband)',
        defuzzOutput: parseFloat((totalError * 2.45).toFixed(2))
      },
      pso: {
        source: algo.psoSource || 'ONLINE', // 'OFFLINE_DEFAULT' | 'ONLINE' | 'FALLBACK'
        costJ: Number(algo.psoCostJ !== undefined ? algo.psoCostJ : (algo.psoBestFitness !== undefined ? algo.psoBestFitness : 0.0382)), // Hàm chi phí tối ưu J
        gBestFitness: Number(algo.psoCostJ !== undefined ? algo.psoCostJ : 0.0382),
        runTimeMs: Number(algo.psoRunTimeMs || 142),
        swarmSize: Number(algo.psoSwarmSize || 10),
        iteration: Number(algo.psoIteration || 25),
        maxIterations: Number(algo.psoMaxIterations || 25),
        status: algo.psoStatus || 'CONVERGED',
        bestAzimuth: compassTarget,
        bestElevation: parseFloat(tgtEpsilon.toFixed(1))
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

  // Send Remote Control Command from Web to ESP32 with command ID, TTL (30s) and ack flag
  async sendCommand(commandObj) {
    if (!this.db) {
      console.warn('[Firebase] Database not connected');
      return false;
    }

    try {
      const controlRef = ref(this.db, 'solar/control');
      const cmdId = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      await set(controlRef, {
        id: cmdId,
        ...commandObj,
        ttl: 30000, // 30 seconds Time-To-Live
        ack: false,
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

  async setAlgorithm(algo) {
    return this.sendCommand({ cmd: 'set_algorithm', algorithm: algo });
  }

  async jogMotor(axis, direction, step = 5) {
    return this.sendCommand({ cmd: 'jog', axis, direction, step });
  }

  async reHome() {
    return this.sendCommand({ cmd: 're_home' });
  }

  async resetFault() {
    return this.sendCommand({ cmd: 'reset_fault' });
  }

  async testDir(axis, direction = 1) {
    return this.sendCommand({ cmd: 'test_dir', axis, direction, slowSpeed: true, lowCurrent: true });
  }

  async setEstop(enabled) {
    return this.sendCommand({ cmd: 'estop', state: enabled });
  }
}
