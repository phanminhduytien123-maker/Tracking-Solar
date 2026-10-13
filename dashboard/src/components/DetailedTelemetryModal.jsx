import React, { useState } from 'react';
import { X, Cpu, Activity, Sun, Zap, Disc3, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DetailedTelemetryModal({
  isOpen,
  onClose,
  telemetry = {}
}) {
  const [activeTab, setActiveTab] = useState('fuzzy_pso'); // 'fuzzy_pso' | 'sensors' | 'motors' | 'electrical'

  if (!isOpen) return null;

  const system = telemetry?.system || {};
  const ina = telemetry?.INA226 || {};
  const trk = ina.tracking || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const sta = ina.static || { voltage: 0, current: 0, power: 0, energyWh: 0, energyKwh: 0 };
  const comparison = ina.comparison || { percentGain: 0, powerDelta: 0, energyDeltaWh: 0, hasValidGain: false };

  const motors = telemetry?.motors || {};
  const az = motors.azimuth || { currentAngle: 180, targetAngle: 180, phi: 0, targetPhi: 0, errorAngle: 0, encoderPulses: 0, commandPulses: 0, stepLoss: 0, limitHome: false, softLimitViolated: false, isHomed: true };
  const el = motors.elevation || { currentAngle: 90, targetAngle: 90, epsilon: 90, targetEpsilon: 90, errorAngle: 0, encoderPulses: 1800, commandPulses: 1800, stepLoss: 0, limitSwitch90: false, softLimitViolated: false, isHomed: true };

  const sensors = telemetry?.sensors || {};
  const sTop = sensors.top || { lux: 0, adc: 0 };
  const sBottom = sensors.bottom || { lux: 0, adc: 0 };
  const sLeft = sensors.left || { lux: 0, adc: 0 };
  const sRight = sensors.right || { lux: 0, adc: 0 };

  const fuzzy = telemetry?.fuzzy || {};
  const azGains = fuzzy.az || { kpBase: 2.40, kiBase: 0.10, kdBase: 0.60, deltaKp: 0.0, deltaKi: 0.0, deltaKd: 0.0, kpTotal: 2.40, kiTotal: 0.10, kdTotal: 0.60 };
  const elGains = fuzzy.el || { kpBase: 2.80, kiBase: 0.12, kdBase: 0.75, deltaKp: 0.0, deltaKi: 0.0, deltaKd: 0.0, kpTotal: 2.80, kiTotal: 0.12, kdTotal: 0.75 };
  const activeAlgorithm = system.activeAlgorithm || fuzzy.activeAlgorithm || 'PSO_FUZZY_PID';

  const pso = telemetry?.pso || {
    source: 'ONLINE',
    costJ: 0.0382,
    gBestFitness: 0.0382,
    runTimeMs: 142,
    swarmSize: 10,
    iteration: 25,
    maxIterations: 25,
    status: 'CONVERGED'
  };

  const sysState = system.state || (system.isSleeping ? 'DEEP_SLEEP' : 'TRACKING');
  const wakeAt = system.wakeAt || '03:00';
  const errors = system.errors || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl modal-sheet-container">

      {/* Modal Card */}
      <div className="panel-card w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col modal-sheet-card border-white/20">

        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="py-3.5 px-5 sm:px-6 border-b border-white/10 bg-white/10 backdrop-blur-md flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
                THÔNG SỐ CHI TIẾT HỆ THỐNG
              </h2>
              {/* State Badge */}
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide uppercase border ${
                sysState === 'DEEP_SLEEP'
                  ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/50'
                  : sysState === 'FAULT'
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/50'
                    : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
              }`}>
                {sysState === 'DEEP_SLEEP' ? `🌙 NGỦ ĐÔNG (Thức ${wakeAt})` : sysState}
              </span>
            </div>
            <span className="text-xs text-zinc-300 font-medium block mt-0.5">
              Phân tích cảm biến TEMT6000, tham số thuật toán Fuzzy-PID & PSO thích nghi
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Diagnostics Status Bar */}
        <div className="px-5 sm:px-6 py-2 bg-[#0c0f17] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <span className="text-zinc-400 font-sans">Báo thức kế tiếp:</span>
            <span className="text-white font-bold">{wakeAt}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 font-sans">Độ lệch RTC:</span>
            <span className="text-emerald-400 font-bold">{system.rtcOffsetMs || 0} ms</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 font-sans">Cờ Zenith Clamp:</span>
            <span className={errors.zenithClamp ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
              {errors.zenithClamp ? 'TRIGGERED' : 'CLEAR'}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 font-sans">Cờ Mất bước:</span>
            <span className={errors.stepLossWarn ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {errors.stepLossWarn ? 'CẢNH BÁO' : 'OK'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/5 px-4 sm:px-6 pt-2 gap-2 text-sm overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('fuzzy_pso')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm flex items-center gap-1.5 ${
              activeTab === 'fuzzy_pso'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Fuzzy & PSO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sensors')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm flex items-center gap-1.5 ${
              activeTab === 'sensors'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Cảm biến TEMT6000</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('motors')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm flex items-center gap-1.5 ${
              activeTab === 'motors'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Disc3 className="w-4 h-4" />
            <span>Góc quay & Encoder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('electrical')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap font-semibold text-sm flex items-center gap-1.5 ${
              activeTab === 'electrical'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Đo lường điện INA226</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[72vh] sm:max-h-[66vh] text-sm">

          {/* TAB 1: FUZZY & PSO */}
          {activeTab === 'fuzzy_pso' && (
            <div className="space-y-4">
              
              {/* Algorithm Active Mode Badge Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80">
                <div>
                  <span className="text-xs text-zinc-400 block font-semibold">Thuật toán điều khiển đang chạy:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-white font-mono font-bold text-sm border border-zinc-600">
                      {activeAlgorithm}
                    </span>
                    <span className="text-xs text-zinc-300">
                      {activeAlgorithm === 'PID' ? '(Baseline PID)' : activeAlgorithm === 'FUZZY_PID' ? '(Fuzzy-PID Tức thời)' : '(PSO Tối ưu + Fuzzy Thích nghi)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 block font-semibold">Sai số góc tổng hợp:</span>
                  <span className="text-base font-bold font-mono text-white mt-1 block">
                    {fuzzy.errorAngle !== undefined ? fuzzy.errorAngle : (Math.sqrt((az.errorAngle || 0)**2 + (el.errorAngle || 0)**2)).toFixed(2)}°
                  </span>
                </div>
              </div>

              {/* BỘ THAM SỐ AZIMUTH VÀ ELEVATION TÁCH BIỆT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TRỤC AZIMUTH (PHƯƠNG VỊ) */}
                <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-200">
                      1. Trục Azimuth (Phương vị φ)
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">Kp, Ki, Kd</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Kp_az (PSO)</span>
                      <span className="font-mono font-bold text-sm text-zinc-200 block">{azGains.kpBase.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">+{azGains.deltaKp.toFixed(2)} Δ</span>
                      <span className="text-xs font-mono font-bold text-white block mt-1 pt-1 border-t border-zinc-800">{azGains.kpTotal.toFixed(2)}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Ki_az (PSO)</span>
                      <span className="font-mono font-bold text-sm text-zinc-200 block">{azGains.kiBase.toFixed(3)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">+{azGains.deltaKi.toFixed(3)} Δ</span>
                      <span className="text-xs font-mono font-bold text-white block mt-1 pt-1 border-t border-zinc-800">{azGains.kiTotal.toFixed(3)}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Kd_az (PSO)</span>
                      <span className="font-mono font-bold text-sm text-zinc-200 block">{azGains.kdBase.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">+{azGains.deltaKd.toFixed(2)} Δ</span>
                      <span className="text-xs font-mono font-bold text-white block mt-1 pt-1 border-t border-zinc-800">{azGains.kdTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* TRỤC ELEVATION (ĐỘ NGỬA) */}
                <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-200">
                      2. Trục Elevation (Độ ngửa ε)
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">Kp, Ki, Kd</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Kp_el (PSO)</span>
                      <span className="font-mono font-bold text-sm text-zinc-200 block">{elGains.kpBase.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">+{elGains.deltaKp.toFixed(2)} Δ</span>
                      <span className="text-xs font-mono font-bold text-white block mt-1 pt-1 border-t border-zinc-800">{elGains.kpTotal.toFixed(2)}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Ki_el (PSO)</span>
                      <span className="font-mono font-bold text-sm text-zinc-200 block">{elGains.kiBase.toFixed(3)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">+{elGains.deltaKi.toFixed(3)} Δ</span>
                      <span className="text-xs font-mono font-bold text-white block mt-1 pt-1 border-t border-zinc-800">{elGains.kiTotal.toFixed(3)}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Kd_el (PSO)</span>
                      <span className="font-mono font-bold text-sm text-zinc-200 block">{elGains.kdBase.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">+{elGains.deltaKd.toFixed(2)} Δ</span>
                      <span className="text-xs font-mono font-bold text-white block mt-1 pt-1 border-t border-zinc-800">{elGains.kdTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* BẢNG TRẠNG THÁI PSO TỐI ƯU */}
              <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-200 block pb-2 border-b border-zinc-800">
                  Thông số giải thuật PSO (Particle Swarm Optimization)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[#0a0c12] border border-zinc-800">
                    <span className="text-xs text-zinc-400 block">Nguồn nghiệm:</span>
                    <span className={`px-2 py-0.5 mt-1 inline-block rounded text-xs font-mono font-bold border ${
                      pso.source === 'ONLINE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : pso.source === 'OFFLINE_DEFAULT'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {pso.source || 'ONLINE'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0c12] border border-zinc-800">
                    <span className="text-xs text-zinc-400 block">Thời gian chạy (Runtime):</span>
                    <span className="font-mono font-bold text-sm text-white mt-1 block">
                      {pso.runTimeMs || 142} ms
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0c12] border border-zinc-800">
                    <span className="text-xs text-zinc-400 block">Kích thước bầy hạt:</span>
                    <span className="font-mono font-bold text-sm text-white mt-1 block">
                      {pso.swarmSize || 10} hạt
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0c12] border border-zinc-800">
                    <span className="text-xs text-zinc-400 block">Số vòng lặp (Iterations):</span>
                    <span className="font-mono font-bold text-sm text-white mt-1 block">
                      {pso.iteration || 25} / {pso.maxIterations || 25} vòng
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0a0c12] border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Chi phí hàm mục tiêu (Fitness Cost J):
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      J = w1·ITAE + w2·Vọt lố + w3·Dao động (càng nhỏ càng tối ưu)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {pso.costJ !== undefined ? pso.costJ : pso.gBestFitness}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CẢM BIẾN TEMT6000 */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Ma trận 4 cảm biến quang trở TEMT6000 & Sai số chuẩn hóa
              </span>

              {/* LDR Cross Visualizer */}
              <div className="p-5 rounded-2xl bg-[#131722] border border-zinc-700/80 flex flex-col items-center justify-center gap-3">
                {/* TOP */}
                <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-40">
                  <span className="text-xs text-zinc-400 block font-semibold">TRÊN (Top)</span>
                  <span className="font-mono font-bold text-base text-white mt-0.5 block">{sTop.adc} <span className="text-xs text-zinc-500 font-normal">ADC</span></span>
                  <span className="text-[10px] text-zinc-400 font-mono">{sTop.lux} lx</span>
                </div>

                {/* LEFT & RIGHT */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-40">
                    <span className="text-xs text-zinc-400 block font-semibold">TRÁI (Left)</span>
                    <span className="font-mono font-bold text-base text-white mt-0.5 block">{sLeft.adc} <span className="text-xs text-zinc-500 font-normal">ADC</span></span>
                    <span className="text-[10px] text-zinc-400 font-mono">{sLeft.lux} lx</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-300 font-bold text-xs shadow-inner">
                    CTR
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-40">
                    <span className="text-xs text-zinc-400 block font-semibold">PHẢI (Right)</span>
                    <span className="font-mono font-bold text-base text-white mt-0.5 block">{sRight.adc} <span className="text-xs text-zinc-500 font-normal">ADC</span></span>
                    <span className="text-[10px] text-zinc-400 font-mono">{sRight.lux} lx</span>
                  </div>
                </div>

                {/* BOTTOM */}
                <div className="p-3 rounded-xl bg-[#0a0c12] border border-zinc-700 text-center w-40">
                  <span className="text-xs text-zinc-400 block font-semibold">DƯỚI (Bottom)</span>
                  <span className="font-mono font-bold text-base text-white mt-0.5 block">{sBottom.adc} <span className="text-xs text-zinc-500 font-normal">ADC</span></span>
                  <span className="text-[10px] text-zinc-400 font-mono">{sBottom.lux} lx</span>
                </div>
              </div>

              {/* SAI SỐ CHUẨN HÓA E_S VÀ THÔNG SỐ QUANG HỌC */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 text-center">
                  <span className="text-xs text-zinc-400 block font-medium">e_s Azimuth (L-R)/(L+R):</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">
                    {sensors.esAz !== undefined ? sensors.esAz : (parseFloat(((sLeft.adc - sRight.adc) / Math.max(1, sLeft.adc + sRight.adc)).toFixed(3)))}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 text-center">
                  <span className="text-xs text-zinc-400 block font-medium">e_s Elevation (T-B)/(T+B):</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">
                    {sensors.esEl !== undefined ? sensors.esEl : (parseFloat(((sTop.adc - sBottom.adc) / Math.max(1, sTop.adc + sBottom.adc)).toFixed(3)))}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 text-center">
                  <span className="text-xs text-zinc-400 block font-medium">Trọng số quang học w_s:</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {sensors.weightWs !== undefined ? sensors.weightWs : 0.85}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-700/80 text-center">
                  <span className="text-xs text-zinc-400 block font-medium">Cờ bão hòa ADC (≥3950):</span>
                  <span className={`text-base font-bold font-mono mt-1 block ${sensors.isSaturated ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {sensors.isSaturated ? 'BÃO HÒA' : 'TUYẾN TÍNH'}
                  </span>
                </div>
              </div>

              {/* TRẠNG THÁI NGÀY / ĐÊM THEO NGƯỠNG X, Y */}
              <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-zinc-300 block uppercase">
                    Trạng thái ánh sáng theo ngưỡng X (40 lx) & Y (200 lx):
                  </span>
                  <span className="text-xs text-zinc-400 mt-0.5 block">
                    Tổng quang thông: {sensors.totalLux || Math.round((sLeft.lux + sRight.lux + sTop.lux + sBottom.lux) / 4)} lx (ADC: {sensors.totalLightAdc || (sLeft.adc + sRight.adc + sTop.adc + sBottom.adc)})
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-md text-xs font-mono font-bold border ${
                  sensors.dayNightState === 'SUNNY_FUSION'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : sensors.dayNightState === 'CLOUDY_ORBIT'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}>
                  {sensors.dayNightState === 'SUNNY_FUSION' ? '☀️ NẮNG TỐT (Sensor Fusion)' : sensors.dayNightState === 'CLOUDY_ORBIT' ? '☁️ NHIỀU MÂY (Quỹ đạo thiên văn)' : '🌙 ĐÊM (Deep Sleep / Park)'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: GÓC ĐỘNG CƠ & ENCODER */}
          {activeTab === 'motors' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Vị trí góc, Xung phát lệnh vs Xung đếm Encoder & Công tắc hành trình
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TRỤC AZIMUTH */}
                <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold text-white uppercase">Trục Phương Vị (Azimuth φ)</span>
                    <span className="text-[11px] font-mono text-zinc-400">K_enc = 20 count/°</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">AZ la bàn (G + H + φ):</span>
                      <span className="font-bold text-white text-sm">{(180 + (az.phi || 0)).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Góc φ từ công tắc:</span>
                      <span className="font-bold text-white text-sm">{az.phi !== undefined ? az.phi.toFixed(1) : (az.currentAngle - 180).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Xung phát lệnh (RMT):</span>
                      <span className="font-bold text-white">{az.commandPulses || Math.round((az.targetPhi || 0) * 20)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Xung đếm (PCNT Encoder):</span>
                      <span className="font-bold text-white">{az.encoderPulses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Độ lệch xung (Mất bước):</span>
                      <span className={`font-bold ${Math.abs(az.stepLoss || 0) > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {az.stepLoss || 0} xung
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-800">
                      <span className="text-zinc-400 font-sans">Công tắc Home (φ = 0°):</span>
                      <span className={`font-bold ${az.limitHome ? 'text-amber-400' : 'text-zinc-300'}`}>
                        {az.limitHome ? 'ĐANG CHẠM' : 'HỞ MẠCH (OK)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Giới hạn mềm [-120°, +120°]:</span>
                      <span className={`font-bold ${az.softLimitViolated ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {az.softLimitViolated ? 'VI PHẠM' : 'AN TOÀN'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TRỤC ELEVATION */}
                <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold text-white uppercase">Trục Độ Ngửa (Elevation ε)</span>
                    <span className="text-[11px] font-mono text-zinc-400">K_enc = 20 count/°</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Góc ngửa EL = ε:</span>
                      <span className="font-bold text-white text-sm">{el.epsilon !== undefined ? el.epsilon.toFixed(1) : el.currentAngle.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Mục tiêu ε*:</span>
                      <span className="font-bold text-white text-sm">{el.targetEpsilon !== undefined ? el.targetEpsilon.toFixed(1) : el.targetAngle.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Xung phát lệnh (RMT):</span>
                      <span className="font-bold text-white">{el.commandPulses || Math.round((el.targetEpsilon || 90) * 20)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Xung đếm (PCNT Encoder):</span>
                      <span className="font-bold text-white">{el.encoderPulses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Độ lệch xung (Mất bước):</span>
                      <span className={`font-bold ${Math.abs(el.stepLoss || 0) > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {el.stepLoss || 0} xung
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-800">
                      <span className="text-zinc-400 font-sans">Công tắc hành trình (ε = 90°):</span>
                      <span className={`font-bold ${el.limitSwitch90 ? 'text-amber-400' : 'text-zinc-300'}`}>
                        {el.limitSwitch90 ? 'ĐANG CHẠM' : 'HỞ MẠCH (OK)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-sans">Giới hạn mềm [25°, 90°]:</span>
                      <span className={`font-bold ${el.softLimitViolated ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {el.softLimitViolated ? 'VI PHẠM' : 'AN TOÀN'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Trạng thái Homing */}
              <div className="p-3 rounded-xl bg-[#131722] border border-zinc-700/80 flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Trạng thái định vị gốc toạ độ (Homing Status):</span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  ĐÃ HOÀN TẤT HOMING (HOMED)
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: ĐO LƯỜNG ĐIỆN INA226 */}
          {activeTab === 'electrical' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wider">
                Bảng so sánh năng lượng INA226 & Hệ số hiệu chuẩn chéo k
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tấm xoay */}
                <div className="p-4 rounded-2xl bg-[#131722] border border-zinc-700/80 space-y-3">
                  <span className="text-xs font-bold text-white block uppercase tracking-wide pb-2 border-b border-zinc-800">
                    TẤM PIN TRACKING (2-TRỤC)
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
                      <span className="text-zinc-400 font-sans">Năng lượng ngày (ΣE):</span>
                      <span className="font-bold text-emerald-400 text-base">{trk.energyWh.toFixed(1)} Wh</span>
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
                      <span className="text-zinc-400 font-sans">Năng lượng ngày (ΣE):</span>
                      <span className="font-bold text-zinc-300 text-base">{sta.energyWh.toFixed(1)} Wh</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tích phân Gain */}
              <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 flex flex-wrap items-center justify-between gap-3 font-mono text-sm">
                <div>
                  <span className="text-xs font-sans text-zinc-300 font-semibold block">
                    Hiệu suất tích phân năng lượng ngày % Gain (k = 1.018):
                  </span>
                  <span className="text-xs text-zinc-400 block font-sans mt-0.5">
                    % Gain = (ΣE_trk / (k · ΣE_sta) - 1) × 100%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-white block">
                    {comparison.hasValidGain !== false && (sta.energyWh >= 5.0 || comparison.percentGain !== 0)
                      ? `${comparison.percentGain >= 0 ? `+${comparison.percentGain.toFixed(1)}` : comparison.percentGain.toFixed(1)}%`
                      : '-- % (Chờ đủ 5 Wh)'
                    }
                  </span>
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
