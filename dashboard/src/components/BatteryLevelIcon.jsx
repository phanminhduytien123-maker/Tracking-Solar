import React from 'react';

/**
 * Biểu tượng pin dọc kiểu GiBattery75 với 5 nấc ngang tượng trưng cho dung lượng ắc quy (0..5 nấc).
 */
export default function BatteryLevelIcon({ levels = 0, className = 'w-3.5 h-4 shrink-0' }) {
  const clampedLevels = Math.max(0, Math.min(5, Math.round(Number(levels) || 0)));
  // 5 nấc xếp từ dưới (nấc 1) lên trên (nấc 5) bên trong thân pin
  const bars = [
    { idx: 5, y: 5.9 },
    { idx: 4, y: 9.65 },
    { idx: 3, y: 13.4 },
    { idx: 2, y: 17.15 },
    { idx: 1, y: 20.9 }
  ];

  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Núm cực dương phía trên giống GiBattery75 */}
      <rect x="8.5" y="1" width="7" height="2.6" rx="1" fill="currentColor" />
      {/* Thân pin bo góc */}
      <rect
        x="4"
        y="3.6"
        width="16"
        height="22.4"
        rx="2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      {/* 5 nấc ngang hiển thị mức dung lượng */}
      {bars.map((bar) => (
        <rect
          key={bar.idx}
          x="6.8"
          y={bar.y}
          width="10.4"
          height="2.8"
          rx="0.7"
          fill="currentColor"
          opacity={bar.idx <= clampedLevels ? 1 : 0.14}
        />
      ))}
    </svg>
  );
}

