import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Moon, Sun, RefreshCw, HelpCircle } from 'lucide-react';
import { formatSignedNumber, formatValueOrDash, formatDecimal } from '../utils/formatters';

function HelpTip({ text }) {
  return (
    <span className="relative group inline-flex items-center ml-1 text-zinc-400 hover:text-zinc-600 cursor-help" title={text}>
      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 w-60 sm:w-64 p-2 bg-zinc-900 text-white text-[11px] font-normal leading-relaxed rounded-xs shadow-lg text-left">
        {text}
        <span className="absolute top-full left-3 -mt-1 border-4 border-transparent border-t-zinc-900" />
      </span>
    </span>
  );
}

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
  onTestSleep,
  onTestWake,
  onResumeReal,
  onSetSleepDisabled,
  onSetLampAutoDisabled,
  onSetLampManualState,
  onSetEsp2AutoCutoff,
  motors,
  isExperimentLocked = false
}) {
  const [stepSize, setStepSize] = useState(5.0); // 1.0, 5.0, 10.0 deg

  if (!isOpen) return null;

  const isMockData = system.isMock || system.source === 'mock';

  const az = motors?.azimuth || { currentAngle: null, phi: null, limitHome: false, softLimitViolated: false };
  const el = motors?.elevation || { currentAngle: null, epsilon: null, limitSwitch90: false, softLimitViolated: false };

  const phiVal = az.phi !== undefined && az.phi !== null ? az.phi : az.currentAngle;
  const epsVal = el.epsilon !== undefined && el.epsilon !== null ? el.epsilon : el.currentAngle;

  const azSoftLimitStr = (az.soft_min !== null && az.soft_max !== null) 
    ? `[${formatDecimal(az.soft_min, 1)}°, ${formatDecimal(az.soft_max, 1)}°]` 
    : 'Chưa đo';
  const elSoftLimitStr = (el.soft_min !== null && el.soft_max !== null) 
    ? `[${formatDecimal(el.soft_min, 1)}°, ${formatDecimal(el.soft_max, 1)}°]` 
    : 'Chưa đo';

  const isManual = mode === 'MANUAL';
  const isSleeping = Boolean(system?.isSleeping || system?.isTestSleep || mode === 'SLEEP' || system?.state === 'DEEP_SLEEP');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-zinc-300 rounded-sm w-full max-w-2xl max-h-[92vh] flex flex-col shadow-sm">
        
        {/* Banner cảnh báo Khóa Dừng khẩn cấp / Phủ bạt */}
        {system?.emergencyActive && (
          <div className="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-4 text-center shrink-0 border-b border-amber-600">
            ⚠️ HỆ THỐNG ĐANG KHÓA AN TOÀN (DỪNG KHẨN CẤP / PHỦ BẠT)
            <div className="font-normal text-[11px] mt-0.5 text-slate-900">
              Mọi lệnh di chuyển sẽ bị chặn cho đến khi mở khóa. Hãy nhấn nút màu cam <b>[MỞ KHÓA HOẠT ĐỘNG]</b> trên thanh tiêu đề!
            </div>
          </div>
        )}

        {/* Banner dữ liệu giả lập nếu có */}
        {isMockData && (
          <div className="bg-red-700 text-white text-xs font-semibold py-1.5 px-4 text-center shrink-0">
            Dữ liệu giả lập, không phải số đo thật từ firmware
          </div>
        )}

        {/* Tiêu đề Modal */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-950">
                Bảng điều khiển hệ thống
              </h2>
              {isExperimentLocked && (
                <span className="px-2 py-0.5 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-sm">
                  Đang khóa thí nghiệm
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Chọn chế độ vận hành, giải thuật và điều khiển dịch chuyển góc quay (Jog)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 border border-zinc-300 rounded-sm cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thân Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          
          {/* 1. CHỌN CHẾ ĐỘ VẬN HÀNH */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-800">
                1. Chế độ vận hành
              </label>
              {isExperimentLocked && (
                <span className="text-xs text-amber-700">
                  Đang trong giai đoạn đo 30 ngày (Khóa Jog để bảo toàn số liệu)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Tự động */}
              <button
                type="button"
                onClick={() => onSetMode && onSetMode('AUTO')}
                className={`p-2.5 text-left border rounded-sm transition-colors cursor-pointer ${
                  mode === 'AUTO'
                    ? 'border-blue-700 bg-blue-50/60 text-blue-900 font-semibold'
                    : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <div className="font-bold">Tự động</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Theo quang sai & quỹ đạo</div>
              </button>

              {/* Thủ công */}
              <button
                type="button"
                onClick={() => onSetMode && onSetMode('MANUAL')}
                className={`p-2.5 text-left border rounded-sm transition-colors cursor-pointer ${
                  mode === 'MANUAL'
                    ? 'border-blue-700 bg-blue-50/60 text-blue-900 font-semibold'
                    : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <div className="font-bold">Thủ công</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Cho phép Jog góc</div>
              </button>

              {/* Vị trí nghỉ (Park) */}
              <button
                type="button"
                onClick={() => {
                  onSetMode && onSetMode('PARK');
                  onPark && onPark();
                }}
                className={`p-2.5 text-left border rounded-sm transition-colors cursor-pointer ${
                  mode === 'PARK'
                    ? 'border-blue-700 bg-blue-50/60 text-blue-900 font-semibold'
                    : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <div className="font-bold">Vị trí nghỉ</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Park (φ=0°, ε=90°)</div>
              </button>

              {/* Dừng phần mềm */}
              <button
                type="button"
                onClick={onEstop}
                className={`p-2.5 text-left border rounded-sm transition-colors cursor-pointer ${
                  system?.estop
                    ? 'border-red-700 bg-red-100 text-red-900 font-bold'
                    : 'border-red-300 bg-red-50/50 hover:bg-red-50 text-red-800'
                }`}
                title="Dừng lệnh phần mềm (Software Stop)"
              >
                <div className="font-bold">Dừng phần mềm</div>
                <div className="text-[11px] text-red-600 mt-0.5">Hủy lệnh tức thời</div>
              </button>
            </div>
          </div>

          {/* 2. CHỌN THUẬT TOÁN ĐIỀU HƯỚNG */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800">
                2. Lựa chọn thuật toán điều hướng (Chạy đối chứng trên cùng giàn)
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSetAlgorithm && onSetAlgorithm('PID')}
                className={`p-2 border rounded-sm text-left transition-colors cursor-pointer ${
                  activeAlgorithm === 'PID'
                    ? 'border-blue-700 bg-white font-semibold text-blue-900 shadow-xs'
                    : 'border-zinc-200 bg-zinc-50 hover:bg-white text-zinc-700'
                }`}
              >
                <div className="font-bold text-xs">PID</div>
                <div className="text-[11px] text-zinc-500">Bộ điều khiển cơ bản</div>
              </button>

              <button
                type="button"
                onClick={() => onSetAlgorithm && onSetAlgorithm('FUZZY_PID')}
                className={`p-2 border rounded-sm text-left transition-colors cursor-pointer ${
                  activeAlgorithm === 'FUZZY_PID'
                    ? 'border-blue-700 bg-white font-semibold text-blue-900 shadow-xs'
                    : 'border-zinc-200 bg-zinc-50 hover:bg-white text-zinc-700'
                }`}
              >
                <div className="font-bold text-xs">Fuzzy-PID</div>
                <div className="text-[11px] text-zinc-500">Chỉnh định mờ Kp, Ki, Kd</div>
              </button>

              <button
                type="button"
                onClick={() => onSetAlgorithm && onSetAlgorithm('PSO_FUZZY_PID')}
                className={`p-2 border rounded-sm text-left transition-colors cursor-pointer ${
                  activeAlgorithm === 'PSO_FUZZY_PID'
                    ? 'border-blue-700 bg-white font-semibold text-blue-900 shadow-xs'
                    : 'border-zinc-200 bg-zinc-50 hover:bg-white text-zinc-700'
                }`}
              >
                <div className="font-bold text-xs text-blue-700">PSO + Fuzzy-PID</div>
                <div className="text-[11px] text-zinc-500">Tối ưu hóa bầy đàn</div>
              </button>
            </div>
          </div>

          {/* 3. ĐIỀU CHỈNH GÓC QUAY (JOG) */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
              <div>
                <span className="text-xs font-bold text-zinc-800 block">
                  3. Điều chỉnh góc quay (Jog)
                </span>
                {!isManual && (
                  <span className="text-[11px] text-amber-700 block">
                    (Jog chỉ khả dụng khi đang ở chế độ Thủ công)
                  </span>
                )}
              </div>

              {/* Bộ chọn bước góc */}
              <div className="flex items-center gap-1 border border-zinc-300 rounded-sm p-0.5 bg-white text-xs">
                <span className="text-zinc-500 px-1">Bước:</span>
                {[1.0, 5.0, 10.0].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setStepSize(step)}
                    className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                      stepSize === step
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {formatDecimal(step, 0)}°
                  </button>
                ))}
              </div>
            </div>

            {/* Bảng góc hiện tại */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white border border-zinc-200 rounded-sm">
                <span className="text-zinc-500 block">Động cơ 1: Góc quay φ (Azimuth)</span>
                <span className="text-base sm:text-lg font-bold text-zinc-900 block mt-0.5">
                  {phiVal !== null ? formatSignedNumber(phiVal, 1, '°') : '--'}
                </span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">
                  Giới hạn mềm: {azSoftLimitStr}
                </span>
              </div>
              <div className="p-2.5 bg-white border border-zinc-200 rounded-sm">
                <span className="text-zinc-500 block">Động cơ 2: Độ ngửa ε (Elevation)</span>
                <span className="text-base sm:text-lg font-bold text-zinc-900 block mt-0.5">
                  {epsVal !== null ? formatValueOrDash(epsVal, 1, '°') : '--'}
                </span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">
                  Giới hạn mềm: {elSoftLimitStr}
                </span>
              </div>
            </div>

            {/* Bàn phím Jog 4 hướng */}
            <div className={`flex flex-col items-center justify-center pt-2 gap-2 ${!isManual ? 'opacity-40 pointer-events-none' : ''}`}>
              {/* Ngửa lên */}
              <button
                type="button"
                disabled={!isManual}
                onClick={() => onJog && onJog('elevation', stepSize)}
                className="w-48 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                title="Ngửa tấm pin lên (ε tăng)"
              >
                <ArrowUp className="w-3.5 h-3.5 text-zinc-600" />
                <span>Ngửa +{formatDecimal(stepSize, 0)}° (ε tăng)</span>
              </button>

              {/* Trái / Phải */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!isManual}
                  onClick={() => onJog && onJog('azimuth', -stepSize)}
                  className="w-44 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Quay sang trái (φ giảm)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Trái −{formatDecimal(stepSize, 0)}° (φ giảm)</span>
                </button>

                <button
                  type="button"
                  disabled={!isManual}
                  onClick={() => onJog && onJog('azimuth', stepSize)}
                  className="w-44 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Quay sang phải (φ tăng)"
                >
                  <span>Phải +{formatDecimal(stepSize, 0)}° (φ tăng)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                </button>
              </div>

              {/* Cúi xuống */}
              <button
                type="button"
                disabled={!isManual}
                onClick={() => onJog && onJog('elevation', -stepSize)}
                className="w-48 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                title="Cúi tấm pin xuống (ε giảm)"
              >
                <ArrowDown className="w-3.5 h-3.5 text-zinc-600" />
                <span>Cúi −{formatDecimal(stepSize, 0)}° (ε giảm)</span>
              </button>
            </div>
          </div>

          {/* 4. TÁC VỤ BẢO VỆ & XÁC NHẬN */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-800 block">
              4. Tác vụ định vị & Xác nhận phần cứng
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onReHome}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-600" />
                <span>Home lại hệ thống</span>
              </button>

              <button
                type="button"
                onClick={onResetFault}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm cursor-pointer"
              >
                <span>Reset cờ FAULT</span>
              </button>

              <button
                type="button"
                onClick={() => onTestDir && onTestDir('azimuth', 1)}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm cursor-pointer"
              >
                <span>Test DIR (Quay chậm)</span>
              </button>
            </div>
          </div>

          {/* 5. THỬ NGHIỆM CHU TRÌNH NGỦ ĐÔNG & THỨC DẬY */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                <span>5. Thử nghiệm chu trình Ngủ đông & Thức dậy</span>
                <HelpTip text="Luôn tự động Home 2 trục trước khi thực hiện các tác vụ thử nghiệm chu trình ngủ và thức dậy." />
              </label>
            </div>

            {isSleeping && (
              <div className="text-[11px] text-zinc-700 bg-zinc-100 border border-zinc-300 px-2.5 py-1.5 rounded-xs font-medium flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span>Hệ thống đang ở trạng thái ngủ đông. Nút <b>[Test Wake Up]</b> đã sẵn sàng để thử nghiệm thức dậy!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Nút 1: Test Ngủ */}
              <button
                type="button"
                onClick={onTestSleep}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Home 2 trục ➔ Đưa giàn pin vào thế ngủ an toàn ngay lập tức (không ảnh hưởng giờ RTC)"
              >
                <Moon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span>1. Test Ngủ</span>
              </button>

              {/* Nút 2: Test Wake Up */}
              <button
                type="button"
                disabled={!isSleeping}
                onClick={onTestWake}
                className={`p-2.5 border rounded-sm font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  isSleeping
                    ? 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-800 cursor-pointer shadow-2xs'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60'
                }`}
                title={isSleeping ? "Home 2 trục ➔ Quay đón bình minh" : "Chỉ khả dụng khi hệ thống đang ở trạng thái ngủ"}
              >
                <Sun className={`w-3.5 h-3.5 shrink-0 ${isSleeping ? 'text-zinc-600' : 'text-zinc-400'}`} />
                <span>2. Test Wake Up</span>
              </button>

              {/* Nút 3: Quay về trạng thái thật (Reset) */}
              <button
                type="button"
                onClick={onResumeReal}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Home 2 trục ➔ Khôi phục bám theo thời gian thực RTC/NOAA"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span>3. Về trạng thái thật</span>
              </button>
            </div>

            {/* Tắt / Bật Vô hiệu hóa khả năng ngủ đêm */}
            <div className="pt-2 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900">
                  Chế độ ngủ đêm (18:00 – 04:00)
                </span>
                <HelpTip text="Bật: Tự động đưa giàn pin về thế nghỉ an toàn và ngắt relay từ 18:00 đến 04:00 để tiết kiệm điện. Tắt: Giữ nguyên vị trí giàn pin ở góc chiều, không ngủ." />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSetSleepDisabled && onSetSleepDisabled(false)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                    !system?.sleepDisabled
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Bật
                </button>
                <button
                  type="button"
                  onClick={() => onSetSleepDisabled && onSetSleepDisabled(true)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                    system?.sleepDisabled
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Tắt
                </button>
              </div>
            </div>

            {/* Điều khiển Đèn */}
            <div className="pt-2.5 border-t border-zinc-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900">
                    Điều khiển đèn
                  </span>
                  <HelpTip text="Tự động: Đèn tự động bật/tắt luân phiên 15 phút khi giàn pin ngủ đêm. Thủ công: Cho phép người dùng bật hoặc tắt đèn trực tiếp bằng tay." />
                  <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                    Đèn: {system?.lamp12vOn ? 'BẬT' : 'TẮT'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSetLampAutoDisabled && onSetLampAutoDisabled(false)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                      !system?.lampAutoDisabled
                        ? 'bg-zinc-800 text-white border-zinc-800'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    Tự động
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetLampAutoDisabled && onSetLampAutoDisabled(true)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                      system?.lampAutoDisabled
                        ? 'bg-zinc-800 text-white border-zinc-800'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    Thủ công
                  </button>
                </div>
              </div>

              {/* Hàng nút Bật / Tắt đèn bằng tay */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2 rounded-sm border border-zinc-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-800">
                    Công tắc đèn {system?.lampAutoDisabled ? '(Thủ công)' : '(Khóa khi Tự động)'}:
                  </span>
                  <HelpTip text="Bật hoặc tắt đèn chủ động bằng tay. Chỉ khả dụng khi chọn chế độ Thủ công ở trên." />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!system?.lampAutoDisabled}
                    onClick={() => onSetLampManualState && onSetLampManualState(true)}
                    className={`px-3 py-1 rounded-sm text-xs font-semibold border transition-colors ${
                      !system?.lampAutoDisabled
                        ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                        : system?.lamp12vOn
                          ? 'bg-zinc-800 text-white border-zinc-800 cursor-pointer'
                          : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300 cursor-pointer'
                    }`}
                  >
                    Bật đèn
                  </button>
                  <button
                    type="button"
                    disabled={!system?.lampAutoDisabled}
                    onClick={() => onSetLampManualState && onSetLampManualState(false)}
                    className={`px-3 py-1 rounded-sm text-xs font-semibold border transition-colors ${
                      !system?.lampAutoDisabled
                        ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                        : !system?.lamp12vOn
                          ? 'bg-zinc-800 text-white border-zinc-800 cursor-pointer'
                          : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300 cursor-pointer'
                    }`}
                  >
                    Tắt đèn
                  </button>
                </div>
              </div>
            </div>

            {/* Tự động ngắt nguồn ESP32 #2 (Node đo Voc/Isc) ban đêm */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-sm border border-zinc-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 block">
                  Tự ngắt nguồn ESP32 #2 ban đêm
                </span>
                <HelpTip text="Bật: Tự động ngắt nguồn ESP32 #2 từ 18:01 tối đến 04:01 sáng để tiết kiệm ắc quy. Tắt: ESP32 #2 luôn được cấp nguồn hoạt động 24/24." />
                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                  {system?.esp2PowerOn !== false ? 'Nguồn: ON' : 'Nguồn: OFF'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSetEsp2AutoCutoff && onSetEsp2AutoCutoff(true)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                    system?.esp2AutoCutoff !== false
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Bật
                </button>
                <button
                  type="button"
                  onClick={() => onSetEsp2AutoCutoff && onSetEsp2AutoCutoff(false)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                    system?.esp2AutoCutoff === false
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Tắt
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Chân Modal */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-sm cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
}
