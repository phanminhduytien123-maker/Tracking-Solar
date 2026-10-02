import React, { useState } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight
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
  const [stepSize, setStepSize] = useState(5.0); // 1.0, 5.0, 10.0 deg

  if (!isOpen) return null;

  const az = motors?.azimuth || { currentAngle: 0, targetAngle: 0 };
  const el = motors?.elevation || { currentAngle: 0, targetAngle: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xl modal-sheet-container">
      
      {/* Modal Dialog Card */}
      <div className="panel-card w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col modal-sheet-card border-white/20">
        
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 sm:px-6 border-b border-white/10 bg-white/10 backdrop-blur-md">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
              BẢNG ĐIỀU KHIỂN ESP32-S3
            </h2>
            <span className="text-xs text-zinc-300 font-medium">Trung tâm điều khiển chế độ & động cơ 2 trục</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm max-h-[75vh] sm:max-h-[70vh]">
          
          {/* 1. CHỌN CHẾ ĐỘ VẬN HÀNH */}
          <div>
            <label className="text-xs uppercase text-zinc-300 block mb-2.5 font-bold tracking-wider">
              1. Chế độ vận hành hệ thống
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Mode Auto */}
              <button
                type="button"
                onClick={() => onSetMode('AUTO')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'AUTO'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-md'
                    : 'bg-[#12151f] hover:bg-zinc-800/60 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="font-bold text-sm text-white">TỰ ĐỘNG</div>
                <div className="text-xs text-zinc-400 mt-1">Fuzzy-PID & PSO</div>
              </button>

              {/* Mode Manual */}
              <button
                type="button"
                onClick={() => onSetMode('MANUAL')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'MANUAL'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-md'
                    : 'bg-[#12151f] hover:bg-zinc-800/60 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="font-bold text-sm text-white">THỦ CÔNG</div>
                <div className="text-xs text-zinc-400 mt-1">Jog Động cơ</div>
              </button>

              {/* Mode Park */}
              <button
                type="button"
                onClick={() => {
                  onSetMode('PARK');
                  onPark();
                }}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'PARK'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-md'
                    : 'bg-[#12151f] hover:bg-zinc-800/60 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="font-bold text-sm text-white">VỊ TRÍ NGHỈ</div>
                <div className="text-xs text-zinc-400 mt-1">Park (Bão / Đêm)</div>
              </button>

              {/* E-STOP BUTTON */}
              <button
                type="button"
                onClick={onEstop}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  system?.estop
                    ? 'bg-red-700 text-white border-red-500 font-bold shadow-lg animate-pulse'
                    : 'bg-red-950/40 hover:bg-red-950/70 text-red-200 border-red-800/60'
                }`}
              >
                <div className="font-bold text-sm text-red-200">DỪNG KHẨN</div>
                <div className="text-xs text-red-300/80 mt-1">E-STOP Motor</div>
              </button>
            </div>
          </div>

          {/* 2. BẢNG JOG ĐIỀU KHIỂN GÓC XOAY (DUAL-AXIS D-PAD) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#131722] border border-zinc-700/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold uppercase text-zinc-200 tracking-wider">
                2. Điều chỉnh góc quay (Jog Azimuth & Elevation)
              </span>
              
              {/* Step Size selector */}
              <div className="flex items-center gap-1.5 bg-[#0a0c12] p-1 rounded-lg border border-zinc-700">
                <span className="text-xs text-zinc-400 px-1 font-medium">Bước:</span>
                {[1.0, 5.0, 10.0].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setStepSize(step)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      stepSize === step
                        ? 'bg-white text-zinc-950 font-bold'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {step}°
                  </button>
                ))}
              </div>
            </div>

            {/* Current Angles Display */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-800">
                <span className="text-xs text-zinc-400 block font-semibold">AZIMUTH (Trục Ngang)</span>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5 block">{az.currentAngle.toFixed(1)}°</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-800">
                <span className="text-xs text-zinc-400 block font-semibold">ELEVATION (Trục Đứng)</span>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5 block">{el.currentAngle.toFixed(1)}°</span>
              </div>
            </div>

            {/* Dual-Axis D-Pad Controller */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-2.5">
              
              {/* Elevation UP */}
              <button
                type="button"
                onClick={() => onJog('elevation', stepSize)}
                className="w-40 sm:w-48 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowUp className="w-4 h-4 text-zinc-300" />
                <span>NÂNG +{stepSize}°</span>
              </button>

              {/* Azimuth LEFT & RIGHT */}
              <div className="flex items-center gap-2.5 w-full justify-center">
                <button
                  type="button"
                  onClick={() => onJog('azimuth', -stepSize)}
                  className="w-40 sm:w-48 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-300" />
                  <span>TRÁI -{stepSize}°</span>
                </button>

                <button
                  type="button"
                  onClick={() => onJog('azimuth', stepSize)}
                  className="w-40 sm:w-48 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>PHẢI +{stepSize}°</span>
                  <ArrowRight className="w-4 h-4 text-zinc-300" />
                </button>
              </div>

              {/* Elevation DOWN */}
              <button
                type="button"
                onClick={() => onJog('elevation', -stepSize)}
                className="w-40 sm:w-48 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowDown className="w-4 h-4 text-zinc-300" />
                <span>HẠ -{stepSize}°</span>
              </button>
            </div>
          </div>

          {/* 3. LỆNH NHANH THUẬT TOÁN */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onTriggerPso}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Chạy Tối Ưu PSO</span>
            </button>

            <button
              type="button"
              onClick={onCalibrate}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Hiệu Chuẩn Cảm Biến</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 bg-[#121620] border-t border-zinc-800 flex justify-end safe-area-bottom">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Đóng Bảng Điều Khiển
          </button>
        </div>

      </div>
    </div>
  );
}

