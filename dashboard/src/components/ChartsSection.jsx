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
  history30Days,
  onClearCharts,
  isAdmin = false,
  themeMode = 'light',
  availableDates = [],
  selectedIntradayDate = '',
  onSelectIntradayDate = null
}) {
  const [historyRange, setHistoryRange] = useState(1);
  const [expandedChart, setExpandedChart] = useState(null);
  const [includeExcludedDays, setIncludeExcludedDays] = useState(false);

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
        grid: {
          color: chartGridColor
        },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 11, weight: '500' },
          maxTicksLimit: 8,
          maxRotation: 0
        }
      },
      y: {
        grid: {
          color: chartGridColor
        },
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

  return (
    <div id="section-charts" className="space-y-4">
      {/* 2 ĐỒ THỊ LỚN BỐ TRÍ SONG SONG HOẶC TRÊN DƯỚI */}
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

      {/* MODAL PHÓNG TO ĐỒ THỊ NẾU CẦN */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-zinc-300 dark:border-slate-700 rounded-sm w-full max-w-5xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {expandedChart === 'intraday' ? 'Đồ thị công suất trong ngày (Phóng to)' : 'Đồ thị năng lượng tích lũy (Phóng to)'}
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
              ) : (
                <Bar data={historyChartData} options={historyOptions} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
