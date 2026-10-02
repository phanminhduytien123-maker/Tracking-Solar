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
  Compass
} from 'lucide-react';

export default function ManualControlModal({ 
  isOpen, 
  onClose, 
  mode, 
  onSetMode, 
  onJog, 
  onCalibrate, 
  onTriggerPso, 
  onPark, 
  onEstop,
  motors 
}) {
  const [stepSize, setStepSize] = useState(1.0); // 0.5, 1.0, 5.0, 10.0 deg

  if (!isOpen) return null;

  const az = motors?.azimuth || { currentAngle: 0, targetAngle: 0 };
  const el = motors?.elevation || { currentAngle: 0, targetAngle: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      
      {/* Modal Dialog Card */}
      <div className="panel-card w-full max-w-2xl overflow-hidden shadow-2xl border-[#2a2f3e] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-zinc-300" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Bảng Điều Khiển Thủ Công & Cấu Hình Chế Độ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1e222d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* 1. CHỌN CHẾ ĐỘ VẬN HÀNH (OPERATING MODE SWITCHER) */}
          <div>
            <label className="text-xs uppercase text-zinc-400 block mb-2 font-bold tracking-wide">
              Chế độ vận hành hệ thống (Operating Mode)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Mode Auto */}
              <button
                onClick={() => onSetMode('AUTO')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  mode === 'AUTO'
                    ? 'bg-zinc-200 text-zinc-950 border-zinc-100 shadow-md font-black'
                    : 'bg-[#13151b] hover:bg-[#1a1c24] text-zinc-300 border-[#222633]'
                }`}
              >
                <div className="block font-bold text-sm">TỰ ĐỘNG</div>
                <div className="text-xs opacity-80 mt-0.5 font-medium">Fuzzy-PID + PSO</div>
              </button>

              {/* Mode Manual */}
              <button
                onClick={() => onSetMode('MANUAL')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  mode === 'MANUAL'
                    ? 'bg-zinc-200 text-zinc-950 border-zinc-100 shadow-md font-black'
                    : 'bg-[#13151b] hover:bg-[#1a1c24] text-zinc-300 border-[#222633]'
                }`}
              >
                <div className="block font-bold text-sm">THỦ CÔNG</div>
                <div className="text-xs opacity-80 mt-0.5 font-medium">Jog Buttons</div>
              </button>

              {/* Mode Park */}
              <button
                onClick={() => {
                  onSetMode('PARK');
                  onPark();
                }}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  mode === 'PARK'
                    ? 'bg-zinc-200 text-zinc-950 border-zinc-100 shadow-md font-black'
                    : 'bg-[#13151b] hover:bg-[#1a1c24] text-zinc-300 border-[#222633]'
                }`}
              >
                <div className="block font-bold text-sm">PARK (BAN ĐÊM)</div>
                <div className="text-xs opacity-80 mt-0.5 font-medium">Về vị trí an toàn</div>
              </button>

              {/* Mode Calibration */}
              <button
                onClick={() => onSetMode('CALIBRATION')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  mode === 'CALIBRATION'
                    ? 'bg-zinc-200 text-zinc-950 border-zinc-100 shadow-md font-black'
                    : 'bg-[#13151b] hover:bg-[#1a1c24] text-zinc-300 border-[#222633]'
                }`}
              >
                <div className="block font-bold text-sm">CÂN CHỈNH</div>
                <div className="text-xs opacity-80 mt-0.5 font-medium">Calibrate Home</div>
              </button>
            </div>
          </div>

          {/* 2. BỘ ĐIỀU KHIỂN JOG 2 TRỤC */}
          <div className="panel-subtle p-4 sm:p-5 border-[#252a38]">
            
            {/* Step Size Selector */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#1c1f28]">
              <span className="text-xs uppercase text-zinc-300 font-bold">
                Bước xoay mỗi lần nhấn (Step Size):
              </span>
              <div className="flex items-center gap-2">
                {[0.5, 1.0, 5.0, 10.0].map(val => (
                  <button
                    key={val}
                    onClick={() => setStepSize(val)}
                    className={`px-3 py-1 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                      stepSize === val
                        ? 'bg-zinc-200 text-zinc-950 font-black border-zinc-100 shadow-sm'
                        : 'bg-[#14161d] text-zinc-400 hover:text-zinc-200 border-[#222632]'
                    }`}
                  >
                    {val}°
                  </button>
                ))}
              </div>
            </div>

            {/* D-Pad Jog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* Visual Joystick Direction Pad */}
              <div className="flex flex-col items-center justify-center">
                <div className="grid grid-cols-3 gap-2.5 w-52 h-52">
                  
                  {/* Row 1 */}
                  <div></div>
                  <button
                    onClick={() => onJog('EL', stepSize)}
                    className="panel-card flex flex-col items-center justify-center p-2 hover:bg-[#202430] active:scale-95 transition-all text-zinc-200 border-[#2d3344] cursor-pointer shadow-sm"
                    title="Nâng góc Elevation"
                  >
                    <ArrowUp className="w-6 h-6" />
                    <span className="text-xs font-bold mt-1">+EL</span>
                  </button>
                  <div></div>

                  {/* Row 2 */}
                  <button
                    onClick={() => onJog('AZ', -stepSize)}
                    className="panel-card flex flex-col items-center justify-center p-2 hover:bg-[#202430] active:scale-95 transition-all text-zinc-200 border-[#2d3344] cursor-pointer shadow-sm"
                    title="Xoay Trái Azimuth"
                  >
                    <ArrowLeft className="w-6 h-6" />
                    <span className="text-xs font-bold mt-1">-AZ</span>
                  </button>
                  <div className="flex items-center justify-center text-zinc-400 font-mono font-bold text-sm">
                    {stepSize}°
                  </div>
                  <button
                    onClick={() => onJog('AZ', stepSize)}
                    className="panel-card flex flex-col items-center justify-center p-2 hover:bg-[#202430] active:scale-95 transition-all text-zinc-200 border-[#2d3344] cursor-pointer shadow-sm"
                    title="Xoay Phải Azimuth"
                  >
                    <ArrowRight className="w-6 h-6" />
                    <span className="text-xs font-bold mt-1">+AZ</span>
                  </button>

                  {/* Row 3 */}
                  <div></div>
                  <button
                    onClick={() => onJog('EL', -stepSize)}
                    className="panel-card flex flex-col items-center justify-center p-2 hover:bg-[#202430] active:scale-95 transition-all text-zinc-200 border-[#2d3344] cursor-pointer shadow-sm"
                    title="Hạ góc Elevation"
                  >
                    <ArrowDown className="w-6 h-6" />
                    <span className="text-xs font-bold mt-1">-EL</span>
                  </button>
                  <div></div>
                </div>
              </div>

              {/* Current Angle Readout */}
              <div className="flex flex-col gap-3 text-sm">
                <div className="panel-subtle p-3.5">
                  <span className="text-zinc-400 block text-xs uppercase font-medium">Vị trí Azimuth hiện tại:</span>
                  <span className="text-xl font-bold font-mono text-white block mt-1">{az.currentAngle.toFixed(1)}°</span>
                  <span className="text-zinc-500 text-xs mt-0.5 block">Giới hạn phần cứng: 0° - 360°</span>
                </div>
                <div className="panel-subtle p-3.5">
                  <span className="text-zinc-400 block text-xs uppercase font-medium">Vị trí Elevation hiện tại:</span>
                  <span className="text-xl font-bold font-mono text-white block mt-1">{el.currentAngle.toFixed(1)}°</span>
                  <span className="text-zinc-500 text-xs mt-0.5 block">Giới hạn phần cứng: 0° - 90°</span>
                </div>
              </div>

            </div>
          </div>

          {/* 3. CÁC LỆNH CÂN CHỈNH & TỐI ƯU HÓA NHANH */}
          <div>
            <label className="text-xs uppercase text-zinc-400 block mb-2 font-bold tracking-wide">
              Lệnh điều khiển nâng cao & Thuật toán
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Home / Calibrate */}
              <button
                onClick={onCalibrate}
                className="flex items-center justify-center gap-2 p-3 rounded-lg text-xs sm:text-sm font-bold bg-[#14161e] hover:bg-[#1d202b] text-zinc-200 border border-[#252a38] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Home className="w-4 h-4 text-zinc-400" />
                <span>Zero Encoder (Home)</span>
              </button>

              {/* Re-trigger PSO */}
              <button
                onClick={onTriggerPso}
                className="flex items-center justify-center gap-2 p-3 rounded-lg text-xs sm:text-sm font-bold bg-[#14161e] hover:bg-[#1d202b] text-zinc-200 border border-[#252a38] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <span>Kích hoạt PSO Search</span>
              </button>

              {/* Park Mode */}
              <button
                onClick={onPark}
                className="flex items-center justify-center gap-2 p-3 rounded-lg text-xs sm:text-sm font-bold bg-[#14161e] hover:bg-[#1d202b] text-zinc-200 border border-[#252a38] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Compass className="w-4 h-4 text-zinc-400" />
                <span>Stow / Vị trí an toàn</span>
              </button>

            </div>
          </div>

          {/* 4. EMERGENCY STOP (E-STOP) */}
          <div className="pt-2 border-t border-[#1c1f28] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              <span className="text-red-400 font-bold block uppercase">Khẩn cấp (Safety Override):</span>
              <span>Dừng mọi xung phát động cơ bước ngay lập tức.</span>
            </div>
            <button
              onClick={onEstop}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700 text-xs sm:text-sm font-bold text-red-100 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>E-STOP DỪNG KHẨN CẤP</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0d0e12] border-t border-[#191b22] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-md text-sm bg-zinc-200 hover:bg-white text-zinc-950 font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Đóng
          </button>
        </div>

      </div>

    </div>
  );
}
