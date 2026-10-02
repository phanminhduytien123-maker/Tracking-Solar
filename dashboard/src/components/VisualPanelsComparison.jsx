import React from 'react';
import { TrendingUp, Info, Compass, Zap, Lock, ShieldCheck, Sun } from 'lucide-react';

export default function VisualPanelsComparison({
  ina219,
  motors,
  onOpenDetails,
  onOpenManual
}) {
  const tracking = ina219?.tracking || { voltage: 0, current: 0, power: 0, energyKwh: 0 };
  const stat = ina219?.static || { voltage: 0, current: 0, power: 0, energyKwh: 0 };
  const comparison = ina219?.comparison || { percentGain: 0, powerDelta: 0 };

  const az = motors?.azimuth || { currentAngle: 180, targetAngle: 180 };
  const el = motors?.elevation || { currentAngle: 45, targetAngle: 45 };

  // Calculate 3D tilt angles for the tracking panel image
  const azRelSouth = az.currentAngle - 180;
  const rotateYDeg = Math.max(-32, Math.min(32, (azRelSouth / 90) * 28));
  const rotateXDeg = Math.max(5, Math.min(45, 10 + (el.currentAngle / 90) * 30));

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* MOBILE QUICK KPI STRIP (Hiển thị ngay đầu trên điện thoại) */}
      <div className="lg:hidden grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-2xl shadow-lg">
        
        {/* Metric 1: Tấm Xoay */}
        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-sky-300 block truncate">
            TẤM XOAY
          </span>
          <div className="my-1">
            <span className="text-lg font-black font-mono text-white block leading-none">
              {tracking.power.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-sky-300">W</span>
          </div>
          <span className="text-[9px] font-mono text-white/60 block">
            {tracking.voltage.toFixed(1)}V
          </span>
        </div>

        {/* Metric 2: Chênh lệch Gain % */}
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center flex flex-col justify-between shadow-inner">
          <span className="text-[10px] font-black uppercase text-emerald-300 block flex items-center justify-center gap-0.5 truncate">
            <TrendingUp className="w-2.5 h-2.5" /> GAIN
          </span>
          <div className="my-1">
            <span className="text-xl font-black font-mono text-emerald-300 block leading-none">
              {comparison.percentGain >= 0 ? `+${comparison.percentGain.toFixed(1)}` : comparison.percentGain.toFixed(1)}%
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-emerald-200 block">
            {comparison.powerDelta >= 0 ? `+${comparison.powerDelta.toFixed(1)}W` : `${comparison.powerDelta.toFixed(1)}W`}
          </span>
        </div>

        {/* Metric 3: Tấm Cố Định */}
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-amber-300 block truncate">
            CỐ ĐỊNH
          </span>
          <div className="my-1">
            <span className="text-lg font-black font-mono text-white block leading-none">
              {stat.power.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-amber-300">W</span>
          </div>
          <span className="text-[9px] font-mono text-white/60 block">
            {stat.voltage.toFixed(1)}V
          </span>
        </div>

      </div>

      {/* 2 PANELS HERO COMPARISON GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">

        {/* 1. TẤM PIN TRACKING (CHUYỂN ĐỘNG 2 TRỤC) - 5 COLS */}
        <div className="lg:col-span-5 panel-card flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden group shadow-lg">

          {/* Cyan Top Line */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-sky-400"></div>

          {/* Top Header Row */}
          <div className="pb-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                Tấm Pin Tracking
              </h2>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-500/20 text-sky-200 border border-sky-400/30">
              2 TRỤC XOAY
            </span>
          </div>

          {/* 3D VISUAL PANEL CONTAINER */}
          <div className="my-2 sm:my-3 py-2 sm:py-4 flex flex-col items-center justify-center relative min-h-[190px] sm:min-h-[230px]">

            {/* Background Perspective Grid Floor */}
            <div className="absolute inset-x-6 bottom-2 sm:bottom-4 h-28 sm:h-32 border border-zinc-800/30 rounded-full bg-gradient-to-t from-zinc-900/30 to-transparent pointer-events-none transform rotate-x-60 scale-90"></div>

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

            {/* Dynamic Motor Angles Tag */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 z-10">
              <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-black/40 border border-white/20 text-zinc-200 shadow-md flex items-center gap-1.5 backdrop-blur-xl">
                <span className="text-sky-300 text-[10px] sm:text-xs font-black tracking-wider">GÓC AZ:</span>
                <span className="text-white text-sm sm:text-base font-black font-mono">{az.currentAngle.toFixed(1)}°</span>
              </div>
              <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-black/40 border border-white/20 text-zinc-200 shadow-md flex items-center gap-1.5 backdrop-blur-xl">
                <span className="text-sky-300 text-[10px] sm:text-xs font-black tracking-wider">GÓC EL:</span>
                <span className="text-white text-sm sm:text-base font-black font-mono">{el.currentAngle.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* POWER TELEMETRY HERO */}
          <div className="pt-3.5 border-t border-white/10 flex items-end justify-between">
            <div>
              <span className="text-[11px] sm:text-xs uppercase text-white/60 font-bold block tracking-wider">
                Công suất tức thời (P)
              </span>
              <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
                <span className="text-3xl sm:text-5xl font-mono font-black text-white tracking-tight">
                  {tracking.power.toFixed(1)}
                </span>
                <span className="text-sm sm:text-lg font-bold text-sky-400">W</span>
              </div>
            </div>

            <button
              onClick={onOpenDetails}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Info className="w-3.5 h-3.5 text-white/80" />
              <span>Chi tiết</span>
            </button>
          </div>
        </div>

        {/* 2. CHÊNH LỆCH HIỆU SUẤT TRUNG TÂM (% GAIN) - 2 COLS (Desktop only center card) */}
        <div className="hidden lg:flex lg:col-span-2 panel-card flex-col justify-between p-4 sm:p-5 text-center relative overflow-hidden shadow-lg border-emerald-500/30 bg-emerald-950/10">

          <div className="pb-2.5 border-b border-white/10">
            <span className="text-xs sm:text-sm text-emerald-300 uppercase tracking-wider block font-extrabold flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" /> Hiệu Suất
            </span>
          </div>

          <div className="my-auto py-4 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 mb-3 shadow-md shadow-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-mono font-black text-emerald-300 tracking-tight">
              {comparison.percentGain >= 0 ? `+${comparison.percentGain.toFixed(1)}` : comparison.percentGain.toFixed(1)}%
            </span>
            <span className="text-sm sm:text-base font-mono text-emerald-200 mt-1.5 font-bold">
              {comparison.powerDelta >= 0 ? `+${comparison.powerDelta.toFixed(1)}W` : `${comparison.powerDelta.toFixed(1)}W`}
            </span>
          </div>

          <div className="pt-2.5 border-t border-white/10">
            <span className="text-xs text-white/60 font-semibold block">
              Tối ưu Fuzzy-PID
            </span>
          </div>
        </div>

        {/* 3. TẤM PIN CỐ ĐỊNH - 5 COLS */}
        <div className="lg:col-span-5 panel-card flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden shadow-lg">

          {/* Amber Top Line */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-amber-400"></div>

          {/* Top Header Row */}
          <div className="pb-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                TẤM PIN CỐ ĐỊNH
              </h2>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
              HƯỚNG NAM 15°
            </span>
          </div>

          {/* Static Solar Panel Image Container */}
          <div className="my-2 sm:my-3 py-2 sm:py-4 flex flex-col items-center justify-center relative min-h-[190px] sm:min-h-[230px]">

            <div className="absolute inset-x-6 bottom-2 sm:bottom-4 h-28 sm:h-32 border border-zinc-800/30 rounded-full bg-gradient-to-t from-zinc-900/30 to-transparent pointer-events-none transform rotate-x-60 scale-90"></div>

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
              <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-black/40 border border-white/20 text-zinc-300 shadow-md flex items-center gap-1.5 backdrop-blur-xl">
                <span className="text-amber-300 text-[10px] sm:text-xs font-black tracking-wider">GÓC CỐ ĐỊNH:</span>
                <span className="text-white text-sm sm:text-base font-black font-mono">180° / 15°</span>
              </div>
            </div>
          </div>

          {/* POWER TELEMETRY HERO */}
          <div className="pt-3.5 border-t border-white/10 flex items-end justify-between">
            <div>
              <span className="text-[11px] sm:text-xs uppercase text-white/60 font-bold block tracking-wider">
                Công suất tức thời (P)
              </span>
              <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
                <span className="text-3xl sm:text-5xl font-mono font-black text-white tracking-tight">
                  {stat.power.toFixed(1)}
                </span>
                <span className="text-sm sm:text-lg font-bold text-amber-400">W</span>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-white/70">
              <span className="block text-[10px] text-white/50">Điện áp đo được</span>
              <span className="font-bold text-sm text-white">{stat.voltage.toFixed(2)} V</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
