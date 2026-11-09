import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  formatSignedNumber,
  formatValueOrDash,
  getConnectionStatusBadge,
  getCompassDirectionName
} from '../utils/formatters';

/**
 * THUẬT TOÁN THIÊN VĂN FULL NOAA (Đồng bộ 100% với firmware/esp32_tracker_control/lib/solar_core/solar_ephemeris.cpp)
 */
function calculateNoaaSolarPosition(dateObj, latDeg = 10.78816, lonDeg = 106.66617, tzOffsetHours = 7) {
  const DEG_TO_RAD = Math.PI / 180.0;
  const RAD_TO_DEG = 180.0 / Math.PI;
  const degToRad = (d) => d * DEG_TO_RAD;
  const radToDeg = (r) => r * RAD_TO_DEG;
  const clampVal = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const wrap360 = (a) => {
    let r = a % 360.0;
    if (r < 0) r += 360.0;
    return r;
  };

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hour = dateObj.getHours();
  const minute = dateObj.getMinutes();
  const second = dateObj.getSeconds();

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const aTerm = Math.floor(y / 100);
  const bTerm = 2 - aTerm + Math.floor(aTerm / 4);

  const dayFraction = (hour + minute / 60.0 + second / 3600.0 - tzOffsetHours) / 24.0;
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    bTerm -
    1524.5 +
    dayFraction;

  const t = (jd - 2451545.0) / 36525.0;

  let l0 = wrap360(280.46646 + t * (36000.76983 + 0.0003032 * t));
  let mAnomaly = wrap360(357.52911 + t * (35999.05029 - 0.0001537 * t));
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const mRad = degToRad(mAnomaly);
  const c =
    Math.sin(mRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2.0 * mRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3.0 * mRad) * 0.000289;

  const sunTrueLon = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = sunTrueLon - 0.00569 - 0.00478 * Math.sin(degToRad(omega));

  const eps0 = 23.0 + (26.0 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0;
  const eps = eps0 + 0.00256 * Math.cos(degToRad(omega));

  const epsRad = degToRad(eps);
  const lambdaRad = degToRad(lambda);
  const sinDelta = Math.sin(epsRad) * Math.sin(lambdaRad);
  const deltaRad = Math.asin(clampVal(sinDelta, -1.0, 1.0));

  let yParam = Math.tan(epsRad / 2.0);
  yParam *= yParam;
  const l0Rad = degToRad(l0);

  const eot =
    4.0 *
    RAD_TO_DEG *
    (yParam * Math.sin(2.0 * l0Rad) -
      2.0 * e * Math.sin(mRad) +
      4.0 * e * yParam * Math.sin(mRad) * Math.cos(2.0 * l0Rad) -
      0.5 * yParam * yParam * Math.sin(4.0 * l0Rad) -
      1.25 * e * e * Math.sin(2.0 * mRad));

  const timeOffset = eot + 4.0 * lonDeg - 60.0 * tzOffsetHours;
  let trueSolarTimeMin = (hour * 60.0 + minute + second / 60.0 + timeOffset) % 1440.0;
  if (trueSolarTimeMin < 0) trueSolarTimeMin += 1440.0;

  let hourAngleDeg = trueSolarTimeMin / 4.0 - 180.0;
  if (hourAngleDeg < -180.0) hourAngleDeg += 360.0;

  const haRad = degToRad(hourAngleDeg);
  const latRad = degToRad(latDeg);

  const cosZenith = clampVal(
    Math.sin(latRad) * Math.sin(deltaRad) + Math.cos(latRad) * Math.cos(deltaRad) * Math.cos(haRad),
    -1.0,
    1.0
  );
  const zenithDeg = radToDeg(Math.acos(cosZenith));
  const elRaw = 90.0 - zenithDeg;

  let elCorrected = elRaw;
  if (elRaw > -0.85) {
    let rArcsec = 0.0;
    if (elRaw > 5.0) {
      const tanEl = Math.tan(degToRad(elRaw));
      rArcsec = 58.1 / tanEl - 0.07 / Math.pow(tanEl, 3) + 0.000086 / Math.pow(tanEl, 5);
    } else if (elRaw >= -0.575) {
      rArcsec = 1735.0 + elRaw * (-518.2 + elRaw * (103.4 + elRaw * (-12.79 + elRaw * 0.711)));
    } else {
      rArcsec = -20.774 / Math.tan(degToRad(elRaw));
    }
    elCorrected += rArcsec / 3600.0;
  }

  const sinHa = Math.sin(haRad);
  const cosHa = Math.cos(haRad);
  const xAz = Math.cos(latRad) * Math.sin(deltaRad) - Math.sin(latRad) * Math.cos(deltaRad) * cosHa;
  const yAz = -Math.cos(deltaRad) * sinHa;
  const azFromNorth = wrap360(radToDeg(Math.atan2(yAz, xAz)));

  const cosH0 =
    (Math.cos(degToRad(90.833)) - Math.sin(latRad) * Math.sin(deltaRad)) /
    (Math.cos(latRad) * Math.cos(deltaRad));
  let solarNoonMin = (720.0 - 4.0 * lonDeg - eot + 60.0 * tzOffsetHours) % 1440.0;
  if (solarNoonMin < 0) solarNoonMin += 1440.0;

  let sunriseMin = 345;
  let sunsetMin = 1065;
  if (cosH0 >= -1.0 && cosH0 <= 1.0) {
    const h0Deg = radToDeg(Math.acos(clampVal(cosH0, -1.0, 1.0)));
    sunriseMin = Math.round(clampVal(solarNoonMin - 4.0 * h0Deg, 0, 1440));
    sunsetMin = Math.round(clampVal(solarNoonMin + 4.0 * h0Deg, 0, 1440));
  }

  const formatMin = (mTotal) => {
    const hh = Math.floor(mTotal / 60).toString().padStart(2, '0');
    const mm = Math.floor(mTotal % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return {
    azimuthDeg: Math.round(azFromNorth * 10) / 10,
    elevationDeg: Math.round(elCorrected * 10) / 10,
    zenithDeg: Math.round((90.0 - elCorrected) * 10) / 10,
    isDaylight: elCorrected >= 0,
    sunriseStr: formatMin(sunriseMin),
    sunsetStr: formatMin(sunsetMin)
  };
}

/**
 * Quy đổi tọa độ thiên văn NOAA sang không gian 3D:
 * - Trái (-X) = BẮC (0°)
 * - Trên (-Z) = ĐÔNG (90°)
 * - Phải (+X) = NAM (180°)
 * - Dưới (+Z) = TÂY (270°)
 */
function noaaTo3DPosition(azimuthDeg, elevationDeg, radius = 4.5) {
  const azRad = THREE.MathUtils.degToRad(azimuthDeg);
  const elRad = THREE.MathUtils.degToRad(Math.max(2, elevationDeg));
  const sinEl = Math.sin(elRad);
  const horizRadius = radius * Math.cos(elRad) * (1 - 0.16 * sinEl);
  const centerXOffset = -1.55 * sinEl;
  const x = centerXOffset - horizRadius * Math.cos(azRad);
  const y = radius * sinEl + 0.75 * sinEl + 0.35;
  const z = -horizRadius * Math.sin(azRad);
  return new THREE.Vector3(x, y, z);
}

/**
 * Tạo nhãn chữ 3D trên mặt sàn cho 4 hướng: ĐÔNG (90°), TÂY (270°), NAM (180°), BẮC (0°)
 */
function createCompassFloorLabel(text, subText, borderColor = '#38bdf8') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 488, 136, 18);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 32px "Be Vietnam Pro", sans-serif';
  ctx.fillText(subText, 256, 114);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.42), mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/**
 * Tạo texture mặt tấm pin mặt trời Monocrystalline độ phân giải cao (1024x1024)
 */
function createRealisticSolarPanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 22;
  const centerGap = 10;
  const halfW = (canvas.width - margin * 2 - centerGap) / 2;
  const totalH = canvas.height - margin * 2;
  const numStrips = 18;
  const stripH = totalH / numStrips;

  for (let col = 0; col < 2; col++) {
    const startX = margin + col * (halfW + centerGap);

    for (let r = 0; r < numStrips; r++) {
      const startY = margin + r * stripH;

      const grad = ctx.createLinearGradient(startX, startY, startX + halfW, startY + stripH);
      grad.addColorStop(0, '#071324');
      grad.addColorStop(0.5, '#0c213d');
      grad.addColorStop(1, '#08162b');
      ctx.fillStyle = grad;
      ctx.fillRect(startX + 1.5, startY + 1.5, halfW - 3, stripH - 3);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 0.8;
      for (let f = 1; f <= 3; f++) {
        const fy = startY + (stripH * f) / 4;
        ctx.beginPath();
        ctx.moveTo(startX + 2, fy);
        ctx.lineTo(startX + halfW - 2, fy);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1.6;
      for (let b = 1; b <= 5; b++) {
        const bx = startX + (halfW * b) / 6;
        ctx.beginPath();
        ctx.moveTo(bx, startY + 1.5);
        ctx.lineTo(bx, startY + stripH - 1.5);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI / 2;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Tạo texture rãnh nhôm định hình V-Slot 20x20
 */
function createVSlotExtrusionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d4d8dd';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 256; i += 4) {
    ctx.fillRect(i, 0, 1, 256);
  }

  ctx.fillStyle = '#334155';
  ctx.fillRect(98, 0, 60, 256);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(110, 0, 36, 256);

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(94, 0, 4, 256);
  ctx.fillRect(158, 0, 4, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Tạo texture bề mặt nhôm đục lỗ tổ ong (Honeycomb SMPS 12V)
 */
function createHoneycombPsuTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Nền nhôm phay xước bạc
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < 256; i += 3) {
    ctx.fillRect(i, 0, 1, 256);
  }

  // Các lỗ tản nhiệt tổ ong (lục giác / tròn xếp lệch hàng)
  const r = 7;
  const dx = 20;
  const dy = 17;
  for (let row = 1; row < 14; row++) {
    for (let col = 1; col < 12; col++) {
      const cx = col * dx + (row % 2 === 0 ? dx / 2 : 0);
      const cy = row * dy;
      if (cx > 22 && cx < 234 && cy > 20 && cy < 236) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI) / 3;
          const hx = cx + r * Math.cos(ang);
          const hy = cy + r * Math.sin(ang);
          if (s === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Tạo hình học gá chữ T in 3D màu trắng
 */
function createSculptedTBracketGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.44, 0.12);
  shape.lineTo(0.44, 0.12);
  shape.quadraticCurveTo(0.48, 0.12, 0.48, 0.08);
  shape.lineTo(0.48, -0.02);
  shape.quadraticCurveTo(0.48, -0.06, 0.43, -0.06);
  shape.lineTo(0.22, -0.06);
  shape.quadraticCurveTo(0.18, -0.06, 0.18, -0.10);
  shape.lineTo(0.18, -0.22);
  shape.quadraticCurveTo(0.18, -0.27, 0.12, -0.27);
  shape.lineTo(-0.12, -0.27);
  shape.quadraticCurveTo(-0.18, -0.27, -0.18, -0.22);
  shape.lineTo(-0.18, -0.10);
  shape.quadraticCurveTo(-0.18, -0.06, -0.22, -0.06);
  shape.lineTo(-0.43, -0.06);
  shape.quadraticCurveTo(-0.48, -0.06, -0.48, -0.02);
  shape.lineTo(-0.48, 0.08);
  shape.quadraticCurveTo(-0.48, 0.12, -0.44, 0.12);

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008
  });
}

// Góc nhìn tổng quan mặc định & góc xuất phát khi chuyển cảnh (Cinematic Camera Fly-in)
const DEFAULT_CAM_POS = new THREE.Vector3(0, 4.1, 7.9);
const INTRO_CAM_POS = new THREE.Vector3(0, 7.2, 13.8);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 1.25, 0);

/**
 * COMPACT MODE: HIỂN THỊ TRỰC TIẾP TRÊN NỀN THỜI TIẾT (KHÔNG KHUNG, KHÔNG TIÊU ĐỀ, KHÔNG NÚT Rườm Rà)
 * - Có hiệu ứng Camera Fly-in mượt mà khi kích hoạt Compact Mode và Fly-out khi trở về giao diện tiêu chuẩn.
 * - Nhấn vào bộ phận nào (Tấm Tracker, Tấm Cố định, Hộp điện, Mặt trời NOAA) thì tự động Zoom vào bộ phận đó và hiện thông số.
 * - Cuộn chuột lùi (Zoom out) để tự động thu phóng trở lại toàn cảnh và đóng bảng thông số.
 */
export default function CompactInteractiveTwin({
  telemetry,
  location = null,
  weatherData = null,
  isActive = false
}) {
  const INA226 = telemetry?.INA226 || {};
  const motors = telemetry?.motors || {};
  const system = telemetry?.system || {};

  const tracking = INA226?.tracking || { voltage: null, current: null, power: null, energyWh: null };
  const stat = INA226?.static || { voltage: null, current: null, power: null, energyWh: null };
  const comparison = INA226?.comparison || { percentGain: null, powerDelta: null, hasValidGain: false };

  const az = motors?.azimuth || {};
  const el = motors?.elevation || {};

  const livePhi = az.phi !== undefined && az.phi !== null ? Number(az.phi) : (az.currentAngle !== null ? Number(az.currentAngle) : 2.3);
  const liveEps = el.epsilon !== undefined && el.epsilon !== null ? Number(el.epsilon) : (el.currentAngle !== null ? Number(el.currentAngle) : 9.3);

  const siteLat = Number(location?.lat) || 10.78816;
  const siteLon = Number(location?.lon) || 106.66617;

  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(null); // null | 'tracker' | 'static' | 'box' | 'sun' | 'anemometer'
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setClockTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Tính vị trí Mặt trời theo thuật toán thiên văn NOAA thời gian thực
  const noaaSun = useMemo(() => {
    return calculateNoaaSolarPosition(new Date(), siteLat, siteLon, 7);
  }, [siteLat, siteLon, clockTick]);

  // Phương vị địa lý thực tế (Compass Azimuth):
  // - Switch Home 1 đặt tại Nam (180°). Sáng (trước 12h): 180° - φ (Đông -> Đông Nam -> Nam).
  // - Chiều (sau 12h): 360° - φ (kết hợp Trục 2 ngửa sau đón nắng Tây Nam -> Tây).
  const compassAzimuth = (() => {
    if (livePhi !== null && livePhi !== undefined && !isNaN(livePhi)) {
      const hour = new Date().getHours();
      const isAfternoon = hour >= 12;
      let azVal = isAfternoon ? (360.0 - livePhi) : (180.0 - livePhi);
      while (azVal < 0) azVal += 360.0;
      while (azVal >= 360.0) azVal -= 360.0;
      return Math.round(azVal * 10) / 10;
    }
    if (az.currentAngle !== null && az.currentAngle !== undefined && !isNaN(az.currentAngle)) {
      return Number(az.currentAngle);
    }
    return null;
  })();

  const trkBadge = getConnectionStatusBadge(tracking.connStatus, tracking.staleDurationMs);
  const staBadge = getConnectionStatusBadge(stat.connStatus, stat.staleDurationMs);
  const hasValidGain = comparison.hasValidGain && comparison.percentGain !== null;

  // Refs cho Three.js
  const mountRef = useRef(null);
  const sceneObjectsRef = useRef({
    azimuthGroup: null,
    elevationGroup: null,
    lidGroup: null,
    fanBladesGroup: null,
    sunGroup: null,
    sunRayLine: null,
    sw1LedMat: null,
    sw2LedMat: null,
    camera: null,
    controls: null,
    scene: null
  });
  const targetAnglesRef = useRef({
    phiRad: 0,
    tiltRad: THREE.MathUtils.degToRad(30),
    lidRad: 0,
    camTargetPos: null,
    camLookAt: null,
    trkPower: 0,
    staPower: 0,
    focusedPanel: null
  });

  // Đồng bộ trạng thái đang focus vào tấm pin / hộp điện
  useEffect(() => {
    targetAnglesRef.current.focusedPanel = selectedPanel;
  }, [selectedPanel]);

  // Đồng bộ công suất tức thời đọc từ 2 cảm biến INA226 để điều khiển cường độ dòng năng lượng mặt trời
  useEffect(() => {
    targetAnglesRef.current.trkPower = Math.max(0, Number(tracking.power) || 0);
    targetAnglesRef.current.staPower = Math.max(0, Number(stat.power) || 0);
  }, [tracking.power, stat.power]);

  // Đồng bộ góc quay 2 trục của tấm Tracker theo đúng hệ tọa độ La bàn 3D:
  // - Trên (-Z) = Đông (90°), Phải (+X) = Nam (180°), Dưới (+Z) = Tây (270°), Trái (-X) = Bắc (0° / 360°)
  // - Khi buổi sáng / ngủ đêm (ε < 50°): Mặt pin nghiêng về phía -X lokal (elevationGroup.rotation.z > 0),
  //   do đó để hướng mặt tấm pin nhìn về góc phương vị Az (ví dụ Đông Nam ~130°), trục đứng cần xoay:
  //   azimuthGroup.rotation.y = (90° - Az) hoặc khi tính trực tiếp từ cơ cấu (φ, ε):
  //   Khi φ = 0° (Home Nam 180°) -> trục +X hướng về Bắc (-X thế giới), mặt nghiêng -X hướng về Nam (+X thế giới) -> phiRad = π - φ (hoặc +φ từ gốc Bắc).
  useEffect(() => {
    const epsDeg = Number(liveEps);
    const validEps = !isNaN(epsDeg) ? epsDeg : 9.3;

    // Góc nghiêng mặt pin quanh trục Z cục bộ (Zenith nằm ngang = 50°):
    // - Khi ngủ đêm hoặc về sát giới hạn mềm (validEps <= 12°): giữ nguyên góc nghiêng chuẩn (~30° về hướng Bắc)
    // - Khi bám mặt trời ban ngày: tính góc nghiêng vuông góc (90°) với tia bức xạ Mặt trời NOAA
    let tiltLeftDeg = 0;
    const rawDelta = 50 - validEps;
    if (system?.isSleeping || validEps <= 12) {
      tiltLeftDeg = Math.max(-42, Math.min(42, rawDelta * 0.75));
    } else if (Math.abs(rawDelta) > 0.8) {
      const tiltSign = rawDelta >= 0 ? 1 : -1;
      if (noaaSun?.isDaylight && !system?.isManualMode) {
        const sunPos = noaaTo3DPosition(noaaSun.azimuthDeg, noaaSun.elevationDeg, 4.5);
        const rayHorizDist = Math.hypot(sunPos.x - (-2.05), sunPos.z);
        const rayVertDist = Math.max(0.5, sunPos.y - 2.35);
        const rayZenithDeg = THREE.MathUtils.radToDeg(Math.atan2(rayHorizDist, rayVertDist));
        tiltLeftDeg = tiltSign * Math.min(41, Math.max(90 - noaaSun.elevationDeg, rayZenithDeg));
      } else {
        tiltLeftDeg = Math.max(-41, Math.min(41, rawDelta));
      }
    }
    targetAnglesRef.current.tiltRad = THREE.MathUtils.degToRad(tiltLeftDeg);

    // Xác định hướng xoay Trục 1 (azimuthGroup.rotation.y) sao cho Pháp tuyến mặt pin hướng đúng về Phương vị địa lý (Đông Nam buổi sáng / Tây Nam buổi chiều):
    const azDeg = compassAzimuth !== null ? Number(compassAzimuth) : (180 - (Number(livePhi) || 0));
    const azRad = THREE.MathUtils.degToRad(azDeg);
    if (tiltLeftDeg >= 0) {
      targetAnglesRef.current.phiRad = -azRad;
    } else {
      targetAnglesRef.current.phiRad = Math.PI - azRad;
    }
  }, [livePhi, liveEps, compassAzimuth, noaaSun, system?.isSleeping, system?.isManualMode]);

  // Đồng bộ vị trí Mặt trời NOAA trong không gian 3D
  useEffect(() => {
    const { sunGroup, sunRayLine } = sceneObjectsRef.current;
    if (!sunGroup || !sunRayLine) return;

    const sunPos = noaaTo3DPosition(noaaSun.azimuthDeg, noaaSun.elevationDeg, 4.5);
    sunGroup.position.copy(sunPos);

    const posAttr = sunRayLine.geometry.attributes.position;
    posAttr.setXYZ(0, sunPos.x, sunPos.y, sunPos.z);
    posAttr.setXYZ(1, -2.05, 2.35, 0);
    posAttr.needsUpdate = true;
    sunRayLine.computeLineDistances();

    sunGroup.visible = true;
    sunRayLine.visible = noaaSun.isDaylight;
  }, [noaaSun]);

  // Đồng bộ góc mở nắp hộp điện 3D
  useEffect(() => {
    targetAnglesRef.current.lidRad = isBoxOpen ? THREE.MathUtils.degToRad(105) : 0;
  }, [isBoxOpen]);

  // Đồng bộ đèn báo công tắc hành trình SW1, SW2
  useEffect(() => {
    const { sw1LedMat, sw2LedMat } = sceneObjectsRef.current;
    if (sw1LedMat) {
      sw1LedMat.color.setHex(az.limitHome ? 0xf59e0b : 0x10b981);
    }
    if (sw2LedMat) {
      sw2LedMat.color.setHex(el.limitSwitch90 ? 0xf59e0b : 0x10b981);
    }
  }, [az.limitHome, el.limitSwitch90]);

  // Hàm thu phóng trở lại toàn cảnh mặc định
  const zoomBackToOverview = () => {
    setSelectedPanel(null);
    setIsBoxOpen(false);
    targetAnglesRef.current.camTargetPos = DEFAULT_CAM_POS.clone();
    targetAnglesRef.current.camLookAt = DEFAULT_LOOK_AT.clone();
  };

  // Hiệu ứng Camera Fly-in mượt mà khi bật sang Mode Compact và Fly-out khi trở về Mode tiêu chuẩn
  useEffect(() => {
    const { camera, controls } = sceneObjectsRef.current;
    if (isActive) {
      if (camera && controls) {
        camera.position.copy(INTRO_CAM_POS);
        controls.target.set(0, 1.85, 0);
        controls.update();
      }
      targetAnglesRef.current.camTargetPos = DEFAULT_CAM_POS.clone();
      targetAnglesRef.current.camLookAt = DEFAULT_LOOK_AT.clone();
    } else {
      setSelectedPanel(null);
      setIsBoxOpen(false);
      targetAnglesRef.current.camTargetPos = INTRO_CAM_POS.clone();
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0, 1.85, 0);
    }
  }, [isActive]);

  // Khởi tạo không gian 3D Trong Suốt Ngay Trên Nền Thời Tiết
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight - 110;

    // Scene trong suốt hoàn toàn (background = null) để hiển thị trực tiếp trên nền thời tiết
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 120);
    camera.position.copy(DEFAULT_CAM_POS);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_LOOK_AT);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 1.3;
    controls.maxDistance = 18;
    controls.update();

    // Đèn chiếu sáng kỹ thuật
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(5.5, 9.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.6);
    fillLight.position.set(-6, 5, 4);
    scene.add(fillLight);

    // Lưới tọa độ mặt sàn nhẹ và trong suốt trên nền thời tiết
    const gridHelper = new THREE.GridHelper(12, 24, 0x64748b, 0x94a3b8);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.16;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // =========================================================================
    // 0. HỆ TRỤC LA BÀN ĐÔNG - TÂY - NAM - BẮC & QUỸ ĐẠO MẶT TRỜI NOAA TRONG 3D
    // - Trên (-Z) = ĐÔNG (90°)
    // - Phải (+X) = NAM (180°)
    // - Dưới (+Z) = TÂY (270°)
    // - Trái (-X) = BẮC (0°)
    // =========================================================================
    const compassGroup = new THREE.Group();
    compassGroup.position.y = 0.01;
    scene.add(compassGroup);

    const ringGeom = new THREE.RingGeometry(4.25, 4.32, 96);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    compassGroup.add(new THREE.Mesh(ringGeom, ringMat));

    const axisLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 });
    const nsPoints = [new THREE.Vector3(-4.25, 0.01, 0), new THREE.Vector3(4.25, 0.01, 0)];
    const ewPoints = [new THREE.Vector3(0, 0.01, -2.55), new THREE.Vector3(0, 0.01, 2.55)];
    compassGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(nsPoints), axisLineMat));
    compassGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ewPoints), axisLineMat));

    const labelEast = createCompassFloorLabel('ĐÔNG', '90° (Bình minh)', '#f59e0b');
    labelEast.position.set(0, 0.015, -2.65);
    compassGroup.add(labelEast);

    const labelWest = createCompassFloorLabel('TÂY', '270° (Hoàng hôn)', '#fb923c');
    labelWest.position.set(0, 0.015, 2.65);
    compassGroup.add(labelWest);

    const labelSouth = createCompassFloorLabel('NAM', '180° (Hướng chuẩn)', '#38bdf8');
    labelSouth.position.set(4.35, 0.015, 0);
    compassGroup.add(labelSouth);

    const labelNorth = createCompassFloorLabel('BẮC', '0° / 360°', '#94a3b8');
    labelNorth.position.set(-4.35, 0.015, 0);
    compassGroup.add(labelNorth);

    // Quỹ đạo Mặt trời NOAA trong ngày (Từ Đông -> Nam -> Tây)
    const arcPoints = [];
    const sampleDate = new Date();
    for (let h = 6.0; h <= 17.5; h += 0.5) {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      sampleDate.setHours(hh, mm, 0, 0);
      const p = calculateNoaaSolarPosition(sampleDate, siteLat, siteLon, 7);
      if (p.elevationDeg > 0) {
        arcPoints.push(noaaTo3DPosition(p.azimuthDeg, p.elevationDeg, 4.5));
      }
    }
    if (arcPoints.length >= 2) {
      const solarCurve = new THREE.CatmullRomCurve3(arcPoints);
      const arcGeom = new THREE.BufferGeometry().setFromPoints(solarCurve.getPoints(60));
      const arcMat = new THREE.LineDashedMaterial({
        color: 0xf59e0b,
        dashSize: 0.18,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.65
      });
      const arcLine = new THREE.Line(arcGeom, arcMat);
      arcLine.computeLineDistances();
      scene.add(arcLine);
    }

    // Quả cầu Mặt trời NOAA
    const sunGroup = new THREE.Group();
    sunGroup.name = 'noaaSun';
    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.3 })
    );
    sunGroup.add(sunSphere, sunHalo);
    const initSunPos = noaaTo3DPosition(noaaSun.azimuthDeg, noaaSun.elevationDeg, 4.5);
    sunGroup.position.copy(initSunPos);
    scene.add(sunGroup);

    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      initSunPos,
      new THREE.Vector3(-2.05, 2.35, 0)
    ]);
    const sunRayLine = new THREE.Line(
      rayGeom,
      new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.55 })
    );
    sunRayLine.computeLineDistances();
    sunRayLine.visible = noaaSun.isDaylight;
    scene.add(sunRayLine);

    // =========================================================================
    // VẬT LIỆU PBR CÔNG NGHIỆP
    // =========================================================================
    const vSlotTex = createVSlotExtrusionTexture();
    const aluExtrusionMat = new THREE.MeshStandardMaterial({
      color: 0xd8dee6,
      map: vSlotTex,
      metalness: 0.78,
      roughness: 0.26
    });
    const aluFrameMat = new THREE.MeshStandardMaterial({
      color: 0xdce2ea,
      metalness: 0.82,
      roughness: 0.22
    });
    const chromeSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.92,
      roughness: 0.14
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.22
    });
    const blackAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x182232,
      metalness: 0.45,
      roughness: 0.42
    });
    const matteBlackPrintMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.12,
      roughness: 0.62
    });
    const rubberBeltMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.08,
      roughness: 0.78
    });
    const whitePrintMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.06,
      roughness: 0.32
    });
    const enclosureAbsMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.04,
      roughness: 0.28
    });
    const pcbBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.25,
      roughness: 0.35
    });
    const pcbGreenMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      metalness: 0.25,
      roughness: 0.35
    });
    const wireRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const wireBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });

    const solarTex = createRealisticSolarPanelTexture();
    const solarGlassMat = new THREE.MeshPhysicalMaterial({
      map: solarTex,
      metalness: 0.15,
      roughness: 0.15,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    const addVSlotBar = (parent, w, h, d, x, y, z) => {
      const geom = new RoundedBoxGeometry(w, h, d, 2, 0.012);
      const mesh = new THREE.Mesh(geom, aluExtrusionMat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const addCornerBracket = (parent, x, y, z, rotY = 0) => {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = rotY;
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.09), aluFrameMat);
      const bolt1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.096, 12), chromeSteelMat);
      bolt1.rotation.z = Math.PI / 2;
      grp.add(b1, bolt1);
      parent.add(grp);
    };

    const createDetailedNema17 = () => {
      const motorGrp = new THREE.Group();
      const capTop = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.06, 0.35, 2, 0.015), aluFrameMat);
      capTop.position.y = 0.14;
      const statorCore = new THREE.Mesh(new RoundedBoxGeometry(0.345, 0.22, 0.345, 2, 0.01), matteBlackPrintMat);
      const capBot = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.06, 0.35, 2, 0.015), aluFrameMat);
      capBot.position.y = -0.14;
      const bossRing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), aluFrameMat);
      bossRing.position.y = 0.175;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.18, 16), chromeSteelMat);
      shaft.position.y = 0.24;
      motorGrp.add(capTop, statorCore, capBot, bossRing, shaft);
      return motorGrp;
    };

    const createBallBearing = (radius = 0.075, thickness = 0.04) => {
      const brgGrp = new THREE.Group();
      const outerRing = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 24), chromeSteelMat);
      outerRing.rotation.x = Math.PI / 2;
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, thickness + 0.004, 20), blackAnodizedMat);
      shield.rotation.x = Math.PI / 2;
      const innerBolt = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, thickness + 0.015, 16), chromeSteelMat);
      innerBolt.rotation.x = Math.PI / 2;
      brgGrp.add(outerRing, shield, innerBolt);
      return brgGrp;
    };

    const createIndustrialSolarPanel = (widthX, depthZ, withSensors = false) => {
      const panelGrp = new THREE.Group();
      const frameH = 0.058;
      const railW = 0.045;

      const railLeft = new THREE.Mesh(new RoundedBoxGeometry(railW, frameH, depthZ, 2, 0.006), aluFrameMat);
      railLeft.position.set(-widthX / 2 + railW / 2, 0, 0);
      const railRight = new THREE.Mesh(new RoundedBoxGeometry(railW, frameH, depthZ, 2, 0.006), aluFrameMat);
      railRight.position.set(widthX / 2 - railW / 2, 0, 0);
      const railFront = new THREE.Mesh(new RoundedBoxGeometry(widthX - railW * 2, frameH, railW, 2, 0.006), aluFrameMat);
      railFront.position.set(0, 0, depthZ / 2 - railW / 2);
      const railBack = new THREE.Mesh(new RoundedBoxGeometry(widthX - railW * 2, frameH, railW, 2, 0.006), aluFrameMat);
      railBack.position.set(0, 0, -depthZ / 2 + railW / 2);

      const coreMesh = new THREE.Mesh(
        new THREE.BoxGeometry(widthX - railW * 1.8, frameH * 0.55, depthZ - railW * 1.8),
        whitePrintMat
      );
      coreMesh.position.set(0, -0.004, 0);
      coreMesh.castShadow = true;
      coreMesh.receiveShadow = true;

      const glassPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(widthX - railW * 1.9, depthZ - railW * 1.9),
        solarGlassMat
      );
      glassPlane.rotation.x = -Math.PI / 2;
      glassPlane.position.set(0, frameH * 0.28, 0);

      panelGrp.add(railLeft, railRight, railFront, railBack, coreMesh, glassPlane);

      if (withSensors) {
        const clipCoords = [
          [0, depthZ / 2 + 0.008, 0],
          [0, -depthZ / 2 - 0.008, Math.PI],
          [-widthX / 2 - 0.008, 0, -Math.PI / 2],
          [widthX / 2 + 0.008, 0, Math.PI / 2]
        ];
        clipCoords.forEach(([cx, cz, rotY]) => {
          const clipGrp = new THREE.Group();
          clipGrp.position.set(cx, 0.006, cz);
          clipGrp.rotation.y = rotY;
          const uClip = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.052, 0.055, 2, 0.006), whitePrintMat);
          const sensorPcb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.032), pcbBlueMat);
          sensorPcb.position.set(0, 0.028, -0.004);
          const sensorEye = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.014), blackAnodizedMat);
          sensorEye.position.set(0, 0.034, -0.004);
          clipGrp.add(uClip, sensorPcb, sensorEye);
          panelGrp.add(clipGrp);
        });
      }

      return panelGrp;
    };

    // =========================================================================
    // 1. KHUNG ĐẾ NHÔM ĐỊNH HÌNH 20x20 ĐẶT SÀN
    // =========================================================================
    const frameGroup = new THREE.Group();
    scene.add(frameGroup);

    const frameY = 0.34;
    const barT = 0.115;
    // Khung nhôm chạy từ mép trái (-3.14) đến ngay dưới trụ tấm pin cố định (2.15)
    addVSlotBar(frameGroup, 5.405, barT, barT, -0.495, frameY, 1.08);
    addVSlotBar(frameGroup, 5.405, barT, barT, -0.495, frameY, -1.08);
    addVSlotBar(frameGroup, barT, barT, 2.04, -3.14, frameY, 0);
    addVSlotBar(frameGroup, barT, barT, 2.04, -0.96, frameY, 0);
    addVSlotBar(frameGroup, barT, barT, 2.04, 1.05, frameY, 0);
    // 2 thanh giằng đỡ cụm trục xoay đặt dọc (theo trục Z, xoay 90 độ so với thanh dài)
    addVSlotBar(frameGroup, barT, barT, 2.04, -2.05 - 0.18, frameY, 0);
    addVSlotBar(frameGroup, barT, barT, 2.04, -2.05 + 0.18, frameY, 0);
    addVSlotBar(frameGroup, barT, barT, 2.04, 2.15, frameY, 0);

    const legCoords = [
      [-3.14, 1.08], [-3.14, -1.08],
      [-0.96, 1.08], [-0.96, -1.08],
      [1.05, 1.08], [1.05, -1.08],
      [2.15, 1.08], [2.15, -1.08]
    ];
    legCoords.forEach(([lx, lz]) => {
      addVSlotBar(frameGroup, barT, frameY, barT, lx, frameY / 2, lz);
      const rubberFoot = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.03, 0.14, 2, 0.005), matteBlackPrintMat);
      rubberFoot.position.set(lx, 0.015, lz);
      frameGroup.add(rubberFoot);
      addCornerBracket(frameGroup, lx + (lx < 0 ? 0.08 : -0.08), frameY - 0.07, lz);
    });

    // =========================================================================
    // 2. CỤM BÊN TRÁI: HỆ THỐNG PIN TRACKING 2 TRỤC
    // =========================================================================
    const trackerRootGroup = new THREE.Group();
    trackerRootGroup.name = 'trackerSystem';
    scene.add(trackerRootGroup);

    const trackerX = -2.05;

    const hubClampBase = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.14, 0.56, 2, 0.015), matteBlackPrintMat);
    hubClampBase.position.set(trackerX, frameY + 0.04, 0);
    trackerRootGroup.add(hubClampBase);

    const hubLowerCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 40), matteBlackPrintMat);
    hubLowerCylinder.position.set(trackerX, frameY + 0.22, 0);
    hubLowerCylinder.castShadow = true;
    trackerRootGroup.add(hubLowerCylinder);

    const hubBeltGroove = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 40), rubberBeltMat);
    hubBeltGroove.position.set(trackerX, frameY + 0.20, 0);
    trackerRootGroup.add(hubBeltGroove);

    // Xoay cụm Motor M1, Encoder 1, dây đai và công tắc hành trình Trục 1 một góc 90 độ để nằm dọc theo 2 thanh đỡ
    const baseAxis1MechGroup = new THREE.Group();
    baseAxis1MechGroup.position.set(trackerX, 0, 0);
    baseAxis1MechGroup.rotation.y = -Math.PI / 2;
    trackerRootGroup.add(baseAxis1MechGroup);

    const m1Plate = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.06, 0.44, 2, 0.01), whitePrintMat);
    m1Plate.position.set(0.58, frameY + 0.08, 0);
    baseAxis1MechGroup.add(m1Plate);

    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([bx, bz]) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), chromeSteelMat);
      screw.position.set(0.58 + bx, frameY + 0.115, bz);
      baseAxis1MechGroup.add(screw);
    });

    const nema1 = createDetailedNema17();
    nema1.position.set(0.58, frameY - 0.12, 0);
    baseAxis1MechGroup.add(nema1);

    const pulley1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.11, 24), aluFrameMat);
    pulley1.position.set(0.58, frameY + 0.18, 0);
    baseAxis1MechGroup.add(pulley1);

    const belt1Front = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.018), rubberBeltMat);
    belt1Front.position.set(0.29, frameY + 0.19, 0.12);
    belt1Front.rotation.y = 0.12;
    baseAxis1MechGroup.add(belt1Front);

    const belt1Back = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.018), rubberBeltMat);
    belt1Back.position.set(0.29, frameY + 0.19, -0.12);
    belt1Back.rotation.y = -0.12;
    baseAxis1MechGroup.add(belt1Back);

    const enc1Plate = new THREE.Mesh(new RoundedBoxGeometry(0.40, 0.06, 0.38, 2, 0.01), whitePrintMat);
    enc1Plate.position.set(-0.56, frameY + 0.08, 0);
    baseAxis1MechGroup.add(enc1Plate);

    const enc1Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 28), matteBlackPrintMat);
    enc1Housing.position.set(-0.56, frameY - 0.08, 0);
    baseAxis1MechGroup.add(enc1Housing);

    const enc1Pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.09, 20), whitePrintMat);
    enc1Pulley.position.set(-0.56, frameY + 0.16, 0);
    baseAxis1MechGroup.add(enc1Pulley);

    const belt1Enc = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.045, 0.016), rubberBeltMat);
    belt1Enc.position.set(-0.28, frameY + 0.17, 0.08);
    baseAxis1MechGroup.add(belt1Enc);

    const sw1Body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.04), matteBlackPrintMat);
    sw1Body.position.set(-0.42, frameY + 0.13, 0.16);
    baseAxis1MechGroup.add(sw1Body);
    const sw1Lever = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.025), chromeSteelMat);
    sw1Lever.position.set(-0.39, frameY + 0.15, 0.14);
    sw1Lever.rotation.y = -0.35;
    baseAxis1MechGroup.add(sw1Lever);
    const sw1LedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sw1Led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), sw1LedMat);
    sw1Led.position.set(-0.42, frameY + 0.165, 0.16);
    baseAxis1MechGroup.add(sw1Led);

    // Nhóm xoay Phương vị Trục 1
    const azimuthGroup = new THREE.Group();
    azimuthGroup.position.set(trackerX, frameY + 0.34, 0);
    trackerRootGroup.add(azimuthGroup);

    const hubUpperCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.15, 40), matteBlackPrintMat);
    hubUpperCylinder.position.set(0, 0.075, 0);
    hubUpperCylinder.castShadow = true;
    azimuthGroup.add(hubUpperCylinder);

    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), chromeSteelMat);
      bolt.position.set(Math.cos(ang) * 0.25, 0.155, Math.sin(ang) * 0.25);
      azimuthGroup.add(bolt);
    }

    const colHeight = 1.68;
    addVSlotBar(azimuthGroup, 0.115, colHeight, 0.115, -0.058, 0.15 + colHeight / 2, 0);
    addVSlotBar(azimuthGroup, 0.115, colHeight, 0.115, 0.058, 0.15 + colHeight / 2, 0);

    const midY = 1.12;
    const m2Plate = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.34, 0.06, 2, 0.01), whitePrintMat);
    m2Plate.position.set(-0.22, midY, 0.09);
    m2Plate.castShadow = true;
    azimuthGroup.add(m2Plate);

    [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(([sx, sy]) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.02, 10), chromeSteelMat);
      s.rotation.x = Math.PI / 2;
      s.position.set(-0.22 + sx, midY + sy, 0.122);
      azimuthGroup.add(s);
    });

    const m2PulleyPocket = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.07, 28), matteBlackPrintMat);
    m2PulleyPocket.rotation.x = Math.PI / 2;
    m2PulleyPocket.position.set(-0.22, midY, 0.10);
    azimuthGroup.add(m2PulleyPocket);

    const m2AluHub = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 20), chromeSteelMat);
    m2AluHub.rotation.x = Math.PI / 2;
    m2AluHub.position.set(-0.22, midY, 0.11);
    azimuthGroup.add(m2AluHub);

    const nema2 = createDetailedNema17();
    nema2.rotation.x = Math.PI / 2;
    nema2.position.set(-0.22, midY, -0.12);
    azimuthGroup.add(nema2);

    const enc2Mount = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.22, 0.18, 2, 0.01), whitePrintMat);
    enc2Mount.position.set(0.14, midY - 0.03, 0.08);
    azimuthGroup.add(enc2Mount);

    const tensionArm = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.045, 0.04, 2, 0.008), whitePrintMat);
    tensionArm.position.set(0.18, midY + 0.02, 0.185);
    tensionArm.rotation.z = 0.45;
    azimuthGroup.add(tensionArm);

    const sw2Body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.035), matteBlackPrintMat);
    sw2Body.position.set(0.30, midY - 0.11, 0.14);
    azimuthGroup.add(sw2Body);
    const sw2LedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sw2Led = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), sw2LedMat);
    sw2Led.position.set(0.32, midY - 0.11, 0.16);
    azimuthGroup.add(sw2Led);

    const topPivotY = 0.15 + colHeight;
    const topSaddleBlack = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.24, 0.32, 2, 0.015), matteBlackPrintMat);
    topSaddleBlack.position.set(0, topPivotY - 0.04, 0);
    azimuthGroup.add(topSaddleBlack);

    const upperDrivenPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 32), whitePrintMat);
    upperDrivenPulley.rotation.x = Math.PI / 2;
    upperDrivenPulley.position.set(0, topPivotY + 0.02, 0.16);
    azimuthGroup.add(upperDrivenPulley);

    const belt2Left = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.74, 0.042), rubberBeltMat);
    belt2Left.position.set(-0.15, (midY + topPivotY) / 2 + 0.02, 0.14);
    belt2Left.rotation.z = -0.28;
    azimuthGroup.add(belt2Left);

    const belt2Right = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.74, 0.042), rubberBeltMat);
    belt2Right.position.set(-0.05, (midY + topPivotY) / 2 + 0.02, 0.14);
    belt2Right.rotation.z = -0.26;
    azimuthGroup.add(belt2Right);

    // Nhóm nghiêng Độ ngửa Trục 2
    const elevationGroup = new THREE.Group();
    elevationGroup.position.set(0, topPivotY + 0.06, 0);
    elevationGroup.rotation.z = THREE.MathUtils.degToRad(30);
    azimuthGroup.add(elevationGroup);

    const pivotShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.48, 20), chromeSteelMat);
    pivotShaft.rotation.x = Math.PI / 2;
    pivotShaft.position.set(0, -0.04, 0);
    elevationGroup.add(pivotShaft);

    const tBracketGeom = createSculptedTBracketGeometry();
    const tBracketFront = new THREE.Mesh(tBracketGeom, whitePrintMat);
    tBracketFront.position.set(0, 0.04, 0.18);
    tBracketFront.castShadow = true;
    elevationGroup.add(tBracketFront);

    const tBracketBack = new THREE.Mesh(tBracketGeom, whitePrintMat);
    tBracketBack.position.set(0, 0.04, -0.235);
    tBracketBack.castShadow = true;
    elevationGroup.add(tBracketBack);

    const brgRight = createBallBearing(0.065, 0.035);
    brgRight.position.set(0.32, 0.03, 0.21);
    elevationGroup.add(brgRight);

    const brgCenter = createBallBearing(0.072, 0.04);
    brgCenter.position.set(0, -0.08, 0.21);
    elevationGroup.add(brgCenter);

    addVSlotBar(elevationGroup, 1.75, 0.075, 0.08, 0, 0.18, 0);

    const trackerPanel = createIndustrialSolarPanel(2.04, 1.56, true);
    trackerPanel.position.set(0, 0.245, 0);
    elevationGroup.add(trackerPanel);

    // =========================================================================
    // 3. CHÍNH GIỮA: HỘP ĐIỆN TRẮNG
    // =========================================================================
    const boxGroup = new THREE.Group();
    boxGroup.position.set(0.08, frameY + 0.04, 0.05);
    boxGroup.name = 'controlBox';
    scene.add(boxGroup);

    const boxW = 1.44;
    const boxH = 0.68;
    const boxD = 1.24;
    const wallT = 0.045;

    const boxFloor = new THREE.Mesh(new RoundedBoxGeometry(boxW, wallT, boxD, 2, 0.01), enclosureAbsMat);
    boxFloor.position.set(0, wallT / 2, 0);
    boxGroup.add(boxFloor);

    const wallFront = new THREE.Mesh(new RoundedBoxGeometry(boxW, boxH, wallT, 2, 0.01), enclosureAbsMat);
    wallFront.position.set(0, boxH / 2, boxD / 2 - wallT / 2);
    wallFront.castShadow = true;
    boxGroup.add(wallFront);

    const wallBack = new THREE.Mesh(new RoundedBoxGeometry(boxW, boxH, wallT, 2, 0.01), enclosureAbsMat);
    wallBack.position.set(0, boxH / 2, -boxD / 2 + wallT / 2);
    wallBack.castShadow = true;
    boxGroup.add(wallBack);

    const wallLeft = new THREE.Mesh(new RoundedBoxGeometry(wallT, boxH, boxD - wallT * 1.5, 2, 0.01), enclosureAbsMat);
    wallLeft.position.set(-boxW / 2 + wallT / 2, boxH / 2, 0);
    wallLeft.castShadow = true;
    boxGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(new RoundedBoxGeometry(wallT, boxH, boxD - wallT * 1.5, 2, 0.01), enclosureAbsMat);
    wallRight.position.set(boxW / 2 - wallT / 2, boxH / 2, 0);
    wallRight.castShadow = true;
    boxGroup.add(wallRight);

    const rimF = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.012, wallT * 0.7), matteBlackPrintMat);
    rimF.position.set(0, boxH + 0.005, boxD / 2 - wallT / 2);
    const rimB = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.012, wallT * 0.7), matteBlackPrintMat);
    rimB.position.set(0, boxH + 0.005, -boxD / 2 + wallT / 2);
    const rimL = new THREE.Mesh(new THREE.BoxGeometry(wallT * 0.7, 0.012, boxD), matteBlackPrintMat);
    rimL.position.set(-boxW / 2 + wallT / 2, boxH + 0.005, 0);
    const rimR = new THREE.Mesh(new THREE.BoxGeometry(wallT * 0.7, 0.012, boxD), matteBlackPrintMat);
    rimR.position.set(boxW / 2 - wallT / 2, boxH + 0.005, 0);
    boxGroup.add(rimF, rimB, rimL, rimR);

    [-0.38, 0.38].forEach((lx) => {
      const latchBase = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.22, 0.045, 2, 0.008), whitePrintMat);
      latchBase.position.set(lx, boxH - 0.11, boxD / 2 + 0.018);
      const latchClip = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.14, 0.03, 2, 0.005), aluFrameMat);
      latchClip.position.set(lx, boxH - 0.12, boxD / 2 + 0.032);
      boxGroup.add(latchBase, latchClip);
    });

    const smaNut = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 6), brassMat);
    smaNut.rotation.x = Math.PI / 2;
    smaNut.position.set(0.26, boxH * 0.46, boxD / 2 + 0.02);
    boxGroup.add(smaNut);

    const antKnuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.09, 16), matteBlackPrintMat);
    antKnuckle.rotation.x = Math.PI / 2;
    antKnuckle.position.set(0.26, boxH * 0.46, boxD / 2 + 0.055);
    boxGroup.add(antKnuckle);

    const antWhip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.032, 0.62, 16), matteBlackPrintMat);
    antWhip.position.set(0.32, boxH * 0.46 + 0.28, boxD / 2 + 0.085);
    antWhip.rotation.z = -0.18;
    antWhip.castShadow = true;
    boxGroup.add(antWhip);

    // Linh kiện bên trong hộp điện
    const pwmBody = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.26, 0.36, 2, 0.01), matteBlackPrintMat);
    pwmBody.position.set(-0.16, 0.22, -0.34);
    boxGroup.add(pwmBody);

    const pwmFace = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.24), pcbBlueMat);
    pwmFace.position.set(-0.16, 0.355, -0.34);
    boxGroup.add(pwmFace);

    const pwmSticker = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.022, 0.07), whitePrintMat);
    pwmSticker.position.set(-0.34, 0.358, -0.44);
    boxGroup.add(pwmSticker);

    const pwmLcd = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.024, 0.11),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.2, roughness: 0.2 })
    );
    pwmLcd.position.set(-0.16, 0.358, -0.33);
    boxGroup.add(pwmLcd);

    const perfBoard = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.03, 0.64, 2, 0.005), whitePrintMat);
    perfBoard.position.set(-0.32, 0.12, 0.18);
    boxGroup.add(perfBoard);

    const espBreakout = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.28), pcbGreenMat);
    espBreakout.position.set(-0.22, 0.16, 0.26);
    const espModule = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.18), matteBlackPrintMat);
    espModule.position.set(-0.22, 0.195, 0.26);
    const espShield = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.13), chromeSteelMat);
    espShield.position.set(-0.22, 0.218, 0.24);
    boxGroup.add(espBreakout, espModule, espShield);

    const ina1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.10), pcbBlueMat);
    ina1.position.set(-0.48, 0.155, 0.05);
    const ina2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.10), pcbBlueMat);
    ina2.position.set(-0.32, 0.155, 0.05);
    const rtcPcb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.12), pcbBlueMat);
    rtcPcb.position.set(-0.38, 0.155, -0.09);
    const cr2032 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.018, 20), chromeSteelMat);
    cr2032.position.set(-0.38, 0.18, -0.09);
    boxGroup.add(ina1, ina2, rtcPcb, cr2032);

    const fanFrame = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.12, 0.22, 2, 0.008), matteBlackPrintMat);
    fanFrame.position.set(-0.50, 0.18, 0.35);
    boxGroup.add(fanFrame);

    const fanBladesGroup = new THREE.Group();
    fanBladesGroup.position.set(-0.50, 0.245, 0.35);
    const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), matteBlackPrintMat);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.035), blackAnodizedMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.17), blackAnodizedMat);
    fanBladesGroup.add(fanHub, blade1, blade2);
    boxGroup.add(fanBladesGroup);

    [0.18, 0.48].forEach((dx) => {
      const drvBody = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.26, 0.64, 2, 0.01), blackAnodizedMat);
      drvBody.position.set(dx, 0.20, 0.16);
      const drvTerm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.055, 0.50), pcbGreenMat);
      drvTerm.position.set(dx - 0.08, 0.34, 0.16);
      boxGroup.add(drvBody, drvTerm);
    });

    const intWire1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.22, 0.20),
      new THREE.Vector3(-0.05, 0.42, 0.10),
      new THREE.Vector3(0.10, 0.36, 0.08)
    ]);
    boxGroup.add(new THREE.Mesh(new THREE.TubeGeometry(intWire1, 16, 0.01, 6, false), wireRedMat));

    const intWire2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.32, 0.22, 0.05),
      new THREE.Vector3(-0.10, 0.44, -0.08),
      new THREE.Vector3(0.39, 0.36, 0.18)
    ]);
    boxGroup.add(new THREE.Mesh(new THREE.TubeGeometry(intWire2, 16, 0.01, 6, false), wireBlueMat));

    const lidGroup = new THREE.Group();
    lidGroup.position.set(boxW / 2, boxH, 0);
    boxGroup.add(lidGroup);

    const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(boxW + 0.03, 0.065, boxD + 0.03, 2, 0.012), enclosureAbsMat);
    lidMesh.position.set(-boxW / 2, 0.032, 0);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // =========================================================================
    // 4. CỤM BÊN PHẢI: TẤM PIN CỐ ĐỊNH (XOAY DỌC & QUAY MẶT VỀ BÊN PHẢI +X = NAM 180°)
    // =========================================================================
    const staticRootGroup = new THREE.Group();
    staticRootGroup.name = 'staticSystem';
    scene.add(staticRootGroup);

    const staticX = 2.15;

    const staBase = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.12, 0.32, 2, 0.01), matteBlackPrintMat);
    staBase.position.set(staticX, frameY + 0.06, 0);
    staticRootGroup.add(staBase);

    const staColH = 1.65;
    addVSlotBar(staticRootGroup, 0.12, staColH, 0.12, staticX, frameY + 0.12 + staColH / 2, 0);

    const staTopGroup = new THREE.Group();
    staTopGroup.position.set(staticX, frameY + 0.12 + staColH, 0);
    staTopGroup.rotation.z = -THREE.MathUtils.degToRad(15);
    staticRootGroup.add(staTopGroup);

    const staBracket = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.09, 0.68, 2, 0.012), whitePrintMat);
    staBracket.position.set(0, 0.03, 0);
    staTopGroup.add(staBracket);

    const staticPanel = createIndustrialSolarPanel(2.04, 1.56, false);
    staticPanel.position.set(0, 0.10, 0);
    staTopGroup.add(staticPanel);

    // =========================================================================
    // 5. HỆ THỐNG DÂY CÁP, BÌNH ẮC QUY 12V VÀ DÒNG NĂNG LƯỢNG / TÍN HIỆU 3D
    // =========================================================================
    // Cụm Nguồn Tổ Ong 12V (SMPS 12V Honeycomb Power Supply) đặt ngay dưới hộp điện
    const psuTex = createHoneycombPsuTexture();
    const psuMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      map: psuTex,
      metalness: 0.78,
      roughness: 0.28
    });

    const psuGroup = new THREE.Group();
    psuGroup.position.set(0.08, 0.02, 0.05);
    scene.add(psuGroup);

    // Vỏ kim loại đục lỗ tổ ong của Nguồn 12V
    const psuBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.12, 0.22, 0.68, 2, 0.01),
      psuMat
    );
    psuBody.position.set(-0.06, 0.11, 0);
    psuBody.castShadow = true;
    psuBody.receiveShadow = true;
    psuGroup.add(psuBody);

    // Dãy domino đấu dây (Screw Terminal Block) ở đầu nguồn tổ ong + Đèn LED báo nguồn xanh lá
    const psuTermBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.62),
      matteBlackPrintMat
    );
    psuTermBase.position.set(0.54, 0.09, 0);
    psuGroup.add(psuTermBase);

    for (let t = -3; t <= 3; t++) {
      const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.025, 12),
        chromeSteelMat
      );
      screw.position.set(0.54, 0.175, t * 0.075);
      psuGroup.add(screw);
    }

    const psuLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    psuLed.position.set(0.45, 0.225, 0.24);
    psuGroup.add(psuLed);

    // Cụm Bình Ắc quy 12V đặt dọc (xoay 90 độ) bên cạnh/dưới tủ điện để nhận dòng sạc từ mạch sạc PWM
    const batteryGroup = new THREE.Group();
    batteryGroup.position.set(1.56, 0.02, -0.45);
    batteryGroup.rotation.y = Math.PI / 2;
    scene.add(batteryGroup);

    const batBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 0.48, 0.46, 2, 0.015),
      matteBlackPrintMat
    );
    batBody.position.set(0, 0.24, 0);
    batBody.castShadow = true;
    batteryGroup.add(batBody);

    const batCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.78, 0.06, 0.48, 2, 0.01),
      pcbBlueMat
    );
    batCap.position.set(0, 0.49, 0);
    batteryGroup.add(batCap);

    // Cọc dương (+) đỏ và Cọc âm (-) đen của Ắc quy
    const termPos = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 16), wireRedMat);
    termPos.position.set(-0.24, 0.54, 0.10);
    const termNeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 16), blackAnodizedMat);
    termNeg.position.set(0.24, 0.54, 0.10);
    batteryGroup.add(termPos, termNeg);

    // =========================================================================
    // 4b. TRẠM ĐO TỐC ĐỘ GIÓ ANEMOMETER (3 CHÉN QUAY)
    // Gắn trên thanh ray nhôm phía sau tủ điện và ắc quy (đúng hình thực tế)
    // =========================================================================
    const anemometerGroup = new THREE.Group();
    anemometerGroup.name = 'anemometer';
    const anemoX = 1.10;
    const anemoZ = -0.75;
    anemometerGroup.position.set(anemoX, 0, anemoZ);
    scene.add(anemometerGroup);

    // Vật liệu nhựa in 3D màu be/gỗ nhạt của cụm chén gió (đúng hình chụp thực tế)
    const anemoCupMat = new THREE.MeshStandardMaterial({
      color: 0xdfc299,
      roughness: 0.52,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    // 1. Gá đế kẹp vào thanh ray nhôm định hình
    const anemoMountBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.20, 0.18, 2, 0.012),
      whitePrintMat
    );
    anemoMountBase.position.set(0, frameY + 0.08, 0);
    anemometerGroup.add(anemoMountBase);

    // Bulong siết gá đế kẹp
    [-0.055, 0.055].forEach((bx) => {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.20, 12),
        chromeSteelMat
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, frameY + 0.08, 0);
      anemometerGroup.add(bolt);
    });

    // 2. Trụ đứng bằng ống nhôm tròn (vươn cao ngang mặt tấm pin)
    const poleH = 2.05;
    const anemoPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, poleH, 24),
      aluFrameMat
    );
    anemoPole.position.set(0, frameY + 0.16 + poleH / 2, 0);
    anemoPole.castShadow = true;
    anemometerGroup.add(anemoPole);

    // Vòng collar cố định đầu trên cột nhôm
    const topCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.046, 0.08, 24),
      aluFrameMat
    );
    topCollar.position.set(0, frameY + 0.16 + poleH, 0);
    anemometerGroup.add(topCollar);

    // 3. Thân cảm biến cố định (Housing chứa trục bạc đạn)
    const sensorBodyY = frameY + 0.16 + poleH + 0.06;
    const sensorBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.10, 24),
      anemoCupMat
    );
    sensorBody.position.set(0, sensorBodyY, 0);
    sensorBody.castShadow = true;
    anemometerGroup.add(sensorBody);

    // Cổ trục bạc đạn
    const rotorShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.05, 16),
      chromeSteelMat
    );
    rotorShaft.position.set(0, sensorBodyY + 0.065, 0);
    anemometerGroup.add(rotorShaft);

    // 4. CỤM ĐẦU XOAY 3 CHÉN ANEMOMETER (ROTOR CHUYỂN ĐỘNG TRÒN)
    const anemometerRotorGroup = new THREE.Group();
    anemometerRotorGroup.position.set(0, sensorBodyY + 0.085, 0);
    anemometerGroup.add(anemometerRotorGroup);

    // Nắp chụp tâm đầu xoay (Hub cap)
    const hubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.045, 24),
      anemoCupMat
    );
    const hubTopSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      anemoCupMat
    );
    hubTopSphere.position.y = 0.0225;
    anemometerRotorGroup.add(hubCap, hubTopSphere);

    // 3 Cánh tay đòn gắn 3 chén hứng gió hình bán cầu (120 độ đều nhau)
    const armLength = 0.25;
    const cupRadius = 0.082;

    for (let c = 0; c < 3; c++) {
      const angle = (c * 2 * Math.PI) / 3;
      const armGroup = new THREE.Group();
      armGroup.rotation.y = angle;

      // Cánh tay đòn tròn vươn ra ngoài
      const armRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, armLength, 12),
        anemoCupMat
      );
      armRod.rotation.z = Math.PI / 2;
      armRod.position.set(armLength / 2, 0, 0);
      armRod.castShadow = true;
      armGroup.add(armRod);

      // Chén hứng gió hình bán cầu rỗng (Hemisphere Cup)
      const cupGeom = new THREE.SphereGeometry(
        cupRadius,
        24,
        18,
        0,
        Math.PI,
        0,
        Math.PI
      );
      const cupMesh = new THREE.Mesh(cupGeom, anemoCupMat);
      cupMesh.position.set(armLength, 0, 0);
      cupMesh.rotation.y = Math.PI / 2;
      cupMesh.castShadow = true;
      armGroup.add(cupMesh);

      anemometerRotorGroup.add(armGroup);
    }

    // 5. Dây cáp tín hiệu màu đen chạy dọc thân cột xuống tủ điện điều khiển
    const anemoWirePoints = [
      new THREE.Vector3(0, sensorBodyY - 0.04, 0.04),
      new THREE.Vector3(0, frameY + 0.25, 0.04),
      new THREE.Vector3(0, frameY + 0.06, 0.04),
      new THREE.Vector3(-0.45, frameY + 0.04, 0.12),
      new THREE.Vector3(-0.85, frameY + 0.12, 0.35)
    ];
    const anemoWireCurve = new THREE.CatmullRomCurve3(anemoWirePoints);
    const anemoWireTube = new THREE.Mesh(
      new THREE.TubeGeometry(anemoWireCurve, 32, 0.012, 8, false),
      matteBlackPrintMat
    );
    anemometerGroup.add(anemoWireTube);

    // Hàm tạo đường cáp kèm hạt xung năng lượng chạy dọc theo chiều dài dây
    const flowSystems = [];
    const createAnimatedFlowPath = (parent, points, wireColorHex, pulseColorHex, wireRadius, pulseCount, baseSpeed, flowType) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const wireMat = new THREE.MeshStandardMaterial({
        color: wireColorHex,
        roughness: 0.45,
        metalness: 0.15
      });
      const tubeMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, wireRadius, 8, false), wireMat);
      parent.add(tubeMesh);

      const pulses = [];
      const pulseGeom = new THREE.SphereGeometry(wireRadius * 2.25, 12, 12);
      for (let i = 0; i < pulseCount; i++) {
        const pulseMat = new THREE.MeshBasicMaterial({
          color: pulseColorHex,
          transparent: true,
          opacity: 0.9
        });
        const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
        parent.add(pulseMesh);
        pulses.push({
          mesh: pulseMesh,
          mat: pulseMat,
          offset: i / pulseCount
        });
      }

      flowSystems.push({
        curve,
        pulses,
        baseSpeed,
        flowType
      });
    };

    // --- A. ĐƯỜNG NĂNG LƯỢNG MẶT TRỜI (CƯỜNG ĐỘ PHỤ THUỘC CÔNG SUẤT INA226, BAN ĐÊM = 0W SẼ TẮT) ---
    // A1. Năng lượng DC từ Tấm pin Tracker (2 dây Dương Đỏ + / Âm Đen -) -> Cảm biến INA226 (#1) trong tủ điện
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-2.05, frameY + 1.85, -0.05),
        new THREE.Vector3(-1.95, frameY + 1.15, -0.08),
        new THREE.Vector3(-1.75, frameY + 0.35, -0.18),
        new THREE.Vector3(-1.25, frameY + 0.12, -0.25),
        new THREE.Vector3(-0.40, frameY + 0.20, 0.10) // Dây (+) tới INA226 Tracker
      ],
      0xb91c1c, // Dây Dương (+) màu đỏ
      0x38bdf8,
      0.012,
      5,
      0.32,
      'solar_tracker'
    );

    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-0.40, frameY + 0.18, 0.06), // Dây Âm (-) từ mass tủ điện về Tấm Tracker
        new THREE.Vector3(-1.25, frameY + 0.10, -0.28),
        new THREE.Vector3(-1.75, frameY + 0.33, -0.21),
        new THREE.Vector3(-1.95, frameY + 1.13, -0.11),
        new THREE.Vector3(-2.05, frameY + 1.83, -0.08)
      ],
      0x1e293b, // Dây Âm (-) màu đen
      0x38bdf8,
      0.012,
      4,
      0.32,
      'solar_tracker'
    );

    // A2. Năng lượng DC từ Tấm pin Cố định (2 dây Dương Đỏ + / Âm Đen -) -> Cảm biến INA226 (#2) trong tủ điện
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(2.15, frameY + 1.65, -0.05),
        new THREE.Vector3(2.08, frameY + 0.45, -0.08),
        new THREE.Vector3(1.45, frameY + 0.12, -0.12),
        new THREE.Vector3(0.78, frameY + 0.22, -0.14),
        new THREE.Vector3(-0.24, frameY + 0.20, 0.10) // Dây (+) tới INA226 Static
      ],
      0xb91c1c, // Dây Dương (+) màu đỏ
      0xfbbf24,
      0.012,
      5,
      0.32,
      'solar_static'
    );

    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-0.24, frameY + 0.18, 0.06), // Dây Âm (-) từ mass tủ điện về Tấm Cố định
        new THREE.Vector3(0.78, frameY + 0.20, -0.17),
        new THREE.Vector3(1.45, frameY + 0.10, -0.15),
        new THREE.Vector3(2.08, frameY + 0.43, -0.11),
        new THREE.Vector3(2.15, frameY + 1.63, -0.08)
      ],
      0x1e293b, // Dây Âm (-) màu đen
      0xfbbf24,
      0.012,
      4,
      0.32,
      'solar_static'
    );

    // A3. Từ 2 cảm biến INA226 -> Bộ điều khiển sạc Solar PWM (trong hộp điện)
    createAnimatedFlowPath(
      boxGroup,
      [
        new THREE.Vector3(-0.48, 0.17, 0.05),
        new THREE.Vector3(-0.42, 0.28, -0.14),
        new THREE.Vector3(-0.32, 0.35, -0.28)
      ],
      0xdc2626,
      0x38bdf8,
      0.009,
      3,
      0.42,
      'solar_tracker'
    );

    createAnimatedFlowPath(
      boxGroup,
      [
        new THREE.Vector3(-0.32, 0.17, 0.05),
        new THREE.Vector3(-0.22, 0.28, -0.14),
        new THREE.Vector3(-0.14, 0.35, -0.28)
      ],
      0xd97706,
      0xfbbf24,
      0.009,
      3,
      0.42,
      'solar_static'
    );

    // A4. Mạch kín 2 dây (Dương Đỏ + và Âm Đen -) giữa Mạch sạc Solar PWM và Bình Ắc quy 12V:
    // - Ban ngày (INA226 > 0.05W): Mạch PWM nạp điện ra Cọc (+) Ắc quy và khép mạch qua Cọc (-)
    // - Ban đêm (INA226 = 0W): Cọc (+) Ắc quy cấp điện ngược vào Mạch PWM để nuôi hệ thống ESP32 & Driver, khép mạch về Cọc (-)
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(0.08, frameY + 0.36, -0.26), // Cổng BATT (+) của mạch sạc Solar PWM
        new THREE.Vector3(0.88, frameY + 0.30, -0.22),
        new THREE.Vector3(1.66, 0.56, -0.21)           // Cọc Dương (+) màu đỏ của Bình Ắc quy 12V
      ],
      0xdc2626, // Dây Dương (+) màu đỏ
      0x22c55e,
      0.013,
      4,
      0.36,
      'battery_pos'
    );

    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(1.66, 0.56, -0.69),          // Cọc Âm (-) màu đen của Bình Ắc quy 12V
        new THREE.Vector3(0.88, frameY + 0.28, -0.62),
        new THREE.Vector3(0.16, frameY + 0.34, -0.32)  // Cổng BATT (-) / GND của mạch sạc Solar PWM
      ],
      0x18181b, // Dây Âm (-) màu đen nối vào cọc đen ắc quy
      0x38bdf8,
      0.013,
      4,
      0.36,
      'battery_neg'
    );

    // --- B. TƯƠNG TÁC NỘI BỘ TRONG TỦ ĐIỆN & NGUỒN TỔ ONG 12V DƯỚI HỘP ĐIỆN ---
    // B0. Mạch 2 dây (Dương Đỏ V+ và Âm Đen V-) từ Nguồn Tổ Ong 12V dưới gầm -> Cấp lên hộp điện (nuôi Driver & Hệ thống)
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(0.62, 0.19, 0.16),            // Cọc V+ trên domino Nguồn tổ ong 12V
        new THREE.Vector3(0.68, frameY + 0.02, 0.22),
        new THREE.Vector3(0.42, frameY + 0.28, 0.22)    // Lên cụm Driver & mạch nguồn trong hộp điện
      ],
      0xdc2626, // Dây Dương (+) màu đỏ từ nguồn tổ ong 12V
      0xf43f5e,
      0.011,
      3,
      0.34,
      'internal_power'
    );

    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(0.42, frameY + 0.26, 0.14),   // Từ mass chung trong hộp điện
        new THREE.Vector3(0.68, frameY + 0.01, 0.08),
        new THREE.Vector3(0.62, 0.19, 0.04)             // Về cọc V- (COM) trên domino Nguồn tổ ong 12V
      ],
      0x18181b, // Dây Âm (-) màu đen về nguồn tổ ong 12V
      0x38bdf8,
      0.011,
      3,
      0.34,
      'internal_power'
    );

    // B1. Cấp nguồn từ Bình Ắc quy / Mạch PWM -> ESP32-S3 & 2 Driver Động cơ Stepper
    createAnimatedFlowPath(
      boxGroup,
      [
        new THREE.Vector3(-0.04, 0.34, -0.24),
        new THREE.Vector3(-0.15, 0.26, 0.02),
        new THREE.Vector3(-0.22, 0.20, 0.24)
      ],
      0xb91c1c,
      0xf43f5e,
      0.008,
      3,
      0.28,
      'internal_power'
    );

    // B2. Giao tiếp I2C: Cảm biến INA226 & Đồng hồ thời gian thực DS3231 RTC -> Vi điều khiển ESP32-S3
    createAnimatedFlowPath(
      boxGroup,
      [
        new THREE.Vector3(-0.48, 0.17, 0.05),
        new THREE.Vector3(-0.38, 0.22, -0.09), // Qua DS3231 RTC
        new THREE.Vector3(-0.32, 0.22, 0.05),  // Qua INA226 #2
        new THREE.Vector3(-0.22, 0.21, 0.24)   // Về ESP32-S3
      ],
      0x0284c7,
      0x38bdf8,
      0.007,
      3,
      0.45,
      'signal_i2c'
    );

    // B3. Xung điều khiển Step/Dir từ ESP32-S3 -> 2 bộ Driver TB6600 trong tủ điện
    createAnimatedFlowPath(
      boxGroup,
      [
        new THREE.Vector3(-0.22, 0.22, 0.20),
        new THREE.Vector3(-0.05, 0.40, 0.12),
        new THREE.Vector3(0.10, 0.35, 0.12),
        new THREE.Vector3(0.40, 0.35, 0.16)
      ],
      0x2563eb,
      0x60a5fa,
      0.008,
      3,
      0.40,
      'motor_drive'
    );

    // --- C. ĐƯỜNG CẤP XUNG ĐỘNG CƠ & PHẢN HỒI ENCODER / CÔNG TẮC HÀNH TRÌNH NGOÀI CƠ KHÍ ---
    // C1. Từ Driver trong tủ điện -> Động cơ bước NEMA 17 Trục 1 (Phương vị) & Trục 2 (Độ ngửa)
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(0.32, frameY + 0.35, 0.18), // Từ cụm Driver trong tủ điện
        new THREE.Vector3(-0.68, frameY + 0.18, 0.16),
        new THREE.Vector3(-1.45, frameY + 0.10, 0.35),
        new THREE.Vector3(-2.05, frameY + 0.12, 0.58) // Tới Motor NEMA 17 Trục 1
      ],
      0x1e293b,
      0xf97316, // Cam sáng cho xung lực cấp ra Động cơ
      0.011,
      4,
      0.38,
      'motor_drive'
    );

    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-1.45, frameY + 0.10, 0.35),
        new THREE.Vector3(-1.95, frameY + 0.55, 0.12),
        new THREE.Vector3(-2.22, frameY + 1.42, -0.05) // Lên Motor NEMA 17 Trục 2 trên trụ đứng
      ],
      0x1e293b,
      0xf97316,
      0.010,
      3,
      0.38,
      'motor_drive'
    );

    // C2. Phản hồi xung từ Encoder 1 & Encoder 2 -> Quay về ESP32-S3 trong tủ điện
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-2.05, frameY + 0.12, -0.56), // Từ Encoder 1 (đầu kia thanh đỡ dọc)
        new THREE.Vector3(-1.55, frameY + 0.10, -0.42),
        new THREE.Vector3(-0.85, frameY + 0.15, -0.12),
        new THREE.Vector3(-0.14, frameY + 0.24, 0.28) // Về chân ngắt ESP32-S3
      ],
      0x0f172a,
      0xa855f7, // Tím sáng cho xung phản hồi Encoder
      0.009,
      4,
      0.44,
      'feedback_encoder'
    );

    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-1.90, frameY + 1.42, 0.12), // Từ cụm Encoder 2 trên trụ
        new THREE.Vector3(-1.75, frameY + 0.52, -0.08),
        new THREE.Vector3(-0.85, frameY + 0.15, -0.12),
        new THREE.Vector3(-0.14, frameY + 0.24, 0.28) // Về chân ngắt ESP32-S3
      ],
      0x0f172a,
      0xa855f7,
      0.009,
      3,
      0.44,
      'feedback_encoder'
    );

    // C3. Tín hiệu từ Công tắc hành trình (SW1, SW2) & 4 Cảm biến ánh sáng TEMT6000 -> Về ESP32-S3
    createAnimatedFlowPath(
      scene,
      [
        new THREE.Vector3(-1.89, frameY + 0.16, -0.42), // Từ Công tắc hành trình SW1
        new THREE.Vector3(-1.75, frameY + 1.35, 0.16),  // Qua Công tắc hành trình SW2
        new THREE.Vector3(-1.15, frameY + 0.22, 0.22),
        new THREE.Vector3(-0.14, frameY + 0.23, 0.31)   // Về ESP32-S3
      ],
      0x064e3b,
      0x10b981, // Xanh ngọc cho tín hiệu Công tắc hành trình & Cảm biến về ESP32
      0.009,
      4,
      0.40,
      'feedback_switch'
    );

    sceneObjectsRef.current = {
      azimuthGroup,
      elevationGroup,
      lidGroup,
      fanBladesGroup,
      sunGroup,
      sunRayLine,
      sw1LedMat,
      sw2LedMat,
      camera,
      controls,
      scene
    };

    // =========================================================================
    // 6. TƯƠNG TÁC: NHẤN VÀO ĐÂU ZOOM VÀO ĐÓ — CUỘN CHUỘT ĐỂ ZOOM TRỞ LẠI
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 1. Nhấn vào Tấm Tracker -> Zoom cận cảnh vào Tấm Tracker & Hiện bảng thông số Tracker
      if (raycaster.intersectObjects(trackerRootGroup.children, true).length > 0) {
        setSelectedPanel('tracker');
        targetAnglesRef.current.camTargetPos = new THREE.Vector3(-2.05, 2.55, 3.45);
        targetAnglesRef.current.camLookAt = new THREE.Vector3(-2.05, 1.55, 0);
        return;
      }

      // 2. Nhấn vào Tấm Cố định -> Zoom cận cảnh vào Tấm Cố định & Hiện bảng thông số Cố định
      if (raycaster.intersectObjects(staticRootGroup.children, true).length > 0) {
        setSelectedPanel('static');
        targetAnglesRef.current.camTargetPos = new THREE.Vector3(2.15, 2.55, 3.45);
        targetAnglesRef.current.camLookAt = new THREE.Vector3(2.15, 1.55, 0);
        return;
      }

      // 3. Nhấn vào Hộp điện, Nguồn tổ ong 12V hoặc Bình Ắc quy -> Mở nắp hộp, Zoom vào bên trong Hộp điện & Hiện thông số Hộp điện
      if (
        raycaster.intersectObjects(boxGroup.children, true).length > 0 ||
        raycaster.intersectObjects(psuGroup.children, true).length > 0 ||
        raycaster.intersectObjects(batteryGroup.children, true).length > 0
      ) {
        setIsBoxOpen(true);
        setSelectedPanel('box');
        targetAnglesRef.current.camTargetPos = new THREE.Vector3(0.28, 3.25, 1.85);
        targetAnglesRef.current.camLookAt = new THREE.Vector3(0.25, 0.45, -0.05);
        return;
      }

      // 4. Nhấn vào Trạm gió Anemometer -> Zoom cận cảnh vào Anemometer & Hiện thông số gió
      if (raycaster.intersectObjects(anemometerGroup.children, true).length > 0) {
        setSelectedPanel('anemometer');
        targetAnglesRef.current.camTargetPos = new THREE.Vector3(anemoX + 0.45, 2.70, anemoZ + 1.85);
        targetAnglesRef.current.camLookAt = new THREE.Vector3(anemoX, 2.45, anemoZ);
        return;
      }

      // 5. Nhấn vào Mặt trời NOAA -> Zoom nhìn Mặt trời & Hiện thông số NOAA
      if (raycaster.intersectObjects(sunGroup.children, true).length > 0) {
        setSelectedPanel('sun');
        targetAnglesRef.current.camTargetPos = new THREE.Vector3(0, 4.5, 8.6);
        targetAnglesRef.current.camLookAt = new THREE.Vector3(0, 1.8, 0);
        return;
      }

      // 6. Nhấn ra ngoài khoảng trống -> Thu phóng trở lại toàn cảnh & Đóng bảng thông số
      setSelectedPanel(null);
      setIsBoxOpen(false);
      targetAnglesRef.current.camTargetPos = DEFAULT_CAM_POS.clone();
      targetAnglesRef.current.camLookAt = DEFAULT_LOOK_AT.clone();
    };

    // Khi người dùng lăn chuột xuống (deltaY > 0):
    // - Nếu đang focus vào tấm pin / hộp điện / mặt trời -> Lập tức tự động thoát zoom mượt về toàn cảnh, đóng nắp hộp điện và tắt bảng thông số
    // - Nếu đang ở toàn cảnh -> Lăn chuột thu phóng tự do theo OrbitControls
    const handleWheel = (e) => {
      if (e.deltaY > 0) {
        if (targetAnglesRef.current.focusedPanel) {
          e.preventDefault();
          e.stopPropagation();
          targetAnglesRef.current.focusedPanel = null;
          setSelectedPanel(null);
          setIsBoxOpen(false);
          targetAnglesRef.current.camTargetPos = DEFAULT_CAM_POS.clone();
          targetAnglesRef.current.camLookAt = DEFAULT_LOOK_AT.clone();
          return;
        }
        targetAnglesRef.current.camTargetPos = null;
        targetAnglesRef.current.camLookAt = DEFAULT_LOOK_AT.clone();
      } else {
        // Nếu người dùng tự cuộn zoom in bằng chuột thì dừng nội suy preset để nhường quyền cho con lăn
        targetAnglesRef.current.camTargetPos = null;
        targetAnglesRef.current.camLookAt = null;
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    // Vòng lặp Render 3D
    let animId;
    let lastTime = performance.now();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const { phiRad, tiltRad, lidRad, camTargetPos, camLookAt, trkPower, staPower } = targetAnglesRef.current;

      azimuthGroup.rotation.y += (phiRad - azimuthGroup.rotation.y) * 0.1;
      elevationGroup.rotation.z += (tiltRad - elevationGroup.rotation.z) * 0.1;
      lidGroup.rotation.z += (-lidRad - lidGroup.rotation.z) * 0.12;
      fanBladesGroup.rotation.y += 0.14;
      anemometerRotorGroup.rotation.y += 0.035;

      // Cập nhật dòng chảy năng lượng mặt trời (phụ thuộc số đọc INA226) và dòng tín hiệu điều khiển
      const totalSolarPower = (trkPower || 0) + (staPower || 0);
      flowSystems.forEach((sys) => {
        let active = true;
        let speedScale = 1.0;
        let opacity = 0.88;
        let radiusScale = 1.0;
        let dirSign = 1;

        if (sys.flowType === 'solar_tracker') {
          if (trkPower <= 0.05) {
            active = false;
          } else {
            const norm = Math.min(trkPower / 25.0, 1.5);
            speedScale = 0.45 + norm * 1.35;
            opacity = Math.min(1.0, 0.4 + norm * 0.6);
            radiusScale = 0.8 + norm * 0.45;
          }
        } else if (sys.flowType === 'solar_static') {
          if (staPower <= 0.05) {
            active = false;
          } else {
            const norm = Math.min(staPower / 25.0, 1.5);
            speedScale = 0.45 + norm * 1.35;
            opacity = Math.min(1.0, 0.4 + norm * 0.6);
            radiusScale = 0.8 + norm * 0.45;
          }
        } else if (sys.flowType === 'battery_pos' || sys.flowType === 'battery_neg') {
          // Logic mạch kín 2 dây của Bình Ắc quy:
          // - Ban ngày (totalSolarPower > 0.05W): Mạch PWM nạp điện vào cọc (+) ắc quy, khép mạch về từ cọc (-)
          // - Ban đêm (totalSolarPower <= 0.05W): Ắc quy xả dòng nuôi hệ thống (chạy ngược từ cọc (+) vào tủ điện, khép mạch về cọc (-))
          if (totalSolarPower > 0.05) {
            const norm = Math.min(totalSolarPower / 45.0, 1.5);
            speedScale = 0.45 + norm * 1.4;
            opacity = Math.min(1.0, 0.45 + norm * 0.55);
            radiusScale = 0.85 + norm * 0.5;
            dirSign = 1; // Chiều nạp vào ắc quy
          } else {
            speedScale = 0.45;
            opacity = 0.72;
            radiusScale = 0.78;
            dirSign = -1; // Chiều ắc quy xả nguồn nuôi tủ điện ban đêm
          }
        }

        sys.pulses.forEach((p) => {
          p.mesh.visible = active;
          if (active) {
            p.offset = (p.offset + dirSign * dt * sys.baseSpeed * speedScale + 1.0) % 1.0;
            const pos = sys.curve.getPointAt(p.offset);
            p.mesh.position.copy(pos);
            p.mesh.scale.setScalar(radiusScale);
            p.mat.opacity = opacity;
          }
        });
      });

      if (camTargetPos) {
        camera.position.lerp(camTargetPos, 0.08);
        if (camera.position.distanceTo(camTargetPos) < 0.05) {
          targetAnglesRef.current.camTargetPos = null;
        }
      }
      if (camLookAt) {
        controls.target.lerp(camLookAt, 0.08);
        if (controls.target.distanceTo(camLookAt) < 0.03) {
          targetAnglesRef.current.camLookAt = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight - 110;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel, { capture: true });
      cancelAnimationFrame(animId);
      pmremGenerator.dispose();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className="relative w-full h-[calc(100vh-115px)] min-h-[540px] select-none overflow-hidden"
      onWheel={(e) => {
        if (e.deltaY > 0 && selectedPanel) {
          zoomBackToOverview();
        }
      }}
    >
      {/* KHUNG CANVAS 3D TRONG SUỐT HIỂN THỊ TRỰC TIẾP TRÊN NỀN THỜI TIẾT */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* BẢNG THÔNG SỐ NỔI KHI NHẤN VÀO TẤM PIN / HỘP ĐIỆN / MẶT TRỜI NOAA */}
      {selectedPanel && (
        <div className="absolute top-4 right-4 z-20 w-[92%] sm:w-[410px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-zinc-300 dark:border-slate-700 rounded-sm shadow-2xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
              {selectedPanel === 'tracker'
                ? 'Tấm tracker (Trục kép)'
                : selectedPanel === 'static'
                ? 'Tấm cố định (Nam, ngửa 75°)'
                : selectedPanel === 'box'
                ? 'Hộp điện điều khiển trung tâm'
                : selectedPanel === 'anemometer'
                ? 'Trạm cảm biến gió Anemometer (3 chén)'
                : 'Vị trí Mặt trời thiên văn NOAA'}
            </h3>
            <button
              onClick={zoomBackToOverview}
              className="px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-slate-800 border border-zinc-300 dark:border-slate-700 rounded-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>

          {selectedPanel === 'tracker' && (
            <table className="lab-table text-xs sm:text-sm">
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-slate-800/90">
                  <th className="text-left font-bold py-2 px-2.5 text-zinc-900 dark:text-white">Thông số đo đạc</th>
                  <th className="text-left font-bold py-2 px-2.5 text-blue-700 dark:text-sky-300">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${trkBadge.dotColor}`} />
                      <span>Giá trị thực tế</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Công suất tức thời (P)</td>
                  <td className="py-2 px-2.5 font-bold text-base text-blue-700 dark:text-sky-300">
                    {formatValueOrDash(tracking.power, 1, 'W')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Điện áp (V)</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {formatValueOrDash(tracking.voltage, 2, 'V')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Dòng điện (I)</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {formatValueOrDash(tracking.current, 2, 'A')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Năng lượng hôm nay (ΣE)</td>
                  <td className="py-2 px-2.5 font-bold text-blue-700 dark:text-sky-300">
                    {formatValueOrDash(tracking.energyWh, 1, 'Wh')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Góc định hướng hiện tại</td>
                  <td className="py-2 px-2.5 text-zinc-800 dark:text-slate-100">
                    <div>
                      <span>Quay φ: </span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {formatSignedNumber(livePhi, 1, '°')}
                      </span>
                      <span className="mx-1.5 text-zinc-400">|</span>
                      <span>Ngửa ε: </span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {formatValueOrDash(liveEps, 1, '°')}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                      {compassAzimuth !== null
                        ? `Phương vị: ${formatSignedNumber(compassAzimuth, 1, '°')} (${getCompassDirectionName(compassAzimuth)})`
                        : '(Zenith nằm ngang = 50°, CTHT = 90°)'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Góc Mặt trời NOAA</td>
                  <td className="py-2 px-2.5 font-semibold text-amber-700 dark:text-amber-300">
                    Az: {formatValueOrDash(noaaSun.azimuthDeg, 1, '°')} | El: {formatSignedNumber(noaaSun.elevationDeg, 1, '°')}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {selectedPanel === 'static' && (
            <table className="lab-table text-xs sm:text-sm">
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-slate-800/90">
                  <th className="text-left font-bold py-2 px-2.5 text-zinc-900 dark:text-white">Thông số đo đạc</th>
                  <th className="text-left font-bold py-2 px-2.5 text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${staBadge.dotColor}`} />
                      <span>Giá trị thực tế</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Công suất tức thời (P)</td>
                  <td className="py-2 px-2.5 font-bold text-base text-amber-800 dark:text-amber-300">
                    {formatValueOrDash(stat.power, 1, 'W')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Điện áp (V)</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {formatValueOrDash(stat.voltage, 2, 'V')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Dòng điện (I)</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {formatValueOrDash(stat.current, 2, 'A')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Năng lượng hôm nay (ΣE)</td>
                  <td className="py-2 px-2.5 font-bold text-amber-800 dark:text-amber-300">
                    {formatValueOrDash(stat.energyWh, 1, 'Wh')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Góc định hướng cố định</td>
                  <td className="py-2 px-2.5 text-zinc-800 dark:text-slate-100">
                    <div className="font-semibold text-zinc-900 dark:text-white">Hướng Nam 180°, ngửa 75°</div>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                      (Nghiêng cố định 15° về hướng Nam / Phải)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {selectedPanel === 'box' && (
            <table className="lab-table text-xs sm:text-sm">
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Trạng thái vận hành</td>
                  <td className="py-2 px-2.5 font-bold text-zinc-900 dark:text-white">
                    {system?.displayState || 'Bình thường'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Mạch Ắc quy 12V (2 dây + / -)</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {(Number(tracking.power) || 0) + (Number(stat.power) || 0) > 0.05
                      ? `Đang nạp vào Ắc quy (${formatValueOrDash((Number(tracking.power) || 0) + (Number(stat.power) || 0), 1, 'W')})`
                      : 'Xả nguồn 12V nuôi tủ điện (Ban đêm 0,0 W)'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Luồng tín hiệu nội bộ</td>
                  <td className="py-2 px-2.5 text-zinc-800 dark:text-slate-100 text-xs">
                    <div>I2C (INA226 + DS3231) → ESP32-S3 → Driver Stepper</div>
                    <div className="text-zinc-500 dark:text-slate-400 mt-0.5">
                      Phản hồi: Encoder 1/2 + Công tắc hành trình SW1/SW2 → ESP32
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Nhiệt độ hộp điện (RTC)</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {system?.rtcTemp !== null && system?.rtcTemp !== undefined
                      ? `${Number(system.rtcTemp).toFixed(1).replace('.', ',')} °C`
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Độ lệch đồng hồ RTC</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    {system?.rtcOffsetMs !== null && system?.rtcOffsetMs !== undefined
                      ? formatSignedNumber(system.rtcOffsetMs, 0, 'ms')
                      : '--'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {selectedPanel === 'anemometer' && (
            <table className="lab-table text-xs sm:text-sm">
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Loại cảm biến</td>
                  <td className="py-2 px-2.5 font-bold text-zinc-900 dark:text-white">Anemometer 3 chén quay</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Vị trí lắp đặt</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">Cột nhôm độc lập phía sau khung</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Tốc độ gió hiện tại</td>
                  <td className="py-2 px-2.5 font-bold text-base text-blue-600 dark:text-sky-400 font-sans tabular-nums">
                    {weatherData?.current?.windSpeed !== undefined ? `${weatherData.current.windSpeed} km/h` : '8,5 km/h'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Chế độ an toàn gió bão</td>
                  <td className="py-2 px-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    Bình thường (Safe Mode: TẮT)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Ngưỡng tự động kích hoạt</td>
                  <td className="py-2 px-2.5 font-semibold text-amber-600 dark:text-amber-400 font-sans tabular-nums">
                    &gt; 45,0 km/h (Cấp 6)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Cơ chế bảo vệ (Stow)</td>
                  <td className="py-2 px-2.5 font-medium text-zinc-800 dark:text-slate-200 text-xs">
                    Tự động hạ góc ngửa về phẳng 0° để triệt tiêu tải trọng gió bão
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {selectedPanel === 'sun' && (
            <table className="lab-table text-xs sm:text-sm">
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Phương vị Mặt trời (Az)</td>
                  <td className="py-2 px-2.5 font-bold text-amber-700 dark:text-amber-300">
                    {formatValueOrDash(noaaSun.azimuthDeg, 1, '°')} ({getCompassDirectionName(noaaSun.azimuthDeg)})
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Độ cao Mặt trời (El)</td>
                  <td className="py-2 px-2.5 font-bold text-zinc-900 dark:text-white">
                    {formatSignedNumber(noaaSun.elevationDeg, 1, '°')} (Zenith: {formatValueOrDash(noaaSun.zenithDeg, 1, '°')})
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-zinc-700 dark:text-slate-200 font-medium">Chu kỳ ngày NOAA</td>
                  <td className="py-2 px-2.5 font-semibold text-zinc-800 dark:text-slate-100">
                    Bình minh {noaaSun.sunriseStr} – Hoàng hôn {noaaSun.sunsetStr}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          <div className="p-2 bg-zinc-50 dark:bg-slate-800/90 border border-zinc-200 dark:border-slate-700 rounded-xs flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-zinc-800 dark:text-slate-200">
              Chênh lệch năng lượng (k = 1,018):
            </span>
            {hasValidGain ? (
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                {formatSignedNumber(comparison.percentGain, 1, '%')}
              </span>
            ) : (
              <span className="text-zinc-500 dark:text-slate-400 italic">
                Chờ đủ ngưỡng 5,0 Wh
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
