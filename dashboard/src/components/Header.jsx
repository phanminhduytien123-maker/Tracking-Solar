import React, { useState, useEffect } from 'react';
import { CloudSun } from 'lucide-react';
import { formatSignedNumber } from '../utils/formatters';

export default function Header({
  system = {},
  mode = 'AUTO',
  dataSource = 'firebase',
  firebaseConnected = false,
  currentUser = null,
  onLogout,
  onOpenManualModal,
  onOpenSettingsModal,
  onOpenEmergencyModal,
  onResetEstop,
  weatherData = null,
  isLoadingWeather = false,
  onRefreshWeather = null,
  onOpenMapModal = null
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

  const isAdmin = currentUser?.role === 'admin';

  // Kiểm tra lỗi hệ thống
  const hasAlarm = system?.errors?.sensorLost ||
    system?.errors?.driverFault ||
    system?.errors?.limitSwitchMinTriggered ||
    system?.errors?.limitSwitchMaxTriggered ||
    system?.errors?.stepLossWarn ||
    system?.estop;

  // Trạng thái kết nối chung
  const isOnline = system?.online || (dataSource === 'firebase' && firebaseConnected);

  // Dữ liệu thời tiết hiện tại (được giữ theo yêu cầu người dùng)
  const currentTemp = weatherData?.current?.temp;
  const weatherLabel = weatherData?.current?.condition?.label || 'Bình thường';
  const weatherLocation = weatherData?.location?.split(',')[0] || 'TP.HCM';

  return (
    <header className="hidden sm:block bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-slate-800 text-zinc-900 dark:text-zinc-100 sticky top-0 z-40 transition-colors">
      {/* 1. DÒNG TIÊU ĐỀ CHÍNH VÀ CÁC THAO TÁC */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Khối bên trái: Logo TĐT và Tiêu đề đề tài in hoa */}
        <div className="flex items-center gap-3">
          <img
            src="/tdt_logo.png"
            alt="Logo TĐT"
            className="h-10 w-auto object-contain shrink-0"
          />
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-zinc-950 dark:text-white tracking-wide uppercase leading-snug">
            ỨNG DỤNG FUZZY LOGIC VÀ PSO TRONG ĐIỀU HƯỚNG PIN NĂNG LƯỢNG MẶT TRỜI
          </h1>
        </div>

        {/* Khối bên phải: Thời tiết + Các nút thao tác */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Thời tiết (phong cách hiển thị kỹ thuật nhẹ nhàng, không emoji/glow) */}
          {weatherData && (
            <button
              onClick={onOpenMapModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-slate-800/80 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-200 dark:border-slate-700 rounded-sm cursor-pointer transition-colors"
              title="Nhấn để xem cấu hình tọa độ trạm và thời tiết chi tiết"
            >
              <CloudSun className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Thời tiết:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {currentTemp !== undefined ? `${String(currentTemp).replace('.', ',')} °C` : '-- °C'}, {weatherLabel} ({weatherLocation})
              </span>
            </button>
          )}

          {/* Nút Dừng Khẩn Cấp / Phủ Bạt hoặc Mở Khóa */}
          {isAdmin && (
            <button
              id="btn-emergency-cover"
              onClick={onOpenEmergencyModal}
              className={`px-3 py-1 text-xs font-bold rounded-sm cursor-pointer transition-all flex items-center gap-1 shadow-xs ${system?.emergencyActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black animate-pulse border border-amber-300'
                  : 'bg-red-700 hover:bg-red-800 text-white font-bold'
                }`}
              title={system?.emergencyActive ? "Nhấn để nhập mật khẩu mở khóa hệ thống" : "Nhấn để dừng khẩn cấp & hạ góc Max phủ bạt che mưa bão"}
            >
              {system?.emergencyActive ? 'MỞ KHÓA HOẠT ĐỘNG' : 'DỪNG KHẨN CẤP'}
            </button>
          )}

          {/* Nút Điều khiển thủ công */}
          {isAdmin && (
            <button
              id="btn-open-manual-control"
              onClick={onOpenManualModal}
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-sm cursor-pointer transition-colors"
            >
              Điều khiển
            </button>
          )}

          {/* Nút Cài đặt */}
          {isAdmin && (
            <button
              id="btn-open-settings"
              onClick={onOpenSettingsModal}
              className="px-3 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer transition-colors"
            >
              Cài đặt
            </button>
          )}

          {/* Đăng xuất */}
          {onLogout && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-400 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-200 dark:border-slate-700 rounded-sm cursor-pointer transition-colors"
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      {/* 2. DẢI TRẠNG THÁI MỘT DÒNG (STATUS BAR) */}
      <div className="border-t border-zinc-200 dark:border-slate-800 bg-zinc-50/95 dark:bg-slate-950/90 text-xs text-zinc-600 dark:text-zinc-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-y-1 gap-x-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Chế độ */}
            <div>
              <span>Chế độ: </span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {mode === 'AUTO' ? 'Tự động' : mode === 'MANUAL' ? 'Thủ công' : mode}
              </span>
            </div>

            {/* Trạng thái máy & Đếm ngược thời gian xoay */}
            <div className="flex items-center gap-1">
              <span>Trạng thái: </span>
              <span className={`font-semibold px-1.5 py-0.5 rounded-xs ${system?.displayState && system?.displayState.includes('GIỮ BƯỚC')
                  ? 'text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-sky-950/50 border border-blue-200/70 dark:border-sky-800/60 font-mono'
                  : system?.displayState && system?.displayState.includes('ĐIỀU CHỈNH')
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 font-mono animate-pulse'
                    : 'text-zinc-900 dark:text-white bg-zinc-200/50 dark:bg-slate-800/80'
                }`}>
                {system?.displayState || 'Bình thường'}
              </span>
            </div>

            {/* Trạng thái kết nối */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-red-600 dark:bg-rose-400'}`} />
              </span>
              <span>Kết nối: </span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}`}>
                {isOnline ? 'Trực tiếp' : 'Mất kết nối'}
              </span>
            </div>

            {/* Sai lệch RTC */}
            <div>
              <span>Lệch RTC: </span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {system?.rtcOffsetMs !== null && system?.rtcOffsetMs !== undefined
                  ? formatSignedNumber(system.rtcOffsetMs, 0, 'ms')
                  : '--'}
              </span>
            </div>

            {/* Đồng hồ thực địa */}
            <div className="text-zinc-600 dark:text-slate-300 font-medium">
              <span>Đồng hồ: {formattedTime} ({formattedDate})</span>
            </div>

            {/* Trạng thái Đèn 12V (Relay Kênh 5 - Relay E) đặt ngay cạnh Đồng hồ */}
            <div className="flex items-center gap-1.5">
              <span>Đèn 12V:</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-bold border ${
                  system?.lamp12vOn
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    system?.lamp12vOn
                      ? 'bg-amber-500 dark:bg-amber-400 animate-pulse'
                      : 'bg-zinc-400 dark:bg-slate-500'
                  }`}
                />
                <span>{system?.lamp12vOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>
                {system?.lampAutoDisabled ? (
                  <span className="font-normal text-[11px] opacity-85">(Thủ công)</span>
                ) : (
                  system?.lampRemainSec !== null &&
                  system?.lampRemainSec !== undefined &&
                  system?.lampRemainSec > 0 && (
                    <span className="font-mono font-semibold text-[11px] opacity-90">
                      ({Math.floor(Number(system.lampRemainSec) / 60).toString().padStart(2, '0')}:
                      {(Number(system.lampRemainSec) % 60).toString().padStart(2, '0')})
                    </span>
                  )
                )}
              </span>
            </div>

            {/* Nhiệt độ RTC DS3231 */}
            <div>
              <span>Nhiệt độ RTC: </span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {system?.rtcTemp !== null && system?.rtcTemp !== undefined
                  ? `${Number(system.rtcTemp).toFixed(1)}°C`
                  : '--'}
              </span>
            </div>

            {/* Nguồn dữ liệu */}
            <div>
              <span>Nguồn: </span>
              <span className={`font-semibold ${system?.isMock || dataSource === 'mock'
                  ? 'text-red-700 dark:text-rose-400'
                  : system?.source === 'device'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-300'
                }`}>
                {system?.isMock || dataSource === 'mock'
                  ? 'Dữ liệu giả lập'
                  : system?.source === 'device'
                    ? 'Thiết bị thật'
                    : 'Chưa xác thực nguồn'}
              </span>
            </div>
          </div>

          {/* Cảnh báo sự cố nếu có (hiển thị trực tiếp dạng chữ có màu) */}
          {hasAlarm && (
            <div className="flex items-center gap-2 text-red-700 dark:text-rose-400 font-semibold">
              <span>Sự cố:</span>
              {system?.estop && <span>[Dừng khẩn cấp]</span>}
              {system?.errors?.driverFault && <span>[Lỗi driver động cơ]</span>}
              {system?.errors?.stepLossWarn && <span className="text-amber-700 dark:text-amber-300">[Mất bước động cơ]</span>}
              {system?.errors?.sensorLost && <span>[Mất cảm biến]</span>}
              {system?.estop && onResetEstop && (
                <button
                  onClick={onResetEstop}
                  className="ml-1 text-[11px] underline hover:text-red-900 dark:hover:text-rose-200 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
