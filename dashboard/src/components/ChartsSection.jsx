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

export default function ChartsSection({ intradayData, history30Days, onClearCharts, isAdmin = false }) {
  const [historyRange, setHistoryRange] = useState(1);
  const [expandedChart, setExpandedChart] = useState(null);
  const [includeExcludedDays, setIncludeExcludedDays] = useState(false);

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
        borderColor: '#1d4ed8', // Xanh dương kỹ thuật
        backgroundColor: 'rgba(29, 78, 216, 0.04)',
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointRadius: 0, // Không chấm tròn ở mỗi điểm dữ liệu
        pointHoverRadius: 5,
        pointBackgroundColor: '#1d4ed8'
      },
      {
        label: 'Cố định (Nam, ngửa 75° - nét đứt cam)',
        data: intradayStaticPower,
        borderColor: '#c2410c', // Cam đất kỹ thuật
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5], // Nét đứt phân biệt khi in đen trắng
        tension: 0.25,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#c2410c'
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
          color: '#334155',
          font: { family: 'Be Vietnam Pro', size: 12, weight: '500' },
          boxWidth: 24,
          boxHeight: 2,
          usePointStyle: false,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
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
          color: '#f1f5f9'
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Be Vietnam Pro', size: 11 },
          maxTicksLimit: 8,
          maxRotation: 0
        }
      },
      y: {
        grid: {
          color: '#f1f5f9'
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Be Vietnam Pro', size: 11 },
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
        borderColor: '#15803d', // Xanh lá đậm
        backgroundColor: '#15803d',
        borderWidth: 2,
        tension: 0.2,
        yAxisID: 'y1',
        pointRadius: 2.5,
        order: 1
      },
      {
        type: 'bar',
        label: 'Tracker (Wh)',
        data: historyTracking,
        backgroundColor: '#1d4ed8', // Xanh dương
        borderRadius: 2,
        maxBarThickness: 32,
        yAxisID: 'y',
        order: 2
      },
      {
        type: 'bar',
        label: 'Cố định (Wh)',
        data: historyStatic,
        backgroundColor: '#c2410c', // Cam
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
          color: '#334155',
          font: { family: 'Be Vietnam Pro', size: 12, weight: '500' },
          boxWidth: 14,
          boxHeight: 10,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
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
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { family: 'Be Vietnam Pro', size: 11 } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { family: 'Be Vietnam Pro', size: 11 },
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
          color: '#15803d',
          font: { family: 'Be Vietnam Pro', size: 11 },
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
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Đồ thị công suất trong ngày
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                So sánh công suất tức thời (W) theo khung giờ đo 05:00 – 19:00
              </p>
            </div>
            <button
              onClick={() => setExpandedChart('intraday')}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-sm cursor-pointer"
              title="Phóng to đồ thị"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[260px] sm:h-[300px] w-full">
            <Line data={intradayChartData} options={intradayOptions} />
          </div>
        </div>

        {/* ĐỒ THỊ 2: NĂNG LƯỢNG TÍCH LŨY */}
        <div className="lab-card p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-zinc-200">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Đồ thị năng lượng tích lũy
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Sản lượng điện (Wh) và % Gain cải thiện theo khoảng thời gian
              </p>
            </div>

            {/* Bộ chọn khoảng thời gian */}
            <div className="flex items-center gap-1 border border-zinc-300 rounded-sm p-0.5 bg-zinc-50 text-xs">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHistoryRange(opt.value)}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    historyRange === opt.value
                      ? 'bg-white font-semibold text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setExpandedChart('history')}
                className="p-1 text-zinc-500 hover:text-zinc-800 ml-1 border-l border-zinc-200"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-300 rounded-sm w-full max-w-5xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                {expandedChart === 'intraday' ? 'Đồ thị công suất trong ngày (Phóng to)' : 'Đồ thị năng lượng tích lũy (Phóng to)'}
              </h3>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-1.5 text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-sm cursor-pointer"
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
