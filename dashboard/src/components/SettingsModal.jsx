import React, { useState } from 'react';
import { X, Settings, Terminal, Check, Copy, Wifi, Code2 } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  isMock,
  setIsMock,
  wsUrl,
  setWsUrl,
  restUrl,
  setRestUrl,
  refreshRate,
  setRefreshRate,
  latestTelemetry
}) {
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'json' | 'esp32'
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const esp32CppCode = `// ESP32-S3 Firmware Snippet for Smart Dual-Axis ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR
// Libraries: WiFi.h, ArduinoJson.h, WebSocketsServer.h, Adafruit_INA219.h
#include <WiFi.h>
#include <ArduinoJson.h>
#include <WebSocketsServer.h>
#include <Adafruit_INA219.h>

const char* ssid = "SolarTracker_ESP32";
const char* password = "password123";

WebSocketsServer webSocket = WebSocketsServer(81);
Adafruit_INA219 ina219_trk(0x40);
Adafruit_INA219 ina219_sta(0x41);

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload);
    const char* cmd = doc["cmd"];
    if (strcmp(cmd, "ping") == 0) {
      webSocket.sendTXT(num, "{\\"type\\":\\"pong\\"}");
    } else if (strcmp(cmd, "set_mode") == 0) {
      // Handle mode switch: AUTO / MANUAL / PARK
    } else if (strcmp(cmd, "jog") == 0) {
      // Handle motor jog
    }
  }
}

void sendTelemetry() {
  StaticJsonDocument<1024> doc;
  doc["timestamp"] = millis();
  doc["system"]["online"] = true;
  doc["system"]["mode"] = "AUTO";

  // INA219 Telemetry
  doc["ina219"]["tracking"]["voltage"] = ina219_trk.getBusVoltage_V();
  doc["ina219"]["tracking"]["current"] = ina219_trk.getCurrent_mA() / 1000.0;
  doc["ina219"]["tracking"]["power"] = (doc["ina219"]["tracking"]["voltage"].as<float>()) * (doc["ina219"]["tracking"]["current"].as<float>());
  
  doc["ina219"]["static"]["voltage"] = ina219_sta.getBusVoltage_V();
  doc["ina219"]["static"]["current"] = ina219_sta.getCurrent_mA() / 1000.0;
  doc["ina219"]["static"]["power"] = (doc["ina219"]["static"]["voltage"].as<float>()) * (doc["ina219"]["static"]["current"].as<float>());

  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

void setup() {
  Serial.begin(115200);
  WiFi.softAP(ssid, password);
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  ina219_trk.begin();
  ina219_sta.begin();
}

void loop() {
  webSocket.loop();
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 500) {
    lastSend = millis();
    sendTelemetry();
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esp32CppCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="panel-card w-full max-w-2xl overflow-hidden shadow-2xl border-[#2a2f3e] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-zinc-300" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Cấu Hình Hệ Thống & Tích Hợp ESP32-S3
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1e222d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#1c1f28] bg-[#0c0d10] px-4 pt-2 gap-2 text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer font-bold ${
              activeTab === 'config'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Cấu Hình Kết Nối
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer font-bold ${
              activeTab === 'json'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Raw JSON Inspector
          </button>
          <button
            onClick={() => setActiveTab('esp32')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer font-bold ${
              activeTab === 'esp32'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mã Nguồn C++ ESP32
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-4 font-mono text-xs">
              
              {/* Data Source Selector */}
              <div className="panel-subtle p-3.5 border-[#262b3a]">
                <label className="text-zinc-300 font-semibold block mb-2 uppercase">
                  Nguồn Dữ Liệu Hoạt Động (Data Source)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsMock(true)}
                    className={`p-2.5 rounded border text-center transition-colors cursor-pointer ${
                      isMock
                        ? 'bg-zinc-200 text-zinc-950 font-bold border-zinc-100 shadow-sm'
                        : 'bg-[#12141a] text-zinc-400 hover:text-zinc-200 border-[#222633]'
                    }`}
                  >
                    <div>GIẢ LẬP (MOCK DATA)</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">Thuật toán & Quỹ đạo mặt trời</div>
                  </button>
                  <button
                    onClick={() => setIsMock(false)}
                    className={`p-2.5 rounded border text-center transition-colors cursor-pointer ${
                      !isMock
                        ? 'bg-zinc-200 text-zinc-950 font-bold border-zinc-100 shadow-sm'
                        : 'bg-[#12141a] text-zinc-400 hover:text-zinc-200 border-[#222633]'
                    }`}
                  >
                    <div>PHẦN CỨNG ESP32-S3 THẬT</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">WebSocket / HTTP REST Live</div>
                  </button>
                </div>
              </div>

              {/* WebSocket URL */}
              <div>
                <label className="text-zinc-400 uppercase block mb-1">
                  Địa Chỉ WebSocket ESP32-S3 (ws://)
                </label>
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  placeholder="ws://192.168.4.1/ws"
                  className="w-full bg-[#0e0f13] border border-[#232734] rounded px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-zinc-400"
                />
              </div>

              {/* REST API URL */}
              <div>
                <label className="text-zinc-400 uppercase block mb-1">
                  Địa Chỉ REST API Fallback (http://)
                </label>
                <input
                  type="text"
                  value={restUrl}
                  onChange={(e) => setRestUrl(e.target.value)}
                  placeholder="http://192.168.4.1/api/telemetry"
                  className="w-full bg-[#0e0f13] border border-[#232734] rounded px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-zinc-400"
                />
              </div>

              {/* Refresh Rate */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-400 uppercase">Tần Số Cập Nhật Dữ Liệu (Polling Rate)</label>
                  <span className="text-zinc-200 font-semibold">{refreshRate} ms</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(Number(e.target.value))}
                  className="w-full accent-zinc-300"
                />
              </div>
            </div>
          )}

          {/* TAB 2: JSON TELEMETRY INSPECTOR */}
          {activeTab === 'json' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>Gói tin Telemetry JSON thời gian thực nhận từ ESP32:</span>
                <span className="text-zinc-500">{new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="p-3.5 rounded bg-[#090a0d] border border-[#1d202a] text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[340px]">
                {JSON.stringify(latestTelemetry || {}, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 3: ESP32 C++ FIRMWARE CODE */}
          {activeTab === 'esp32' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-zinc-400">
                  Mã mẫu Arduino C++ cho ESP32-S3 phát Wi-Fi & WebSockets:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181a24] hover:bg-[#222634] text-xs font-mono text-zinc-200 border border-[#2b3042] cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedCode ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded bg-[#090a0d] border border-[#1d202a] text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[340px]">
                {esp32CppCode}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0d0e12] border-t border-[#191b22] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-mono bg-zinc-200 hover:bg-white text-zinc-950 font-semibold cursor-pointer"
          >
            Lưu & Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
