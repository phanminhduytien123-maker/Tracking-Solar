import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  formatSignedNumber,
  formatValueOrDash,
  getConnectionStatusBadge,
  getCompassDirectionName
} from '../utils/formatters';

/**
 * Tạo texture mặt tấm pin mặt trời Monocrystalline (Nền xanh đậm chuẩn kỹ thuật, đường busbar bạc mảnh)
 */
function createSolarPanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  // Nền silicon đơn tinh thể xanh đen
  ctx.fillStyle = '#0f2547';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = 6;
  const rows = 6;
  const pad = 10;
  const cellW = (canvas.width - pad * 2) / cols;
  const cellH = (canvas.height - pad * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * cellW;
      const y = pad + r * cellH;

      // Ô tế bào quang điện
      ctx.fillStyle = '#153462';
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

      // Đường finger mảnh
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const fy = y + 2 + ((cellH - 4) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x + 2, fy);
        ctx.lineTo(x + cellW - 2, fy);
        ctx.stroke();
      }

      // 2 đường busbar dọc mỗi cell
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.33, y + 2);
      ctx.lineTo(x + cellW * 0.33, y + cellH - 2);
      ctx.moveTo(x + cellW * 0.67, y + 2);
      ctx.lineTo(x + cellW * 0.67, y + cellH - 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * COMPACT MODE: MÔ HÌNH 3D TƯƠNG TÁC TRỰC QUAN (THREE.JS WEBGL)
 * - Không dùng icon, ít màu, font chữ và bảng số liệu đồng bộ 100% với Bảng so sánh của Mode thường.
 * - Mô hình 3D tái hiện đúng hệ thống thực tế:
 *   + Khung đế nhôm định hình 20x20 có 4 chân đế
 *   + Cụm tấm pin Tracking 2 trục (Ổ xoay tròn đen in 3D, gá trắng in 3D, truyền động đai răng, 2 động cơ bước, 2 encoder, 4 cảm biến quang)
 *   + Hộp điện nhựa trắng ở giữa có ăng-ten đen bên hông (Có thể đóng/mở nắp hộp 3D để xem mạch sạc PWM, ESP32-S3, 2x INA226, RTC, quạt, 2 Driver cọc xanh)
 *   + Cụm tấm pin Cố định bên phải (Hướng Nam 180°, ngửa 75° / nghiêng 15°)
 */
export default function CompactInteractiveTwin({
  telemetry,
  isAdmin = true,
  themeMode = 'light',
  onOpenDetails,
  onOpenManualModal,
  onOpenSettingsModal,
  onOpenEmergencyModal
}) {
  const INA226 = telemetry?.INA226 || {};
  const motors = telemetry?.motors || {};
  const system = telemetry?.system || {};

  const tracking = INA226?.tracking || { voltage: null, current: null, power: null, energyWh: null };
  const stat = INA226?.static || { voltage: null, current: null, power: null, energyWh: null };
  const comparison = INA226?.comparison || { percentGain: null, powerDelta: null, hasValidGain: false };

  const az = motors?.azimuth || {};
  const el = motors?.elevation || {};

  const livePhi = az.phi !== undefined && az.phi !== null ? Number(az.phi) : (az.currentAngle !== null ? Number(az.currentAngle) : 0);
  const liveEps = el.epsilon !== undefined && el.epsilon !== null ? Number(el.epsilon) : (el.currentAngle !== null ? Number(el.currentAngle) : 90);

  // State tương tác 3D
  const [cameraPreset, setCameraPreset] = useState('overview'); // 'overview' | 'mechanism' | 'box' | 'front'
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const [isInteractiveSim, setIsInteractiveSim] = useState(false);
  const [simPhi, setSimPhi] = useState(40);
  const [simEps, setSimEps] = useState(55);

  const effectivePhi = isInteractiveSim ? simPhi : livePhi;
  const effectiveEps = isInteractiveSim ? simEps : liveEps;

  // Phương vị địa lý thực tế (Compass Azimuth)
  const compassAzimuth = (() => {
    if (!isInteractiveSim && az.currentAngle !== null && az.currentAngle !== undefined && !isNaN(az.currentAngle)) {
      return Number(az.currentAngle);
    }
    if (effectivePhi === null || effectivePhi === undefined) return null;
    const hour = new Date().getHours();
    const isAfternoon = hour >= 12;
    let azVal = isAfternoon ? (360.0 - effectivePhi) : (180.0 - effectivePhi);
    while (azVal < 0) azVal += 360.0;
    while (azVal >= 360.0) azVal -= 360.0;
    return Math.round(azVal * 10) / 10;
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
    sw1LedMat: null,
    sw2LedMat: null,
    camera: null,
    controls: null,
    scene: null,
    gridHelper: null
  });
  const targetAnglesRef = useRef({
    phiRad: 0,
    tiltRad: 0,
    lidRad: 0,
    camTargetPos: null,
    camLookAt: null
  });

  // Đồng bộ góc quay thực tế vào ref cho vòng lặp animation 3D mượt
  useEffect(() => {
    // Quy đổi góc phương vị φ sang góc xoay trục Y trong không gian 3D (Gốc Nam = 0 rad)
    const phiDeg = Number(effectivePhi) || 0;
    targetAnglesRef.current.phiRad = THREE.MathUtils.degToRad(-phiDeg);

    // Quy đổi độ ngửa ε sang góc nghiêng mặt tấm pin (ε = 90° -> nằm ngang 0 rad; ε = 15° -> nghiêng 75°)
    const epsDeg = Number(effectiveEps) || 90;
    const tiltFromHorizontalDeg = Math.max(-75, Math.min(75, 90 - epsDeg));
    targetAnglesRef.current.tiltRad = THREE.MathUtils.degToRad(tiltFromHorizontalDeg);
  }, [effectivePhi, effectiveEps]);

  // Đồng bộ góc mở nắp hộp điện 3D
  useEffect(() => {
    targetAnglesRef.current.lidRad = isBoxOpen ? THREE.MathUtils.degToRad(108) : 0;
  }, [isBoxOpen]);

  // Đồng bộ màu đèn công tắc hành trình SW1, SW2
  useEffect(() => {
    const { sw1LedMat, sw2LedMat } = sceneObjectsRef.current;
    if (sw1LedMat) {
      sw1LedMat.color.setHex(az.limitHome ? 0xd97706 : 0x16a34a);
    }
    if (sw2LedMat) {
      sw2LedMat.color.setHex(el.limitSwitch90 ? 0xd97706 : 0x16a34a);
    }
  }, [az.limitHome, el.limitSwitch90]);

  // Đồng bộ màu nền 3D theo chế độ Sáng / Tối
  useEffect(() => {
    const { scene } = sceneObjectsRef.current;
    if (!scene) return;
    const isDark = themeMode === 'dark' || document.documentElement.classList.contains('dark');
    scene.background = new THREE.Color(isDark ? 0x0b1120 : 0xf1f5f9);
  }, [themeMode]);

  // Chuyển góc nhìn Camera 3D
  const applyCameraPreset = (preset) => {
    setCameraPreset(preset);
    if (preset === 'overview') {
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(0, 4.6, 7.8);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0, 1.3, 0);
    } else if (preset === 'mechanism') {
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(-2.1, 2.3, 3.3);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(-2.15, 1.45, 0);
    } else if (preset === 'box') {
      setIsBoxOpen(true);
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(0.1, 3.6, 2.2);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0.05, 0.65, 0.1);
    } else if (preset === 'front') {
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(0, 2.4, 8.2);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0, 1.4, 0);
    }
  };

  // Khởi tạo không gian 3D Three.js
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;
    const isDark = document.documentElement.classList.contains('dark');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x0b1120 : 0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 4.6, 7.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Không xuyên xuống dưới sàn
    controls.minDistance = 1.8;
    controls.maxDistance = 16;
    controls.update();

    // Hệ thống ánh sáng phòng lab dịu nhẹ, rõ khối cơ khí
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(5, 9, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xcbd5e1, 0.55);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Lưới tọa độ mặt sàn phòng thí nghiệm
    const gridHelper = new THREE.GridHelper(12, 24, 0x64748b, 0x94a3b8);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.22;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Vật liệu chuẩn công nghiệp (Ít màu, trung tính: Nhôm bạc, Nhựa in 3D trắng, Nhựa/Thép đen, Mặt pin xanh đậm)
    const aluMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.65, roughness: 0.32 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.35, roughness: 0.55 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.7 });
    const white3dMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.05, roughness: 0.4 });
    const boxWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.05, roughness: 0.35 });
    const pcbBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.2, roughness: 0.4 });
    const pcbGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.2, roughness: 0.4 });
    const solarTex = createSolarPanelTexture();
    const solarCellMat = new THREE.MeshStandardMaterial({ map: solarTex, metalness: 0.25, roughness: 0.2 });

    // Hàm tiện ích tạo thanh nhôm định hình 20x20
    const addAluBar = (parent, w, h, d, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), aluMat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // =========================================================================
    // 1. KHUNG ĐẾ NHÔM ĐỊNH HÌNH 20x20 ĐẶT SÀN (Dài 6.4, Rộng 2.4, Cao 0.32)
    // =========================================================================
    const frameGroup = new THREE.Group();
    scene.add(frameGroup);

    const frameY = 0.32;
    const barT = 0.14; // Tiết diện thanh nhôm 20x20
    // 2 thanh dọc trước & sau
    addAluBar(frameGroup, 6.4, barT, barT, 0, frameY, 1.1);
    addAluBar(frameGroup, 6.4, barT, barT, 0, frameY, -1.1);
    // 3 thanh ngang (Trái, Giữa đỡ cụm tracker/hộp điện, Phải)
    addAluBar(frameGroup, barT, barT, 2.06, -3.13, frameY, 0);
    addAluBar(frameGroup, barT, barT, 2.06, -0.95, frameY, 0);
    addAluBar(frameGroup, barT, barT, 2.06, 3.13, frameY, 0);
    // 2 thanh đỡ dưới cụm ổ xoay Trục 1
    addAluBar(frameGroup, 2.04, barT, barT, -2.04, frameY, 0);

    // 6 chân trụ góc + đế cao su đen
    const legCoords = [
      [-3.13, 1.1], [-3.13, -1.1],
      [-0.95, 1.1], [-0.95, -1.1],
      [3.13, 1.1], [3.13, -1.1]
    ];
    legCoords.forEach(([lx, lz]) => {
      addAluBar(frameGroup, barT, frameY, barT, lx, frameY / 2, lz);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), blackMat);
      foot.position.set(lx, 0.02, lz);
      frameGroup.add(foot);
    });

    // =========================================================================
    // 2. CỤM BÊN TRÁI: HỆ THỐNG PIN TRACKING 2 TRỤC (Tâm tại x = -2.05, z = 0)
    // =========================================================================
    const trackerX = -2.05;

    // 2A. Phần đế tĩnh Trục 1 (Ổ xoay đen in 3D, Động cơ bước NEMA17, Encoder 1, Đai răng 1, Công tắc SW1)
    const hubBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.42, 32), darkMetalMat);
    hubBase.position.set(trackerX, frameY + 0.21, 0);
    hubBase.castShadow = true;
    scene.add(hubBase);

    // Gá trắng in 3D bên phải ổ xoay + Động cơ bước NEMA17 Trục 1
    const m1Mount = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), white3dMat);
    m1Mount.position.set(trackerX + 0.62, frameY + 0.08, 0);
    scene.add(m1Mount);

    const nema1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), blackMat);
    nema1.position.set(trackerX + 0.62, frameY - 0.14, 0);
    scene.add(nema1);

    const pulley1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 20), aluMat);
    pulley1.position.set(trackerX + 0.62, frameY + 0.18, 0);
    scene.add(pulley1);

    // Đai răng đen Trục 1 nối Puly động cơ với ổ xoay
    const belt1A = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.03), blackMat);
    belt1A.position.set(trackerX + 0.31, frameY + 0.18, 0.14);
    scene.add(belt1A);
    const belt1B = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.03), blackMat);
    belt1B.position.set(trackerX + 0.31, frameY + 0.18, -0.14);
    scene.add(belt1B);

    // Gá trắng bên trái ổ xoay + Encoder Trục 1 + Công tắc hành trình SW1
    const enc1Mount = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.38), white3dMat);
    enc1Mount.position.set(trackerX - 0.6, frameY + 0.08, 0);
    scene.add(enc1Mount);

    const enc1Body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 24), blackMat);
    enc1Body.position.set(trackerX - 0.6, frameY - 0.1, 0);
    scene.add(enc1Body);

    const sw1LedMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const sw1Dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), sw1LedMat);
    sw1Dot.position.set(trackerX - 0.44, frameY + 0.16, 0.15);
    scene.add(sw1Dot);

    // 2B. Nhóm xoay Phương vị (azimuthGroup xoay quanh trục đứng Y)
    const azimuthGroup = new THREE.Group();
    azimuthGroup.position.set(trackerX, frameY + 0.42, 0);
    scene.add(azimuthGroup);

    // Thớt trên của ổ xoay đen
    const hubTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.14, 32), blackMat);
    hubTop.position.set(0, 0.07, 0);
    azimuthGroup.add(hubTop);

    // Trụ đứng nhôm định hình 20x40 (Cao 1.75)
    const colHeight = 1.75;
    addAluBar(azimuthGroup, 0.24, colHeight, 0.18, 0, 0.14 + colHeight / 2, 0);

    // Cụm truyền động Trục 2 (Độ ngửa ε) gắn giữa thân trụ
    const midY = 1.12;
    // Hộp gá trắng bên trái trụ chứa động cơ bước Trục 2
    const m2Bracket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.32), white3dMat);
    m2Bracket.position.set(-0.28, midY, 0);
    m2Bracket.castShadow = true;
    azimuthGroup.add(m2Bracket);

    const nema2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.34), blackMat);
    nema2.position.set(-0.28, midY, -0.22);
    azimuthGroup.add(nema2);

    const pulley2Drive = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 24), blackMat);
    pulley2Drive.rotation.x = Math.PI / 2;
    pulley2Drive.position.set(-0.28, midY, 0.19);
    azimuthGroup.add(pulley2Drive);

    // Hộp gá trắng bên phải trụ chứa Encoder 2 + Công tắc hành trình SW2
    const enc2Bracket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.28), white3dMat);
    enc2Bracket.position.set(0.18, midY - 0.04, 0.08);
    azimuthGroup.add(enc2Bracket);

    const sw2LedMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const sw2Dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), sw2LedMat);
    sw2Dot.position.set(0.34, midY - 0.12, 0.22);
    azimuthGroup.add(sw2Dot);

    // Gối đỡ đen trên đỉnh trụ nhôm
    const topPivotY = 0.14 + colHeight;
    const topMountBlack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.34), darkMetalMat);
    topMountBlack.position.set(0, topPivotY, 0);
    azimuthGroup.add(topMountBlack);

    // 2 Nhánh dây đai răng đen kéo từ puly giữa trụ lên puly đỉnh trụ
    const belt2Span = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.78, 0.05), blackMat);
    belt2Span.position.set(-0.16, (midY + topPivotY) / 2, 0.18);
    belt2Span.rotation.z = -0.32;
    azimuthGroup.add(belt2Span);

    const belt2SpanB = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.78, 0.05), blackMat);
    belt2SpanB.position.set(-0.08, (midY + topPivotY) / 2, 0.18);
    belt2SpanB.rotation.z = -0.32;
    azimuthGroup.add(belt2SpanB);

    // 2C. Nhóm nghiêng Độ ngửa (elevationGroup xoay quanh trục ngang tại đỉnh trụ)
    const elevationGroup = new THREE.Group();
    elevationGroup.position.set(0, topPivotY + 0.08, 0);
    azimuthGroup.add(elevationGroup);

    // Gá chữ T màu trắng in 3D đỡ mặt dưới tấm pin (Giống Ảnh 1 & Ảnh 5)
    const tBracketTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.85), white3dMat);
    tBracketTop.position.set(0, 0.08, 0);
    elevationGroup.add(tBracketTop);

    const tBracketStem = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.42), white3dMat);
    tBracketStem.position.set(0, -0.02, 0);
    elevationGroup.add(tBracketStem);

    // Khung nhôm tấm pin Tracking + bề mặt tế bào quang điện
    const panelW = 2.15;
    const panelD = 1.65;
    const panelH = 0.07;

    const trkPanelFrame = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, panelD), aluMat);
    trkPanelFrame.position.set(0, 0.15, 0);
    trkPanelFrame.castShadow = true;
    trkPanelFrame.receiveShadow = true;
    elevationGroup.add(trkPanelFrame);

    const trkSolarSurface = new THREE.Mesh(new THREE.PlaneGeometry(panelW - 0.12, panelD - 0.12), solarCellMat);
    trkSolarSurface.rotation.x = -Math.PI / 2;
    trkSolarSurface.position.set(0, 0.15 + panelH / 2 + 0.003, 0);
    elevationGroup.add(trkSolarSurface);

    // 4 Gá trắng cảm biến quang học TEMT6000 ở 4 cạnh tấm pin
    const sensorPositions = [
      [0, panelD / 2 + 0.03],
      [0, -panelD / 2 - 0.03],
      [-panelW / 2 - 0.03, 0],
      [panelW / 2 + 0.03, 0]
    ];
    sensorPositions.forEach(([sx, sz]) => {
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.14), white3dMat);
      clip.position.set(sx, 0.15, sz);
      elevationGroup.add(clip);
    });

    // =========================================================================
    // 3. CHÍNH GIỮA: HỘP ĐIỆN TRẮNG CÓ KHÓA GÀI, ĂNG-TEN ĐEN & MẠCH BÊN TRONG
    // =========================================================================
    const boxGroup = new THREE.Group();
    boxGroup.position.set(0.05, frameY + 0.05, 0.05);
    boxGroup.name = 'controlBox';
    scene.add(boxGroup);

    const boxW = 1.45;
    const boxH = 0.68;
    const boxD = 1.25;
    const wallT = 0.05;

    // Đáy hộp và 4 thành hộp nhựa trắng (Rỗng bên trong để khi mở nắp nhìn thấy linh kiện)
    const boxFloor = new THREE.Mesh(new THREE.BoxGeometry(boxW, wallT, boxD), boxWhiteMat);
    boxFloor.position.set(0, wallT / 2, 0);
    boxGroup.add(boxFloor);

    const wallFront = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, wallT), boxWhiteMat);
    wallFront.position.set(0, boxH / 2, boxD / 2 - wallT / 2);
    wallFront.castShadow = true;
    boxGroup.add(wallFront);

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, wallT), boxWhiteMat);
    wallBack.position.set(0, boxH / 2, -boxD / 2 + wallT / 2);
    wallBack.castShadow = true;
    boxGroup.add(wallBack);

    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wallT, boxH, boxD - wallT * 2), boxWhiteMat);
    wallLeft.position.set(-boxW / 2 + wallT / 2, boxH / 2, 0);
    wallLeft.castShadow = true;
    boxGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wallT, boxH, boxD - wallT * 2), boxWhiteMat);
    wallRight.position.set(boxW / 2 - wallT / 2, boxH / 2, 0);
    wallRight.castShadow = true;
    boxGroup.add(wallRight);

    // 2 Khóa gài mặt trước hộp điện
    const latch1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), aluMat);
    latch1.position.set(-0.38, boxH - 0.1, boxD / 2 + 0.015);
    boxGroup.add(latch1);

    const latch2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), aluMat);
    latch2.position.set(0.38, boxH - 0.1, boxD / 2 + 0.015);
    boxGroup.add(latch2);

    // Ăng-ten WiFi màu đen gắn ở mặt trước hộp điện (Giống Ảnh 4 & Ảnh 5)
    const antMount = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16), blackMat);
    antMount.rotation.x = Math.PI / 2;
    antMount.position.set(0.28, boxH * 0.48, boxD / 2 + 0.03);
    boxGroup.add(antMount);

    const antRod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.62, 16), blackMat);
    antRod.position.set(0.34, boxH * 0.48 + 0.28, boxD / 2 + 0.07);
    antRod.rotation.z = -0.18;
    antRod.castShadow = true;
    boxGroup.add(antRod);

    // LINH KIỆN BÊN TRONG HỘP ĐIỆN (Giống Ảnh 4: Sạc PWM xanh-đen, ESP32-S3, 2x INA226, RTC, Quạt, 2x Driver cọc xanh)
    // 1. Bộ điều khiển sạc Solar PWM (Phía sau hộp)
    const pwmBody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.34), blackMat);
    pwmBody.position.set(-0.18, 0.16, -0.34);
    boxGroup.add(pwmBody);

    const pwmFace = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.24), pcbBlueMat);
    pwmFace.position.set(-0.18, 0.275, -0.34);
    boxGroup.add(pwmFace);

    // 2. Bảng mạch đục lỗ màu trắng góc trái dưới + ESP32-S3 + 2x INA226 + DS3231 + Quạt tản nhiệt
    const perfBoard = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.62), white3dMat);
    perfBoard.position.set(-0.32, 0.07, 0.18);
    boxGroup.add(perfBoard);

    // ESP32-S3 trên đế xanh lá
    const espBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.26), pcbGreenMat);
    espBase.position.set(-0.22, 0.11, 0.26);
    boxGroup.add(espBase);
    const espChip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.18), blackMat);
    espChip.position.set(-0.22, 0.15, 0.26);
    boxGroup.add(espChip);

    // 2 mạch INA226 xanh dương + 1 mạch RTC DS3231
    const ina1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.1), pcbBlueMat);
    ina1.position.set(-0.48, 0.11, 0.06);
    boxGroup.add(ina1);

    const ina2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.1), pcbBlueMat);
    ina2.position.set(-0.32, 0.11, 0.06);
    boxGroup.add(ina2);

    const rtcMod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.12), pcbBlueMat);
    rtcMod.position.set(-0.38, 0.11, -0.06);
    boxGroup.add(rtcMod);

    // Quạt tản nhiệt đen góc dưới trái
    const fanFrame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), blackMat);
    fanFrame.position.set(-0.5, 0.12, 0.34);
    boxGroup.add(fanFrame);

    const fanBladesGroup = new THREE.Group();
    fanBladesGroup.position.set(-0.5, 0.19, 0.34);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.035), darkMetalMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 0.15), darkMetalMat);
    fanBladesGroup.add(blade1, blade2);
    boxGroup.add(fanBladesGroup);

    // 3. 2 Bộ Driver động cơ bước màu đen bên phải hộp + Cọc đấu dây màu xanh lá
    const drv1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.62), darkMetalMat);
    drv1.position.set(0.18, 0.17, 0.16);
    boxGroup.add(drv1);
    const drv1Term = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.48), pcbGreenMat);
    drv1Term.position.set(0.09, 0.295, 0.16);
    boxGroup.add(drv1Term);

    const drv2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.62), darkMetalMat);
    drv2.position.set(0.48, 0.17, 0.16);
    boxGroup.add(drv2);
    const drv2Term = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.48), pcbGreenMat);
    drv2Term.position.set(0.39, 0.295, 0.16);
    boxGroup.add(drv2Term);

    // NẮP HỘP ĐIỆN 3D CÓ BẢN LỀ BÊN PHẢI (lidGroup xoay mở nắp mượt mà)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(boxW / 2, boxH, 0);
    boxGroup.add(lidGroup);

    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(boxW + 0.04, 0.06, boxD + 0.04), white3dMat);
    lidMesh.position.set(-boxW / 2, 0.03, 0);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // =========================================================================
    // 4. CỤM BÊN PHẢI: TẤM PIN CỐ ĐỊNH (NAM 180°, NGỬA 75° / NGHIÊNG 15°)
    // =========================================================================
    const staticX = 2.15;

    // Đế đen bắt vào khung nhôm + Trụ đứng nhôm định hình 20x20
    const staBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), darkMetalMat);
    staBase.position.set(staticX, frameY + 0.07, 0);
    scene.add(staBase);

    const staColH = 1.92;
    addAluBar(scene, 0.16, staColH, 0.16, staticX, frameY + 0.14 + staColH / 2, 0);

    // Gá trắng cố định góc nghiêng 15° hướng Nam (+Z)
    const staTopGroup = new THREE.Group();
    staTopGroup.position.set(staticX, frameY + 0.14 + staColH, 0);
    staTopGroup.rotation.x = THREE.MathUtils.degToRad(15); // Nghiêng cố định 15° về hướng Nam (+Z)
    scene.add(staTopGroup);

    const staMount = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.75), white3dMat);
    staMount.position.set(0, 0.04, 0);
    staTopGroup.add(staMount);

    const staPanelFrame = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, panelD), aluMat);
    staPanelFrame.position.set(0, 0.12, 0);
    staPanelFrame.castShadow = true;
    staPanelFrame.receiveShadow = true;
    staTopGroup.add(staPanelFrame);

    const staSolarSurface = new THREE.Mesh(new THREE.PlaneGeometry(panelW - 0.12, panelD - 0.12), solarCellMat);
    staSolarSurface.rotation.x = -Math.PI / 2;
    staSolarSurface.position.set(0, 0.12 + panelH / 2 + 0.003, 0);
    staTopGroup.add(staSolarSurface);

    sceneObjectsRef.current = {
      azimuthGroup,
      elevationGroup,
      lidGroup,
      fanBladesGroup,
      sw1LedMat,
      sw2LedMat,
      camera,
      controls,
      scene,
      gridHelper
    };

    // Xử lý nhấn chuột trực tiếp vào Hộp điện 3D để đóng/mở nắp
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // Bỏ qua nếu đang kéo xoay camera
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(boxGroup.children, true);
      if (intersects.length > 0) {
        setIsBoxOpen((prev) => !prev);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // Vòng lặp Render 3D & Nội suy chuyển động cơ khí mượt mà
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const { phiRad, tiltRad, lidRad, camTargetPos, camLookAt } = targetAnglesRef.current;

      // Nội suy mượt góc phương vị Trục 1 và góc ngửa Trục 2
      azimuthGroup.rotation.y += (phiRad - azimuthGroup.rotation.y) * 0.1;
      elevationGroup.rotation.x += (tiltRad - elevationGroup.rotation.x) * 0.1;

      // Nội suy đóng/mở nắp hộp điện 3D
      lidGroup.rotation.z += (-lidRad - lidGroup.rotation.z) * 0.12;

      // Quay cánh quạt tản nhiệt trong hộp điện
      fanBladesGroup.rotation.y += 0.12;

      // Nội suy chuyển góc nhìn Camera khi chọn Preset
      if (camTargetPos && camLookAt) {
        camera.position.lerp(camTargetPos, 0.08);
        controls.target.lerp(camLookAt, 0.08);
        if (camera.position.distanceTo(camTargetPos) < 0.05) {
          targetAnglesRef.current.camTargetPos = null;
          targetAnglesRef.current.camLookAt = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Tự động co giãn khung hình 3D khi thay đổi kích thước cửa sổ
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 720;
      const newH = container.clientHeight || 420;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const toggleSandbox = () => {
    if (!isInteractiveSim) {
      setSimPhi(Math.round(livePhi || 35));
      setSimEps(Math.round(liveEps || 65));
      setIsInteractiveSim(true);
    } else {
      setIsInteractiveSim(false);
    }
  };

  return (
    <div className="lab-card p-4 sm:p-5 space-y-4">
      {/* 1. TIÊU ĐỀ KHỐI & CÁC NÚT CHỨC NĂNG (ĐỒNG BỘ FONT CHỮ & PHONG CÁCH VỚI BẢNG SO SÁNH MODE THƯỜNG, KHÔNG DÙNG ICON) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
            Mô hình 3D đối chứng hai tấm pin (Compact Mode)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-slate-300 font-medium mt-0.5">
            Mô phỏng không gian 3D thời gian thực của hệ thống quay hai trục, hộp điện trung tâm và tấm cố định chuẩn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {isAdmin && (
            <>
              <button
                onClick={onOpenEmergencyModal}
                className={`sm:hidden px-2.5 py-1.5 text-xs font-bold rounded-sm cursor-pointer transition-colors ${
                  system?.emergencyActive
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-red-700 hover:bg-red-800 text-white'
                }`}
              >
                {system?.emergencyActive ? 'MỞ KHÓA' : 'DỪNG KHẨN CẤP'}
              </button>
              <button
                onClick={onOpenManualModal}
                className="sm:hidden px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-sm cursor-pointer transition-colors"
              >
                Điều khiển
              </button>
              <button
                onClick={onOpenSettingsModal}
                className="sm:hidden px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-slate-800 border border-zinc-300 dark:border-slate-700 rounded-sm cursor-pointer transition-colors"
              >
                Cài đặt
              </button>
            </>
          )}

          <button
            onClick={onOpenDetails}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100 bg-zinc-50 dark:bg-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-700 border border-zinc-300 dark:border-slate-600 rounded-sm cursor-pointer transition-colors"
          >
            Xem thông số chi tiết
          </button>
        </div>
      </div>

      {/* 2. BỐ CỤC CHÍNH: KHUNG 3D TƯƠNG TÁC (TRÁI) & BẢNG SO SÁNH ĐỐI CHỨNG CHUẨN (PHẢI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* CỘT TRÁI (7 COLS): KHUNG MÔ HÌNH 3D TƯƠNG TÁC (XOAY 360°, THU PHÓNG, ĐÓNG/MỞ HỘP ĐIỆN) */}
        <div className="lg:col-span-7 border border-zinc-200 dark:border-slate-700 rounded-sm bg-zinc-50 dark:bg-slate-900/90 overflow-hidden flex flex-col">
          {/* Thanh điều khiển góc nhìn 3D tối giản */}
          <div className="px-3 py-2 bg-zinc-100/80 dark:bg-slate-800/90 border-b border-zinc-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => applyCameraPreset('overview')}
                className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                  cameraPreset === 'overview'
                    ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white border border-zinc-300 dark:border-slate-600'
                    : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                }`}
              >
                Toàn cảnh 3D
              </button>
              <button
                onClick={() => applyCameraPreset('mechanism')}
                className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                  cameraPreset === 'mechanism'
                    ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white border border-zinc-300 dark:border-slate-600'
                    : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                }`}
              >
                Cụm trục & đai răng
              </button>
              <button
                onClick={() => {
                  if (cameraPreset === 'box') {
                    setIsBoxOpen((prev) => !prev);
                  } else {
                    applyCameraPreset('box');
                  }
                }}
                className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                  cameraPreset === 'box' || isBoxOpen
                    ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white border border-zinc-300 dark:border-slate-600'
                    : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                }`}
              >
                {isBoxOpen ? 'Đóng nắp hộp điện' : 'Mở nắp hộp điện'}
              </button>
              <button
                onClick={() => applyCameraPreset('front')}
                className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                  cameraPreset === 'front'
                    ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white border border-zinc-300 dark:border-slate-600'
                    : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                }`}
              >
                Hướng Nam (180°)
              </button>
            </div>

            <button
              onClick={toggleSandbox}
              className={`px-2.5 py-1 rounded-xs cursor-pointer font-semibold border transition-colors ${
                isInteractiveSim
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-slate-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-slate-800 text-zinc-700 dark:text-slate-200 border-zinc-300 dark:border-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-700'
              }`}
            >
              {isInteractiveSim ? 'Về góc thiết bị thật' : 'Xoay thử góc φ / ε'}
            </button>
          </div>

          {/* Thanh kéo thử góc khi bật chế độ xoay thử */}
          {isInteractiveSim && (
            <div className="px-3 py-2 bg-zinc-50 dark:bg-slate-800/60 border-b border-zinc-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs tabular-nums">
              <div>
                <div className="flex justify-between font-medium text-zinc-700 dark:text-slate-200 mb-1">
                  <span>Góc quay φ (Trục 1):</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{formatSignedNumber(simPhi, 1, '°')}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="147"
                  step="1"
                  value={simPhi}
                  onChange={(e) => setSimPhi(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between font-medium text-zinc-700 dark:text-slate-200 mb-1">
                  <span>Độ ngửa ε (Trục 2):</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{formatValueOrDash(simEps, 1, '°')}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="1"
                  value={simEps}
                  onChange={(e) => setSimEps(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Vùng Canvas 3D */}
          <div
            ref={mountRef}
            className="w-full h-[340px] sm:h-[380px] cursor-grab active:cursor-grabbing"
            title="Giữ chuột trái để xoay 360°, lăn chuột để phóng to/thu nhỏ, nhấn vào hộp điện để mở nắp"
          />

          {/* Chú thích hướng dẫn tương tác ngắn gọn */}
          <div className="px-3 py-2 bg-zinc-50 dark:bg-slate-800/80 border-t border-zinc-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-slate-400 tabular-nums">
            <span>Thao tác: Giữ chuột trái xoay 3D | Lăn chuột thu phóng | Nhấn vào hộp điện để đóng/mở nắp</span>
            <span>
              Trạng thái: <strong className="text-zinc-800 dark:text-slate-200">{system?.displayState || 'Bình thường'}</strong>
            </span>
          </div>
        </div>

        {/* CỘT PHẢI (5 COLS): BẢNG SO SÁNH ĐỐI CHỨNG (GIỐNG HỆT FONT CHỮ, FONT SỐ & MÀU SẮC CỦA MODE THƯỜNG) */}
        <div className="lg:col-span-5 overflow-x-auto">
          <table className="lab-table text-xs sm:text-sm">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-slate-800/90 text-zinc-700 dark:text-slate-200">
                <th className="text-left font-bold py-2.5 px-3 w-1/3 text-zinc-900 dark:text-white">Thông số đo đạc</th>
                <th className="text-left font-bold py-2.5 px-3 w-1/3 text-blue-700 dark:text-sky-300">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${trkBadge.dotColor}`} />
                    <span>Tấm tracker (Trục kép)</span>
                  </div>
                  <span className={`text-xs font-semibold block mt-0.5 ${trkBadge.textColor}`}>
                    {trkBadge.text}
                  </span>
                </th>
                <th className="text-left font-bold py-2.5 px-3 w-1/3 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${staBadge.dotColor}`} />
                    <span>Tấm cố định (Nam, ngửa 75°)</span>
                  </div>
                  <span className={`text-xs font-semibold block mt-0.5 ${staBadge.textColor}`}>
                    {staBadge.text}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
              {/* 1. Công suất tức thời */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Công suất tức thời (P)
                </td>
                <td className="py-2.5 px-3 font-bold text-base sm:text-lg text-blue-700 dark:text-sky-300">
                  {formatValueOrDash(tracking.power, 1, 'W')}
                </td>
                <td className="py-2.5 px-3 font-bold text-base sm:text-lg text-amber-800 dark:text-amber-300">
                  {formatValueOrDash(stat.power, 1, 'W')}
                </td>
              </tr>

              {/* 2. Điện áp */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Điện áp (V)
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(tracking.voltage, 2, 'V')}
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(stat.voltage, 2, 'V')}
                </td>
              </tr>

              {/* 3. Dòng điện */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Dòng điện (I)
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(tracking.current, 2, 'A')}
                </td>
                <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-slate-100">
                  {formatValueOrDash(stat.current, 2, 'A')}
                </td>
              </tr>

              {/* 4. Năng lượng tích lũy hôm nay */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Năng lượng hôm nay (ΣE)
                </td>
                <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-sky-300">
                  {formatValueOrDash(tracking.energyWh, 1, 'Wh')}
                </td>
                <td className="py-2.5 px-3 font-bold text-amber-800 dark:text-amber-300">
                  {formatValueOrDash(stat.energyWh, 1, 'Wh')}
                </td>
              </tr>

              {/* 5. Góc định hướng */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Góc định hướng hiện tại
                </td>
                <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                  <div>
                    <span>Quay φ: </span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {effectivePhi !== null ? formatSignedNumber(effectivePhi, 1, '°') : '--'}
                    </span>
                    <span className="mx-2 text-zinc-400 dark:text-slate-500">|</span>
                    <span>Ngửa ε: </span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {effectiveEps !== null ? formatValueOrDash(effectiveEps, 1, '°') : '--'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                    {compassAzimuth !== null
                      ? `Phương vị: ${formatSignedNumber(compassAzimuth, 1, '°')} (${getCompassDirectionName(compassAzimuth)})`
                      : '(Nằm ngang = 90°, dựng đứng = 0°)'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                  <div className="font-medium text-zinc-900 dark:text-white">Hướng Nam 180°, ngửa 75°</div>
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                    (Góc nghiêng cố định 15°)
                  </span>
                </td>
              </tr>

              {/* 6. Trạng thái cơ khí & hộp điện */}
              <tr>
                <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                  Công tắc hành trình (SW1 / SW2)
                </td>
                <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    SW1: {az.limitHome ? 'Chạm' : 'Hở'} | SW2: {el.limitSwitch90 ? 'Chạm' : 'Hở'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                  <span className="text-zinc-600 dark:text-slate-300">
                    Xung PCNT: {az.encoderPulses ?? '--'} / {el.encoderPulses ?? '--'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Dòng kết luận Chênh lệch năng lượng % Gain (Giống hệt Bảng so sánh của Mode thường) */}
          <div className="mt-3 p-3 bg-zinc-50 dark:bg-slate-800/90 border border-zinc-200 dark:border-slate-700 rounded-sm flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-slate-200">
              Chênh lệch năng lượng hôm nay (đã hiệu chuẩn k = 1,018):
            </span>
            <div className="text-xs sm:text-sm">
              {hasValidGain ? (
                <span className="font-bold text-zinc-950 dark:text-white text-base">
                  {formatSignedNumber(comparison.percentGain, 1, '%')}
                  {comparison.powerDelta !== null && (
                    <span className="text-xs text-zinc-600 dark:text-slate-300 font-normal ml-2">
                      (chênh lệch tức thời {formatSignedNumber(comparison.powerDelta, 1, 'W')})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-slate-200 font-medium italic">
                  {tracking.connStatus !== 'LIVE' || stat.connStatus !== 'LIVE'
                    ? 'Chưa đủ dữ liệu (thiết bị mất kết nối)'
                    : 'Chờ tích lũy đủ ngưỡng 5,0 Wh'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
