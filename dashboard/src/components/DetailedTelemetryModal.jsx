import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Sun, 
  Network, 
  Zap, 
  Activity, 
  RotateCw,
  Compass
} from 'lucide-react';

export default function DetailedTelemetryModal({ 
  isOpen, 
  onClose, 
  telemetry = {}, 
  onTriggerPso 
}) {
  const [activeTab, setActiveTab] = useState('sensors'); // 'sensors' | 'fuzzy_pso' | 'electrical' | 'motors'

  if (!isOpen) return null;

  const ina = telemetry?.ina219 || {};
  const trk = ina.tracking || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const sta = ina.static || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const comp = ina.comparison || { percentGain: 0, powerDelta: 0, energyDeltaWh: 0 };

  const motors = telemetry?.motors || {};
  const az = motors.azimuth || { currentAngle: 0, targetAngle: 0, errorAngle: 0, encoderPulses: 0, limitMin: false, limitMax: false };
  const el = motors.elevation || { currentAngle: 0, targetAngle: 0, errorAngle: 0, encoderPulses: 0, limitMin: false, limitMax: false };

  const sensors = telemetry?.sensors || {};
  const sTop = sensors.top || { lux: 0, adc: 0 };
  const sBottom = sensors.bottom || { lux: 0, adc: 0 };
  const sLeft = sensors.left || { lux: 0, adc: 0 };
  const sRight = sensors.right || { lux: 0, adc: 0 };

  const fuzzy = telemetry?.fuzzy || { errorAngle: 0, errorRate: 0, kp: 2.4, ki: 0.12, kd: 0.65, activeRule: 'R01: ZE x ZE -> ZE (Steady Deadband)' };
  const pso = telemetry?.pso || { gBestFitness: 0.9845, iteration: 12, maxIterations: 20, status: 'CONVERGED', bestAzimuth: 165, bestElevation: 48.5 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md modal-sheet-container">
      
      {/* Modal Card */}
      <div className="panel-card w-full max-w-3xl overflow-hidden shadow-2xl border-white/20 flex flex-col bg-[#0b0e17]/95 backdrop-blur-3xl modal-sheet-card">
        
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="panel-header flex items-center justify-between py-3.5 px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Activity className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                Thông Số Chi Tiết Hệ Thống
              </h2>
              <span className="text-[10px] text-white/60 font-mono">Sensors, Fuzzy-PID & PSO Analytics</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/30 px-4 pt-2 gap-2 text-xs sm:text-sm overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sensors')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'sensors'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ☀️ Cảm Biến LDR
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('fuzzy_pso')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'fuzzy_pso'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🧠 Fuzzy-PID & PSO
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('electrical')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'electrical'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚡ INA219 Đo Năng Lượng
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('motors')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'motors'
                ? 'border-white text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🎛️ Góc Động Cơ
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[72vh] sm:max-h-[68vh] text-xs sm:text-sm">
          
          {/* TAB 1: SENSORS (4 LDRs) */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                Ma trận 4 quang trở LDR (Top - Bottom - Left - Right)
              </span>

              {/* LDR Cross Visualizer */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center gap-2">
                {/* TOP */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center w-32">
                  <span className="text-[10px] text-amber-300 block font-bold">LDR TRÊN (Top)</span>
                  <span className="font-mono font-black text-sm sm:text-base text-white">{sTop.adc}</span>
                </div>

                {/* LEFT & RIGHT */}
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center w-32">
                    <span className="text-[10px] text-amber-300 block font-bold">LDR TRÁI (Left)</span>
                    <span className="font-mono font-black text-sm sm:text-base text-white">{sLeft.adc}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center w-32">
                    <span className="text-[10px] text-amber-300 block font-bold">LDR PHẢI (Right)</span>
                    <span className="font-mono font-black text-sm sm:text-base text-white">{sRight.adc}</span>
                  </div>
                </div>

                {/* BOTTOM */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center w-32">
                  <span className="text-[10px] text-amber-300 block font-bold">LDR DƯỚI (Bottom)</span>
                  <span className="font-mono font-black text-sm sm:text-base text-white">{sBottom.adc}</span>
                </div>
              </div>

              {/* Differentials */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">Độ lệch Trái - Phải (ΔAzimuth)</span>
                  <span className="text-base font-black text-sky-300">{sensors.diffAzimuth || (sLeft.adc - sRight.adc)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">Độ lệch Trên - Dưới (ΔElevation)</span>
                  <span className="text-base font-black text-sky-300">{sensors.diffElevation || (sTop.adc - sBottom.adc)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FUZZY-PID & PSO */}
          {activeTab === 'fuzzy_pso' && (
            <div className="space-y-3.5">
              <span className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                Thuật toán điều khiển mờ lai bầy đàn (Fuzzy-PID & PSO)
              </span>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block font-sans">Hệ số Kp (Proportional)</span>
                  <span className="text-base sm:text-lg font-black text-white">{fuzzy.kp}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block font-sans">Hệ số Ki (Integral)</span>
                  <span className="text-base sm:text-lg font-black text-white">{fuzzy.ki}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block font-sans">Hệ số Kd (Derivative)</span>
                  <span className="text-base sm:text-lg font-black text-white">{fuzzy.kd}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Trạng thái PSO:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-xs">
                    {pso.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Độ thích nghi tối ưu (GBest Fitness):</span>
                  <span className="font-mono font-black text-white">{pso.gBestFitness}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Số thế hệ lặp (Iterations):</span>
                  <span className="font-mono font-black text-white">{pso.iteration} / {pso.maxIterations}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ELECTRICAL */}
          {activeTab === 'electrical' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                Bảng so sánh cảm biến điện INA219
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* Tấm xoay */}
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                  <span className="text-xs font-black text-sky-300 block uppercase">TẤM TRACKING</span>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Điện áp:</span>
                      <span className="font-bold text-white">{trk.voltage.toFixed(2)} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Dòng điện:</span>
                      <span className="font-bold text-white">{trk.current.toFixed(3)} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Công suất:</span>
                      <span className="font-bold text-sky-300 text-sm">{trk.power.toFixed(2)} W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Năng lượng ngày:</span>
                      <span className="font-bold text-white">{trk.energyKwh.toFixed(3)} kWh</span>
                    </div>
                  </div>
                </div>

                {/* Tấm cố định */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <span className="text-xs font-black text-amber-300 block uppercase">TẤM CỐ ĐỊNH</span>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Điện áp:</span>
                      <span className="font-bold text-white">{sta.voltage.toFixed(2)} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Dòng điện:</span>
                      <span className="font-bold text-white">{sta.current.toFixed(3)} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Công suất:</span>
                      <span className="font-bold text-amber-300 text-sm">{sta.power.toFixed(2)} W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Năng lượng ngày:</span>
                      <span className="font-bold text-white">{sta.energyKwh.toFixed(3)} kWh</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MOTORS */}
          {activeTab === 'motors' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                Vị trí trục & xung Encoder
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 font-mono text-xs">
                  <span className="text-xs font-bold text-sky-300 block font-sans">TRỤC AZIMUTH</span>
                  <div className="flex justify-between"><span className="text-white/60">Góc hiện tại:</span><span className="font-bold text-white">{az.currentAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Góc mục tiêu:</span><span className="font-bold text-white">{az.targetAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Xung Encoder:</span><span className="font-bold text-white">{az.encoderPulses} pulses</span></div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 font-mono text-xs">
                  <span className="text-xs font-bold text-sky-300 block font-sans">TRỤC ELEVATION</span>
                  <div className="flex justify-between"><span className="text-white/60">Góc hiện tại:</span><span className="font-bold text-white">{el.currentAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Góc mục tiêu:</span><span className="font-bold text-white">{el.targetAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Xung Encoder:</span><span className="font-bold text-white">{el.encoderPulses} pulses</span></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-black/40 border-t border-white/10 flex justify-end safe-area-bottom">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
