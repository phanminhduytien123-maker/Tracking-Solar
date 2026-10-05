import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft,
  RotateCcw,
  Info,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';

// Dedicated, 100% Reliable Vector Graphic Renderer for Captcha Tiles
function CaptchaTileGraphic({ type }) {
  switch (type) {
    // SOLAR CHALLENGE TILES
    case 'solar_farm':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="sfSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <linearGradient id="sfPanel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#sfSky)" />
          <circle cx="135" cy="25" r="18" fill="#facc15" />
          <path d="M0 90 Q80 75 160 90 L160 160 L0 160 Z" fill="#16a34a" />
          <polygon points="15,105 60,95 70,135 20,150" fill="url(#sfPanel)" stroke="#93c5fd" strokeWidth="1.5" />
          <polygon points="80,92 135,85 145,125 90,138" fill="url(#sfPanel)" stroke="#93c5fd" strokeWidth="1.5" />
          <polygon points="30,75 70,68 76,90 35,98" fill="url(#sfPanel)" stroke="#93c5fd" strokeWidth="1" />
          <polygon points="85,68 128,62 134,84 90,92" fill="url(#sfPanel)" stroke="#93c5fd" strokeWidth="1" />
        </svg>
      );

    case 'wind_turbine':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="wtSunset" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#wtSunset)" />
          <circle cx="80" cy="110" r="30" fill="#fef08a" opacity="0.6" />
          <path d="M0 125 Q80 110 160 125 L160 160 L0 160 Z" fill="#14532d" />
          <polygon points="78,55 82,55 84,130 76,130" fill="#f8fafc" />
          <circle cx="80" cy="55" r="4" fill="#475569" />
          <line x1="80" y1="55" x2="80" y2="12" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="80" y1="55" x2="42" y2="76" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="80" y1="55" x2="118" y2="76" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="128,80 130,80 131,128 127,128" fill="#e2e8f0" />
          <line x1="129" y1="80" x2="129" y2="52" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="129" y1="80" x2="105" y2="94" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="129" y1="80" x2="153" y2="94" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'solar_roof':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="srSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="srSolar" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#srSky)" />
          <circle cx="28" cy="28" r="16" fill="#fde047" />
          <rect x="25" y="95" width="110" height="60" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="68" y="115" width="24" height="40" fill="#64748b" />
          <rect x="35" y="110" width="20" height="20" fill="#bae6fd" stroke="#475569" strokeWidth="1.5" />
          <rect x="105" y="110" width="20" height="20" fill="#bae6fd" stroke="#475569" strokeWidth="1.5" />
          <polygon points="12,95 80,40 148,95" fill="#b91c1c" />
          <polygon points="35,88 78,52 78,74 35,92" fill="url(#srSolar)" stroke="#93c5fd" strokeWidth="1.5" />
          <polygon points="82,52 125,88 125,92 82,74" fill="url(#srSolar)" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="56" y1="70" x2="56" y2="90" stroke="#bfdbfe" strokeWidth="1" />
          <line x1="104" y1="70" x2="104" y2="90" stroke="#bfdbfe" strokeWidth="1" />
        </svg>
      );

    case 'power_pylon':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="ppSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#ppSky)" />
          <path d="M0 135 L160 135 L160 160 L0 160 Z" fill="#475569" />
          <polygon points="76,25 84,25 96,140 64,140" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="45" y1="45" x2="115" y2="45" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="38" y1="72" x2="122" y2="72" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="50" y1="98" x2="110" y2="98" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="72" y1="45" x2="88" y2="72" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="88" y1="45" x2="72" y2="72" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="68" y1="72" x2="92" y2="98" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="92" y1="72" x2="68" y2="98" stroke="#1e293b" strokeWidth="1.5" />
          <path d="M0 40 Q50 55 160 40" fill="none" stroke="#0f172a" strokeWidth="1.5" />
          <path d="M0 68 Q50 82 160 68" fill="none" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case 'solar_tracker':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="stSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
            <linearGradient id="stPanel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#stSky)" />
          <circle cx="135" cy="30" r="22" fill="#facc15" />
          <path d="M0 130 Q80 120 160 130 L160 160 L0 160 Z" fill="#15803d" />
          <rect x="75" y="80" width="10" height="55" fill="#334155" />
          <circle cx="80" cy="80" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
          <polygon points="25,50 125,30 135,80 35,100" fill="url(#stPanel)" stroke="#93c5fd" strokeWidth="2" />
          <line x1="75" y1="40" x2="85" y2="90" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="30" y1="75" x2="130" y2="55" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="120" y1="35" x2="95" y2="55" stroke="#fef08a" strokeWidth="2" strokeDasharray="3,3" />
        </svg>
      );

    case 'ev_charging':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="evBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#evBg)" />
          <rect x="110" y="45" width="28" height="90" rx="4" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          <rect x="116" y="55" width="16" height="20" rx="2" fill="#0369a1" />
          <path d="M124 58 L120 66 L124 66 L122 72" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <path d="M110 80 Q85 110 65 95" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
          <path d="M15 110 Q25 88 48 86 L72 86 Q88 96 95 105 L95 128 L15 128 Z" fill="#f8fafc" />
          <circle cx="35" cy="128" r="10" fill="#334155" stroke="#64748b" strokeWidth="3" />
          <circle cx="80" cy="128" r="10" fill="#334155" stroke="#64748b" strokeWidth="3" />
          <rect x="36" y="92" width="22" height="14" rx="2" fill="#0284c7" />
        </svg>
      );

    case 'solar_module':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="smBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="#0f172a" />
          <rect x="14" y="14" width="132" height="132" rx="4" fill="url(#smBlue)" stroke="#e2e8f0" strokeWidth="4" />
          <line x1="47" y1="14" x2="47" y2="146" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="80" y1="14" x2="80" y2="146" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="113" y1="14" x2="113" y2="146" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="14" y1="47" x2="146" y2="47" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="14" y1="80" x2="146" y2="80" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="14" y1="113" x2="146" y2="113" stroke="#93c5fd" strokeWidth="1.5" />
          <polygon points="14,14 80,14 25,146 14,146" fill="#ffffff" opacity="0.15" />
        </svg>
      );

    case 'city_night':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="cnSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#cnSky)" />
          <circle cx="130" cy="30" r="10" fill="#fef08a" />
          <rect x="15" y="70" width="30" height="90" fill="#1e293b" />
          <rect x="50" y="45" width="35" height="115" fill="#0f172a" stroke="#334155" />
          <rect x="90" y="60" width="28" height="100" fill="#1e293b" />
          <rect x="122" y="80" width="25" height="80" fill="#334155" />
          <rect x="56" y="55" width="5" height="6" fill="#fef08a" />
          <rect x="68" y="55" width="5" height="6" fill="#fef08a" />
          <rect x="56" y="70" width="5" height="6" fill="#fde047" />
          <rect x="68" y="85" width="5" height="6" fill="#fef08a" />
          <rect x="22" y="80" width="5" height="6" fill="#fde047" />
          <rect x="22" y="95" width="5" height="6" fill="#fef08a" />
          <rect x="98" y="75" width="5" height="6" fill="#fef08a" />
          <rect x="98" y="90" width="5" height="6" fill="#fde047" />
        </svg>
      );

    case 'forest_nature':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <linearGradient id="fnSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#dcfce7" />
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#fnSky)" />
          <path d="M0 135 L160 135 L160 160 L0 160 Z" fill="#14532d" />
          <polygon points="40,40 20,80 60,80" fill="#166534" />
          <polygon points="40,65 15,110 65,110" fill="#15803d" />
          <rect x="36" y="110" width="8" height="30" fill="#78350f" />
          <polygon points="90,25 65,70 115,70" fill="#14532d" />
          <polygon points="90,55 60,105 120,105" fill="#166534" />
          <rect x="86" y="105" width="8" height="35" fill="#78350f" />
          <polygon points="135,45 115,85 155,85" fill="#15803d" />
          <polygon points="135,70 110,115 160,115" fill="#16a34a" />
          <rect x="131" y="115" width="8" height="25" fill="#78350f" />
        </svg>
      );

    // TRAFFIC LIGHTS CHALLENGE TILES
    case 'traffic_red':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#0284c7" />
          <rect x="52" y="18" width="56" height="124" rx="12" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
          {/* Red Glowing Lamp */}
          <circle cx="80" cy="45" r="16" fill="#ef4444" stroke="#fca5a5" strokeWidth="2" />
          <circle cx="80" cy="45" r="22" fill="#ef4444" opacity="0.3" />
          {/* Dim Yellow Lamp */}
          <circle cx="80" cy="80" r="14" fill="#713f12" />
          {/* Dim Green Lamp */}
          <circle cx="80" cy="115" r="14" fill="#064e3b" />
        </svg>
      );

    case 'highway_road':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#38bdf8" />
          <polygon points="0,160 60,65 100,65 160,160" fill="#334155" />
          <line x1="80" y1="65" x2="80" y2="160" stroke="#facc15" strokeWidth="3" strokeDasharray="8,6" />
          <line x1="60" y1="65" x2="0" y2="160" stroke="#ffffff" strokeWidth="2" />
          <line x1="100" y1="65" x2="160" y2="160" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );

    case 'pedestrian_light':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#475569" />
          <rect x="48" y="20" width="64" height="120" rx="8" fill="#18181b" stroke="#71717a" strokeWidth="2" />
          {/* Red Stop Figure */}
          <circle cx="80" cy="42" r="5" fill="#450a0a" />
          <line x1="80" y1="47" x2="80" y2="65" stroke="#450a0a" strokeWidth="4" />
          {/* Green Walking Figure (Lit) */}
          <circle cx="78" cy="90" r="6" fill="#22c55e" />
          <circle cx="78" cy="90" r="10" fill="#22c55e" opacity="0.3" />
          <line x1="78" y1="96" x2="76" y2="114" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <line x1="76" y1="114" x2="68" y2="132" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="76" y1="114" x2="86" y2="130" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'bridge_overpass':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#0284c7" />
          <polygon points="0,160 160,160 160,120 0,120" fill="#15803d" />
          {/* Concrete Bridge Deck */}
          <polygon points="0,75 160,50 160,65 0,90" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          {/* Bridge Pillars */}
          <rect x="40" y="85" width="16" height="75" fill="#94a3b8" />
          <rect x="105" y="70" width="16" height="90" fill="#94a3b8" />
        </svg>
      );

    case 'street_lamp':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#0f172a" />
          <polygon points="40,160 120,160 90,40 70,40" fill="#fef08a" opacity="0.25" />
          <path d="M75 160 L75 35 Q75 15 100 15 L105 15" fill="none" stroke="#94a3b8" strokeWidth="4" />
          <polygon points="98,15 112,15 116,25 94,25" fill="#e2e8f0" />
          <circle cx="105" cy="28" r="6" fill="#fde047" />
          <circle cx="105" cy="28" r="14" fill="#fde047" opacity="0.4" />
        </svg>
      );

    case 'traffic_all':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#38bdf8" />
          <rect x="52" y="16" width="56" height="128" rx="12" fill="#27272a" stroke="#18181b" strokeWidth="3" />
          <circle cx="80" cy="40" r="12" fill="#ef4444" />
          <circle cx="80" cy="80" r="12" fill="#eab308" />
          <circle cx="80" cy="120" r="12" fill="#22c55e" />
          {/* Visor caps */}
          <path d="M62 28 Q80 20 98 28" fill="none" stroke="#18181b" strokeWidth="3" />
          <path d="M62 68 Q80 60 98 68" fill="none" stroke="#18181b" strokeWidth="3" />
          <path d="M62 108 Q80 100 98 108" fill="none" stroke="#18181b" strokeWidth="3" />
        </svg>
      );

    case 'bus_vehicle':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#bae6fd" />
          <rect x="0" y="130" width="160" height="30" fill="#334155" />
          {/* City Bus */}
          <rect x="20" y="60" width="120" height="65" rx="8" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
          <rect x="28" y="70" width="22" height="20" rx="2" fill="#0284c7" />
          <rect x="55" y="70" width="22" height="20" rx="2" fill="#0284c7" />
          <rect x="82" y="70" width="22" height="20" rx="2" fill="#0284c7" />
          <rect x="109" y="70" width="24" height="35" rx="2" fill="#0284c7" />
          <circle cx="45" cy="125" r="12" fill="#18181b" stroke="#71717a" strokeWidth="4" />
          <circle cx="110" cy="125" r="12" fill="#18181b" stroke="#71717a" strokeWidth="4" />
        </svg>
      );

    case 'traffic_junction':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#0284c7" />
          <rect x="52" y="18" width="56" height="124" rx="12" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="80" cy="45" r="14" fill="#7f1d1d" />
          <circle cx="80" cy="80" r="14" fill="#713f12" />
          {/* Green Turn Arrow */}
          <circle cx="80" cy="115" r="16" fill="#16a34a" />
          <circle cx="80" cy="115" r="22" fill="#22c55e" opacity="0.3" />
          <path d="M72 115 L88 115 M82 108 L89 115 L82 122" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'warning_sign':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <rect width="160" height="160" fill="#0284c7" />
          {/* Yellow Diamond Sign */}
          <polygon points="80,25 135,80 80,135 25,80" fill="#facc15" stroke="#18181b" strokeWidth="5" />
          <rect x="76" y="52" width="8" height="32" rx="3" fill="#18181b" />
          <circle cx="80" cy="98" r="4.5" fill="#18181b" />
        </svg>
      );

    default:
      return <div className="w-full h-full bg-zinc-700" />;
  }
}

// Authentic reCAPTCHA Visual Challenges with 100% Reliable Vector Graphics
const CAPTCHA_CHALLENGES = [
  {
    id: 'solar',
    title: 'Tấm pin năng lượng mặt trời',
    instruction: 'Chọn tất cả hình ảnh có chứa',
    hint: 'Nhấp vào Xác minh sau khi bạn đã chọn hết các hình ảnh liên quan.',
    items: [
      { id: 1, title: 'Cánh đồng quang điện', isTarget: true, type: 'solar_farm' },
      { id: 2, title: 'Tua bin gió phong điện', isTarget: false, type: 'wind_turbine' },
      { id: 3, title: 'Mái nhà lắp pin mặt trời', isTarget: true, type: 'solar_roof' },
      { id: 4, title: 'Cột điện cao thế', isTarget: false, type: 'power_pylon' },
      { id: 5, title: 'Hệ thống Solar Tracker', isTarget: true, type: 'solar_tracker' },
      { id: 6, title: 'Trạm sạc ô tô điện', isTarget: false, type: 'ev_charging' },
      { id: 7, title: 'Tấm pin quang điện', isTarget: true, type: 'solar_module' },
      { id: 8, title: 'Thành phố về đêm', isTarget: false, type: 'city_night' },
      { id: 9, title: 'Khu rừng tự nhiên', isTarget: false, type: 'forest_nature' },
    ]
  },
  {
    id: 'traffic',
    title: 'Đèn tín hiệu giao thông',
    instruction: 'Chọn tất cả hình ảnh có chứa',
    hint: 'Nhấp vào Xác minh sau khi bạn đã chọn hết các hình ảnh liên quan.',
    items: [
      { id: 1, title: 'Đèn đỏ ngã tư', isTarget: true, type: 'traffic_red' },
      { id: 2, title: 'Đường cao tốc', isTarget: false, type: 'highway_road' },
      { id: 3, title: 'Đèn tín hiệu đi bộ', isTarget: true, type: 'pedestrian_light' },
      { id: 4, title: 'Cầu vượt xe chạy', isTarget: false, type: 'bridge_overpass' },
      { id: 5, title: 'Đèn đường chiếu sáng', isTarget: false, type: 'street_lamp' },
      { id: 6, title: 'Cụm đèn 3 màu', isTarget: true, type: 'traffic_all' },
      { id: 7, title: 'Xe buýt thành phố', isTarget: false, type: 'bus_vehicle' },
      { id: 8, title: 'Đèn rẽ ngã tư', isTarget: true, type: 'traffic_junction' },
      { id: 9, title: 'Biển báo nguy hiểm', isTarget: false, type: 'warning_sign' },
    ]
  }
];

export default function SignInPage({ onLoginSuccess }) {

  // Mode: 'form' | 'admin_pin'
  const [authMode, setAuthMode] = useState('form');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Captcha Verification States
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selectedTileIds, setSelectedTileIds] = useState([]);
  const [challengeError, setChallengeError] = useState(null);
  const [isVerifyingChallenge, setIsVerifyingChallenge] = useState(false);

  const currentChallenge = CAPTCHA_CHALLENGES[challengeIdx];

  // Open Challenge Modal when clicking checkbox
  const handleCaptchaBoxClick = () => {
    if (isCaptchaVerified) return;
    setFormError(null);
    setChallengeError(null);
    setSelectedTileIds([]);
    setIsChallengeOpen(true);
  };

  // Toggle Tile Selection
  const toggleTileSelection = (tileId) => {
    setChallengeError(null);
    setSelectedTileIds(prev => 
      prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]
    );
  };

  // Switch / Reload Challenge
  const handleReloadChallenge = () => {
    setChallengeIdx(prev => (prev + 1) % CAPTCHA_CHALLENGES.length);
    setSelectedTileIds([]);
    setChallengeError(null);
  };

  // Verify User's Selection in Challenge Modal
  const handleVerifyChallenge = () => {
    setIsVerifyingChallenge(true);
    setChallengeError(null);

    setTimeout(() => {
      setIsVerifyingChallenge(false);
      const targetIds = currentChallenge.items.filter(i => i.isTarget).map(i => i.id);
      
      // Must select all target items and no wrong items
      const isAllTargetSelected = targetIds.every(id => selectedTileIds.includes(id));
      const hasNoWrongSelected = selectedTileIds.every(id => targetIds.includes(id));
      const isSuccess = isAllTargetSelected && hasNoWrongSelected && selectedTileIds.length > 0;

      if (isSuccess) {
        setIsCaptchaVerified(true);
        setIsChallengeOpen(false);
        setFormError(null);
      } else {
        setChallengeError('Chưa chính xác. Vui lòng chọn tất cả các ô phù hợp và nhấn Xác minh lại.');
      }
    }, 350);
  };

  // 4-Digit Passcode PIN states
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(null);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [isPinSuccess, setIsPinSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const pinInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Focus on first pin input when opening admin PIN mode
  useEffect(() => {
    if (authMode === 'admin_pin') {
      setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 100);
    }
  }, [authMode]);

  // Handle standard form submit
  const handleRegularFormSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanUser = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check if Guest Account (khach123 / 123)
    const isGuest = (cleanUser === 'khach123' || cleanUser === 'khach123@gmail.com') && cleanPass === '123';

    if (!isGuest) {
      setFormError({
        title: 'Đăng nhập không thành công',
        message: 'Tên đăng nhập hoặc mật khẩu không đúng. (Gợi ý tài khoản khách: khach123 / Mật khẩu: 123)'
      });
      return;
    }

    // Require Captcha verification for guest login
    if (!isCaptchaVerified) {
      setFormError({
        title: 'Chưa xác thực Captcha',
        message: 'Vui lòng nhấp vào ô "I\'m not a robot" và hoàn thành xác thực hình ảnh.'
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess({
        role: 'guest',
        username: 'khach123',
        displayName: 'Khách (khach123)',
        loginAt: new Date().toISOString()
      });
    }, 600);
  };

  // Handle PIN Digit Change
  const handlePinChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    
    if (!cleaned) {
      const newPins = [...pinDigits];
      newPins[index] = '';
      setPinDigits(newPins);
      return;
    }

    const digit = cleaned.slice(-1);
    const newPins = [...pinDigits];
    newPins[index] = digit;
    setPinDigits(newPins);
    setPinError(null);

    if (index < 3) {
      pinInputRefs[index + 1].current?.focus();
    } else {
      const fullPin = newPins.join('');
      verifyPasscode(fullPin);
    }
  };

  // Handle Backspace navigation in PIN
  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    } else if (e.key === 'Escape') {
      setAuthMode('form');
    }
  };

  // Handle PIN Paste (e.g. "0101")
  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newPins = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newPins[i] = pasted[i];
    }
    setPinDigits(newPins);
    
    if (pasted.length === 4) {
      verifyPasscode(pasted);
    } else {
      pinInputRefs[Math.min(pasted.length, 3)].current?.focus();
    }
  };

  // Verify Admin Passcode (Must be 0101)
  const verifyPasscode = (code) => {
    setIsPinVerifying(true);
    setPinError(null);

    setTimeout(() => {
      setIsPinVerifying(false);
      if (code === '0101') {
        setIsPinSuccess(true);
        setTimeout(() => {
          onLoginSuccess({
            role: 'admin',
            username: 'Administrator',
            displayName: 'Quản trị viên (Admin)',
            loginAt: new Date().toISOString()
          });
        }, 700);
      } else {
        setPinError('Mã Passcode không chính xác. Gợi ý: 0101');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPinDigits(['', '', '', '']);
        pinInputRefs[0].current?.focus();
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#080a10] text-zinc-100 flex flex-col justify-between items-center relative overflow-hidden font-sans select-none">
      
      {/* Fullscreen Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/Login_BG.mp4" type="video/mp4" />
      </video>

      {/* Cinematic Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/95 via-black/60 to-black/75 z-0 pointer-events-none backdrop-blur-[2px]"></div>

      {/* Subtle Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none z-0 animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none z-0"></div>

      {/* Center Main Card Container */}
      <main className="relative z-10 flex-1 w-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] bg-zinc-950/85 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/90 relative transition-all duration-300">
          
          {/* Card Ambient Glow Line */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"></div>

          {/* Header Title */}
          <div className="text-center mb-6 sm:mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-playfair drop-shadow-md">
              Tracking Solar
            </h2>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: SIGN-IN FORM */}
          {/* ========================================================================= */}
          {authMode === 'form' ? (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
              
              {/* 1. Federated Sign-in Button */}
              <div>
                <button
                  id="btn-continue-as-admin"
                  type="button"
                  onClick={() => setAuthMode('admin_pin')}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-500/25 hover:from-amber-500/35 hover:via-amber-500/25 hover:to-amber-500/35 border border-amber-500/60 hover:border-amber-400 text-amber-200 hover:text-white font-bold text-base sm:text-lg transition-all duration-200 cursor-pointer shadow-lg shadow-amber-950/30 active:scale-[0.98] text-center flex items-center justify-center"
                  aria-label="Tiếp tục với quyền admin"
                >
                  <span>Tiếp tục với quyền admin</span>
                </button>
              </div>

              {/* 2. Divider */}
              <div className="relative flex items-center justify-center my-4 sm:my-5">
                <div className="w-full border-t border-zinc-700/80"></div>
                <span className="absolute px-4 bg-zinc-950 text-xs sm:text-sm uppercase tracking-wider text-zinc-400 font-bold font-sans">
                  Hoặc
                </span>
              </div>

              {/* 3. Regular Login Form */}
              <form onSubmit={handleRegularFormSubmit} className="space-y-4 sm:space-y-5">
                
                {/* Form Alert Message */}
                {formError && (
                  <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs sm:text-sm text-amber-200 space-y-1 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span>{formError.title}</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed pl-6">
                      {formError.message}
                    </p>
                  </div>
                )}

                {/* Username / Email Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label 
                    htmlFor="signin-email" 
                    className="block text-sm sm:text-base font-semibold text-zinc-200 tracking-wide"
                  >
                    Email hoặc Tên đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="signin-email"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="khach123 hoặc email..."
                      className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="signin-password" 
                      className="block text-sm sm:text-base font-semibold text-zinc-200 tracking-wide"
                    >
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Vui lòng sử dụng tính năng "Tiếp tục với quyền admin" (Mã PIN: 0101) hoặc tài khoản khách: khach123 / 123.')}
                      className="text-xs sm:text-sm text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 sm:py-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all font-sans"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="remember-me-checkbox" className="text-xs sm:text-sm text-zinc-300 cursor-pointer select-none">
                    Ghi nhớ phiên đăng nhập trên thiết bị này
                  </label>
                </div>

                {/* ========================================================= */}
                {/* Standard Google reCAPTCHA v2 Widget Box */}
                {/* ========================================================= */}
                <div className="pt-1">
                  <div 
                    onClick={handleCaptchaBoxClick}
                    className="w-full h-[74px] px-3.5 bg-[#f9f9f9] hover:bg-[#fafafa] border border-[#d3d3d3] rounded-[3px] shadow-[0_0_4px_1px_rgba(0,0,0,0.08)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] select-none"
                    role="checkbox"
                    aria-checked={isCaptchaVerified}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleCaptchaBoxClick(); }}
                  >
                    {/* Left: Square Checkbox + "I'm not a robot" */}
                    <div className="flex items-center gap-3.5">
                      <div className={`w-[28px] h-[28px] rounded-[2px] border-2 flex items-center justify-center transition-all duration-150 ${
                        isCaptchaVerified 
                          ? 'border-transparent bg-transparent' 
                          : isVerifyingChallenge
                          ? 'border-[#1a73e8] bg-white'
                          : 'border-[#c1c1c1] bg-white hover:border-[#a6a6a6]'
                      }`}>
                        {isCaptchaVerified ? (
                          <svg className="w-8 h-8 text-[#0f9d58] -ml-0.5 -mt-0.5 animate-in zoom-in-75 duration-200" viewBox="0 0 36 36" fill="none">
                            <path d="M7 18.5L14 25.5L29 10.5" stroke="#0f9d58" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : isVerifyingChallenge ? (
                          <span className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin"></span>
                        ) : null}
                      </div>
                      
                      <span className="text-[14px] sm:text-[15px] text-[#282727] font-normal tracking-normal select-none">
                        I'm not a robot
                      </span>
                    </div>

                    {/* Right: Authentic Google reCAPTCHA Logo & Links */}
                    <div className="flex flex-col items-center justify-center select-none shrink-0 pl-2">
                      <div className="w-8 h-8 relative flex items-center justify-center">
                        <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
                          {/* Top Blue Arrow */}
                          <path 
                            d="M36.4 14.2C33.2 9.8 28 7 22.2 7.4C13.8 7.9 6.9 14.9 6.9 23.5c0 1.6 0.3 3.2 0.8 4.7l4.9-2.8c-0.2-0.6-0.3-1.3-0.3-1.9 0-6 4.9-10.9 10.9-10.9 3.5 0 6.5 1.6 8.5 4.1L26 21h16V5l-5.6 9.2z" 
                            fill="#1a73e8" 
                          />
                          {/* Bottom Silver Arrow */}
                          <path 
                            d="M11.6 33.8C14.8 38.2 20 41 25.8 40.6C34.2 40.1 41.1 33.1 41.1 24.5c0-1.6-0.3-3.2-0.8-4.7l-4.9 2.8c0.2 0.6 0.3 1.3 0.3 1.9 0 6-4.9 10.9-10.9 10.9-3.5 0-6.5-1.6-8.5-4.1L22 27H6v16l5.6-9.2z" 
                            fill="#9e9e9e" 
                          />
                        </svg>
                      </div>
                      <span className="text-[10px] font-medium text-[#555] tracking-tight -mt-0.5">reCAPTCHA</span>
                      <div className="flex gap-1 text-[8px] text-[#555] mt-0.5">
                        <span className="hover:underline">Privacy</span>
                        <span>-</span>
                        <span className="hover:underline">Terms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-submit-signin"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white font-bold text-sm sm:text-base transition-all duration-150 cursor-pointer active:scale-[0.98] border border-zinc-700 shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>

            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: 4-DIGIT ADMIN PASSCODE (PIN: 0101) */
            /* ========================================================================= */
            <div className={`space-y-6 animate-in fade-in duration-200 py-2 ${isShaking ? 'animate-shake' : ''}`}>
              
              {/* Back Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('form');
                    setPinError(null);
                    setPinDigits(['', '', '', '']);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base text-zinc-300 hover:text-white transition-colors cursor-pointer py-1 font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Quay lại</span>
                </button>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Xác thực Quản trị viên
                </h3>
                <p className="text-sm text-zinc-300">
                  Nhập mã Passcode 4 chữ số để mở khóa Dashboard
                </p>
              </div>

              {/* 4-Digit Box Inputs */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 my-6" onPaste={handlePinPaste}>
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={pinInputRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    disabled={isPinVerifying || isPinSuccess}
                    className={`w-14 h-16 sm:w-16 sm:h-18 text-center text-3xl sm:text-4xl font-mono font-black rounded-2xl bg-zinc-900/90 border transition-all duration-150 focus:outline-none ${
                      isPinSuccess
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                        : pinError
                        ? 'border-red-500/80 bg-red-950/20 text-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                        : digit
                        ? 'border-amber-400/80 bg-amber-950/20 text-amber-300 shadow-sm shadow-amber-500/10'
                        : 'border-zinc-700 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                    }`}
                  />
                ))}
              </div>

              {/* Status Message */}
              {isPinSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-300 flex items-center justify-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                  <span className="font-bold">Xác thực thành công! Đang chuyển hướng...</span>
                </div>
              )}

              {pinError && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-300 flex items-center justify-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

            </div>
          )}

          {/* Footer Info inside Card */}
          <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 text-center">
            <p className="text-xs sm:text-sm text-zinc-400">
              Sinh viên thực hiện: <span className="text-zinc-200 font-semibold">Phan Minh Duy Tiến</span> & <span className="text-zinc-200 font-semibold">Võ Hồng Phát</span>
            </p>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* POPUP MODAL: AUTHENTIC GOOGLE reCAPTCHA IMAGE CHALLENGE */}
      {/* ========================================================================= */}
      {isChallengeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          
          <div className="w-full max-w-[390px] bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-300 animate-in zoom-in-95 duration-200">
            
            {/* Header: Google Blue Banner */}
            <div className="bg-[#1a73e8] text-white p-4 relative">
              <button 
                type="button"
                onClick={() => setIsChallengeOpen(false)}
                className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>

              <p className="text-xs text-blue-100 font-medium">
                {currentChallenge.instruction}
              </p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mt-0.5">
                {currentChallenge.title}
              </h3>
              <p className="text-[11px] text-blue-100 mt-1 leading-snug">
                {currentChallenge.hint}
              </p>
            </div>

            {/* Error Banner if invalid selection */}
            {challengeError && (
              <div className="bg-red-50 text-red-700 border-b border-red-200 px-3.5 py-2 text-xs flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{challengeError}</span>
              </div>
            )}

            {/* 3x3 Image Grid with 100% Guaranteed Vector Graphics */}
            <div className="p-3 bg-[#f5f5f5]">
              <div className="grid grid-cols-3 gap-2">
                {currentChallenge.items.map((item) => {
                  const isSelected = selectedTileIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleTileSelection(item.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150 select-none group bg-zinc-800 ${
                        isSelected 
                          ? 'border-[#1a73e8] ring-2 ring-[#1a73e8]/40 scale-[0.96] shadow-md' 
                          : 'border-transparent hover:border-blue-300 hover:scale-[0.98]'
                      }`}
                    >
                      {/* Crisp Vector Artwork Graphic */}
                      <div className={`w-full h-full transition-transform duration-200 ${isSelected ? 'brightness-90' : 'group-hover:scale-105'}`}>
                        <CaptchaTileGraphic type={item.type} />
                      </div>

                      {/* Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Small Caption */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1">
                        <p className="text-[10px] text-white truncate font-medium text-center drop-shadow-sm">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-white border-t border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                <button
                  type="button"
                  onClick={handleReloadChallenge}
                  title="Đổi câu đố khác"
                  className="p-2 rounded-full hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => alert('Vui lòng chọn tất cả các ô hình ảnh tương ứng với tiêu đề phía trên.')}
                  title="Thông tin trợ giúp"
                  className="p-2 rounded-full hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChallengeOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleVerifyChallenge}
                  disabled={isVerifyingChallenge}
                  className="px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.97] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isVerifyingChallenge ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Xác minh</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Minimal Footer */}
      <footer className="relative z-10 w-full text-center py-3 text-xs text-zinc-400 font-mono">
        SMART DUAL-AXIS SOLAR TRACKER DASHBOARD • VER 2.0 (FUZZY-PID & PSO)
      </footer>

    </div>
  );
}
