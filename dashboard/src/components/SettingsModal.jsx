import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStoredUsers, fetchCloudUsers, lockUser1Hour, lockUserPermanent, restoreUser } from '../services/userService';
import InstallationLocationTab from './InstallationLocationTab';
import HistoryDataManagementTab from './HistoryDataManagementTab';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser = null,
  dataSource, // 'mock' | 'firebase' | 'esp32_ws'
  setDataSource,
  firebaseConfig,
  setFirebaseConfig,
  wsUrl,
  setWsUrl,
  restUrl,
  setRestUrl,
  refreshRate,
  setRefreshRate,
  latestTelemetry,
  firebaseConnected,
  onClearFirebase,
  onSendTestPacket,
  currentLocation = null,
  onSelectLocation = null,
  onConfirmLocation = null,
  weatherData = null,
  initialTab = null,
  history30Days = [],
  onUpdateDayData = null,
  onDeleteDayData = null,
  onAddDayData = null,
  onResetHistoryData = null,
  onLoadRealisticDataset = null,
  targetEditDate = null,
  onSetSleepDisabled = null,
  onSetRelayInterval = null,
  onSetLampAutoDisabled = null,
  onSetLampManualState = null,
  onSetLampCustomCycle = null
}) {
  const [activeTab, setActiveTab] = useState(() => initialTab || 'config'); // 'config' | 'location' | 'users' | 'esp32_trk' | 'esp32_fix' | 'json'
  const [copiedTab, setCopiedTab] = useState(null);
  const [isExperimentLocked, setIsExperimentLocked] = useState(() => localStorage.getItem('solar_experiment_locked') === 'true');
  const [relaySecInput, setRelaySecInput] = useState(() => Number(latestTelemetry?.system?.relayIntervalSec || localStorage.getItem('solar_relay_interval_sec') || 10));
  const [lampOnMinInput, setLampOnMinInput] = useState(() => Number(latestTelemetry?.system?.lampOnMin || localStorage.getItem('solar_lamp_on_min') || 15));
  const [lampOffMinInput, setLampOffMinInput] = useState(() => Number(latestTelemetry?.system?.lampOffMin || localStorage.getItem('solar_lamp_off_min') || 15));
  const [hwConfigFeedback, setHwConfigFeedback] = useState(null);

  useEffect(() => {
    const liveRelaySec = latestTelemetry?.system?.relayIntervalSec;
    if (liveRelaySec && !isNaN(liveRelaySec)) {
      setRelaySecInput(Number(liveRelaySec));
    }
  }, [latestTelemetry?.system?.relayIntervalSec]);

  useEffect(() => {
    const liveOn = latestTelemetry?.system?.lampOnMin;
    if (liveOn && !isNaN(liveOn)) {
      setLampOnMinInput(Number(liveOn));
    }
  }, [latestTelemetry?.system?.lampOnMin]);

  useEffect(() => {
    const liveOff = latestTelemetry?.system?.lampOffMin;
    if (liveOff && !isNaN(liveOff)) {
      setLampOffMinInput(Number(liveOff));
    }
  }, [latestTelemetry?.system?.lampOffMin]);

  // Sync initialTab if passed dynamically
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // User Management State
  const [usersList, setUsersList] = useState(() => getStoredUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userActionFeedback, setUserActionFeedback] = useState(null);

  // Sync users from Firebase Cloud whenever the modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setUsersList(getStoredUsers());
      fetchCloudUsers().then(cloudUsers => {
        if (cloudUsers) setUsersList(cloudUsers);
      });
    }
  }, [isOpen, activeTab]);

  const handleRefreshUsers = async () => {
    const cloudUsers = await fetchCloudUsers();
    setUsersList(cloudUsers || getStoredUsers());
    setUserActionFeedback({
      type: 'info',
      message: 'Đã đồng bộ danh sách trạng thái người dùng từ Firebase Cloud!'
    });
    setTimeout(() => setUserActionFeedback(null), 3000);
  };

  const handleLock1H = async (user) => {
    const updated = await lockUser1Hour(user.id);
    setUsersList(updated);
    setUserActionFeedback({
      type: 'warning',
      message: `Đã khóa tạm thời 1 giờ tài khoản "${user.displayName}" (@${user.username}) trên toàn hệ thống.`
    });
    setTimeout(() => setUserActionFeedback(null), 4000);
  };

  const handleLockPerm = async (user) => {
    if (window.confirm(`Xác nhận khóa VĨNH VIỄN tài khoản "${user.displayName}" (@${user.username})?`)) {
      const updated = await lockUserPermanent(user.id);
      setUsersList(updated);
      setUserActionFeedback({
        type: 'danger',
        message: `Đã khóa vĩnh viễn tài khoản "${user.displayName}" (@${user.username}) trên toàn hệ thống.`
      });
      setTimeout(() => setUserActionFeedback(null), 4000);
    }
  };

  const handleRestore = async (user) => {
    const updated = await restoreUser(user.id);
    setUsersList(updated);
    setUserActionFeedback({
      type: 'success',
      message: `Đã khôi phục và mở khóa tài khoản "${user.displayName}" (@${user.username}) thành công!`
    });
    setTimeout(() => setUserActionFeedback(null), 4000);
  };

  if (!isOpen) return null;

  const esp32TrackerCode = `// =========================================================================
// ESP32-S3 #1: DUAL-AXIS SOLAR TRACKER (FUZZY-PID & PSO)
// Arduino IDE Libraries:
// 1. Firebase ESP Client by Mobizt
// 2. Adafruit  INA226
// 3. ArduinoJson
// =========================================================================
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_ INA226.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASS"

#define API_KEY "${firebaseConfig.apiKey || 'YOUR_FIREBASE_API_KEY'}"
#define DATABASE_URL "${firebaseConfig.databaseURL || 'https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app/'}"

FirebaseData fbdo;
FirebaseData fbdoStream;
FirebaseAuth auth;
FirebaseConfig config;
Adafruit_ INA226  INA226_trk(0x40);

#define LDR_TOP 4
#define LDR_BOTTOM 5
#define LDR_LEFT 6
#define LDR_RIGHT 7

float currentAzimuth = 140.0;
float currentElevation = 45.0;
float totalEnergyWh = 0.0;
unsigned long lastSend = 0;
String currentMode = "AUTO";

void streamCallback(FirebaseStream data) {
  if (data.dataType() == "string" || data.dataType() == "json") {
    Serial.println("[Firebase Stream] Lenh dieu khien: " + data.stringData());
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("[Firebase Stream] Timeout, retrying...");
}

void setup() {
  Serial.begin(115200);
   INA226_trk.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.test_mode = true;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Firebase.RTDB.beginStream(&fbdoStream, "/solar/control");
  Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);
}

void loop() {
  if (millis() - lastSend > 1000) {
    lastSend = millis();

    float voltage =  INA226_trk.getBusVoltage_V();
    float current =  INA226_trk.getCurrent_mA() / 1000.0;
    float power = voltage * current;
    totalEnergyWh += (power * (1.0 / 3600.0));

    int ldrT = analogRead(LDR_TOP);
    int ldrB = analogRead(LDR_BOTTOM);
    int ldrL = analogRead(LDR_LEFT);
    int ldrR = analogRead(LDR_RIGHT);

    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("dailyEnergy", totalEnergyWh / 1000.0);
    json.set("azimuthAngle", currentAzimuth);
    json.set("elevationAngle", currentElevation);
    json.set("targetAzimuth", currentAzimuth + 0.5);
    json.set("targetElevation", currentElevation + 0.3);
    json.set("ldrTop", ldrT);
    json.set("ldrBottom", ldrB);
    json.set("ldrLeft", ldrL);
    json.set("ldrRight", ldrR);
    json.set("mode", currentMode);
    json.set("status", "TRACKING_ACTIVE");
    json.set("lastUpdate", (double)millis());

    if (Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &json)) {
      Serial.println("[ESP32-1] Sent tracking telemetry!");
    } else {
      Serial.println("[ESP32-1] Error: " + fbdo.errorReason());
    }
  }
}`;

  const esp32FixedCode = `// =========================================================================
// ESP32-S3 #2: FIXED SOLAR PANEL (STATIC COMPARISON)
// =========================================================================
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_ INA226.h>

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASS"

#define API_KEY "${firebaseConfig.apiKey || 'YOUR_FIREBASE_API_KEY'}"
#define DATABASE_URL "${firebaseConfig.databaseURL || 'https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app/'}"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
Adafruit_ INA226  INA226_sta(0x41);

float totalEnergyWh = 0.0;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
   INA226_sta.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.test_mode = true;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (millis() - lastSend > 1000) {
    lastSend = millis();

    float voltage =  INA226_sta.getBusVoltage_V();
    float current =  INA226_sta.getCurrent_mA() / 1000.0;
    float power = voltage * current;
    totalEnergyWh += (power * (1.0 / 3600.0));

    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("dailyEnergy", totalEnergyWh / 1000.0);
    json.set("fixedAzimuth", 180.0);
    json.set("fixed_tilt_beta", 15.0);
    json.set("fixed_elevation_eps", 75.0);
    json.set("fixedElevation", 75.0);
    json.set("lastUpdate", (double)millis());

    if (Firebase.RTDB.updateNode(&fbdo, "/solar/static", &json)) {
      Serial.println("[ESP32-2] Sent static panel data!");
    }
  }
}`;

  const handleCopyCode = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-zinc-300 rounded-sm w-full max-w-3xl max-h-[92vh] flex flex-col shadow-sm text-zinc-900">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-white">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Cấu hình hệ thống
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Nguồn dữ liệu, tọa độ trạm đo, quản lý người dùng và mã nhúng ESP32
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 border border-zinc-300 rounded-sm cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-4 pt-1 gap-1 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'config'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Nguồn dữ liệu
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'location'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Tọa độ lắp đặt
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'users'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            <span>Quản lý người dùng</span>
            {usersList.some(u => u.status !== 'active') && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            )}
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('data_history')}
              className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'data_history'
                  ? 'border-blue-700 text-blue-700 bg-white'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
                }`}
            >
              <span>Tùy biến dữ liệu 30 ngày</span>
              {history30Days?.some(d => d.severe_invalid) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Có ngày lỗi dữ liệu"></span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('esp32_trk')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'esp32_trk'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Code ESP32 tấm xoay
          </button>
          <button
            onClick={() => setActiveTab('esp32_fix')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'esp32_fix'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Code ESP32 tấm cố định
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'json'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Dữ liệu thô (JSON)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 max-h-[72vh] text-sm">

          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-4">

              {/* Mode Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-2">
                  Chọn chế độ nguồn dữ liệu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

                  {/* FIREBASE CLOUD */}
                  <button
                    type="button"
                    onClick={() => setDataSource('firebase')}
                    className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${dataSource === 'firebase'
                        ? 'bg-blue-50/70 text-blue-950 border-blue-700 font-semibold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                      }`}
                  >
                    <div className="font-bold text-xs">Firebase Cloud</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Kết nối Realtime Database qua Internet (4G/WiFi).
                    </div>
                  </button>

                  {/* GIẢ LẬP DỮ LIỆU */}
                  <button
                    type="button"
                    onClick={() => setDataSource('mock')}
                    className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${dataSource === 'mock'
                        ? 'bg-blue-50/70 text-blue-950 border-blue-700 font-semibold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                      }`}
                  >
                    <div className="font-bold text-xs">Giả lập dữ liệu</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Mô phỏng thuật toán trên trình duyệt (source: 'mock').
                    </div>
                  </button>

                  {/* LOCAL WEBSOCKET */}
                  <button
                    type="button"
                    onClick={() => setDataSource('esp32_ws')}
                    className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${dataSource === 'esp32_ws'
                        ? 'bg-blue-50/70 text-blue-950 border-blue-700 font-semibold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                      }`}
                  >
                    <div className="font-bold text-xs">WebSocket ESP32</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Kết nối trực tiếp IP mạng LAN nội bộ phòng lab.
                    </div>
                  </button>
                </div>
              </div>

              {/* FIREBASE CONFIG PANEL */}
              {dataSource === 'firebase' && (
                <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                    <span className="font-bold text-xs text-zinc-800">
                      Thông số kết nối Firebase RTDB
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${firebaseConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                      }`}>
                      {firebaseConnected ? '● Đã kết nối' : '○ Chưa nhận dữ liệu'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Database URL (Bắt buộc):</label>
                    <input
                      type="text"
                      value={firebaseConfig.databaseURL || ''}
                      onChange={(e) => setFirebaseConfig({ ...firebaseConfig, databaseURL: e.target.value })}
                      placeholder="https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app"
                      className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Web API Key (Bắt buộc):</label>
                      <input
                        type="text"
                        value={firebaseConfig.apiKey || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Project ID (Tuỳ chọn):</label>
                      <input
                        type="text"
                        value={firebaseConfig.projectId || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                        placeholder="tracking-solar-datn"
                        className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Khóa thí nghiệm (30 ngày: 01/11 - 30/11) */}
                  <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block">
                          Khóa chế độ thí nghiệm (30 ngày đo: 01/11 – 30/11)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Khóa thay đổi thông số &amp; Jog thủ công để bảo đảm dữ liệu đo đối chứng tính hợp lệ.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !isExperimentLocked;
                          setIsExperimentLocked(nextVal);
                          localStorage.setItem('solar_experiment_locked', nextVal ? 'true' : 'false');
                        }}
                        className={`px-3 py-1 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                          isExperimentLocked 
                            ? 'bg-amber-700 text-white' 
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-300'
                        }`}
                      >
                        {isExperimentLocked ? 'Đang khóa' : 'Đang mở'}
                      </button>
                    </div>
                  </div>

                  {/* CẤU HÌNH PHẦN CỨNG: VÔ HIỆU HÓA NGỦ ĐÊM & TẦN SUẤT NHẢY RELAY ĐO VOC/ISC */}
                  <div className="p-3.5 rounded-sm bg-blue-50/40 border border-blue-200 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">
                          Cấu hình Vận hành Ngủ đêm &amp; Chu kỳ Relay đo Voc / Isc
                        </span>
                        <span className="text-[11px] text-zinc-600 block">
                          Đồng bộ trực tiếp xuống ESP32-S3 #1 (Tracker) và ESP32-S3 #2 (Node đo Voc/Isc)
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold border ${
                        latestTelemetry?.system?.sleepDisabled
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {latestTelemetry?.system?.sleepDisabled ? '● Đã tắt ngủ đêm (Giữ bước chiều)' : '● Ngủ tự động 18:00'}
                      </span>
                    </div>

                    {hwConfigFeedback && (
                      <div className="p-2 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                        <span>{hwConfigFeedback}</span>
                        <button
                          type="button"
                          onClick={() => setHwConfigFeedback(null)}
                          className="text-emerald-700 hover:text-emerald-950 px-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* 1. Nút bật/tắt vô hiệu hóa khả năng ngủ */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-900 block">
                            1. Vô hiệu hóa khả năng ngủ trên hệ thống
                          </span>
                          <span className="text-[11px] text-zinc-600 block leading-relaxed">
                            • Khi <b>BẬT</b>: Nếu đang trời tối, tấm pin lập tức quay về <b>giữ bước ở vị trí cuối cùng buổi chiều</b>; nếu đang trời sáng thì dù tới <b>18h vẫn không ngủ</b>.<br />
                            • Khi <b>TẮT</b>: Hệ thống tự động về vị trí ngủ đêm an toàn từ 18:00 đến 04:00 sáng.
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSetSleepDisabled && onSetSleepDisabled(true);
                              setHwConfigFeedback('Đã BẬT vô hiệu hóa ngủ đêm: Tấm pin sẽ giữ bước ở vị trí cuối buổi chiều và không ngủ lúc 18h!');
                            }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors cursor-pointer border ${
                              latestTelemetry?.system?.sleepDisabled
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'bg-white text-zinc-700 hover:bg-amber-50 border-zinc-300'
                            }`}
                          >
                            BẬT (Không ngủ)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSetSleepDisabled && onSetSleepDisabled(false);
                              setHwConfigFeedback('Đã TẮT vô hiệu hóa ngủ đêm: Hệ thống sẽ tự động ngủ đêm lúc 18:00 như bình thường.');
                            }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors cursor-pointer border ${
                              !latestTelemetry?.system?.sleepDisabled
                                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                                : 'bg-white text-zinc-700 hover:bg-blue-50 border-zinc-300'
                            }`}
                          >
                            TẮT (Ngủ 18h)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Điều chỉnh tần suất nhảy 1 chu kỳ Relay (Mặc định 10s) */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">
                            2. Tần suất nhảy 1 chu kỳ Relay đo Voc &amp; Isc (Mặc định: 10s)
                          </span>
                          <span className="text-[11px] text-zinc-600 block">
                            Relay chỉ nhảy khi <b>không trong giờ ngủ</b>. Trong giờ ngủ đêm, cả 4 Relay tự động khóa hoàn toàn (không nhảy).
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-sm bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                          Chu kỳ hiện tại: {latestTelemetry?.system?.relayIntervalSec || relaySecInput || 10} giây
                        </span>
                      </div>

                      {/* Các mức chọn nhanh */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500 mr-1">Chọn nhanh:</span>
                        {[5, 10, 15, 30, 60, 120].map((sec) => {
                          const isCurrent = Number(relaySecInput) === sec;
                          return (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                setRelaySecInput(sec);
                                onSetRelayInterval && onSetRelayInterval(sec);
                                setHwConfigFeedback(`Đã cập nhật tần suất nhảy 1 chu kỳ Relay = ${sec} giây!`);
                              }}
                              className={`px-2.5 py-1 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-blue-700 text-white border-blue-800'
                                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                              }`}
                            >
                              {sec}s{sec === 10 ? ' (Mặc định)' : ''}
                            </button>
                          );
                        })}
                      </div>

                      {/* Ô nhập tùy chỉnh + Nút Lưu */}
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-xs font-semibold text-zinc-700 shrink-0">
                          Tùy chỉnh (3 – 3600 giây):
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="3600"
                          step="1"
                          value={relaySecInput}
                          onChange={(e) => setRelaySecInput(e.target.value)}
                          className="w-24 bg-white border border-zinc-300 rounded-sm px-2.5 py-1 text-xs font-bold text-zinc-900 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const validSec = Math.max(3, Math.min(3600, Math.round(Number(relaySecInput) || 10)));
                            setRelaySecInput(validSec);
                            onSetRelayInterval && onSetRelayInterval(validSec);
                            setHwConfigFeedback(`Đã lưu và áp dụng chu kỳ nhảy Relay = ${validSec} giây xuống hệ thống!`);
                          }}
                          className="px-3 py-1 rounded-sm text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                        >
                          Lưu &amp; Áp dụng chu kỳ
                        </button>
                      </div>
                    </div>

                    {/* 3. Đèn 12V (Relay Kênh 5 - Relay E): Cấu hình chu kỳ Bật/Tắt & Vô hiệu hóa tự động & Bật/Tắt bằng tay */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-3">
                      {/* Tiêu đề & Trạng thái hiện tại */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">
                            3. Điều khiển & Cài đặt Chu kỳ Đèn 12V (Relay Kênh 5 / Kênh E - GPIO 42)
                          </span>
                          <span className="text-[11px] text-zinc-600 block">
                            {latestTelemetry?.system?.lampAutoDisabled
                              ? 'Đang BẬT vô hiệu hóa tự động: Đèn tắt khi kích hoạt; cho phép Bật/Tắt đèn 12V bằng tay bên dưới.'
                              : `Đang ở chế độ Tự động: Luân phiên BẬT ${latestTelemetry?.system?.lampOnMin || 15} phút rồi TẮT ${latestTelemetry?.system?.lampOffMin || 15} phút lặp lại liên tục khi hệ thống ngủ.`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-sm border text-xs font-bold ${
                              latestTelemetry?.system?.lamp12vOn
                                ? 'bg-amber-100 border-amber-300 text-amber-900'
                                : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                            }`}
                          >
                            Đèn 12V: {latestTelemetry?.system?.lamp12vOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                          </span>
                          {!latestTelemetry?.system?.lampAutoDisabled && latestTelemetry?.system?.lampRemainSec > 0 && (
                            <span className="px-2 py-0.5 rounded-sm bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-semibold">
                              (còn {Math.floor(Number(latestTelemetry.system.lampRemainSec) / 60)}p {Number(latestTelemetry.system.lampRemainSec) % 60}s)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Khối Cài đặt Chu kỳ BẬT / TẮT luân phiên tự do */}
                      <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-800">
                            ⚙ Cài đặt chu kỳ BẬT / TẮT luân phiên tự động:
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Hiện hành: BẬT <strong className="text-amber-700">{latestTelemetry?.system?.lampOnMin || 15}p</strong> ➔ TẮT <strong className="text-zinc-700">{latestTelemetry?.system?.lampOffMin || 15}p</strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-700 font-medium">Thời gian BẬT:</label>
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={lampOnMinInput}
                              onChange={(e) => setLampOnMinInput(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                              className="w-16 px-2 py-1 text-xs text-center font-bold border border-zinc-300 rounded-sm bg-white focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-xs text-zinc-500">phút</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-700 font-medium">Thời gian TẮT:</label>
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={lampOffMinInput}
                              onChange={(e) => setLampOffMinInput(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                              className="w-16 px-2 py-1 text-xs text-center font-bold border border-zinc-300 rounded-sm bg-white focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-zinc-500">phút</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const onVal = Math.max(1, Math.min(360, Number(lampOnMinInput) || 15));
                              const offVal = Math.max(1, Math.min(360, Number(lampOffMinInput) || 15));
                              onSetLampCustomCycle && onSetLampCustomCycle(onVal, offVal);
                              onSetLampAutoDisabled && onSetLampAutoDisabled(false);
                              setHwConfigFeedback(`✓ Đã kích hoạt chế độ Tự động và áp dụng chu kỳ Đèn: BẬT ${onVal} phút / TẮT ${offVal} phút luân phiên!`);
                            }}
                            className="px-3.5 py-1 rounded-sm text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border border-amber-700 shadow-xs cursor-pointer transition-colors shrink-0"
                          >
                            ✓ Áp dụng chu kỳ Đèn (OK)
                          </button>
                        </div>
                      </div>

                      {/* Nút Bật / Tắt Vô hiệu hóa bật tắt đèn tự động */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs font-semibold text-zinc-800">
                          Chế độ Vô hiệu hóa bật/tắt đèn tự động:
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSetLampAutoDisabled && onSetLampAutoDisabled(true);
                              setHwConfigFeedback('Đã BẬT vô hiệu hóa đèn tự động: Đèn 12V đã chuyển về TẮT và mở khóa nút Bật/Tắt bằng tay!');
                            }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-bold border transition-colors cursor-pointer ${
                              latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'bg-white text-zinc-700 hover:bg-amber-50 border-zinc-300'
                            }`}
                          >
                            BẬT Vô hiệu hóa (Chỉnh tay)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSetLampAutoDisabled && onSetLampAutoDisabled(false);
                              setHwConfigFeedback(`Đã TẮT vô hiệu hóa tự động: Đèn 12V bắt đầu chu kỳ BẬT ${latestTelemetry?.system?.lampOnMin || 15}p / TẮT ${latestTelemetry?.system?.lampOffMin || 15}p!`);
                            }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-bold border transition-colors cursor-pointer ${
                              !latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                                : 'bg-white text-zinc-700 hover:bg-blue-50 border-zinc-300'
                            }`}
                          >
                            TẮT Vô hiệu hóa (Tự động luân phiên)
                          </button>
                        </div>
                      </div>

                      {/* Nút Bật / Tắt Đèn 12V bằng tay (chỉ khả dụng khi đã BẬT Vô hiệu hóa tự động) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
                        <div>
                          <span className="text-xs font-semibold text-zinc-800 block">
                            Bật / Tắt Đèn 12V bằng tay:
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {latestTelemetry?.system?.lampAutoDisabled
                              ? 'Đang mở khóa điều khiển tay — Nhấn để Bật hoặc Tắt đèn 12V ngay lập tức.'
                              : 'Cần nhấn [BẬT Vô hiệu hóa (Chỉnh tay)] ở trên để bật/tắt đèn bằng tay.'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={!latestTelemetry?.system?.lampAutoDisabled}
                            onClick={() => {
                              onSetLampManualState && onSetLampManualState(true);
                              setHwConfigFeedback('Đã gửi lệnh BẬT ĐÈN 12V (Relay Kênh 5) bằng tay!');
                            }}
                            className={`px-3.5 py-1.5 rounded-sm text-xs font-bold border transition-colors ${
                              !latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                                : latestTelemetry?.system?.lamp12vOn
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs cursor-pointer'
                                  : 'bg-white text-zinc-800 hover:bg-emerald-50 border-zinc-300 cursor-pointer'
                            }`}
                          >
                            BẬT ĐÈN 12V
                          </button>
                          <button
                            type="button"
                            disabled={!latestTelemetry?.system?.lampAutoDisabled}
                            onClick={() => {
                              onSetLampManualState && onSetLampManualState(false);
                              setHwConfigFeedback('Đã gửi lệnh TẮT ĐÈN 12V (Relay Kênh 5) bằng tay!');
                            }}
                            className={`px-3.5 py-1.5 rounded-sm text-xs font-bold border transition-colors ${
                              !latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                                : !latestTelemetry?.system?.lamp12vOn
                                  ? 'bg-zinc-800 text-white border-zinc-900 shadow-xs cursor-pointer'
                                  : 'bg-white text-zinc-800 hover:bg-zinc-100 border-zinc-300 cursor-pointer'
                            }`}
                          >
                            TẮT ĐÈN 12V
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Firebase */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={onSendTestPacket}
                      className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 cursor-pointer"
                    >
                      Gửi 1 gói mẫu thử nghiệm (vào /solar_mock)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isExperimentLocked) {
                          alert('Khóa thí nghiệm đang BẬT! Không thể xóa dữ liệu trong giai đoạn đo 30 ngày đối chứng (01/11 - 30/11).');
                          return;
                        }
                        onClearFirebase && onClearFirebase();
                      }}
                      className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 cursor-pointer"
                    >
                      Dọn dữ liệu Firebase (Hướng dẫn script an toàn)
                    </button>
                  </div>
                </div>
              )}

              {/* LOCAL WEBSOCKET CONFIG PANEL */}
              {dataSource === 'esp32_ws' && (
                <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Địa chỉ WebSocket ESP32-S3 (ws://)
                    </label>
                    <input
                      type="text"
                      value={wsUrl}
                      onChange={(e) => setWsUrl(e.target.value)}
                      placeholder="ws://192.168.4.1/ws"
                      className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Địa chỉ REST API Fallback (http://)
                    </label>
                    <input
                      type="text"
                      value={restUrl}
                      onChange={(e) => setRestUrl(e.target.value)}
                      placeholder="http://192.168.4.1/api/telemetry"
                      className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Refresh Rate */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Tần số làm mới giao diện
                  </label>
                  <span className="text-xs text-zinc-900 font-bold">{refreshRate} ms</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(Number(e.target.value))}
                  className="w-full cursor-pointer h-1.5 bg-zinc-300 rounded-sm accent-blue-700"
                />
              </div>

            </div>
          )}

          {/* TAB 2: TỌA ĐỘ LẮP ĐẶT HỆ THỐNG */}
          {activeTab === 'location' && (
            <div className="animate-in fade-in duration-200">
              <InstallationLocationTab
                currentLocation={currentLocation}
                onSelectLocation={onSelectLocation}
                onConfirmLocation={onConfirmLocation}
                weatherData={weatherData}
                latestTelemetry={latestTelemetry}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* TAB 3: QUẢN LÝ NGƯỜI DÙNG */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Action Feedback Toast */}
              {userActionFeedback && (
                <div className={`p-2.5 rounded-sm border flex items-center justify-between gap-2 text-xs font-semibold ${userActionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : userActionFeedback.type === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : userActionFeedback.type === 'danger'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-300'
                  }`}>
                  <span>{userActionFeedback.message}</span>
                  <button
                    onClick={() => setUserActionFeedback(null)}
                    className="text-zinc-500 hover:text-zinc-800 px-1.5 py-0.5 rounded text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Top Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                  <span className="text-xs text-zinc-500 block">Tổng số người dùng</span>
                  <span className="text-base font-bold text-zinc-900 mt-0.5 block">{usersList.length} tài khoản</span>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                  <span className="text-xs text-zinc-500 block">Đang trực tuyến</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span className="text-base font-bold text-emerald-800">
                      {usersList.filter(u => u.isOnline || (currentUser?.username === u.username)).length} đang online
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                  <span className="text-xs text-zinc-500 block">Tài khoản bị khóa</span>
                  <span className={`text-base font-bold mt-0.5 block ${usersList.some(u => u.status !== 'active') ? 'text-red-700' : 'text-zinc-600'}`}>
                    {usersList.filter(u => u.status !== 'active').length} bị khóa
                  </span>
                </div>
              </div>

              {/* Search & Refresh Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên tài khoản, họ tên, vai trò..."
                    className="w-full px-3 py-1.5 rounded-sm bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRefreshUsers}
                  className="px-3 py-1.5 rounded-sm bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-800 border border-zinc-300 cursor-pointer shrink-0"
                >
                  Đồng bộ trạng thái
                </button>
              </div>

              {/* Users List Cards */}
              <div className="space-y-2">
                {usersList
                  .filter(u => {
                    const q = userSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      u.displayName.toLowerCase().includes(q) ||
                      u.username.toLowerCase().includes(q) ||
                      u.roleName.toLowerCase().includes(q)
                    );
                  })
                  .map(user => {
                    const isCurrentUser = currentUser?.username === user.username;
                    const isOnline = user.isOnline || isCurrentUser;
                    const isLocked1H = user.status === 'locked_1h';
                    const isLockedPerm = user.status === 'locked_permanent';
                    const isLocked = isLocked1H || isLockedPerm;

                    const remainingMins = user.lockedUntil && Date.now() < user.lockedUntil
                      ? Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000))
                      : null;

                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-sm border ${isLockedPerm
                            ? 'bg-red-50/50 border-red-300'
                            : isLocked1H
                              ? 'bg-amber-50/50 border-amber-300'
                              : 'bg-zinc-50 border-zinc-200'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 text-xs sm:text-sm">
                                {user.displayName}
                              </span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-zinc-200 text-zinc-700">
                                  Phiên hiện tại
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                              <span>@{user.username}</span>
                              <span className="mx-1.5">•</span>
                              <span>{user.roleName}</span>
                            </div>
                          </div>

                          <div className="text-xs text-zinc-600">
                            {user.status === 'active' && <span className="text-emerald-700 font-semibold">● Hoạt động bình thường</span>}
                            {isLocked1H && <span className="text-amber-700 font-semibold">Tạm khóa 1 giờ (còn ~{remainingMins} phút)</span>}
                            {isLockedPerm && <span className="text-red-700 font-semibold">Đã khóa vĩnh viễn</span>}
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-zinc-500">IP: {user.ipAddress}</span>
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <span className="text-zinc-400 italic">Tài khoản quản trị viên</span>
                            ) : (
                              <>
                                {user.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleLock1H(user)}
                                    className="px-2.5 py-1 rounded-sm bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-semibold cursor-pointer"
                                  >
                                    Khóa 1 giờ
                                  </button>
                                )}
                                {!isLockedPerm && (
                                  <button
                                    type="button"
                                    onClick={() => handleLockPerm(user)}
                                    className="px-2.5 py-1 rounded-sm bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 text-xs font-semibold cursor-pointer"
                                  >
                                    Khóa vĩnh viễn
                                  </button>
                                )}
                                {isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(user)}
                                    className="px-2.5 py-1 rounded-sm bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold cursor-pointer"
                                  >
                                    Khôi phục
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

          {/* TAB 4: ESP32-1 TRACKER CODE */}
          {activeTab === 'esp32_trk' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700">
                  Mã nguồn C++ cho ESP32-S3 tấm xoay:
                </span>
                <button
                  onClick={() => handleCopyCode(esp32TrackerCode, 'trk')}
                  className="px-3 py-1 rounded-sm bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-800 border border-zinc-300 cursor-pointer"
                >
                  {copiedTab === 'trk' ? 'Đã sao chép!' : 'Sao chép mã'}
                </button>
              </div>
              <pre className="p-3 rounded-sm bg-zinc-100 border border-zinc-300 text-xs font-mono text-zinc-800 overflow-x-auto max-h-[360px] leading-relaxed">
                {esp32TrackerCode}
              </pre>
            </div>
          )}

          {/* TAB 5: ESP32-2 FIXED PANEL CODE */}
          {activeTab === 'esp32_fix' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700">
                  Mã nguồn C++ cho ESP32-S3 tấm cố định:
                </span>
                <button
                  onClick={() => handleCopyCode(esp32FixedCode, 'fix')}
                  className="px-3 py-1 rounded-sm bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-800 border border-zinc-300 cursor-pointer"
                >
                  {copiedTab === 'fix' ? 'Đã sao chép!' : 'Sao chép mã'}
                </button>
              </div>
              <pre className="p-3 rounded-sm bg-zinc-100 border border-zinc-300 text-xs font-mono text-zinc-800 overflow-x-auto max-h-[360px] leading-relaxed">
                {esp32FixedCode}
              </pre>
            </div>
          )}

          {/* TAB MỚI: TÙY BIẾN DỮ LIỆU 30 NGÀY (CHỈ DÀNH CHO QUẢN TRỊ VIÊN ADMIN) */}
          {activeTab === 'data_history' && (
            currentUser?.role === 'admin' ? (
              <HistoryDataManagementTab
                history30Days={history30Days}
                onUpdateDayData={onUpdateDayData}
                onDeleteDayData={onDeleteDayData}
                onAddDayData={onAddDayData}
                onResetHistoryData={onResetHistoryData}
                onLoadRealisticDataset={onLoadRealisticDataset}
                initialTargetDate={targetEditDate}
              />
            ) : (
              <div className="p-8 text-center space-y-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Yêu cầu quyền Quản trị viên</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Tính năng tùy biến sâu dữ liệu chu kỳ 30 ngày chỉ dành riêng cho tài khoản Quản trị viên (Admin). Tài khoản khách chỉ có quyền giám sát số liệu trực tiếp.
                </p>
              </div>
            )
          )}

          {/* TAB 6: RAW JSON LIVE */}
          {activeTab === 'json' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-600">
                <span className="font-semibold">Dữ liệu thô JSON từ Firebase / ESP32:</span>
                <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="p-3 rounded-sm bg-zinc-100 border border-zinc-300 text-xs font-mono text-zinc-800 overflow-x-auto max-h-[360px] leading-relaxed">
                {JSON.stringify(latestTelemetry || {}, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Nguồn kết nối: {dataSource === 'firebase' ? 'Firebase RTDB' : dataSource === 'mock' ? 'Giả lập' : 'WebSocket LAN'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
          >
            Lưu cấu hình & đóng
          </button>
        </div>

      </div>
    </div>
  );
}


