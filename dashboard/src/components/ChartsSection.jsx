import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Maximize2, X } from 'lucide-react';
import { formatSignedNumber, formatValueOrDash, formatDecimal } from '../utils/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RANGE_OPTIONS = [
  { value: 1, label: 'Hôm nay' },
  { value: 7, label: '7 ngày' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' }
];

export default function ChartsSection({
  intradayData,
  history30Days = [],
  onClearCharts,
  isAdmin = false,
  themeMode = 'light',
  availableDates = [],
  selectedIntradayDate = '',
  onSelectIntradayDate = null,
  onOpenDataSettings = null
}) {
  const [historyRange, setHistoryRange] = useState(1);
  const [expandedChart, setExpandedChart] = useState(null); // 'intraday' | 'history' | 'voc_isc' | 'temp'
  const [includeExcludedDays, setIncludeExcludedDays] = useState(false);

  // Bộ lọc cho bảng dữ liệu 30 ngày
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('ALL'); // 'ALL' | 'VALID' | 'INVALID'
  // Bộ lọc hiển thị đồ thị Voc/Isc
  const [vocIscViewMode, setVocIscViewMode] = useState('ALL'); // 'ALL' | 'VOC' | 'ISC'

  // Nhận diện trạng thái dark mode chuẩn xác
  const isDark = themeMode === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const chartGridColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#f1f5f9';
  const chartTickColor = isDark ? '#cbd5e1' : '#64748b';
  const chartLegendColor = isDark ? '#f8fafc' : '#334155';
  const chartGreenTick = isDark ? '#4ade80' : '#15803d';

  const trkLineColor = isDark ? '#38bdf8' : '#1d4ed8';
  const trkBgColor = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(29, 78, 216, 0.04)';
  const staLineColor = isDark ? '#fb923c' : '#c2410c';
  const gainLineColor = isDark ? '#4ade80' : '#15803d';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setExpandedChart(null);
      }
    };
    if (expandedChart) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedChart]);

  const filteredHistory = history30Days.slice(-historyRange);

  // 1. CẤU HÌNH ĐỒ THỊ CÔNG SUẤT TRONG NGÀY (05:00 - 19:00)
  const intradayLabels = intradayData.map(d => d.time);
  const intradayTrackingPower = intradayData.map(d => d.pTracking);
  const intradayStaticPower = intradayData.map(d => d.pStatic);

  const intradayChartData = {
    labels: intradayLabels,
    datasets: [
      {
        label: 'Tấm tracker (nét liền xanh)',
        data: intradayTrackingPower,
        borderColor: trkLineColor,
        backgroundColor: trkBgColor,
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: trkLineColor
      },
      {
        label: 'Cố định (Nam, ngửa 75° - nét đứt cam)',
        data: intradayStaticPower,
        borderColor: staLineColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.25,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: staLineColor
      }
    ]
  };

  const intradayOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: chartLegendColor,
          font: { family: 'Be Vietnam Pro', size: 12, weight: '600' },
          boxWidth: 24,
          boxHeight: 2,
          usePointStyle: false,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#f8fafc',
        titleFont: { family: 'Be Vietnam Pro', size: 12, weight: 'bold' },
        bodyFont: { family: 'Be Vietnam Pro', size: 12 },
        padding: 10,
        callbacks: {
          label: function (context) {
            const val = context.parsed.y;
            return ` ${context.dataset.label.split(' (')[0]}: ${formatDecimal(val, 1)} W`;
          },
          footer: function (items) {
            const trk = items.find(i => i.datasetIndex === 0)?.parsed.y;
            const sta = items.find(i => i.datasetIndex === 1)?.parsed.y;
            if (trk !== undefined && sta !== undefined) {
              const diff = trk - sta;
              return ` Chênh lệch: ${formatSignedNumber(diff, 1, 'W')}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '500' },
          maxTicksLimit: 8,
          maxRotation: 0
        }
      },
      y: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '500' },
          callback: function (value) {
            return `${formatDecimal(value, 0)} W`;
          }
        },
        beginAtZero: true
      }
    }
  };

  // 2. CẤU HÌNH ĐỒ THỊ NĂNG LƯỢNG TÍCH LŨY (Hôm nay / 7N / 14N / 30N)
  const displayHistory = includeExcludedDays
    ? filteredHistory
    : filteredHistory.map(d => d.severe_invalid ? { ...d, trackingWh: 0, trackingKwh: 0, staticWh: 0, staticKwh: 0, gainPercent: 0 } : d);

  const historyLabels = displayHistory.map(d => (historyRange === 1 ? 'Hôm nay' : (d.severe_invalid ? `${d.date} (Lỗi)` : d.date)));
  const historyTracking = displayHistory.map(d => (d.trackingWh !== undefined && d.trackingWh !== 0 ? d.trackingWh : Number(d.trackingKwh || 0) * 1000));
  const historyStatic = displayHistory.map(d => (d.staticWh !== undefined && d.staticWh !== 0 ? d.staticWh : Number(d.staticKwh || 0) * 1000));
  const historyGain = displayHistory.map(d => d.gainPercent);

  const historyChartData = {
    labels: historyLabels,
    datasets: [
      {
        type: 'line',
        label: '% Gain cải thiện',
        data: historyGain,
        borderColor: gainLineColor,
        backgroundColor: gainLineColor,
        borderWidth: 2.5,
        tension: 0.2,
        yAxisID: 'y1',
        pointRadius: 3,
        pointBackgroundColor: gainLineColor,
        order: 1
      },
      {
        type: 'bar',
        label: 'Tracker (Wh)',
        data: historyTracking,
        backgroundColor: trkLineColor,
        borderRadius: 2,
        maxBarThickness: 32,
        yAxisID: 'y',
        order: 2
      },
      {
        type: 'bar',
        label: 'Cố định (Wh)',
        data: historyStatic,
        backgroundColor: staLineColor,
        borderRadius: 2,
        maxBarThickness: 32,
        yAxisID: 'y',
        order: 3
      }
    ]
  };

  const historyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: chartLegendColor,
          font: { family: 'Be Vietnam Pro', size: 12, weight: '600' },
          boxWidth: 14,
          boxHeight: 10,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#f8fafc',
        titleFont: { family: 'Be Vietnam Pro', size: 12, weight: 'bold' },
        bodyFont: { family: 'Be Vietnam Pro', size: 12 },
        padding: 10,
        callbacks: {
          label: function (context) {
            if (context.dataset.type === 'line') {
              return ` ${context.dataset.label}: ${formatSignedNumber(context.parsed.y, 1, '%')}`;
            }
            return ` ${context.dataset.label}: ${formatDecimal(context.parsed.y, 1)} Wh`;
          },
          footer: function (items) {
            const trkItem = items.find(i => i.dataset.label === 'Tracker (Wh)');
            const staItem = items.find(i => i.dataset.label === 'Cố định (Wh)');
            if (trkItem && staItem) {
              const diff = trkItem.parsed.y - staItem.parsed.y;
              return ` Chênh lệch: ${formatSignedNumber(diff, 1, 'Wh')}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: { color: chartTickColor, font: { family: 'Be Vietnam Pro', size: 11, weight: '500' } }
      },
      y: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '500' },
          callback: function (value) {
            return `${formatDecimal(value, 0)} Wh`;
          }
        },
        beginAtZero: true
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: chartGreenTick,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '600' },
          callback: function (value) {
            return `${formatSignedNumber(value, 0, '%')}`;
          }
        }
      }
    }
  };

  // =========================================================================
  // 3. TÍNH TOÁN CÁC CHỈ SỐ KPI TỔNG HỢP 30 NGÀY
  // =========================================================================
  const validHistory = history30Days.filter(d => !d.severe_invalid);
  const totalTrkWh = history30Days.reduce((acc, d) => acc + (d.trackingWh !== undefined ? d.trackingWh : (Number(d.trackingKwh || 0) * 1000)), 0);
  const totalStaWh = history30Days.reduce((acc, d) => acc + (d.staticWh !== undefined ? d.staticWh : (Number(d.staticKwh || 0) * 1000)), 0);
  const totalDiffWh = totalTrkWh - totalStaWh;
  const overallGain = totalStaWh > 0 ? (((totalTrkWh / (1.018 * totalStaWh)) - 1) * 100) : 0;

  const vocTrkDays = validHistory.filter(d => Number(d.voc_trk) > 0);
  const avgVocTrk = vocTrkDays.length > 0 ? vocTrkDays.reduce((acc, d) => acc + Number(d.voc_trk), 0) / vocTrkDays.length : 0;
  const vocStaDays = validHistory.filter(d => Number(d.voc_sta) > 0);
  const avgVocSta = vocStaDays.length > 0 ? vocStaDays.reduce((acc, d) => acc + Number(d.voc_sta), 0) / vocStaDays.length : 0;

  const iscTrkDays = validHistory.filter(d => Number(d.isc_trk) > 0);
  const avgIscTrk = iscTrkDays.length > 0 ? iscTrkDays.reduce((acc, d) => acc + Number(d.isc_trk), 0) / iscTrkDays.length : 0;
  const iscStaDays = validHistory.filter(d => Number(d.isc_sta) > 0);
  const avgIscSta = iscStaDays.length > 0 ? iscStaDays.reduce((acc, d) => acc + Number(d.isc_sta), 0) / iscStaDays.length : 0;

  const tempTrkDays = validHistory.filter(d => Number(d.temp_trk) > 0);
  const avgTempTrk = tempTrkDays.length > 0 ? tempTrkDays.reduce((acc, d) => acc + Number(d.temp_trk), 0) / tempTrkDays.length : 0;
  const tempStaDays = validHistory.filter(d => Number(d.temp_sta) > 0);
  const avgTempSta = tempStaDays.length > 0 ? tempStaDays.reduce((acc, d) => acc + Number(d.temp_sta), 0) / tempStaDays.length : 0;

  // =========================================================================
  // 4. CẤU HÌNH ĐỒ THỊ 3: ĐỐI CHỨNG VOC VÀ ISC 30 NGÀY
  // =========================================================================
  const all30Labels = history30Days.map(d => d.date);
  const vocTrkData = history30Days.map(d => (d.voc_trk !== undefined ? Number(d.voc_trk) : 0));
  const vocStaData = history30Days.map(d => (d.voc_sta !== undefined ? Number(d.voc_sta) : 0));
  const iscTrkData = history30Days.map(d => (d.isc_trk !== undefined ? Number(d.isc_trk) : 0));
  const iscStaData = history30Days.map(d => (d.isc_sta !== undefined ? Number(d.isc_sta) : 0));

  const vocIscDatasets = [];
  if (vocIscViewMode === 'ALL' || vocIscViewMode === 'VOC') {
    vocIscDatasets.push(
      {
        type: 'line',
        label: 'Voc Tracker (V)',
        data: vocTrkData,
        borderColor: trkLineColor,
        backgroundColor: trkLineColor,
        borderWidth: 2,
        tension: 0.2,
        yAxisID: 'y_voc',
        pointRadius: 2.5,
        order: 1
      },
      {
        type: 'line',
        label: 'Voc Cố định (V)',
        data: vocStaData,
        borderColor: staLineColor,
        backgroundColor: staLineColor,
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.2,
        yAxisID: 'y_voc',
        pointRadius: 2.5,
        order: 2
      }
    );
  }
  if (vocIscViewMode === 'ALL' || vocIscViewMode === 'ISC') {
    vocIscDatasets.push(
      {
        type: 'bar',
        label: 'Isc Tracker (A)',
        data: iscTrkData,
        backgroundColor: isDark ? 'rgba(74, 222, 128, 0.7)' : 'rgba(21, 128, 61, 0.7)',
        borderRadius: 2,
        maxBarThickness: 16,
        yAxisID: 'y_isc',
        order: 3
      },
      {
        type: 'bar',
        label: 'Isc Cố định (A)',
        data: iscStaData,
        backgroundColor: isDark ? 'rgba(250, 204, 21, 0.7)' : 'rgba(202, 138, 4, 0.7)',
        borderRadius: 2,
        maxBarThickness: 16,
        yAxisID: 'y_isc',
        order: 4
      }
    );
  }

  const vocIscChartData = {
    labels: all30Labels,
    datasets: vocIscDatasets
  };

  const vocIscOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: chartLegendColor,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '600' },
          boxWidth: 12,
          padding: 8
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#f8fafc',
        padding: 10,
        callbacks: {
          label: function (ctx) {
            const isV = ctx.dataset.label.includes('Voc');
            const unit = isV ? ' V' : ' A';
            return ` ${ctx.dataset.label}: ${formatDecimal(ctx.parsed.y, 2)}${unit}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: { color: chartTickColor, font: { family: 'Be Vietnam Pro', size: 10, weight: '500' } }
      },
      y_voc: {
        type: 'linear',
        position: 'left',
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 10, weight: '500' },
          callback: (v) => `${formatDecimal(v, 0)} V`
        },
        beginAtZero: true,
        suggestedMax: 25
      },
      y_isc: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: isDark ? '#4ade80' : '#15803d',
          font: { family: 'Be Vietnam Pro', size: 10, weight: '600' },
          callback: (v) => `${formatDecimal(v, 1)} A`
        },
        beginAtZero: true,
        suggestedMax: 2.5
      }
    }
  };

  // =========================================================================
  // 5. CẤU HÌNH ĐỒ THỊ 4: NHIỆT ĐỘ VÀ CHÊNH LỆCH NHIỆT ĐỘ 30 NGÀY
  // =========================================================================
  const tempTrkData = history30Days.map(d => (d.temp_trk !== undefined ? Number(d.temp_trk) : 0));
  const tempStaData = history30Days.map(d => (d.temp_sta !== undefined ? Number(d.temp_sta) : 0));
  const tempDiffData = history30Days.map(d => {
    const t = Number(d.temp_trk) || 0;
    const s = Number(d.temp_sta) || 0;
    return t > 0 && s > 0 ? parseFloat((t - s).toFixed(1)) : 0;
  });

  const tempChartData = {
    labels: all30Labels,
    datasets: [
      {
        type: 'line',
        label: 'Nhiệt độ Tracker (°C)',
        data: tempTrkData,
        borderColor: trkLineColor,
        backgroundColor: trkLineColor,
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 2.5,
        yAxisID: 'y_temp',
        order: 1
      },
      {
        type: 'line',
        label: 'Nhiệt độ Cố định (°C)',
        data: tempStaData,
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 2.5,
        yAxisID: 'y_temp',
        order: 2
      },
      {
        type: 'bar',
        label: 'Chênh lệch ΔT (°C)',
        data: tempDiffData,
        backgroundColor: isDark ? 'rgba(192, 132, 252, 0.45)' : 'rgba(147, 51, 234, 0.35)',
        borderRadius: 2,
        maxBarThickness: 16,
        yAxisID: 'y_diff',
        order: 3
      }
    ]
  };

  const tempOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: chartLegendColor,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '600' },
          boxWidth: 12,
          padding: 8
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#f8fafc',
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatDecimal(ctx.parsed.y, 1)} °C`
        }
      }
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: { color: chartTickColor, font: { family: 'Be Vietnam Pro', size: 10, weight: '500' } }
      },
      y_temp: {
        type: 'linear',
        position: 'left',
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 10, weight: '500' },
          callback: (v) => `${formatDecimal(v, 0)} °C`
        },
        beginAtZero: false,
        suggestedMin: 20,
        suggestedMax: 55
      },
      y_diff: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: isDark ? '#c084fc' : '#9333ea',
          font: { family: 'Be Vietnam Pro', size: 10, weight: '600' },
          callback: (v) => `${formatSignedNumber(v, 0, '°C')}`
        },
        suggestedMin: -10,
        suggestedMax: 10
      }
    }
  };

  // =========================================================================
  // 6. XUẤT CSV DỮ LIỆU ĐO 30 NGÀY (UTF-8 BOM CHO EXCEL)
  // =========================================================================
  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Ngay',
      'Ngay_Day_Du',
      'San_Luong_Tracker_Wh',
      'San_Luong_Co_Dinh_Wh',
      'Chenh_Lech_Wh',
      'Phan_Tram_Gain',
      'Voc_Tracker_V',
      'Voc_Co_Dinh_V',
      'Isc_Tracker_A',
      'Isc_Co_Dinh_A',
      'Nhiet_Do_Tracker_C',
      'Nhiet_Do_Co_Dinh_C',
      'Trang_Thai',
      'Thoi_Tiet_Ghi_Chu'
    ];

    const rows = history30Days.map((d, idx) => {
      const trkWh = d.trackingWh !== undefined ? d.trackingWh : (Number(d.trackingKwh || 0) * 1000);
      const staWh = d.staticWh !== undefined ? d.staticWh : (Number(d.staticKwh || 0) * 1000);
      return [
        idx + 1,
        d.date,
        d.fullDate || '',
        trkWh,
        staWh,
        d.diffWh || (trkWh - staWh),
        d.gainPercent || 0,
        d.voc_trk || 0,
        d.voc_sta || 0,
        d.isc_trk || 0,
        d.isc_sta || 0,
        d.temp_trk || 0,
        d.temp_sta || 0,
        d.severe_invalid ? 'LOI_LOAI_TRU' : 'HOP_LE',
        `"${(d.weather_note || (Array.isArray(d.invalid_reasons) ? d.invalid_reasons.join('; ') : d.invalid_reasons) || 'Binh thuong').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `solar_tracker_30days_voc_isc_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lọc bảng dữ liệu
  const filteredTableData = history30Days.filter((item) => {
    if (tableFilterStatus === 'VALID' && item.severe_invalid) return false;
    if (tableFilterStatus === 'INVALID' && !item.severe_invalid) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      const matchDate = item.date.toLowerCase().includes(q);
      const matchNote = (item.weather_note || '').toLowerCase().includes(q);
      return matchDate || matchNote;
    }
    return true;
  });

  return (
    <div id="section-charts" className="space-y-4">
      {/* ===================================================================== */}
      {/* 2 ĐỒ THỊ LỚN HIỆN TẠI (GIỮ NGUYÊN 100% CẤU TRÚC VÀ VỊ TRÍ) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ĐỒ THỊ 1: CÔNG SUẤT TRONG NGÀY */}
        <div className="lab-card p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-zinc-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Đồ thị công suất trong ngày</span>
                {selectedIntradayDate && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-sm">
                    {selectedIntradayDate}
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-slate-300 font-medium mt-0.5">
                So sánh công suất tức thời (W) theo khung giờ đo 05:00 – 19:00
              </p>
            </div>

            <div className="flex items-center gap-2">
              {availableDates && availableDates.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor="select-intraday-date" className="text-xs text-zinc-500 dark:text-slate-400 font-medium hidden sm:inline">
                    Xem ngày:
                  </label>
                  <select
                    id="select-intraday-date"
                    value={selectedIntradayDate}
                    onChange={(e) => onSelectIntradayDate && onSelectIntradayDate(e.target.value)}
                    className="text-xs border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 rounded-sm px-2.5 py-1 font-semibold cursor-pointer outline-none shadow-xs"
                    title="Chọn ngày cụ thể để xem biểu đồ công suất 05:00 - 19:00"
                  >
                    {availableDates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={() => setExpandedChart('intraday')}
                className="p-1.5 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-sm cursor-pointer transition-colors"
                title="Phóng to đồ thị"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[260px] sm:h-[300px] w-full">
            <Line data={intradayChartData} options={intradayOptions} />
          </div>
        </div>

        {/* ĐỒ THỊ 2: NĂNG LƯỢNG TÍCH LŨY */}
        <div className="lab-card p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-zinc-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Đồ thị năng lượng tích lũy
              </h3>
              <p className="text-xs text-zinc-600 dark:text-slate-300 font-medium mt-0.5">
                Sản lượng điện (Wh) và % Gain cải thiện theo khoảng thời gian
              </p>
            </div>

            {/* Bộ chọn khoảng thời gian */}
            <div className="flex items-center gap-1 border border-zinc-300 dark:border-slate-700 rounded-sm p-0.5 bg-zinc-50 dark:bg-slate-800 text-xs">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHistoryRange(opt.value)}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    historyRange === opt.value
                      ? 'bg-white dark:bg-slate-700 font-semibold text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-slate-600'
                      : 'text-zinc-700 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setExpandedChart('history')}
                className="p-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white ml-1 border-l border-zinc-200 dark:border-slate-700 cursor-pointer"
                title="Phóng to đồ thị"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[260px] sm:h-[300px] w-full">
            <Bar data={historyChartData} options={historyOptions} />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PHÂN KHU SỐ LIỆU ĐỐI CHỨNG 30 NGÀY (THIẾT KẾ ĐỒNG BỘ GIAO DIỆN PHÒNG LAB) */}
      {/* ===================================================================== */}
      <div className="space-y-4 pt-1">
        {/* THANH TIÊU ĐỀ PHÂN KHU 30 NGÀY */}
        <div className="lab-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
              Số liệu đối chứng {history30Days.length >= 28 ? '30 ngày' : `chu kỳ (${history30Days.length} ngày - từ ${history30Days[0]?.date || '01/11'})`}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium mt-0.5">
              Tổng hợp sản lượng điện, điện áp Voc, dòng Isc và nhiệt độ tấm pin
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-600 rounded-sm cursor-pointer transition-colors"
              title="Tải toàn bộ số liệu về máy dạng file CSV"
            >
              Xuất CSV {history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`}
            </button>

            {isAdmin && onOpenDataSettings && (
              <button
                onClick={() => onOpenDataSettings()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-sm cursor-pointer shadow-xs transition-colors"
                title="Mở tab cài đặt để chỉnh sửa dữ liệu"
              >
                Tùy biến dữ liệu
              </button>
            )}
          </div>
        </div>

        {/* 5 THẺ KPI TỔNG KẾT 30 NGÀY */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* KPI 1: Năng lượng */}
          <div className="lab-card p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Tổng năng lượng {history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`}
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {formatDecimal(totalTrkWh / 1000, 2)} <span className="text-xs font-normal text-zinc-500">kWh</span>
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatSignedNumber(overallGain, 1, '%')}
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-slate-400 mt-1 flex justify-between border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Cố định: {formatDecimal(totalStaWh / 1000, 2)} kWh</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">+{formatDecimal(totalDiffWh / 1000, 2)}</span>
            </div>
          </div>

          {/* KPI 2: Điện áp Voc */}
          <div className="lab-card p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Voc trung bình
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {formatDecimal(avgVocTrk, 2)} <span className="text-xs font-normal text-zinc-500">V</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Sta: {formatDecimal(avgVocSta, 2)}V
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-slate-400 mt-1 flex justify-between border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Chênh lệch áp:</span>
              <span className="font-semibold text-zinc-800 dark:text-slate-200 font-mono">
                {formatSignedNumber(avgVocTrk - avgVocSta, 2, 'V')}
              </span>
            </div>
          </div>

          {/* KPI 3: Dòng Isc */}
          <div className="lab-card p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Isc đỉnh trung bình
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {formatDecimal(avgIscTrk, 2)} <span className="text-xs font-normal text-zinc-500">A</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Sta: {formatDecimal(avgIscSta, 2)}A
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-slate-400 mt-1 flex justify-between border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Tăng trưởng dòng:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                {avgIscSta > 0 ? `+${formatDecimal(((avgIscTrk / avgIscSta) - 1) * 100, 1)}%` : '--'}
              </span>
            </div>
          </div>

          {/* KPI 4: Nhiệt độ */}
          <div className="lab-card p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Nhiệt độ TB (Tcell)
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {formatDecimal(avgTempTrk, 1)} <span className="text-xs font-normal text-zinc-500">°C</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Sta: {formatDecimal(avgTempSta, 1)}°C
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-slate-400 mt-1 flex justify-between border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Chênh lệch ΔT:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400 font-mono">
                {formatSignedNumber(avgTempTrk - avgTempSta, 1, '°C')}
              </span>
            </div>
          </div>

          {/* KPI 5: Trạng thái đo */}
          <div className="lab-card p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Độ tin cậy chu kỳ
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {validHistory.length}/{history30Days.length}
              </span>
              <span className="text-xs text-zinc-500">ngày</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-slate-400 mt-1 flex justify-between border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Ngày loại trừ:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                {history30Days.length - validHistory.length} ngày
              </span>
            </div>
          </div>
        </div>

        {/* 2 ĐỒ THỊ ĐỐI CHỨNG MỚI: VOC & ISC 30 NGÀY VÀ NHIỆT ĐỘ 30 NGÀY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ĐỒ THỊ 3: VOC VÀ ISC */}
          <div className="lab-card p-4 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-zinc-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Đồ thị Voc & Isc {history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium mt-0.5">
                  Điện áp hở mạch Voc (V) và dòng ngắn mạch Isc (A)
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center border border-zinc-300 dark:border-slate-700 rounded-sm p-0.5 bg-zinc-50 dark:bg-slate-800 text-[11px]">
                  <button
                    onClick={() => setVocIscViewMode('ALL')}
                    className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                      vocIscViewMode === 'ALL'
                        ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-slate-300'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setVocIscViewMode('VOC')}
                    className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                      vocIscViewMode === 'VOC'
                        ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-slate-300'
                    }`}
                  >
                    Chỉ Voc
                  </button>
                  <button
                    onClick={() => setVocIscViewMode('ISC')}
                    className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                      vocIscViewMode === 'ISC'
                        ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-slate-300'
                    }`}
                  >
                    Chỉ Isc
                  </button>
                </div>

                <button
                  onClick={() => setExpandedChart('voc_isc')}
                  className="p-1.5 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-sm cursor-pointer transition-colors"
                  title="Phóng to đồ thị"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="h-[260px] sm:h-[300px] w-full">
              <Bar data={vocIscChartData} options={vocIscOptions} />
            </div>
          </div>

          {/* ĐỒ THỊ 4: NHIỆT ĐỘ */}
          <div className="lab-card p-4 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-zinc-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Đồ thị nhiệt độ tấm pin {history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium mt-0.5">
                  Nhiệt độ bề mặt pin (°C) và chênh lệch nhiệt độ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedChart('temp')}
                  className="p-1.5 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-sm cursor-pointer transition-colors"
                  title="Phóng to đồ thị"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="h-[260px] sm:h-[300px] w-full">
              <Bar data={tempChartData} options={tempOptions} />
            </div>
          </div>
        </div>

        {/* BẢNG NHẬT KÝ SỐ LIỆU ĐO 30 NGÀY CHI TIẾT */}
        <div className="lab-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Bảng số liệu {history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`}</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 rounded-sm font-mono">
                  {filteredTableData.length} bản ghi
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium mt-0.5">
                Nhật ký số liệu đối chứng chi tiết từng ngày
              </p>
            </div>

            {/* Bộ lọc bảng */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Tìm ngày..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 focus:outline-blue-600 w-32 sm:w-40 font-medium"
              />

              <select
                value={tableFilterStatus}
                onChange={(e) => setTableFilterStatus(e.target.value)}
                className="py-1 px-2 text-xs border border-zinc-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="VALID">Chỉ ngày hợp lệ</option>
                <option value="INVALID">Ngày có lỗi / cảnh báo</option>
              </select>
            </div>
          </div>

          {/* Bảng dữ liệu có cuộn dọc */}
          <div className="border border-zinc-200 dark:border-slate-800 rounded-sm overflow-x-auto max-h-[420px]">
            <table className="w-full text-left border-collapse text-sm font-sans">
              <thead className="bg-zinc-50/95 dark:bg-slate-800/95 text-zinc-800 dark:text-slate-200 sticky top-0 z-10 border-b border-zinc-200 dark:border-slate-700 text-xs sm:text-[13px] font-bold">
                <tr>
                  <th className="py-3 px-3.5">STT</th>
                  <th className="py-3 px-3.5">Ngày</th>
                  <th className="py-3 px-3.5 text-right">Tracker (Wh)</th>
                  <th className="py-3 px-3.5 text-right">Cố định (Wh)</th>
                  <th className="py-3 px-3.5 text-right">% Gain</th>
                  <th className="py-3 px-3.5 text-right">Voc Trk (V)</th>
                  <th className="py-3 px-3.5 text-right">Voc Sta (V)</th>
                  <th className="py-3 px-3.5 text-right">Isc Trk (A)</th>
                  <th className="py-3 px-3.5 text-right">Isc Sta (A)</th>
                  <th className="py-3 px-3.5 text-right">T° Trk (°C)</th>
                  <th className="py-3 px-3.5 text-right">T° Sta (°C)</th>
                  <th className="py-3 px-3.5">Ghi chú</th>
                  <th className="py-3 px-3.5 text-center">Trạng thái</th>
                  {isAdmin && onOpenDataSettings && <th className="py-3 px-3.5 text-center">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60 text-sm">
                {filteredTableData.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-zinc-500 dark:text-slate-400">
                      Không tìm thấy bản ghi nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredTableData.map((row, idx) => {
                    const trkWh = row.trackingWh !== undefined ? row.trackingWh : (Number(row.trackingKwh || 0) * 1000);
                    const staWh = row.staticWh !== undefined ? row.staticWh : (Number(row.staticKwh || 0) * 1000);
                    return (
                      <tr key={row.date} className="hover:bg-zinc-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-3.5 text-zinc-400 dark:text-slate-500 font-medium text-xs sm:text-sm">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-bold text-zinc-900 dark:text-white whitespace-nowrap text-sm sm:text-[15px]">{row.date}</td>
                        <td className="py-3 px-3.5 text-right font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-[15px]">
                          {formatDecimal(trkWh, 1)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-amber-600 dark:text-amber-400 text-sm sm:text-[15px]">
                          {formatDecimal(staWh, 1)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm sm:text-[15px]">
                          {formatSignedNumber(row.gainPercent, 1, '%')}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-800 dark:text-slate-100 text-sm sm:text-[15px]">
                          {formatDecimal(row.voc_trk, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-600 dark:text-slate-300 text-sm sm:text-[15px]">
                          {formatDecimal(row.voc_sta, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-sm sm:text-[15px]">
                          {formatDecimal(row.isc_trk, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-600 dark:text-slate-300 text-sm sm:text-[15px]">
                          {formatDecimal(row.isc_sta, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-zinc-800 dark:text-slate-200 text-sm sm:text-[15px]">
                          {formatDecimal(row.temp_trk, 1)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-zinc-500 dark:text-slate-400 text-sm sm:text-[15px]">
                          {formatDecimal(row.temp_sta, 1)}
                        </td>
                        <td className="py-3 px-3.5 text-zinc-600 dark:text-slate-300 text-xs sm:text-sm max-w-[140px] truncate" title={row.weather_note || 'Bình thường'}>
                          {row.weather_note || 'Bình thường'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {row.severe_invalid ? (
                            <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-sm">
                              Lỗi
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-sm">
                              Hợp lệ
                            </span>
                          )}
                        </td>
                        {isAdmin && onOpenDataSettings && (
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => onOpenDataSettings(row.date)}
                              className="px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                              title={`Chỉnh sửa dữ liệu ngày ${row.date}`}
                            >
                              Sửa
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL PHÓNG TO ĐỒ THỊ (HỖ TRỢ CẢ 4 ĐỒ THỊ) */}
      {/* ===================================================================== */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-zinc-300 dark:border-slate-700 rounded-sm w-full max-w-5xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {expandedChart === 'intraday'
                  ? 'Đồ thị công suất trong ngày (Phóng to)'
                  : expandedChart === 'history'
                  ? 'Đồ thị năng lượng tích lũy (Phóng to)'
                  : expandedChart === 'voc_isc'
                  ? `Đồ thị Voc & Isc ${history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`} (Phóng to)`
                  : `Đồ thị nhiệt độ ${history30Days.length >= 28 ? '30 ngày' : `(${history30Days.length} ngày)`} (Phóng to)`}
              </h3>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[60vh] w-full">
              {expandedChart === 'intraday' ? (
                <Line data={intradayChartData} options={intradayOptions} />
              ) : expandedChart === 'history' ? (
                <Bar data={historyChartData} options={historyOptions} />
              ) : expandedChart === 'voc_isc' ? (
                <Bar data={vocIscChartData} options={vocIscOptions} />
              ) : (
                <Bar data={tempChartData} options={tempOptions} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
