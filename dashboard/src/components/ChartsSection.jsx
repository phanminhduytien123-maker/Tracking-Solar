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
  const [expandedChart, setExpandedChart] = useState(null); // 'intraday' | 'history' | 'correlation'
  const [includeExcludedDays, setIncludeExcludedDays] = useState(false);

  // Bộ lọc cho bảng dữ liệu 30 ngày
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('ALL'); // 'ALL' | 'VALID' | 'INVALID'
  // Chế độ xem đồ thị kết hợp Nhiệt độ – Voc – Isc
  const [corrTimeMode, setCorrTimeMode] = useState('INTRADAY'); // 'INTRADAY' | 'DAILY'
  const [corrParamMode, setCorrParamMode] = useState('ALL'); // 'ALL' | 'VOC' | 'ISC' | 'TEMP'

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
  const overallGain = totalStaWh > 0 ? (((totalTrkWh / totalStaWh) - 1) * 100) : 0;

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
  // 4. ĐỒ THỊ TƯƠNG QUAN KẾT HỢP: NHIỆT ĐỘ – VOC – ISC (TRONG NGÀY & NHIỀU NGÀY)
  // =========================================================================
  const isCorrIntraday = corrTimeMode === 'INTRADAY';
  const corrLabels = isCorrIntraday
    ? intradayData.map(d => d.time)
    : history30Days.map(d => d.date);

  const corrTempTrk = isCorrIntraday
    ? intradayData.map(d => (d.tempTrk !== undefined && d.tempTrk !== null ? Number(d.tempTrk) : null))
    : history30Days.map(d => (Number(d.temp_trk) > 0 ? Number(d.temp_trk) : null));
  const corrTempSta = isCorrIntraday
    ? intradayData.map(d => (d.tempSta !== undefined && d.tempSta !== null ? Number(d.tempSta) : null))
    : history30Days.map(d => (Number(d.temp_sta) > 0 ? Number(d.temp_sta) : null));
  const corrVocTrk = isCorrIntraday
    ? intradayData.map(d => (d.vocTrk !== undefined && d.vocTrk !== null && Number(d.vocTrk) > 0 ? Number(d.vocTrk) : null))
    : history30Days.map(d => (Number(d.voc_trk) > 0 ? Number(d.voc_trk) : null));
  const corrVocSta = isCorrIntraday
    ? intradayData.map(d => (d.vocSta !== undefined && d.vocSta !== null && Number(d.vocSta) > 0 ? Number(d.vocSta) : null))
    : history30Days.map(d => (Number(d.voc_sta) > 0 ? Number(d.voc_sta) : null));
  const corrIscTrk = isCorrIntraday
    ? intradayData.map(d => (d.iscTrk !== undefined && d.iscTrk !== null ? Number(d.iscTrk) : null))
    : history30Days.map(d => (Number(d.isc_trk) > 0 ? Number(d.isc_trk) : null));
  const corrIscSta = isCorrIntraday
    ? intradayData.map(d => (d.iscSta !== undefined && d.iscSta !== null ? Number(d.iscSta) : null))
    : history30Days.map(d => (Number(d.isc_sta) > 0 ? Number(d.isc_sta) : null));
  const corrDeltaT = corrTempTrk.map((t, i) => (
    t !== null && corrTempSta[i] !== null ? parseFloat((t - corrTempSta[i]).toFixed(1)) : null
  ));

  const showVocAxis = corrParamMode === 'ALL' || corrParamMode === 'VOC';
  const showIscAxis = corrParamMode === 'ALL' || corrParamMode === 'ISC';
  const showDiffAxis = corrParamMode === 'TEMP';

  const hasCorrData = (
    corrTempTrk.some(v => v !== null) ||
    corrVocTrk.some(v => v !== null) ||
    corrIscTrk.some(v => v !== null)
  );

  // Thống kê nhanh ảnh hưởng nhiệt độ lên Voc/Isc tại khung đang xem
  const corrSummary = (() => {
    let peakTTrk = null;
    let peakTTrkLabel = null;
    let vocAtPeakT = null;
    let maxVocTrk = null;
    let maxIscTrk = null;
    let peakTSta = null;

    corrLabels.forEach((lbl, i) => {
      const tT = corrTempTrk[i];
      const tS = corrTempSta[i];
      const vT = corrVocTrk[i];
      const iT = corrIscTrk[i];
      if (tT !== null && (peakTTrk === null || tT > peakTTrk)) {
        peakTTrk = tT;
        peakTTrkLabel = lbl;
        vocAtPeakT = vT;
      }
      if (tS !== null && (peakTSta === null || tS > peakTSta)) peakTSta = tS;
      if (vT !== null && (maxVocTrk === null || vT > maxVocTrk)) maxVocTrk = vT;
      if (iT !== null && (maxIscTrk === null || iT > maxIscTrk)) maxIscTrk = iT;
    });
    return { peakTTrk, peakTTrkLabel, vocAtPeakT, maxVocTrk, maxIscTrk, peakTSta };
  })();

  const corrDatasets = [
    {
      type: 'line',
      label: 'T° Tracker (°C)',
      data: corrTempTrk,
      borderColor: '#ef4444',
      backgroundColor: '#ef4444',
      borderWidth: 2.5,
      tension: 0.25,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      spanGaps: false,
      yAxisID: 'y_temp',
      order: 1
    },
    {
      type: 'line',
      label: 'T° Cố định (°C)',
      data: corrTempSta,
      borderColor: '#f97316',
      backgroundColor: '#f97316',
      borderWidth: 2,
      borderDash: [5, 4],
      tension: 0.25,
      pointRadius: 2,
      pointHoverRadius: 4,
      spanGaps: false,
      yAxisID: 'y_temp',
      order: 2
    }
  ];

  if (showVocAxis) {
    corrDatasets.push(
      {
        type: 'line',
        label: 'Voc Tracker (V)',
        data: corrVocTrk,
        borderColor: trkLineColor,
        backgroundColor: trkLineColor,
        borderWidth: 2.2,
        tension: 0.25,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        spanGaps: false,
        yAxisID: 'y_voc',
        order: 3
      },
      {
        type: 'line',
        label: 'Voc Cố định (V)',
        data: corrVocSta,
        borderColor: isDark ? '#a78bfa' : '#6366f1',
        backgroundColor: isDark ? '#a78bfa' : '#6366f1',
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.25,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: false,
        yAxisID: 'y_voc',
        order: 4
      }
    );
  }

  if (showIscAxis) {
    corrDatasets.push(
      {
        type: 'bar',
        label: 'Isc Tracker (A)',
        data: corrIscTrk,
        backgroundColor: isDark ? 'rgba(74, 222, 128, 0.55)' : 'rgba(21, 128, 61, 0.55)',
        borderRadius: 2,
        maxBarThickness: 18,
        yAxisID: 'y_isc',
        order: 5
      },
      {
        type: 'bar',
        label: 'Isc Cố định (A)',
        data: corrIscSta,
        backgroundColor: isDark ? 'rgba(250, 204, 21, 0.48)' : 'rgba(202, 138, 4, 0.48)',
        borderRadius: 2,
        maxBarThickness: 18,
        yAxisID: 'y_isc',
        order: 6
      }
    );
  }

  if (showDiffAxis) {
    corrDatasets.push({
      type: 'bar',
      label: 'Chênh lệch ΔT (°C)',
      data: corrDeltaT,
      backgroundColor: isDark ? 'rgba(192, 132, 252, 0.45)' : 'rgba(147, 51, 234, 0.35)',
      borderRadius: 2,
      maxBarThickness: 18,
      yAxisID: 'y_diff',
      order: 7
    });
  }

  const correlationChartData = {
    labels: corrLabels,
    datasets: corrDatasets
  };

  const correlationOptions = {
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
          boxWidth: 14,
          padding: 10
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
            if (ctx.parsed.y === null || ctx.parsed.y === undefined) return null;
            const lbl = ctx.dataset.label || '';
            if (lbl.includes('Voc')) return ` ${lbl}: ${formatDecimal(ctx.parsed.y, 2)} V`;
            if (lbl.includes('Isc')) return ` ${lbl}: ${formatDecimal(ctx.parsed.y, 2)} A`;
            return ` ${lbl}: ${formatDecimal(ctx.parsed.y, 1)} °C`;
          },
          footer: function (items) {
            const idx = items?.[0]?.dataIndex;
            if (idx === undefined) return '';
            const parts = [];
            if (corrDeltaT[idx] !== null) {
              parts.push(`ΔT (Trk − Sta): ${formatSignedNumber(corrDeltaT[idx], 1, '°C')}`);
            }
            if (corrVocTrk[idx] !== null && corrVocSta[idx] !== null) {
              parts.push(`ΔVoc: ${formatSignedNumber(corrVocTrk[idx] - corrVocSta[idx], 2, 'V')}`);
            }
            if (corrIscTrk[idx] !== null && corrIscSta[idx] !== null) {
              parts.push(`ΔIsc: ${formatSignedNumber(corrIscTrk[idx] - corrIscSta[idx], 2, 'A')}`);
            }
            return parts.length > 0 ? ` ${parts.join('  |  ')}` : '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { family: 'Be Vietnam Pro', size: 10, weight: '500' },
          maxTicksLimit: isCorrIntraday ? 15 : 16
        }
      },
      y_temp: {
        type: 'linear',
        position: 'left',
        grid: { color: chartGridColor },
        ticks: {
          color: isDark ? '#fca5a5' : '#dc2626',
          font: { family: 'Be Vietnam Pro', size: 10, weight: '600' },
          callback: (v) => `${formatDecimal(v, 0)} °C`
        },
        suggestedMin: 20,
        suggestedMax: 55
      },
      y_voc: {
        type: 'linear',
        position: 'right',
        display: showVocAxis,
        grid: { drawOnChartArea: false },
        ticks: {
          color: isDark ? '#7dd3fc' : '#1d4ed8',
          font: { family: 'Be Vietnam Pro', size: 10, weight: '600' },
          callback: (v) => `${formatDecimal(v, 0)} V`
        },
        suggestedMin: isCorrIntraday ? 10 : 18,
        suggestedMax: 24
      },
      y_isc: {
        type: 'linear',
        position: 'right',
        display: showIscAxis,
        grid: { drawOnChartArea: false },
        ticks: {
          color: isDark ? '#4ade80' : '#15803d',
          font: { family: 'Be Vietnam Pro', size: 10, weight: '600' },
          callback: (v) => `${formatDecimal(v, 1)} A`
        },
        beginAtZero: true,
        suggestedMax: 2.2
      },
      y_diff: {
        type: 'linear',
        position: 'right',
        display: showDiffAxis,
        grid: { drawOnChartArea: false },
        ticks: {
          color: isDark ? '#c084fc' : '#9333ea',
          font: { family: 'Be Vietnam Pro', size: 10, weight: '600' },
          callback: (v) => `${formatSignedNumber(v, 0, '°C')}`
        },
        suggestedMin: -8,
        suggestedMax: 8
      }
    }
  };

  const calcPaperGainPercent = (row) => {
    if (row?.paperGainPercent !== undefined && row?.paperGainPercent !== null) {
      return Number(row.paperGainPercent);
    }
    return null;
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
      'Phan_Tram_Gain_Bai_Bao_Voc_Isc',
      'Trang_Thai',
      'Thoi_Tiet_Ghi_Chu'
    ];

    const rows = history30Days.map((d, idx) => {
      const trkWh = d.trackingWh !== undefined ? d.trackingWh : (Number(d.trackingKwh || 0) * 1000);
      const staWh = d.staticWh !== undefined ? d.staticWh : (Number(d.staticKwh || 0) * 1000);
      const paperGain = calcPaperGainPercent(d);
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
        paperGain !== null ? paperGain : '',
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
              <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white font-sans tabular-nums tracking-tight">
                {formatDecimal(totalTrkWh / 1000, 2)} <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-0.5">kWh</span>
              </span>
              <span className={`text-xs sm:text-sm font-extrabold font-sans tabular-nums ${overallGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatSignedNumber(overallGain, 1, '%')}
              </span>
            </div>
            <div className="text-xs font-sans tabular-nums text-zinc-600 dark:text-slate-300 mt-2 flex justify-between items-center border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Cố định: <span className="font-bold text-zinc-900 dark:text-white">{formatDecimal(totalStaWh / 1000, 2)}</span> kWh</span>
              <span className={`font-bold ${totalDiffWh >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalDiffWh >= 0 ? `+${formatDecimal(totalDiffWh / 1000, 2)}` : formatDecimal(totalDiffWh / 1000, 2)}
              </span>
            </div>
          </div>

          {/* KPI 2: Điện áp Voc */}
          <div className="lab-card p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Voc trung bình
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white font-sans tabular-nums tracking-tight">
                {formatDecimal(avgVocTrk, 2)} <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-0.5">V</span>
              </span>
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300 font-sans tabular-nums">
                Sta: <span className="font-bold text-zinc-900 dark:text-white">{formatDecimal(avgVocSta, 2)}</span>V
              </span>
            </div>
            <div className="text-xs font-sans tabular-nums text-zinc-600 dark:text-slate-300 mt-2 flex justify-between items-center border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Chênh lệch áp:</span>
              <span className={`font-bold ${(avgVocTrk - avgVocSta) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
              <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white font-sans tabular-nums tracking-tight">
                {formatDecimal(avgIscTrk, 2)} <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-0.5">A</span>
              </span>
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300 font-sans tabular-nums">
                Sta: <span className="font-bold text-zinc-900 dark:text-white">{formatDecimal(avgIscSta, 2)}</span>A
              </span>
            </div>
            <div className="text-xs font-sans tabular-nums text-zinc-600 dark:text-slate-300 mt-2 flex justify-between items-center border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Tăng trưởng dòng:</span>
              <span className={`font-extrabold ${avgIscTrk >= avgIscSta ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {avgIscSta > 0 ? (avgIscTrk >= avgIscSta ? `+${formatDecimal(((avgIscTrk / avgIscSta) - 1) * 100, 1)}%` : `${formatDecimal(((avgIscTrk / avgIscSta) - 1) * 100, 1)}%`) : '--'}
              </span>
            </div>
          </div>

          {/* KPI 4: Nhiệt độ */}
          <div className="lab-card p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">
              Nhiệt độ TB (Tcell)
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white font-sans tabular-nums tracking-tight">
                {formatDecimal(avgTempTrk, 1)} <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-0.5">°C</span>
              </span>
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300 font-sans tabular-nums">
                Sta: <span className="font-bold text-zinc-900 dark:text-white">{formatDecimal(avgTempSta, 1)}</span>°C
              </span>
            </div>
            <div className="text-xs font-sans tabular-nums text-zinc-600 dark:text-slate-300 mt-2 flex justify-between items-center border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Chênh lệch ΔT:</span>
              <span className={`font-bold ${(avgTempTrk - avgTempSta) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
              <span className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-sans tabular-nums tracking-tight">
                {validHistory.length}/{history30Days.length}
              </span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300">ngày</span>
            </div>
            <div className="text-xs font-sans tabular-nums text-zinc-600 dark:text-slate-300 mt-2 flex justify-between items-center border-t border-zinc-200 dark:border-slate-800 pt-1.5">
              <span>Ngày loại trừ:</span>
              <span className={`font-bold font-sans tabular-nums ${history30Days.length === validHistory.length ? 'text-zinc-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                {history30Days.length - validHistory.length} ngày
              </span>
            </div>
          </div>
        </div>

        {/* ĐỒ THỊ TƯƠNG QUAN KẾT HỢP: NHIỆT ĐỘ – VOC – ISC (TRONG NGÀY & NHIỀU NGÀY) */}
        <div className="lab-card p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-zinc-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Đồ thị tương quan Nhiệt độ – Voc – Isc</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-sm">
                  {isCorrIntraday
                    ? (selectedIntradayDate || 'Hôm nay')
                    : (history30Days.length >= 28 ? '30 ngày' : `${history30Days.length} ngày`)}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium mt-0.5">
                {isCorrIntraday
                  ? 'Theo dõi biến thiên trong ngày (05:00 – 19:00): ảnh hưởng của T° mặt pin lên Voc và Isc'
                  : 'Tổng hợp nhiều ngày: đối chiếu nhiệt độ bề mặt pin (°C) với điện áp Voc (V) và dòng Isc (A)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Chọn trục thời gian: Trong ngày / Nhiều ngày */}
              <div className="flex items-center border border-zinc-300 dark:border-slate-700 rounded-sm p-0.5 bg-zinc-50 dark:bg-slate-800 text-[11px]">
                <button
                  onClick={() => setCorrTimeMode('INTRADAY')}
                  className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                    isCorrIntraday
                      ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-slate-300'
                  }`}
                >
                  Trong ngày
                </button>
                <button
                  onClick={() => setCorrTimeMode('DAILY')}
                  className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                    !isCorrIntraday
                      ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-slate-300'
                  }`}
                >
                  Nhiều ngày
                </button>
              </div>

              {/* Chọn ngày khi đang xem đồ thị theo giờ */}
              {isCorrIntraday && availableDates && availableDates.length > 0 && (
                <select
                  aria-label="Chọn ngày xem tương quan trong ngày"
                  value={selectedIntradayDate}
                  onChange={(e) => onSelectIntradayDate && onSelectIntradayDate(e.target.value)}
                  className="text-[11px] border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 rounded-sm px-2 py-0.5 font-semibold cursor-pointer outline-none"
                  title="Chọn ngày để xem biến thiên Nhiệt độ – Voc – Isc trong ngày"
                >
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}

              {/* Bộ lọc thông số */}
              <div className="flex items-center border border-zinc-300 dark:border-slate-700 rounded-sm p-0.5 bg-zinc-50 dark:bg-slate-800 text-[11px]">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'VOC', label: 'T° & Voc' },
                  { id: 'ISC', label: 'T° & Isc' },
                  { id: 'TEMP', label: 'Chỉ T°' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCorrParamMode(opt.id)}
                    className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                      corrParamMode === opt.id
                        ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setExpandedChart('correlation')}
                className="p-1.5 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-sm cursor-pointer transition-colors"
                title="Phóng to đồ thị"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!hasCorrData ? (
            <div className="h-[310px] sm:h-[360px] w-full flex flex-col items-center justify-center text-center px-4 text-xs text-zinc-500 dark:text-slate-400">
              <p className="font-semibold text-zinc-700 dark:text-slate-200">
                Ngày {selectedIntradayDate} chưa có chuỗi dữ liệu Nhiệt độ / Voc / Isc theo giờ.
              </p>
              <p className="mt-1">
                Vui lòng chọn các ngày có bản ghi chi tiết (ví dụ 21/11, 20/11, 19/11, 18/11) hoặc chuyển sang chế độ &ldquo;Nhiều ngày&rdquo;.
              </p>
            </div>
          ) : (
            <div className="h-[310px] sm:h-[360px] w-full">
              <Bar data={correlationChartData} options={correlationOptions} />
            </div>
          )}

          {/* Thanh tóm tắt tương quan nhiệt độ - điện học */}
          <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-slate-300 font-sans tabular-nums">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Đỉnh T° (Trk/Sta):{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {corrSummary.peakTTrk !== null ? `${formatDecimal(corrSummary.peakTTrk, 1)}°C` : '--'}
                </strong>
                {' / '}
                <strong className="text-zinc-900 dark:text-white">
                  {corrSummary.peakTSta !== null ? `${formatDecimal(corrSummary.peakTSta, 1)}°C` : '--'}
                </strong>
                {isCorrIntraday && corrSummary.peakTTrkLabel ? ` (${corrSummary.peakTTrkLabel})` : ''}
              </span>
              <span>
                Voc (đỉnh / tại đỉnh T°):{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {corrSummary.maxVocTrk !== null ? `${formatDecimal(corrSummary.maxVocTrk, 2)}V` : '--'}
                </strong>
                {' / '}
                <strong className="text-zinc-900 dark:text-white">
                  {corrSummary.vocAtPeakT !== null ? `${formatDecimal(corrSummary.vocAtPeakT, 2)}V` : '--'}
                </strong>
              </span>
              <span>
                Đỉnh Isc Trk:{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {corrSummary.maxIscTrk !== null ? `${formatDecimal(corrSummary.maxIscTrk, 2)}A` : '--'}
                </strong>
              </span>
            </div>
            <span className="text-zinc-500 dark:text-slate-400">
              Cảm biến DS18B20 (GPIO 15/16 ESP2) đo ban ngày &amp; tự tắt khi ngủ đêm
            </span>
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
              <thead className="bg-zinc-50/95 dark:bg-slate-800/95 text-zinc-900 dark:text-white sticky top-0 z-10 border-b border-zinc-200 dark:border-slate-700 text-xs sm:text-[13px] font-bold">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Ngày</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Tracker (Wh)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Cố định (Wh)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">% Gain</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Voc Trk (V)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Voc Sta (V)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Isc Trk (A)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Isc Sta (A)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">T° Trk (°C)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">T° Sta (°C)</th>
                  <th
                    className="py-3 px-3.5 text-right whitespace-nowrap"
                    title="Tính theo thông số không tải (Voc × Isc): ((Voc_trk × Isc_trk) / (Voc_sta × Isc_sta) - 1) × 100%"
                  >
                    % Gain (Không tải)
                  </th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Ghi chú</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Trạng thái</th>
                  {isAdmin && onOpenDataSettings && <th className="py-3 px-3.5 text-center whitespace-nowrap">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-sm">
                {filteredTableData.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-zinc-400 dark:text-slate-400">
                      Không tìm thấy bản ghi nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredTableData.map((row, idx) => {
                    const trkWh = row.trackingWh !== undefined ? row.trackingWh : (Number(row.trackingKwh || 0) * 1000);
                    const staWh = row.staticWh !== undefined ? row.staticWh : (Number(row.staticKwh || 0) * 1000);
                    const isGainPos = row.gainPercent >= 0;
                    const paperGain = calcPaperGainPercent(row);
                    return (
                      <tr key={row.date} className="hover:bg-zinc-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-3.5 text-zinc-500 dark:text-slate-300 font-medium text-xs sm:text-sm whitespace-nowrap">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-bold text-zinc-900 dark:text-white whitespace-nowrap text-sm sm:text-[15px]">{row.date}</td>
                        <td className="py-3 px-3.5 text-right font-bold text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(trkWh, 1)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(staWh, 1)}
                        </td>
                        <td className={`py-3 px-3.5 text-right font-extrabold text-sm sm:text-[15px] whitespace-nowrap ${isGainPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatSignedNumber(row.gainPercent, 1, '%')}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(row.voc_trk, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(row.voc_sta, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(row.isc_trk, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(row.isc_sta, 2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(row.temp_trk, 1)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-zinc-900 dark:text-white text-sm sm:text-[15px] whitespace-nowrap">
                          {formatDecimal(row.temp_sta, 1)}
                        </td>
                        <td
                          className={`py-3 px-3.5 text-right font-extrabold text-sm sm:text-[15px] whitespace-nowrap ${
                            paperGain === null
                              ? 'text-zinc-400 dark:text-slate-500'
                              : paperGain >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {paperGain !== null ? formatSignedNumber(paperGain, 1, '%') : '--'}
                        </td>
                        <td className="py-3 px-3.5 text-zinc-900 dark:text-white text-xs sm:text-sm max-w-[140px] truncate whitespace-nowrap" title={row.weather_note || 'Bình thường'}>
                          {row.weather_note || 'Bình thường'}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap min-w-[90px]">
                          {row.severe_invalid ? (
                            <span className="inline-block whitespace-nowrap px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700/50 rounded-sm">
                              Lỗi
                            </span>
                          ) : (
                            <span className="inline-block whitespace-nowrap px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50 rounded-sm">
                              Hợp lệ
                            </span>
                          )}
                        </td>
                        {isAdmin && onOpenDataSettings && (
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => onOpenDataSettings(row.date)}
                              className="px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer whitespace-nowrap"
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
      {/* MODAL PHÓNG TO ĐỒ THỊ (TÍCH LŨY / TRONG NGÀY / TƯƠNG QUAN KẾT HỢP) */}
      {/* ===================================================================== */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-zinc-300 dark:border-slate-700 rounded-sm w-full max-w-5xl p-5 space-y-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {expandedChart === 'intraday'
                  ? 'Đồ thị công suất trong ngày (Phóng to)'
                  : expandedChart === 'history'
                  ? 'Đồ thị năng lượng tích lũy (Phóng to)'
                  : `Đồ thị tương quan Nhiệt độ – Voc – Isc (${isCorrIntraday ? (selectedIntradayDate || 'Hôm nay') : `${history30Days.length} ngày`})`}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {expandedChart === 'correlation' && (
                  <>
                    <div className="flex items-center border border-zinc-300 dark:border-slate-700 rounded-sm p-0.5 bg-zinc-50 dark:bg-slate-800 text-[11px]">
                      <button
                        onClick={() => setCorrTimeMode('INTRADAY')}
                        className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                          isCorrIntraday
                            ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                            : 'text-zinc-600 dark:text-slate-300'
                        }`}
                      >
                        Trong ngày
                      </button>
                      <button
                        onClick={() => setCorrTimeMode('DAILY')}
                        className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                          !isCorrIntraday
                            ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                            : 'text-zinc-600 dark:text-slate-300'
                        }`}
                      >
                        Nhiều ngày
                      </button>
                    </div>
                    {isCorrIntraday && availableDates && availableDates.length > 0 && (
                      <select
                        value={selectedIntradayDate}
                        onChange={(e) => onSelectIntradayDate && onSelectIntradayDate(e.target.value)}
                        className="text-[11px] border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 rounded-sm px-2 py-0.5 font-semibold cursor-pointer outline-none"
                      >
                        {availableDates.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center border border-zinc-300 dark:border-slate-700 rounded-sm p-0.5 bg-zinc-50 dark:bg-slate-800 text-[11px]">
                      {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'VOC', label: 'T° & Voc' },
                        { id: 'ISC', label: 'T° & Isc' },
                        { id: 'TEMP', label: 'Chỉ T°' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setCorrParamMode(opt.id)}
                          className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                            corrParamMode === opt.id
                              ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-600 dark:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => setExpandedChart(null)}
                  className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-[65vh] w-full">
              {expandedChart === 'intraday' ? (
                <Line data={intradayChartData} options={intradayOptions} />
              ) : expandedChart === 'history' ? (
                <Bar data={historyChartData} options={historyOptions} />
              ) : (
                <Bar data={correlationChartData} options={correlationOptions} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
