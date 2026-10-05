import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Clock, 
  Lock, 
  RotateCcw, 
  AlertTriangle, 
  Search, 
  Activity, 
  CheckCircle2, 
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { getStoredUsers, lockUser1Hour, lockUserPermanent, restoreUser } from '../services/userService';

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
  onSendTestPacket
}) {
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'users' | 'esp32_trk' | 'esp32_fix' | 'json'
  const [copiedTab, setCopiedTab] = useState(null);

  // User Management State
  const [usersList, setUsersList] = useState(() => getStoredUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userActionFeedback, setUserActionFeedback] = useState(null);

  // Sync users whenever the modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setUsersList(getStoredUsers());
    }
  }, [isOpen, activeTab]);

  const handleRefreshUsers = () => {
    setUsersList(getStoredUsers());
    setUserActionFeedback({
      type: 'info',
      message: 'Đã đồng bộ danh sách trạng thái người dùng mới nhất!'
    });
    setTimeout(() => setUserActionFeedback(null), 3000);
  };

  const handleLock1H = (user) => {
    const updated = lockUser1Hour(user.id);
    setUsersList(updated);
    setUserActionFeedback({
      type: 'warning',
      message: `Đã khóa tạm thời 1 giờ tài khoản "${user.displayName}" (@${user.username}).`
    });
    setTimeout(() => setUserActionFeedback(null), 4000);
  };

  const handleLockPerm = (user) => {
    if (window.confirm(`Xác nhận khóa VĨNH VIỄN tài khoản "${user.displayName}" (@${user.username})?`)) {
      const updated = lockUserPermanent(user.id);
      setUsersList(updated);
      setUserActionFeedback({
        type: 'danger',
        message: `Đã khóa vĩnh viễn tài khoản "${user.displayName}" (@${user.username}).`
      });
      setTimeout(() => setUserActionFeedback(null), 4000);
    }
  };

  const handleRestore = (user) => {
    const updated = restoreUser(user.id);
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
// 2. Adafruit INA219
// 3. ArduinoJson
// =========================================================================
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_INA219.h>
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
Adafruit_INA219 ina219_trk(0x40);

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
  ina219_trk.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());

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

    float voltage = ina219_trk.getBusVoltage_V();
    float current = ina219_trk.getCurrent_mA() / 1000.0;
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
#include <Adafruit_INA219.h>

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASS"

#define API_KEY "${firebaseConfig.apiKey || 'YOUR_FIREBASE_API_KEY'}"
#define DATABASE_URL "${firebaseConfig.databaseURL || 'https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app/'}"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
Adafruit_INA219 ina219_sta(0x41);

float totalEnergyWh = 0.0;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  ina219_sta.begin();

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

    float voltage = ina219_sta.getBusVoltage_V();
    float current = ina219_sta.getCurrent_mA() / 1000.0;
    float power = voltage * current;
    totalEnergyWh += (power * (1.0 / 3600.0));

    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("dailyEnergy", totalEnergyWh / 1000.0);
    json.set("fixedAzimuth", 180.0);
    json.set("fixedElevation", 15.0);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xl modal-sheet-container">
      <div className="panel-card w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col modal-sheet-card border-white/20">
        
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 sm:px-6 border-b border-white/10 bg-white/10 backdrop-blur-md">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
              CẤU HÌNH NGUỒN DỮ LIỆU
            </h2>
            <span className="text-xs text-zinc-300 font-medium">Kết nối Firebase Realtime Database & Vi điều khiển ESP32</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-white/5 px-4 sm:px-6 pt-2 gap-2 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer font-semibold whitespace-nowrap text-sm ${
              activeTab === 'config'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Nguồn dữ liệu
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer font-semibold whitespace-nowrap text-sm flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Quản lý người dùng</span>
            {usersList.some(u => u.status !== 'active') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('esp32_trk')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer font-semibold whitespace-nowrap text-sm ${
              activeTab === 'esp32_trk'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Code ESP32 Tấm xoay
          </button>
          <button
            onClick={() => setActiveTab('esp32_fix')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer font-semibold whitespace-nowrap text-sm ${
              activeTab === 'esp32_fix'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Code ESP32 Tấm cố định
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer font-semibold whitespace-nowrap text-sm ${
              activeTab === 'json'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dữ liệu thô (JSON)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 max-h-[72vh] text-sm">
          
          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              
              {/* Mode Selector */}
              <div>
                <label className="text-xs uppercase text-zinc-300 font-bold tracking-wider block mb-2.5">
                  CHỌN CHẾ ĐỘ NGUỒN DỮ LIỆU
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* FIREBASE CLOUD */}
                  <button
                    type="button"
                    onClick={() => setDataSource('firebase')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dataSource === 'firebase'
                        ? 'bg-zinc-800/90 text-white border-white shadow-md'
                        : 'bg-[#12151f] text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-sm text-white tracking-wide">
                      FIREBASE CLOUD
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Kết nối Realtime Database qua mạng Internet (4G/WiFi).
                    </div>
                  </button>

                  {/* GIẢ LẬP DỮ LIỆU */}
                  <button
                    type="button"
                    onClick={() => setDataSource('mock')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dataSource === 'mock'
                        ? 'bg-zinc-800/90 text-white border-white shadow-md'
                        : 'bg-[#12151f] text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-sm text-white tracking-wide">
                      GIẢ LẬP DỮ LIỆU
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Tạo dữ liệu mô phỏng thuật toán Fuzzy-PID & PSO.
                    </div>
                  </button>

                  {/* LOCAL WEBSOCKET */}
                  <button
                    type="button"
                    onClick={() => setDataSource('esp32_ws')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dataSource === 'esp32_ws'
                        ? 'bg-zinc-800/90 text-white border-white shadow-md'
                        : 'bg-[#12151f] text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-sm text-white tracking-wide">
                      WEBSOCKET ESP32
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Kết nối trực tiếp IP mạng LAN nội bộ tại phòng lab.
                    </div>
                  </button>
                </div>
              </div>

              {/* FIREBASE CONFIG PANEL */}
              {dataSource === 'firebase' && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="font-bold text-sm text-zinc-100 uppercase tracking-wide">
                      Thông số kết nối Firebase RTDB
                    </span>
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      firebaseConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {firebaseConnected ? '● Đã kết nối' : '○ Chưa nhận dữ liệu'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Database URL (Bắt buộc):</label>
                    <input
                      type="text"
                      value={firebaseConfig.databaseURL || ''}
                      onChange={(e) => setFirebaseConfig({ ...firebaseConfig, databaseURL: e.target.value })}
                      placeholder="https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app"
                      className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-400 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Web API Key (Bắt buộc):</label>
                      <input
                        type="text"
                        value={firebaseConfig.apiKey || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Project ID (Tuỳ chọn):</label>
                      <input
                        type="text"
                        value={firebaseConfig.projectId || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                        placeholder="tracking-solar-datn"
                        className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Actions for Firebase */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={onSendTestPacket}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 transition-all cursor-pointer active:scale-95"
                    >
                      Gửi 1 gói mẫu thử nghiệm
                    </button>
                    <button
                      type="button"
                      onClick={onClearFirebase}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800/80 transition-all cursor-pointer active:scale-95"
                    >
                      Xóa sạch dữ liệu trên Firebase (Reset)
                    </button>
                  </div>
                </div>
              )}

              {/* LOCAL WEBSOCKET CONFIG PANEL */}
              {dataSource === 'esp32_ws' && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1.5">
                      Địa Chỉ WebSocket ESP32-S3 (ws://)
                    </label>
                    <input
                      type="text"
                      value={wsUrl}
                      onChange={(e) => setWsUrl(e.target.value)}
                      placeholder="ws://192.168.4.1/ws"
                      className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-zinc-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1.5">
                      Địa Chỉ REST API Fallback (http://)
                    </label>
                    <input
                      type="text"
                      value={restUrl}
                      onChange={(e) => setRestUrl(e.target.value)}
                      placeholder="http://192.168.4.1/api/telemetry"
                      className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-zinc-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Refresh Rate */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase text-zinc-300 font-bold tracking-wider">
                    Tần số làm mới giao diện
                  </label>
                  <span className="text-sm text-white font-mono font-bold">{refreshRate} ms</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer h-2 bg-zinc-700 rounded-lg"
                />
              </div>

            </div>
          )}

          {/* TAB: QUẢN LÝ NGƯỜI DÙNG */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Action Feedback Toast */}
              {userActionFeedback && (
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in duration-150 ${
                  userActionFeedback.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                    : userActionFeedback.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                    : userActionFeedback.type === 'danger'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                    : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                }`}>
                  <div className="flex items-center gap-2">
                    {userActionFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
                    {userActionFeedback.type === 'warning' && <Clock className="w-4 h-4 text-amber-300 shrink-0" />}
                    {userActionFeedback.type === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />}
                    {userActionFeedback.type === 'info' && <Activity className="w-4 h-4 text-sky-300 shrink-0" />}
                    <span>{userActionFeedback.message}</span>
                  </div>
                  <button 
                    onClick={() => setUserActionFeedback(null)} 
                    className="text-white/60 hover:text-white px-1.5 py-0.5 rounded text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Top Stats Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stat 1: Total accounts */}
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-medium block">Tổng người dùng</span>
                    <span className="text-lg font-bold text-white mt-0.5 block">{usersList.length} tài khoản</span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 border border-zinc-700">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                {/* Stat 2: Online */}
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-medium block">Đang trực tuyến</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-lg font-bold text-emerald-400">
                        {usersList.filter(u => u.isOnline || (currentUser?.username === u.username)).length} đang online
                      </span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/60 flex items-center justify-center text-emerald-400 border border-emerald-800">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                {/* Stat 3: Locked */}
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-medium block">Tài khoản bị khóa</span>
                    <span className={`text-lg font-bold mt-0.5 block ${
                      usersList.some(u => u.status !== 'active') ? 'text-rose-400' : 'text-zinc-400'
                    }`}>
                      {usersList.filter(u => u.status !== 'active').length} bị khóa
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-rose-950/60 flex items-center justify-center text-rose-400 border border-rose-800">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Search & Refresh Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên tài khoản, họ tên, vai trò..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRefreshUsers}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Đồng bộ trạng thái</span>
                </button>
              </div>

              {/* Users List Cards */}
              <div className="space-y-3">
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

                    // Remaining time for 1h lock
                    const remainingMins = user.lockedUntil && Date.now() < user.lockedUntil 
                      ? Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000))
                      : null;

                    return (
                      <div 
                        key={user.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          isLockedPerm
                            ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-700'
                            : isLocked1H
                            ? 'bg-amber-950/20 border-amber-800/60 hover:border-amber-700'
                            : 'bg-[#131722] border-zinc-700/80 hover:border-zinc-500'
                        }`}
                      >
                        {/* Header: User Info & Online Tag */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            {/* Role Avatar */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shrink-0 ${
                              user.role === 'admin'
                                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                                : user.role === 'operator'
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                : 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                            }`}>
                              {user.username.slice(0, 2).toUpperCase()}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-sm">
                                  {user.displayName}
                                </span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
                                    Phiên hiện tại
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                <span className="font-mono text-zinc-300">@{user.username}</span>
                                <span>•</span>
                                <span className="text-zinc-400">{user.roleName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Online Presence Badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Đang online</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                                <span>Offline ({user.lastActive})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Details & Device / Location */}
                        <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-zinc-400 font-medium">Trạng thái:</span>
                            {user.status === 'active' && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700 inline-flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Hoạt động bình thường</span>
                              </span>
                            )}
                            {isLocked1H && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700 inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Tạm khóa 1 giờ (còn ~{remainingMins} phút)</span>
                              </span>
                            )}
                            {isLockedPerm && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700 inline-flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-rose-400" />
                                <span>Đã khóa vĩnh viễn</span>
                              </span>
                            )}
                          </div>

                          <div className="text-zinc-400 text-xs">
                            <span className="text-zinc-500">Vị trí kết nối: </span>
                            <span className="text-zinc-300 font-mono">{user.ipAddress}</span>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-end gap-2">
                          {user.role === 'admin' ? (
                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-amber-300/90 flex items-center gap-1.5 font-medium">
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                              <span>Tài khoản Quản trị viên (Không thể khóa)</span>
                            </div>
                          ) : (
                            <>
                              {/* Action 1: Khóa 1 giờ */}
                              {user.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleLock1H(user)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                  title="Khóa tạm thời tài khoản trong 1 giờ"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Khóa 1 giờ</span>
                                </button>
                              )}

                              {/* Action 2: Khóa vĩnh viễn */}
                              {!isLockedPerm && (
                                <button
                                  type="button"
                                  onClick={() => handleLockPerm(user)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                  title="Khóa vĩnh viễn tài khoản người dùng"
                                >
                                  <Lock className="w-3.5 h-3.5 text-rose-300" />
                                  <span>Khóa vĩnh viễn</span>
                                </button>
                              )}

                              {/* Action 3: Khôi phục tài khoản */}
                              {isLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(user)}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
                                  title="Khôi phục trạng thái hoạt động bình thường"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                                  <span>Khôi phục tài khoản</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

          {/* TAB 3: ESP32-1 TRACKER CODE */}
          {activeTab === 'esp32_trk' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-300">
                  Mã Arduino C++ cho <b>ESP32-S3 Tấm Xoay</b> (2 trục + INA219 + LDR + Firebase):
                </span>
                <button
                  onClick={() => handleCopyCode(esp32TrackerCode, 'trk')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-600 cursor-pointer transition-all active:scale-95"
                >
                  {copiedTab === 'trk' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-300" />}
                  <span>{copiedTab === 'trk' ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#080a0f] border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {esp32TrackerCode}
              </pre>
            </div>
          )}

          {/* TAB 3: ESP32-2 FIXED PANEL CODE */}
          {activeTab === 'esp32_fix' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-300">
                  Mã Arduino C++ cho <b>ESP32-S3 Tấm Cố Định</b> (INA219 + Firebase):
                </span>
                <button
                  onClick={() => handleCopyCode(esp32FixedCode, 'fix')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-600 cursor-pointer transition-all active:scale-95"
                >
                  {copiedTab === 'fix' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-300" />}
                  <span>{copiedTab === 'fix' ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#080a0f] border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {esp32FixedCode}
              </pre>
            </div>
          )}

          {/* TAB 4: RAW JSON LIVE */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-zinc-400">
                <span>Dữ liệu Telemetry JSON trực tiếp:</span>
                <span className="font-mono text-zinc-400">{new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="p-4 rounded-xl bg-[#080a0f] border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto max-h-[380px] leading-relaxed">
                {JSON.stringify(latestTelemetry || {}, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-[#121620] border-t border-zinc-800 flex items-center justify-between safe-area-bottom">
          <span className="text-xs font-medium text-zinc-400">
            {dataSource === 'firebase' ? 'Firebase Realtime Database' : dataSource === 'mock' ? 'Mô phỏng dữ liệu' : 'ESP32 WebSocket'}
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Lưu Cấu Hình & Đóng
          </button>
        </div>

      </div>
    </div>
  );
}

