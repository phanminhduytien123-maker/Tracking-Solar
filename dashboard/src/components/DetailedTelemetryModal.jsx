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
  telemetry, 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs">
      
      {/* Modal Card */}
      <div className="panel-card w-full max-w-3xl overflow-hidden shadow-2xl border-[#2a2f3e] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-zinc-300" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Thông Số Chi Tiết Hệ Thống Điều Hướng Pin Mặt Trời
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1e222d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1c1f28] bg-[#0c0d10] px-4 pt-2 gap-2 text-xs sm:text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('sensors')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'sensors'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Cảm Biến Quang TEMT6000
          </button>
          
          <button
            onClick={() => setActiveTab('fuzzy_pso')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'fuzzy_pso'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Fuzzy-PID & PSO
          </button>

          <button
            onClick={() => setActiveTab('electrical')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'electrical'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Điện Áp & Dòng Điện (INA219)
          </button>

          <button
            onClick={() => setActiveTab('motors')}
            className={`pb-2.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeTab === 'motors'
                ? 'border-zinc-200 text-white font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Động Cơ NEMA 23 & Encoders
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          
          {/* TAB 1: CẢM BIẾN QUANG TEMT6000 */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="panel-subtle p-3.5 text-center">
                  <span className="text-xs text-zinc-400 block font-bold">CẢM BIẾN TRÊN (TOP)</span>
                  <span className="text-lg font-mono font-bold text-white block mt-1.5">{sTop.lux.toLocaleString()} <span className="text-xs text-zinc-400">lx</span></span>
                  <span className="text-xs font-mono text-zinc-400 mt-0.5 block">ADC 12-bit: {sTop.adc}</span>
                </div>
                <div className="panel-subtle p-3.5 text-center">
                  <span className="text-xs text-zinc-400 block font-bold">CẢM BIẾN DƯỚI (BOTTOM)</span>
                  <span className="text-lg font-mono font-bold text-white block mt-1.5">{sBottom.lux.toLocaleString()} <span className="text-xs text-zinc-400">lx</span></span>
                  <span className="text-xs font-mono text-zinc-400 mt-0.5 block">ADC 12-bit: {sBottom.adc}</span>
                </div>
                <div className="panel-subtle p-3.5 text-center">
                  <span className="text-xs text-zinc-400 block font-bold">CẢM BIẾN TRÁI (LEFT)</span>
                  <span className="text-lg font-mono font-bold text-white block mt-1.5">{sLeft.lux.toLocaleString()} <span className="text-xs text-zinc-400">lx</span></span>
                  <span className="text-xs font-mono text-zinc-400 mt-0.5 block">ADC 12-bit: {sLeft.adc}</span>
                </div>
                <div className="panel-subtle p-3.5 text-center">
                  <span className="text-xs text-zinc-400 block font-bold">CẢM BIẾN PHẢI (RIGHT)</span>
                  <span className="text-lg font-mono font-bold text-white block mt-1.5">{sRight.lux.toLocaleString()} <span className="text-xs text-zinc-400">lx</span></span>
                  <span className="text-xs font-mono text-zinc-400 mt-0.5 block">ADC 12-bit: {sRight.adc}</span>
                </div>
              </div>

              {/* Differentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="panel-subtle p-3.5 flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Độ lệch quang trục ngang (ΔAz = Left - Right):</span>
                  <span className="text-white font-mono font-bold">{sensors.diffAzimuth > 0 ? `+${sensors.diffAzimuth}` : sensors.diffAzimuth} lx</span>
                </div>
                <div className="panel-subtle p-3.5 flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Độ lệch quang trục đứng (ΔEl = Top - Bottom):</span>
                  <span className="text-white font-mono font-bold">{sensors.diffElevation > 0 ? `+${sensors.diffElevation}` : sensors.diffElevation} lx</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FUZZY-PID & PSO */}
          {activeTab === 'fuzzy_pso' && (
            <div className="space-y-4">
              {/* Fuzzy-PID Section */}
              <div className="panel-subtle p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-[#1f222d] gap-2">
                  <span className="text-sm font-extrabold uppercase text-white">Bộ Điều Khiển Mờ Fuzzy-PID Tự Thích Nghi</span>
                  <span className="text-xs text-zinc-400 font-medium">Luật mờ: {fuzzy.activeRule}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Sai số e(t):</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{fuzzy.errorAngle.toFixed(2)}°</span>
                  </div>
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Tốc độ Δe(t):</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{fuzzy.errorRate > 0 ? `+${fuzzy.errorRate.toFixed(3)}` : fuzzy.errorRate.toFixed(3)}°/s</span>
                  </div>
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Hệ số Kp:</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{fuzzy.kp.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Hệ số Ki / Kd:</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{fuzzy.ki.toFixed(3)} / {fuzzy.kd.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* PSO Section */}
              <div className="panel-subtle p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1f222d]">
                  <span className="text-sm font-extrabold uppercase text-white">Thuật Toán Tối Ưu Bầy Đàn (PSO)</span>
                  <button
                    onClick={onTriggerPso}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-[#1c1f2a] hover:bg-[#252a39] text-zinc-200 border border-[#2b3142] cursor-pointer transition-colors shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tối ưu lại</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Fitness Tối Ưu (Gbest):</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{pso.gBestFitness.toFixed(4)}</span>
                  </div>
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Số vòng lặp (k):</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{pso.iteration} / {pso.maxIterations || 20}</span>
                  </div>
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Góc tối ưu θ_az*:</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{pso.bestAzimuth.toFixed(1)}°</span>
                  </div>
                  <div className="bg-[#0e1014] p-3 rounded-lg border border-[#1c1f28]">
                    <span className="text-xs text-zinc-400 block font-medium">Góc tối ưu θ_el*:</span>
                    <span className="text-white font-mono font-bold text-base mt-1 block">{pso.bestElevation.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ĐIỆN ÁP & DÒNG ĐIỆN (INA219) */}
          {activeTab === 'electrical' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Tracking INA219 */}
              <div className="panel-subtle p-4 sm:p-5 space-y-3">
                <span className="text-white font-bold block pb-2.5 border-b border-[#1c1f28] uppercase">
                  Tấm Pin Tracking (INA219 #1)
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Điện áp:</span>
                  <span className="text-white font-mono font-bold">{trk.voltage.toFixed(2)} V</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Dòng điện:</span>
                  <span className="text-white font-mono font-bold">{trk.current.toFixed(2)} A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Công suất:</span>
                  <span className="text-white font-mono font-bold">{trk.power.toFixed(2)} W</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Năng lượng tích lũy:</span>
                  <span className="text-white font-mono font-bold">{trk.energyWh.toFixed(1)} Wh ({trk.energyKwh.toFixed(3)} kWh)</span>
                </div>
              </div>

              {/* Static INA219 */}
              <div className="panel-subtle p-4 sm:p-5 space-y-3">
                <span className="text-white font-bold block pb-2.5 border-b border-[#1c1f28] uppercase">
                  Tấm Pin Cố Định (INA219 #2)
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Điện áp:</span>
                  <span className="text-white font-mono font-bold">{sta.voltage.toFixed(2)} V</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Dòng điện:</span>
                  <span className="text-white font-mono font-bold">{sta.current.toFixed(2)} A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Công suất:</span>
                  <span className="text-white font-mono font-bold">{sta.power.toFixed(2)} W</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Năng lượng tích lũy:</span>
                  <span className="text-white font-mono font-bold">{sta.energyWh.toFixed(1)} Wh ({sta.energyKwh.toFixed(3)} kWh)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ĐỘNG CƠ NEMA 23 & ENCODERS */}
          {activeTab === 'motors' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Azimuth Motor */}
              <div className="panel-subtle p-4 sm:p-5 space-y-3">
                <span className="text-white font-bold block pb-2.5 border-b border-[#1c1f28] uppercase">
                  Trục Ngang (Azimuth Motor NEMA 23)
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Góc hiện tại / Mục tiêu:</span>
                  <span className="text-white font-mono font-bold">{az.currentAngle.toFixed(1)}° / {az.targetAngle.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Xung Encoder:</span>
                  <span className="text-white font-mono font-bold">{az.encoderPulses.toLocaleString()} pulses</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Công tắc hành trình:</span>
                  <span className="text-zinc-300 font-semibold">MIN: {az.limitMin ? 'CHẠM' : 'OK'} | MAX: {az.limitMax ? 'CHẠM' : 'OK'}</span>
                </div>
              </div>

              {/* Elevation Motor */}
              <div className="panel-subtle p-4 sm:p-5 space-y-3">
                <span className="text-white font-bold block pb-2.5 border-b border-[#1c1f28] uppercase">
                  Trục Đứng (Elevation Motor NEMA 23)
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Góc hiện tại / Mục tiêu:</span>
                  <span className="text-white font-mono font-bold">{el.currentAngle.toFixed(1)}° / {el.targetAngle.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Xung Encoder:</span>
                  <span className="text-white font-mono font-bold">{el.encoderPulses.toLocaleString()} pulses</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-medium">Công tắc hành trình:</span>
                  <span className="text-zinc-300 font-semibold">MIN: {el.limitMin ? 'CHẠM' : 'OK'} | MAX: {el.limitMax ? 'CHẠM' : 'OK'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0d0e12] border-t border-[#191b22] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-md text-sm bg-zinc-200 hover:bg-white text-zinc-950 font-bold transition-all cursor-pointer shadow-md active:scale-95"
          >
            Đóng
          </button>
        </div>

      </div>

    </div>
  );
}
