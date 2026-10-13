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
import { BarChart3, TrendingUp, Maximize2, X, RotateCcw } from 'lucide-react';

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
  { value: 7, label: '7N' },
  { value: 14, label: '14N' },
  { value: 30, label: '30N' }
];

export default function ChartsSection({ intradayData, history30Days, onClearCharts }) {
  const [historyRange, setHistoryRange] = useState(1); // 1 ('Hôm nay'), 7, 14, 30
  const [expandedChart, setExpandedChart] = useState(null); // 'intraday' | 'history' | null

  // Close on Escape key
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

  // Filter history based on selected range
  const filteredHistory = history30Days.slice(-historyRange);

  // 1. CHART 1 CONFIG: INTRADAY POWER COMPARISON 
  const intradayLabels = intradayData.map(d => d.time);
  const intradayTrackingPower = intradayData.map(d => d.pTracking);
  const intradayStaticPower = intradayData.map(d => d.pStatic);

  const intradayChartData = {
    labels: intradayLabels,
    datasets: [
      {
        label: 'Tấm Pin Tracking (Fuzzy-PID + PSO)',
        data: intradayTrackingPower,
        borderColor: '#38bdf8', // Vibrant Cyan / Sky Blue
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          gradient.addColorStop(1, 'rgba(56, 189, 248, 0.00)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.38,
        fill: true,
        pointRadius: 3.5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#0c0d10',
        pointBorderWidth: 2,
      },
      {
        label: 'Tấm Pin Cố Định (South 15°)',
        data: intradayStaticPower,
        borderColor: '#f59e0b', // Vibrant Solar Amber
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.00)');
          return gradient;
        },
        borderWidth: 2.5,
        borderDash: [6, 4],
        tension: 0.38,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#0c0d10',
        pointBorderWidth: 2,
      }
    ]
  };

  const intradayOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#e2e8f0',
          font: { family: 'Plus Jakarta Sans', size: 13, weight: '700' },
          boxWidth: 14,
          boxHeight: 14,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#121520',
        borderColor: '#2d3345',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#f1f5f9',
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13, weight: '600' },
        padding: 14,
        boxPadding: 6,
        callbacks: {
          label: function(context) {
            return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)} W`;
          },
          footer: function(items) {
            if (items.length >= 2) {
              const trk = items[0].parsed.y;
              const sta = items[1].parsed.y;
              const diff = trk - sta;
              const gain = sta > 0 ? ((diff / sta) * 100).toFixed(1) : 0;
              return ` Chênh lệch: +${diff.toFixed(1)} W (+${gain}%)`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        ticks: {
          color: '#cbd5e1',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          maxTicksLimit: 7,
          autoSkip: true,
          maxRotation: 0,
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        ticks: {
          color: '#cbd5e1',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          callback: function(value) {
            return `${value} W`;
          }
        },
        suggestedMax: 90,
        beginAtZero: true
      }
    }
  };

  // 2. CHART 2 CONFIG: CUMULATIVE ENERGY (Hôm nay / 7N / 14N / 30N)
  const historyLabels = filteredHistory.map(d => (historyRange === 1 ? 'Hôm nay' : d.date));
  const historyTracking = filteredHistory.map(d => d.trackingKwh);
  const historyStatic = filteredHistory.map(d => d.staticKwh);
  const historyGain = filteredHistory.map(d => d.gainPercent);

  const historyChartData = {
    labels: historyLabels,
    datasets: [
      {
        type: 'line',
        label: '% Gain Cải Thiện',
        data: historyGain,
        borderColor: '#10b981', // Vibrant Emerald Green
        backgroundColor: '#10b981',
        borderWidth: 2.5,
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        order: 1
      },
      {
        type: 'bar',
        label: 'Tracking (kWh)',
        data: historyTracking,
        backgroundColor: '#38bdf8', // Cyan Blue
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        maxBarThickness: 48,
        yAxisID: 'y',
        order: 2
      },
      {
        type: 'bar',
        label: 'Cố định (kWh)',
        data: historyStatic,
        backgroundColor: '#f59e0b', // Solar Amber
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        maxBarThickness: 48,
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
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#e2e8f0',
          font: { family: 'Plus Jakarta Sans', size: 13, weight: '700' },
          boxWidth: 14,
          boxHeight: 14,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: '#121520',
        borderColor: '#2d3345',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#f1f5f9',
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13, weight: '600' },
        padding: 14,
        boxPadding: 6,
        callbacks: {
          label: function(context) {
            if (context.dataset.type === 'line') {
              return ` ${context.dataset.label}: +${context.parsed.y.toFixed(1)}%`;
            }
            return ` ${context.dataset.label}: ${context.parsed.y.toFixed(3)} kWh`;
          },
          footer: function(items) {
            const trkItem = items.find(i => i.dataset.label === 'Tracking (kWh)');
            const staItem = items.find(i => i.dataset.label === 'Cố định (kWh)');
            if (trkItem && staItem) {
              const trk = trkItem.parsed.y;
              const sta = staItem.parsed.y;
              const diff = trk - sta;
              return ` Năng lượng vượt trội: +${diff.toFixed(3)} kWh`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#cbd5e1',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          maxRotation: 45,
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        ticks: {
          color: '#cbd5e1',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          callback: function(value) {
            return `${value} kWh`;
          }
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#10b981',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          callback: function(value) {
            return `${value}%`;
          }
        },
        suggestedMin: 0,
        suggestedMax: 60
      }
    }
  };

  // Compute aggregates & peak powers dynamically
  const maxTrackingPower = intradayTrackingPower.length > 0 ? Math.max(0, ...intradayTrackingPower) : 0;
  const maxStaticPower = intradayStaticPower.length > 0 ? Math.max(0, ...intradayStaticPower) : 0;
  const totalTrkKwh = filteredHistory.reduce((acc, cur) => acc + cur.trackingKwh, 0);
  const totalStaKwh = filteredHistory.reduce((acc, cur) => acc + cur.staticKwh, 0);
  const avgGain = totalStaKwh > 0 ? (((totalTrkKwh - totalStaKwh) / totalStaKwh) * 100).toFixed(1) : 0;

  return (
    <>
      <div id="section-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-16">
        
        {/* 1. ĐỒ THỊ THỜI GIAN THỰC (REAL-TIME LINE CHART) */}
        <div 
          onClick={() => setExpandedChart('intraday')}
          className="panel-card flex flex-col justify-between shadow-xl cursor-pointer hover:border-white/40 group transition-all"
        >
          
          {/* Header */}
          <div className="panel-header flex items-center justify-between py-3.5 px-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                Công Suất Tức Thời Trong Ngày 
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md shadow-sm">
                06:00 - 18:00 (WATT)
              </span>
              {onClearCharts && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu của các sơ đồ về 0?')) {
                      onClearCharts();
                    }
                  }}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/20 transition-all cursor-pointer"
                  title="Xóa/Đặt lại dữ liệu biểu đồ về 0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedChart('intraday');
                }}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/20 transition-all cursor-pointer"
                title="Phóng to đồ thị"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="p-4 sm:p-5 h-[290px] sm:h-[330px] w-full">
            <Line data={intradayChartData} options={intradayOptions} />
          </div>

          {/* Footer info */}
          <div className="panel-footer text-xs sm:text-sm text-zinc-200 flex justify-between items-center font-medium">
            <span className="font-semibold text-zinc-300">Công suất cực đại hôm nay:</span>
            <div>
              <span className="text-sky-300 font-extrabold font-mono text-sm sm:text-base">Tracking: {maxTrackingPower.toFixed(1)}W</span>
              <span className="text-white/30 mx-2.5">|</span>
              <span className="text-amber-300 font-extrabold font-mono text-sm sm:text-base">Cố định: {maxStaticPower.toFixed(1)}W</span>
            </div>
          </div>
        </div>

        {/* 2. ĐỒ THỊ SO SÁNH SẢN LƯỢNG (BAR CHART + GAIN LINE) */}
        <div 
          onClick={() => setExpandedChart('history')}
          className="panel-card flex flex-col justify-between shadow-xl cursor-pointer hover:border-white/40 group transition-all"
        >
          
          {/* Header with Range Filter */}
          <div className="panel-header flex items-center justify-between py-3.5 px-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                Sản Lượng Năng Lượng Tích Lũy ({historyRange === 1 ? 'Hôm Nay' : `${historyRange} Ngày`})
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Range Switcher Buttons */}
              <div 
                className="flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/15 backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                {RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistoryRange(opt.value);
                    }}
                    className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      historyRange === opt.value
                        ? 'bg-white text-zinc-950 shadow-md font-black'
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {onClearCharts && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu của các sơ đồ về 0?')) {
                      onClearCharts();
                    }
                  }}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/20 transition-all cursor-pointer"
                  title="Xóa/Đặt lại dữ liệu biểu đồ về 0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedChart('history');
                }}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/20 transition-all cursor-pointer"
                title="Phóng to đồ thị"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="p-4 sm:p-5 h-[290px] sm:h-[330px] w-full">
            <Bar data={historyChartData} options={historyOptions} />
          </div>

          {/* Footer with Aggregate Metrics */}
          <div className="panel-footer text-xs sm:text-sm text-zinc-200 flex justify-between items-center font-medium">
            <span className="font-semibold text-zinc-300">
              {historyRange === 1 ? 'Tổng hôm nay:' : `Tổng ${historyRange} ngày:`}
            </span>
            <div>
              <span className="text-sky-300 font-extrabold font-mono text-sm sm:text-base">Trk: {totalTrkKwh.toFixed(2)} kWh</span>
              <span className="text-white/30 mx-2.5">|</span>
              <span className="text-amber-300 font-extrabold font-mono text-sm sm:text-base">CĐ: {totalStaKwh.toFixed(2)} kWh</span>
              <span className="text-white/30 mx-2.5">|</span>
              <span className="text-emerald-300 font-black font-mono text-sm sm:text-base">+{avgGain}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* ENLARGED MODAL / LIGHTBOX VIEW */}
      {expandedChart && (
        <div 
          onClick={() => setExpandedChart(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-2xl transition-all animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel-card w-full max-w-6xl max-h-[92vh] flex flex-col justify-between shadow-2xl border-white/30 overflow-hidden relative"
          >
            
            {/* Modal Header */}
            <div className="panel-header flex items-center justify-between py-4 px-5 sm:px-7">
              <div className="flex items-center gap-3">
                {expandedChart === 'intraday' ? (
                  <TrendingUp className="w-6 h-6 text-sky-400" />
                ) : (
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                )}
                <div>
                  <h2 className="text-base sm:text-xl font-black tracking-wide uppercase text-white">
                    {expandedChart === 'intraday' 
                      ? 'CÔNG SUẤT TỨC THỜI TRONG NGÀY (CHI TIẾT PHÓNG TO)'
                      : `SẢN LƯỢNG NĂNG LƯỢNG TÍCH LŨY (${historyRange === 1 ? 'HÔM NAY' : `${historyRange} NGÀY`})`
                    }
                  </h2>
                  <span className="text-xs text-zinc-300 font-medium hidden sm:inline-block">
                    {expandedChart === 'intraday' 
                      ? 'Dữ liệu đo đạc thực tế từ cảm biến INA219 (06:00 - 18:00)'
                      : 'So sánh sản lượng điện tích luỹ kWh và tỉ lệ phần trăm cải thiện % Gain'
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {expandedChart === 'history' && (
                  <div className="flex items-center gap-1 bg-black/30 p-1.5 rounded-xl border border-white/20 backdrop-blur-md">
                    {RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setHistoryRange(opt.value)}
                        className={`px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          historyRange === opt.value
                            ? 'bg-white text-zinc-950 shadow-md font-black'
                            : 'text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedChart(null)}
                  className="p-2 sm:p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/20 transition-all cursor-pointer"
                  title="Đóng phóng to (Esc)"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Chart Canvas Area */}
            <div className="p-4 sm:p-6 md:p-8 h-[55vh] sm:h-[62vh] min-h-[380px] w-full">
              {expandedChart === 'intraday' ? (
                <Line data={intradayChartData} options={intradayOptions} />
              ) : (
                <Bar data={historyChartData} options={historyOptions} />
              )}
            </div>

            {/* Modal Footer info */}
            <div className="panel-footer text-xs sm:text-base text-zinc-200 flex flex-wrap justify-between items-center gap-2 font-medium py-4 px-5 sm:px-7">
              {expandedChart === 'intraday' ? (
                <>
                  <span className="font-semibold text-zinc-300">Công suất cực đại hôm nay:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sky-300 font-extrabold font-mono text-sm sm:text-lg">Tracking: {maxTrackingPower.toFixed(1)}W</span>
                    <span className="text-white/30">|</span>
                    <span className="text-amber-300 font-extrabold font-mono text-sm sm:text-lg">Cố định: {maxStaticPower.toFixed(1)}W</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-semibold text-zinc-300">
                    {historyRange === 1 ? 'Tổng năng lượng hôm nay:' : `Tổng năng lượng ${historyRange} ngày:`}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sky-300 font-extrabold font-mono text-sm sm:text-lg">Tracking: {totalTrkKwh.toFixed(2)} kWh</span>
                    <span className="text-white/30">|</span>
                    <span className="text-amber-300 font-extrabold font-mono text-sm sm:text-lg">Cố định: {totalStaKwh.toFixed(2)} kWh</span>
                    <span className="text-white/30">|</span>
                    <span className="text-emerald-300 font-black font-mono text-sm sm:text-lg">Hiệu quả tăng: +{avgGain}%</span>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
