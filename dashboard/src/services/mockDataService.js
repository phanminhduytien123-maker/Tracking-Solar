// Mock Data Generator for Dual-Axis ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR (Fuzzy-PID & PSO)

export function generate30DaysHistory() {
  const history = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Seasonal & weather fluctuation (clear vs partly cloudy days)
    const weatherFactor = 0.78 + 0.22 * Math.sin(i * 0.45 + 1.2);
    const noise = (Math.random() - 0.5) * 0.08;
    const factor = Math.max(0.65, Math.min(1.0, weatherFactor + noise));

    // Daily energy in kWh (e.g. 50W - 100W prototype scale)
    const staticKwh = parseFloat((0.36 * factor + (Math.random() * 0.03)).toFixed(3));
    // Tracking panel gains 28% to 42% more energy over static
    const gainPercent = 28 + (14 * factor) + (Math.random() * 3 - 1.5);
    const trackingKwh = parseFloat((staticKwh * (1 + gainPercent / 100)).toFixed(3));

    history.push({
      date: dateStr,
      fullDate: d.toISOString().split('T')[0],
      staticKwh,
      trackingKwh,
      gainPercent: parseFloat(gainPercent.toFixed(1)),
      diffKwh: parseFloat((trackingKwh - staticKwh).toFixed(3))
    });
  }
  return history;
}

export function generateIntradayProfile() {
  const points = [];
  // 06:00 to 18:00 hourly profile baseline
  for (let hour = 6; hour <= 18; hour += 0.5) {
    const hStr = `${Math.floor(hour).toString().padStart(2, '0')}:${hour % 1 === 0 ? '00' : '30'}`;
    const tNorm = (hour - 6) / 12; // 0 to 1
    const sunElevation = Math.sin(tNorm * Math.PI); // 0 -> 1 -> 0
    
    if (sunElevation <= 0) {
      points.push({ time: hStr, pTracking: 0, pStatic: 0, gain: 0 });
      continue;
    }

    // Static panel has cos(theta) misalignment especially in morning & late afternoon
    // Assume static panel fixed South at 15 deg tilt
    const staticFactor = Math.pow(sunElevation, 1.8);
    const trackingFactor = Math.pow(sunElevation, 0.95);

    const maxPower = 80; // Watts
    const pStatic = Math.max(0, parseFloat((maxPower * staticFactor * 0.88).toFixed(1)));
    const pTracking = Math.max(0, parseFloat((maxPower * trackingFactor * 0.98).toFixed(1)));
    const gain = pStatic > 0 ? parseFloat((((pTracking - pStatic) / pStatic) * 100).toFixed(1)) : 0;

    points.push({
      time: hStr,
      pTracking,
      pStatic,
      gain
    });
  }
  return points;
}

export class MockTelemetryEngine {
  constructor() {
    this.mode = 'AUTO'; // 'AUTO' | 'MANUAL' | 'CALIBRATION' | 'PARK'
    this.estop = false;
    
    // Motor positions
    this.azimuth = 164.5; // deg (0 - 360)
    this.elevation = 48.2; // deg (0 - 90)
    this.targetAzimuth = 165.0;
    this.targetElevation = 48.5;
    this.azimuthEncoder = 18244;
    this.elevationEncoder = 5410;

    // PSO state
    this.psoIteration = 12;
    this.psoMaxIterations = 20;
    this.psoGbest = 0.9845;
    this.psoStatus = 'CONVERGED'; // 'OPTIMIZING' | 'CONVERGED' | 'IDLE'

    // Cumulative energy accumulated in Wh
    this.energyTrackingWh = 485.4;
    this.energyStaticWh = 346.2;

    this.lastTickTime = Date.now();
  }

  setMode(mode) {
    this.mode = mode;
  }

  setEstop(state) {
    this.estop = state;
  }

  jog(axis, delta) {
    if (this.mode !== 'MANUAL') return;
    if (axis === 'AZ') {
      this.targetAzimuth = Math.max(0, Math.min(360, this.targetAzimuth + delta));
      this.azimuth = this.targetAzimuth;
      this.azimuthEncoder += Math.round(delta * 111.1);
    } else if (axis === 'EL') {
      this.targetElevation = Math.max(0, Math.min(90, this.targetElevation + delta));
      this.elevation = this.targetElevation;
      this.elevationEncoder += Math.round(delta * 111.1);
    }
  }

  calibrate() {
    this.azimuth = 0.0;
    this.elevation = 0.0;
    this.targetAzimuth = 0.0;
    this.targetElevation = 0.0;
    this.azimuthEncoder = 0;
    this.elevationEncoder = 0;
  }

  triggerPSO() {
    this.psoIteration = 1;
    this.psoGbest = 0.75 + Math.random() * 0.1;
    this.psoStatus = 'OPTIMIZING';
  }

  park() {
    this.mode = 'PARK';
    this.targetAzimuth = 180.0;
    this.targetElevation = 0.0;
  }

  getNextState() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

    // Real-time solar position based on time of day (approximated for 10.7°N - HCMC, Vietnam)
    const dayProgress = (hours - 6) / 12; // 6h to 18h
    const isDaytime = dayProgress >= 0 && dayProgress <= 1;

    let theoreticalSunAzimuth = 180;
    let theoreticalSunElevation = 0;

    if (isDaytime) {
      theoreticalSunAzimuth = 70 + dayProgress * 220; // 70° (East) -> 290° (West)
      theoreticalSunElevation = Math.sin(dayProgress * Math.PI) * 75; // 0° -> 75° -> 0°
    } else {
      theoreticalSunAzimuth = 180;
      theoreticalSunElevation = 0;
    }

    // Adjust target based on mode
    if (this.mode === 'AUTO') {
      this.targetAzimuth = parseFloat(theoreticalSunAzimuth.toFixed(1));
      this.targetElevation = parseFloat(theoreticalSunElevation.toFixed(1));
      
      // Motor tracking dynamics (smooth convergence towards target)
      const azDiff = this.targetAzimuth - this.azimuth;
      const elDiff = this.targetElevation - this.elevation;
      this.azimuth += azDiff * 0.15 + (Math.random() - 0.5) * 0.04;
      this.elevation += elDiff * 0.15 + (Math.random() - 0.5) * 0.04;
    } else if (this.mode === 'PARK') {
      this.targetAzimuth = 180.0;
      this.targetElevation = 0.0;
      this.azimuth += (180.0 - this.azimuth) * 0.2;
      this.elevation += (0.0 - this.elevation) * 0.2;
    }

    // Encoder counts (assume 4000 pulses per 36 deg = ~111.1 pulses/deg)
    this.azimuthEncoder = Math.round(this.azimuth * 111.1);
    this.elevationEncoder = Math.round(this.elevation * 111.1);

    // Limit switch checks
    const lsAzMin = this.azimuth <= 1.0;
    const lsAzMax = this.azimuth >= 359.0;
    const lsElMin = this.elevation <= 0.5;
    const lsElMax = this.elevation >= 88.0;

    // TEMT6000 Light Sensors (Top, Bottom, Left, Right)
    // When tracker is slightly offset from sun, sensor readings differ
    const azError = this.targetAzimuth - this.azimuth;
    const elError = this.targetElevation - this.elevation;

    const baseLux = isDaytime ? Math.sin(dayProgress * Math.PI) * 85000 + 4000 : 80;
    const sLeft = Math.max(50, Math.min(99000, baseLux * (1 + azError * 0.035) + (Math.random() - 0.5) * 200));
    const sRight = Math.max(50, Math.min(99000, baseLux * (1 - azError * 0.035) + (Math.random() - 0.5) * 200));
    const sTop = Math.max(50, Math.min(99000, baseLux * (1 + elError * 0.035) + (Math.random() - 0.5) * 200));
    const sBottom = Math.max(50, Math.min(99000, baseLux * (1 - elError * 0.035) + (Math.random() - 0.5) * 200));

    // Convert to ADC 12-bit (0 - 4095)
    const adcLeft = Math.round(Math.min(4095, (sLeft / 95000) * 4095));
    const adcRight = Math.round(Math.min(4095, (sRight / 95000) * 4095));
    const adcTop = Math.round(Math.min(4095, (sTop / 95000) * 4095));
    const adcBottom = Math.round(Math.min(4095, (sBottom / 95000) * 4095));

    // Fuzzy-PID Controller parameters
    const totalError = Math.sqrt(azError * azError + elError * elError);
    const errorRate = (Math.random() - 0.5) * 0.12;
    // Dynamic self-tuning Kp, Ki, Kd
    const kp = parseFloat((2.4 + Math.min(1.2, totalError * 0.4)).toFixed(2));
    const ki = parseFloat((0.12 + Math.min(0.1, totalError * 0.02)).toFixed(3));
    const kd = parseFloat((0.65 + Math.min(0.5, Math.abs(errorRate) * 1.5)).toFixed(2));

    // PSO Swarm Optimization Dynamics
    if (this.psoStatus === 'OPTIMIZING') {
      if (this.psoIteration < this.psoMaxIterations) {
        this.psoIteration += 1;
        this.psoGbest = Math.min(0.995, this.psoGbest + (1 - this.psoGbest) * 0.25 + (Math.random() * 0.02));
      } else {
        this.psoStatus = 'CONVERGED';
      }
    }

    // INA219 Power telemetry (Tracking Panel vs Static Panel)
    let vTracking = 0;
    let iTracking = 0;
    let pTracking = 0;
    let vStatic = 0;
    let iStatic = 0;
    let pStatic = 0;

    if (isDaytime) {
      const sunIntensity = Math.sin(dayProgress * Math.PI);
      
      // Tracking panel operates at near-perpendicular irradiance (cos factor ~ 0.99)
      const trackingAlignment = Math.max(0.7, Math.cos((totalError * Math.PI) / 180));
      vTracking = 18.2 + sunIntensity * 1.6 + (Math.random() - 0.5) * 0.08;
      iTracking = sunIntensity * 3.95 * trackingAlignment + (Math.random() - 0.5) * 0.05;
      pTracking = Math.max(0, vTracking * iTracking);

      // Static panel fixed facing South (Azimuth 180, Elevation 15)
      // Suffers from large angle of incidence off-midday
      const staticMisalignment = Math.max(0.2, Math.cos(((theoreticalSunAzimuth - 180) * Math.PI) / 180) * Math.sin((theoreticalSunElevation * Math.PI) / 180));
      vStatic = 17.4 + sunIntensity * 1.2 + (Math.random() - 0.5) * 0.08;
      iStatic = sunIntensity * 3.95 * Math.pow(staticMisalignment, 0.85) + (Math.random() - 0.5) * 0.04;
      pStatic = Math.max(0, vStatic * iStatic);

      // Accumulate energy (Wh = W * (dt / 3600)) -> tick is approx 1s
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

    // Calculate % Gain
    const percentGain = pStatic > 0.5 
      ? parseFloat((((pTracking - pStatic) / pStatic) * 100).toFixed(1))
      : 0.0;

    const powerDelta = parseFloat((pTracking - pStatic).toFixed(2));
    const energyDeltaWh = parseFloat((this.energyTrackingWh - this.energyStaticWh).toFixed(1));

    return {
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      rawTimestamp: Date.now(),
      system: {
        online: true,
        isMock: true,
        mode: this.mode,
        estop: this.estop,
        pingMs: 8 + Math.floor(Math.random() * 6),
        ip: '192.168.4.1 (ESP32-S3 Mock)',
        firmware: 'v2.4-FuzzyPSO-ESP32S3',
        uptimeSeconds: Math.floor((Date.now() - 1700000000000) / 1000) % 86400,
        errors: {
          sensorLost: false,
          driverFault: this.estop,
          limitSwitchMinTriggered: lsAzMin || lsElMin,
          limitSwitchMaxTriggered: lsAzMax || lsElMax,
        }
      },
      ina219: {
        tracking: {
          voltage: parseFloat(vTracking.toFixed(2)),
          current: parseFloat(iTracking.toFixed(2)),
          power: parseFloat(pTracking.toFixed(2)),
          energyWh: parseFloat(this.energyTrackingWh.toFixed(1)),
          energyKwh: parseFloat((this.energyTrackingWh / 1000).toFixed(3)),
        },
        static: {
          voltage: parseFloat(vStatic.toFixed(2)),
          current: parseFloat(iStatic.toFixed(2)),
          power: parseFloat(pStatic.toFixed(2)),
          energyWh: parseFloat(this.energyStaticWh.toFixed(1)),
          energyKwh: parseFloat((this.energyStaticWh / 1000).toFixed(3)),
        },
        comparison: {
          percentGain,
          powerDelta,
          energyDeltaWh,
        }
      },
      motors: {
        azimuth: {
          currentAngle: parseFloat(this.azimuth.toFixed(1)),
          targetAngle: parseFloat(this.targetAzimuth.toFixed(1)),
          errorAngle: parseFloat(azError.toFixed(2)),
          encoderPulses: this.azimuthEncoder,
          limitMin: lsAzMin,
          limitMax: lsAzMax,
          moving: Math.abs(azError) > 0.2,
        },
        elevation: {
          currentAngle: parseFloat(this.elevation.toFixed(1)),
          targetAngle: parseFloat(this.targetElevation.toFixed(1)),
          errorAngle: parseFloat(elError.toFixed(2)),
          encoderPulses: this.elevationEncoder,
          limitMin: lsElMin,
          limitMax: lsElMax,
          moving: Math.abs(elError) > 0.2,
        }
      },
      sensors: {
        top: { lux: Math.round(sTop), adc: adcTop },
        bottom: { lux: Math.round(sBottom), adc: adcBottom },
        left: { lux: Math.round(sLeft), adc: adcLeft },
        right: { lux: Math.round(sRight), adc: adcRight },
        diffAzimuth: Math.round(sLeft - sRight),
        diffElevation: Math.round(sTop - sBottom),
        sunCentroidX: parseFloat(Math.max(-1, Math.min(1, (adcLeft - adcRight) / 2000)).toFixed(3)),
        sunCentroidY: parseFloat(Math.max(-1, Math.min(1, (adcTop - adcBottom) / 2000)).toFixed(3)),
      },
      fuzzy: {
        errorAngle: parseFloat(totalError.toFixed(2)),
        errorRate: parseFloat(errorRate.toFixed(3)),
        kp,
        ki,
        kd,
        activeRule: totalError > 2.0 ? 'R12: PB x ZE -> PB (Fast Slew)' : totalError > 0.5 ? 'R08: PS x NS -> PS (Fine Slew)' : 'R01: ZE x ZE -> ZE (Steady Deadband)',
        defuzzOutput: parseFloat((totalError * kp + errorRate * kd).toFixed(2)),
      },
      pso: {
        gBestFitness: parseFloat(this.psoGbest.toFixed(4)),
        iteration: this.psoIteration,
        maxIterations: this.psoMaxIterations,
        status: this.psoStatus,
        swarmSize: 20,
        bestAzimuth: parseFloat(this.targetAzimuth.toFixed(1)),
        bestElevation: parseFloat(this.targetElevation.toFixed(1)),
      }
    };
  }
}
