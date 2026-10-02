import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

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
    <div className="space-y-4">

      {/* 2 PANELS HERO COMPARISON GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* 1. TẤM PIN TRACKING (CHUYỂN ĐỘNG 2 TRỤC) - 5 COLS */}
        <div className="lg:col-span-5 panel-card flex flex-col justify-between p-5 sm:p-6 relative overflow-hidden group shadow-lg">

          {/* Cyan Top Line (Màu viền 1) */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-sky-400"></div>

          {/* Top Header Row */}
          <div className="pb-3.5 border-b border-[#1f2430]">
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Tấm Pin Tracking
            </h2>
          </div>

          {/* 3D VISUAL PANEL CONTAINER */}
          <div className="my-3 py-4 flex flex-col items-center justify-center relative min-h-[230px]">

            {/* Background Perspective Grid Floor */}
            <div className="absolute inset-x-6 bottom-4 h-32 border border-zinc-800/30 rounded-full bg-gradient-to-t from-zinc-900/30 to-transparent pointer-events-none transform rotate-x-60 scale-90"></div>

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
                className="w-60 sm:w-72 h-auto object-contain drop-shadow-2xl transition-all duration-300"
                style={{
                  transform: `rotateY(${rotateYDeg}deg) rotateX(${rotateXDeg}deg) scale(1.08)`,
                  filter: 'contrast(1.05) brightness(1.04)'
                }}
              />
            </div>

            {/* Dynamic Motor Angles Tag */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 z-10">
              <div className="px-3.5 py-1.5 rounded-lg bg-[#12141a]/95 border border-[#222736] text-zinc-200 shadow-md flex items-center gap-2">
                <span className="text-zinc-400 text-xs font-extrabold tracking-wider">ĐỘNG CƠ AZ:</span>
                <span className="text-white text-base sm:text-lg font-black font-mono">{az.currentAngle.toFixed(1)}°</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-lg bg-[#12141a]/95 border border-[#222736] text-zinc-200 shadow-md flex items-center gap-2">
                <span className="text-zinc-400 text-xs font-extrabold tracking-wider">ĐỘNG CƠ EL:</span>
                <span className="text-white text-base sm:text-lg font-black font-mono">{el.currentAngle.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* POWER TELEMETRY HERO */}
          <div className="pt-4 border-t border-[#1f2430] flex items-end justify-between">
            <div>
              <span className="text-xs sm:text-sm uppercase text-zinc-400 font-bold block tracking-wider">
                Công suất tức thời (P)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                  {tracking.power.toFixed(1)}
                </span>
                <span className="text-base sm:text-lg font-bold text-zinc-400">W</span>
              </div>
            </div>

            <button
              onClick={onOpenDetails}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[#14161f] hover:bg-[#1f2230] text-zinc-200 border border-[#262b3b] transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Info className="w-4 h-4 text-zinc-400" />
              <span>Chi tiết</span>
            </button>
          </div>
        </div>

        {/* 2. CHÊNH LỆCH HIỆU SUẤT TRUNG TÂM (% GAIN) - 2 COLS */}
        <div className="lg:col-span-2 panel-card flex flex-col justify-between p-4 sm:p-5 border-[#232734] bg-[#0c0d11] text-center relative overflow-hidden shadow-lg">

          <div className="pb-2.5 border-b border-[#1c1f28]">
            <span className="text-xs sm:text-sm text-zinc-300 uppercase tracking-wider block font-extrabold">
              Chênh Lệch
            </span>
          </div>

          <div className="my-auto py-4 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#161822] border border-[#262b3a] flex items-center justify-center text-zinc-200 mb-3 shadow-md">
              <TrendingUp className="w-6 h-6 text-zinc-300" />
            </div>
            <span className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight">
              {comparison.percentGain >= 0 ? `+${comparison.percentGain.toFixed(1)}` : comparison.percentGain.toFixed(1)}%
            </span>
            <span className="text-sm sm:text-base font-mono text-zinc-400 mt-1.5 font-bold">
              {comparison.powerDelta >= 0 ? `+${comparison.powerDelta.toFixed(1)}W` : `${comparison.powerDelta.toFixed(1)}W`}
            </span>
          </div>

          <div className="pt-2.5 border-t border-[#1c1f28]">
            <span className="text-xs text-zinc-400 font-semibold block">
              Tối ưu quang học
            </span>
          </div>
        </div>

        {/* 3. TẤM PIN CỐ ĐỊNH - 5 COLS */}
        <div className="lg:col-span-5 panel-card flex flex-col justify-between p-5 sm:p-6 relative overflow-hidden shadow-lg">

          {/* Amber Top Line (Màu viền 2) */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-amber-400"></div>

          {/* Top Header Row */}
          <div className="pb-3.5 border-b border-[#1f2430]">
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              TẤM PIN CỐ ĐỊNH
            </h2>
          </div>

          {/* STATIC PANEL IMAGE CONTAINER */}
          <div className="my-3 py-4 flex flex-col items-center justify-center relative min-h-[230px]">

            {/* Perspective Floor */}
            <div className="absolute inset-x-6 bottom-4 h-32 border border-zinc-800/30 rounded-full bg-gradient-to-t from-zinc-900/30 to-transparent pointer-events-none transform rotate-x-60 scale-90"></div>

            {/* Static Solar Panel Image (Fixed 15 deg Tilt) */}
            <div
              className="relative z-10 flex items-center justify-center opacity-90"
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src="/tampin.png"
                alt="Tấm pin mặt trời Static"
                className="w-60 sm:w-72 h-auto object-contain drop-shadow-xl"
                style={{
                  transform: 'rotateY(0deg) rotateX(20deg) scale(1.02)',
                  filter: 'contrast(1.0) brightness(0.96)'
                }}
              />
            </div>

            {/* Fixed Angles Tag */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 z-10">
              <div className="px-3.5 py-1.5 rounded-lg bg-[#12141a]/95 border border-[#222736] text-zinc-200 shadow-md flex items-center gap-2">
                <span className="text-zinc-400 text-xs font-extrabold tracking-wider">HƯỚNG NAM:</span>
                <span className="text-white text-base sm:text-lg font-black font-mono">180.0°</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-lg bg-[#12141a]/95 border border-[#222736] text-zinc-200 shadow-md flex items-center gap-2">
                <span className="text-zinc-400 text-xs font-extrabold tracking-wider">GÓC NGHIÊNG:</span>
                <span className="text-white text-base sm:text-lg font-black font-mono">15.0° (Cố định)</span>
              </div>
            </div>
          </div>

          {/* POWER TELEMETRY HERO */}
          <div className="pt-4 border-t border-[#1f2430] flex items-end justify-between">
            <div>
              <span className="text-xs sm:text-sm uppercase text-zinc-400 font-bold block tracking-wider">
                Công suất tức thời (P)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                  {stat.power.toFixed(1)}
                </span>
                <span className="text-base sm:text-lg font-bold text-zinc-400">W</span>
              </div>
            </div>

            <button
              onClick={onOpenDetails}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[#14161f] hover:bg-[#1f2230] text-zinc-200 border border-[#262b3b] transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Info className="w-4 h-4 text-zinc-400" />
              <span>Chi tiết</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
