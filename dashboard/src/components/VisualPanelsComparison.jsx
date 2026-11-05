import React from 'react';
import { formatSignedNumber, formatValueOrDash, getConnectionStatusBadge, getCompassDirectionName } from '../utils/formatters';

/**
 * BẢNG SO SÁNH ĐO ĐẠC PHÒNG THÍ NGHIỆM
 * Thay thế hai thẻ lớn và mô hình 3D bằng bảng đo đối chứng hai cột trực diện.
 * Quy ước: Tấm tracker (xanh dương #1d4ed8), Tấm cố định (cam #c2410c).
 * Số thập phân: Dấu phẩy kiểu Việt Nam.
 */
export default function VisualPanelsComparison({
  INA226,
  motors,
  onOpenDetails,
  isAdmin = true,
  system = null,
  onOpenEmergencyModal,
  onOpenManualModal,
  onOpenSettingsModal
}) {
  const tracking = INA226?.tracking || { voltage: null, current: null, power: null, energyWh: null };
  const stat = INA226?.static || { voltage: null, current: null, power: null, energyWh: null, fixedAzimuth: 180, fixedTiltBeta: 15, fixedElevationEps: 75 };
  const comparison = INA226?.comparison || { percentGain: null, powerDelta: null, hasValidGain: false };

  const az = motors?.azimuth || { currentAngle: null, phi: null };
  const el = motors?.elevation || { currentAngle: null, epsilon: null };

  const phiAngle = az.phi !== undefined && az.phi !== null ? az.phi : az.currentAngle;
  const epsAngle = el.epsilon !== undefined ? el.epsilon : (el.currentAngle !== null ? el.currentAngle : null);

  // Tính phương vị địa lý thực tế (Compass Azimuth) của giàn pin tracker từ cơ cấu (φ, ε):
  // - Switch Home 1 đặt tại Nam (180.0°). Quay ra xa Home ngược KĐH về phía Đông (90.0°).
  // - Sáng (Trước 12h): Heading = 180.0° - φ (Đón nắng Đông -> Nam).
  // - Chiều (Sau 12h): Heading = 360.0° - φ (Trục 1 quay Đông Bắc ~100°, Trục 2 ngửa sau đón nắng Tây).
  const compassAzimuth = (() => {
    if (az.currentAngle !== null && az.currentAngle !== undefined && !isNaN(az.currentAngle)) {
      return Number(az.currentAngle);
    }
    if (phiAngle === null || phiAngle === undefined) return null;
    const hour = new Date().getHours();
    const isAfternoon = hour >= 12;
    let azVal = isAfternoon ? (360.0 - phiAngle) : (180.0 - phiAngle);
    while (azVal < 0) azVal += 360.0;
    while (azVal >= 360.0) azVal -= 360.0;
    return Math.round(azVal * 10) / 10;
  })();

  // Chỉ báo kết nối 2 tấm
  const trkBadge = getConnectionStatusBadge(tracking.connStatus, tracking.staleDurationMs);
  const staBadge = getConnectionStatusBadge(stat.connStatus, stat.staleDurationMs);

  const hasValidGain = comparison.hasValidGain && comparison.percentGain !== null;

  return (
    <div className="lab-card p-4 sm:p-5 space-y-4">
      {/* Tiêu đề khối & Nút mở chi tiết */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
            Bảng so sánh đối chứng hai tấm pin
          </h2>
          <p className="text-xs text-zinc-500 dark:text-slate-300 font-medium mt-0.5">
            Đối chiếu số đo thời gian thực giữa hệ thống quay hai trục và tấm cố định chuẩn
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto mt-1 sm:mt-0 justify-start sm:justify-end">
          {/* 3 nút thao tác dành riêng cho giao diện điện thoại (sm:hidden) do Header ẩn trên mobile */}
          {isAdmin && (
            <>
              {/* Nút Dừng Khẩn Cấp / Phủ Bạt hoặc Mở Khóa */}
              <button
                id="btn-mobile-emergency-cover"
                onClick={onOpenEmergencyModal}
                className={`sm:hidden px-2.5 py-1.5 text-xs font-bold rounded-sm cursor-pointer transition-all flex items-center gap-1 shadow-xs ${
                  system?.emergencyActive
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black animate-pulse border border-amber-300'
                    : 'bg-red-700 hover:bg-red-800 text-white font-bold'
                }`}
                title={system?.emergencyActive ? "Nhấn để nhập mật khẩu mở khóa hệ thống" : "Nhấn để dừng khẩn cấp & hạ góc Max phủ bạt"}
              >
                {system?.emergencyActive ? 'MỞ KHÓA' : 'DỪNG KHẨN CẤP'}
              </button>

              {/* Nút Điều khiển thủ công */}
              <button
                id="btn-mobile-open-manual-control"
                onClick={onOpenManualModal}
                className="sm:hidden px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-sm cursor-pointer transition-colors"
                title="Bảng điều khiển thủ công"
              >
                Điều khiển
              </button>

              {/* Nút Cài đặt */}
              <button
                id="btn-mobile-open-settings"
                onClick={onOpenSettingsModal}
                className="sm:hidden px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer transition-colors"
                title="Cài đặt hệ thống"
              >
                Cài đặt
              </button>
            </>
          )}

          {/* Nút Xem thông số chi tiết (hiển thị trên cả mobile và desktop) */}
          <button
            onClick={onOpenDetails}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-600 rounded-sm cursor-pointer transition-colors"
          >
            Xem thông số chi tiết
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Cột chính: Bảng số liệu hai cột thẳng hàng (9 cols) */}
        <div className="lg:col-span-9 overflow-x-auto">
          <table className="lab-table text-xs sm:text-sm">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-slate-800/90 text-zinc-700 dark:text-slate-200">
                <th className="text-left font-bold py-2.5 px-3 w-1/3 text-zinc-900 dark:text-white">Thông số đo đạc</th>
                <th className="text-left font-bold py-2.5 px-3 w-1/3 text-blue-700 dark:text-sky-300">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${trkBadge.dotColor}`} />
                    <span>Tấm tracker (Trục kép)</span>
                  </div>
                  <span className={`text-xs font-semibold block mt-0.5 ${trkBadge.textColor}`}>
                    {trkBadge.text}
                  </span>
                </th>
                <th className="text-left font-bold py-2.5 px-3 w-1/3 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${staBadge.dotColor}`} />
                    <span>Tấm cố định (Nam, ngửa 75°)</span>
                  </div>
                  <span className={`text-xs font-semibold block mt-0.5 ${staBadge.textColor}`}>
                    {staBadge.text}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
              {/* 1. Công suất tức thời */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Công suất tức thời (P)
                </td>
                <td className="py-2.5 px-3 font-bold text-base sm:text-lg text-blue-700 dark:text-sky-300">
                  {formatValueOrDash(tracking.power, 1, 'W')}
                </td>
                <td className="py-2.5 px-3 font-bold text-base sm:text-lg text-amber-800 dark:text-amber-300">
                  {formatValueOrDash(stat.power, 1, 'W')}
                </td>
              </tr>

              {/* 2. Điện áp */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Điện áp (V)
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(tracking.voltage, 2, 'V')}
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(stat.voltage, 2, 'V')}
                </td>
              </tr>

              {/* 3. Dòng điện */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Dòng điện (I)
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(tracking.current, 2, 'A')}
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(stat.current, 2, 'A')}
                </td>
              </tr>

              {/* 4. Năng lượng tích lũy hôm nay */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Năng lượng hôm nay (ΣE)
                </td>
                <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-sky-300">
                  {formatValueOrDash(tracking.energyWh, 1, 'Wh')}
                </td>
                <td className="py-2.5 px-3 font-bold text-amber-800 dark:text-amber-300">
                  {formatValueOrDash(stat.energyWh, 1, 'Wh')}
                </td>
              </tr>

              {/* 5. Góc định hướng */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Góc định hướng hiện tại
                </td>
                <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                  <div>
                    <span>Quay φ: </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{phiAngle !== null ? formatSignedNumber(phiAngle, 1, '°') : '--'}</span>
                    <span className="mx-2 text-zinc-400 dark:text-slate-500">|</span>
                    <span>Ngửa ε: </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{epsAngle !== null ? formatValueOrDash(epsAngle, 1, '°') : '--'}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                    {compassAzimuth !== null 
                      ? `Phương vị: ${formatSignedNumber(compassAzimuth, 1, '°')} (${getCompassDirectionName(compassAzimuth)})` 
                      : '(Nằm ngang = 90°, dựng đứng = 0°)'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                  <div className="font-medium text-zinc-900 dark:text-white">Hướng Nam 180°, ngửa 75°</div>
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                    (Góc nghiêng cố định 15°)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Dòng kết luận Chênh lệch năng lượng % Gain */}
          <div className="mt-3 p-3 bg-zinc-50 dark:bg-slate-800/90 border border-zinc-200 dark:border-slate-700 rounded-sm flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-slate-200">
              Chênh lệch năng lượng hôm nay (đã hiệu chuẩn k = 1,018):
            </span>
            <div className="text-xs sm:text-sm">
              {hasValidGain ? (
                <span className="font-bold text-zinc-950 dark:text-white text-base">
                  {formatSignedNumber(comparison.percentGain, 1, '%')}
                  {comparison.powerDelta !== null && (
                    <span className="text-xs text-zinc-600 dark:text-slate-300 font-normal ml-2">
                      (chênh lệch tức thời {formatSignedNumber(comparison.powerDelta, 1, 'W')})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-slate-200 font-medium italic">
                  {tracking.connStatus !== 'LIVE' || stat.connStatus !== 'LIVE' 
                    ? 'Chưa đủ dữ liệu (thiết bị mất kết nối)' 
                    : 'Chờ tích lũy đủ ngưỡng 5,0 Wh'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cột phụ: Sơ đồ góc cơ cấu bằng SVG kỹ thuật đơn giản (3 cols) */}
        <div className="lg:col-span-3 border border-zinc-200 dark:border-slate-700 rounded-sm p-3 bg-zinc-50 dark:bg-slate-800/80 flex flex-col items-center justify-between min-h-[220px]">
          <span className="text-xs font-bold text-zinc-800 dark:text-slate-100 self-start">
            Sơ đồ góc cơ cấu (SVG)
          </span>

          <svg viewBox="0 0 140 140" className="w-32 h-32 my-1">
            {/* Vòng tròn tọa độ phương vị */}
            <circle cx="70" cy="70" r="50" className="fill-white dark:fill-slate-900/90 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
            <line x1="70" y1="15" x2="70" y2="125" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="15" y1="70" x2="125" y2="70" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="2,2" />

            {/* Các chữ hướng chính - độ tương phản cao */}
            <text x="70" y="27" textAnchor="middle" fontSize="10" className="fill-slate-600 dark:fill-slate-200" fontWeight="700">B</text>
            <text x="70" y="120" textAnchor="middle" fontSize="10" className="fill-amber-700 dark:fill-amber-400" fontWeight="700">N (180°)</text>
            <text x="24" y="73" textAnchor="middle" fontSize="10" className="fill-slate-600 dark:fill-slate-200" fontWeight="700">T</text>
            <text x="116" y="73" textAnchor="middle" fontSize="10" className="fill-slate-600 dark:fill-slate-200" fontWeight="700">Đ</text>

            {/* Kim chỉ hướng Tấm Cố Định (Nam 180° cố định - nét đứt cam) */}
            <line x1="70" y1="70" x2="70" y2="112" stroke="#ea580c" strokeWidth="1.75" strokeDasharray="3,2" />

            {/* Kim chỉ hướng Tấm Tracker (Xanh dương / xanh sáng nét liền - chỉ đúng hướng la bàn thực tế) */}
            {compassAzimuth !== null || phiAngle !== null ? (() => {
              const displayAz = compassAzimuth !== null ? compassAzimuth : phiAngle;
              const rad = (displayAz - 90) * (Math.PI / 180);
              const x2 = 70 + 44 * Math.cos(rad);
              const y2 = 70 + 44 * Math.sin(rad);
              return (
                <>
                  <line x1="70" y1="70" x2={x2} y2={y2} stroke="#0284c7" strokeWidth="2.5" />
                  <circle cx={x2} cy={y2} r="3" fill="#0284c7" />
                </>
              );
            })() : (
              <line x1="70" y1="70" x2="70" y2="70" stroke="#94a3b8" strokeWidth="1" />
            )}

            {/* Tâm quay */}
            <circle cx="70" cy="70" r="3.5" className="fill-slate-800 dark:fill-slate-200" />
          </svg>

          {/* Chú giải góc cơ cấu & phương vị la bàn */}
          <div className="w-full text-[11px] text-zinc-600 dark:text-slate-300 space-y-1 border-t border-zinc-200 dark:border-slate-700 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-700 dark:text-sky-300 font-semibold">── Tracker:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {compassAzimuth !== null ? `${formatSignedNumber(compassAzimuth, 1, '°')} (${getCompassDirectionName(compassAzimuth)})` : (phiAngle !== null ? `φ: ${formatSignedNumber(phiAngle, 1, '°')}` : '--')}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-slate-400 pl-2">
              <span>Góc cơ cấu:</span>
              <span className="font-mono">{phiAngle !== null ? `φ: ${formatSignedNumber(phiAngle, 1, '°')}` : '--'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-800 dark:text-amber-300 font-semibold">╌╌ Cố định:</span>
              <span className="font-bold text-zinc-900 dark:text-white">Nam 180°</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-700 dark:text-slate-300 font-medium">Độ ngửa ε:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {epsAngle !== null ? formatValueOrDash(epsAngle, 1, '°') : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
