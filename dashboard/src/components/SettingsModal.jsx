import React, { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
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
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'json' | 'esp32_trk' | 'esp32_fix'
  const [copiedTab, setCopiedTab] = useState(null);

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

          {/* TAB 2: ESP32-1 TRACKER CODE */}
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

