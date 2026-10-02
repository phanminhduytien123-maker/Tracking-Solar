import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Settings, 
  AlertTriangle, 
  RotateCcw, 
  Clock
} from 'lucide-react';

export default function Header({ 
  system, 
  mode, 
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
    <header className="border-b border-white/15 bg-black/20 backdrop-blur-2xl sticky top-0 z-40 shadow-sm transition-colors duration-500">
      {/* Top Main Bar */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Brand / Title */}
        <div className="flex items-center">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
            ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR
          </h1>
        </div>

        {/* Right Status Badges & Quick Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          
          {/* RTC Clock Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/20 border border-white/15 text-xs text-white shadow-sm backdrop-blur-xl">
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="font-mono font-bold text-white">{formattedTime}</span>
            <span className="text-white/40">|</span>
            <span className="font-mono text-white/80 font-medium">{formattedDate}</span>
          </div>



          {/* Manual Control Modal Trigger Button */}
          <button
            id="btn-open-manual-control"
            onClick={onOpenManualModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all cursor-pointer shadow-lg active:scale-95 backdrop-blur-xl"
          >
            <Sliders className="w-3.5 h-3.5 text-white" />
            <span>Điều khiển</span>
          </button>

          {/* Settings Modal Trigger Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl text-white/80 hover:text-white bg-black/20 hover:bg-white/20 border border-white/20 transition-all cursor-pointer shadow-sm active:scale-95 backdrop-blur-xl"
            title="Cài đặt kết nối ESP32"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Alert / Warning Banner if active */}
      {hasAlarm && (
        <div className="bg-red-950/80 border-t border-b border-red-500/30 px-4 sm:px-6 py-1.5 text-xs text-red-100 font-mono flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <span className="font-semibold uppercase tracking-wider">CẢNH BÁO HỆ THỐNG:</span>
            <div className="flex items-center gap-3">
              {system?.estop && <span className="font-bold text-red-200">[EMERGENCY STOP KÍCH HOẠT]</span>}
              {system?.errors?.limitSwitchMinTriggered && <span>[CHẠM CÔNG TẮC HÀNH TRÌNH MIN]</span>}
              {system?.errors?.limitSwitchMaxTriggered && <span>[CHẠM CÔNG TẮC HÀNH TRÌNH MAX]</span>}
              {system?.errors?.sensorLost && <span>[MẤT TÍN HIỆU CẢM BIẾN]</span>}
            </div>
          </div>
          {system?.estop && (
            <button
              onClick={onResetEstop}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-900 border border-red-700 text-[11px] text-red-100 cursor-pointer"
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
