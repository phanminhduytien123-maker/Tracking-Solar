import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

export default function VisualPanelsComparison({
  INA226,
  motors,
  onOpenDetails
}) {
  const tracking = INA226?.tracking || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const stat = INA226?.static || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const comparison = INA226?.comparison || { percentGain: 0, powerDelta: 0, hasValidGain: false };

  const az = motors?.azimuth || { currentAngle: 180, targetAngle: 180, phi: 0 };
  const el = motors?.elevation || { currentAngle: 90, targetAngle: 90, epsilon: 90 };

  // Quy ước góc: φ từ công tắc hành trình Azimuth, ε từ mặt phẳng STOW 90°
  const phiAngle = az.phi !== undefined ? az.phi : (az.currentAngle !== undefined ? az.currentAngle - 180 : 0);
  const compassAz = az.currentAngle !== undefined ? az.currentAngle : (180 + phiAngle);
  const epsAngle = el.epsilon !== undefined ? el.epsilon : (el.currentAngle !== undefined ? el.currentAngle : 90);

  // Calculate 3D tilt angles for the tracking panel image
  const rotateYDeg = Math.max(-32, Math.min(32, (phiAngle / 90) * 28));
  const rotateXDeg = Math.max(5, Math.min(45, 10 + ((90 - epsAngle) / 90) * 30));

  // Trạng thái ngủ đông ban đêm (DEEP_SLEEP)
  const isSleeping = tracking.isSleeping || tracking.state === 'DEEP_SLEEP';
  const wakeAt = tracking.wakeAt || '03:00';

  // Ngưỡng tính % Gain từ tích phân năng lượng ngày (>= 5 Wh)
  const hasValidGain = comparison.hasValidGain !== undefined 
    ? comparison.hasValidGain 
    : (stat.energyWh >= 5.0 || (stat.energyKwh && stat.energyKwh >= 0.005));

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* MOBILE QUICK KPI STRIP */}
      <div className="lg:hidden grid grid-cols-3 gap-2 p-2.5 rounded-2xl panel-card shadow-lg">

        {/* Metric 1: Tấm Xoay */}
        <div className="p-2.5 rounded-xl panel-subtle text-center flex flex-col justify-between">
          <div className="flex items-center justify-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isSleeping 
                ? 'bg-indigo-400 animate-pulse' 
                : tracking.online 
                  ? 'bg-emerald-400 animate-pulse' 
                  : 'bg-rose-400'
            }`} />
            <span className="text-[10px] font-bold uppercase text-zinc-300 block truncate">
              {isSleeping ? 'NGỦ ĐÔNG' : 'TẤM XOAY'}
            </span>
          </div>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-white block leading-none">
              {tracking.power.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-zinc-300">W</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">
            {tracking.voltage.toFixed(1)}V
          </span>
        </div>

        {/* Metric 2: Chênh lệch Gain % */}
        <div className="p-2.5 rounded-xl panel-subtle text-center flex flex-col justify-between bg-white/15 border-white/30">
          <span className="text-[10px] font-bold uppercase text-white block truncate">
            HIỆU SUẤT
          </span>
          <div className="my-1">
            {hasValidGain ? (
              <span className="text-xl font-black font-mono text-white block leading-none">
                {comparison.percentGain >= 0 ? `+${comparison.percentGain.toFixed(1)}` : comparison.percentGain.toFixed(1)}%
              </span>
            ) : (
              <span className="text-base font-bold font-mono text-zinc-300 block leading-none">
                -- %
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono font-semibold text-zinc-200 block truncate">
            {hasValidGain ? 'Đã hiệu chuẩn (k=1.018)' : '< 5Wh tích lũy'}
          </span>
        </div>

        {/* Metric 3: Tấm Cố Định */}
        <div className="p-2.5 rounded-xl panel-subtle text-center flex flex-col justify-between">
          <div className="flex items-center justify-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${stat.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="text-[10px] font-bold uppercase text-zinc-300 block truncate">
              CỐ ĐỊNH
            </span>
          </div>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-white block leading-none">
              {stat.power.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-zinc-300">W</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">
            {stat.voltage.toFixed(1)}V
          </span>
        </div>

      </div>

      {/* 2 PANELS HERO COMPARISON GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">

        {/* 1. TẤM PIN TRACKING - 5 COLS */}
        <div className="lg:col-span-5 panel-card flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden group shadow-lg">

          {/* Top Header Row */}
          <div className="pb-3 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-wide uppercase text-white">
                TẤM PIN TRACKING
              </h2>
              {isSleeping ? (
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/50 shadow-sm backdrop-blur-md">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-indigo-300 animate-pulse"></span>
                  <span>🌙 ĐANG NGỦ ĐÔNG ({wakeAt})</span>
                </span>
              ) : tracking.online ? (
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm backdrop-blur-md">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ĐÃ KẾT NỐI</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm backdrop-blur-md">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-400"></span>
                  <span>CHƯA KẾT NỐI</span>
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-zinc-300 font-medium whitespace-nowrap">Fuzzy-PID & PSO</span>
          </div>

          {/* 3D VISUAL PANEL CONTAINER */}
          <div className="my-2 sm:my-3 py-2 sm:py-4 flex flex-col items-center justify-center relative min-h-[190px] sm:min-h-[230px]">

            {/* Background Perspective Grid Floor */}
            <div className="absolute inset-x-6 bottom-2 sm:bottom-4 h-28 sm:h-32 border border-white/10 rounded-full bg-gradient-to-t from-white/10 to-transparent pointer-events-none transform rotate-x-60 scale-90"></div>

            {/* 3D Rotating Solar Panel Image */}
            <div
              className="relative transition-transform duration-500 ease-out z-10 flex items-center justify-center"
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src="/tampin.png"
                alt="Tấm pin mặt trời Tracking"
                className="w-48 sm:w-68 h-auto object-contain drop-shadow-2xl transition-all duration-300"
                style={{
                  transform: `rotateY(${rotateYDeg}deg) rotateX(${rotateXDeg}deg) scale(1.06)`,
                  filter: 'contrast(1.05) brightness(1.04)'
                }}
              />
            </div>

            {/* Dynamic Motor Angles Tag: Hiển thị EL = ε và AZ la bàn = G + H + φ kèm φ từ công tắc */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 z-10">
              <div 
                className="px-3 py-1.5 panel-subtle text-zinc-100 shadow-md flex items-center gap-1.5 cursor-help"
                title={`Góc phương vị AZ = 180° + ${phiAngle >= 0 ? `+${phiAngle.toFixed(1)}` : phiAngle.toFixed(1)}° tính từ công tắc hành trình`}
              >
                <span className="text-zinc-300 text-xs font-bold tracking-wider">AZ:</span>
                <span className="text-white text-sm sm:text-base font-bold font-mono">{compassAz.toFixed(1)}°</span>
                <span className="text-[11px] font-mono text-zinc-300">
                  (φ: {phiAngle >= 0 ? `+${phiAngle.toFixed(1)}` : phiAngle.toFixed(1)}°)
                </span>
              </div>
              <div 
                className="px-3 py-1.5 panel-subtle text-zinc-100 shadow-md flex items-center gap-1.5 cursor-help"
                title="Góc nâng EL = ε (cùng thang đo với góc độ cao mặt trời el_sun)"
              >
                <span className="text-zinc-300 text-xs font-bold tracking-wider">EL:</span>
                <span className="text-white text-sm sm:text-base font-bold font-mono">{epsAngle.toFixed(1)}°</span>
                <span className="text-[11px] font-mono text-zinc-300">(ε)</span>
              </div>
            </div>
          </div>

          {/* POWER TELEMETRY HERO */}
          <div className="pt-3.5 border-t border-white/10 flex items-end justify-between">
            <div>
              <span className="text-xs uppercase text-zinc-300 font-semibold block tracking-wider">
                Công suất tức thời (P)
              </span>
              <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
                <span className="text-3xl sm:text-5xl font-mono font-bold text-white tracking-tight">
                  {tracking.power.toFixed(1)}
                </span>
                <span className="text-sm sm:text-lg font-bold text-zinc-300">W</span>
              </div>
            </div>

            <button
              onClick={onOpenDetails}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 backdrop-blur-md"
            >
              <Info className="w-4 h-4 text-zinc-200" />
              <span>Chi tiết</span>
            </button>
          </div>
        </div>

        {/* 2. CHÊNH LỆCH HIỆU SUẤT TRUNG TÂM (% GAIN) - TÍCH PHÂN NĂNG LƯỢNG - 2 COLS */}
        <div className="hidden lg:flex lg:col-span-2 panel-card flex-col justify-between p-4 sm:p-5 text-center relative overflow-hidden shadow-lg">

          <div className="pb-2.5 border-b border-white/10">
            <span className="text-xs sm:text-sm text-zinc-100 uppercase tracking-wider block font-bold flex items-center justify-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-zinc-300" /> Hiệu Suất
            </span>
          </div>

          <div className="my-auto py-3 flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-full panel-subtle flex items-center justify-center text-white mb-2 shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>

            {hasValidGain ? (
              <>
                <span className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-mono font-black text-white tracking-tight">
                  {comparison.percentGain >= 0 ? `+${comparison.percentGain.toFixed(1)}` : comparison.percentGain.toFixed(1)}%
                </span>
                <span className="text-xs sm:text-sm font-mono text-zinc-200 mt-1.5 font-bold">
                  {comparison.powerDelta >= 0 ? `+${comparison.powerDelta.toFixed(1)}W` : `${comparison.powerDelta.toFixed(1)}W`}
                </span>
              </>
            ) : (
              <div className="py-2">
                <span className="text-2xl sm:text-3xl font-mono font-black text-zinc-300 block">
                  -- %
                </span>
                <span className="text-[11px] font-sans text-zinc-300 mt-1 block">
                  Đang tích lũy (&lt; 5 Wh)
                </span>
              </div>
            )}
            
            <span className="text-[10px] font-mono text-zinc-300 mt-2 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
              Đã hiệu chuẩn (k=1.018)
            </span>
          </div>

          <div className="pt-2.5 border-t border-white/10">
            <span className="text-[11px] text-zinc-300 font-medium block">
              Tích phân năng lượng ΣE
            </span>
          </div>
        </div>

        {/* 3. TẤM PIN CỐ ĐỊNH - 5 COLS */}
        <div className="lg:col-span-5 panel-card flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden shadow-lg">

          {/* Top Header Row */}
          <div className="pb-3 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-wide uppercase text-white">
                TẤM PIN CỐ ĐỊNH
              </h2>
              {stat.online ? (
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm backdrop-blur-md">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ĐÃ KẾT NỐI</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm backdrop-blur-md">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-400"></span>
                  <span>CHƯA KẾT NỐI</span>
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-zinc-300 font-medium whitespace-nowrap">South 180° / 15°</span>
          </div>

          {/* Static Solar Panel Image Container */}
          <div className="my-2 sm:my-3 py-2 sm:py-4 flex flex-col items-center justify-center relative min-h-[190px] sm:min-h-[230px]">

            <div className="absolute inset-x-6 bottom-2 sm:bottom-4 h-28 sm:h-32 border border-white/10 rounded-full bg-gradient-to-t from-white/10 to-transparent pointer-events-none transform rotate-x-60 scale-90"></div>

            <div
              className="relative z-10 flex items-center justify-center"
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src="/tampin.png"
                alt="Tấm pin mặt trời Cố định"
                className="w-48 sm:w-68 h-auto object-contain drop-shadow-2xl opacity-80"
                style={{
                  transform: 'rotateY(0deg) rotateX(18deg) scale(1.04)',
                  filter: 'grayscale(0.2) contrast(0.95)'
                }}
              />
            </div>

            <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 z-10">
              <div className="px-3.5 py-1.5 panel-subtle text-zinc-200 shadow-md flex items-center gap-2">
                <span className="text-zinc-300 text-xs font-bold tracking-wider">GÓC CỐ ĐỊNH:</span>
                <span className="text-white text-sm sm:text-base font-bold font-mono">180° / 15°</span>
              </div>
            </div>
          </div>

          {/* POWER TELEMETRY HERO */}
          <div className="pt-3.5 border-t border-white/10 flex items-end justify-between">
            <div>
              <span className="text-xs uppercase text-zinc-300 font-semibold block tracking-wider">
                Công suất tức thời (P)
              </span>
              <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
                <span className="text-3xl sm:text-5xl font-mono font-bold text-white tracking-tight">
                  {stat.power.toFixed(1)}
                </span>
                <span className="text-sm sm:text-lg font-bold text-zinc-300">W</span>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-zinc-300">
              <span className="block text-xs text-zinc-300 font-medium">Điện áp đo được</span>
              <span className="font-bold text-sm text-white">{stat.voltage.toFixed(2)} V</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

