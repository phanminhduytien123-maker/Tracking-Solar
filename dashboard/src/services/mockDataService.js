// Mock Data Generator for Dual-Axis ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR (Fuzzy-PID & PSO)

export function generate30DaysHistory() {
  const history = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    history.push({
      date: dateStr,
      fullDate: d.toISOString().split('T')[0],
      staticKwh: 0.0,
      trackingKwh: 0.0,
      staticWh: 0.0,
      trackingWh: 0.0,
      gainPercent: 0.0,
      diffKwh: 0.0,
      diffWh: 0.0
    });
  }
  return history;
}

export function generateIntradayProfile() {
  const points = [];
  // 05:00 to 19:00 hourly profile baseline (khởi tạo về 0, nhận dữ liệu đo thật từ hệ thống)
  for (let hour = 5; hour <= 19; hour += 0.5) {
    const hStr = `${Math.floor(hour).toString().padStart(2, '0')}:${hour % 1 === 0 ? '00' : '30'}`;
    points.push({
      time: hStr,
      pTracking: 0.0,
      pStatic: 0.0,
      gain: 0.0
    });
  }
  return points;
}

export class MockTelemetryEngine {
  constructor() {
    this.mode = 'AUTO'; // 'AUTO' | 'MANUAL' | 'CALIBRATION' | 'PARK'
    this.activeAlgorithm = 'PSO_FUZZY_PID'; // 'PID' | 'FUZZY_PID' | 'PSO_FUZZY_PID'
    this.estop = false;

    // Motor positions: Quy ước chốt: φ = 0 (công tắc Az), ε = 90° (tư thế đỗ STOW)
    // Giàn tĩnh: G = 180° Nam, H = 0° lệch la bàn => AZ la bàn = G + H + φ
    this.phi = 0.0; // góc trục phương vị tính từ công tắc HOME (-120° đến +120°)
    this.epsilon = 90.0; // góc độ ngửa ε (25° đến 90°: 90° là đỗ ngang, 25° là giới hạn mềm thấp)
    this.targetPhi = 0.0;
    this.targetEpsilon = 90.0;

    // Encoder counts: K_enc = 4 * F * 3 / 360 = 20 count/độ (với F = 600)
    this.azimuthEncoder = 0;
    this.elevationEncoder = 1800; // 90° * 20 = 1800 counts
    this.azimuthCommandPulses = 0;
    this.elevationCommandPulses = 1800;

    // PSO state: nguồn nghiệm, thời gian chạy, số hạt (10), số vòng lặp (25)
    // Fitness Cost J (càng nhỏ càng tối ưu)
    this.psoIteration = 25;
    this.psoMaxIterations = 25;
    this.psoCostJ = 0.0382; // Chi phí tối ưu J
    this.psoStatus = 'CONVERGED'; // 'OPTIMIZING' | 'CONVERGED' | 'IDLE'
    this.psoSource = 'ONLINE'; // 'OFFLINE_DEFAULT' | 'ONLINE' | 'FALLBACK'
    this.psoRunTimeMs = 142;
    this.psoSwarmSize = 10;

    // Cumulative energy accumulated in Wh (bắt đầu từ 0)
    this.energyTrackingWh = 0.0;
    this.energyStaticWh = 0.0;
    this.crossCalibrationK = 1.018; // Hệ số hiệu chuẩn chéo k

    this.lastTickTime = Date.now();
  }

  setMode(mode) {
    this.mode = mode;
  }

  setAlgorithm(algo) {
    this.activeAlgorithm = algo;
  }

  setEstop(state) {
    this.estop = state;
  }

  jog(axis, delta) {
    if (this.mode !== 'MANUAL') return;
    if (axis === 'azimuth' || axis === 'AZ') {
      // Giới hạn mềm φ: [-120°, +120°]
      this.targetPhi = Math.max(-120, Math.min(120, this.targetPhi + delta));
      this.phi = this.targetPhi;
      this.azimuthCommandPulses += Math.round(delta * 20);
      this.azimuthEncoder = Math.round(this.phi * 20);
    } else if (axis === 'elevation' || axis === 'EL') {
      // Giới hạn mềm ε: [25°, 90°] (90° là chạm công tắc)
      this.targetEpsilon = Math.max(25, Math.min(90, this.targetEpsilon + delta));
      this.epsilon = this.targetEpsilon;
      this.elevationCommandPulses += Math.round(delta * 20);
      this.elevationEncoder = Math.round(this.epsilon * 20);
    }
  }

  calibrate(type = 'noon') {
    if (type === 'zero' || type === 'home') {
      this.phi = 0.0;
      this.epsilon = 90.0;
      this.targetPhi = 0.0;
      this.targetEpsilon = 90.0;
      this.azimuthEncoder = 0;
      this.elevationEncoder = 1800;
    }
  }

  triggerPSO() {
    this.psoIteration = 1;
    this.psoCostJ = 0.285 + Math.random() * 0.05;
    this.psoStatus = 'OPTIMIZING';
    this.psoSource = 'ONLINE';
    this.psoRunTimeMs = 135 + Math.floor(Math.random() * 20);
  }

  park() {
    this.mode = 'PARK';
    this.targetPhi = 0.0; // Về công tắc Azimuth
    this.targetEpsilon = 90.0; // Về phẳng ngửa 90°
  }

  getNextState() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

    // Vị trí mặt trời trong ngày: 6h đến 18h
    const dayProgress = (hours - 6) / 12;
    const isDaytime = dayProgress >= 0 && dayProgress <= 1;

    // Tọa độ mặt trời giả định
    let sunAzimuthCompass = 180;
    let sunElevation = 90;

    if (isDaytime) {
      sunAzimuthCompass = 70 + dayProgress * 220; // 70° (Đông) -> 290° (Tây)
      sunElevation = Math.max(25, Math.sin(dayProgress * Math.PI) * 75); // độ cao góc mặt trời
    } else {
      sunAzimuthCompass = 180;
      sunElevation = 90; // đêm đỗ phẳng 90°
    }

    // G = 180, H = 0 => phi mục tiêu = sunAzimuthCompass - 180
    const sunPhiTarget = Math.max(-120, Math.min(120, sunAzimuthCompass - 180));
    const sunElTarget = Math.max(25, Math.min(90, sunElevation));

    if (this.mode === 'AUTO') {
      if (!isDaytime) {
        // Đêm ngủ đông
        this.targetPhi = 0.0;
        this.targetEpsilon = 90.0;
      } else {
        this.targetPhi = parseFloat(sunPhiTarget.toFixed(1));
        this.targetEpsilon = parseFloat(sunElTarget.toFixed(1));
      }

      const phiDiff = this.targetPhi - this.phi;
      const elDiff = this.targetEpsilon - this.epsilon;
      this.phi += phiDiff * 0.15 + (Math.random() - 0.5) * 0.02;
      this.epsilon += elDiff * 0.15 + (Math.random() - 0.5) * 0.02;
    } else if (this.mode === 'PARK') {
      this.targetPhi = 0.0;
      this.targetEpsilon = 90.0;
      this.phi += (0.0 - this.phi) * 0.2;
      this.epsilon += (90.0 - this.epsilon) * 0.2;
    }

    // Encoder counts thật: K_enc = 20 count/độ
    this.azimuthEncoder = Math.round(this.phi * 20);
    this.elevationEncoder = Math.round(this.epsilon * 20);
    this.azimuthCommandPulses = Math.round(this.targetPhi * 20);
    this.elevationCommandPulses = Math.round(this.targetEpsilon * 20);
    const azStepLoss = this.azimuthCommandPulses - this.azimuthEncoder;
    const elStepLoss = this.elevationCommandPulses - this.elevationEncoder;

    // Limit switch checks
    const lsAzHome = Math.abs(this.phi) <= 0.3; // Công tắc Home Azimuth
    const lsEl90 = this.epsilon >= 89.5; // Công tắc hành trình Elevation (90°)
    const softLimitAzTriggered = this.phi <= -120 || this.phi >= 120;
    const softLimitElTriggered = this.epsilon <= 25 || this.epsilon >= 90;

    // TEMT6000 Light Sensors
    const phiError = this.targetPhi - this.phi;
    const elError = this.targetEpsilon - this.epsilon;

    const baseLux = isDaytime ? Math.sin(dayProgress * Math.PI) * 75000 + 500 : 25;
    const sLeft = Math.max(10, Math.min(99000, baseLux * (1 + phiError * 0.035) + (Math.random() - 0.5) * 50));
    const sRight = Math.max(10, Math.min(99000, baseLux * (1 - phiError * 0.035) + (Math.random() - 0.5) * 50));
    const sTop = Math.max(10, Math.min(99000, baseLux * (1 + elError * 0.035) + (Math.random() - 0.5) * 50));
    const sBottom = Math.max(10, Math.min(99000, baseLux * (1 - elError * 0.035) + (Math.random() - 0.5) * 50));

    // ADC 12-bit (0 - 4095)
    const adcLeft = Math.round(Math.min(4095, (sLeft / 85000) * 4095));
    const adcRight = Math.round(Math.min(4095, (sRight / 85000) * 4095));
    const adcTop = Math.round(Math.min(4095, (sTop / 85000) * 4095));
    const adcBottom = Math.round(Math.min(4095, (sBottom / 85000) * 4095));

    // Sai số chuẩn hóa e_s = (L-R)/(L+R) và (T-B)/(T+B)
    const sumLR = Math.max(1, adcLeft + adcRight);
    const sumTB = Math.max(1, adcTop + adcBottom);
    const esAz = parseFloat(((adcLeft - adcRight) / sumLR).toFixed(3));
    const esEl = parseFloat(((adcTop - adcBottom) / sumTB).toFixed(3));
    const totalLightAdc = adcLeft + adcRight + adcTop + adcBottom;
    const totalLux = Math.round((sLeft + sRight + sTop + sBottom) / 4);

    // Trọng số w_s và cờ bão hòa
    const isSaturated = Math.max(adcLeft, adcRight, adcTop, adcBottom) >= 3950;
    const ws = isDaytime && totalLux >= 200 ? 0.85 : (totalLux >= 40 ? 0.35 : 0.0);
    const dayNightState = totalLux < 40 ? 'NIGHT_SLEEP' : (totalLux < 200 ? 'CLOUDY_ORBIT' : 'SUNNY_FUSION');

    // Tách bộ Kp/Ki/Kd riêng cho từng trục (Hệ số cơ sở PSO + ΔK tức thời Fuzzy)
    const totalError = Math.sqrt(phiError * phiError + elError * elError);
    // Azimuth:
    const kpAzBase = 2.40;
    const kiAzBase = 0.10;
    const kdAzBase = 0.60;
    const deltaKpAz = parseFloat((Math.min(0.8, Math.abs(phiError) * 0.2)).toFixed(2));
    const deltaKiAz = parseFloat((Math.min(0.05, Math.abs(phiError) * 0.01)).toFixed(3));
    const deltaKdAz = parseFloat((Math.min(0.3, Math.abs(phiError) * 0.08)).toFixed(2));

    // Elevation:
    const kpElBase = 2.80;
    const kiElBase = 0.12;
    const kdElBase = 0.75;
    const deltaKpEl = parseFloat((Math.min(0.9, Math.abs(elError) * 0.22)).toFixed(2));
    const deltaKiEl = parseFloat((Math.min(0.06, Math.abs(elError) * 0.012)).toFixed(3));
    const deltaKdEl = parseFloat((Math.min(0.35, Math.abs(elError) * 0.09)).toFixed(2));

    // PSO Swarm Optimization Dynamics
    if (this.psoStatus === 'OPTIMIZING') {
      if (this.psoIteration < this.psoMaxIterations) {
        this.psoIteration += 1;
        this.psoCostJ = Math.max(0.025, this.psoCostJ * 0.88 - Math.random() * 0.005);
      } else {
        this.psoStatus = 'CONVERGED';
      }
    }

    // INA226 Power telemetry
    let vTracking = 0;
    let iTracking = 0;
    let pTracking = 0;
    let vStatic = 0;
    let iStatic = 0;
    let pStatic = 0;

    if (isDaytime) {
      const sunIntensity = Math.sin(dayProgress * Math.PI);
      const trackingAlignment = Math.max(0.7, Math.cos((totalError * Math.PI) / 180));
      vTracking = 18.2 + sunIntensity * 1.6 + (Math.random() - 0.5) * 0.08;
      iTracking = sunIntensity * 3.95 * trackingAlignment + (Math.random() - 0.5) * 0.05;
      pTracking = Math.max(0, vTracking * iTracking);

      const staticMisalignment = Math.max(0.2, Math.cos(((sunAzimuthCompass - 180) * Math.PI) / 180) * Math.sin((sunElevation * Math.PI) / 180));
      vStatic = 17.4 + sunIntensity * 1.2 + (Math.random() - 0.5) * 0.08;
      iStatic = sunIntensity * 3.95 * Math.pow(staticMisalignment, 0.85) + (Math.random() - 0.5) * 0.04;
      pStatic = Math.max(0, vStatic * iStatic);

      this.energyTrackingWh += (pTracking / 3600);
      this.energyStaticWh += (pStatic / 3600);
    } else {
      vTracking = 0.5;
      iTracking = 0.0;
      pTracking = 0.0;
      vStatic = 0.5;
      iStatic = 0.0;
      pStatic = 0.0;
    }

    // % Gain từ tích phân năng lượng: ΣE_trk / (k * ΣE_sta) - 1
    // Nếu ΣE_cố định chưa đủ 5 Wh => không hiển thị % vội để tránh chia 0 / nhảy loạn
    let percentGain = null;
    if (this.energyStaticWh >= 5.0) {
      const expectedStatic = this.crossCalibrationK * this.energyStaticWh;
      percentGain = parseFloat((((this.energyTrackingWh / expectedStatic) - 1) * 100).toFixed(1));
    }

    const powerDelta = parseFloat((pTracking - pStatic).toFixed(2));
    const energyDeltaWh = parseFloat((this.energyTrackingWh - this.energyStaticWh).toFixed(1));

    // AZ la bàn = G + H + φ
    const compassAzimuth = parseFloat((180.0 + this.phi).toFixed(1));
    const compassTarget = parseFloat((180.0 + this.targetPhi).toFixed(1));

    const isSleeping = !isDaytime && this.mode === 'AUTO';

    return {
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      rawTimestamp: Date.now(),
      system: {
        online: true,
        isMock: true,
        mode: this.mode,
        state: isSleeping ? 'DEEP_SLEEP' : (this.mode === 'PARK' ? 'PARK' : (totalError > 1.0 ? 'MOVE' : 'TRACKING')),
        wakeAt: '03:00',
        isSleeping,
        activeAlgorithm: this.activeAlgorithm,
        estop: this.estop,
        pingMs: 8 + Math.floor(Math.random() * 6),
        ip: '192.168.4.1 (ESP32-S3 Mock)',
        firmware: 'v2.4-FuzzyPSO-ESP32S3',
        uptimeSeconds: Math.floor((Date.now() - 1700000000000) / 1000) % 86400,
        rtcOffsetMs: 120, // Độ lệch RTC so với server
        errors: {
          sensorLost: false,
          driverFault: this.estop,
          limitSwitchMinTriggered: lsAzHome,
          limitSwitchMaxTriggered: lsEl90,
          earlyWake: false,
          zenithClamp: this.epsilon >= 89.0,
          psoTimeout: false,
          stepLossWarn: Math.abs(azStepLoss) > 50 || Math.abs(elStepLoss) > 50
        }
      },
      INA226: {
        tracking: {
          voltage: parseFloat(vTracking.toFixed(2)),
          current: parseFloat(iTracking.toFixed(2)),
          power: parseFloat(pTracking.toFixed(2)),
          energyWh: parseFloat(this.energyTrackingWh.toFixed(1)),
          energyKwh: parseFloat((this.energyTrackingWh / 1000).toFixed(3)),
          online: !isSleeping,
          isSleeping,
          wakeAt: '03:00',
          board: 'ESP32-S3 Tracker'
        },
        static: {
          voltage: parseFloat(vStatic.toFixed(2)),
          current: parseFloat(iStatic.toFixed(2)),
          power: parseFloat(pStatic.toFixed(2)),
          energyWh: parseFloat(this.energyStaticWh.toFixed(1)),
          energyKwh: parseFloat((this.energyStaticWh / 1000).toFixed(3)),
          online: true,
          board: 'ESP32 Static Logger'
        },
        comparison: {
          percentGain: percentGain !== null ? percentGain : 0.0,
          hasValidGain: percentGain !== null,
          powerDelta,
          energyDeltaWh,
          calibrationK: this.crossCalibrationK
        }
      },
      motors: {
        azimuth: {
          phi: parseFloat(this.phi.toFixed(1)),
          targetPhi: parseFloat(this.targetPhi.toFixed(1)),
          currentAngle: compassAzimuth, // AZ la bàn = G + H + φ
          targetAngle: compassTarget,
          errorAngle: parseFloat(phiError.toFixed(2)),
          encoderPulses: this.azimuthEncoder, // count thô từ K_enc=20
          commandPulses: this.azimuthCommandPulses,
          stepLoss: azStepLoss,
          limitHome: lsAzHome,
          softLimitViolated: softLimitAzTriggered,
          moving: Math.abs(phiError) > 0.2,
          isHomed: true
        },
        elevation: {
          epsilon: parseFloat(this.epsilon.toFixed(1)),
          targetEpsilon: parseFloat(this.targetEpsilon.toFixed(1)),
          currentAngle: parseFloat(this.epsilon.toFixed(1)), // EL = ε
          targetAngle: parseFloat(this.targetEpsilon.toFixed(1)),
          errorAngle: parseFloat(elError.toFixed(2)),
          encoderPulses: this.elevationEncoder, // count thô từ K_enc=20
          commandPulses: this.elevationCommandPulses,
          stepLoss: elStepLoss,
          limitSwitch90: lsEl90,
          softLimitViolated: softLimitElTriggered,
          moving: Math.abs(elError) > 0.2,
          isHomed: true
        }
      },
      sensors: {
        top: { lux: Math.round(sTop), adc: adcTop },
        bottom: { lux: Math.round(sBottom), adc: adcBottom },
        left: { lux: Math.round(sLeft), adc: adcLeft },
        right: { lux: Math.round(sRight), adc: adcRight },
        esAz,
        esEl,
        totalLightAdc,
        totalLux,
        weightWs: ws,
        isSaturated,
        dayNightState,
        thresholdX: 40,
        thresholdY: 200,
        diffAzimuth: Math.round(sLeft - sRight),
        diffElevation: Math.round(sTop - sBottom),
        sunCentroidX: parseFloat(Math.max(-1, Math.min(1, (adcLeft - adcRight) / 2000)).toFixed(3)),
        sunCentroidY: parseFloat(Math.max(-1, Math.min(1, (adcTop - adcBottom) / 2000)).toFixed(3)),
      },
      fuzzy: {
        activeAlgorithm: this.activeAlgorithm,
        errorAngle: parseFloat(totalError.toFixed(2)),
        // Bộ tham số Azimuth
        az: {
          kpBase: kpAzBase,
          kiBase: kiAzBase,
          kdBase: kdAzBase,
          deltaKp: deltaKpAz,
          deltaKi: deltaKiAz,
          deltaKd: deltaKdAz,
          kpTotal: parseFloat((kpAzBase + deltaKpAz).toFixed(2)),
          kiTotal: parseFloat((kiAzBase + deltaKiAz).toFixed(3)),
          kdTotal: parseFloat((kdAzBase + deltaKdAz).toFixed(2))
        },
        // Bộ tham số Elevation
        el: {
          kpBase: kpElBase,
          kiBase: kiElBase,
          kdBase: kdElBase,
          deltaKp: deltaKpEl,
          deltaKi: deltaKiEl,
          deltaKd: deltaKdEl,
          kpTotal: parseFloat((kpElBase + deltaKpEl).toFixed(2)),
          kiTotal: parseFloat((kiElBase + deltaKiEl).toFixed(3)),
          kdTotal: parseFloat((kdElBase + deltaKdEl).toFixed(2))
        },
        // Tương thích ngược:
        kp: parseFloat((kpAzBase + deltaKpAz).toFixed(2)),
        ki: parseFloat((kiAzBase + deltaKiAz).toFixed(3)),
        kd: parseFloat((kdAzBase + deltaKdAz).toFixed(2)),
        activeRule: totalError > 2.0 ? 'R12: PB x ZE -> PB (Fast Slew)' : totalError > 0.5 ? 'R08: PS x NS -> PS (Fine Slew)' : 'R01: ZE x ZE -> ZE (Steady Deadband)',
      },
      pso: {
        source: this.psoSource, // 'OFFLINE_DEFAULT' | 'ONLINE' | 'FALLBACK'
        costJ: parseFloat(this.psoCostJ.toFixed(4)), // Hàm chi phí tối ưu J
        gBestFitness: parseFloat(this.psoCostJ.toFixed(4)),
        runTimeMs: this.psoRunTimeMs,
        swarmSize: this.psoSwarmSize,
        iteration: this.psoIteration,
        maxIterations: this.psoMaxIterations,
        status: this.psoStatus,
        bestAzimuth: compassTarget,
        bestElevation: parseFloat(this.targetEpsilon.toFixed(1))
      }
    };
  }
}
