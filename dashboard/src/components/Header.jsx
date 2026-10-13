import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Settings, 
  AlertTriangle, 
  RotateCcw, 
  Clock, 
  LogOut, 
  ShieldCheck,
  MapPin
} from 'lucide-react';
import WeatherWidget from './WeatherWidget';

export default function Header({ 
  system = {}, 
  mode = 'AUTO', 
  dataSource = 'firebase',
  firebaseConnected = false,
  currentUser = null,
  onLogout,
  onOpenManualModal, 
  onOpenSettingsModal,
  onResetEstop,
  weatherData = null,
  isLoadingWeather = false,
  onRefreshWeather = null,
  customOverrideType = null,
  setCustomOverrideType = null,
  onOpenMapModal = null
}) {

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const isAdmin = currentUser?.role === 'admin';

  const hasAlarm = system?.errors?.sensorLost || 
    system?.errors?.driverFault || 
    system?.errors?.limitSwitchMinTriggered || 
    system?.errors?.limitSwitchMaxTriggered ||
    system?.estop;

  return (
    <header className="border-b border-zinc-200 bg-white text-zinc-950 sticky top-0 z-40 shadow-xs relative">
      {/* Top Main Bar */}
      <div className="max-w-[1720px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 relative">
        
        {/* Left: Mobile Title / Desktop Logo + Weather Widget */}
        <div className="flex items-center gap-3 shrink min-w-0">
          {/* Mobile Title */}
          <h1 className="sm:hidden text-base font-sans font-bold tracking-tight text-zinc-950 uppercase whitespace-nowrap">
            TRACKING SOLAR
          </h1>

          {/* Desktop Logo on Left */}
          <img 
            src="/tdt_logo.png" 
            alt="Logo Trường Đại học Tôn Đức Thắng (TDTU)" 
            className="hidden sm:block h-10 md:h-11 w-auto object-contain"
          />

          {/* Weather Widget right beside Logo */}
          {weatherData && (
            <div className="hidden sm:block">
              <WeatherWidget 
                weatherData={weatherData}
                isLoading={isLoadingWeather}
                onRefresh={onRefreshWeather}
                customOverrideType={customOverrideType}
                setCustomOverrideType={setCustomOverrideType}
                onOpenMapModal={onOpenMapModal}
              />
            </div>
          )}
        </div>

        {/* Center (Desktop): Title TRACKING SOLAR Centered */}
        <div className="hidden sm:flex items-center justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 pointer-events-none">
          <h1 className="text-2xl lg:text-[26px] font-sans font-bold tracking-tight text-zinc-950 uppercase whitespace-nowrap">
            TRACKING SOLAR
          </h1>
        </div>

        {/* Mobile Right: Logo */}
        <div className="sm:hidden flex items-center justify-end shrink-0 max-w-[48%]">
          <img 
            src="/tdt_logo.png" 
            alt="Logo Trường Đại học Tôn Đức Thắng (TDTU)" 
            className="h-6 w-auto max-w-full object-contain"
          />
        </div>

        {/* Desktop Right: Status Badges & Quick Controls */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Cloud / Source Badge (Admin Only) */}
          {isAdmin && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-xs text-zinc-800"
              title={
                dataSource === 'firebase'
                  ? (firebaseConnected 
                      ? (system.online ? 'Firebase Cloud: Đang truyền dữ liệu ESP32 trực tiếp' : 'Firebase Cloud: Đã kết nối RTDB (Đang chờ gói tin ESP32)')
                      : 'Firebase Cloud: Đang kết nối...')
                  : (system.online ? 'Hệ thống đang hoạt động' : 'Chưa có kết nối')
              }
            >
              <span className={`w-2 h-2 rounded-full ${
                (dataSource === 'firebase' ? firebaseConnected : system.online)
                  ? 'bg-emerald-600'
                  : 'bg-zinc-400'
              } ${system.online ? 'animate-pulse' : ''}`}></span>
              <span className="font-bold text-xs text-zinc-900">
                {dataSource === 'firebase' ? 'Firebase RTDB' : dataSource === 'mock' ? 'Mô phỏng' : 'ESP32 WS'}
              </span>
            </div>
          )}

          {/* Clock & Date Badge (Always visible for all users) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-xs text-zinc-800 font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-600" />
            <span className="font-bold text-xs text-zinc-950">{formattedTime}</span>
            <span className="hidden md:inline text-zinc-400">|</span>
            <span className="hidden md:inline text-zinc-700 font-sans font-medium">{formattedDate}</span>
          </div>

          {/* Desktop Manual Control Button (Admin Only) */}
          {isAdmin && (
            <button
              id="btn-open-manual-control"
              onClick={onOpenManualModal}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-200" />
              <span>Điều khiển</span>
            </button>
          )}

          {/* Settings Modal Trigger Button (Admin Only) */}
          {isAdmin && (
            <button
              id="btn-open-settings"
              onClick={onOpenSettingsModal}
              className="p-2 rounded-lg text-zinc-800 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 transition-all cursor-pointer active:scale-95"
              title="Cài đặt kết nối"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* User Badge & Logout Button (Màu nền cơ bản, trung tính, không neon/phát sáng) */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-300">
            {currentUser?.role === 'admin' ? (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-xs text-zinc-800 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                <span>Admin</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-xs text-zinc-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                <span>Khách (khach123)</span>
              </div>
            )}
            {onLogout && (
              <button
                id="btn-logout"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 hover:text-red-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 transition-all cursor-pointer active:scale-95"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-700" />
                <span className="hidden xl:inline">Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Alert / Warning Banner if active */}
      {hasAlarm && (
        <div className="bg-red-900 border-t border-b border-red-700 px-4 sm:px-6 py-2 text-xs text-white font-mono flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <AlertTriangle className="w-4 h-4 text-red-200 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-xs">CẢNH BÁO:</span>
            <div className="flex items-center gap-2 whitespace-nowrap text-xs">
              {system?.estop && <span className="font-bold text-white">[EMERGENCY STOP]</span>}
              {system?.errors?.limitSwitchMinTriggered && <span>[LIMIT MIN]</span>}
              {system?.errors?.limitSwitchMaxTriggered && <span>[LIMIT MAX]</span>}
              {system?.errors?.sensorLost && <span>[MẤT CẢM BIẾN]</span>}
            </div>
          </div>
          {system?.estop && (
            <button
              onClick={onResetEstop}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-white hover:bg-zinc-100 text-xs text-red-950 cursor-pointer shrink-0 ml-2 font-bold shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset E-STOP</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}

