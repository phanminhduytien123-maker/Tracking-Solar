import React, { useState, useEffect } from 'react';
import {
  Save,
  Trash2,
  Plus,
  RefreshCw,
  Sliders,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sun,
  Zap,
  Thermometer,
  Sparkles
} from 'lucide-react';
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

  // Load selected day's data into formData
  useEffect(() => {
    const found = history30Days.find(d => d.date === selectedDateStr);
    if (found) {
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
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Auto recalculate gain if not manual
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
  const handleSave = () => {
    if (!selectedDateStr) return;
    const trkWh = parseFloat(Number(formData.trackingWh).toFixed(1));
    const staWh = parseFloat(Number(formData.staticWh).toFixed(1));
    const diffWh = parseFloat((trkWh - staWh).toFixed(1));
    const diffKwh = parseFloat(((trkWh - staWh) / 1000).toFixed(3));
    const reasonsArray = formData.invalid_reasons
      ? formData.invalid_reasons.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const updatedRecord = {
      date: formData.date,
      fullDate: formData.fullDate || '',
      trackingWh: trkWh,
      trackingKwh: parseFloat((trkWh / 1000).toFixed(3)),
      staticWh: staWh,
      staticKwh: parseFloat((staWh / 1000).toFixed(3)),
      diffWh,
      diffKwh,
      gainPercent: parseFloat(Number(formData.gainPercent).toFixed(1)),
      voc_trk: parseFloat(Number(formData.voc_trk).toFixed(2)),
      voc_sta: parseFloat(Number(formData.voc_sta).toFixed(2)),
      isc_trk: parseFloat(Number(formData.isc_trk).toFixed(2)),
      isc_sta: parseFloat(Number(formData.isc_sta).toFixed(2)),
      temp_trk: parseFloat(Number(formData.temp_trk).toFixed(1)),
      temp_sta: parseFloat(Number(formData.temp_sta).toFixed(1)),
      severe_invalid: formData.severe_invalid,
      invalid_reasons: reasonsArray,
      weather_note: formData.weather_note || 'Bình thường'
    };

    if (onUpdateDayData) {
      onUpdateDayData(updatedRecord);
    }

    setFeedback({
      type: 'success',
      message: `Đã lưu thành công dữ liệu ngày ${formData.date}!`
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete day
  const handleDelete = () => {
    if (!selectedDateStr) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa bản ghi ngày ${selectedDateStr} khỏi chu kỳ 30 ngày?`)) {
      if (onDeleteDayData) {
        onDeleteDayData(selectedDateStr);
      }
      setFeedback({
        type: 'warning',
        message: `Đã xóa ngày ${selectedDateStr} khỏi danh sách đo.`
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
    if (onAddDayData) {
      onAddDayData(newRecord);
    }
    setSelectedDateStr(formatted);
    setIsAddingNewDay(false);
    setNewDateInput('');
    setFeedback({
      type: 'success',
      message: `Đã thêm thành công ngày mới ${formatted}!`
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load realistic dataset
  const handleLoadDemoDataset = () => {
    if (window.confirm('Hệ thống sẽ điền 30 ngày dữ liệu mẫu thực nghiệm theo bài báo MDPI Sustainability (Tracker +25-35%, Voc ~21.5V, Isc ~1.8A, Temp ~42°C). Tiếp tục?')) {
      if (onLoadRealisticDataset) {
        onLoadRealisticDataset();
        setFeedback({
          type: 'success',
          message: 'Đã nạp 30 ngày dữ liệu thực nghiệm chuẩn khoa học thành công!'
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    }
  };

  // Reset
  const handleReset = () => {
    if (window.confirm('Đặt lại toàn bộ dữ liệu 30 ngày về trạng thái khởi tạo ban đầu?')) {
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
    <div className="space-y-5">
      {/* 1. THANH CÔNG CỤ NHANH */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Tùy biến dữ liệu chu kỳ đo 30 ngày</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Chỉnh sửa, xóa hoặc bổ sung số liệu từng ngày (Năng lượng, Voc, Isc, Nhiệt độ) phục vụ báo cáo khoa học
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadDemoDataset}
            className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Tự động điền 30 ngày dữ liệu chuẩn thực nghiệm bài báo MDPI để xem trước giao diện và làm báo cáo"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Điền dữ liệu mẫu MDPI</span>
          </button>

          <button
            onClick={() => setIsAddingNewDay(!isAddingNewDay)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-sm flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm ngày mới</span>
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Đặt lại về mặc định"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO PHẢN HỒI */}
      {feedback && (
        <div className={`p-3 rounded-sm text-xs font-medium border flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : feedback.type === 'warning'
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* FORM THÊM NGÀY MỚI NẾU BẬT */}
      {isAddingNewDay && (
        <form onSubmit={handleAddNewDaySubmit} className="p-3 bg-blue-50/70 border border-blue-200 rounded-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Thêm một ngày đo mới vào chu kỳ:</span>
            <button
              type="button"
              onClick={() => setIsAddingNewDay(false)}
              className="text-xs text-blue-700 hover:underline cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ví dụ: 04/11 hoặc 15/10"
              value={newDateInput}
              onChange={(e) => setNewDateInput(e.target.value)}
              className="px-2.5 py-1 text-xs border border-blue-300 rounded-sm bg-white focus:outline-blue-600 w-44 font-semibold"
              required
            />
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold bg-blue-700 text-white rounded-sm hover:bg-blue-800 cursor-pointer"
            >
              Xác nhận thêm
            </button>
          </div>
        </form>
      )}

      {/* 2. BỘ CHỌN NGÀY CẦN CHỈNH SỬA */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Chọn ngày muốn chỉnh sửa / xem dữ liệu ({history30Days.length} ngày hiện có):</span>
          </span>
          <span className="text-[11px] text-zinc-500 font-normal">
            Nhấp chuột vào ngày bên dưới hoặc chọn trong danh sách
          </span>
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
                onClick={() => setSelectedDateStr(item.date)}
                className={`px-2.5 py-1 rounded-sm text-xs font-semibold shrink-0 cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                    : item.severe_invalid
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : hasData
                    ? 'bg-white text-zinc-800 border-zinc-300 hover:border-blue-500 hover:bg-blue-50/50'
                    : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                }`}
              >
                <span>{item.date}</span>
                {item.severe_invalid && <span className="ml-1 text-[10px]">⚠️</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FORM CHI TIẾT CHỈNH SỬA NGÀY ĐANG CHỌN */}
      {selectedDateStr && (
        <div className="border border-zinc-300 rounded-sm bg-white p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900">
                Chi tiết ngày đo: <span className="text-blue-700 font-mono">{formData.date}</span>
              </span>
              {formData.severe_invalid ? (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-800 rounded-sm">
                  Đang đánh dấu: Có lỗi / Loại trừ
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-sm">
                  Hợp lệ
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                title="Xóa ngày này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ngày này</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-sm flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* NHÓM 1: SẢN LƯỢNG ĐIỆN & HIỆU SUẤT */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 border-b border-zinc-200 pb-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Năng lượng sản sinh (Wh)</span>
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
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 border-b border-zinc-200 pb-1.5">
                <Sun className="w-3.5 h-3.5 text-blue-600" />
                <span>Điện áp Voc & Dòng Isc</span>
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
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 border-b border-zinc-200 pb-1.5">
                <Thermometer className="w-3.5 h-3.5 text-red-500" />
                <span>Nhiệt độ & Điều kiện</span>
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
                <label className="text-[11px] font-semibold text-zinc-700">Thời tiết / Ghi chú:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nắng tốt, Mây rải rác..."
                  value={formData.weather_note}
                  onChange={(e) => handleChange('weather_note', e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 text-xs border border-zinc-300 rounded-sm bg-white"
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
                    placeholder="Lý do (VD: MANUAL_JOG, RTC_LOST...)"
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
        <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-200 text-xs font-bold text-zinc-800 flex items-center justify-between">
          <span>Danh sách tóm tắt {history30Days.length} ngày đã đo:</span>
          <span className="text-[11px] font-normal text-zinc-500">Bấm vào hàng bất kỳ để chỉnh sửa</span>
        </div>
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-50 text-zinc-600 sticky top-0 border-b border-zinc-200">
              <tr>
                <th className="py-1.5 px-2.5">Ngày</th>
                <th className="py-1.5 px-2.5 text-right">Tracker (Wh)</th>
                <th className="py-1.5 px-2.5 text-right">Cố định (Wh)</th>
                <th className="py-1.5 px-2.5 text-right">% Gain</th>
                <th className="py-1.5 px-2.5 text-right">Voc Trk (V)</th>
                <th className="py-1.5 px-2.5 text-right">Isc Trk (A)</th>
                <th className="py-1.5 px-2.5 text-right">Nhiệt độ Trk</th>
                <th className="py-1.5 px-2.5 text-center">Trạng thái</th>
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
                    onClick={() => setSelectedDateStr(d.date)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-100/70 font-semibold'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-medium">{d.date}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-blue-700">{formatDecimal(trkWh, 1)}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-amber-700">{formatDecimal(staWh, 1)}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-emerald-700">
                      {formatSignedNumber(d.gainPercent, 1, '%')}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-zinc-700">{formatDecimal(d.voc_trk, 2)}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-zinc-700">{formatDecimal(d.isc_trk, 2)}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-zinc-700">{formatDecimal(d.temp_trk, 1)}°C</td>
                    <td className="py-1.5 px-2.5 text-center">
                      {d.severe_invalid ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-xs">
                          Lỗi
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-xs">
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

