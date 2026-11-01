import React from 'react';
import { Zap, TrendingUp, Compass, SunMedium } from 'lucide-react';
import { formatSignedNumber, formatValueOrDash, getConnectionStatusBadge } from '../utils/formatters';

export default function KpiCards({ INA226 }) {
  const tracking = INA226?.tracking || { voltage: null, current: null, power: null, energyWh: null };
  const stat = INA226?.static || { voltage: null, current: null, power: null, energyWh: null, fixedAzimuth: 180, fixedTiltBeta: 15, fixedElevationEps: 75 };
  const comparison = INA226?.comparison || { percentGain: null, powerDelta: null, energyDeltaWh: null, hasValidGain: false };

  const trkBadge = getConnectionStatusBadge(tracking.connStatus, tracking.staleDurationMs);
  const staBadge = getConnectionStatusBadge(stat.connStatus, stat.staleDurationMs);

  const hasValidGain = comparison.hasValidGain && comparison.percentGain !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-4">

      {/* 1. TẤM PIN TRACKING */}
      <div className="panel-card flex flex-col justify-between overflow-hidden relative">
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
                  Hai trục điều hướng (INA226 #1)
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${trkBadge.colorClass}`}>
              {trkBadge.text}
            </span>
          </div>

          {/* Instant Power Hero Metric */}
          <div className="mt-4 mb-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              Công suất tức thời (P)
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${trkBadge.isLive ? 'text-white' : 'text-zinc-500'}`}>
                {formatValueOrDash(tracking.power, 2)}
              </span>
              <span className="text-sm font-mono text-zinc-400 font-medium">W</span>
            </div>
          </div>

          {/* Sub Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#181a22]">
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Điện áp</span>
              <span className={`text-sm font-mono font-semibold block mt-0.5 ${trkBadge.isLive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                {formatValueOrDash(tracking.voltage, 2)} <span className="text-[10px] font-normal text-zinc-400">V</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Dòng điện</span>
              <span className={`text-sm font-mono font-semibold block mt-0.5 ${trkBadge.isLive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                {formatValueOrDash(tracking.current, 3)} <span className="text-[10px] font-normal text-zinc-400">A</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Năng lượng</span>
              <span className="text-sm font-mono font-semibold text-zinc-200 block mt-0.5">
                {formatValueOrDash(tracking.energyWh, 1)} <span className="text-[10px] font-normal text-zinc-400">Wh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 bg-[#0e0f13] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between">
          <span>Tích lũy ngày:</span>
          <span className="text-zinc-200 font-medium">{formatValueOrDash(tracking.energyWh, 1, 'Wh')}</span>
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
                  Hướng Nam 180°, ngửa 75° (nghiêng 15°) (INA226 #2)
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${staBadge.colorClass}`}>
              {staBadge.text}
            </span>
          </div>

          {/* Instant Power Hero Metric */}
          <div className="mt-4 mb-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              Công suất tức thời (P)
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${staBadge.isLive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {formatValueOrDash(stat.power, 2)}
              </span>
              <span className="text-sm font-mono text-zinc-400 font-medium">W</span>
            </div>
          </div>

          {/* Sub Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#181a22]">
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Điện áp</span>
              <span className={`text-sm font-mono font-semibold block mt-0.5 ${staBadge.isLive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {formatValueOrDash(stat.voltage, 2)} <span className="text-[10px] font-normal text-zinc-400">V</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Dòng điện</span>
              <span className={`text-sm font-mono font-semibold block mt-0.5 ${staBadge.isLive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {formatValueOrDash(stat.current, 3)} <span className="text-[10px] font-normal text-zinc-400">A</span>
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Năng lượng</span>
              <span className="text-sm font-mono font-semibold text-zinc-300 block mt-0.5">
                {formatValueOrDash(stat.energyWh, 1)} <span className="text-[10px] font-normal text-zinc-400">Wh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 bg-[#0e0f13] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between">
          <span>Tích lũy ngày:</span>
          <span className="text-zinc-300 font-medium">{formatValueOrDash(stat.energyWh, 1, 'Wh')}</span>
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
                  % Gain = (ΣE_trk / (k · ΣE_sta) − 1) × 100%
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[#181a22] text-zinc-200 border border-[#2c3140]">
              HIỆU CHUẨN k=1.018
            </span>
          </div>

          {/* Big Gain Number */}
          <div className="mt-4 mb-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              Gia tăng sản lượng tích phân (%)
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              {hasValidGain ? (
                <>
                  <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-zinc-100">
                    {formatSignedNumber(comparison.percentGain, 1, '%')}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-medium">so với tấm cố định</span>
                </>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-500">
                    -- %
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-medium">
                    {tracking.connStatus !== 'LIVE' || stat.connStatus !== 'LIVE' ? '(Mất kết nối)' : '(Chờ đủ ngưỡng 5Wh)'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sub Metric Deltas */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#181a22]">
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Chênh lệch Công suất (ΔP)</span>
              <span className={`text-sm font-mono font-semibold block mt-0.5 ${comparison.powerDelta !== null ? 'text-zinc-100' : 'text-zinc-500'}`}>
                {comparison.powerDelta !== null ? formatSignedNumber(comparison.powerDelta, 2, 'W') : '--'}
              </span>
            </div>
            <div className="panel-subtle p-2">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Năng lượng vượt trội (ΔE)</span>
              <span className={`text-sm font-mono font-semibold block mt-0.5 ${comparison.energyDeltaWh !== null ? 'text-zinc-100' : 'text-zinc-500'}`}>
                {comparison.energyDeltaWh !== null ? formatSignedNumber(comparison.energyDeltaWh, 1, 'Wh') : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 bg-[#0e0f13] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between items-center">
          <span>Tích phân năng lượng:</span>
          <span className="text-zinc-200 font-semibold">{hasValidGain ? 'TÍNH THEO Wh TÍCH LŨY' : 'CHỜ ĐỦ NGƯỠNG 5Wh'}</span>
        </div>
      </div>

    </div>
  );
}
