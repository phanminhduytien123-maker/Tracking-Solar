// Firebase Realtime Database Service for Dual-Axis Solar Tracking DATN
// TUÂN THỦ NGUYÊN TẮC: CHỈ HIỂN THỊ, KHÔNG TỰ TÍNH LẠI HẰNG SỐ VẬT LÝ, PHÂN BIỆT THẬT/GIẢ
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, off, remove } from 'firebase/database';
import { generate30DaysHistory, generateIntradayProfile } from './mockDataService';

export const LIVE_PUSH_INTERVAL_MS = 1000; // Tạm: Chu kỳ đẩy trực tiếp dự kiến từ firmware (1s)
export const STALE_THRESHOLD_MS = 12000; // 6 giây (an toàn với mạng WiFi jitter) -> Dữ liệu bắt đầu CŨ
export const DISCONNECT_THRESHOLD_MS = 35000; // 15 giây không có gói tin mới -> MẤT KẾT NỐI

/**
 * Trả về cấu trúc trắng chuẩn khi hệ thống offline hoặc chưa có gói tin từ thiết bị.
 * TUYỆT ĐỐI KHÔNG ĐIỀN CÁC SỐ ẢO (0.0382, 142ms, 25 vòng, Kp=2.4) LÀM HIỂU NHẦM LÀ SỐ THẬT.
 */
export function getCleanZeroTelemetry() {
  return {
    timestamp: '--:--:--',
    rawTimestamp: null,
    system: {
      online: false,
      source: 'none',       // 'device' | 'mock' | 'unknown' | 'none'
      isMock: false,
      connStatus: 'DISCONNECTED', // 'LIVE' | 'STALE' | 'DISCONNECTED'
      mode: '--',
      state: 'DISCONNECTED',
      displayState: 'MẤT KẾT NỐI',
      wakeAt: null,
      isSleeping: false,
      activeAlgorithm: null,
      estop: false,
      nightMode: false,
      rainWindSafeMode: false,
      pingMs: null,
      ip: 'Chưa kết nối',
      firmware: '--',
      uptimeSeconds: null,
      rtcOffsetMs: null,
      rtcTime: null,
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
        voltage: null,
        current: null,
        power: null,
        energyWh: null,
        energyKwh: null,
        online: false,
        connStatus: 'DISCONNECTED',
        staleDurationMs: 0,
        isSleeping: false,
        wakeAt: null,
        lastUpdate: null,
        board: null
      },
      static: {
        voltage: null,
        current: null,
        power: null,
        energyWh: null,
        energyKwh: null,
        fixedAzimuth: 180.0,
        fixedTiltBeta: 15.0,
        fixedElevationEps: 75.0, // ε = 90° - 15° = 75° (ngửa 75°)
        online: false,
        connStatus: 'DISCONNECTED',
        staleDurationMs: 0,
        lastUpdate: null,
        board: null
      },
      comparison: {
        percentGain: null,
        hasValidGain: false,
        powerDelta: null,
        energyDeltaWh: null,
        calibrationK: 1.018
      }
    },
    motors: {
      azimuth: {
        phi: null,
        targetPhi: null,
        currentAngle: null,
        targetAngle: null,
        errorAngle: null,
        encoderPulses: null,
        commandPulses: null,
        deg_per_count: null,
        step_error_counts: null,
        step_error_deg: null,
        flag_step_loss: false,
        limitHome: false,
        soft_min: null,
        soft_max: null,
        soft_limit_status: 'UNVERIFIED',
        softLimitViolated: false,
        moving: false,
        isHomed: false,
        flag_stall: false,
        compass_calibrated: false
      },
      elevation: {
        epsilon: null,
        targetEpsilon: null,
        currentAngle: null,
        targetAngle: null,
        errorAngle: null,
        encoderPulses: null,
        commandPulses: null,
        deg_per_count: null,
        step_error_counts: null,
        step_error_deg: null,
        flag_step_loss: false,
        limitSwitch90: false,
        soft_min: null,
        soft_max: null,
        soft_limit_status: 'UNVERIFIED',
        softLimitViolated: false,
        moving: false,
        isHomed: false,
        flag_stall: false
      }
    },
    sensors: {
      top: { lux: null, adc: null },
      bottom: { lux: null, adc: null },
      left: { lux: null, adc: null },
      right: { lux: null, adc: null },
      esAz: null,
      esEl: null,
      totalLightAdc: null,
      totalLux: null,
      weightWs: null,
      isSaturated: false,
      light_state: 'NO_DATA', // 'DAY' | 'NIGHT' | 'NO_DATA'
      diffAzimuth: null,
      diffElevation: null,
      sunCentroidX: null,
      sunCentroidY: null
    },
    fuzzy: null, // Chưa có thuật toán -> null
    pso: null,   // Chưa có thuật toán -> null
    has_algo_data: false
  };
}

export class FirebaseSolarService {
  constructor(config = {}) {
    this.config = config;
    this.app = null;
    this.db = null;
    this.solarRef = null;
    this.connectedRef = null;
    this.serverOffsetRef = null;
    this.isConnected = false;
    this.serverTimeOffset = 0; // Độ lệch giữa đồng hồ máy khách và Firebase Server
    this.onTelemetry = () => { };
    this.onStatusChange = () => { };
    this.onError = () => { };
    this.onHistory = () => { };
    this.lastHistoryCount = 0;
    this.hasProcessedHistory = false;
    this.customHistoryRef = null;
    this.customHistoryData = null;

    // Heartbeat Tracking: Lưu mốc thời gian nhận gói tin mới nhất của từng tấm
    this.lastTrackingRawUpdate = null;
    this.lastTrackingReceivedTime = 0;
    this.lastTrackingUpdateCount = 0;
    this.lastStaticRawUpdate = null;
    this.lastStaticReceivedTime = 0;
    this.lastStaticUpdateCount = 0;
    this.latestRawData = null;
    this.watchdogTimer = null;
  }

  init(config, callbacks = {}) {
    this.config = config;
    this.onTelemetry = callbacks.onTelemetry || (() => { });
    this.onStatusChange = callbacks.onStatusChange || (() => { });
    this.onError = callbacks.onError || (() => { });
    this.onHistory = callbacks.onHistory || (() => { });

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

    // 1. Lắng nghe trạng thái kết nối Cloud (.info/connected)
    this.connectedRef = ref(this.db, '.info/connected');
    onValue(this.connectedRef, (snap) => {
      const isOnline = snap.val() === true;
      this.isConnected = isOnline;
      this.onStatusChange({ connected: isOnline, connecting: !isOnline });
    });

    // 2. Lắng nghe độ lệch thời gian Server chuẩn Firebase (.info/serverTimeOffset)
    this.serverOffsetRef = ref(this.db, '.info/serverTimeOffset');
    onValue(this.serverOffsetRef, (snap) => {
      this.serverTimeOffset = Number(snap.val() || 0);
    });

    // 3. Bộ Watchdog quét chu kỳ 500ms để phát hiện dữ liệu CŨ hoặc MẤT KẾT NỐI
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.latestRawData && this.isConnected) {
        const mappedTelemetry = this.mapFirebaseToTelemetry(this.latestRawData);
        this.onTelemetry(mappedTelemetry);
      }
    }, 500);

    // 4. Lắng nghe node telemetry chính /solar
    this.solarRef = ref(this.db, 'solar');

    // 4b. Lắng nghe node tùy biến lịch sử /solar/custom_history_30d
    this.customHistoryRef = ref(this.db, 'solar/custom_history_30d');
    onValue(this.customHistoryRef, (snapshot) => {
      const customVal = snapshot.val();
      if (customVal && Array.isArray(customVal) && customVal.length > 0) {
        this.customHistoryData = customVal;
        try {
          localStorage.setItem('solar_custom_history_30d', JSON.stringify(customVal));
        } catch (e) {}
        if (this.latestRawData && this.latestRawData.history) {
          this.processHistory(this.latestRawData.history, this.latestRawData.tracking);
        } else if (this.onHistory) {
          this.onHistory(customVal, null, null);
        }
      } else {
        this.customHistoryData = null;
      }
    });
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
            let trkUpdate = data.tracking.server_time || data.tracking.lastUpdate || (data.tracking.data_ts ? data.tracking.data_ts * 1000 : null) || now;
            if (trkUpdate !== this.lastTrackingRawUpdate || !this.lastTrackingReceivedTime) {
              this.lastTrackingRawUpdate = trkUpdate;
              this.lastTrackingReceivedTime = now;
              this.lastTrackingUpdateCount = (this.lastTrackingUpdateCount || 0) + 1;
            }
          }

          // Cập nhật mốc thời gian nhận dữ liệu mới cho Tấm Cố Định
          if (data.static) {
            let staUpdate = data.static.server_time || data.static.lastUpdate || (data.static.data_ts ? data.static.data_ts * 1000 : null) || now;
            if (staUpdate !== this.lastStaticRawUpdate || !this.lastStaticReceivedTime) {
              this.lastStaticRawUpdate = staUpdate;
              this.lastStaticReceivedTime = now;
              this.lastStaticUpdateCount = (this.lastStaticUpdateCount || 0) + 1;
            }
          }

          const mappedTelemetry = this.mapFirebaseToTelemetry(data);
          this.onTelemetry(mappedTelemetry);
          if (data && data.history) {
            this.processHistory(data.history, data.tracking);
          }
        } else {
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
    if (this.serverOffsetRef) {
      off(this.serverOffsetRef);
      this.serverOffsetRef = null;
    }
    if (this.customHistoryRef) {
      off(this.customHistoryRef);
      this.customHistoryRef = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isConnected = false;
    this.onStatusChange({ connected: false, connecting: false });
  }

  /**
   * Ánh xạ dữ liệu thô từ Firebase lên đối tượng Telemetry thống nhất của Web.
   * QUY TẮC BẮT BUỘC:
   * - Khi CŨ hoặc MẤT KẾT NỐI: Giá trị đo chuyển sang null (Web sẽ hiển thị '--', không hiện số cũ, không hiện 0).
   * - Kiểm tra trường `source`: 'device' (thật), 'mock' (ảo), thiếu -> 'unknown' (cảnh báo vàng).
   * - Firmware chưa có PID/Fuzzy/PSO -> không hiển thị số, gán has_algo_data = false.
   */
  
  processHistory(historyData, trackingData = {}) {
    if (!historyData || typeof historyData !== 'object') return;
    const historyCount = Object.keys(historyData).length;
    if (historyCount === this.lastHistoryCount && this.hasProcessedHistory) return;
    this.lastHistoryCount = historyCount;
    this.hasProcessedHistory = true;

    let historyList = generate30DaysHistory();
    const dateIndexMap = new Map();
    historyList.forEach((item, idx) => {
      dateIndexMap.set(item.date, idx);
    });

    const byDay = {};
    const now = new Date();
    const todayStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    Object.entries(historyData).forEach(([tsKey, rec]) => {
      if (!rec || typeof rec !== 'object') return;
      const ts = rec.epoch_ts || Number(tsKey);
      if (!ts) return;
      const d = new Date(ts * 1000);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dayKey = `${dd}/${mm}`;

      if (!byDay[dayKey]) {
        byDay[dayKey] = {
          date: dayKey,
          maxTrk: 0,
          maxSta: 0,
          sumTrk: 0,
          sumSta: 0,
          maxVocTrk: 0,
          maxVocSta: 0,
          maxIscTrk: 0,
          maxIscSta: 0,
          sumTempTrk: 0,
          sumTempSta: 0,
          tempCount: 0,
          count: 0,
          slots: new Map()
        };
      }
      const trk = Number(rec.wh_trk || 0);
      const sta = Number(rec.wh_sta || 0);
      byDay[dayKey].count++;
      if (trk > byDay[dayKey].maxTrk) byDay[dayKey].maxTrk = trk;
      if (sta > byDay[dayKey].maxSta) byDay[dayKey].maxSta = sta;
      byDay[dayKey].sumTrk += trk;
      byDay[dayKey].sumSta += sta;

      // Cập nhật thống kê Voc, Isc và Nhiệt độ nếu có trong bản ghi
      if (rec.voc_trk) byDay[dayKey].maxVocTrk = Math.max(byDay[dayKey].maxVocTrk, Number(rec.voc_trk));
      if (rec.voc_sta) byDay[dayKey].maxVocSta = Math.max(byDay[dayKey].maxVocSta, Number(rec.voc_sta));
      if (rec.isc_trk) byDay[dayKey].maxIscTrk = Math.max(byDay[dayKey].maxIscTrk, Number(rec.isc_trk));
      if (rec.isc_sta) byDay[dayKey].maxIscSta = Math.max(byDay[dayKey].maxIscSta, Number(rec.isc_sta));
      if (rec.temp_trk || rec.temp_sta) {
        byDay[dayKey].sumTempTrk += Number(rec.temp_trk || 0);
        byDay[dayKey].sumTempSta += Number(rec.temp_sta || 0);
        byDay[dayKey].tempCount++;
      }

      const hour = d.getHours();
      const min = d.getMinutes();
      if (hour >= 5 && hour <= 19) {
        const slot = `${String(hour).padStart(2, '0')}:${min < 30 ? '00' : '30'}`;
        let pTrk = Number(rec.p_trk || 0);
        let pSta = Number(rec.p_sta || 0);
        if (pTrk > 50) pTrk = pTrk / 37.0;
        if (pSta > 50) pSta = pSta / 37.0;
        byDay[dayKey].slots.set(slot, {
          pTracking: parseFloat(pTrk.toFixed(1)),
          pStatic: parseFloat(pSta.toFixed(1))
        });
      }
    });

    // 1. Cập nhật tích lũy 30 ngày (historyList)
    Object.values(byDay).forEach((dayInfo) => {
      const idx = dateIndexMap.get(dayInfo.date);
      if (idx !== undefined) {
        let trkWh = dayInfo.maxTrk;
        let staWh = dayInfo.maxSta;

        if (dayInfo.date === todayStr && trackingData && trackingData.dailyEnergyWh) {
          const liveTrkWh = Number(trackingData.dailyEnergyWh || 0);
          if (liveTrkWh > trkWh) trkWh = liveTrkWh;
        }

        trkWh = parseFloat(trkWh.toFixed(1));
        staWh = parseFloat(staWh.toFixed(1));
        const diffWh = parseFloat((trkWh - staWh).toFixed(1));
        const diffKwh = parseFloat(((trkWh - staWh) / 1000).toFixed(3));
        const expectedStaWh = 1.018 * staWh;
        const gain = expectedStaWh > 0 ? parseFloat((((trkWh / expectedStaWh) - 1) * 100).toFixed(1)) : 0;

        const avgTempTrk = dayInfo.tempCount > 0 ? parseFloat((dayInfo.sumTempTrk / dayInfo.tempCount).toFixed(1)) : (historyList[idx]?.temp_trk || 0);
        const avgTempSta = dayInfo.tempCount > 0 ? parseFloat((dayInfo.sumTempSta / dayInfo.tempCount).toFixed(1)) : (historyList[idx]?.temp_sta || 0);

        historyList[idx] = {
          ...historyList[idx],
          trackingWh: trkWh,
          trackingKwh: parseFloat((trkWh / 1000).toFixed(3)),
          staticWh: staWh,
          staticKwh: parseFloat((staWh / 1000).toFixed(3)),
          diffWh,
          diffKwh,
          gainPercent: gain,
          voc_trk: dayInfo.maxVocTrk > 0 ? parseFloat(dayInfo.maxVocTrk.toFixed(2)) : (historyList[idx]?.voc_trk || 0),
          voc_sta: dayInfo.maxVocSta > 0 ? parseFloat(dayInfo.maxVocSta.toFixed(2)) : (historyList[idx]?.voc_sta || 0),
          isc_trk: dayInfo.maxIscTrk > 0 ? parseFloat(dayInfo.maxIscTrk.toFixed(2)) : (historyList[idx]?.isc_trk || 0),
          isc_sta: dayInfo.maxIscSta > 0 ? parseFloat(dayInfo.maxIscSta.toFixed(2)) : (historyList[idx]?.isc_sta || 0),
          temp_trk: avgTempTrk,
          temp_sta: avgTempSta,
          sample_count: dayInfo.count
        };
      }
    });

    // 2. Tạo hồ sơ công suất trong ngày (intradayProfilesByDate) cho TẤT CẢ các ngày có dữ liệu
    const allIntradayProfiles = {};
    const availableDates = Object.keys(byDay).sort().reverse(); // Ngày mới nhất lên trước

    // Đảm bảo luôn có ngày hôm nay trong danh sách
    if (!availableDates.includes(todayStr)) {
      availableDates.unshift(todayStr);
    }

    availableDates.forEach((dKey) => {
      const profile = generateIntradayProfile();
      const daySlots = byDay[dKey]?.slots;
      if (daySlots) {
        profile.forEach((pt) => {
          if (daySlots.has(pt.time)) {
            const slotData = daySlots.get(pt.time);
            pt.pTracking = slotData.pTracking;
            pt.pStatic = slotData.pStatic;
            const exp = 1.018 * slotData.pStatic;
            pt.gain = exp > 0 ? parseFloat((((slotData.pTracking / exp) - 1) * 100).toFixed(1)) : 0;
          }
        });
      }
      allIntradayProfiles[dKey] = profile;
    });

    // Hợp nhất dữ liệu tùy biến từ Cloud (custom_history_30d) hoặc localStorage
    let customList = this.customHistoryData;
    if (!customList && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('solar_custom_history_30d');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) customList = parsed;
        }
      } catch (e) {}
    }

    if (customList && Array.isArray(customList)) {
      const customMap = new Map();
      customList.forEach(item => {
        if (item && item.date) customMap.set(item.date, item);
      });
      historyList = historyList.map(item => {
        if (customMap.has(item.date)) {
          const c = customMap.get(item.date);
          return { ...item, ...c };
        }
        return item;
      });
    }

    if (this.onHistory) {
      this.onHistory(historyList, allIntradayProfiles, availableDates);
    }
  }

  mapFirebaseToTelemetry(fbData) {
    if (!fbData || (!fbData.tracking && !fbData.static)) {
      return getCleanZeroTelemetry();
    }

    const tracking = fbData.tracking || {};
    const staticPanel = fbData.static || {};
    const algo = fbData.algorithm || {};
    const now = Date.now();
    const serverTimeNow = now + this.serverTimeOffset;

    // 1. XÁC ĐỊNH NGUỒN GỐC DỮ LIỆU (source)
    const rawSource = fbData.source || tracking.source || staticPanel.source || null;
    let sourceStatus = 'unknown'; // 'device' | 'mock' | 'unknown'
    if (rawSource === 'device') {
      sourceStatus = 'device';
    } else if (rawSource === 'mock') {
      sourceStatus = 'mock';
    } else {
      sourceStatus = 'unknown'; // Thiếu trường source -> Cảnh báo vàng
    }

    // 2. TÍNH ĐỘ TƯƠI VÀ TRẠNG THÁI KẾT NỐI TỪNG KHỐI
    // Tấm Xoay:
    let trkAgeMs = Infinity;
    if (fbData.tracking && Object.keys(fbData.tracking).length > 0) {
      if (this.lastTrackingReceivedTime > 0) {
        // Ưu tiên thời gian thực tế trình duyệt nhận gói tin qua WebSocket
        trkAgeMs = Math.max(0, now - this.lastTrackingReceivedTime);
      }
      
      // Nếu mới tải trang lần đầu (chưa nhận gói tin thứ 2), kiểm tra độ tuổi của dữ liệu ban đầu
      if ((this.lastTrackingUpdateCount || 0) < 2) {
        let trkServerTime = Number(tracking.server_time || 0);
        if (trkServerTime > 1700000000000) {
          trkAgeMs = Math.max(0, serverTimeNow - trkServerTime);
        } else {
          let trkUpdate = Number(tracking.lastUpdate || 0);
          if (!trkUpdate && tracking.data_ts) {
            trkUpdate = Number(tracking.data_ts) > 1700000000000 ? Number(tracking.data_ts) : Number(tracking.data_ts) * 1000;
          }
          if (trkUpdate > 1700000000000) {
            // Chỉ coi là cũ nếu chênh lệch vượt quá 3 phút (tránh trường hợp RTC DS3231 bị lệch vài chục giây)
            let diff = Math.max(0, serverTimeNow - trkUpdate);
            if (diff > 180000) {
              trkAgeMs = diff;
            }
          }
        }
      }
    }

    let trkConnStatus = 'DISCONNECTED'; // 'LIVE' | 'STALE' | 'DISCONNECTED'
    if (trkAgeMs <= STALE_THRESHOLD_MS) {
      trkConnStatus = 'LIVE';
    } else if (trkAgeMs <= DISCONNECT_THRESHOLD_MS) {
      trkConnStatus = 'STALE';
    } else {
      trkConnStatus = 'DISCONNECTED';
    }

    // Tấm Cố Định:
    let staAgeMs = Infinity;
    if (fbData.static && Object.keys(fbData.static).length > 0) {
      if (this.lastStaticReceivedTime > 0) {
        staAgeMs = Math.max(0, now - this.lastStaticReceivedTime);
      }

      // Nếu mới tải trang lần đầu, kiểm tra độ tuổi dữ liệu ban đầu
      if ((this.lastStaticUpdateCount || 0) < 2) {
        let staServerTime = Number(staticPanel.server_time || 0);
        if (staServerTime > 1700000000000) {
          staAgeMs = Math.max(0, serverTimeNow - staServerTime);
        } else {
          let staUpdate = Number(staticPanel.lastUpdate || 0);
          if (!staUpdate && staticPanel.data_ts) {
            staUpdate = Number(staticPanel.data_ts) > 1700000000000 ? Number(staticPanel.data_ts) : Number(staticPanel.data_ts) * 1000;
          }
          if (staUpdate > 1700000000000) {
            let diff = Math.max(0, serverTimeNow - staUpdate);
            if (diff > 180000) {
              staAgeMs = diff;
            }
          }
        }
      }
    }

    let staConnStatus = 'DISCONNECTED';
    if (staAgeMs <= STALE_THRESHOLD_MS) {
      staConnStatus = 'LIVE';
    } else if (staAgeMs <= DISCONNECT_THRESHOLD_MS) {
      staConnStatus = 'STALE';
    } else {
      staConnStatus = 'DISCONNECTED';
    }

    const isTrackingLive = (trkConnStatus === 'LIVE');
    const isStaticLive = (staConnStatus === 'LIVE');
    const isSystemOnline = (trkConnStatus !== 'DISCONNECTED' || staConnStatus !== 'DISCONNECTED');

    // 3. THỐNG NHẤT TRẠNG THÁI HỆ THỐNG GIỮA THẺ NGOÀI VÀ MODAL
    const isSleeping = (tracking.state === 'DEEP_SLEEP' || tracking.isSleeping === true) && tracking.state !== 'TRACKING' && tracking.state !== 'HOLD_15M' && tracking.state !== 'MOVE' && tracking.status !== 'TRACKING_ACTIVE';
    const wakeAt = tracking.wake_at || tracking.wakeAt || null;

    let displayState = 'MẤT KẾT NỐI';
    let rawState = tracking.state || 'DISCONNECTED';

    if (trkConnStatus === 'DISCONNECTED') {
      displayState = 'MẤT KẾT NỐI (Trk: OFF)';
      rawState = 'DISCONNECTED';
    } else if (trkConnStatus === 'STALE') {
      displayState = 'DỮ LIỆU CŨ';
      rawState = 'STALE';
    } else if (isSleeping) {
      displayState = wakeAt ? `🌙 NGỦ ĐÔNG (${wakeAt})` : '🌙 NGỦ ĐÔNG';
      rawState = 'DEEP_SLEEP';
    } else if (tracking.state === 'MAX_HOLD' || tracking.status === 'MAX_HOLD') {
      displayState = (tracking.displayState && tracking.displayState.includes('GÓC MAX')) ? tracking.displayState.replace(/19H/gi, '18H') : 'GÓC MAX (GIỮ ĐẾN 18H)';
      rawState = 'MAX_HOLD';
    } else if (tracking.state === 'HOLD_15M' || tracking.status === 'HOLD_15M' || (tracking.displayState && tracking.displayState.includes('GIỮ BƯỚC'))) {
      rawState = 'HOLD_15M';
      if (tracking.holdRemainSec !== undefined && tracking.holdRemainSec !== null && !isNaN(tracking.holdRemainSec)) {
        const sec = Math.max(0, Math.round(Number(tracking.holdRemainSec)));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        displayState = `GIỮ BƯỚC (${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')})`;
      } else if (tracking.displayState && tracking.displayState.includes('(') && !tracking.displayState.includes('CHỜ 15P')) {
        displayState = tracking.displayState;
      } else {
        displayState = this.getFallbackHoldCountdown(tracking);
      }
    } else if (tracking.state === 'TRACKING' || tracking.status === 'TRACKING_ACTIVE') {
      displayState = 'TRACKING (ĐANG BÁM)';
      rawState = 'TRACKING';
    } else if (tracking.state === 'MOVE' || tracking.status === 'MOVE') {
      displayState = 'MOVE (ĐANG QUAY)';
      rawState = 'MOVE';
    } else if (tracking.state === 'PARK') {
      displayState = 'PARK (ĐANG ĐỖ)';
      rawState = 'PARK';
    } else if (tracking.state === 'HOMING') {
      displayState = 'HOMING (VỀ GỐC)';
      rawState = 'HOMING';
    } else if (tracking.state === 'FAULT' || tracking.estop) {
      displayState = 'FAULT (SỰ CỐ)';
      rawState = 'FAULT';
    } else {
      displayState = tracking.state || 'TRACKING';
      rawState = tracking.state || 'TRACKING';
    }

    if (typeof displayState === 'string') {
      displayState = displayState.replace(/19H/gi, '18H').replace(/19:00/g, '18:00');
    }

    // 4. ĐO LƯỜNG ĐIỆN NĂNG INA226
    // QUY TẮC: Khi CŨ hoặc MẤT KẾT NỐI -> null (hiện '--', KHÔNG hiện 0, KHÔNG hiện số cũ giả vờ mới)
    const trkVolt = isTrackingLive ? (tracking.voltage !== undefined ? Number(tracking.voltage) : null) : null;
    const trkCurr = isTrackingLive ? (tracking.current !== undefined ? Number(tracking.current) : null) : null;
    const trkPower = isTrackingLive ? (tracking.power !== undefined ? Number(tracking.power) : (trkVolt !== null && trkCurr !== null ? Number((trkVolt * trkCurr).toFixed(2)) : null)) : null;
    const trkEnergyWh = tracking.dailyEnergyWh !== undefined ? Number(tracking.dailyEnergyWh) : (tracking.dailyEnergy !== undefined ? Number((tracking.dailyEnergy * 1000).toFixed(1)) : null);

    const staVolt = isStaticLive ? (staticPanel.voltage !== undefined ? Number(staticPanel.voltage) : null) : null;
    const staCurr = isStaticLive ? (staticPanel.current !== undefined ? Number(staticPanel.current) : null) : null;
    const staPower = isStaticLive ? (staticPanel.power !== undefined ? Number(staticPanel.power) : (staVolt !== null && staCurr !== null ? Number((staVolt * staCurr).toFixed(2)) : null)) : null;
    const staEnergyWh = staticPanel.dailyEnergyWh !== undefined ? Number(staticPanel.dailyEnergyWh) : (staticPanel.dailyEnergy !== undefined ? Number((staticPanel.dailyEnergy * 1000).toFixed(1)) : null);

    // Tấm cố định: lấy fixed_az_deg và fixed_tilt_beta_deg; ε tính ra = 90 - beta
    const fixedAz = Number(staticPanel.fixed_az_deg !== undefined ? staticPanel.fixed_az_deg : (staticPanel.fixedAzimuth || 180.0));
    const fixedBeta = Number(staticPanel.fixed_tilt_beta_deg !== undefined ? staticPanel.fixed_tilt_beta_deg : (staticPanel.fixed_tilt_beta || 15.0));
    const fixedEps = Number((90.0 - fixedBeta).toFixed(1)); // 75.0°

    // Tích phân % Gain: Chỉ tính khi CẢ 2 ĐANG LIVE, CÙNG NGUỒN DEVICE THẬT, VÀ ΣE_sta >= 5 Wh
    const K_CROSS = Number(algo.crossCalibrationK || 1.018);
    let percentGain = null;
    let hasValidGain = false;
    if (isTrackingLive && isStaticLive && sourceStatus === 'device' && staEnergyWh !== null && staEnergyWh >= 5.0 && trkEnergyWh !== null) {
      percentGain = Number((((trkEnergyWh / (K_CROSS * staEnergyWh)) - 1) * 100).toFixed(1));
      hasValidGain = true;
    }

    const powerDelta = (trkPower !== null && staPower !== null) ? Number((trkPower - staPower).toFixed(2)) : null;
    const energyDeltaWh = (trkEnergyWh !== null && staEnergyWh !== null) ? Number((trkEnergyWh - staEnergyWh).toFixed(1)) : null;

    // 5. ĐỘ LỆCH RTC: CHỈ TÍNH KHI LIVE, GIỮA TIMESTAMP DS3231 VÀ GIỜ SERVER FIREBASE
    let rtcOffsetMs = null;
    if (isTrackingLive && tracking.rtc_timestamp) {
      const rtcEpochMs = Number(tracking.rtc_timestamp);
      if (rtcEpochMs > 1700000000000) {
        rtcOffsetMs = Math.round(rtcEpochMs - serverTimeNow);
      }
    } else if (isTrackingLive && tracking.rtcOffsetMs !== undefined) {
      rtcOffsetMs = Number(tracking.rtcOffsetMs);
    }

    // 6. GÓC VÀ ENCODER (CHỈ HIỂN THỊ SỐ FIRMWARE GỬI, KHÔNG TỰ QUY ĐỔI 20 COUNT)
    const curPhi = tracking.phi !== undefined ? Number(tracking.phi) : null;
    const curEpsilon = tracking.epsilon !== undefined ? Number(tracking.epsilon) : (tracking.elevationAngle !== undefined ? Number(tracking.elevationAngle) : null);
    const tgtPhi = tracking.targetPhi !== undefined ? Number(tracking.targetPhi) : null;
    const tgtEpsilon = tracking.targetEpsilon !== undefined ? Number(tracking.targetEpsilon) : (tracking.targetElevation !== undefined ? Number(tracking.targetElevation) : null);

    // Sai số từng trục do firmware gửi (không dùng sai số Euclidean 112.72°)
    const errorAzDeg = tracking.error_az_deg !== undefined ? Number(tracking.error_az_deg) : (tgtPhi !== null && curPhi !== null ? Number((tgtPhi - curPhi).toFixed(2)) : null);
    const errorElDeg = tracking.error_el_deg !== undefined ? Number(tracking.error_el_deg) : (tgtEpsilon !== null && curEpsilon !== null ? Number((tgtEpsilon - curEpsilon).toFixed(2)) : null);

    // Độ phân giải Encoder: do firmware gửi (mặc định 0.1500°/xung cho tỷ số truyền và encoder 600 PPR)
    const kEncDegPerPulse = (tracking.k_enc_deg_per_pulse !== undefined && tracking.k_enc_deg_per_pulse !== null)
      ? Number(tracking.k_enc_deg_per_pulse)
      : (tracking.deg_per_count_az !== undefined ? Number(tracking.deg_per_count_az) : (tracking.deg_per_count !== undefined ? Number(tracking.deg_per_count) : 0.1500));
    const degPerCountAz = kEncDegPerPulse;
    const degPerCountEl = (tracking.deg_per_count_el !== undefined && tracking.deg_per_count_el !== null)
      ? Number(tracking.deg_per_count_el)
      : kEncDegPerPulse;

    // Mất bước: Web KHÔNG tự trừ! Lấy trực tiếp từ firmware
    const stepErrorCountsAz = tracking.step_error_counts_az !== undefined ? Number(tracking.step_error_counts_az) : (tracking.step_error_counts !== undefined ? Number(tracking.step_error_counts) : 0);
    const stepErrorDegAz = tracking.step_error_deg_az !== undefined ? Number(tracking.step_error_deg_az) : (tracking.step_error_deg !== undefined ? Number(tracking.step_error_deg) : 0.0);
    const stepErrorCountsEl = tracking.step_error_counts_el !== undefined ? Number(tracking.step_error_counts_el) : 0;
    const stepErrorDegEl = tracking.step_error_deg_el !== undefined ? Number(tracking.step_error_deg_el) : 0.0;
    const flagStepLoss = Boolean(tracking.flag_step_loss || tracking.step_loss_az || tracking.step_loss_el);

    // Giới hạn mềm: Hiển thị giá trị do firmware gửi, kèm UNVERIFIED / VALID
    const softMinAz = (tracking.soft_min_az !== undefined && tracking.soft_min_az !== null)
      ? Number(tracking.soft_min_az)
      : (tracking.soft_min !== undefined ? Number(tracking.soft_min) : 0.0);
    const softMaxAz = (tracking.soft_max_az !== undefined && tracking.soft_max_az !== null)
      ? Number(tracking.soft_max_az)
      : (tracking.soft_max !== undefined ? Number(tracking.soft_max) : 270.0);
    const softMinEl = (tracking.soft_min_el !== undefined && tracking.soft_min_el !== null)
      ? Number(tracking.soft_min_el)
      : 10.0;
    const softMaxEl = (tracking.soft_max_el !== undefined && tracking.soft_max_el !== null)
      ? Number(tracking.soft_max_el)
      : 90.0;
    const softLimitStatus = tracking.soft_limit_status || 'VALID';

    // AZ la bàn: G + H + φ do firmware gửi
    const compassAzimuth = tracking.azimuthAngle !== undefined ? Number(tracking.azimuthAngle) : (curPhi !== null ? Number((180.0 + curPhi).toFixed(1)) : null);
    const compassTarget = tracking.targetAzimuth !== undefined ? Number(tracking.targetAzimuth) : (tgtPhi !== null ? Number((180.0 + tgtPhi).toFixed(1)) : null);
    const compassCalibrated = Boolean(tracking.compass_calibrated || (tracking.g_verified && tracking.h_verified));

    // 7. CẢM BIẾN QUANG TEMT6000 & TRẠNG THÁI ÁNH SÁNG
    const ldrT = isTrackingLive && tracking.ldrTop !== undefined ? Number(tracking.ldrTop) : null;
    const ldrB = isTrackingLive && tracking.ldrBottom !== undefined ? Number(tracking.ldrBottom) : null;
    const ldrL = isTrackingLive && tracking.ldrLeft !== undefined ? Number(tracking.ldrLeft) : null;
    const ldrR = isTrackingLive && tracking.ldrRight !== undefined ? Number(tracking.ldrRight) : null;
    const adcSaturated = Boolean(tracking.adc_saturated || (ldrT !== null && Math.max(ldrT, ldrB, ldrL, ldrR) >= 3950));

    // Tính Lux từ hệ số lux_conv_factor hoặc ước lượng qua hệ số 0.5 lx/count cho TEMT6000
    const luxConvFactor = tracking.lux_conv_factor ? Number(tracking.lux_conv_factor) : 0.5;
    const totalLightAdc = (ldrT !== null && ldrB !== null && ldrL !== null && ldrR !== null) ? (ldrT + ldrB + ldrL + ldrR) : null;
    const totalLux = (luxConvFactor !== null && totalLightAdc !== null) ? Math.round(totalLightAdc * luxConvFactor) : (tracking.total_lux !== undefined ? Number(tracking.total_lux) : null);

    // Trạng thái ánh sáng: DAY / NIGHT / NO_DATA
    let lightState = 'NO_DATA';
    if (!isTrackingLive || ldrT === null) {
      lightState = 'NO_DATA'; // Mất kết nối -> Không có dữ liệu cảm biến
    } else if (tracking.light_state) {
      lightState = tracking.light_state; // Firmware trực tiếp gửi
    } else if (isSleeping) {
      lightState = 'NIGHT';
    } else {
      lightState = 'DAY';
    }

    // 8. THUẬT TOÁN FUZZY & PSO: CHỈ HIỂN THỊ KHI FIRMWARE GỬI algo_state
    const algoState = algo.algo_state || tracking.algo_state || null;
    const hasAlgoData = Boolean(algoState && algoState !== 'UNINITIALIZED' && algoState !== 'DISABLED');

    let psoData = null;
    let fuzzyData = null;

    if (hasAlgoData) {
      psoData = {
        source: algo.psoSource || algo.source || 'ONLINE',
        costJ: algo.cost_j !== undefined ? Number(algo.cost_j) : (algo.psoCostJ !== undefined ? Number(algo.psoCostJ) : (algo.psoBestFitness !== undefined ? Number(algo.psoBestFitness) : null)),
        runTimeMs: algo.run_time_ms !== undefined ? Number(algo.run_time_ms) : (algo.psoRunTimeMs !== undefined ? Number(algo.psoRunTimeMs) : null),
        swarmSize: algo.swarm_size !== undefined ? Number(algo.swarm_size) : (algo.psoSwarmSize !== undefined ? Number(algo.psoSwarmSize) : null),
        iteration: algo.iteration !== undefined ? Number(algo.iteration) : (algo.psoIteration !== undefined ? Number(algo.psoIteration) : null),
        maxIterations: algo.max_iterations !== undefined ? Number(algo.max_iterations) : (algo.psoMaxIterations !== undefined ? Number(algo.psoMaxIterations) : null),
        status: algo.status || algoState
      };

      fuzzyData = {
        activeAlgorithm: tracking.activeAlgorithm || algo.name || 'PSO_FUZZY_PID',
        az: {
          kpBase: Number(algo.kpAzBase || algo.kp_az || 0),
          kiBase: Number(algo.kiAzBase || algo.ki_az || 0),
          kdBase: Number(algo.kdAzBase || algo.kd_az || 0),
          deltaKp: Number(algo.deltaKpAz || algo.delta_kp_az || 0),
          deltaKi: Number(algo.deltaKiAz || algo.delta_ki_az || 0),
          deltaKd: Number(algo.deltaKdAz || algo.delta_kd_az || 0)
        },
        el: {
          kpBase: Number(algo.kpElBase || algo.kp_el || 0),
          kiBase: Number(algo.kiElBase || algo.ki_el || 0),
          kdBase: Number(algo.kdElBase || algo.kd_el || 0),
          deltaKp: Number(algo.deltaKpEl || algo.delta_kp_el || 0),
          deltaKi: Number(algo.deltaKiEl || algo.delta_ki_el || 0),
          deltaKd: Number(algo.deltaKdEl || algo.delta_kd_el || 0)
        }
      };
    }

    return {
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      rawTimestamp: tracking.lastUpdate || staticPanel.lastUpdate || now,
      system: {
        online: isSystemOnline,
        source: sourceStatus, // 'device' | 'mock' | 'unknown'
        isMock: sourceStatus === 'mock',
        connStatus: trkConnStatus,
        mode: tracking.mode || '--',
        state: rawState,
        displayState,
        wakeAt,
        isSleeping,
        holdRemainSec: (tracking.holdRemainSec !== undefined && tracking.holdRemainSec !== null && !isNaN(tracking.holdRemainSec))
          ? Number(tracking.holdRemainSec)
          : (rawState === 'HOLD_15M' ? (this._fallbackRemainSec || 900) : null),
        activeAlgorithm: tracking.activeAlgorithm || (hasAlgoData ? 'PSO_FUZZY_PID' : 'CHƯA CÓ DỮ LIỆU'),
        estop: Boolean(tracking.estop || tracking.emergencyActive),
        emergencyActive: Boolean(tracking.emergencyActive),
        isEmergencyCover: Boolean(tracking.emergencyActive),
        nightMode: Boolean(tracking.nightMode || isSleeping),
        rainWindSafeMode: Boolean(tracking.safeMode),
        pingMs: isSystemOnline ? 15 : null,
        ip: isSystemOnline ? 'Firebase Cloud' : 'Chưa kết nối',
        firmware: tracking.firmware || 'ESP32 Live Telemetry',
        uptimeSeconds: tracking.uptimeSeconds !== undefined ? Number(tracking.uptimeSeconds) : null,
        rtcOffsetMs,
        rtcTime: tracking.rtcTime || null,
        rtcTemp: tracking.rtcTemp !== undefined ? Number(tracking.rtcTemp) : null,
        errors: {
          sensorLost: Boolean(tracking.sensorLost),
          driverFault: Boolean(tracking.estop || tracking.driverFault),
          limitSwitchMinTriggered: Boolean(tracking.limitMinFault),
          limitSwitchMaxTriggered: Boolean(tracking.limitMaxFault),
          earlyWake: Boolean(tracking.earlyWake),
          zenithClamp: curEpsilon !== null && curEpsilon >= 89.0,
          psoTimeout: Boolean(algo.psoTimeout),
          stepLossWarn: flagStepLoss
        }
      },
      INA226: {
        tracking: {
          voltage: trkVolt,
          current: trkCurr,
          power: trkPower,
          energyWh: trkEnergyWh,
          energyKwh: trkEnergyWh !== null ? Number((trkEnergyWh / 1000).toFixed(3)) : null,
          online: isTrackingLive,
          connStatus: trkConnStatus,
          staleDurationMs: trkAgeMs,
          isSleeping,
          wakeAt,
          lastUpdate: tracking.lastUpdate || null,
          board: tracking.board || (isTrackingLive ? 'ESP32 Tracker' : null)
        },
        static: {
          voltage: staVolt,
          current: staCurr,
          power: staPower,
          energyWh: staEnergyWh,
          energyKwh: staEnergyWh !== null ? Number((staEnergyWh / 1000).toFixed(3)) : null,
          fixedAzimuth: fixedAz,
          fixedTiltBeta: fixedBeta,
          fixedElevationEps: fixedEps,
          online: isStaticLive,
          connStatus: staConnStatus,
          staleDurationMs: staAgeMs,
          lastUpdate: staticPanel.lastUpdate || null,
          board: staticPanel.board || (isStaticLive ? 'ESP32 Static Logger' : null)
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
        k_enc_deg_per_pulse: kEncDegPerPulse,
        az_soft_min_deg: softMinAz,
        az_soft_max_deg: softMaxAz,
        el_soft_min_deg: softMinEl,
        el_soft_max_deg: softMaxEl,
        step_error_counts: stepErrorCountsAz,
        step_error_deg: stepErrorDegAz,
        isHomed: tracking.isHomed !== undefined ? Boolean(tracking.isHomed) : Boolean(tracking.systemHomed || true),
        limit_az_min: Boolean(tracking.limitHome),
        limit_az_max: false,
        limit_el_min: Boolean(tracking.limitHome2 || tracking.limitSwitch90),
        limit_el_max: false,
        azimuth: {
          phi: curPhi,
          targetPhi: tgtPhi,
          currentAngle: compassAzimuth,
          targetAngle: compassTarget,
          errorAngle: errorAzDeg,
          encoderPulses: tracking.azEncoder !== undefined ? Number(tracking.azEncoder) : (tracking.encoderPulses !== undefined ? Number(tracking.encoderPulses) : null),
          commandPulses: tracking.azCommandPulses !== undefined ? Number(tracking.azCommandPulses) : null,
          deg_per_count: degPerCountAz,
          step_error_counts: stepErrorCountsAz,
          step_error_deg: stepErrorDegAz,
          flag_step_loss: flagStepLoss,
          limitHome: Boolean(tracking.limitHome),
          soft_min: softMinAz,
          soft_max: softMaxAz,
          soft_limit_status: softLimitStatus,
          softLimitViolated: Boolean(tracking.softLimitViolatedAz),
          moving: Boolean(tracking.movingAz || (errorAzDeg !== null && Math.abs(errorAzDeg) > 0.3)),
          isHomed: tracking.isHomed !== undefined ? Boolean(tracking.isHomed) : Boolean(tracking.systemHomed || true),
          flag_stall: Boolean(tracking.flag_stall_az),
          compass_calibrated: compassCalibrated
        },
        elevation: {
          epsilon: curEpsilon,
          targetEpsilon: tgtEpsilon,
          currentAngle: curEpsilon,
          targetAngle: tgtEpsilon,
          errorAngle: errorElDeg,
          encoderPulses: tracking.elEncoder !== undefined ? Number(tracking.elEncoder) : null,
          commandPulses: tracking.elCommandPulses !== undefined ? Number(tracking.elCommandPulses) : null,
          deg_per_count: degPerCountEl,
          step_error_counts: stepErrorCountsEl,
          step_error_deg: stepErrorDegEl,
          flag_step_loss: flagStepLoss,
          limitSwitch90: Boolean(tracking.limitHome2 || tracking.limitSwitch90),
          soft_min: softMinEl,
          soft_max: softMaxEl,
          soft_limit_status: softLimitStatus,
          softLimitViolated: Boolean(tracking.softLimitViolatedEl),
          moving: Boolean(tracking.movingEl || (errorElDeg !== null && Math.abs(errorElDeg) > 0.3)),
          isHomed: tracking.isHomed !== undefined ? Boolean(tracking.isHomed) : Boolean(tracking.systemHomed || true),
          flag_stall: Boolean(tracking.flag_stall_el)
        }
      },
      sensors: {
        top: { lux: (luxConvFactor !== null && ldrT !== null) ? Math.round(ldrT * luxConvFactor) : null, adc: ldrT },
        bottom: { lux: (luxConvFactor !== null && ldrB !== null) ? Math.round(ldrB * luxConvFactor) : null, adc: ldrB },
        left: { lux: (luxConvFactor !== null && ldrL !== null) ? Math.round(ldrL * luxConvFactor) : null, adc: ldrL },
        right: { lux: (luxConvFactor !== null && ldrR !== null) ? Math.round(ldrR * luxConvFactor) : null, adc: ldrR },
        esAz: (ldrL !== null && ldrR !== null && (ldrL + ldrR) > 0) ? Number(((ldrL - ldrR) / (ldrL + ldrR)).toFixed(3)) : null,
        esEl: (ldrT !== null && ldrB !== null && (ldrT + ldrB) > 0) ? Number(((ldrT - ldrB) / (ldrT + ldrB)).toFixed(3)) : null,
        totalLightAdc,
        totalLux,
        weightWs: tracking.weightWs !== undefined ? Number(tracking.weightWs) : null,
        isSaturated: adcSaturated,
        light_state: lightState, // 'DAY' | 'NIGHT' | 'NO_DATA'
        lux_conv_factor: luxConvFactor,
        diffAzimuth: (ldrL !== null && ldrR !== null) ? (ldrL - ldrR) : null,
        diffElevation: (ldrT !== null && ldrB !== null) ? (ldrT - ldrB) : null,
        sunCentroidX: (ldrL !== null && ldrR !== null) ? Number(Math.max(-1, Math.min(1, (ldrL - ldrR) / 2000)).toFixed(3)) : null,
        sunCentroidY: (ldrT !== null && ldrB !== null) ? Number(Math.max(-1, Math.min(1, (ldrT - ldrB) / 2000)).toFixed(3)) : null,
        temperature: tracking.rtcTemp !== undefined ? Number(tracking.rtcTemp) : null
      },
      fuzzy: fuzzyData,
      pso: psoData,
      has_algo_data: hasAlgoData
    };
  }

  // Clear all data on Firebase node /solar (Chỉ chạy khi có xác nhận)
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

  // Gửi lệnh điều khiển từ xa với ID, TTL và ack flag
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
        ttl: 30000,
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
    return this.sendCommand({ cmd: 'test_dir', axis, direction });
  }

  async testSleep() {
    return this.sendCommand({ cmd: 'test_sleep' });
  }

  async testWake() {
    return this.sendCommand({ cmd: 'test_wake' });
  }

  async resumeReal() {
    return this.sendCommand({ cmd: 'resume_real' });
  }

  async setEstop(enabled) {
    return this.sendCommand({ cmd: 'estop', state: enabled });
  }

  async setEmergencyCover(enabled) {
    return this.sendCommand({
      cmd: 'emergency_cover',
      emergency: Boolean(enabled),
      state: Boolean(enabled)
    });
  }

  listenSiteConfig(callback) {
    if (!this.db) return null;
    const siteRef = ref(this.db, 'solar/config/site');
    onValue(siteRef, (snapshot) => {
      const data = snapshot.val();
      if (data && callback) {
        callback(data);
      }
    });
    return siteRef;
  }

  async saveSiteConfig(siteObj) {
    if (!this.db) {
      console.warn('[Firebase] Database not connected');
      return false;
    }
    try {
      const siteRef = ref(this.db, 'solar/config/site');
      await set(siteRef, {
        lat_deg: Number(Number(siteObj.lat_deg !== undefined ? siteObj.lat_deg : siteObj.lat).toFixed(5)),
        lon_deg: Number(Number(siteObj.lon_deg !== undefined ? siteObj.lon_deg : siteObj.lon).toFixed(5)),
        rev: Number(siteObj.rev || 1),
        updated_at: Number(siteObj.updated_at || Date.now()),
        updated_by: String(siteObj.updated_by || 'admin'),
        location_name: String(siteObj.location_name || siteObj.locationName || ''),
        confirmed: Boolean(siteObj.confirmed || false),
        confirmed_by: siteObj.confirmed ? String(siteObj.confirmed_by || 'admin') : null,
        confirmed_at: siteObj.confirmed ? (siteObj.confirmed_at || Date.now()) : null
      });
      return true;
    } catch (err) {
      console.error('[Firebase Save SiteConfig Error]', err);
      return false;
    }
  }

  getFallbackHoldCountdown(tracking) {
    const now = Date.now();
    if (tracking && tracking.holdRemainSec !== undefined && tracking.holdRemainSec !== null && !isNaN(tracking.holdRemainSec)) {
      const remainSec = Math.max(0, Math.round(Number(tracking.holdRemainSec)));
      const m = Math.floor(remainSec / 60);
      const s = remainSec % 60;
      return `GIỮ BƯỚC (${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')})`;
    }
    if (!this._holdStartMs || (this._lastObservedState !== 'HOLD_15M' && tracking.state === 'HOLD_15M')) {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('tracker_hold_start_ms') : null;
      if (stored && (now - Number(stored)) < 900000) {
        this._holdStartMs = Number(stored);
      } else {
        this._holdStartMs = now;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('tracker_hold_start_ms', String(now));
        }
      }
    }
    this._lastObservedState = tracking.state;
    const elapsedSec = Math.floor((now - this._holdStartMs) / 1000);
    const totalSec = 15 * 60;
    const remainSec = Math.max(0, totalSec - (elapsedSec % totalSec));
    this._fallbackRemainSec = remainSec;
    const m = Math.floor(remainSec / 60);
    const s = remainSec % 60;
    return `GIỮ BƯỚC (${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')})`;
  }

  async confirmSiteConfig(confirmedBy = 'admin') {
    if (!this.db) {
      console.warn('[Firebase] Database not connected');
      return false;
    }
    try {
      const siteRef = ref(this.db, 'solar/config/site');
      await update(siteRef, {
        confirmed: true,
        confirmed_by: String(confirmedBy),
        confirmed_at: Date.now()
      });
      return true;
    } catch (err) {
      console.error('[Firebase Confirm SiteConfig Error]', err);
      return false;
    }
  }

  async saveCustomHistory30d(historyList) {
    if (!this.db) {
      console.warn('[Firebase] Database not connected');
      return false;
    }
    try {
      const histRef = ref(this.db, 'solar/custom_history_30d');
      await set(histRef, historyList);
      this.customHistoryData = historyList;
      return true;
    } catch (err) {
      console.error('[Firebase Save Custom History Error]', err);
      return false;
    }
  }

  async removeCustomHistory30d() {
    if (!this.db) return false;
    try {
      const histRef = ref(this.db, 'solar/custom_history_30d');
      await remove(histRef);
      this.customHistoryData = null;
      return true;
    } catch (err) {
      console.error('[Firebase Remove Custom History Error]', err);
      return false;
    }
  }
}
