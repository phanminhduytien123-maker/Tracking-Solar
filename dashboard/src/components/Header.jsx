import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Settings, 
  AlertTriangle, 
  RotateCcw, 
  Clock,
  Sun,
  Flame,
  Wifi,
  Database
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
    <header className="border-b border-white/15 bg-black/30 backdrop-blur-2xl sticky top-0 z-40 shadow-sm transition-colors duration-500">
      {/* Top Main Bar */}
      <div className="max-w-[1720px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Brand / Title */}
        <div className="flex items-center">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
            TRACKING SOLAR
          </h1>
        </div>

        {/* Right Status Badges & Quick Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Cloud / Source Badge */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-xl bg-black/20 border border-white/15 text-[11px] text-white shadow-sm backdrop-blur-xl">
            <span className={`w-2 h-2 rounded-full ${
              system.online ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
            }`}></span>
            <span className="font-bold text-[10px] sm:text-xs">
              {dataSource === 'firebase' ? 'Firebase RTDB' : dataSource === 'mock' ? 'Mock Mode' : 'Local WS'}
            </span>
          </div>

          {/* Clock Badge (Compact on mobile) */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-xl bg-black/20 border border-white/15 text-[11px] text-white shadow-sm backdrop-blur-xl font-mono">
            <Clock className="w-3 h-3 text-white/70" />
            <span className="font-bold text-[11px] sm:text-xs text-white">{formattedTime}</span>
            <span className="hidden md:inline text-white/40">|</span>
            <span className="hidden md:inline text-white/70">{formattedDate}</span>
          </div>

          {/* Desktop Manual Control Button */}
          <button
            id="btn-open-manual-control"
            onClick={onOpenManualModal}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all cursor-pointer shadow-lg active:scale-95 backdrop-blur-xl"
          >
            <Sliders className="w-3.5 h-3.5 text-white" />
            <span>Điều khiển</span>
          </button>

          {/* Settings Modal Trigger Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettingsModal}
            className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white bg-black/20 hover:bg-white/20 border border-white/20 transition-all cursor-pointer shadow-sm active:scale-95 backdrop-blur-xl"
            title="Cài đặt kết nối"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Alert / Warning Banner if active */}
      {hasAlarm && (
        <div className="bg-red-950/90 border-t border-b border-red-500/30 px-3 sm:px-6 py-1.5 text-xs text-red-100 font-mono flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[11px]">CẢNH BÁO:</span>
            <div className="flex items-center gap-2 whitespace-nowrap text-[11px]">
              {system?.estop && <span className="font-bold text-red-200">[EMERGENCY STOP]</span>}
              {system?.errors?.limitSwitchMinTriggered && <span>[LIMIT MIN]</span>}
              {system?.errors?.limitSwitchMaxTriggered && <span>[LIMIT MAX]</span>}
              {system?.errors?.sensorLost && <span>[MẤT CẢM BIẾN]</span>}
            </div>
          </div>
          {system?.estop && (
            <button
              onClick={onResetEstop}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-900 border border-red-700 text-[10px] sm:text-[11px] text-red-100 cursor-pointer shrink-0 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset E-STOP</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
