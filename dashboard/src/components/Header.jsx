import React, { useState, useEffect } from 'react';
import { Sliders, Settings, LogOut, ShieldCheck, CloudSun } from 'lucide-react';
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
    <header className="bg-white/90 backdrop-blur-md border-b border-zinc-200 text-zinc-900 sticky top-0 z-40">
      {/* 1. DÒNG TIÊU ĐỀ CHÍNH VÀ CÁC THAO TÁC */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Khối bên trái: Logo TĐT và Tiêu đề đề tài in hoa */}
        <div className="flex items-center gap-3">
          <img
            src="/tdt_logo.png"
            alt="Logo TĐT"
            className="h-10 w-auto object-contain shrink-0"
          />
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-zinc-950 tracking-wide uppercase leading-snug">
            ỨNG DỤNG FUZZY LOGIC VÀ PSO TRONG ĐIỀU HƯỚNG PIN NĂNG LƯỢNG MẶT TRỜI
          </h1>
        </div>

        {/* Khối bên phải: Thời tiết + Các nút thao tác */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Thời tiết (phong cách hiển thị kỹ thuật nhẹ nhàng, không emoji/glow) */}
          {weatherData && (
            <button
              onClick={onOpenMapModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-sm cursor-pointer transition-colors"
              title="Nhấn để xem cấu hình tọa độ trạm và thời tiết chi tiết"
            >
              <CloudSun className="w-3.5 h-3.5 text-zinc-500" />
              <span>Thời tiết:</span>
              <span className="font-semibold text-zinc-900">
                {currentTemp !== undefined ? `${String(currentTemp).replace('.', ',')} °C` : '-- °C'}, {weatherLabel} ({weatherLocation})
              </span>
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
              className="px-3 py-1 text-xs font-semibold text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 rounded-sm cursor-pointer transition-colors"
            >
              Cài đặt
            </button>
          )}

          {/* Đăng xuất */}
          {onLogout && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:text-red-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-sm cursor-pointer transition-colors"
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      {/* 2. DẢI TRẠNG THÁI MỘT DÒNG (STATUS BAR) */}
      <div className="border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-y-1 gap-x-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Chế độ */}
            <div>
              <span>Chế độ: </span>
              <span className="font-semibold text-zinc-900">
                {mode === 'AUTO' ? 'Tự động' : mode === 'MANUAL' ? 'Thủ công' : mode}
              </span>
            </div>

            {/* Trạng thái kết nối */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-red-600'}`} />
              <span>Kết nối: </span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-700' : 'text-red-700'}`}>
                {isOnline ? 'Trực tiếp' : 'Mất kết nối'}
              </span>
            </div>

            {/* Sai lệch RTC */}
            <div>
              <span>Lệch RTC: </span>
              <span className="font-semibold text-zinc-900">
                {system?.rtcOffsetMs !== null && system?.rtcOffsetMs !== undefined
                  ? formatSignedNumber(system.rtcOffsetMs, 0, 'ms')
                  : '--'}
              </span>
            </div>

            {/* Đồng hồ thực địa */}
            <div className="hidden lg:block text-zinc-500">
              <span>Đồng hồ: {formattedTime} ({formattedDate})</span>
            </div>

            {/* Nguồn dữ liệu */}
            <div>
              <span>Nguồn: </span>
              <span className={`font-semibold ${
                system?.isMock || dataSource === 'mock' 
                  ? 'text-red-700' 
                  : system?.source === 'device' 
                    ? 'text-emerald-700' 
                    : 'text-amber-700'
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
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <span>Sự cố:</span>
              {system?.estop && <span>[Dừng khẩn cấp]</span>}
              {system?.errors?.driverFault && <span>[Lỗi driver động cơ]</span>}
              {system?.errors?.stepLossWarn && <span className="text-amber-700">[Mất bước động cơ]</span>}
              {system?.errors?.sensorLost && <span>[Mất cảm biến]</span>}
              {system?.estop && onResetEstop && (
                <button
                  onClick={onResetEstop}
                  className="ml-1 text-[11px] underline hover:text-red-900 cursor-pointer"
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
