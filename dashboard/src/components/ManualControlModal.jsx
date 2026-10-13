import React, { useState } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  RotateCcw,
  Compass,
  AlertTriangle,
  Play,
  Sliders,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export default function ManualControlModal({ 
  isOpen, 
  onClose, 
  mode = 'AUTO', 
  activeAlgorithm = 'PSO_FUZZY_PID',
  system = {},
  onSetMode, 
  onSetAlgorithm,
  onJog, 
  onCalibrate, 
  onTriggerPso, 
  onPark, 
  onEstop,
  onReHome,
  onResetFault,
  onTestDir,
  motors,
  isExperimentLocked = false
}) {
  const [stepSize, setStepSize] = useState(5.0); // 1.0, 5.0, 10.0 deg

  if (!isOpen) return null;

  const az = motors?.azimuth || { currentAngle: 180, targetAngle: 180, phi: 0, limitHome: false, softLimitViolated: false };
  const el = motors?.elevation || { currentAngle: 90, targetAngle: 90, epsilon: 90, limitSwitch90: false, softLimitViolated: false };

  const phiVal = az.phi !== undefined ? az.phi : (az.currentAngle - 180);
  const epsVal = el.epsilon !== undefined ? el.epsilon : el.currentAngle;

  const isManual = mode === 'MANUAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl modal-sheet-container">
      
      {/* Modal Dialog Card */}
      <div className="panel-card w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col modal-sheet-card border-white/20">
        
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 sm:px-6 border-b border-white/10 bg-white/10 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
                BẢNG ĐIỀU KHIỂN HỆ THỐNG
              </h2>
              {isExperimentLocked && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  KHÓA THÍ NGHIỆM
                </span>
              )}
            </div>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase text-zinc-300 font-bold tracking-wider">
                1. Chế độ vận hành
              </label>
              {isExperimentLocked && (
                <span className="text-[11px] text-amber-400 font-medium">
                  Đang trong giai đoạn đo thí nghiệm
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Mode Auto */}
              <button
                type="button"
                onClick={() => onSetMode && onSetMode('AUTO')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'AUTO'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-md'
                    : 'bg-[#12151f] hover:bg-zinc-800/60 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="font-bold text-sm text-white">TỰ ĐỘNG</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Theo ánh sáng & quỹ đạo</div>
              </button>

              {/* Mode Manual */}
              <button
                type="button"
                onClick={() => onSetMode && onSetMode('MANUAL')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'MANUAL'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-md'
                    : 'bg-[#12151f] hover:bg-zinc-800/60 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="font-bold text-sm text-white">THỦ CÔNG</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Cho phép Jog trục</div>
              </button>

              {/* Mode Park */}
              <button
                type="button"
                onClick={() => {
                  onSetMode && onSetMode('PARK');
                  onPark && onPark();
                }}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  mode === 'PARK'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-md'
                    : 'bg-[#12151f] hover:bg-zinc-800/60 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="font-bold text-sm text-white">VỊ TRÍ NGHỈ</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Park (φ=0°, ε=90°)</div>
              </button>

              {/* DỪNG / HỦY LỆNH (SOFTWARE STOP) */}
              <button
                type="button"
                onClick={onEstop}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                  system?.estop
                    ? 'bg-red-700 text-white border-red-500 font-bold shadow-lg animate-pulse'
                    : 'bg-red-950/40 hover:bg-red-950/70 text-red-200 border-red-800/60'
                }`}
                title="Dừng lệnh phần mềm, không thay thế nút dừng cơ LA38 cắt nguồn 24V"
              >
                <div className="font-bold text-sm text-red-200">DỪNG / HỦY</div>
                <div className="text-[10px] text-red-300/80 mt-0.5 leading-tight">Software Stop</div>
              </button>
            </div>
          </div>

          {/* 2. CHỌN THUẬT TOÁN ĐIỀU KHIỂN (PID / FUZZY_PID / PSO_FUZZY_PID) */}
          <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase text-zinc-300 font-bold tracking-wider">
                2. Lựa chọn thuật toán điều hướng (Chạy đối chứng trên cùng giàn)
              </label>
              <span className="text-[11px] font-mono text-zinc-400">Baseline so sánh</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSetAlgorithm && onSetAlgorithm('PID')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer active:scale-95 ${
                  activeAlgorithm === 'PID'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-sm'
                    : 'bg-[#0a0c12] text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <div className="font-bold text-xs">PID</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Baseline cơ bản</div>
              </button>

              <button
                type="button"
                onClick={() => onSetAlgorithm && onSetAlgorithm('FUZZY_PID')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer active:scale-95 ${
                  activeAlgorithm === 'FUZZY_PID'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-sm'
                    : 'bg-[#0a0c12] text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <div className="font-bold text-xs">FUZZY-PID</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Chỉnh định tức thời</div>
              </button>

              <button
                type="button"
                onClick={() => onSetAlgorithm && onSetAlgorithm('PSO_FUZZY_PID')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer active:scale-95 ${
                  activeAlgorithm === 'PSO_FUZZY_PID'
                    ? 'bg-zinc-800 text-white border-white font-bold shadow-sm'
                    : 'bg-[#0a0c12] text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <div className="font-bold text-xs">PSO + FUZZY-PID</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Đề xuất tối ưu</div>
              </button>
            </div>
          </div>

          {/* 3. BẢNG JOG ĐIỀU KHIỂN GÓC XOAY (CHỈ CHO PHÉP Ở CHẾ ĐỘ THỦ CÔNG) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#131722] border border-zinc-700/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <span className="text-xs font-bold uppercase text-zinc-200 tracking-wider block">
                  3. Điều chỉnh góc quay (Jog)
                </span>
                {!isManual && (
                  <span className="text-[11px] text-amber-400 font-sans mt-0.5 block">
                    * Jog chỉ khả dụng ở chế độ THỦ CÔNG (bị khóa ở Tự động / Park)
                  </span>
                )}
              </div>
              
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
                <span className="text-xs text-zinc-400 block font-semibold">AZIMUTH (Trục Ngang φ)</span>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5 block">
                  {(180 + phiVal).toFixed(1)}°
                </span>
                <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                  (φ: {phiVal >= 0 ? `+${phiVal.toFixed(1)}` : phiVal.toFixed(1)}° | GH: ±120°)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-800">
                <span className="text-xs text-zinc-400 block font-semibold">ELEVATION (Độ Ngửa ε)</span>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5 block">
                  {epsVal.toFixed(1)}°
                </span>
                <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                  (ε: {epsVal.toFixed(1)}° | GH: [25°, 90°])
                </span>
              </div>
            </div>

            {/* Dual-Axis D-Pad Controller */}
            <div className={`flex flex-col items-center justify-center pt-2 pb-1 gap-2.5 transition-opacity ${!isManual ? 'opacity-40 pointer-events-none' : ''}`}>
              
              {/* Elevation UP (NÂNG: ε tăng) */}
              <button
                type="button"
                disabled={!isManual || epsVal >= 90}
                onClick={() => onJog && onJog('elevation', stepSize)}
                className="w-48 sm:w-56 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-900 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Nâng tấm pin (ε tăng, gần 90° chạm công tắc)"
              >
                <ArrowUp className="w-4 h-4 text-zinc-300" />
                <span>NÂNG (ε ↑ +{stepSize}°)</span>
              </button>

              {/* Azimuth LEFT & RIGHT */}
              <div className="flex items-center gap-2.5 w-full justify-center">
                <button
                  type="button"
                  disabled={!isManual || phiVal <= -120}
                  onClick={() => onJog && onJog('azimuth', -stepSize)}
                  className="w-44 sm:w-52 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-900 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Quay trái (φ giảm)"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-300" />
                  <span>TRÁI (φ ↓ -{stepSize}°)</span>
                </button>

                <button
                  type="button"
                  disabled={!isManual || phiVal >= 120}
                  onClick={() => onJog && onJog('azimuth', stepSize)}
                  className="w-44 sm:w-52 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-900 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Quay phải (φ tăng)"
                >
                  <span>PHẢI (φ ↑ +{stepSize}°)</span>
                  <ArrowRight className="w-4 h-4 text-zinc-300" />
                </button>
              </div>

              {/* Elevation DOWN (HẠ: ε giảm) */}
              <button
                type="button"
                disabled={!isManual || epsVal <= 25}
                onClick={() => onJog && onJog('elevation', -stepSize)}
                className="w-48 sm:w-56 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-900 border border-zinc-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Hạ tấm pin (ε giảm, chặn ở giới hạn mềm 25°)"
              >
                <ArrowDown className="w-4 h-4 text-zinc-300" />
                <span>HẠ (ε ↓ -{stepSize}°)</span>
              </button>
            </div>
          </div>

          {/* 4. CÁC NÚT ĐIỀU KHIỂN BẢO VỆ & THỬ NGHIỆM */}
          <div>
            <label className="text-xs uppercase text-zinc-300 block mb-2 font-bold tracking-wider">
              4. Các tác vụ định vị & Xác nhận phần cứng
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={onReHome}
                className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Đưa về vị trí công tắc hành trình để cân chỉnh lại gốc tọa độ (0°, 90°)"
              >
                <RotateCcw className="w-4 h-4 text-zinc-300" />
                <span>Home lại hệ thống</span>
              </button>

              <button
                type="button"
                onClick={onResetFault}
                className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Xóa cờ lỗi driver và giới hạn phần mềm"
              >
                <ShieldAlert className="w-4 h-4 text-zinc-300" />
                <span>Reset FAULT</span>
              </button>

              <button
                type="button"
                onClick={() => onTestDir && onTestDir('azimuth', 1)}
                className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Quay chậm với dòng thấp để kiểm tra cực tính động cơ trước lần homing đầu"
              >
                <Play className="w-4 h-4 text-zinc-300" />
                <span>Test DIR (Quay chậm)</span>
              </button>
            </div>
          </div>

          {/* 5. THUẬT TOÁN PSO & HIỆU CHUẨN CẢM BIẾN */}
          <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-2.5">
            <span className="text-xs uppercase text-zinc-300 font-bold tracking-wider block">
              5. Tối ưu hóa mô hình & Hiệu chuẩn
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <button
                  type="button"
                  onClick={onTriggerPso}
                  className="w-full p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Chạy Tối Ưu PSO</span>
                </button>
                <span className="text-[10px] text-zinc-400 block mt-1 text-center">
                  * Chỉ chạy tối ưu trên RAM mô hình, KHÔNG làm quay động cơ
                </span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onCalibrate && onCalibrate('noon')}
                  className="w-full p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Hiệu Chuẩn Cảm Biến</span>
                </button>
                <span className="text-[10px] text-zinc-400 block mt-1 text-center">
                  * Cân bằng quang sai H nắng trưa & gain V phân áp
                </span>
              </div>
            </div>
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
