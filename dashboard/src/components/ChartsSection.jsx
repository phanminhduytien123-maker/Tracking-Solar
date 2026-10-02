import React, { useState } from 'react';
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
import { BarChart3, TrendingUp } from 'lucide-react';

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

export default function ChartsSection({ intradayData, history30Days }) {
  const [historyRange, setHistoryRange] = useState(30); // 7, 14, 30

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
        pointRadius: 3,
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
        pointRadius: 2.5,
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
          maxTicksLimit: 7, // Clean hourly intervals (06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00)
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

  // 2. CHART 2 CONFIG: 30-DAY CUMULATIVE ENERGY (Bar Chart + % Gain Line)
  const historyLabels = filteredHistory.map(d => d.date);
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
        pointRadius: 2.5,
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

  // Compute 30-day aggregates
  const totalTrkKwh = filteredHistory.reduce((acc, cur) => acc + cur.trackingKwh, 0);
  const totalStaKwh = filteredHistory.reduce((acc, cur) => acc + cur.staticKwh, 0);
  const avgGain = totalStaKwh > 0 ? (((totalTrkKwh - totalStaKwh) / totalStaKwh) * 100).toFixed(1) : 0;

  return (
    <div id="section-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-16">
      
      {/* 1. ĐỒ THỊ THỜI GIAN THỰC (REAL-TIME LINE CHART) */}
      <div className="panel-card flex flex-col justify-between shadow-xl">
        
        {/* Header */}
        <div className="panel-header flex items-center justify-between py-3.5 px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Công Suất Tức Thời Trong Ngày 
            </span>
          </div>
          <span className="text-xs font-bold text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md shadow-sm">
            06:00 - 18:00 (WATT)
          </span>
        </div>

        {/* Chart Canvas */}
        <div className="p-4 sm:p-5 h-[290px] sm:h-[330px] w-full">
          <Line data={intradayChartData} options={intradayOptions} />
        </div>

        {/* Footer info */}
        <div className="panel-footer text-xs sm:text-sm text-zinc-200 flex justify-between items-center font-medium">
          <span className="font-semibold text-zinc-300">Công suất cực đại hôm nay:</span>
          <div>
            <span className="text-sky-300 font-extrabold font-mono text-sm sm:text-base">Tracking: 78.4W</span>
            <span className="text-white/30 mx-2.5">|</span>
            <span className="text-amber-300 font-extrabold font-mono text-sm sm:text-base">Cố định: 52.1W</span>
          </div>
        </div>
      </div>

      {/* 2. ĐỒ THỊ 30 NGÀY SO SÁNH SẢN LƯỢNG (30-DAY BAR CHART + GAIN LINE) */}
      <div className="panel-card flex flex-col justify-between shadow-xl">
        
        {/* Header with Range Filter */}
        <div className="panel-header flex items-center justify-between py-3.5 px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
              Sản Lượng Năng Lượng Tích Lũy ({historyRange} Ngày)
            </span>
          </div>
          
          {/* Range Switcher Buttons */}
          <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/15 backdrop-blur-md">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setHistoryRange(days)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  historyRange === days
                    ? 'bg-white text-zinc-950 shadow-md font-black'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {days}N
              </button>
            ))}
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-4 sm:p-5 h-[290px] sm:h-[330px] w-full">
          <Bar data={historyChartData} options={historyOptions} />
        </div>

        {/* Footer with Aggregate Metrics */}
        <div className="panel-footer text-xs sm:text-sm text-zinc-200 flex justify-between items-center font-medium">
          <span className="font-semibold text-zinc-300">Tổng {historyRange} ngày:</span>
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
  );
}
