import React, { useState } from 'react';
import {
  TbSolarPanel,
  TbBolt,
  TbCircuitVoltmeter,
  TbWaveSine,
  TbBatteryCharging,
  TbCompass,
  TbTrendingUp,
  TbCpu,
  TbRefresh,
  TbEye,
  TbSettingsAutomation,
  TbWifi,
  TbTemperature,
  TbFileText,
  TbAdjustmentsHorizontal,
  TbSettings,
  TbAlertOctagon,
  TbSun,
  TbMoonStars
} from 'react-icons/tb';
import {
  formatSignedNumber,
  formatValueOrDash,
  getConnectionStatusBadge,
  getCompassDirectionName
} from '../utils/formatters';

/**
 * COMPACT MODE: MÔ HÌNH TRỰC QUAN TƯƠNG TÁC (DIGITAL TWIN)
 * Tái hiện chính xác kết cấu cơ khí thực tế của hệ thống:
 * - Khung nhôm định hình 20x20 đặt sàn
 * - Bên trái: Tấm pin Tracking 2 trục (Ổ xoay đen in 3D, gá trắng in 3D, truyền động đai răng,
 *   2 động cơ bước NEMA17, 2 Encoder, 2 công tắc hành trình SW1/SW2, 4 cảm biến quang TEMT6000)
 * - Chính giữa: Hộp điện chống nước màu trắng có khóa gài & ăng-ten đen bên hông
 *   (Có thể nhấn mở nắp hộp để xem bên trong: Sạc PWM xanh, ESP32-S3, 2 mạch INA226, RTC DS3231, quạt tản nhiệt, 2 Driver cọc xanh)
 * - Bên phải: Tấm pin cố định (Nam 180°, ngửa 75° / nghiêng 15°) trên trụ nhôm định hình
 */
export default function CompactInteractiveTwin({
  telemetry,
  isAdmin = true,
  onOpenDetails,
  onOpenManualModal,
  onOpenSettingsModal,
  onOpenEmergencyModal
}) {
  const INA226 = telemetry?.INA226 || {};
  const motors = telemetry?.motors || {};
  const sensors = telemetry?.sensors || {};
  const system = telemetry?.system || {};

  const tracking = INA226?.tracking || { voltage: null, current: null, power: null, energyWh: null };
  const stat = INA226?.static || { voltage: null, current: null, power: null, energyWh: null };
  const comparison = INA226?.comparison || { percentGain: null, powerDelta: null, hasValidGain: false };

  const az = motors?.azimuth || {};
  const el = motors?.elevation || {};

  const livePhi = az.phi !== undefined && az.phi !== null ? Number(az.phi) : (az.currentAngle !== null ? Number(az.currentAngle) : 0);
  const liveEps = el.epsilon !== undefined && el.epsilon !== null ? Number(el.epsilon) : (el.currentAngle !== null ? Number(el.currentAngle) : 90);

  // Chế độ xem: 'overview' (Toàn cảnh 2 tấm pin & hộp điện) | 'mechanism' (Cận cảnh cơ cấu 2 trục & đai răng) | 'controlbox' (Bên trong hộp điện có ăng-ten)
  const [activeView, setActiveView] = useState('overview');

  // Chế độ tương tác thử nghiệm góc quay (Sandbox) hoặc Đồng bộ trực tiếp (Live)
  const [isInteractiveSim, setIsInteractiveSim] = useState(false);
  const [simPhi, setSimPhi] = useState(45);
  const [simEps, setSimEps] = useState(55);
  const [selectedHotspot, setSelectedHotspot] = useState('tracker'); // 'tracker' | 'mechanism' | 'box' | 'static'

  const effectivePhi = isInteractiveSim ? simPhi : livePhi;
  const effectiveEps = isInteractiveSim ? simEps : liveEps;

  // Tính phương vị la bàn từ góc cơ cấu φ
  const compassAzimuth = (() => {
    if (!isInteractiveSim && az.currentAngle !== null && az.currentAngle !== undefined && !isNaN(az.currentAngle)) {
      return Number(az.currentAngle);
    }
    const hour = new Date().getHours();
    const isAfternoon = hour >= 12;
    let azVal = isAfternoon ? (360.0 - effectivePhi) : (180.0 - effectivePhi);
    while (azVal < 0) azVal += 360.0;
    while (azVal >= 360.0) azVal -= 360.0;
    return Math.round(azVal * 10) / 10;
  })();

  // Góc nghiêng hiển thị trên hình minh họa (ε = 90° là nằm ngang, ε = 10° là nghiêng tối đa, ε > 90° là ngửa sang hướng ngược lại)
  const panelTiltDeg = Math.max(-52, Math.min(52, 90 - effectiveEps));
  // Hiệu ứng phối cảnh xoay phương vị cho tấm pin (co giãn nhẹ chiều ngang theo cos và lệch trục)
  const azimuthSkewDeg = Math.max(-18, Math.min(18, ((effectivePhi - 45) / 100) * 14));

  const isSleeping = system?.rawState === 'DEEP_SLEEP' || (system?.displayState && system?.displayState.includes('NGỦ'));
  const isOnline = system?.online;

  const trkBadge = getConnectionStatusBadge(tracking.connStatus, tracking.staleDurationMs);
  const staBadge = getConnectionStatusBadge(stat.connStatus, stat.staleDurationMs);
  const hasValidGain = comparison.hasValidGain && comparison.percentGain !== null;

  // Cảm biến quang 4 hướng
  const sTop = sensors?.top || { adc: null, lux: null };
  const sBot = sensors?.bottom || { adc: null, lux: null };
  const sLeft = sensors?.left || { adc: null, lux: null };
  const sRight = sensors?.right || { adc: null, lux: null };

  const activateSandbox = () => {
    if (!isInteractiveSim) {
      setSimPhi(Math.round(livePhi || 35));
      setSimEps(Math.round(liveEps || 65));
      setIsInteractiveSim(true);
    } else {
      setIsInteractiveSim(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. THANH ĐIỀU HƯỚNG COMPACT MODE & CHỌN GÓC NHÌN TRỰC QUAN */}
      <div className="lab-card p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-blue-600 text-white shadow-xs shrink-0">
            <TbSolarPanel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                Mô hình Trực quan Hệ thống (Compact Twin Mode)
              </h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-xs font-mono ${
                isInteractiveSim
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
              }`}>
                {isInteractiveSim ? 'CHẾ ĐỘ TƯƠNG TÁC THỬ GÓC' : `ĐỒNG BỘ TRỰC TIẾP: ${system?.displayState || 'BÌNH THƯỜNG'}`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-300 font-medium mt-0.5">
              Mô phỏng trực quan kết cấu khung nhôm 20x20, cơ cấu truyền động đai răng 2 trục, hộp điện có ăng-ten và tấm pin đối chứng
            </p>
          </div>
        </div>

        {/* Các tab chuyển góc nhìn chi tiết */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-zinc-100 dark:bg-slate-800/90 p-1 rounded-md border border-zinc-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-2.5 py-1.5 rounded-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'overview'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-sky-300 shadow-xs'
                  : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <TbEye className="w-3.5 h-3.5" />
              <span>Toàn cảnh 2 tấm pin</span>
            </button>
            <button
              onClick={() => setActiveView('mechanism')}
              className={`px-2.5 py-1.5 rounded-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'mechanism'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-sky-300 shadow-xs'
                  : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <TbSettingsAutomation className="w-3.5 h-3.5" />
              <span>Kết cấu Trục & Đai răng</span>
            </button>
            <button
              onClick={() => setActiveView('controlbox')}
              className={`px-2.5 py-1.5 rounded-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'controlbox'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-sky-300 shadow-xs'
                  : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <TbCpu className="w-3.5 h-3.5" />
              <span>Bên trong Hộp điện</span>
            </button>
          </div>

          <button
            onClick={onOpenDetails}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-600 rounded-md cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <TbFileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>Thông số chi tiết</span>
          </button>
        </div>
      </div>

      {/* 2. KHUNG MÔ HÌNH TƯƠNG TÁC CHÍNH + CỘT THÔNG SỐ TRỰC QUAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* CỘT TRÁI (8 COLS): SÂN KHẤU ĐỒ HỌA KỸ THUẬT TƯƠNG TÁC (SVG DIGITAL TWIN) */}
        <div className="lg:col-span-8 lab-card p-4 flex flex-col justify-between relative overflow-hidden">
          {/* Thanh công cụ tương tác phía trên sân khấu */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-zinc-200 dark:border-slate-800 z-10">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-zinc-800 dark:text-slate-100">
                {activeView === 'overview' && 'Mô hình tổng thể: Tấm Tracking (Trái) — Hộp điện Ăng-ten (Giữa) — Tấm Cố định (Phải)'}
                {activeView === 'mechanism' && 'Cận cảnh cụm cơ khí Trục 1 (Phương vị φ) & Trục 2 (Độ ngửa ε) truyền động đai răng'}
                {activeView === 'controlbox' && 'Mặt cắt bên trong Hộp điện trung tâm (Sạc Solar PWM, ESP32-S3, 2x INA226, 2x Driver & Ăng-ten)'}
              </span>
            </div>

            <button
              onClick={activateSandbox}
              className={`px-2.5 py-1 rounded-xs text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                isInteractiveSim
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                  : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-200 border-zinc-300 dark:border-slate-700 hover:bg-zinc-200 dark:hover:bg-slate-700'
              }`}
              title="Bật để kéo thanh trượt xoay thử góc giàn pin trực quan trên màn hình"
            >
              <TbRefresh className={`w-3.5 h-3.5 ${isInteractiveSim ? 'animate-spin' : ''}`} />
              <span>{isInteractiveSim ? 'Đang xoay thử (Nhấn để về Live)' : 'Tương tác xoay thử góc'}</span>
            </button>
          </div>

          {/* Thanh trượt xoay thử mô hình khi bật chế độ tương tác */}
          {isInteractiveSim && (
            <div className="mb-3 p-2.5 rounded-md bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs z-10">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between font-semibold text-amber-900 dark:text-amber-200">
                  <span>Góc quay Trục 1 (Phương vị φ):</span>
                  <span className="font-mono font-bold">{simPhi}° ({compassAzimuth}° {getCompassDirectionName(compassAzimuth)})</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="147"
                  step="1"
                  value={simPhi}
                  onChange={(e) => setSimPhi(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between font-semibold text-amber-900 dark:text-amber-200">
                  <span>Góc ngửa Trục 2 (Độ ngửa ε):</span>
                  <span className="font-mono font-bold">{simEps}° (Nghiêng {90 - simEps}° so với phương ngang)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="1"
                  value={simEps}
                  onChange={(e) => setSimEps(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 1: TOÀN CẢNH HỆ THỐNG (2 TẤM PIN, KHUNG NHÔM & HỘP ĐIỆN)     */}
          {/* ================================================================= */}
          {activeView === 'overview' && (
            <div className="w-full flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 760 400"
                className="w-full h-auto max-h-[380px] select-none rounded-md bg-gradient-to-b from-sky-50/60 via-slate-50/40 to-zinc-100/70 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-slate-950 border border-zinc-200/80 dark:border-slate-800"
              >
                <defs>
                  {/* Pattern lưới tế bào quang điện Monocrystalline */}
                  <pattern id="solarCellGrid" width="18" height="14" patternUnits="userSpaceOnUse">
                    <rect width="18" height="14" fill="#0f294a" />
                    <rect x="0.8" y="0.8" width="16.4" height="12.4" rx="1" fill="#163e73" stroke="#38bdf8" strokeWidth="0.35" strokeOpacity="0.55" />
                    <line x1="9" y1="0.8" x2="9" y2="13.2" stroke="#93c5fd" strokeWidth="0.25" strokeOpacity="0.4" />
                  </pattern>
                  <pattern id="solarCellGridFixed" width="18" height="14" patternUnits="userSpaceOnUse">
                    <rect width="18" height="14" fill="#172554" />
                    <rect x="0.8" y="0.8" width="16.4" height="12.4" rx="1" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="0.3" strokeOpacity="0.45" />
                    <line x1="9" y1="0.8" x2="9" y2="13.2" stroke="#cbd5e1" strokeWidth="0.2" strokeOpacity="0.35" />
                  </pattern>
                  {/* Gradient nhôm định hình 20x20 */}
                  <linearGradient id="aluExtrusion" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="35%" stopColor="#e2e8f0" />
                    <stop offset="65%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                  <linearGradient id="aluHorizontal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                </defs>

                {/* 1. BẦU TRỜI & NGUỒN SÁNG (MẶT TRỜI HOẶC CHẾ ĐỘ NGỦ ĐÊM) */}
                {!isSleeping ? (
                  <g>
                    {/* Quỹ đạo mặt trời nét đứt */}
                    <path
                      d="M 70 120 Q 380 15 690 120"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                      strokeDasharray="4,4"
                      opacity="0.45"
                    />
                    {/* Mặt trời & tia bức xạ chiếu xuống 2 tấm pin */}
                    <g transform="translate(260, 44)">
                      <circle cx="0" cy="0" r="22" fill="#fef3c7" opacity="0.25" className="animate-pulse-slow" />
                      <circle cx="0" cy="0" r="13" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
                    </g>
                    {/* Tia nắng chiếu tới tấm Tracking */}
                    <line x1="252" y1="62" x2="215" y2="128" stroke="#fbbf24" strokeWidth="1.6" strokeDasharray="5,4" className="animate-solar-ray" opacity="0.8" />
                    <line x1="268" y1="62" x2="245" y2="134" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="5,4" className="animate-solar-ray" opacity="0.65" />
                    {/* Tia nắng chiếu tới tấm Cố định */}
                    <line x1="280" y1="56" x2="535" y2="145" stroke="#fbbf24" strokeWidth="1.3" strokeDasharray="5,4" className="animate-solar-ray" opacity="0.45" />
                  </g>
                ) : (
                  <g>
                    {/* Ban đêm / Ngủ đông: Sao & trạng thái nghỉ */}
                    <circle cx="120" cy="45" r="1.5" fill="#94a3b8" opacity="0.6" />
                    <circle cx="320" cy="35" r="1.8" fill="#94a3b8" opacity="0.5" />
                    <circle cx="520" cy="50" r="1.4" fill="#94a3b8" opacity="0.6" />
                    <text x="380" y="42" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-indigo-600 dark:fill-indigo-300">
                      CHẾ ĐỘ NGỦ ĐÔNG AN TOÀN — ĐỢI BÌNH MINH (04:00)
                    </text>
                  </g>
                )}

                {/* 2. MẶT SÀN GẠCH & KHUNG ĐẾ NHÔM ĐỊNH HÌNH 20x20 (Giống ảnh thực tế) */}
                <ellipse cx="380" cy="356" rx="330" ry="24" fill="#0f172a" opacity="0.08" />

                {/* Khung đế chữ nhật nhôm định hình 20x20 có 4 chân trụ */}
                <g
                  onClick={() => setSelectedHotspot('mechanism')}
                  className="cursor-pointer"
                >
                  {/* Thanh nhôm sau */}
                  <polygon points="125,305 635,305 655,313 105,313" fill="url(#aluHorizontal)" stroke="#64748b" strokeWidth="0.8" />
                  {/* Thanh nhôm trái */}
                  <polygon points="125,305 105,342 117,346 137,309" fill="url(#aluExtrusion)" stroke="#64748b" strokeWidth="0.8" />
                  {/* Thanh nhôm phải */}
                  <polygon points="635,305 655,342 643,346 623,309" fill="url(#aluExtrusion)" stroke="#64748b" strokeWidth="0.8" />
                  {/* Thanh giằng giữa khung */}
                  <polygon points="315,308 308,342 320,342 326,308" fill="url(#aluExtrusion)" stroke="#64748b" strokeWidth="0.7" />
                  {/* Thanh nhôm mặt trước (có rãnh chữ V đặc trưng của nhôm 20x20) */}
                  <rect x="105" y="338" width="550" height="11" rx="1.5" fill="url(#aluHorizontal)" stroke="#475569" strokeWidth="0.9" />
                  <line x1="108" y1="343.5" x2="652" y2="343.5" stroke="#334155" strokeWidth="1" opacity="0.65" />

                  {/* 4 Chân đế cao su đen ở 4 góc khung nhôm */}
                  <rect x="106" y="349" width="12" height="14" rx="1" fill="url(#aluExtrusion)" stroke="#475569" strokeWidth="0.8" />
                  <rect x="104" y="361" width="16" height="4" rx="1" fill="#1e293b" />

                  <rect x="642" y="349" width="12" height="14" rx="1" fill="url(#aluExtrusion)" stroke="#475569" strokeWidth="0.8" />
                  <rect x="640" y="361" width="16" height="4" rx="1" fill="#1e293b" />

                  <rect x="308" y="349" width="11" height="12" rx="1" fill="url(#aluExtrusion)" stroke="#475569" strokeWidth="0.8" />
                  <rect x="306" y="359" width="15" height="3.5" rx="1" fill="#1e293b" />
                </g>

                {/* ============================================================= */}
                {/* 3. CỤM BÊN TRÁI: HỆ THỐNG PIN TRACKING 2 TRỤC (GIỐNG ẢNH 1 & 5) */}
                {/* ============================================================= */}
                <g
                  onClick={() => setSelectedHotspot('tracker')}
                  className="cursor-pointer"
                >
                  {/* Cụm Trục 1 (Phương vị): Động cơ bước NEMA17 trái + Đai răng đen + Ổ xoay trụ tròn đen in 3D + Encoder phải + Công tắc hành trình SW1 */}
                  {/* Động cơ bước Trục 1 (bên trái trụ) + Gá in 3D trắng */}
                  <rect x="144" y="312" width="32" height="8" rx="1.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                  <rect x="148" y="320" width="24" height="24" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                  <rect x="156" y="305" width="8" height="7" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />

                  {/* Dây đai răng đen Trục 1 nối Puly động cơ vào ổ xoay đen */}
                  <line x1="164" y1="308" x2="196" y2="308" stroke="#0f172a" strokeWidth="3.5" />
                  <line x1="164" y1="311" x2="196" y2="311" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />

                  {/* Ổ xoay trung tâm màu đen in 3D (Black Cylindrical Hub) */}
                  <ellipse cx="215" cy="326" rx="24" ry="8" fill="#0f172a" />
                  <rect x="191" y="296" width="48" height="30" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
                  <ellipse cx="215" cy="296" rx="24" ry="7" fill="#334155" stroke="#0f172a" strokeWidth="1" />

                  {/* Gá trắng in 3D bên phải + Encoder Trục 1 + Công tắc hành trình SW1 */}
                  <rect x="239" y="310" width="34" height="9" rx="1.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                  <rect x="252" y="319" width="18" height="16" rx="2" fill="#0f172a" />
                  {/* Cần gạt trắng + Công tắc hành trình SW1 */}
                  <circle
                    cx="248"
                    cy="306"
                    r="4.5"
                    fill={az.limitHome ? '#f59e0b' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <title>Công tắc hành trình Trục 1 (SW1): {az.limitHome ? 'Đang chạm' : 'Hở (Bình thường)'}</title>

                  {/* Trụ đứng nhôm định hình 20x40 (có rãnh dọc) */}
                  <rect x="204" y="175" width="22" height="121" fill="url(#aluExtrusion)" stroke="#475569" strokeWidth="1" />
                  <line x1="211" y1="175" x2="211" y2="296" stroke="#475569" strokeWidth="1" opacity="0.7" />
                  <line x1="219" y1="175" x2="219" y2="296" stroke="#475569" strokeWidth="1" opacity="0.7" />

                  {/* Cụm truyền động Trục 2 (Độ ngửa ε) gắn giữa thân trụ: Gá trắng in 3D + Động cơ bước + Đai răng đen lên đỉnh trụ */}
                  <rect x="180" y="206" width="26" height="28" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="193" cy="220" r="8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
                  <circle cx="193" cy="220" r="3" fill="#e2e8f0" />

                  {/* Gá trắng bên phải trụ (Encoder Trục 2 + Công tắc hành trình SW2) */}
                  <rect x="224" y="214" width="26" height="18" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                  <circle
                    cx="244"
                    cy="223"
                    r="4"
                    fill={el.limitSwitch90 ? '#f59e0b' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />

                  {/* Dây đai răng đen Trục 2 kéo từ puly giữa trụ lên puly khớp xoay đỉnh trụ */}
                  <line x1="188" y1="214" x2="206" y2="168" stroke="#0f172a" strokeWidth="3" />
                  <line x1="198" y1="224" x2="216" y2="174" stroke="#0f172a" strokeWidth="3" />

                  {/* Khớp xoay đen đỉnh trụ + Gá chữ T màu trắng in 3D đỡ mặt dưới tấm pin */}
                  <rect x="200" y="158" width="30" height="20" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />

                  {/* TẤM PIN TRACKER (Xoay và nghiêng theo góc thực tế φ, ε) */}
                  <g
                    transform={`translate(215, 158) rotate(${-panelTiltDeg}) skewX(${azimuthSkewDeg})`}
                    style={{ transition: isInteractiveSim ? 'transform 0.08s linear' : 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  >
                    {/* Gá chữ T màu trắng in 3D ốp dưới khung nhôm tấm pin (Giống ảnh 1 & 5) */}
                    <path d="M -36 0 L 36 0 L 30 14 L 14 14 L 14 22 L -14 22 L -14 14 L -30 14 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                    <circle cx="0" cy="8" r="4" fill="#475569" stroke="#e2e8f0" strokeWidth="1.2" />

                    {/* Khung nhôm tấm pin mặt trời & bề mặt tế bào quang điện */}
                    <g transform="translate(0, -10)">
                      {/* Độ dày khung nhôm */}
                      <polygon points="-112,6 112,6 118,13 -106,13" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.9" />
                      {/* Mặt tấm pin nghiêng phối cảnh */}
                      <polygon
                        points="-96,-36 124,-36 112,6 -112,6"
                        fill="url(#solarCellGrid)"
                        stroke="#f8fafc"
                        strokeWidth="3"
                      />
                      <polygon
                        points="-96,-36 124,-36 112,6 -112,6"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="1.2"
                      />

                      {/* 4 Cảm biến quang TEMT6000 gắn trên 4 cạnh khung trắng (Top, Bottom, Left, Right) */}
                      {/* Top Sensor */}
                      <rect x="8" y="-41" width="12" height="6" rx="1.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                      <circle cx="14" cy="-38" r="1.8" fill="#f59e0b" />
                      {/* Bottom Sensor */}
                      <rect x="-6" y="4" width="12" height="6" rx="1.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                      <circle cx="0" cy="7" r="1.8" fill="#f59e0b" />
                      {/* Left Sensor */}
                      <rect x="-109" y="-18" width="8" height="10" rx="1.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                      <circle cx="-105" cy="-13" r="1.8" fill="#f59e0b" />
                      {/* Right Sensor */}
                      <rect x="115" y="-18" width="8" height="10" rx="1.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                      <circle cx="119" cy="-13" r="1.8" fill="#f59e0b" />
                    </g>
                  </g>

                  {/* Nhãn nổi phía trên tấm pin Tracker */}
                  <g transform="translate(115, 74)">
                    <rect x="0" y="0" width="195" height="36" rx="5" className="fill-white/95 dark:fill-slate-900/95" stroke="#0284c7" strokeWidth="1.2" />
                    <text x="10" y="14" fontSize="10" fontWeight="800" fill="#0284c7">
                      ● TẤM TRACKER (TRỤC KÉP)
                    </text>
                    <text x="10" y="28" fontSize="10.5" fontWeight="700" className="fill-slate-800 dark:fill-slate-100">
                      P: {formatValueOrDash(tracking.power, 1, 'W')} | φ: {formatSignedNumber(effectivePhi, 1, '°')} | ε: {formatValueOrDash(effectiveEps, 1, '°')}
                    </text>
                  </g>
                </g>

                {/* ============================================================= */}
                {/* 4. CHÍNH GIỮA: HỘP ĐIỆN TRẮNG CÓ KHÓA GÀI & ĂNG-TEN ĐEN        */}
                {/* ============================================================= */}
                <g
                  onClick={() => {
                    setSelectedHotspot('box');
                    setActiveView('controlbox');
                  }}
                  className="cursor-pointer group"
                >
                  {/* Thân hộp điện nhựa trắng đặt giữa khung nhôm */}
                  <polygon points="340,262 448,262 456,336 332,336" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
                  {/* Nắp hộp điện có gờ và 2 khóa gài trắng mặt trước (Giống ảnh 5) */}
                  <polygon points="336,248 452,248 458,264 330,264" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
                  {/* 2 Khóa gài nắp hộp (Latches) */}
                  <rect x="352" y="258" width="12" height="16" rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                  <rect x="424" y="258" width="12" height="16" rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />

                  {/* ĂNG-TEN WIFI MÀU ĐEN GẮN BÊN HÔNG HỘP ĐIỆN (Giống ảnh 4 & 5) */}
                  <circle cx="430" cy="296" r="4.5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <line x1="430" y1="296" x2="444" y2="236" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
                  <circle cx="444" cy="236" r="2.2" fill="#0f172a" />

                  {/* Sóng WiFi phát ra từ đầu ăng-ten khi kết nối trực tiếp */}
                  {isOnline && (
                    <g transform="translate(444, 232)" className="animate-pulse-slow">
                      <path d="M -8 -6 A 12 12 0 0 1 8 -6" fill="none" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M -13 -12 A 19 19 0 0 1 13 -12" fill="none" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
                    </g>
                  )}

                  {/* Nhãn gợi ý nhấn vào hộp điện để mở nắp xem bên trong */}
                  <rect x="345" y="284" width="74" height="22" rx="3" fill="#0f172a" opacity="0.82" />
                  <text x="382" y="298" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#38bdf8">
                    Mở hộp điện ↗
                  </text>
                </g>

                {/* Dây cáp điện nối từ hộp điện sang 2 trụ pin */}
                <path d="M 335 316 Q 280 328 238 302" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                <path d="M 455 316 Q 505 325 548 298" fill="none" stroke="#1e293b" strokeWidth="2.2" />

                {/* ============================================================= */}
                {/* 5. CỤM BÊN PHẢI: TẤM PIN CỐ ĐỊNH (NAM 180°, NGỬA 75°)         */}
                {/* ============================================================= */}
                <g
                  onClick={() => setSelectedHotspot('static')}
                  className="cursor-pointer"
                >
                  {/* Chân đế gắn khung nhôm + Trụ đứng nhôm định hình 20x20 */}
                  <rect x="542" y="324" width="24" height="14" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1" />
                  <rect x="547" y="182" width="14" height="144" fill="url(#aluExtrusion)" stroke="#475569" strokeWidth="1" />
                  <line x1="554" y1="182" x2="554" y2="326" stroke="#475569" strokeWidth="0.9" opacity="0.65" />

                  {/* Gá in 3D trắng cố định góc nghiêng 15° (Độ ngửa 75°) */}
                  <path d="M 526 176 L 582 184 L 574 196 L 534 190 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />

                  {/* Mặt tấm pin Cố định (nghiêng cố định 15° hướng Nam 180°) */}
                  <g transform="translate(554, 174) rotate(-12)">
                    <polygon points="-102,6 102,6 108,12 -96,12" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.9" />
                    <polygon
                      points="-88,-32 112,-32 102,6 -102,6"
                      fill="url(#solarCellGridFixed)"
                      stroke="#f8fafc"
                      strokeWidth="3"
                    />
                    <polygon
                      points="-88,-32 112,-32 102,6 -102,6"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="1.2"
                    />
                  </g>

                  {/* Nhãn nổi phía trên tấm pin Cố định */}
                  <g transform="translate(465, 74)">
                    <rect x="0" y="0" width="195" height="36" rx="5" className="fill-white/95 dark:fill-slate-900/95" stroke="#ea580c" strokeWidth="1.2" />
                    <text x="10" y="14" fontSize="10" fontWeight="800" fill="#ea580c">
                      ● TẤM CỐ ĐỊNH (NAM 180°, 75°)
                    </text>
                    <text x="10" y="28" fontSize="10.5" fontWeight="700" className="fill-slate-800 dark:fill-slate-100">
                      P: {formatValueOrDash(stat.power, 1, 'W')} | ΣE: {formatValueOrDash(stat.energyWh, 1, 'Wh')}
                    </text>
                  </g>
                </g>

                {/* Chú thích chân trang trên sơ đồ */}
                <text x="380" y="388" textAnchor="middle" fontSize="10.5" fontWeight="600" className="fill-slate-500 dark:fill-slate-400">
                  Mẹo: Nhấn trực tiếp vào [Tấm pin], [Trụ cơ khí], hoặc [Hộp điện trắng có ăng-ten] để xem chi tiết cấu tạo
                </text>
              </svg>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 2: CẬN CẢNH KẾT CẤU CƠ KHÍ 2 TRỤC, ĐAI RĂNG & CẢM BIẾN       */}
          {/* ================================================================= */}
          {activeView === 'mechanism' && (
            <div className="w-full flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 760 400"
                className="w-full h-auto max-h-[380px] select-none rounded-md bg-gradient-to-b from-slate-50 to-zinc-100/90 dark:from-slate-950 dark:to-slate-900 border border-zinc-200 dark:border-slate-800"
              >
                {/* Sơ đồ kỹ thuật phóng lớn cụm truyền động Trục 1 & Trục 2 (Giống Ảnh 1 thực tế) */}
                {/* Khung đế nhôm 20x20 */}
                <rect x="80" y="346" width="380" height="14" rx="2" fill="url(#aluHorizontal)" stroke="#475569" strokeWidth="1" />
                <line x1="85" y1="353" x2="455" y2="353" stroke="#334155" strokeWidth="1.2" />

                {/* TRỤC 1 (AZIMUTH): Ổ XOAY TRÒN ĐEN IN 3D + ĐAI RĂNG + STEPPER + ENCODER */}
                {/* Gá trắng bên trái (Encoder Trục 1 + Công tắc hành trình SW1) */}
                <rect x="118" y="308" width="58" height="14" rx="2" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
                <rect x="128" y="322" width="28" height="24" rx="2" fill="#0f172a" />
                <circle cx="142" cy="300" r="6" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />

                {/* Đai răng đen bên trái nối vào ổ xoay đen */}
                <line x1="148" y1="298" x2="225" y2="298" stroke="#0f172a" strokeWidth="4.5" />
                <line x1="148" y1="302" x2="225" y2="302" stroke="#475569" strokeWidth="1.2" strokeDasharray="3,3" />

                {/* Ổ xoay trụ tròn đen in 3D ở chân trụ (Black 3D-printed Azimuth Bearing Block) */}
                <ellipse cx="265" cy="336" rx="42" ry="12" fill="#0f172a" />
                <rect x="223" y="282" width="84" height="54" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                <line x1="223" y1="310" x2="307" y2="310" stroke="#0f172a" strokeWidth="2" />
                <ellipse cx="265" cy="282" rx="42" ry="11" fill="#334155" stroke="#0f172a" strokeWidth="1.2" />

                {/* Gá trắng bên phải (Động cơ bước NEMA17 Trục 1) */}
                <rect x="350" y="308" width="66" height="14" rx="2" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
                <rect x="362" y="322" width="42" height="40" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
                <circle cx="383" cy="300" r="7" fill="#cbd5e1" stroke="#334155" strokeWidth="1.2" />

                {/* Đai răng đen bên phải nối động cơ bước vào ổ xoay đen */}
                <line x1="305" y1="298" x2="378" y2="298" stroke="#0f172a" strokeWidth="4.5" />
                <line x1="305" y1="302" x2="378" y2="302" stroke="#475569" strokeWidth="1.2" strokeDasharray="3,3" />

                {/* Trụ đứng nhôm định hình V-Slot 20x40 */}
                <rect x="247" y="95" width="36" height="188" fill="url(#aluExtrusion)" stroke="#475569" strokeWidth="1.2" />
                <line x1="258" y1="95" x2="258" y2="283" stroke="#334155" strokeWidth="1.4" opacity="0.7" />
                <line x1="272" y1="95" x2="272" y2="283" stroke="#334155" strokeWidth="1.4" opacity="0.7" />

                {/* TRỤC 2 (ELEVATION): HỘP GÁ TRẮNG IN 3D GIỮA TRỤ + PULY + ĐAI RĂNG ĐEN LÊN ĐỈNH */}
                {/* Cụm gá trắng bên trái trụ (Chứa động cơ bước Trục 2 & Puly chủ động) */}
                <rect x="195" y="148" width="54" height="52" rx="3" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
                <circle cx="222" cy="174" r="16" fill="#0f172a" />
                <circle cx="222" cy="174" r="7" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />

                {/* Cụm gá trắng bên phải trụ (Encoder Trục 2 + Cần gạt + Công tắc hành trình SW2) */}
                <rect x="248" y="164" width="68" height="34" rx="3" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
                <circle cx="298" cy="181" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
                {/* Cần gạt trắng chạm công tắc hành trình SW2 */}
                <line x1="298" y1="181" x2="284" y2="160" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                <rect x="304" y="192" width="16" height="10" rx="1.5" fill={el.limitSwitch90 ? '#f59e0b' : '#10b981'} />

                {/* Gối đỡ đen đỉnh trụ + Gá chữ T màu trắng in 3D + Puly bị động Trục 2 */}
                <rect x="241" y="72" width="48" height="32" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
                <circle cx="256" cy="88" r="14" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />

                {/* 2 Nhánh dây đai răng đen kéo xéo từ cụm giữa trụ lên puly đỉnh trụ (Giống y hệt Ảnh 1) */}
                <line x1="212" y1="164" x2="245" y2="86" stroke="#0f172a" strokeWidth="4" />
                <line x1="232" y1="178" x2="266" y2="94" stroke="#0f172a" strokeWidth="4" />
                <line x1="258" y1="92" x2="290" y2="176" stroke="#0f172a" strokeWidth="4" />
                <line x1="268" y1="88" x2="304" y2="174" stroke="#0f172a" strokeWidth="4" />

                {/* Gá chữ T màu trắng lớn đỡ thanh nhôm tấm pin phía trên (Giống Ảnh 1) */}
                <g
                  transform={`translate(265, 72) rotate(${-panelTiltDeg * 0.45})`}
                  style={{ transition: 'transform 0.5s ease-out' }}
                >
                  <path
                    d="M -95 -12 L 95 -12 L 88 12 L 45 12 L 40 32 L -40 32 L -45 12 L -88 12 Z"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1.2"
                  />
                  {/* Thanh nhôm ngang đỡ tấm pin */}
                  <rect x="-155" y="-26" width="310" height="15" rx="2" fill="url(#aluHorizontal)" stroke="#475569" strokeWidth="1" />
                  <circle cx="-80" cy="-18.5" r="4" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                  <circle cx="80" cy="-18.5" r="4" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                </g>

                {/* BẢNG CHÚ THÍCH KỸ THUẬT BÊN PHẢI SƠ ĐỒ CƠ KHÍ */}
                <g transform="translate(465, 36)">
                  <rect x="0" y="0" width="270" height="325" rx="6" className="fill-white/95 dark:fill-slate-900/95" stroke="#cbd5e1" strokeWidth="1.2" />
                  <text x="16" y="26" fontSize="12" fontWeight="800" className="fill-slate-900 dark:fill-white">
                    THÔNG SỐ CƠ KHÍ & CẢM BIẾN THỰC TẾ
                  </text>
                  <line x1="16" y1="36" x2="254" y2="36" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Trục 1 */}
                  <text x="16" y="58" fontSize="11" fontWeight="700" fill="#0284c7">
                    1. Cụm Trục 1 — Phương vị (Azimuth φ)
                  </text>
                  <text x="16" y="76" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Góc quay hiện tại: {formatSignedNumber(effectivePhi, 1, '°')} (Mục tiêu: {az.targetPhi !== null && az.targetPhi !== undefined ? formatSignedNumber(az.targetPhi, 1, '°') : '--'})
                  </text>
                  <text x="16" y="93" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Xung PCNT Encoder 1: {az.encoderPulses ?? '--'} xung
                  </text>
                  <text x="16" y="110" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Công tắc hành trình SW1: {az.limitHome ? 'Đang chạm (Home)' : 'Hở (Đã Pull-off an toàn)'}
                  </text>

                  {/* Trục 2 */}
                  <text x="16" y="140" fontSize="11" fontWeight="700" fill="#0284c7">
                    2. Cụm Trục 2 — Độ ngửa (Elevation ε)
                  </text>
                  <text x="16" y="158" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Độ ngửa hiện tại: {formatValueOrDash(effectiveEps, 1, '°')} (Mục tiêu: {el.targetEpsilon !== null && el.targetEpsilon !== undefined ? formatValueOrDash(el.targetEpsilon, 1, '°') : '--'})
                  </text>
                  <text x="16" y="175" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Xung PCNT Encoder 2: {el.encoderPulses ?? '--'} xung
                  </text>
                  <text x="16" y="192" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Công tắc hành trình SW2: {el.limitSwitch90 ? 'Đang chạm (90°)' : 'Hở (Bình thường)'}
                  </text>

                  {/* 4 Cảm biến quang TEMT6000 */}
                  <text x="16" y="222" fontSize="11" fontWeight="700" fill="#d97706">
                    3. Cảm biến Quang học 4 Hướng (TEMT6000)
                  </text>
                  <text x="16" y="242" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Trên (Top): ADC {sTop.adc ?? '--'} ({sTop.lux ?? '--'} lx)
                  </text>
                  <text x="16" y="259" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Dưới (Bottom): ADC {sBot.adc ?? '--'} ({sBot.lux ?? '--'} lx)
                  </text>
                  <text x="16" y="276" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Trái (Left): ADC {sLeft.adc ?? '--'} ({sLeft.lux ?? '--'} lx)
                  </text>
                  <text x="16" y="293" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    • Phải (Right): ADC {sRight.adc ?? '--'} ({sRight.lux ?? '--'} lx)
                  </text>
                </g>
              </svg>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 3: BÊN TRONG HỘP ĐIỆN TRUNG TÂM CÓ ĂNG-TEN (GIỐNG ẢNH 4)     */}
          {/* ================================================================= */}
          {activeView === 'controlbox' && (
            <div className="w-full flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 760 400"
                className="w-full h-auto max-h-[380px] select-none rounded-md bg-gradient-to-b from-slate-100 to-zinc-200/70 dark:from-slate-950 dark:to-slate-900 border border-zinc-200 dark:border-slate-800"
              >
                {/* Vỏ hộp điện nhựa trắng mở nắp nhìn từ trên xuống (Giống Ảnh 4 thực tế) */}
                <rect x="65" y="28" width="380" height="335" rx="10" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
                <rect x="82" y="44" width="346" height="303" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />

                {/* Nắp hộp mở sang bên phải có bản lề trắng */}
                <rect x="445" y="55" width="12" height="60" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                <rect x="445" y="245" width="12" height="60" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />

                {/* 1. PHÍA TRÊN TRONG HỘP: BỘ ĐIỀU KHIỂN SẠC SOLAR PWM MÀU ĐEN-XANH DƯƠNG (Có nhãn CE, màn hình LCD & cổng USB) */}
                <g transform="translate(105, 54)">
                  <rect x="0" y="0" width="215" height="86" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                  {/* Nhãn trắng CE góc trái trên */}
                  <rect x="12" y="8" width="66" height="18" rx="2" fill="#ffffff" />
                  <text x="58" y="21" fontSize="11" fontWeight="800" fill="#0f172a">CE</text>
                  {/* Mặt nạ xanh dương của bộ sạc */}
                  <rect x="14" y="30" width="186" height="44" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                  {/* Màn hình LCD của bộ sạc */}
                  <rect x="62" y="36" width="72" height="24" rx="2" fill="#0f294a" stroke="#7dd3fc" strokeWidth="0.8" />
                  <text x="98" y="52" textAnchor="middle" fontSize="11" fontWeight="700" fill="#38bdf8" fontFamily="monospace">
                    {formatValueOrDash(tracking.voltage, 1, 'V')}
                  </text>
                  {/* Cổng USB kép bên phải mặt sạc */}
                  <rect x="154" y="38" width="24" height="18" rx="1.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1" />
                  {/* 3 nút bấm tròn dưới màn hình */}
                  <circle cx="76" cy="67" r="3.5" fill="#1e293b" />
                  <circle cx="98" cy="67" r="3.5" fill="#1e293b" />
                  <circle cx="120" cy="67" r="3.5" fill="#1e293b" />
                </g>

                {/* 2. GÓC DƯỚI BÊN TRÁI: BẢNG MẠCH ĐỤC LỖ TRẮNG + ESP32-S3 + 2x INA226 + DS3231 RTC + QUẠT TẢN NHIỆT ĐEN */}
                <g transform="translate(96, 154)">
                  {/* Đế nhựa đục lỗ màu trắng */}
                  <rect x="0" y="0" width="155" height="176" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Module RTC DS3231 (có viên pin cúc áo CR2032 tròn bạc) */}
                  <rect x="42" y="8" width="44" height="26" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
                  <circle cx="64" cy="21" r="9" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />

                  {/* 2 Module đo dòng/áp INA226 (mạch màu xanh dương nhỏ) */}
                  <rect x="14" y="44" width="34" height="24" rx="2" fill="#0284c7" stroke="#bae6fd" strokeWidth="1" />
                  <text x="31" y="59" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ffffff">INA226 #1</text>

                  <rect x="58" y="44" width="34" height="24" rx="2" fill="#0284c7" stroke="#bae6fd" strokeWidth="1" />
                  <text x="75" y="59" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ffffff">INA226 #2</text>

                  {/* Mạch chính ESP32-S3 DevKit trên đế Domino xanh lá */}
                  <rect x="52" y="82" width="88" height="78" rx="3" fill="#15803d" stroke="#166534" strokeWidth="1.2" />
                  <rect x="64" y="92" width="64" height="58" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  <rect x="76" y="102" width="40" height="28" rx="1.5" fill="#cbd5e1" />
                  <text x="96" y="120" textAnchor="middle" fontSize="8" fontWeight="800" fill="#0f172a">ESP32-S3</text>

                  {/* Quạt tản nhiệt đen góc dưới trái (Cánh quạt quay khi hệ thống Online) */}
                  <rect x="8" y="122" width="42" height="42" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                  <g transform="translate(29, 143)">
                    <circle cx="0" cy="0" r="16" fill="#1e293b" />
                    <g className={isOnline ? ' origin-center animate-spin' : ''} style={{ animationDuration: '3s' }}>
                      <line x1="-12" y1="0" x2="12" y2="0" stroke="#64748b" strokeWidth="3" />
                      <line x1="0" y1="-12" x2="0" y2="12" stroke="#64748b" strokeWidth="3" />
                    </g>
                    <circle cx="0" cy="0" r="5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  </g>
                </g>

                {/* 3. GÓC DƯỚI BÊN PHẢI: 2 BỘ DRIVER ĐỘNG Cơ BƯỚC (CÓ HÀNG CỌC ĐẤU DÂY XANH LÁ) */}
                <g transform="translate(268, 154)">
                  {/* Driver 1 (Trục Phương vị) */}
                  <rect x="0" y="0" width="66" height="168" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                  {/* Cọc đấu dây xanh lá đặc trưng (Green Terminal Blocks) */}
                  <rect x="8" y="18" width="22" height="52" rx="1.5" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <rect x="8" y="96" width="22" height="52" rx="1.5" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <text x="46" y="90" textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8" transform="rotate(-90, 46, 90)">
                    DRIVER TRỤC 1
                  </text>

                  {/* Driver 2 (Trục Độ ngửa) */}
                  <rect x="78" y="0" width="66" height="168" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                  <rect x="86" y="18" width="22" height="52" rx="1.5" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <rect x="86" y="96" width="22" height="52" rx="1.5" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <text x="124" y="90" textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8" transform="rotate(-90, 124, 90)">
                    DRIVER TRỤC 2
                  </text>
                </g>

                {/* Đường dây tín hiệu xanh dương & đỏ nối giữa ESP32, Sạc và Driver */}
                <path d="M 190 250 Q 240 210 280 195" fill="none" stroke="#2563eb" strokeWidth="2" />
                <path d="M 190 265 Q 255 245 355 205" fill="none" stroke="#ef4444" strokeWidth="2" />
                <path d="M 150 195 Q 160 155 200 135" fill="none" stroke="#2563eb" strokeWidth="1.8" />

                {/* 4. ĂNG-TEN ĐEN GẮN TRÊN THÀNH HỘP ĐIỆN PHÍA DƯỚI */}
                <g transform="translate(235, 355)">
                  <rect x="-8" y="-4" width="16" height="10" rx="2" fill="#1e293b" />
                  <line x1="0" y1="4" x2="52" y2="-32" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />
                  <text x="68" y="-18" fontSize="10.5" fontWeight="800" className="fill-emerald-700 dark:fill-emerald-400">
                    Ăng-ten WiFi 2.4GHz ({isOnline ? 'Đang phát trực tiếp' : 'Ngoại tuyến'})
                  </text>
                </g>

                {/* BẢNG THÔNG SỐ TRẠNG THÁI TRONG HỘP ĐIỆN (BÊN PHẢI) */}
                <g transform="translate(468, 36)">
                  <rect x="0" y="0" width="268" height="325" rx="6" className="fill-white/95 dark:fill-slate-900/95" stroke="#cbd5e1" strokeWidth="1.2" />
                  <text x="16" y="26" fontSize="12" fontWeight="800" className="fill-slate-900 dark:fill-white">
                    CẤU HÌNH TỦ ĐIỆN & VI ĐIỀU KHIỂN
                  </text>
                  <line x1="16" y1="36" x2="252" y2="36" stroke="#e2e8f0" strokeWidth="1" />

                  <text x="16" y="60" fontSize="11" fontWeight="700" fill="#0284c7">
                    • Vi điều khiển trung tâm: ESP32-S3
                  </text>
                  <text x="16" y="80" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Trạng thái mạng: {isOnline ? 'Trực tiếp (Cloud RTDB)' : 'Mất kết nối'}
                  </text>
                  <text x="16" y="98" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Độ lệch đồng hồ RTC: {system?.rtcOffsetMs !== null && system?.rtcOffsetMs !== undefined ? formatSignedNumber(system.rtcOffsetMs, 0, 'ms') : '--'}
                  </text>
                  <text x="16" y="116" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Nhiệt độ trong hộp (DS3231): {system?.rtcTemp !== null && system?.rtcTemp !== undefined ? `${Number(system.rtcTemp).toFixed(1)} °C` : '--'}
                  </text>

                  <text x="16" y="148" fontSize="11" fontWeight="700" fill="#15803d">
                    • Khối đo lường Kép INA226 (I2C)
                  </text>
                  <text x="16" y="168" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Kênh 1 (Tracker): {formatValueOrDash(tracking.voltage, 2, 'V')} | {formatValueOrDash(tracking.current, 2, 'A')} | {formatValueOrDash(tracking.power, 1, 'W')}
                  </text>
                  <text x="16" y="186" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Kênh 2 (Cố định): {formatValueOrDash(stat.voltage, 2, 'V')} | {formatValueOrDash(stat.current, 2, 'A')} | {formatValueOrDash(stat.power, 1, 'W')}
                  </text>

                  <text x="16" y="218" fontSize="11" fontWeight="700" fill="#d97706">
                    • Khối Công suất & Truyền động
                  </text>
                  <text x="16" y="238" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    2x Driver Động cơ bước (Trục φ & Trục ε)
                  </text>
                  <text x="16" y="256" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Bộ điều khiển sạc Solar PWM (Bảo vệ nạp)
                  </text>
                  <text x="16" y="274" fontSize="10.5" className="fill-slate-700 dark:fill-slate-300">
                    Cờ cảnh báo mất bước: {system?.errors?.stepLossWarn ? 'Có cảnh báo' : '0 bước (Đồng bộ tốt)'}
                  </text>

                  <g transform="translate(16, 290)">
                    <rect x="0" y="0" width="236" height="24" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                    <text x="118" y="15" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1d4ed8">
                      Giải thuật: {system?.activeAlgorithm || 'HYBRID (Thiên văn + Fuzzy/PSO)'}
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          )}

          {/* Thanh chọn nhanh điểm kiểm tra dưới chân mô hình */}
          <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-zinc-500 dark:text-slate-400 font-medium">Điểm đang chọn:</span>
              <button
                onClick={() => { setSelectedHotspot('tracker'); setActiveView('overview'); }}
                className={`px-2 py-0.5 rounded-xs cursor-pointer font-semibold ${
                  selectedHotspot === 'tracker' && activeView === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300'
                }`}
              >
                Tấm pin Tracking
              </button>
              <button
                onClick={() => { setSelectedHotspot('mechanism'); setActiveView('mechanism'); }}
                className={`px-2 py-0.5 rounded-xs cursor-pointer font-semibold ${
                  activeView === 'mechanism'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300'
                }`}
              >
                Trụ xoay & Đai răng
              </button>
              <button
                onClick={() => { setSelectedHotspot('box'); setActiveView('controlbox'); }}
                className={`px-2 py-0.5 rounded-xs cursor-pointer font-semibold ${
                  activeView === 'controlbox'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300'
                }`}
              >
                Hộp điện & Ăng-ten
              </button>
              <button
                onClick={() => { setSelectedHotspot('static'); setActiveView('overview'); }}
                className={`px-2 py-0.5 rounded-xs cursor-pointer font-semibold ${
                  selectedHotspot === 'static' && activeView === 'overview'
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300'
                }`}
              >
                Tấm pin Cố định
              </button>
            </div>

            <div className="flex items-center gap-3 text-zinc-600 dark:text-slate-300 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <TbWifi className="w-3.5 h-3.5 text-emerald-500" />
                {isOnline ? 'Trực tiếp' : 'Ngoại tuyến'}
              </span>
              <span className="flex items-center gap-1">
                <TbTemperature className="w-3.5 h-3.5 text-amber-500" />
                RTC: {system?.rtcTemp !== null && system?.rtcTemp !== undefined ? `${Number(system.rtcTemp).toFixed(1)}°C` : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4 COLS): BẢNG ĐỐI CHỨNG GỌN (COMPACT TELEMETRY) & THAO TÁC NHANH */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          {/* Thẻ 1: Tấm Tracker (Trục kép) */}
          <div className="lab-card p-3.5 border-t-2 border-t-blue-600 dark:border-t-sky-400 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${trkBadge.dotColor}`} />
                <h3 className="text-xs sm:text-sm font-bold text-blue-700 dark:text-sky-300">
                  Tấm Tracker (Trục kép)
                </h3>
              </div>
              <span className={`text-[11px] font-semibold ${trkBadge.textColor}`}>
                {trkBadge.text}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbBolt className="w-3.5 h-3.5 text-amber-500" /> Công suất (P)
                </span>
                <span className="text-base font-bold text-blue-700 dark:text-sky-300 font-mono block mt-0.5">
                  {formatValueOrDash(tracking.power, 1, 'W')}
                </span>
              </div>
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbBatteryCharging className="w-3.5 h-3.5 text-blue-500" /> Sản lượng (ΣE)
                </span>
                <span className="text-base font-bold text-blue-700 dark:text-sky-300 font-mono block mt-0.5">
                  {formatValueOrDash(tracking.energyWh, 1, 'Wh')}
                </span>
              </div>
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbCircuitVoltmeter className="w-3.5 h-3.5 text-sky-500" /> Điện áp / Dòng
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono block mt-0.5">
                  {formatValueOrDash(tracking.voltage, 2, 'V')} / {formatValueOrDash(tracking.current, 2, 'A')}
                </span>
              </div>
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbCompass className="w-3.5 h-3.5 text-indigo-500" /> Góc cơ cấu (φ | ε)
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono block mt-0.5">
                  {formatSignedNumber(effectivePhi, 1, '°')} | {formatValueOrDash(effectiveEps, 1, '°')}
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ 2: Tấm Cố định (Nam, ngửa 75°) */}
          <div className="lab-card p-3.5 border-t-2 border-t-amber-600 dark:border-t-amber-400 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${staBadge.dotColor}`} />
                <h3 className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
                  Tấm Cố định (Nam 180°, ngửa 75°)
                </h3>
              </div>
              <span className={`text-[11px] font-semibold ${staBadge.textColor}`}>
                {staBadge.text}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbBolt className="w-3.5 h-3.5 text-amber-500" /> Công suất (P)
                </span>
                <span className="text-base font-bold text-amber-800 dark:text-amber-300 font-mono block mt-0.5">
                  {formatValueOrDash(stat.power, 1, 'W')}
                </span>
              </div>
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbBatteryCharging className="w-3.5 h-3.5 text-amber-500" /> Sản lượng (ΣE)
                </span>
                <span className="text-base font-bold text-amber-800 dark:text-amber-300 font-mono block mt-0.5">
                  {formatValueOrDash(stat.energyWh, 1, 'Wh')}
                </span>
              </div>
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbCircuitVoltmeter className="w-3.5 h-3.5 text-amber-500" /> Điện áp / Dòng
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono block mt-0.5">
                  {formatValueOrDash(stat.voltage, 2, 'V')} / {formatValueOrDash(stat.current, 2, 'A')}
                </span>
              </div>
              <div className="p-2 rounded-sm bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-zinc-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <TbCompass className="w-3.5 h-3.5 text-amber-500" /> Góc lắp đặt
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono block mt-0.5">
                  Nam 180° | Ngửa 75°
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ 3: Hiệu suất cải thiện % Gain & Các nút điều khiển nhanh */}
          <div className="lab-card p-3.5 space-y-3 bg-gradient-to-br from-white via-blue-50/20 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/25">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-slate-200 flex items-center gap-1.5">
                <TbTrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Chênh lệch năng lượng (k = 1,018):</span>
              </span>
              {hasValidGain ? (
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatSignedNumber(comparison.percentGain, 1, '%')}
                </span>
              ) : (
                <span className="text-xs italic text-zinc-500 dark:text-slate-400">
                  Chờ đủ ngưỡng 5,0 Wh
                </span>
              )}
            </div>

            {/* Cụm nút thao tác nhanh giữ nguyên chức năng */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200 dark:border-slate-800">
              {isAdmin && (
                <>
                  <button
                    onClick={onOpenManualModal}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <TbAdjustmentsHorizontal className="w-3.5 h-3.5" />
                    <span>Điều khiển</span>
                  </button>
                  <button
                    onClick={onOpenEmergencyModal}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                      system?.emergencyActive
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-red-700 hover:bg-red-800 text-white'
                    }`}
                  >
                    <TbAlertOctagon className="w-3.5 h-3.5" />
                    <span>{system?.emergencyActive ? 'Mở khóa' : 'Dừng khẩn'}</span>
                  </button>
                </>
              )}
              <button
                onClick={onOpenDetails}
                className="px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100 bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <TbFileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                <span>Chi tiết máy</span>
              </button>
              {isAdmin && (
                <button
                  onClick={onOpenSettingsModal}
                  className="px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100 bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <TbSettings className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Cài đặt</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
