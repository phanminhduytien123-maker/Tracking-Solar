import React from 'react';
import { Cpu, Network, Play, CheckCircle2, RotateCw } from 'lucide-react';

export default function AlgorithmMonitor({ fuzzy, pso, onTriggerPso }) {
  const fz = fuzzy || { errorAngle: 0, errorRate: 0, kp: 2.4, ki: 0.12, kd: 0.65, activeRule: 'R01', defuzzOutput: 0 };
  const ps = pso || { gBestFitness: 0.9845, iteration: 12, maxIterations: 20, status: 'CONVERGED', swarmSize: 20, bestAzimuth: 165, bestElevation: 48.5 };

  // Calculate percentage progress for Kp, Ki, Kd bars
  const kpPct = Math.min(100, (fz.kp / 5.0) * 100);
  const kiPct = Math.min(100, (fz.ki / 0.5) * 100);
  const kdPct = Math.min(100, (fz.kd / 2.0) * 100);

  // PSO iteration progress percentage
  const psoProgress = Math.min(100, (ps.iteration / (ps.maxIterations || 20)) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-4">
      
      {/* 1. BỘ ĐIỀU KHIỂN FUZZY-PID TỰ THÍCH NGHI */}
      <div className="panel-card flex flex-col justify-between">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
              Bộ Điều Khiển Mờ Fuzzy-PID Tự Thích Nghi
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            AUTO-TUNING GAINS
          </span>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          
          {/* Top Row: e(t) and de(t) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="panel-subtle p-3">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                Sai số góc e(t)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {fz.errorAngle.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-zinc-400">°</span>
              </div>
            </div>

            <div className="panel-subtle p-3">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                Tốc độ sai số Δe(t)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {fz.errorRate > 0 ? `+${fz.errorRate.toFixed(3)}` : fz.errorRate.toFixed(3)}
                </span>
                <span className="text-xs font-mono text-zinc-400">°/s</span>
              </div>
            </div>
          </div>

          {/* Real-time Adaptive Gains (Kp, Ki, Kd) */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
              Hệ số PID thích nghi thời gian thực
            </span>

            {/* Kp */}
            <div className="panel-subtle p-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Kp (Tỷ lệ)</span>
                <span className="text-white font-bold">{fz.kp.toFixed(2)}</span>
              </div>
              <div className="w-full bg-[#0d0e12] rounded-full h-1.5 overflow-hidden border border-[#1e222c]">
                <div 
                  className="bg-zinc-200 h-full transition-all duration-300"
                  style={{ width: `${kpPct}%` }}
                ></div>
              </div>
            </div>

            {/* Ki */}
            <div className="panel-subtle p-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Ki (Tích phân)</span>
                <span className="text-white font-bold">{fz.ki.toFixed(3)}</span>
              </div>
              <div className="w-full bg-[#0d0e12] rounded-full h-1.5 overflow-hidden border border-[#1e222c]">
                <div 
                  className="bg-zinc-300 h-full transition-all duration-300"
                  style={{ width: `${kiPct}%` }}
                ></div>
              </div>
            </div>

            {/* Kd */}
            <div className="panel-subtle p-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Kd (Vi phân)</span>
                <span className="text-white font-bold">{fz.kd.toFixed(2)}</span>
              </div>
              <div className="w-full bg-[#0d0e12] rounded-full h-1.5 overflow-hidden border border-[#1e222c]">
                <div 
                  className="bg-zinc-400 h-full transition-all duration-300"
                  style={{ width: `${kdPct}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0d0e12] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between items-center">
          <span>Luật mờ kích hoạt:</span>
          <span className="text-zinc-200 font-medium truncate max-w-[280px]">{fz.activeRule}</span>
        </div>
      </div>

      {/* 2. THUẬT TOÁN TỐI ƯU HÓA BẦY ĐÀN (PSO) */}
      <div className="panel-card flex flex-col justify-between">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
              Thuật Toán Tối Ưu Hóa Bầy Đàn (PSO)
            </span>
          </div>
          <button
            onClick={onTriggerPso}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#1c1f2a] hover:bg-[#252a39] text-zinc-200 border border-[#2b3142] transition-colors cursor-pointer"
            title="Kích hoạt lại chu kỳ tối ưu PSO"
          >
            <RotateCw className="w-3 h-3 text-zinc-400" />
            <span>Tối ưu lại</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          
          {/* Top Row: Gbest Fitness & Iterations */}
          <div className="grid grid-cols-2 gap-3">
            <div className="panel-subtle p-3">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                Fitness Tối Ưu (Gbest)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {ps.gBestFitness.toFixed(4)}
                </span>
                <span className="text-xs font-mono text-zinc-400">/ 1.0</span>
              </div>
            </div>

            <div className="panel-subtle p-3">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                Số Vòng Lặp (k)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {ps.iteration}
                </span>
                <span className="text-xs font-mono text-zinc-400">/ {ps.maxIterations || 20}</span>
              </div>
            </div>
          </div>

          {/* Iteration Progress Bar */}
          <div className="panel-subtle p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Tiến trình hội tụ bầy đàn:</span>
              <span className="text-zinc-200 font-semibold">{psoProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-[#0d0e12] rounded-full h-2 overflow-hidden border border-[#1e222c]">
              <div 
                className="bg-zinc-200 h-full transition-all duration-300"
                style={{ width: `${psoProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Swarm & Target Optimal Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="panel-subtle p-2.5">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Góc Tối Ưu Azimuth</span>
              <span className="text-sm font-mono font-semibold text-zinc-200 block mt-0.5">
                θ_az* = {ps.bestAzimuth.toFixed(1)}°
              </span>
            </div>
            <div className="panel-subtle p-2.5">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Góc Tối Ưu Elevation</span>
              <span className="text-sm font-mono font-semibold text-zinc-200 block mt-0.5">
                θ_el* = {ps.bestElevation.toFixed(1)}°
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0d0e12] border-t border-[#191b22] text-[11px] font-mono text-zinc-400 flex justify-between items-center">
          <span>Trạng thái bầy đàn:</span>
          <span className="text-zinc-200 font-semibold uppercase">{ps.status} (N=20 PARTICLES)</span>
        </div>
      </div>

    </div>
  );
}
