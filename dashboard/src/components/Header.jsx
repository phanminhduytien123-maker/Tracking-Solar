import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Settings, 
  AlertTriangle, 
  RotateCcw, 
  Clock
} from 'lucide-react';

export default function Header({ 
  system = {}, 
  mode = 'AUTO', 
  dataSource = 'firebase',
  onOpenManualModal, 
  onOpenSettingsModal,
  onResetEstop
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

  const hasAlarm = system?.errors?.sensorLost || 
    system?.errors?.driverFault || 
    system?.errors?.limitSwitchMinTriggered || 
    system?.errors?.limitSwitchMaxTriggered ||
    system?.estop;

  return (
    <header className="border-b border-zinc-800 bg-[#0c0f16]/95 backdrop-blur-xl sticky top-0 z-40 shadow-sm relative">
      {/* Top Main Bar */}
      <div className="max-w-[1720px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 relative">
        
        {/* Left: Brand / Title */}
        <div className="flex items-center shrink-0">
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
            TRACKING SOLAR
          </h1>
        </div>

        {/* Center: Ton Duc Thang University Logo */}
        <div className="flex items-center justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 pointer-events-auto">
          <img 
            src="/tdt_logo.png" 
            alt="Logo Trường Đại học Tôn Đức Thắng (TDTU)" 
            className="h-8 sm:h-11 md:h-12 w-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Right Status Badges & Quick Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Cloud / Source Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className={`w-2 h-2 rounded-full ${
              system.online ? 'bg-emerald-400' : 'bg-zinc-600'
            }`}></span>
            <span className="font-semibold text-xs text-zinc-200">
              {dataSource === 'firebase' ? 'Firebase RTDB' : dataSource === 'mock' ? 'Mô phỏng' : 'ESP32 WS'}
            </span>
          </div>

          {/* Clock Badge (Compact on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-bold text-xs text-white">{formattedTime}</span>
            <span className="hidden md:inline text-zinc-600">|</span>
            <span className="hidden md:inline text-zinc-400 font-sans">{formattedDate}</span>
          </div>

          {/* Desktop Manual Control Button */}
          <button
            id="btn-open-manual-control"
            onClick={onOpenManualModal}
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-all cursor-pointer active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-300" />
            <span>Điều khiển</span>
          </button>

          {/* Settings Modal Trigger Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettingsModal}
            className="p-2 rounded-lg text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all cursor-pointer active:scale-95"
            title="Cài đặt kết nối"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Alert / Warning Banner if active */}
      {hasAlarm && (
        <div className="bg-red-950 border-t border-b border-red-800/80 px-4 sm:px-6 py-2 text-xs text-red-100 font-mono flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-xs">CẢNH BÁO:</span>
            <div className="flex items-center gap-2 whitespace-nowrap text-xs">
              {system?.estop && <span className="font-bold text-red-200">[EMERGENCY STOP]</span>}
              {system?.errors?.limitSwitchMinTriggered && <span>[LIMIT MIN]</span>}
              {system?.errors?.limitSwitchMaxTriggered && <span>[LIMIT MAX]</span>}
              {system?.errors?.sensorLost && <span>[MẤT CẢM BIẾN]</span>}
            </div>
          </div>
          {system?.estop && (
            <button
              onClick={onResetEstop}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-900 hover:bg-red-800 border border-red-700 text-xs text-red-100 cursor-pointer shrink-0 ml-2 font-bold"
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

