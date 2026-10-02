import React, { useState } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  RotateCcw, 
  Sliders, 
  ShieldAlert, 
  Home, 
  Sparkles,
  Compass,
  Zap
} from 'lucide-react';

export default function ManualControlModal({ 
  isOpen, 
  onClose, 
  mode = 'AUTO', 
  system = {},
  onSetMode, 
  onJog, 
  onCalibrate, 
  onTriggerPso, 
  onPark, 
  onEstop,
  motors 
}) {
  const [stepSize, setStepSize] = useState(5.0); // 0.5, 1.0, 5.0, 10.0 deg

  if (!isOpen) return null;

  const az = motors?.azimuth || { currentAngle: 0, targetAngle: 0 };
  const el = motors?.elevation || { currentAngle: 0, targetAngle: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md modal-sheet-container">
      
      {/* Modal Dialog Card */}
      <div className="panel-card w-full max-w-2xl overflow-hidden shadow-2xl border-white/20 flex flex-col bg-[#0b0e17]/95 backdrop-blur-3xl modal-sheet-card">
        
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="panel-header flex items-center justify-between py-3.5 px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
              <Sliders className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                Bảng Điều Khiển Mạch ESP32-S3
              </h2>
              <span className="text-[10px] text-white/60 font-mono">Real-time Command Center</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-sm max-h-[75vh] sm:max-h-[70vh]">
          
          {/* 1. CHỌN CHẾ ĐỘ VẬN HÀNH */}
          <div>
            <label className="text-[11px] sm:text-xs uppercase text-white/70 block mb-2 font-bold tracking-wide">
              1. Chế độ vận hành (Operating Mode)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* Mode Auto */}
              <button
                type="button"
                onClick={() => onSetMode('AUTO')}
                className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'AUTO'
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md ring-1 ring-emerald-400/40 font-black'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm text-white">⚡ TỰ ĐỘNG</div>
                <div className="text-[10px] opacity-75 mt-0.5">Fuzzy-PID & PSO</div>
              </button>

              {/* Mode Manual */}
              <button
                type="button"
                onClick={() => onSetMode('MANUAL')}
                className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'MANUAL'
                    ? 'bg-sky-500/25 text-sky-200 border-sky-400 shadow-md ring-1 ring-sky-400/40 font-black'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm text-white">🎛️ THỦ CÔNG</div>
                <div className="text-[10px] opacity-75 mt-0.5">Jog Động cơ</div>
              </button>

              {/* Mode Park */}
              <button
                type="button"
                onClick={() => {
                  onSetMode('PARK');
                  onPark();
                }}
                className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'PARK'
                    ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400 shadow-md ring-1 ring-indigo-400/40 font-black'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm text-white">🏠 VỊ TRÍ NGHỈ</div>
                <div className="text-[10px] opacity-75 mt-0.5">Park (Bão/Đêm)</div>
              </button>

              {/* E-STOP BUTTON */}
              <button
                type="button"
                onClick={onEstop}
                className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  system?.estop
                    ? 'bg-red-600 text-white border-red-500 font-black shadow-lg animate-pulse'
                    : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm text-red-300">🛑 DỪNG KHẨN</div>
                <div className="text-[10px] opacity-75 mt-0.5">E-STOP Motor</div>
              </button>
            </div>
          </div>

          {/* 2. BẢNG JOG ĐIỀU KHIỂN GÓC XOAY (DUAL-AXIS D-PAD) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold uppercase text-white/70 tracking-wider">
                2. Jog góc động cơ (Azimuth & Elevation)
              </span>
              
              {/* Step Size selector */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                <span className="text-[10px] text-white/50 px-1 font-mono">Bước:</span>
                {[1.0, 5.0, 10.0].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setStepSize(step)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      stepSize === step
                        ? 'bg-sky-400 text-black font-black'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {step}°
                  </button>
                ))}
              </div>
            </div>

            {/* Current Angles Display */}
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-sky-300 block font-bold">AZIMUTH (Trục Ngang)</span>
                <span className="text-base sm:text-lg font-black text-white">{az.currentAngle.toFixed(1)}°</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-sky-300 block font-bold">ELEVATION (Trục Đứng)</span>
                <span className="text-base sm:text-lg font-black text-white">{el.currentAngle.toFixed(1)}°</span>
              </div>
            </div>

            {/* Ergonomic Dual-Axis Cross Controller */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-2">
              
              {/* Elevation UP */}
              <button
                type="button"
                onClick={() => onJog('elevation', stepSize)}
                className="w-36 sm:w-44 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-sky-500/40 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowUp className="w-4 h-4 text-sky-300" />
                <span>NÂNG +{stepSize}°</span>
              </button>

              {/* Azimuth LEFT & RIGHT */}
              <div className="flex items-center gap-2 w-full justify-center">
                <button
                  type="button"
                  onClick={() => onJog('azimuth', -stepSize)}
                  className="w-36 sm:w-44 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-sky-500/40 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-sky-300" />
                  <span>XOAY TRÁI -{stepSize}°</span>
                </button>

                <button
                  type="button"
                  onClick={() => onJog('azimuth', stepSize)}
                  className="w-36 sm:w-44 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-sky-500/40 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>XOAY PHẢI +{stepSize}°</span>
                  <ArrowRight className="w-4 h-4 text-sky-300" />
                </button>
              </div>

              {/* Elevation DOWN */}
              <button
                type="button"
                onClick={() => onJog('elevation', -stepSize)}
                className="w-36 sm:w-44 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-sky-500/40 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowDown className="w-4 h-4 text-sky-300" />
                <span>HẠ XUỐNG -{stepSize}°</span>
              </button>
            </div>
          </div>

          {/* 3. LỆNH NHANH THUẬT TOÁN (Quick Commands) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onTriggerPso}
              className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Chạy Tối Ưu PSO</span>
            </button>

            <button
              type="button"
              onClick={onCalibrate}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/80" />
              <span>Hiệu Chuẩn Cảm Biến</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-black/40 border-t border-white/10 flex justify-end safe-area-bottom">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Đóng Bảng Điều Khiển
          </button>
        </div>

      </div>
    </div>
  );
}
