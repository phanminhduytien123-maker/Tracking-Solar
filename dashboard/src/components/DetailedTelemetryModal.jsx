import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function DetailedTelemetryModal({
  isOpen,
  onClose,
  telemetry = {}
}) {
  const [activeTab, setActiveTab] = useState('sensors'); // 'sensors' | 'fuzzy_pso' | 'electrical' | 'motors'

  if (!isOpen) return null;

  const ina = telemetry?.INA226 || {};
  const trk = ina.tracking || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const sta = ina.static || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };

  const motors = telemetry?.motors || {};
  const az = motors.azimuth || { currentAngle: 0, targetAngle: 0, errorAngle: 0, encoderPulses: 0 };
  const el = motors.elevation || { currentAngle: 0, targetAngle: 0, errorAngle: 0, encoderPulses: 0 };

  const sensors = telemetry?.sensors || {};
  const sTop = sensors.top || { lux: 0, adc: 0 };
  const sBottom = sensors.bottom || { lux: 0, adc: 0 };
  const sLeft = sensors.left || { lux: 0, adc: 0 };
  const sRight = sensors.right || { lux: 0, adc: 0 };

  const fuzzy = telemetry?.fuzzy || { errorAngle: 0, errorRate: 0, kp: 2.4, ki: 0.12, kd: 0.65, activeRule: 'R01: ZE x ZE -> ZE (Steady Deadband)' };
  const pso = telemetry?.pso || { gBestFitness: 0.9845, iteration: 12, maxIterations: 20, status: 'CONVERGED' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xl modal-sheet-container">

      {/* Modal Card */}
      <div className="panel-card w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col modal-sheet-card border-white/20">

        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 sm:px-6 border-b border-white/10 bg-white/10 backdrop-blur-md">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
              THÔNG SỐ CHI TIẾT HỆ THỐNG
            </h2>
            <span className="text-xs text-zinc-300 font-medium">Bảng phân tích cảm biến, thuật toán Fuzzy-PID & PSO</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/5 px-4 sm:px-6 pt-2 gap-2 text-sm overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sensors')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm ${activeTab === 'sensors'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Cảm biến TEMT6000
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fuzzy_pso')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm ${activeTab === 'fuzzy_pso'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Thuật toán Fuzzy & PSO
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('electrical')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm ${activeTab === 'electrical'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Đo lường điện  INA226
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('motors')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm ${activeTab === 'motors'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Góc quay động cơ
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[72vh] sm:max-h-[68vh] text-sm">

          {/* TAB 1: SENSORS (4 LDRs) */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Ma trận 4 cảm biến quang trở
              </span>

              {/* LDR Cross Visualizer */}
              <div className="p-5 rounded-2xl bg-[#131722] border border-zinc-700/80 flex flex-col items-center justify-center gap-3">
                {/* TOP */}
                <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-36">
                  <span className="text-xs text-zinc-400 block font-semibold">LDR TRÊN (Top)</span>
                  <span className="font-mono font-bold text-base text-white mt-0.5 block">{sTop.adc}</span>
                </div>

                {/* LEFT & RIGHT */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-36">
                    <span className="text-xs text-zinc-400 block font-semibold">LDR TRÁI (Left)</span>
                    <span className="font-mono font-bold text-base text-white mt-0.5 block">{sLeft.adc}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-300 font-bold text-xs">
                    CTR
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-36">
                    <span className="text-xs text-zinc-400 block font-semibold">LDR PHẢI (Right)</span>
                    <span className="font-mono font-bold text-base text-white mt-0.5 block">{sRight.adc}</span>
                  </div>
                </div>

                {/* BOTTOM */}
                <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-36">
                  <span className="text-xs text-zinc-400 block font-semibold">LDR DƯỚI (Bottom)</span>
                  <span className="font-mono font-bold text-base text-white mt-0.5 block">{sBottom.adc}</span>
                </div>
              </div>

              {/* Differentials */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80">
                  <span className="text-xs text-zinc-400 block font-medium">Độ lệch Trái - Phải (ΔAzimuth)</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">{sensors.diffAzimuth || (sLeft.adc - sRight.adc)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80">
                  <span className="text-xs text-zinc-400 block font-medium">Độ lệch Trên - Dưới (ΔElevation)</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">{sensors.diffElevation || (sTop.adc - sBottom.adc)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FUZZY-PID & PSO */}
          {activeTab === 'fuzzy_pso' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Tham số điều khiển Fuzzy-PID & PSO thích nghi
              </span>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80">
                  <span className="text-xs text-zinc-400 block font-semibold">Hệ số Kp</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">{fuzzy.kp}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80">
                  <span className="text-xs text-zinc-400 block font-semibold">Hệ số Ki</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">{fuzzy.ki}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80">
                  <span className="text-xs text-zinc-400 block font-semibold">Hệ số Kd</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">{fuzzy.kd}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Trạng thái thuật toán PSO:</span>
                  <span className="px-2.5 py-1 rounded bg-zinc-800 text-white font-bold font-mono text-xs border border-zinc-600">
                    {pso.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Độ thích nghi tối ưu (GBest Fitness):</span>
                  <span className="font-mono font-bold text-white text-base">{pso.gBestFitness}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Số thế hệ lặp (Iterations):</span>
                  <span className="font-mono font-bold text-white text-base">{pso.iteration} / {pso.maxIterations}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ELECTRICAL */}
          {activeTab === 'electrical' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Bảng so sánh năng lượng  INA226
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tấm xoay */}
                <div className="p-4 rounded-2xl bg-[#131722] border border-zinc-700/80 space-y-3">
                  <span className="text-xs font-bold text-white block uppercase tracking-wide pb-2 border-b border-zinc-800">
                    TẤM PIN TRACKING
                  </span>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Điện áp:</span>
                      <span className="font-bold text-white">{trk.voltage.toFixed(2)} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Dòng điện:</span>
                      <span className="font-bold text-white">{trk.current.toFixed(3)} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Công suất:</span>
                      <span className="font-bold text-white text-base">{trk.power.toFixed(2)} W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Năng lượng ngày:</span>
                      <span className="font-bold text-white">{trk.energyWh.toFixed(1)} Wh</span>
                    </div>
                  </div>
                </div>

                {/* Tấm cố định */}
                <div className="p-4 rounded-2xl bg-[#131722] border border-zinc-700/80 space-y-3">
                  <span className="text-xs font-bold text-white block uppercase tracking-wide pb-2 border-b border-zinc-800">
                    TẤM PIN CỐ ĐỊNH (SOUTH 15°)
                  </span>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Điện áp:</span>
                      <span className="font-bold text-white">{sta.voltage.toFixed(2)} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Dòng điện:</span>
                      <span className="font-bold text-white">{sta.current.toFixed(3)} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Công suất:</span>
                      <span className="font-bold text-white text-base">{sta.power.toFixed(2)} W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Năng lượng ngày:</span>
                      <span className="font-bold text-white">{sta.energyWh.toFixed(1)} Wh</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MOTORS */}
          {activeTab === 'motors' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Vị trí trục & xung Encoder phản hồi
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-2.5 text-sm">
                  <span className="text-xs font-bold text-white block pb-2 border-b border-zinc-800">Phương vị (quay quanh Z)</span>
                  <div className="flex justify-between"><span className="text-zinc-400">Góc hiện tại:</span><span className="font-mono font-bold text-white">{az.currentAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Góc mục tiêu:</span><span className="font-mono font-bold text-white">{az.targetAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Xung Encoder:</span><span className="font-mono font-bold text-white">{az.encoderPulses} pulses</span></div>
                </div>

                <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-2.5 text-sm">
                  <span className="text-xs font-bold text-white block pb-2 border-b border-zinc-800">Độ ngửa</span>
                  <div className="flex justify-between"><span className="text-zinc-400">Góc hiện tại:</span><span className="font-mono font-bold text-white">{el.currentAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Góc mục tiêu:</span><span className="font-mono font-bold text-white">{el.targetAngle.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Xung Encoder:</span><span className="font-mono font-bold text-white">{el.encoderPulses} pulses</span></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 bg-[#121620] border-t border-zinc-800 flex justify-end safe-area-bottom">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}

