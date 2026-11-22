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
      <div className="border-t border-zinc-200 dark:border-slate-800 bg-zinc-50/90 dark:bg-slate-950/85 text-xs text-zinc-600 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          {/* Cụm trái: Chế độ, Trạng thái, Kết nối ESP1/ESP2 & Ping */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Chế độ vận hành */}
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 dark:text-slate-400">Chế độ:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {mode === 'AUTO' ? 'Tự động' : mode === 'MANUAL' ? 'Thủ công' : mode}
              </span>
            </div>

            <span className="hidden md:block h-3.5 w-px bg-zinc-200 dark:bg-slate-800" aria-hidden="true" />

            {/* Trạng thái vận hành */}
            <span
              title="Trạng thái vận hành hiện tại"
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                system?.displayState && system?.displayState.includes('GIỮ BƯỚC')
                  ? 'text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-sky-950/60 border-blue-200/80 dark:border-sky-800/60 font-mono'
                  : system?.displayState && system?.displayState.includes('ĐIỀU CHỈNH')
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60 font-mono animate-pulse'
                    : 'text-zinc-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-700'
              }`}
            >
              {system?.displayState || 'Bình thường'}
            </span>

            <span className="hidden md:block h-3.5 w-px bg-zinc-200 dark:bg-slate-800" aria-hidden="true" />

            {/* Kết nối, trạng thái ESP1/ESP2 & độ trễ Ping */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isOnline
                    ? system?.connStatus === 'STALE'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/35'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/35'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/35'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isOnline && (
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        system?.connStatus === 'STALE' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isOnline
                        ? system?.connStatus === 'STALE'
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-rose-600 dark:bg-rose-400'
                    }`}
                  />
                </span>
                <span>
                  {isOnline
                    ? system?.connStatus === 'STALE'
                      ? 'Trễ tín hiệu'
                      : 'Trực tuyến'
                    : 'Mất kết nối'}
                </span>
              </span>

              {dataSource === 'firebase' && (
                <div className="inline-flex items-center gap-2 text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-slate-300">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        system?.esp1Online !== false && isOnline
                          ? 'bg-emerald-500'
                          : 'bg-zinc-400 dark:bg-slate-600'
                      }`}
                    />
                    <span>ESP1</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-slate-300">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        system?.esp2Online
                          ? 'bg-emerald-500'
                          : 'bg-zinc-400 dark:bg-slate-600'
                      }`}
                    />
                    <span>ESP2</span>
                  </span>
                </div>
              )}

              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-semibold ${
                  !isOnline || system?.pingMs === null || system?.pingMs === undefined
                    ? 'text-zinc-400 dark:text-slate-500'
                    : Number(system.pingMs) <= 80
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : Number(system.pingMs) <= 200
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-rose-700 dark:text-rose-400'
                }`}
                title="Độ trễ phản hồi thực tế (Ping RTT) giữa trình duyệt và hệ thống Cloud/ESP32"
              >
                <span className="font-sans font-normal text-zinc-500 dark:text-slate-400">Ping</span>
                <span>
                  {isOnline && system?.pingMs !== null && system?.pingMs !== undefined
                    ? `${Math.round(Number(system.pingMs))} ms`
                    : '-- ms'}
                </span>
              </span>
            </div>
          </div>

          {/* Cụm phải: Đèn, Lệch RTC & Đồng hồ */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-auto">
            {/* Trạng thái Đèn (Relay Kênh 5 - Relay E) */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                system?.lamp12vOn
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/35'
                  : 'bg-white text-zinc-700 border-zinc-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  system?.lamp12vOn
                    ? 'bg-amber-500 dark:bg-amber-400 animate-pulse'
                    : 'bg-zinc-400 dark:bg-slate-500'
                }`}
              />
              <span>Đèn: {system?.lamp12vOn ? 'Bật' : 'Tắt'}</span>
              {system?.lampAutoDisabled ? (
                <span className="font-normal opacity-75">(Thủ công)</span>
              ) : (
                system?.lampRemainSec !== null &&
                system?.lampRemainSec !== undefined &&
                system?.lampRemainSec > 0 && (
                  <span className="font-mono font-medium opacity-85">
                    ({Math.floor(Number(system.lampRemainSec) / 60).toString().padStart(2, '0')}:
                    {(Number(system.lampRemainSec) % 60).toString().padStart(2, '0')})
                  </span>
                )
              )}
            </span>

            <span className="hidden md:block h-3.5 w-px bg-zinc-200 dark:bg-slate-800" aria-hidden="true" />

            {/* Sai lệch RTC */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-zinc-500 dark:text-slate-400">Lệch RTC:</span>
              <span className="font-mono tabular-nums font-medium text-zinc-800 dark:text-slate-200">
                {system?.rtcOffsetMs !== null && system?.rtcOffsetMs !== undefined
                  ? formatSignedNumber(system.rtcOffsetMs, 0, 'ms')
                  : '--'}
              </span>
            </div>

            <span className="hidden md:block h-3.5 w-px bg-zinc-200 dark:bg-slate-800" aria-hidden="true" />

            {/* Đồng hồ thực địa */}
            <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
              <span className="font-semibold text-zinc-900 dark:text-white">{formattedTime}</span>
              <span className="text-zinc-300 dark:text-slate-700">·</span>
              <span className="text-zinc-500 dark:text-slate-400">{formattedDate}</span>
            </div>
          </div>

          {/* Cảnh báo sự cố nếu có */}
          {hasAlarm && (
            <div className="w-full pt-1 mt-0.5 border-t border-red-200/70 dark:border-rose-900/50 flex flex-wrap items-center gap-2 text-[11px] text-red-700 dark:text-rose-400 font-semibold">
              <span>Sự cố:</span>
              {system?.estop && <span>[Dừng khẩn cấp]</span>}
              {system?.errors?.driverFault && <span>[Lỗi driver động cơ]</span>}
              {system?.errors?.stepLossWarn && <span className="text-amber-700 dark:text-amber-300">[Mất bước động cơ]</span>}
              {system?.errors?.sensorLost && <span>[Mất cảm biến]</span>}
              {system?.estop && onResetEstop && (
                <button
                  onClick={onResetEstop}
                  className="ml-1 underline hover:text-red-900 dark:hover:text-rose-200 cursor-pointer"
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
