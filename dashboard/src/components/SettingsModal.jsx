import React, { useState } from 'react';
import { X, Settings, Check, Copy, Flame, Wifi, Code2, Database } from 'lucide-react';

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
  firebaseConnected
}) {
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'json' | 'esp32_trk' | 'esp32_fix'
  const [copiedTab, setCopiedTab] = useState(null);

  if (!isOpen) return null;

  const esp32TrackerCode = `// =========================================================================
// ESP32-S3 #1: SMART DUAL-AXIS SOLAR TRACKER (FUZZY-PID & PSO)
// Thư viện cần cài trong Arduino IDE:
// 1. Firebase ESP Client by Mobizt
// 2. Adafruit INA219
// 3. ArduinoJson
// =========================================================================
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_INA219.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// 1. THÔNG TIN WIFI NHÀ
#define WIFI_SSID "YOUR_HOME_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_HOME_WIFI_PASS"

// 2. THÔNG TIN FIREBASE (Lấy từ Firebase Console)
#define API_KEY "${firebaseConfig.apiKey || 'YOUR_FIREBASE_API_KEY'}"
#define DATABASE_URL "${firebaseConfig.databaseURL || 'https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app/'}"

FirebaseData fbdo;
FirebaseData fbdoStream;
FirebaseAuth auth;
FirebaseConfig config;
Adafruit_INA219 ina219_trk(0x40);

// Cảm biến quang trở LDR (ADC Pins)
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
    Serial.println("[Firebase Stream] Lệnh điều khiển từ Web: " + data.stringData());
    // Xử lý lệnh điều khiển: AUTO / MANUAL / PARK / JOG...
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("[Firebase Stream] Stream timeout, đang thử lại...");
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
  config.signer.test_mode = true; // Dùng chế độ test mode

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Lắng nghe lệnh điều khiển từ xa từ Web Dashboard
  Firebase.RTDB.beginStream(&fbdoStream, "/solar/control");
  Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);
}

void loop() {
  // Chu kỳ gửi dữ liệu Telemetry lên Firebase mỗi 1 giây
  if (millis() - lastSend > 1000) {
    lastSend = millis();

    float voltage = ina219_trk.getBusVoltage_V();
    float current = ina219_trk.getCurrent_mA() / 1000.0;
    float power = voltage * current;
    totalEnergyWh += (power * (1.0 / 3600.0)); // Tích luỹ năng lượng Wh

    int ldrT = analogRead(LDR_TOP);
    int ldrB = analogRead(LDR_BOTTOM);
    int ldrL = analogRead(LDR_LEFT);
    int ldrR = analogRead(LDR_RIGHT);

    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("dailyEnergy", totalEnergyWh / 1000.0); // Đổi sang kWh
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
      Serial.println("[ESP32-1] Đã gửi Telemetry tấm xoay lên Firebase!");
    } else {
      Serial.println("[ESP32-1] Lỗi gửi: " + fbdo.errorReason());
    }
  }
}`;

  const esp32FixedCode = `// =========================================================================
// ESP32-S3 #2: TẤM PIN CỐ ĐỊNH (FIXED SOLAR PANEL COMPARISON)
// =========================================================================
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_INA219.h>

#define WIFI_SSID "YOUR_HOME_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_HOME_WIFI_PASS"

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
    json.set("fixedAzimuth", 180.0); // Góc lắp cố định
    json.set("fixedElevation", 15.0);
    json.set("lastUpdate", (double)millis());

    if (Firebase.RTDB.updateNode(&fbdo, "/solar/static", &json)) {
      Serial.println("[ESP32-2] Đã gửi dữ liệu tấm cố định lên Firebase!");
    }
  }
}`;

  const handleCopyCode = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="panel-card w-full max-w-3xl overflow-hidden shadow-2xl border-white/20 flex flex-col max-h-[92vh] bg-[#0c0d12]/95 backdrop-blur-2xl rounded-2xl">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between py-4 px-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-zinc-200" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Cấu Hình Nguồn Dữ Liệu & Tích Hợp Firebase (2x ESP32-S3)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-black/30 px-6 pt-2 gap-2 text-xs sm:text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚙️ Nguồn Dữ Liệu
          </button>
          <button
            onClick={() => setActiveTab('esp32_trk')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap ${
              activeTab === 'esp32_trk'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📟 Code ESP32-1 (Tấm Xoay)
          </button>
          <button
            onClick={() => setActiveTab('esp32_fix')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap ${
              activeTab === 'esp32_fix'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📟 Code ESP32-2 (Tấm Cố Định)
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔍 Raw JSON Live
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-4 text-xs font-mono">
              
              {/* Mode Selector */}
              <div>
                <label className="text-zinc-300 font-bold block mb-2 uppercase text-[11px]">
                  CHỌN CHẾ ĐỘ HOẠT ĐỘNG
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setDataSource('firebase')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      dataSource === 'firebase'
                        ? 'bg-orange-500/20 text-orange-200 font-bold border-orange-500 shadow-md ring-1 ring-orange-500/40'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-white">
                      <Flame className="w-4 h-4 text-orange-400" />
                      FIREBASE CLOUD
                    </div>
                    <div className="text-[10px] font-normal opacity-80 mt-1 leading-snug">
                      Đo 24/7 từ nhà ➜ Xem từ xa qua Internet (4G, Trường, Điện thoại)
                    </div>
                  </button>

                  <button
                    onClick={() => setDataSource('mock')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      dataSource === 'mock'
                        ? 'bg-blue-500/20 text-blue-200 font-bold border-blue-500 shadow-md ring-1 ring-blue-500/40'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-white">
                      <Database className="w-4 h-4 text-blue-400" />
                      GIẢ LẬP (MOCK)
                    </div>
                    <div className="text-[10px] font-normal opacity-80 mt-1 leading-snug">
                      Mô phỏng thuật toán Fuzzy-PID & PSO theo quỹ đạo mặt trời
                    </div>
                  </button>

                  <button
                    onClick={() => setDataSource('esp32_ws')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      dataSource === 'esp32_ws'
                        ? 'bg-emerald-500/20 text-emerald-200 font-bold border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-white">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      LOCAL WEBSOCKET
                    </div>
                    <div className="text-[10px] font-normal opacity-80 mt-1 leading-snug">
                      Kết nối trực tiếp IP nội bộ khi cùng mạng WiFi (Demo tại chỗ)
                    </div>
                  </button>
                </div>
              </div>

              {/* FIREBASE CONFIG PANEL */}
              {dataSource === 'firebase' && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      Cấu hình Firebase Realtime Database
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      firebaseConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {firebaseConnected ? '● Đã kết nối Firebase' : '○ Chưa có dữ liệu'}
                    </span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Database URL (Bắt buộc):</label>
                    <input
                      type="text"
                      value={firebaseConfig.databaseURL || ''}
                      onChange={(e) => setFirebaseConfig({ ...firebaseConfig, databaseURL: e.target.value })}
                      placeholder="https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app"
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-hidden focus:border-orange-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">Web API Key (Bắt buộc):</label>
                      <input
                        type="text"
                        value={firebaseConfig.apiKey || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-hidden focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Project ID (Tuỳ chọn):</label>
                      <input
                        type="text"
                        value={firebaseConfig.projectId || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                        placeholder="tracking-solar-datn"
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-hidden focus:border-orange-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LOCAL WEBSOCKET CONFIG PANEL */}
              {dataSource === 'esp32_ws' && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div>
                    <label className="text-zinc-400 uppercase block mb-1">
                      Địa Chỉ WebSocket ESP32-S3 (ws://)
                    </label>
                    <input
                      type="text"
                      value={wsUrl}
                      onChange={(e) => setWsUrl(e.target.value)}
                      placeholder="ws://192.168.4.1/ws"
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 uppercase block mb-1">
                      Địa Chỉ REST API Fallback (http://)
                    </label>
                    <input
                      type="text"
                      value={restUrl}
                      onChange={(e) => setRestUrl(e.target.value)}
                      placeholder="http://192.168.4.1/api/telemetry"
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              {/* Polling/Refresh Rate */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-400 uppercase">Tần Số Làm Mới Giao Diện</label>
                  <span className="text-white font-bold">{refreshRate} ms</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

            </div>
          )}

          {/* TAB 2: ESP32-1 TRACKER CODE */}
          {activeTab === 'esp32_trk' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-zinc-300">
                  Mã Arduino C++ cho <b>ESP32-S3 #1</b> (Tấm xoay 2 trục + INA219 + LDR + Firebase):
                </span>
                <button
                  onClick={() => handleCopyCode(esp32TrackerCode, 'trk')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white border border-white/20 cursor-pointer transition-all active:scale-95"
                >
                  {copiedTab === 'trk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
                  <span>{copiedTab === 'trk' ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[360px]">
                {esp32TrackerCode}
              </pre>
            </div>
          )}

          {/* TAB 3: ESP32-2 FIXED PANEL CODE */}
          {activeTab === 'esp32_fix' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-zinc-300">
                  Mã Arduino C++ cho <b>ESP32-S3 #2</b> (Tấm cố định + INA219 + Firebase):
                </span>
                <button
                  onClick={() => handleCopyCode(esp32FixedCode, 'fix')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white border border-white/20 cursor-pointer transition-all active:scale-95"
                >
                  {copiedTab === 'fix' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
                  <span>{copiedTab === 'fix' ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[360px]">
                {esp32FixedCode}
              </pre>
            </div>
          )}

          {/* TAB 4: RAW JSON LIVE */}
          {activeTab === 'json' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>Dữ liệu Telemetry JSON đang hiển thị trên Dashboard:</span>
                <span className="text-zinc-500">{new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[360px]">
                {JSON.stringify(latestTelemetry || {}, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            {dataSource === 'firebase' ? '🔥 Chế độ Firebase Cloud' : dataSource === 'mock' ? '⚡ Chế độ Giả lập' : '📡 Chế độ WebSocket'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Lưu Cấu Hình & Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
