import React, { useState, useEffect } from 'react';
import { formatDecimal, formatSignedNumber } from '../utils/formatters';

export default function HistoryDataManagementTab({
  history30Days = [],
  onUpdateDayData = null,
  onDeleteDayData = null,
  onAddDayData = null,
  onResetHistoryData = null,
  onLoadRealisticDataset = null,
  initialTargetDate = null
}) {
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    if (initialTargetDate) return initialTargetDate;
    if (history30Days && history30Days.length > 0) {
      return history30Days[history30Days.length - 1].date;
    }
    return '';
  });

  const [feedback, setFeedback] = useState(null);
  const [isManualGain, setIsManualGain] = useState(false);
  const [isAddingNewDay, setIsAddingNewDay] = useState(false);
  const [newDateInput, setNewDateInput] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const lastLoadedDateRef = React.useRef(null);

  // Form values state for the selected day
  const [formData, setFormData] = useState({
    date: '',
    fullDate: '',
    trackingWh: 0,
    staticWh: 0,
    gainPercent: 0,
    voc_trk: 0,
    voc_sta: 0,
    isc_trk: 0,
    isc_sta: 0,
    temp_trk: 0,
    temp_sta: 0,
    severe_invalid: false,
    invalid_reasons: '',
    weather_note: ''
  });

  // When initialTargetDate or history30Days changes, sync selectedDateStr
  useEffect(() => {
    if (initialTargetDate && history30Days.some(d => d.date === initialTargetDate)) {
      setSelectedDateStr(initialTargetDate);
    } else if (!selectedDateStr && history30Days.length > 0) {
      setSelectedDateStr(history30Days[history30Days.length - 1].date);
    }
  }, [initialTargetDate, history30Days]);

  // Load selected day's data into formData (chỉ nạp lại khi chuyển ngày hoặc chưa nạp)
  useEffect(() => {
    const found = history30Days.find(d => d.date === selectedDateStr);
    if (!found) return;

    if (lastLoadedDateRef.current !== selectedDateStr) {
      lastLoadedDateRef.current = selectedDateStr;
      setIsDirty(false);
      const trkWh = found.trackingWh !== undefined ? found.trackingWh : (Number(found.trackingKwh || 0) * 1000);
      const staWh = found.staticWh !== undefined ? found.staticWh : (Number(found.staticKwh || 0) * 1000);
      setFormData({
        date: found.date || '',
        fullDate: found.fullDate || '',
        trackingWh: trkWh,
        staticWh: staWh,
        gainPercent: found.gainPercent !== undefined ? found.gainPercent : 0,
        voc_trk: found.voc_trk !== undefined ? found.voc_trk : 0,
        voc_sta: found.voc_sta !== undefined ? found.voc_sta : 0,
        isc_trk: found.isc_trk !== undefined ? found.isc_trk : 0,
        isc_sta: found.isc_sta !== undefined ? found.isc_sta : 0,
        temp_trk: found.temp_trk !== undefined ? found.temp_trk : 0,
        temp_sta: found.temp_sta !== undefined ? found.temp_sta : 0,
        severe_invalid: !!found.severe_invalid,
        invalid_reasons: Array.isArray(found.invalid_reasons) ? found.invalid_reasons.join(', ') : (found.invalid_reasons || ''),
        weather_note: found.weather_note || ''
      });
      setIsManualGain(false);
    }
  }, [selectedDateStr, history30Days]);

  // Handler for input change
  const handleChange = (field, value) => {
    setIsDirty(true);
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if ((field === 'trackingWh' || field === 'staticWh') && !isManualGain) {
        const trk = Number(field === 'trackingWh' ? value : prev.trackingWh);
        const sta = Number(field === 'staticWh' ? value : prev.staticWh);
        const expectedSta = 1.018 * sta;
        if (expectedSta > 0) {
          next.gainPercent = parseFloat((((trk / expectedSta) - 1) * 100).toFixed(1));
        } else {
          next.gainPercent = 0;
        }
      }
      return next;
    });
  };

  // Save changes
  const handleSave = (customTarget = null) => {
    const targetData = customTarget || formData;
    if (!targetData.date) return;
    const trkWh = parseFloat(Number(targetData.trackingWh).toFixed(1));
    const staWh = parseFloat(Number(targetData.staticWh).toFixed(1));
    const diffWh = parseFloat((trkWh - staWh).toFixed(1));
    const diffKwh = parseFloat(((trkWh - staWh) / 1000).toFixed(3));
    const reasonsArray = targetData.invalid_reasons
      ? (typeof targetData.invalid_reasons === 'string' ? targetData.invalid_reasons.split(',').map(s => s.trim()).filter(Boolean) : targetData.invalid_reasons)
      : [];

    const updatedRecord = {
      date: targetData.date,
      fullDate: targetData.fullDate || '',
      trackingWh: trkWh,
      trackingKwh: parseFloat((trkWh / 1000).toFixed(3)),
      staticWh: staWh,
      staticKwh: parseFloat((staWh / 1000).toFixed(3)),
      diffWh,
      diffKwh,
      gainPercent: parseFloat(Number(targetData.gainPercent).toFixed(1)),
      voc_trk: parseFloat(Number(targetData.voc_trk).toFixed(2)),
      voc_sta: parseFloat(Number(targetData.voc_sta).toFixed(2)),
      isc_trk: parseFloat(Number(targetData.isc_trk).toFixed(2)),
      isc_sta: parseFloat(Number(targetData.isc_sta).toFixed(2)),
      temp_trk: parseFloat(Number(targetData.temp_trk).toFixed(1)),
      temp_sta: parseFloat(Number(targetData.temp_sta).toFixed(1)),
      severe_invalid: targetData.severe_invalid,
      invalid_reasons: reasonsArray,
      weather_note: targetData.weather_note || 'Bình thường',
      isCustomized: true
    };

    setIsDirty(false);
    lastLoadedDateRef.current = targetData.date;

    if (onUpdateDayData) {
      onUpdateDayData(updatedRecord);
    }

    setFeedback({
      type: 'success',
      message: `Đã lưu thành công dữ liệu ngày ${targetData.date}!`
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Chuyển chọn ngày có kiểm tra lưu tự động
  const handleSelectDay = (targetDate) => {
    if (targetDate === selectedDateStr) return;
    if (isDirty) {
      handleSave();
    }
    lastLoadedDateRef.current = null;
    setSelectedDateStr(targetDate);
  };

  // Delete day
  const handleDelete = () => {
    if (!selectedDateStr) return;
    if (window.confirm(`Xác nhận xóa bản ghi ngày ${selectedDateStr} khỏi chu kỳ 30 ngày?`)) {
      lastLoadedDateRef.current = null;
      setIsDirty(false);
      if (onDeleteDayData) {
        onDeleteDayData(selectedDateStr);
      }
      setFeedback({
        type: 'warning',
        message: `Đã xóa ngày ${selectedDateStr} khỏi danh sách.`
      });
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Add new day
  const handleAddNewDaySubmit = (e) => {
    e.preventDefault();
    if (!newDateInput.trim()) return;
    const formatted = newDateInput.trim();
    if (history30Days.some(d => d.date === formatted)) {
      alert(`Ngày ${formatted} đã tồn tại trong danh sách!`);
      return;
    }
    const newRecord = {
      date: formatted,
      fullDate: new Date().toISOString().split('T')[0],
      trackingWh: 200,
      trackingKwh: 0.200,
      staticWh: 150,
      staticKwh: 0.150,
      diffWh: 50,
      diffKwh: 0.050,
      gainPercent: 31.0,
      voc_trk: 21.6,
      voc_sta: 21.1,
      isc_trk: 1.82,
      isc_sta: 1.36,
      temp_trk: 41.5,
      temp_sta: 44.0,
      severe_invalid: false,
      invalid_reasons: [],
      weather_note: 'Bình thường'
    };
    lastLoadedDateRef.current = null;
    setIsDirty(false);
    if (onAddDayData) {
      onAddDayData(newRecord);
    }
    setSelectedDateStr(formatted);
    setIsAddingNewDay(false);
    setNewDateInput('');
    setFeedback({
      type: 'success',
      message: `Đã thêm ngày mới ${formatted}!`
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load realistic dataset
  const handleLoadDemoDataset = () => {
    if (window.confirm('Hệ thống sẽ điền dữ liệu mẫu 30 ngày vào chu kỳ đối chứng. Tiếp tục?')) {
      lastLoadedDateRef.current = null;
      setIsDirty(false);
      if (onLoadRealisticDataset) {
        onLoadRealisticDataset();
        setFeedback({
          type: 'success',
          message: 'Đã nạp 30 ngày dữ liệu mẫu thành công!'
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    }
  };

  // Reset
  const handleReset = () => {
    if (window.confirm('Đặt lại toàn bộ dữ liệu 30 ngày về trạng thái ban đầu?')) {
      lastLoadedDateRef.current = null;
      setIsDirty(false);
      if (onResetHistoryData) {
        onResetHistoryData();
        setFeedback({
          type: 'info',
          message: 'Đã đặt lại dữ liệu 30 ngày.'
        });
        setTimeout(() => setFeedback(null), 3500);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. THANH CÔNG CỤ */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">
            Tùy biến dữ liệu chu kỳ 30 ngày
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">
            Chỉnh sửa, xóa hoặc bổ sung số liệu từng ngày đo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadDemoDataset}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm cursor-pointer transition-colors"
          >
            Điền dữ liệu mẫu
          </button>

          <button
            onClick={() => setIsAddingNewDay(!isAddingNewDay)}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-sm cursor-pointer transition-colors"
          >
            Thêm ngày mới
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-sm cursor-pointer transition-colors"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* THÔNG BÁO PHẢN HỒI */}
      {feedback && (
        <div className={`p-2.5 rounded-sm text-xs font-medium border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : feedback.type === 'warning'
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* FORM THÊM NGÀY MỚI NẾU BẬT */}
      {isAddingNewDay && (
        <form onSubmit={handleAddNewDaySubmit} className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900">Thêm một ngày đo mới:</span>
            <button
              type="button"
              onClick={() => setIsAddingNewDay(false)}
              className="text-xs text-zinc-500 hover:underline cursor-pointer"
            >
              Hủy
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="VD: 04/11"
              value={newDateInput}
              onChange={(e) => setNewDateInput(e.target.value)}
              className="px-2.5 py-1 text-xs border border-zinc-300 rounded-sm bg-white focus:outline-blue-600 w-36 font-semibold"
              required
            />
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold bg-blue-700 text-white rounded-sm hover:bg-blue-800 cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </form>
      )}

      {/* 2. BỘ CHỌN NGÀY CẦN CHỈNH SỬA */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
          <span>Chọn ngày muốn chỉnh sửa ({history30Days.length} ngày hiện có):</span>
        </label>

        {/* Thanh cuộn ngang các ngày để chọn nhanh */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5">
          {history30Days.map((item) => {
            const isSelected = item.date === selectedDateStr;
            const hasData = (item.trackingWh > 0 || item.staticWh > 0 || item.voc_trk > 0);
            return (
              <button
                key={item.date}
                type="button"
                onClick={() => handleSelectDay(item.date)}
                className={`px-2.5 py-1 rounded-sm text-xs font-semibold shrink-0 cursor-pointer transition-all border font-mono ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-700'
                    : item.severe_invalid
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : hasData
                    ? 'bg-white text-zinc-800 border-zinc-300 hover:border-blue-500'
                    : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                }`}
              >
                <span>{item.date}</span>
                {item.severe_invalid && <span className="ml-1 text-[10px]">!</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FORM CHI TIẾT CHỈNH SỬA NGÀY ĐANG CHỌN */}
      {selectedDateStr && (
        <div className="border border-zinc-200 rounded-sm bg-white p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900">
                Chi tiết ngày đo: <span className="text-blue-700 font-mono">{formData.date}</span>
              </span>
              {isDirty && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 rounded-xs border border-amber-300 animate-pulse">
                  Chưa lưu
                </span>
              )}
              {formData.severe_invalid ? (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-100 text-red-800 rounded-xs">
                  Loại trừ
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded-xs">
                  Hợp lệ
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-sm cursor-pointer transition-colors"
              >
                Xóa ngày này
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className={`px-3.5 py-1 text-xs font-bold text-white rounded-sm cursor-pointer shadow-xs transition-all ${
                  isDirty
                    ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400 font-extrabold'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {isDirty ? 'Lưu thay đổi *' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* NHÓM 1: SẢN LƯỢNG ĐIỆN & HIỆU SUẤT */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
              <div className="text-xs font-bold text-zinc-900 border-b border-zinc-200 pb-1.5">
                Năng lượng sản sinh (Wh)
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 flex justify-between">
                  <span>Tấm Tracker (Wh):</span>
                  <span className="text-zinc-500 font-mono">≈ {(formData.trackingWh / 1000).toFixed(3)} kWh</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.trackingWh}
                  onChange={(e) => handleChange('trackingWh', e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700 flex justify-between">
                  <span>Tấm Cố định (Wh):</span>
                  <span className="text-zinc-500 font-mono">≈ {(formData.staticWh / 1000).toFixed(3)} kWh</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.staticWh}
                  onChange={(e) => handleChange('staticWh', e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-700">Hiệu suất tăng (% Gain):</label>
                  <label className="text-[10px] text-zinc-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isManualGain}
                      onChange={(e) => setIsManualGain(e.target.checked)}
                      className="rounded-xs"
                    />
                    <span>Sửa tay</span>
                  </label>
                </div>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isManualGain}
                  value={formData.gainPercent}
                  onChange={(e) => handleChange('gainPercent', e.target.value)}
                  className={`w-full mt-1 px-2.5 py-1 text-xs border rounded-sm font-mono font-bold ${
                    isManualGain
                      ? 'border-blue-500 bg-white text-blue-700'
                      : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                  }`}
                />
              </div>
            </div>

            {/* NHÓM 2: ĐO VOC VÀ ISC */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
              <div className="text-xs font-bold text-zinc-900 border-b border-zinc-200 pb-1.5">
                Điện áp Voc và Dòng Isc
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Voc Tracker (V):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.voc_trk}
                    onChange={(e) => handleChange('voc_trk', e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Voc Cố định (V):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.voc_sta}
                    onChange={(e) => handleChange('voc_sta', e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Isc Tracker (A):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.isc_trk}
                    onChange={(e) => handleChange('isc_trk', e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">Isc Cố định (A):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.isc_sta}
                    onChange={(e) => handleChange('isc_sta', e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* NHÓM 3: NHIỆT ĐỘ & TRẠNG THÁI */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
              <div className="text-xs font-bold text-zinc-900 border-b border-zinc-200 pb-1.5">
                Nhiệt độ và Điều kiện
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">T° Tracker (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temp_trk}
                    onChange={(e) => handleChange('temp_trk', e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700">T° Cố định (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temp_sta}
                    onChange={(e) => handleChange('temp_sta', e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Ghi chú:</label>
                <input
                  type="text"
                  placeholder="VD: Nắng tốt..."
                  value={formData.weather_note}
                  onChange={(e) => handleChange('weather_note', e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 text-xs border border-zinc-300 rounded-sm bg-white font-medium"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.severe_invalid}
                    onChange={(e) => handleChange('severe_invalid', e.target.checked)}
                    className="rounded-xs text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-semibold text-zinc-800">
                    Đánh dấu ngày lỗi / loại trừ
                  </span>
                </label>
                {formData.severe_invalid && (
                  <input
                    type="text"
                    placeholder="Lý do..."
                    value={formData.invalid_reasons}
                    onChange={(e) => handleChange('invalid_reasons', e.target.value)}
                    className="w-full mt-1.5 px-2 py-0.5 text-xs border border-red-300 rounded-sm bg-red-50 text-red-800"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. BẢNG XEM NHANH TẤT CẢ CÁC NGÀY TRONG CHU KỲ */}
      <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white">
        <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200 text-xs font-bold text-zinc-800 flex items-center justify-between">
          <span>Danh sách {history30Days.length} ngày đã đo:</span>
          <span className="text-[11px] font-normal text-zinc-500">Nhấp chọn hàng để chỉnh sửa</span>
        </div>
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-left border-collapse text-[13px] tabular-nums font-sans">
            <thead className="bg-zinc-50 text-zinc-800 sticky top-0 border-b border-zinc-200 text-xs font-bold">
              <tr>
                <th className="py-2 px-2.5">Ngày</th>
                <th className="py-2 px-2.5 text-right">Tracker (Wh)</th>
                <th className="py-2 px-2.5 text-right">Cố định (Wh)</th>
                <th className="py-2 px-2.5 text-right">% Gain</th>
                <th className="py-2 px-2.5 text-right">Voc Trk (V)</th>
                <th className="py-2 px-2.5 text-right">Isc Trk (A)</th>
                <th className="py-2 px-2.5 text-right">Nhiệt độ Trk</th>
                <th className="py-2 px-2.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {history30Days.map((d) => {
                const isSelected = d.date === selectedDateStr;
                const trkWh = d.trackingWh !== undefined ? d.trackingWh : (Number(d.trackingKwh || 0) * 1000);
                const staWh = d.staticWh !== undefined ? d.staticWh : (Number(d.staticKwh || 0) * 1000);
                return (
                  <tr
                    key={d.date}
                    onClick={() => handleSelectDay(d.date)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 font-semibold'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <td className="py-2 px-2.5 font-bold text-zinc-900">{d.date}</td>
                    <td className="py-2 px-2.5 text-right font-bold text-blue-600 text-sm">{formatDecimal(trkWh, 1)}</td>
                    <td className="py-2 px-2.5 text-right font-bold text-amber-600 text-sm">{formatDecimal(staWh, 1)}</td>
                    <td className="py-2 px-2.5 text-right font-extrabold text-emerald-600 text-sm">
                      {formatSignedNumber(d.gainPercent, 1, '%')}
                    </td>
                    <td className="py-2 px-2.5 text-right font-semibold text-zinc-900">{formatDecimal(d.voc_trk, 2)}</td>
                    <td className="py-2 px-2.5 text-right font-semibold text-emerald-600">{formatDecimal(d.isc_trk, 2)}</td>
                    <td className="py-2 px-2.5 text-right font-medium text-zinc-800">{formatDecimal(d.temp_trk, 1)}°C</td>
                    <td className="py-2 px-2.5 text-center">
                      {d.severe_invalid ? (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-800 rounded-sm">
                          Lỗi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-sm">
                          Hợp lệ
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
