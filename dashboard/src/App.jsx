import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import VisualPanelsComparison from './components/VisualPanelsComparison';
import ChartsSection from './components/ChartsSection';
import DetailedTelemetryModal from './components/DetailedTelemetryModal';
import ManualControlModal from './components/ManualControlModal';
import SettingsModal from './components/SettingsModal';
import WeatherBackground from './components/WeatherBackground';

import { 
  MockTelemetryEngine, 
  generate30DaysHistory, 
  generateIntradayProfile 
} from './services/mockDataService';
import { ESP32CommunicationService } from './services/esp32Service';
import { fetchLiveWeather, getFallbackWeatherData } from './services/weatherService';
import { Sun, Cloud, CloudRain, CloudLightning, Moon, Sparkles } from 'lucide-react';

export default function App() {
  const [isMock, setIsMock] = useState(true);
  const [wsUrl, setWsUrl] = useState('ws://192.168.4.1/ws');
  const [restUrl, setRestUrl] = useState('http://192.168.4.1/api/telemetry');
  const [refreshRate, setRefreshRate] = useState(800);

  // Modals state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Weather State for District 1, Ho Chi Minh City (Phường Sài Gòn)
  const [weatherData, setWeatherData] = useState(() => getFallbackWeatherData());
  const [customWeatherType, setCustomWeatherType] = useState(null);
  const [showWeatherSwitcher, setShowWeatherSwitcher] = useState(false);

  // Engine instances
  const mockEngineRef = useRef(new MockTelemetryEngine());
  const esp32ServiceRef = useRef(null);

  // Telemetry & Data States
  const [telemetry, setTelemetry] = useState(() => mockEngineRef.current.getNextState());
  const [intradayData, setIntradayData] = useState(() => generateIntradayProfile());
  const [history30Days] = useState(() => generate30DaysHistory());

  // Fetch Live Weather for Saigon District 1 (Lat 10.7769, Lon 106.7009)
  const loadWeather = async () => {
    try {
      const data = await fetchLiveWeather();
      if (data) {
        setWeatherData(data);
      }
    } catch (err) {
      console.warn('[Weather API Silent Fetch]', err);
    }
  };

  // Weather fetch loop every 10 minutes
  useEffect(() => {
    loadWeather();
    const weatherTimer = setInterval(loadWeather, 600000);
    return () => clearInterval(weatherTimer);
  }, []);

  // Initialize ESP32 Service
  useEffect(() => {
    esp32ServiceRef.current = new ESP32CommunicationService({
      wsUrl,
      restUrl,
      useMock: isMock,
      onTelemetry: (liveData) => {
        setTelemetry((prev) => ({
          ...prev,
          ...liveData,
          system: {
            ...prev.system,
            ...liveData.system,
            online: true,
            isMock: false
          }
        }));
      },
      onStatusChange: (status) => {
        setTelemetry((prev) => ({
          ...prev,
          system: {
            ...prev.system,
            online: isMock ? true : status.connected,
            isMock: isMock,
            pingMs: status.latency || prev.system.pingMs
          }
        }));
      },
      onError: (err) => {
        console.warn('[ESP32 Client Error]', err);
      }
    });

    return () => {
      if (esp32ServiceRef.current) {
        esp32ServiceRef.current.disconnect();
      }
    };
  }, []);

  // Sync WebSocket settings
  useEffect(() => {
    if (esp32ServiceRef.current) {
      esp32ServiceRef.current.setWsUrl(wsUrl);
      esp32ServiceRef.current.setUseMock(isMock);
    }
  }, [wsUrl, isMock]);

  // Main Telemetry Loop
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMock) {
        const nextState = mockEngineRef.current.getNextState();
        setTelemetry(nextState);

        // Update real-time intraday curve
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour >= 6 && currentHour <= 18) {
          const timeSlot = `${currentHour.toString().padStart(2, '0')}:${now.getMinutes() < 30 ? '00' : '30'}`;
          setIntradayData((prev) => {
            return prev.map((item) => {
              if (item.time === timeSlot) {
                return {
                  ...item,
                  pTracking: nextState.ina219.tracking.power,
                  pStatic: nextState.ina219.static.power,
                  gain: nextState.ina219.comparison.percentGain
                };
              }
              return item;
            });
          });
        }
      } else {
        if (esp32ServiceRef.current && !esp32ServiceRef.current.isConnected) {
          esp32ServiceRef.current.fetchTelemetryHttp();
        }
      }
    }, refreshRate);

    return () => clearInterval(timer);
  }, [isMock, refreshRate]);

  // Handlers
  const handleSetMode = (mode) => {
    if (isMock) {
      mockEngineRef.current.setMode(mode);
    } else {
      esp32ServiceRef.current?.setMode(mode);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, mode }
    }));
  };

  const handleJog = (axis, step) => {
    if (isMock) {
      mockEngineRef.current.jog(axis, step);
    } else {
      esp32ServiceRef.current?.jog(axis, step * 100, step);
    }
  };

  const handleCalibrate = () => {
    if (isMock) {
      mockEngineRef.current.calibrate();
    } else {
      esp32ServiceRef.current?.calibrate();
    }
  };

  const handleTriggerPso = () => {
    if (isMock) {
      mockEngineRef.current.triggerPSO();
    } else {
      esp32ServiceRef.current?.triggerPSO();
    }
  };

  const handlePark = () => {
    if (isMock) {
      mockEngineRef.current.park();
    } else {
      esp32ServiceRef.current?.park();
    }
  };

  const handleEstop = () => {
    if (isMock) {
      mockEngineRef.current.setEstop(true);
    } else {
      esp32ServiceRef.current?.setEstop(true);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, estop: true }
    }));
  };

  const handleResetEstop = () => {
    if (isMock) {
      mockEngineRef.current.setEstop(false);
    } else {
      esp32ServiceRef.current?.setEstop(false);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, estop: false }
    }));
  };

  return (
    <div className="min-h-screen text-white flex flex-col justify-between selection:bg-white/30 selection:text-white relative font-sans overflow-x-hidden">
      
      {/* 0. DYNAMIC ATMOSPHERIC WEATHER BACKGROUND (SAIGON DISTRICT 1 LIVE API) */}
      <WeatherBackground 
        weatherData={weatherData} 
        customOverrideType={customWeatherType} 
      />

      {/* 1. HEADER & SYSTEM STATUS */}
      <Header 
        system={telemetry.system}
        mode={telemetry.system.mode}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onResetEstop={handleResetEstop}
      />

      {/* 2. MAIN STREAMLINED DASHBOARD */}
      <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex-1 relative z-10">
        
        {/* HERO: TRỰC QUAN 2 TẤM PIN MẶT TRỜI + GÓC ĐỘNG CƠ + CÔNG SUẤT + % GAIN */}
        <section aria-label="So sánh trực quan 2 tấm pin mặt trời">
          <VisualPanelsComparison 
            ina219={telemetry.ina219}
            motors={telemetry.motors}
            onOpenDetails={() => setIsDetailsModalOpen(true)}
            onOpenManual={() => setIsManualModalOpen(true)}
          />
        </section>

        {/* BIỂU ĐỒ SẢN LƯỢNG ĐIỆN THU ĐƯỢC (HÔM NAY & 30 NGÀY) */}
        <section aria-label="Biểu đồ sản lượng điện">
          <ChartsSection 
            intradayData={intradayData}
            history30Days={history30Days}
          />
        </section>

      </main>

      {/* 3. MODALS */}
      {/* Modal Chi Tiết Toàn Diện (Sensors, Fuzzy-PID, PSO, INA219, Encoders) */}
      <DetailedTelemetryModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        telemetry={telemetry}
        onTriggerPso={handleTriggerPso}
      />

      {/* Modal Bảng Điều Khiển Thủ Công (Jog, Chế độ, Calibrate, E-Stop) */}
      <ManualControlModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        mode={telemetry.system.mode}
        onSetMode={handleSetMode}
        onJog={handleJog}
        onCalibrate={handleCalibrate}
        onTriggerPso={handleTriggerPso}
        onPark={handlePark}
        onEstop={handleEstop}
        motors={telemetry.motors}
      />

      {/* Modal Cài Đặt Kết Nối & Mã Nguồn ESP32 */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isMock={isMock}
        setIsMock={setIsMock}
        wsUrl={wsUrl}
        setWsUrl={setWsUrl}
        restUrl={restUrl}
        setRestUrl={setRestUrl}
        refreshRate={refreshRate}
        setRefreshRate={setRefreshRate}
        latestTelemetry={telemetry}
      />

      {/* 4. FOOTER */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-2xl py-3 px-4 sm:px-6 text-center text-xs text-white/70 relative z-10">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">ĐỒ ÁN TỐT NGHIỆP: HỆ THỐNG ĐIỀU HƯỚNG PIN MẶT TRỜI THÔNG MINH (FUZZY LOGIC & PSO)</span>
          </div>
          <div className="flex items-center gap-3 text-white/60 font-mono text-[11px]">
            <span>ESP32-S3 REAL-TIME TELEMETRY SYSTEM © 2026</span>
          </div>
        </div>
      </footer>

      {/* 5. DISCRETE WEATHER PRESET DEMO PILL (Bottom Right corner) */}
      <div className="fixed bottom-4 right-4 z-40">
        {showWeatherSwitcher ? (
          <div className="p-2 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <button
              onClick={() => { setCustomWeatherType(null); setShowWeatherSwitcher(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === null ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>API Q1</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('clear'); setShowWeatherSwitcher(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === 'clear' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>Nắng</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('clouds'); setShowWeatherSwitcher(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === 'clouds' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-slate-300" />
              <span>Mây</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('rain'); setShowWeatherSwitcher(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === 'rain' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              <span>Mưa</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('thunderstorm'); setShowWeatherSwitcher(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === 'thunderstorm' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
              <span>Giông</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('night'); setShowWeatherSwitcher(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === 'night' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
              <span>Đêm</span>
            </button>
            <button
              onClick={() => setShowWeatherSwitcher(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 ml-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowWeatherSwitcher(true)}
            className="p-2.5 rounded-2xl bg-black/30 hover:bg-black/50 backdrop-blur-2xl border border-white/20 text-white/80 hover:text-white shadow-xl transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs"
            title="Đổi hiệu ứng nền thời tiết"
          >
            <Sparkles className="w-4 h-4 text-sky-300" />
          </button>
        )}
      </div>

    </div>
  );
}
