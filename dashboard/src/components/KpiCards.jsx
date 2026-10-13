import React from 'react';
import { Zap, TrendingUp, Compass, SunMedium } from 'lucide-react';

export default function KpiCards({ INA226 }) {
  const tracking = INA226?.tracking || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const stat = INA226?.static || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const comparison = INA226?.comparison || { percentGain: 0, powerDelta: 0, energyDeltaWh: 0 };

  const isPositiveGain = comparison.percentGain >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-4">

      {/* 1. TẤM PIN TRACKING (Fuzzy-PID + PSO) */}
      <div className="panel-card flex flex-col justify-between overflow-hidden relative">
        {/* Subtle decorative top border highlight */}
        <div className="h-[2px] w-full bg-zinc-400 opacity-60"></div>

        <div className="p-4 sm:p-5">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1f28]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#161820] border border-[#252a36] flex items-center justify-center text-zinc-300">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
                  Tấm Pin Tracking
                </h2>
                <span className="text-[11px] font-mono text-zinc-400">
                  Fuzzy-PID + PSO ( INA226 #1)
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[#181a22] text-zinc-300 border border-[#262b38]">
              2-TRỤC ĐIỀU HƯỚNG
            </span>
          </div>

          {/* Instant Power Hero Metric */}
          <div className="mt-4 mb-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              Công suất tức thời (P)
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white">
                {tracking.power.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-zinc-400 font-medium">W</span>
            </div>
          </div>

          {/* Sub Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#181a22]">
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Điện áp</span>
              <span className="text-sm font-mono font-semibold text-zinc-200 block mt-0.5">
                {tracking.voltage.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">V</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Dòng điện</span>
              <span className="text-sm font-mono font-semibold text-zinc-200 block mt-0.5">
                {tracking.current.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">A</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Năng lượng</span>
              <span className="text-sm font-mono font-semibold text-zinc-200 block mt-0.5">
                {tracking.energyWh.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">Wh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 bg-[#0e0f13] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between">
          <span>Tích lũy ngày:</span>
          <span className="text-zinc-200 font-medium">{tracking.energyWh.toFixed(1)} Wh</span>
        </div>
      </div>

      {/* 2. TẤM PIN CỐ ĐỊNH */}
      <div className="panel-card flex flex-col justify-between overflow-hidden relative">
        <div className="h-[2px] w-full bg-zinc-600 opacity-40"></div>

        <div className="p-4 sm:p-5">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1f28]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#161820] border border-[#252a36] flex items-center justify-center text-zinc-400">
                <SunMedium className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-200">
                  Tấm Pin Cố Định
                </h2>
                <span className="text-[11px] font-mono text-zinc-400">
                  Cố định South 15° ( INA226 #2)
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[#181a22] text-zinc-400 border border-[#232733]">
              ĐỐI CHỨNG
            </span>
          </div>

          {/* Instant Power Hero Metric */}
          <div className="mt-4 mb-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              Công suất tức thời (P)
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-zinc-300">
                {stat.power.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-zinc-400 font-medium">W</span>
            </div>
          </div>

          {/* Sub Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#181a22]">
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Điện áp</span>
              <span className="text-sm font-mono font-semibold text-zinc-300 block mt-0.5">
                {stat.voltage.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">V</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Dòng điện</span>
              <span className="text-sm font-mono font-semibold text-zinc-300 block mt-0.5">
                {stat.current.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">A</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Năng lượng</span>
              <span className="text-sm font-mono font-semibold text-zinc-300 block mt-0.5">
                {stat.energyWh.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">Wh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 bg-[#0e0f13] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between">
          <span>Tích lũy ngày:</span>
          <span className="text-zinc-300 font-medium">{stat.energyWh.toFixed(1)} Wh</span>
        </div>
      </div>

      {/* 3. THẺ HIỆU SUẤT CẢI THIỆN (% GAIN TÍCH PHÂN NĂNG LƯỢNG) */}
      <div className="panel-card flex flex-col justify-between overflow-hidden relative border-[#2c3242]">
        <div className="h-[2px] w-full bg-zinc-200"></div>

        <div className="p-4 sm:p-5">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1f28]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#161820] border border-[#252a36] flex items-center justify-center text-zinc-200">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
                  Hiệu Suất Cải Thiện
                </h2>
                <span className="text-[11px] font-mono text-zinc-400">
                  % Gain = ((ΣE_trk - k·ΣE_sta) / (k·ΣE_sta)) × 100%
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[#181a22] text-zinc-200 border border-[#2c3140]">
              ĐÃ HIỆU CHUẨN (k=1.018)
            </span>
          </div>

          {/* Big Gain Number */}
          <div className="mt-4 mb-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              Gia tăng sản lượng tích phân (%)
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              {comparison.hasValidGain !== false && (stat.energyWh >= 5.0 || comparison.percentGain !== 0) ? (
                <>
                  <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-zinc-100">
                    {isPositiveGain ? `+${comparison.percentGain.toFixed(1)}` : `${comparison.percentGain.toFixed(1)}`}%
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-medium">so với tấm tĩnh</span>
                </>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-300">
                    -- %
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-medium">(Đang tích lũy &lt; 5Wh)</span>
                </>
              )}
            </div>
          </div>

          {/* Sub Metric Deltas */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#181a22]">
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Chênh lệch Công suất (ΔP)</span>
              <span className="text-sm font-mono font-semibold text-zinc-100 block mt-0.5">
                {comparison.powerDelta >= 0 ? `+${comparison.powerDelta.toFixed(2)}` : comparison.powerDelta.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">W</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Năng lượng vượt trội (ΔE)</span>
              <span className="text-sm font-mono font-semibold text-zinc-100 block mt-0.5">
                {comparison.energyDeltaWh >= 0 ? `+${comparison.energyDeltaWh.toFixed(1)}` : comparison.energyDeltaWh.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">Wh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 bg-[#0e0f13] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between items-center">
          <span>Tích phân năng lượng:</span>
          <span className="text-zinc-200 font-semibold">{comparison.hasValidGain !== false ? 'TÍNH THEO Wh TÍCH LŨY' : 'CHỜ ĐỦ NGƯỠNG 5Wh'}</span>
        </div>
      </div>

    </div>
  );
}
