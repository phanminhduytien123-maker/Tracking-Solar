import React, { useState } from 'react';
import { 
  Sun, 
  SunDim, 
  CloudSun, 
  Cloud, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  CloudRainWind, 
  CloudLightning, 
  Moon, 
  CloudMoon, 
  Droplets, 
  Wind, 
  Compass, 
  Gauge, 
  Eye, 
  Sunrise, 
  Sunset, 
  RefreshCw, 
  X, 
  MapPin, 
  Zap,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';

// Render appropriate Lucide icon component dynamically
export function RenderWeatherIcon({ iconName, className = "w-5 h-5", isDay = 1 }) {
  switch (iconName) {
    case 'Sun': return <Sun className={`${className} text-amber-400`} />;
    case 'SunDim': return <SunDim className={`${className} text-amber-300`} />;
    case 'CloudSun': return <CloudSun className={`${className} text-amber-400`} />;
    case 'Cloud': return <Cloud className={`${className} text-slate-300`} />;
    case 'CloudFog': return <CloudFog className={`${className} text-slate-400`} />;
    case 'CloudDrizzle': return <CloudDrizzle className={`${className} text-sky-400`} />;
    case 'CloudRain': return <CloudRain className={`${className} text-blue-400`} />;
    case 'CloudRainWind': return <CloudRainWind className={`${className} text-blue-500`} />;
    case 'CloudLightning': return <CloudLightning className={`${className} text-amber-300 animate-pulse`} />;
    case 'Moon': return <Moon className={`${className} text-indigo-300`} />;
    case 'CloudMoon': return <CloudMoon className={`${className} text-indigo-200`} />;
    default: return isDay ? <Sun className={`${className} text-amber-400`} /> : <Moon className={`${className} text-indigo-300`} />;
  }
}

export default function WeatherWidget({ 
  weatherData, 
  onRefresh, 
  isLoading, 
  customOverrideType, 
  setCustomOverrideType 
}) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const current = weatherData?.current || {};
  const condition = current.condition || { label: 'Đang tải...', icon: 'CloudSun' };

  const weatherPresets = [
    { id: null, label: 'API Thời Tiết Thực Tế', desc: 'Dữ liệu trực tiếp Q.1 HCM từ Open-Meteo', icon: 'Zap' },
    { id: 'clear', label: 'Nắng Gắt Sài Gòn', desc: 'Trời quang, bức xạ cực đại ~1000 W/m²', icon: 'Sun' },
    { id: 'partly_cloudy', label: 'Nắng Mây Đan Xen', desc: 'Quang thông thay đổi, test Fuzzy-PID', icon: 'CloudSun' },
    { id: 'clouds', label: 'Trời Âm U / Mây Dày', desc: 'Bức xạ khuếch tán, test thuật toán PSO', icon: 'Cloud' },
    { id: 'rain', label: 'Mưa Rào Nhiệt Đới', desc: 'Mưa rào làm sạch bụi bề mặt tấm pin', icon: 'CloudRain' },
    { id: 'thunderstorm', label: 'Giông Sét Sấm Chớp', desc: 'Mưa dông lớn, kích hoạt bảo vệ E-Stop', icon: 'CloudLightning' },
    { id: 'golden_hour', label: 'Hoàng Hôn Chiều Tà', desc: 'Mặt trời lặn, pin quay về hướng Đông', icon: 'Sunset' },
    { id: 'night', label: 'Đêm Sài Gòn (Trăng Sao)', desc: 'Chế độ nghỉ ban đêm tiết kiệm điện', icon: 'Moon' },
  ];

  return (
    <>
      {/* 1. COMPACT WEATHER PILL IN HEADER */}
      <div className="flex items-center gap-2">
        <button
          id="btn-open-weather-modal"
          onClick={() => setIsOpenModal(true)}
          className="group flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 hover:border-sky-500/50 backdrop-blur-md transition-all cursor-pointer shadow-sm hover:shadow-sky-500/10 active:scale-95 text-left"
          title="Xem chi tiết thời tiết Quận 1 & điều khiển hiệu ứng nền"
        >
          {/* Weather Icon with subtle pulse */}
          <div className="shrink-0 group-hover:scale-110 transition-transform">
            <RenderWeatherIcon iconName={condition.icon} className="w-5 h-5" isDay={current.isDay} />
          </div>

          {/* Weather Info text */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">
                {current.temp !== undefined ? `${current.temp}°C` : '--°C'}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline-block">
                • {condition.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
              <MapPin className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[110px]">Q.1, TP.HCM</span>
              {customOverrideType ? (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30">
                  Demo
                </span>
              ) : (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live API" />
              )}
            </div>
          </div>
        </button>

        {/* Quick Weather Preset Switcher (Mini Dropdown/Selector Button) */}
        <button
          onClick={() => setIsOpenModal(true)}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Tùy chỉnh hiệu ứng thời tiết nền"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* 2. FULL DETAILED WEATHER MODAL & ATMOSPHERIC DASHBOARD */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-[#0f1219]/95 border border-[#252c3d] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#202738] flex items-center justify-between sticky top-0 bg-[#0f1219]/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <RenderWeatherIcon iconName={condition.icon} className="w-6 h-6" isDay={current.isDay} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Thời Tiết Thực Tế: Quận 1, TP. Hồ Chí Minh
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-normal border border-sky-500/30">
                      Open-Meteo API
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Phường Sài Gòn (Bến Nghé) • Tọa độ 10.7769°N, 106.7009°E • Cập nhật lúc {weatherData?.lastUpdated}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700 disabled:opacity-50"
                  title="Cập nhật lại từ API"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpenModal(false)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* Main Weather Hero Banner */}
              <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-zinc-900/60 to-zinc-950 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                      {current.temp}°C
                      <span className="text-lg sm:text-xl font-normal text-zinc-400 font-mono">
                        Cảm nhận {current.feelsLike}°C
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-sky-300 mt-1">
                      {condition.label}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {condition.description}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end gap-1 text-xs text-zinc-400 font-mono">
                    <span className="px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                      Độ mây che phủ: <b className="text-white">{current.cloudCover}%</b>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                      Lượng mưa: <b className="text-white">{current.precipitation} mm</b>
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Atmospheric Metrics (6-Card Grid) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                  Thông Số Khí Quyển Chi Tiết
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  
                  {/* Humidity */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400">Độ ẩm không khí</div>
                      <div className="text-base font-bold text-white">{current.humidity}%</div>
                    </div>
                  </div>

                  {/* Wind */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                      <Wind className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400">Gió ({current.windDirection}°)</div>
                      <div className="text-base font-bold text-white">{current.windSpeed} km/h</div>
                    </div>
                  </div>

                  {/* UV Index */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400">Chỉ số UV Max</div>
                      <div className="text-base font-bold text-white">{current.uvIndex} / 11</div>
                    </div>
                  </div>

                  {/* Pressure */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400">Áp suất khí quyển</div>
                      <div className="text-base font-bold text-white">{current.surfacePressure} hPa</div>
                    </div>
                  </div>

                  {/* Sunrise */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                      <Sunrise className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400">Bình minh</div>
                      <div className="text-base font-bold text-white">05:41 AM</div>
                    </div>
                  </div>

                  {/* Sunset */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Sunset className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400">Hoàng hôn</div>
                      <div className="text-base font-bold text-white">17:43 PM</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 24-Hour Forecast Scrollable Row */}
              {weatherData?.hourly && weatherData.hourly.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
                    <span>Dự Báo 24 Giờ Tiếp Theo (Quận 1)</span>
                    <span className="text-[11px] text-zinc-400 font-mono">Giờ / Nhiệt độ / Xác suất mưa</span>
                  </h4>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {weatherData.hourly.slice(0, 16).map((h, idx) => (
                      <div 
                        key={idx} 
                        className="flex-shrink-0 w-20 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col items-center text-center gap-1.5"
                      >
                        <span className="text-[11px] font-mono text-zinc-400">{h.time}</span>
                        <RenderWeatherIcon iconName={h.condition.icon} className="w-5 h-5" isDay={h.isDay} />
                        <span className="text-xs font-bold text-white">{h.temp}°</span>
                        <div className="text-[10px] text-sky-400 font-mono flex items-center gap-0.5">
                          <Droplets className="w-2.5 h-2.5" />
                          <span>{h.pop}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR Correlation Card */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Ý Nghĩa Đối Với Đồ Án Hệ Thống Pin Mặt Trời (DATN)</span>
                </div>
                <p className="leading-relaxed text-zinc-400">
                  Dữ liệu thời tiết thực tế từ trạm khí tượng Quận 1 cung cấp thông số quang thông và độ che phủ mây ({current.cloudCover}%). 
                  Khi trời quang đãng, bộ điều khiển <b>Fuzzy-PID</b> bám sát vệt sáng mặt trời; khi mây che phủ bất đối xứng, thuật toán <b>PSO (Particle Swarm Optimization)</b> kích hoạt quét tìm điểm phát điện cực đại toàn cục.
                </p>
              </div>

              {/* Weather Simulation & Demo Controls */}
              <div className="border-t border-[#202738] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Mô Phỏng / Thử Nghiệm Hiệu Ứng Nền (Presentation Mode)
                  </h4>
                  {customOverrideType && (
                    <button
                      onClick={() => setCustomOverrideType(null)}
                      className="text-xs text-sky-400 hover:text-sky-300 underline cursor-pointer"
                    >
                      Quay lại API Thực Tế
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {weatherPresets.map((preset) => {
                    const isSelected = customOverrideType === preset.id;
                    return (
                      <button
                        key={preset.id || 'live'}
                        onClick={() => setCustomOverrideType(preset.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected 
                            ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/10' 
                            : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{preset.label}</span>
                          <RenderWeatherIcon iconName={preset.icon} className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#202738] bg-[#0c0e14] flex items-center justify-between rounded-b-2xl">
              <span className="text-[11px] text-zinc-400">
                Đồ án Tốt Nghiệp: Điều hướng pin mặt trời thông minh • Phường Sài Gòn, Q.1 TP.HCM
              </span>
              <button
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
