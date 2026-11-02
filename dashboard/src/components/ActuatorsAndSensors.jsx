import React from 'react';
import { Cpu, Compass, Sun, Eye, Navigation } from 'lucide-react';

export default function ActuatorsAndSensors({ motors, sensors }) {
  const az = motors?.azimuth || { currentAngle: 0, targetAngle: 0, errorAngle: 0, encoderPulses: 0, limitMin: false, limitMax: false };
  const el = motors?.elevation || { currentAngle: 0, targetAngle: 0, errorAngle: 0, encoderPulses: 0, limitMin: false, limitMax: false };

  const sTop = sensors?.top || { lux: 0, adc: 0 };
  const sBottom = sensors?.bottom || { lux: 0, adc: 0 };
  const sLeft = sensors?.left || { lux: 0, adc: 0 };
  const sRight = sensors?.right || { lux: 0, adc: 0 };

  // Calculate normalized centroid for visual sun vector target
  // Offset in percent from center (-50% to +50%)
  const centroidX = Math.max(-42, Math.min(42, (sensors?.sunCentroidX || 0) * 40));
  const centroidY = Math.max(-42, Math.min(42, -(sensors?.sunCentroidY || 0) * 40));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4">

      {/* LEFT: NEMA 23 STEPPER 2-AXIS POSITION WIDGET (7 COLS) */}
      <div className="lg:col-span-7 panel-card flex flex-col justify-between">

        {/* Header */}
        <div className="panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
              Cơ Cấu Chấp Hành 2 Trục (NEMA 23 Stepper)
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            CLOSED-LOOP ENCODER FEEDBACK
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Phương vị (quay quanh Z) */}
          <div className="panel-subtle p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1f222d]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-300"></span>
                  <span className="text-xs font-semibold uppercase text-zinc-100">Phương vị (quay quanh Z)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">0° - 360°</span>
              </div>

              {/* Angle Metrics */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase">Góc Hiện Tại</span>
                  <span className="text-2xl font-mono font-bold text-white block mt-0.5">
                    {az.currentAngle.toFixed(1)}°
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase">Góc Mục Tiêu</span>
                  <span className="text-2xl font-mono font-bold text-zinc-400 block mt-0.5">
                    {az.targetAngle.toFixed(1)}°
                  </span>
                </div>
              </div>

              {/* Progress / Angle Bar */}
              <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden border border-[#202430]">
                <div
                  className="bg-zinc-200 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (az.currentAngle / 360) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Encoder & Limit Switch Status */}
            <div className="mt-3 pt-2.5 border-t border-[#1c1f28] flex flex-col gap-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Encoder Pulse:</span>
                <span className="text-zinc-200">{az.encoderPulses.toLocaleString()} pulses</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Sai số góc (e):</span>
                <span className="text-zinc-300 font-medium">
                  {az.errorAngle > 0 ? `+${az.errorAngle.toFixed(2)}` : az.errorAngle.toFixed(2)}°
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#181a21]">
                <span className="text-zinc-400">Công tắc hành trình:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${az.limitMin ? 'bg-red-950/80 text-red-300 border border-red-800/60' : 'bg-[#15171e] text-zinc-400 border border-[#232734]'}`}>
                    LS_MIN {az.limitMin ? 'TRIG' : 'OK'}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${az.limitMax ? 'bg-red-950/80 text-red-300 border border-red-800/60' : 'bg-[#15171e] text-zinc-400 border border-[#232734]'}`}>
                    LS_MAX {az.limitMax ? 'TRIG' : 'OK'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Độ ngửa */}
          <div className="panel-subtle p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1f222d]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-300"></span>
                  <span className="text-xs font-semibold uppercase text-zinc-100">Độ ngửa</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">0° - 90°</span>
              </div>

              {/* Angle Metrics */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase">Góc Hiện Tại</span>
                  <span className="text-2xl font-mono font-bold text-white block mt-0.5">
                    {el.currentAngle.toFixed(1)}°
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase">Góc Mục Tiêu</span>
                  <span className="text-2xl font-mono font-bold text-zinc-400 block mt-0.5">
                    {el.targetAngle.toFixed(1)}°
                  </span>
                </div>
              </div>

              {/* Progress / Angle Bar */}
              <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden border border-[#202430]">
                <div
                  className="bg-zinc-200 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (el.currentAngle / 90) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Encoder & Limit Switch Status */}
            <div className="mt-3 pt-2.5 border-t border-[#1c1f28] flex flex-col gap-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Encoder Pulse:</span>
                <span className="text-zinc-200">{el.encoderPulses.toLocaleString()} pulses</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Sai số góc (e):</span>
                <span className="text-zinc-300 font-medium">
                  {el.errorAngle > 0 ? `+${el.errorAngle.toFixed(2)}` : el.errorAngle.toFixed(2)}°
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#181a21]">
                <span className="text-zinc-400">Công tắc hành trình:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${el.limitMin ? 'bg-red-950/80 text-red-300 border border-red-800/60' : 'bg-[#15171e] text-zinc-400 border border-[#232734]'}`}>
                    LS_MIN {el.limitMin ? 'TRIG' : 'OK'}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${el.limitMax ? 'bg-red-950/80 text-red-300 border border-red-800/60' : 'bg-[#15171e] text-zinc-400 border border-[#232734]'}`}>
                    LS_MAX {el.limitMax ? 'TRIG' : 'OK'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#0d0e12] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between items-center">
          <span>Tốc độ vi bước: 1/16 Microstepping</span>
          <span className="text-zinc-300">Độ phân giải: 0.056°/step</span>
        </div>
      </div>

      {/* RIGHT: CỤM 4 CẢM BIẾN TEMT6000 & SUN TARGET COMPASS (5 COLS) */}
      <div className="lg:col-span-5 panel-card flex flex-col justify-between">

        {/* Header */}
        <div className="panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
              Cụm 4 Cảm Biến Quang TEMT6000
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            ADC 12-BIT (0-4095)
          </span>
        </div>

        {/* Body Visual Compass Layout */}
        <div className="p-4 flex flex-col items-center justify-center flex-1">

          <div className="relative w-full max-w-[280px] h-[220px] flex items-center justify-center">

            {/* Compass Center Target Ring */}
            <div className="absolute w-32 h-32 rounded-full border border-dashed border-[#2d3240] flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full border border-[#222632] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
              </div>
            </div>

            {/* Dynamic Sun Centroid Dot */}
            <div
              className="absolute w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none transition-all duration-300 flex items-center justify-center"
              style={{
                transform: `translate(${centroidX}px, ${centroidY}px)`,
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.7)'
              }}
              title="Điểm hội tụ quang phổ mặt trời"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900"></div>
            </div>

            {/* TOP SENSOR */}
            <div className="absolute top-0 flex flex-col items-center">
              <div className="panel-subtle px-2.5 py-1 text-center border-[#2c303d] shadow-sm">
                <span className="text-[9px] font-mono text-zinc-400 block font-semibold">TRÊN (TOP)</span>
                <span className="text-xs font-mono font-bold text-zinc-100">
                  {sTop?.lux != null ? sTop.lux.toLocaleString() : (sTop?.adc != null ? Math.round(sTop.adc * 0.5).toLocaleString() : '--')} <span className="text-[9px] font-normal text-zinc-400">lx</span>
                </span>
                <span className="text-[9px] font-mono text-zinc-400 block">ADC: {sTop?.adc ?? '--'}</span>
              </div>
            </div>

            {/* BOTTOM SENSOR */}
            <div className="absolute bottom-0 flex flex-col items-center">
              <div className="panel-subtle px-2.5 py-1 text-center border-[#2c303d] shadow-sm">
                <span className="text-[9px] font-mono text-zinc-400 block font-semibold">DƯỚI (BOTTOM)</span>
                <span className="text-xs font-mono font-bold text-zinc-100">
                  {sBottom?.lux != null ? sBottom.lux.toLocaleString() : (sBottom?.adc != null ? Math.round(sBottom.adc * 0.5).toLocaleString() : '--')} <span className="text-[9px] font-normal text-zinc-400">lx</span>
                </span>
                <span className="text-[9px] font-mono text-zinc-400 block">ADC: {sBottom?.adc ?? '--'}</span>
              </div>
            </div>

            {/* LEFT SENSOR */}
            <div className="absolute left-0 flex flex-col items-center">
              <div className="panel-subtle px-2.5 py-1 text-center border-[#2c303d] shadow-sm">
                <span className="text-[9px] font-mono text-zinc-400 block font-semibold">TRÁI (LEFT)</span>
                <span className="text-xs font-mono font-bold text-zinc-100">
                  {sLeft?.lux != null ? sLeft.lux.toLocaleString() : (sLeft?.adc != null ? Math.round(sLeft.adc * 0.5).toLocaleString() : '--')} <span className="text-[9px] font-normal text-zinc-400">lx</span>
                </span>
                <span className="text-[9px] font-mono text-zinc-400 block">ADC: {sLeft?.adc ?? '--'}</span>
              </div>
            </div>

            {/* RIGHT SENSOR */}
            <div className="absolute right-0 flex flex-col items-center">
              <div className="panel-subtle px-2.5 py-1 text-center border-[#2c303d] shadow-sm">
                <span className="text-[9px] font-mono text-zinc-400 block font-semibold">PHẢI (RIGHT)</span>
                <span className="text-xs font-mono font-bold text-zinc-100">
                  {sRight?.lux != null ? sRight.lux.toLocaleString() : (sRight?.adc != null ? Math.round(sRight.adc * 0.5).toLocaleString() : '--')} <span className="text-[9px] font-normal text-zinc-400">lx</span>
                </span>
                <span className="text-[9px] font-mono text-zinc-400 block">ADC: {sRight?.adc ?? '--'}</span>
              </div>
            </div>

          </div>

          {/* Differential Values */}
          <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1a1d25] text-[11px] font-mono text-zinc-300">
            <div className="text-center p-1.5 rounded bg-[#0d0f13] border border-[#1d2029]">
              <span className="text-zinc-400 block text-[10px]">Δ Azimuth (L - R)</span>
              <span className="font-semibold text-zinc-100">
                {sensors?.diffAzimuth > 0 ? `+${sensors.diffAzimuth}` : sensors?.diffAzimuth} lx
              </span>
            </div>
            <div className="text-center p-1.5 rounded bg-[#0d0f13] border border-[#1d2029]">
              <span className="text-zinc-400 block text-[10px]">Δ Elevation (T - B)</span>
              <span className="font-semibold text-zinc-100">
                {sensors?.diffElevation > 0 ? `+${sensors.diffElevation}` : sensors?.diffElevation} lx
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0d0e12] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between items-center">
          <span>Vùng chết cảm biến (Deadband):</span>
          <span className="text-zinc-200 font-medium">±50 Lux</span>
        </div>
      </div>

    </div>
  );
}
