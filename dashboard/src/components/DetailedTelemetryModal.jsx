import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatSignedNumber, formatValueOrDash, formatDecimal } from '../utils/formatters';

export default function DetailedTelemetryModal({
  isOpen,
  onClose,
  telemetry = {}
}) {
  const [activeTab, setActiveTab] = useState('motors'); // 'motors' | 'sensors' | 'electrical' | 'fuzzy_pso'

  if (!isOpen) return null;

  const system = telemetry?.system || {};
  const isMockData = system.isMock || system.source === 'mock';
  const isUnknownSource = system.source === 'unknown' && system.online;

  const ina = telemetry?.INA226 || {};
  const trk = ina.tracking || { voltage: null, current: null, power: null, energyWh: null };
  const sta = ina.static || { voltage: null, current: null, power: null, energyWh: null };

  const motors = telemetry?.motors || {};
  const az = motors.azimuth || { currentAngle: null, phi: null, errorAngle: null, encoderPulses: null, commandPulses: null };
  const el = motors.elevation || { currentAngle: null, epsilon: null, errorAngle: null, encoderPulses: null, commandPulses: null };

  const sensors = telemetry?.sensors || {};
  const sTop = sensors.top || { lux: null, adc: null };
  const sBottom = sensors.bottom || { lux: null, adc: null };
  const sLeft = sensors.left || { lux: null, adc: null };
  const sRight = sensors.right || { lux: null, adc: null };

  const hasAlgoData = Boolean(telemetry?.has_algo_data && telemetry?.pso);
  const pso = telemetry?.pso || null;
  const fuzzy = telemetry?.fuzzy || null;

  const errors = system.errors || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-zinc-300 dark:border-slate-700 rounded-sm w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl">
        
        {/* Banner dữ liệu giả lập nếu có */}
        {isMockData && (
          <div className="bg-red-700 text-white text-xs font-semibold py-1.5 px-4 text-center shrink-0">
            Dữ liệu giả lập, không phải số đo thật từ firmware
          </div>
        )}

        {/* Banner nguồn chưa xác thực nếu có */}
        {isUnknownSource && (
          <div className="bg-amber-700 text-white text-xs font-semibold py-1 px-4 text-center shrink-0">
            Nguồn dữ liệu: Chưa rõ (Bản tin thiếu cờ xác thực 'device')
          </div>
        )}

        {/* Tiêu đề Modal */}
        <div className="p-4 border-b border-zinc-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Thông số kỹ thuật chi tiết
            </h2>
            <p className="text-xs text-zinc-600 dark:text-slate-300 font-medium mt-0.5">
              Bảng dữ liệu đo đạc chi tiết từ các cảm biến và khối chấp hành
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thanh cờ trạng thái phía trên: Dạng một dòng chữ bình tĩnh */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-slate-800/80 border-b border-zinc-200 dark:border-slate-800 text-xs text-zinc-600 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
          <div>
            <span>Trạng thái máy: </span>
            <span className="font-semibold text-zinc-900 dark:text-white">{system.displayState || 'Bình thường'}</span>
          </div>
          <div>
            <span>Mất bước: </span>
            <span className={`font-semibold ${errors.stepLossWarn ? 'text-red-700 dark:text-rose-400' : 'text-zinc-800 dark:text-slate-200'}`}>
              {errors.stepLossWarn ? 'Có cảnh báo mất bước' : 'Không'}
            </span>
          </div>
          <div>
            <span>Lệch RTC: </span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {system.rtcOffsetMs !== null && system.rtcOffsetMs !== undefined 
                ? formatSignedNumber(system.rtcOffsetMs, 0, 'ms') 
                : '--'}
            </span>
          </div>
          <div>
            <span>Cờ E-Stop: </span>
            <span className={`font-semibold ${system.estop ? 'text-red-700 dark:text-rose-400' : 'text-zinc-800 dark:text-slate-200'}`}>
              {system.estop ? 'Đang dừng khẩn cấp' : 'Bình thường'}
            </span>
          </div>
        </div>

        {/* Bộ chọn 4 Tab */}
        <div className="flex border-b border-zinc-200 dark:border-slate-800 bg-zinc-100/50 dark:bg-slate-800/40 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('motors')}
            className={`py-2 px-4 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'motors'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-300 bg-white dark:bg-slate-900'
                : 'border-transparent text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Động cơ & Encoder
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            className={`py-2 px-4 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'sensors'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-300 bg-white dark:bg-slate-900'
                : 'border-transparent text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Quang sai TEMT6000
          </button>
          <button
            onClick={() => setActiveTab('electrical')}
            className={`py-2 px-4 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'electrical'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-300 bg-white dark:bg-slate-900'
                : 'border-transparent text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Điện áp & Dòng điện INA226
          </button>
          <button
            onClick={() => setActiveTab('fuzzy_pso')}
            className={`py-2 px-4 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'fuzzy_pso'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-300 bg-white dark:bg-slate-900'
                : 'border-transparent text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Giải thuật Fuzzy-PID & PSO
          </button>
        </div>

        {/* Nội dung Tab: Bảng hai cột "Tên thông số : Giá trị" thẳng hàng */}
        <div className="p-4 overflow-y-auto flex-1">

          {/* TAB 1: ĐỘNG CƠ & ENCODER */}
          {activeTab === 'motors' && (
            <div className="space-y-4">
              <table className="lab-table text-xs sm:text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-700">
                    <th className="text-left font-semibold py-2 px-3 w-1/2">Tên thông số kỹ thuật</th>
                    <th className="text-left font-semibold py-2 px-3 w-1/2">Giá trị đo đạc / Cấu hình</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Góc quay phương vị hiện tại (φ)</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">
                      {az.phi !== null && az.phi !== undefined ? formatSignedNumber(az.phi, 1, '°') : '--'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Độ ngửa hiện tại (ε)</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">
                      {el.epsilon !== null && el.epsilon !== undefined ? formatValueOrDash(el.epsilon, 1, '°') : '--'}
                      <span className="text-[11px] text-zinc-500 font-normal ml-2">(Nằm ngang = 90°, dựng đứng = 0°)</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Góc mục tiêu thiên văn (φ_ref / ε_ref)</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {az.targetAngle !== null ? formatSignedNumber(az.targetAngle - 180, 1, '°') : '--'}
                      <span className="mx-2 text-zinc-400">/</span>
                      {el.targetAngle !== null ? formatValueOrDash(el.targetAngle, 1, '°') : '--'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Sai lệch góc từng trục (Δφ / Δε)</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">
                      Δφ: {az.errorAngle !== null ? formatSignedNumber(az.errorAngle, 1, '°') : '--'}
                      <span className="mx-2 text-zinc-400">|</span>
                      Δε: {el.errorAngle !== null ? formatSignedNumber(el.errorAngle, 1, '°') : '--'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Xung encoder đọc từ phần cứng (PCNT)</td>
                    <td className="py-2 px-3 text-zinc-800">
                      Trục φ: {formatValueOrDash(az.encoderPulses, 0, 'xung')} | Trục ε: {formatValueOrDash(el.encoderPulses, 0, 'xung')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Hệ số góc encoder (K_enc)</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.k_enc_deg_per_pulse !== undefined && motors.k_enc_deg_per_pulse !== null
                        ? `${formatDecimal(motors.k_enc_deg_per_pulse, 4)} °/xung`
                        : 'Chưa xác định (chờ firmware gửi)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Sai số bước từ firmware</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.step_error_counts !== undefined && motors.step_error_counts !== null
                        ? `${motors.step_error_counts} bước (${formatSignedNumber(motors.step_error_deg, 2, '°')})`
                        : 'Không có lỗi bước'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Giới hạn mềm trục phương vị</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.az_soft_min_deg !== undefined && motors.az_soft_max_deg !== undefined
                        ? `[${formatSignedNumber(motors.az_soft_min_deg, 1, '°')}, ${formatSignedNumber(motors.az_soft_max_deg, 1, '°')}] (Đã xác nhận)`
                        : 'Chưa đo'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Giới hạn mềm trục độ ngửa</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.el_soft_min_deg !== undefined && motors.el_soft_max_deg !== undefined
                        ? `[${formatValueOrDash(motors.el_soft_min_deg, 1, '°')}, ${formatValueOrDash(motors.el_soft_max_deg, 1, '°')}] (Đã xác nhận)`
                        : 'Chưa đo'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Công tắc hành trình phương vị (AZ_MIN / AZ_MAX)</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.limit_az_min ? 'Đang chạm' : 'Hở'} / {motors.limit_az_max ? 'Đang chạm' : 'Hở'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Công tắc hành trình độ ngửa (EL_MIN / EL_MAX)</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.limit_el_min ? 'Đang chạm' : 'Hở'} / {motors.limit_el_max ? 'Đang chạm' : 'Hở'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Trạng thái gốc tọa độ (Homing)</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {motors.isHomed ? 'Đã hoàn thành xác lập gốc' : 'Chưa Homing'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CẢM BIẾN QUANG SAI TEMT6000 */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <table className="lab-table text-xs sm:text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-700">
                    <th className="text-left font-semibold py-2 px-3 w-1/3">Cảm biến quang học</th>
                    <th className="text-left font-semibold py-2 px-3 w-1/3">Giá trị ADC thô (12-bit)</th>
                    <th className="text-left font-semibold py-2 px-3 w-1/3">Độ rọi ước lượng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-3 font-medium text-zinc-700">Cảm biến Trên (Top)</td>
                    <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(sTop.adc, 0)}</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {sTop.lux !== null ? `${formatDecimal(sTop.lux, 0)} lx (ước lượng)` : 'Chưa hiệu chuẩn'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-zinc-700">Cảm biến Dưới (Bottom)</td>
                    <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(sBottom.adc, 0)}</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {sBottom.lux !== null ? `${formatDecimal(sBottom.lux, 0)} lx (ước lượng)` : 'Chưa hiệu chuẩn'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-zinc-700">Cảm biến Trái (Left)</td>
                    <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(sLeft.adc, 0)}</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {sLeft.lux !== null ? `${formatDecimal(sLeft.lux, 0)} lx (ước lượng)` : 'Chưa hiệu chuẩn'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-zinc-700">Cảm biến Phải (Right)</td>
                    <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(sRight.adc, 0)}</td>
                    <td className="py-2 px-3 text-zinc-800">
                      {sRight.lux !== null ? `${formatDecimal(sRight.lux, 0)} lx (ước lượng)` : 'Chưa hiệu chuẩn'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Trạng thái ánh sáng môi trường</td>
                    <td colSpan={2} className="py-2 px-3 font-semibold text-zinc-900">
                      {sensors.light_state === 'DAY'
                        ? 'Ban ngày (Đủ điều kiện bám theo ánh sáng)'
                        : sensors.light_state === 'NIGHT'
                          ? 'Ban đêm (Dưới ngưỡng ánh sáng kích hoạt)'
                          : 'Chưa có dữ liệu'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Cờ bão hòa ADC (&gt; 4000)</td>
                    <td colSpan={2} className="py-2 px-3 text-zinc-800">
                      {sensors.adc_saturated ? 'Bão hòa quang học' : 'Bình thường trong thang đo'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ĐIỆN ÁP & DÒNG ĐIỆN INA226 */}
          {activeTab === 'electrical' && (
            <div className="space-y-4">
              <table className="lab-table text-xs sm:text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-700">
                    <th className="text-left font-semibold py-2 px-3 w-1/3">Đại lượng đo đạc</th>
                    <th className="text-left font-semibold py-2 px-3 w-1/3 text-blue-700">Tấm tracker (INA226 #1)</th>
                    <th className="text-left font-semibold py-2 px-3 w-1/3 text-amber-800">Tấm cố định (INA226 #2)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Điện áp đo đạc (V)</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">{formatValueOrDash(trk.voltage, 2, 'V')}</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">{formatValueOrDash(sta.voltage, 2, 'V')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Dòng điện đo đạc (A)</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">{formatValueOrDash(trk.current, 2, 'A')}</td>
                    <td className="py-2 px-3 font-semibold text-zinc-900">{formatValueOrDash(sta.current, 2, 'A')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Công suất tức thời (W)</td>
                    <td className="py-2 px-3 font-bold text-blue-700">{formatValueOrDash(trk.power, 1, 'W')}</td>
                    <td className="py-2 px-3 font-bold text-amber-800">{formatValueOrDash(sta.power, 1, 'W')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Năng lượng tích lũy hôm nay (Wh)</td>
                    <td className="py-2 px-3 font-bold text-blue-700">{formatValueOrDash(trk.energyWh, 1, 'Wh')}</td>
                    <td className="py-2 px-3 font-bold text-amber-800">{formatValueOrDash(sta.energyWh, 1, 'Wh')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-600">Chênh lệch công suất tức thời</td>
                    <td colSpan={2} className="py-2 px-3 text-zinc-900 font-medium">
                      {trk.power !== null && sta.power !== null
                        ? `${formatSignedNumber(trk.power - sta.power, 1, 'W')}`
                        : '--'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: GIẢI THUẬT FUZZY-PID & PSO */}
          {activeTab === 'fuzzy_pso' && (
            <div className="space-y-4">
              {!hasAlgoData ? (
                <div className="p-6 border border-zinc-200 rounded-sm bg-zinc-50 text-center space-y-2">
                  <span className="font-bold text-zinc-900 block text-sm">
                    Chưa chạy (Không có dữ liệu thuật toán từ firmware)
                  </span>
                  <p className="text-xs text-zinc-600 max-w-lg mx-auto leading-relaxed">
                    Firmware hiện tại chưa nạp giải thuật Fuzzy/PSO hoặc đang ở chế độ thủ công/chờ.
                    Các thông số tính toán (J, Kp, Ki, Kd, số vòng lặp, thời gian thực thi) sẽ chỉ xuất hiện khi firmware gửi bản tin thuật toán hợp lệ.
                  </p>
                </div>
              ) : (
                <table className="lab-table text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-700">
                      <th className="text-left font-semibold py-2 px-3 w-1/2">Tham số thuật toán</th>
                      <th className="text-left font-semibold py-2 px-3 w-1/2">Giá trị tối ưu thời gian thực</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 text-zinc-600">Hàm mục tiêu chi phí (Cost Function J)</td>
                      <td className="py-2 px-3 font-bold text-zinc-900">{formatValueOrDash(pso?.cost_j, 4)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-600">Hệ số tỷ lệ Kp</td>
                      <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(fuzzy?.kp, 3)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-600">Hệ số tích phân Ki</td>
                      <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(fuzzy?.ki, 3)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-600">Hệ số vi phân Kd</td>
                      <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(fuzzy?.kd, 3)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-600">Số thế hệ vòng lặp PSO</td>
                      <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(pso?.iteration, 0)} vòng</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-600">Thời gian hội tụ thuật toán</td>
                      <td className="py-2 px-3 text-zinc-900">{formatValueOrDash(pso?.run_time_ms, 0, 'ms')}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>

        {/* Nút đóng ở chân modal */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-sm cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
}
