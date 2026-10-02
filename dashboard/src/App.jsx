import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import VisualPanelsComparison from './components/VisualPanelsComparison';
import ChartsSection from './components/ChartsSection';
import DetailedTelemetryModal from './components/DetailedTelemetryModal';
import ManualControlModal from './components/ManualControlModal';
import SettingsModal from './components/SettingsModal';
import WeatherBackground from './components/WeatherBackground';
import MobileBottomNav from './components/MobileBottomNav';

import { 
  MockTelemetryEngine, 
  generate30DaysHistory, 
  generateIntradayProfile 
} from './services/mockDataService';
import { ESP32CommunicationService } from './services/esp32Service';
import { FirebaseSolarService, getCleanZeroTelemetry } from './services/firebaseService';
import { fetchLiveWeather, getFallbackWeatherData } from './services/weatherService';
import { Sun, Cloud, CloudRain, CloudLightning, Moon, Sparkles } from 'lucide-react';

export default function App() {
  // Data Source: 'firebase' | 'mock' | 'esp32_ws'
  const [dataSource, setDataSource] = useState(() => {
    return localStorage.getItem('solar_datasource') || 'firebase';
  });

  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    const saved = localStorage.getItem('solar_firebase_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      databaseURL: 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/',
      apiKey: 'AIzaSyD0i6DhiIncmRaEd6D3UZjLJ1EHNBzXces',
      projectId: 'final-project---tracking-solar'
    };
  });

  const [wsUrl, setWsUrl] = useState('ws://192.168.4.1/ws');
  const [restUrl, setRestUrl] = useState('http://192.168.4.1/api/telemetry');
  const [refreshRate, setRefreshRate] = useState(1000);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

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
  const firebaseServiceRef = useRef(new FirebaseSolarService());

  // Telemetry & Data States
  const [telemetry, setTelemetry] = useState(() => {
    return dataSource === 'firebase' ? getCleanZeroTelemetry() : mockEngineRef.current.getNextState();
  });
  const [intradayData, setIntradayData] = useState(() => generateIntradayProfile());
  const [history30Days] = useState(() => generate30DaysHistory());

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('solar_datasource', dataSource);
  }, [dataSource]);

  useEffect(() => {
    localStorage.setItem('solar_firebase_config', JSON.stringify(firebaseConfig));
  }, [firebaseConfig]);

  // Handle data source change
  const handleDataSourceChange = (newSource) => {
    setDataSource(newSource);
    if (newSource === 'firebase') {
      setTelemetry(getCleanZeroTelemetry());
    } else if (newSource === 'mock') {
      setTelemetry(mockEngineRef.current.getNextState());
    }
  };

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

  useEffect(() => {
    loadWeather();
    const weatherTimer = setInterval(loadWeather, 600000);
    return () => clearInterval(weatherTimer);
  }, []);

  // Initialize ESP32 Local WebSocket Service
  useEffect(() => {
    esp32ServiceRef.current = new ESP32CommunicationService({
      wsUrl,
      restUrl,
      useMock: dataSource !== 'esp32_ws',
      onTelemetry: (liveData) => {
        if (dataSource === 'esp32_ws') {
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
        }
      },
      onStatusChange: (status) => {
        if (dataSource === 'esp32_ws') {
          setTelemetry((prev) => ({
            ...prev,
            system: {
              ...prev.system,
              online: status.connected,
              isMock: false,
              pingMs: status.latency || prev.system.pingMs
            }
          }));
        }
      }
    });

    return () => {
      esp32ServiceRef.current?.disconnect();
    };
  }, []);

  // Sync Firebase Service connection
  useEffect(() => {
    if (dataSource === 'firebase') {
      if (firebaseConfig.databaseURL && firebaseConfig.apiKey) {
        firebaseServiceRef.current.init(firebaseConfig, {
          onTelemetry: (fbTelemetry) => {
            setTelemetry(fbTelemetry);

            // Update real-time intraday curve with live data
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour >= 6 && currentHour <= 18) {
              const timeSlot = `${currentHour.toString().padStart(2, '0')}:${now.getMinutes() < 30 ? '00' : '30'}`;
              setIntradayData((prev) => {
                return prev.map((item) => {
                  if (item.time === timeSlot) {
                    return {
                      ...item,
                      pTracking: fbTelemetry.ina219.tracking.power,
                      pStatic: fbTelemetry.ina219.static.power,
                      gain: fbTelemetry.ina219.comparison?.percentGain || 0
                    };
                  }
                  return item;
                });
              });
            }
          },
          onStatusChange: (status) => {
            setFirebaseConnected(status.connected);
          },
          onError: (err) => {
            console.warn('[Firebase Client Error]', err);
            setFirebaseConnected(false);
          }
        });
      }
    } else {
      firebaseServiceRef.current.disconnect();
      setFirebaseConnected(false);
    }
  }, [dataSource, firebaseConfig]);

  // Main Loop for Mock mode
  useEffect(() => {
    const timer = setInterval(() => {
      if (dataSource === 'mock') {
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
                  gain: nextState.ina219.comparison?.percentGain || 0
                };
              }
              return item;
            });
          });
        }
      }
    }, refreshRate);

    return () => clearInterval(timer);
  }, [dataSource, refreshRate]);

  // Action: Clear Firebase Data
  const handleClearFirebase = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá sạch toàn bộ dữ liệu trên Firebase không?')) {
      await firebaseServiceRef.current.clearAllData();
      setTelemetry(getCleanZeroTelemetry());
      alert('Đã xoá sạch dữ liệu trên Firebase!');
    }
  };

  // Action: Send Single Test Packet to Firebase
  const handleSendTestPacket = async () => {
    const dbUrl = firebaseConfig.databaseURL;
    if (!dbUrl) {
      alert('Vui lòng điền Database URL trước!');
      return;
    }

    const cleanUrl = dbUrl.endsWith('/') ? dbUrl : `${dbUrl}/`;
    const payload = {
      tracking: {
        voltage: 19.45,
        current: 2.580,
        power: 50.18,
        dailyEnergy: 0.285,
        azimuthAngle: 165.2,
        elevationAngle: 52.8,
        targetAzimuth: 165.5,
        targetElevation: 53.0,
        ldrTop: 3150,
        ldrBottom: 3120,
        ldrLeft: 3200,
        ldrRight: 3180,
        mode: 'AUTO',
        status: 'TRACKING_ACTIVE',
        estop: false,
        lastUpdate: Date.now()
      },
      static: {
        voltage: 17.80,
        current: 1.820,
        power: 32.40,
        dailyEnergy: 0.190,
        fixedAzimuth: 180.0,
        fixedElevation: 15.0,
        lastUpdate: Date.now()
      },
      algorithm: {
        name: 'Fuzzy-PID & PSO',
        kp: 2.65,
        ki: 0.08,
        kd: 0.72,
        psoBestFitness: 0.992,
        psoIteration: 18
      }
    };

    try {
      const res = await fetch(`${cleanUrl}solar.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('✅ Đã gửi thành công 1 gói Telemetry mẫu lên Firebase! Dashboard sẽ cập nhật ngay.');
      } else {
        alert(`❌ Lỗi gửi: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      alert(`❌ Lỗi kết nối Firebase: ${err.message}`);
    }
  };

  // Command Handlers
  const handleSetMode = (mode) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setMode(mode);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setMode(mode);
    } else {
      esp32ServiceRef.current?.setMode(mode);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, mode }
    }));
  };

  const handleJog = (axis, step) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.jog(axis, step);
    } else if (dataSource === 'firebase') {
      const dir = step > 0 ? 'CW' : 'CCW';
      firebaseServiceRef.current.jogMotor(axis, dir, Math.abs(step));
    } else {
      esp32ServiceRef.current?.jog(axis, step * 100, step);
    }
  };

  const handleCalibrate = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.calibrate();
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.sendCommand({ cmd: 'calibrate' });
    } else {
      esp32ServiceRef.current?.calibrate();
    }
  };

  const handleTriggerPso = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.triggerPSO();
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.sendCommand({ cmd: 'trigger_pso' });
    } else {
      esp32ServiceRef.current?.triggerPSO();
    }
  };

  const handlePark = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.park();
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.sendCommand({ cmd: 'park' });
    } else {
      esp32ServiceRef.current?.park();
    }
  };

  const handleEstop = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setEstop(true);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setEstop(true);
    } else {
      esp32ServiceRef.current?.setEstop(true);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, estop: true }
    }));
  };

  const handleResetEstop = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setEstop(false);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setEstop(false);
    } else {
      esp32ServiceRef.current?.setEstop(false);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, estop: false }
    }));
  };

  // Compute adaptive weather theme for frosted glass panels
  const currentWeather = weatherData?.current || {};
  const effectiveWeatherType = customWeatherType || currentWeather?.condition?.type || 'partly_cloudy';
  const isDay = customWeatherType 
    ? (!customWeatherType.includes('night')) 
    : (currentWeather?.isDay ?? 1);
  const timePhase = customWeatherType 
    ? (customWeatherType === 'golden_hour' ? 'golden_hour' : isDay ? 'day' : 'night') 
    : (currentWeather?.timePhase || (isDay ? 'day' : 'night'));

  const isRainy = ['rain', 'drizzle', 'thunderstorm'].includes(effectiveWeatherType);
  const weatherTheme = timePhase === 'golden_hour'
    ? 'golden-hour'
    : (isDay && !isRainy)
      ? 'sunny-day'
      : isRainy
        ? 'rainy'
        : 'night';

  return (
    <div 
      data-weather-theme={weatherTheme}
      className={`min-h-screen text-white flex flex-col justify-between selection:bg-white/30 selection:text-white relative font-sans overflow-x-hidden theme-${weatherTheme}`}
    >
      
      {/* 0. DYNAMIC ATMOSPHERIC WEATHER BACKGROUND (SAIGON DISTRICT 1 LIVE API) */}
      <WeatherBackground 
        weatherData={weatherData} 
        customOverrideType={customWeatherType} 
      />

      {/* 1. HEADER & SYSTEM STATUS */}
      <Header 
        system={telemetry.system}
        mode={telemetry.system.mode}
        dataSource={dataSource}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onResetEstop={handleResetEstop}
      />

      {/* 2. MAIN STREAMLINED DASHBOARD */}
      <main className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3.5 sm:space-y-5 pb-24 sm:pb-8 flex-1 relative z-10">
        
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
      {/* Modal Chi Tiết Cảm Biến LDR & Thuật Toán Fuzzy-PID, PSO */}
      <DetailedTelemetryModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        telemetry={telemetry}
      />

      {/* Modal Điều Khiển Thủ Công (Jog / Chuyển Chế Độ / E-Stop) */}
      <ManualControlModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        system={telemetry.system}
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
        dataSource={dataSource}
        setDataSource={handleDataSourceChange}
        firebaseConfig={firebaseConfig}
        setFirebaseConfig={setFirebaseConfig}
        firebaseConnected={firebaseConnected}
        wsUrl={wsUrl}
        setWsUrl={setWsUrl}
        restUrl={restUrl}
        setRestUrl={setRestUrl}
        refreshRate={refreshRate}
        setRefreshRate={setRefreshRate}
        latestTelemetry={telemetry}
        onClearFirebase={handleClearFirebase}
        onSendTestPacket={handleSendTestPacket}
      />

      {/* 4. FOOTER */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-2xl py-3 px-4 sm:px-6 text-center text-xs text-white/70 relative z-10">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide text-xs sm:text-sm">SVTH 1: PHAN MINH DUY TIẾN - SVTH 2:  VÕ HỒNG PHÁT</span>
          </div>
          <div className="flex items-center gap-3 text-white/60 font-mono text-[11px]">
            <span>ESP32-S3 REAL-TIME TELEMETRY SYSTEM © 2026</span>
          </div>
        </div>
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (Hiển thị cố định đáy màn hình điện thoại) */}
      <MobileBottomNav 
        dataSource={dataSource}
        firebaseConnected={firebaseConnected}
        systemMode={telemetry.system.mode}
        onOpenManual={() => setIsManualModalOpen(true)}
        onOpenDetails={() => setIsDetailsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* 6. DISCRETE WEATHER PRESET DEMO PILL (Bottom Floating Switcher) */}
      <div className="fixed bottom-18 sm:bottom-4 inset-x-2 sm:inset-x-auto sm:right-4 z-40 flex justify-center sm:justify-end pointer-events-none">
        {showWeatherSwitcher ? (
          <div className="p-1.5 sm:p-2 rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/25 shadow-2xl flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
            <button
              onClick={() => { setCustomWeatherType(null); setShowWeatherSwitcher(false); }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                customWeatherType === null ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>API Q1</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('clear'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                customWeatherType === 'clear' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>Nắng</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('clouds'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                customWeatherType === 'clouds' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-slate-300" />
              <span>Mây</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('rain'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                customWeatherType === 'rain' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              <span>Mưa</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('thunderstorm'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                customWeatherType === 'thunderstorm' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
              <span>Giông</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('night'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                customWeatherType === 'night' ? 'bg-white/30 text-white shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
              <span>Đêm</span>
            </button>
            <button
              onClick={() => setShowWeatherSwitcher(false)}
              className="p-1 sm:p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-xs cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowWeatherSwitcher(true)}
            className="p-2 sm:p-2.5 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-2xl border border-white/20 text-white/80 hover:text-white shadow-xl transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs pointer-events-auto ml-auto sm:ml-0"
            title="Đổi hiệu ứng nền thời tiết"
          >
            <Sparkles className="w-4 h-4 text-sky-300" />
          </button>
        )}
      </div>

    </div>
  );
}
