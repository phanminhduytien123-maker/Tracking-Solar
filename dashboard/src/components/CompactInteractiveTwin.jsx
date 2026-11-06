import React, { useState, useEffect, useRef } from 'react';
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
 * Tạo texture mặt tấm pin mặt trời Monocrystalline độ phân giải cao (1024x1024)
 * Mô phỏng sát thực tế tấm pin trong ảnh chụp:
 * - Viền nền trắng mỏng quanh mép + đường chia đôi màu trắng dọc chính giữa tấm pin
 * - 2 dãy tế bào quang điện đơn tinh thể xanh đen đậm (#081528), chia thành các dải cell ngang có busbar bạc mảnh
 */
function createRealisticSolarPanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Lớp nền backsheet trắng ngà ở viền ngoài
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 22;
  const centerGap = 10;
  const halfW = (canvas.width - margin * 2 - centerGap) / 2;
  const totalH = canvas.height - margin * 2;
  const numStrips = 18; // 18 dải cell ngang mỗi nửa (giống tấm pin thực tế)
  const stripH = totalH / numStrips;

  for (let col = 0; col < 2; col++) {
    const startX = margin + col * (halfW + centerGap);

    for (let r = 0; r < numStrips; r++) {
      const startY = margin + r * stripH;

      // Nền silicon đơn tinh thể xanh đen sâu
      const grad = ctx.createLinearGradient(startX, startY, startX + halfW, startY + stripH);
      grad.addColorStop(0, '#071324');
      grad.addColorStop(0.5, '#0c213d');
      grad.addColorStop(1, '#08162b');
      ctx.fillStyle = grad;
      ctx.fillRect(startX + 1.5, startY + 1.5, halfW - 3, stripH - 3);

      // Các đường finger thu điện ngang siêu mảnh
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 0.8;
      for (let f = 1; f <= 3; f++) {
        const fy = startY + (stripH * f) / 4;
        ctx.beginPath();
        ctx.moveTo(startX + 2, fy);
        ctx.lineTo(startX + halfW - 2, fy);
        ctx.stroke();
      }

      // 5 đường busbar bạc dọc trên mỗi nửa tấm pin
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
  texture.anisotropy = 8;
  return texture;
}

/**
 * Tạo texture rãnh nhôm định hình V-Slot 20x20 (Bề mặt nhôm xước аноdized + rãnh đen chính giữa)
 */
function createVSlotExtrusionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Nền nhôm bạc anodized
  ctx.fillStyle = '#d4d8dd';
  ctx.fillRect(0, 0, 256, 256);

  // Vân nhôm xước dọc nhẹ
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 256; i += 4) {
    ctx.fillRect(i, 0, 1, 256);
  }

  // Rãnh V-Slot tối màu ở chính giữa thanh nhôm
  ctx.fillStyle = '#334155';
  ctx.fillRect(98, 0, 60, 256);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(110, 0, 36, 256);

  // 2 mép vát sáng cạnh rãnh V-Slot
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
 * Tạo hình học gá chữ T in 3D màu trắng (Đỡ dưới tấm pin Tracker, giống hệt ảnh chụp thực tế)
 */
function createSculptedTBracketGeometry() {
  const shape = new THREE.Shape();
  // Cánh ngang phía trên dài 0.92, dày 0.14, có thân trụ ở giữa rộng 0.36 hạ xuống -0.26, bo góc mượt
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

/**
 * COMPACT MODE: MÔ HÌNH 3D KỸ THUẬT CAD/SOLIDWORKS TƯƠNG TÁC TRỰC QUAN
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
  const liveEps = el.epsilon !== undefined && el.epsilon !== null ? Number(el.epsilon) : (el.currentAngle !== null ? Number(el.currentAngle) : 9.3);

  // State tương tác 3D
  const [cameraPreset, setCameraPreset] = useState('overview'); // 'overview' | 'mechanism' | 'box' | 'front'
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const [isInteractiveSim, setIsInteractiveSim] = useState(false);
  const [simPhi, setSimPhi] = useState(2.3);
  const [simEps, setSimEps] = useState(9.3);

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
    tiltRad: THREE.MathUtils.degToRad(30),
    lidRad: 0,
    camTargetPos: null,
    camLookAt: null
  });

  /**
   * Đồng bộ góc quay thực tế từ Firmware vào mô hình cơ khí 3D:
   * - Trong thực tế (như Hình 2 người dùng cung cấp):
   *   + Khi φ ≈ 0° -> +2,3° (Trạng thái nghỉ/ngủ hoặc đầu hành trình): Gá chữ T nhìn thẳng về phía trước (+Z),
   *     trục độ ngửa xoay trong mặt phẳng Trái - Phải (quanh trục Z).
   *   + Theo cấu hình Firmware: (CTHT = 90°, Zenith nằm ngang = 50°, Ngửa đón = 10°).
   *     Khi ε ≈ 9,3° (như Hình 2): Mặt tấm pin Tracker hướng về bên trái (-X), hơi ngả lên với góc nghiêng ~30° so với phương ngang
   *     (không bị cụp gập xuống, cạnh thấp ở bên trái -X, cạnh cao ở bên phải +X).
   */
  useEffect(() => {
    const phiDeg = Number(effectivePhi) || 0;
    // Khi φ = 0°..2.3°, trụ hướng mặt gá chữ T về phía trước (+Z), xoay quanh trục đứng Y khi φ thay đổi
    targetAnglesRef.current.phiRad = THREE.MathUtils.degToRad(-phiDeg * 0.85);

    const epsDeg = Number(effectiveEps);
    const validEps = !isNaN(epsDeg) ? epsDeg : 9.3;
    // Quy đổi chuẩn xác theo mốc vật lý của hệ thống (Zenith nằm ngang = 50°, tại ε = 9.3° tấm pin nghiêng +30.5° hướng mặt sang trái):
    const tiltLeftDeg = Math.max(-48, Math.min(48, (50 - validEps) * 0.75));
    targetAnglesRef.current.tiltRad = THREE.MathUtils.degToRad(tiltLeftDeg);
  }, [effectivePhi, effectiveEps]);

  // Đồng bộ góc mở nắp hộp điện 3D
  useEffect(() => {
    targetAnglesRef.current.lidRad = isBoxOpen ? THREE.MathUtils.degToRad(105) : 0;
  }, [isBoxOpen]);

  // Đồng bộ màu đèn báo nhỏ trên công tắc hành trình SW1, SW2
  useEffect(() => {
    const { sw1LedMat, sw2LedMat } = sceneObjectsRef.current;
    if (sw1LedMat) {
      sw1LedMat.color.setHex(az.limitHome ? 0xf59e0b : 0x10b981);
    }
    if (sw2LedMat) {
      sw2LedMat.color.setHex(el.limitSwitch90 ? 0xf59e0b : 0x10b981);
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
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(0, 3.8, 7.6);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0, 1.35, 0);
    } else if (preset === 'mechanism') {
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(-2.05, 2.15, 3.15);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(-2.05, 1.45, 0);
    } else if (preset === 'box') {
      setIsBoxOpen(true);
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(0.05, 3.45, 2.15);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0.05, 0.65, 0.08);
    } else if (preset === 'front') {
      targetAnglesRef.current.camTargetPos = new THREE.Vector3(0, 2.05, 8.1);
      targetAnglesRef.current.camLookAt = new THREE.Vector3(0, 1.35, 0);
    }
  };

  // Khởi tạo không gian 3D Kỹ thuật (CAD / SolidWorks PBR)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 430;
    const isDark = document.documentElement.classList.contains('dark');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x0b1120 : 0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 7.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    // Tạo môi trường phản xạ ánh sáng kim loại PBR (RoomEnvironment) giúp nhôm, thép và mặt kính pin chân thực như CAD
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.35, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 1.6;
    controls.maxDistance = 15;
    controls.update();

    // Hệ thống đèn chiếu sáng kỹ thuật
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(5.5, 9.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.55);
    fillLight.position.set(-6, 4, 4);
    scene.add(fillLight);

    // Mặt sàn & lưới kỹ thuật mảnh
    const gridHelper = new THREE.GridHelper(12, 24, 0x475569, 0x64748b);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // =========================================================================
    // VẬT LIỆU PBR CÔNG NGHIỆP (CHÂN THỰC, KHÔNG HOẠT HÌNH)
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
      color: 0x0369a1,
      metalness: 0.25,
      roughness: 0.35
    });
    const pcbGreenMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      metalness: 0.25,
      roughness: 0.35
    });

    const solarTex = createRealisticSolarPanelTexture();
    const solarGlassMat = new THREE.MeshPhysicalMaterial({
      map: solarTex,
      metalness: 0.15,
      roughness: 0.15,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    // Hàm tạo thanh nhôm định hình V-Slot 20x20 có bo cạnh & nắp bịt đầu
    const addVSlotBar = (parent, w, h, d, x, y, z) => {
      const geom = new RoundedBoxGeometry(w, h, d, 2, 0.012);
      const mesh = new THREE.Mesh(geom, aluExtrusionMat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Hàm tạo ke góc nhôm L-bracket + ốc lục giác M5 tại các điểm nối khung nhôm
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

    // Hàm tạo động cơ bước NEMA 17 chuẩn kỹ thuật (Thân thép đen nhiều tầng + 2 nắp nhôm bạc + trục thép + 4 ốc M3)
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

    // Hàm tạo vòng bi 608ZZ (Vành ngoài thép, nắp chắn bạc, tâm trục M8)
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

    // Hàm tạo cụm Tấm pin mặt trời chuẩn công nghiệp (Khung nhôm ghép 4 thanh có gờ nổi, mặt kính solar, tấm đáy trắng, hộp cáp sau)
    const createIndustrialSolarPanel = (widthX, depthZ, withSensors = false) => {
      const panelGrp = new THREE.Group();
      const frameH = 0.058;
      const railW = 0.045;

      // 4 thanh khung nhôm bao quanh viền
      const railLeft = new THREE.Mesh(new RoundedBoxGeometry(railW, frameH, depthZ, 2, 0.006), aluFrameMat);
      railLeft.position.set(-widthX / 2 + railW / 2, 0, 0);
      const railRight = new THREE.Mesh(new RoundedBoxGeometry(railW, frameH, depthZ, 2, 0.006), aluFrameMat);
      railRight.position.set(widthX / 2 - railW / 2, 0, 0);
      const railFront = new THREE.Mesh(new RoundedBoxGeometry(widthX - railW * 2, frameH, railW, 2, 0.006), aluFrameMat);
      railFront.position.set(0, 0, depthZ / 2 - railW / 2);
      const railBack = new THREE.Mesh(new RoundedBoxGeometry(widthX - railW * 2, frameH, railW, 2, 0.006), aluFrameMat);
      railBack.position.set(0, 0, -depthZ / 2 + railW / 2);

      // Tấm laminate kính + cell + backsheet trắng nằm lọt lòng trong gờ khung nhôm
      const coreMesh = new THREE.Mesh(
        new THREE.BoxGeometry(widthX - railW * 1.8, frameH * 0.55, depthZ - railW * 1.8),
        whitePrintMat
      );
      coreMesh.position.set(0, -0.004, 0);
      coreMesh.castShadow = true;
      coreMesh.receiveShadow = true;

      // Mặt kính cường lực phủ tế bào quang điện
      const glassPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(widthX - railW * 1.9, depthZ - railW * 1.9),
        solarGlassMat
      );
      glassPlane.rotation.x = -Math.PI / 2;
      glassPlane.position.set(0, frameH * 0.28, 0);

      panelGrp.add(railLeft, railRight, railFront, railBack, coreMesh, glassPlane);

      // Nếu là tấm pin Tracking: gắn 4 ngàm kẹp cảm biến TEMT6000 mỏng gọn ôm sát mép khung nhôm (y hệt ảnh thực tế)
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

          // Ngàm chữ U in 3D màu trắng nhỏ gọn ôm viền nhôm
          const uClip = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.052, 0.055, 2, 0.006), whitePrintMat);
          // Mạch PCB cảm biến TEMT6000 nhỏ màu xanh trên mặt ngàm
          const sensorPcb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.032), pcbBlueMat);
          sensorPcb.position.set(0, 0.028, -0.004);
          // Mắt quang cảm biến chính giữa
          const sensorEye = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.014), blackAnodizedMat);
          sensorEye.position.set(0, 0.034, -0.004);

          clipGrp.add(uClip, sensorPcb, sensorEye);
          panelGrp.add(clipGrp);
        });
      }

      return panelGrp;
    };

    // =========================================================================
    // 1. KHUNG ĐẾ NHÔM ĐỊNH HÌNH 20x20 ĐẶT SÀN (Dài 6.4, Rộng 2.3, Cao 0.34)
    // =========================================================================
    const frameGroup = new THREE.Group();
    scene.add(frameGroup);

    const frameY = 0.34;
    const barT = 0.115; // Tiết diện thanh nhôm 20x20 thanh mảnh đúng tỷ lệ thực tế
    // 2 thanh dọc trước & sau
    addVSlotBar(frameGroup, 6.4, barT, barT, 0, frameY, 1.08);
    addVSlotBar(frameGroup, 6.4, barT, barT, 0, frameY, -1.08);
    // 3 thanh ngang chia khoang
    addVSlotBar(frameGroup, barT, barT, 2.04, -3.14, frameY, 0);
    addVSlotBar(frameGroup, barT, barT, 2.04, -0.96, frameY, 0);
    addVSlotBar(frameGroup, barT, barT, 2.04, 3.14, frameY, 0);
    // 2 thanh giằng song song đỡ cụm ổ xoay Trục 1 (Giống hệt Ảnh 1)
    addVSlotBar(frameGroup, 2.06, barT, barT, -2.05, frameY, 0.18);
    addVSlotBar(frameGroup, 2.06, barT, barT, -2.05, frameY, -0.18);
    // Thanh đỡ trụ tấm cố định bên phải
    addVSlotBar(frameGroup, barT, barT, 2.04, 2.15, frameY, 0);

    // 6 chân trụ đứng nhôm 20x20 + đế cao su đen chống trượt + ke góc nhôm
    const legCoords = [
      [-3.14, 1.08], [-3.14, -1.08],
      [-0.96, 1.08], [-0.96, -1.08],
      [3.14, 1.08], [3.14, -1.08]
    ];
    legCoords.forEach(([lx, lz]) => {
      addVSlotBar(frameGroup, barT, frameY, barT, lx, frameY / 2, lz);
      const rubberFoot = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.03, 0.14, 2, 0.005), matteBlackPrintMat);
      rubberFoot.position.set(lx, 0.015, lz);
      frameGroup.add(rubberFoot);
      addCornerBracket(frameGroup, lx + (lx < 0 ? 0.08 : -0.08), frameY - 0.07, lz);
    });

    // =========================================================================
    // 2. CỤM BÊN TRÁI: HỆ THỐNG PIN TRACKING 2 TRỤC (Tâm tại x = -2.05, z = 0)
    // =========================================================================
    const trackerX = -2.05;

    // 2A. Ổ xoay trung tâm Trục 1 (Cụm trụ tròn đen in 3D chia 2 thớt + đế kẹp thanh nhôm 20x20)
    const hubClampBase = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.14, 0.56, 2, 0.015), matteBlackPrintMat);
    hubClampBase.position.set(trackerX, frameY + 0.04, 0);
    scene.add(hubClampBase);

    const hubLowerCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 40), matteBlackPrintMat);
    hubLowerCylinder.position.set(trackerX, frameY + 0.22, 0);
    hubLowerCylinder.castShadow = true;
    scene.add(hubLowerCylinder);

    // Rãnh puly đai răng trên thân ổ xoay Trục 1
    const hubBeltGroove = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 40), rubberBeltMat);
    hubBeltGroove.position.set(trackerX, frameY + 0.20, 0);
    scene.add(hubBeltGroove);

    // Gá trắng in 3D bên phải ổ xoay + Động cơ bước NEMA17 Trục 1 + Puly nhôm GT2
    const m1Plate = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.06, 0.44, 2, 0.01), whitePrintMat);
    m1Plate.position.set(trackerX + 0.58, frameY + 0.08, 0);
    scene.add(m1Plate);

    // 4 ốc lục giác M3 trên mặt bích gá động cơ
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([bx, bz]) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), chromeSteelMat);
      screw.position.set(trackerX + 0.58 + bx, frameY + 0.115, bz);
      scene.add(screw);
    });

    const nema1 = createDetailedNema17();
    nema1.position.set(trackerX + 0.58, frameY - 0.12, 0);
    scene.add(nema1);

    const pulley1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.11, 24), aluFrameMat);
    pulley1.position.set(trackerX + 0.58, frameY + 0.18, 0);
    scene.add(pulley1);

    // 2 nhánh dây đai răng GT2 màu đen nối puly động cơ 1 vào ổ xoay trung tâm
    const belt1Front = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.018), rubberBeltMat);
    belt1Front.position.set(trackerX + 0.29, frameY + 0.19, 0.12);
    belt1Front.rotation.y = 0.12;
    scene.add(belt1Front);

    const belt1Back = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.018), rubberBeltMat);
    belt1Back.position.set(trackerX + 0.29, frameY + 0.19, -0.12);
    belt1Back.rotation.y = -0.12;
    scene.add(belt1Back);

    // Gá trắng bên trái ổ xoay + Encoder Trục 1 + Công tắc hành trình vi động SW1 chuẩn thực tế
    const enc1Plate = new THREE.Mesh(new RoundedBoxGeometry(0.40, 0.06, 0.38, 2, 0.01), whitePrintMat);
    enc1Plate.position.set(trackerX - 0.56, frameY + 0.08, 0);
    scene.add(enc1Plate);

    const enc1Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 28), matteBlackPrintMat);
    enc1Housing.position.set(trackerX - 0.56, frameY - 0.08, 0);
    scene.add(enc1Housing);

    const enc1Pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.09, 20), whitePrintMat);
    enc1Pulley.position.set(trackerX - 0.56, frameY + 0.16, 0);
    scene.add(enc1Pulley);

    const belt1Enc = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.045, 0.016), rubberBeltMat);
    belt1Enc.position.set(trackerX - 0.28, frameY + 0.17, 0.08);
    scene.add(belt1Enc);

    // Cụm công tắc hành trình SW1 (Thân micro-switch đen + lá thép bạc + đèn LED báo trạng thái nhỏ)
    const sw1Body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.04), matteBlackPrintMat);
    sw1Body.position.set(trackerX - 0.42, frameY + 0.13, 0.16);
    scene.add(sw1Body);
    const sw1Lever = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.025), chromeSteelMat);
    sw1Lever.position.set(trackerX - 0.39, frameY + 0.15, 0.14);
    sw1Lever.rotation.y = -0.35;
    scene.add(sw1Lever);
    const sw1LedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sw1Led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), sw1LedMat);
    sw1Led.position.set(trackerX - 0.42, frameY + 0.165, 0.16);
    scene.add(sw1Led);

    // 2B. NHÓM XOAY PHƯƠNG VỊ TRỤC 1 (azimuthGroup xoay quanh trục đứng Y)
    const azimuthGroup = new THREE.Group();
    azimuthGroup.position.set(trackerX, frameY + 0.34, 0);
    scene.add(azimuthGroup);

    // Thớt trên của ổ xoay đen + 6 bu-lông lục giác M4 quanh vành
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

    // Trụ đứng nhôm định hình V-Slot 20x40 ghép đôi (Cao 1.68)
    const colHeight = 1.68;
    addVSlotBar(azimuthGroup, 0.115, colHeight, 0.115, -0.058, 0.15 + colHeight / 2, 0);
    addVSlotBar(azimuthGroup, 0.115, colHeight, 0.115, 0.058, 0.15 + colHeight / 2, 0);

    // Cụm truyền động đai răng Trục 2 (Độ ngửa ε) gắn giữa thân trụ (Giống Ảnh 1 & Hình 2)
    const midY = 1.12;
    // Mặt bích gá động cơ Trục 2 màu trắng in 3D bên trái trụ (có 4 vít M3 ở 4 góc)
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

    // Hốc tròn đen chứa bánh đai chủ động Trục 2 + Puly nhôm ở tâm
    const m2PulleyPocket = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.07, 28), matteBlackPrintMat);
    m2PulleyPocket.rotation.x = Math.PI / 2;
    m2PulleyPocket.position.set(-0.22, midY, 0.10);
    azimuthGroup.add(m2PulleyPocket);

    const m2AluHub = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 20), chromeSteelMat);
    m2AluHub.rotation.x = Math.PI / 2;
    m2AluHub.position.set(-0.22, midY, 0.11);
    azimuthGroup.add(m2AluHub);

    // Thân động cơ bước NEMA 17 Trục 2 nằm phía sau gá trắng
    const nema2 = createDetailedNema17();
    nema2.rotation.x = Math.PI / 2;
    nema2.position.set(-0.22, midY, -0.12);
    azimuthGroup.add(nema2);

    // Gá trắng bên phải trụ giữ cụm căng đai + Encoder 2 + Công tắc hành trình SW2 (Giống Ảnh 1)
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

    // Gối đỡ đen in 3D trên đỉnh trụ nhôm + Bánh đai bị động lớn màu trắng + 2 nhánh dây đai răng đen
    const topPivotY = 0.15 + colHeight;
    const topSaddleBlack = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.24, 0.32, 2, 0.015), matteBlackPrintMat);
    topSaddleBlack.position.set(0, topPivotY - 0.04, 0);
    azimuthGroup.add(topSaddleBlack);

    const upperDrivenPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 32), whitePrintMat);
    upperDrivenPulley.rotation.x = Math.PI / 2;
    upperDrivenPulley.position.set(0, topPivotY + 0.02, 0.16);
    azimuthGroup.add(upperDrivenPulley);

    // 2 Nhánh dây đai răng đen nối từ puly giữa trụ lên bánh đai đỉnh trụ (Giống Ảnh 1)
    const belt2Left = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.74, 0.042), rubberBeltMat);
    belt2Left.position.set(-0.15, (midY + topPivotY) / 2 + 0.02, 0.14);
    belt2Left.rotation.z = -0.28;
    azimuthGroup.add(belt2Left);

    const belt2Right = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.74, 0.042), rubberBeltMat);
    belt2Right.position.set(-0.05, (midY + topPivotY) / 2 + 0.02, 0.14);
    belt2Right.rotation.z = -0.26;
    azimuthGroup.add(belt2Right);

    // =========================================================================
    // 2C. NHÓM NGHIÊNG ĐỘ NGỬA TRỤC 2 (elevationGroup xoay quanh trục Z — nghiêng sang TRÁI y hệt Hình 2)
    // =========================================================================
    const elevationGroup = new THREE.Group();
    elevationGroup.position.set(0, topPivotY + 0.06, 0);
    // Đặt góc khởi tạo ban đầu hướng mặt về bên trái ~30° (Đúng trạng thái thực tế trong Hình 2)
    elevationGroup.rotation.z = THREE.MathUtils.degToRad(30);
    azimuthGroup.add(elevationGroup);

    // Trục thép ngang xuyên qua gối đỡ đỉnh trụ
    const pivotShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.48, 20), chromeSteelMat);
    pivotShaft.rotation.x = Math.PI / 2;
    pivotShaft.position.set(0, -0.04, 0);
    elevationGroup.add(pivotShaft);

    // 2 Tấm gá chữ T màu trắng in 3D (Trước & Sau) + Vòng bi 608ZZ lộ ra ở 2 đầu (Giống hệt Ảnh 1, Ảnh 5 & Hình 2)
    const tBracketGeom = createSculptedTBracketGeometry();
    const tBracketFront = new THREE.Mesh(tBracketGeom, whitePrintMat);
    tBracketFront.position.set(0, 0.04, 0.18);
    tBracketFront.castShadow = true;
    elevationGroup.add(tBracketFront);

    const tBracketBack = new THREE.Mesh(tBracketGeom, whitePrintMat);
    tBracketBack.position.set(0, 0.04, -0.235);
    tBracketBack.castShadow = true;
    elevationGroup.add(tBracketBack);

    // Vòng bi 608ZZ gắn trên tai gá chữ T (Giống hệt chi tiết vòng bi bạc trong Ảnh 1 & Ảnh 5)
    const brgRight = createBallBearing(0.065, 0.035);
    brgRight.position.set(0.32, 0.03, 0.21);
    elevationGroup.add(brgRight);

    const brgCenter = createBallBearing(0.072, 0.04);
    brgCenter.position.set(0, -0.08, 0.21);
    elevationGroup.add(brgCenter);

    // Thanh đà nhôm đỡ dọc theo mặt dưới tấm pin Tracker (Thấy rõ trong Hình 2 chụp ban đêm)
    addVSlotBar(elevationGroup, 1.92, 0.075, 0.08, 0, 0.18, 0);

    // TẤM PIN TRACKER ĐẶT DỌC THEO CHIỀU NGHIÊNG (Dài 2.08 dọc theo độ dốc X, Rộng 1.46 theo chiều Z)
    const trackerPanel = createIndustrialSolarPanel(2.08, 1.46, true);
    trackerPanel.position.set(0, 0.245, 0);
    elevationGroup.add(trackerPanel);

    // =========================================================================
    // 3. CHÍNH GIỮA: HỘP ĐIỆN CÔNG NGHIỆP MÀU TRẮNG CÓ KHÓA GÀI, ĂNG-TEN & MẠCH ĐIỆN
    // =========================================================================
    const boxGroup = new THREE.Group();
    boxGroup.position.set(0.08, frameY + 0.04, 0.05);
    boxGroup.name = 'controlBox';
    scene.add(boxGroup);

    const boxW = 1.44;
    const boxH = 0.68;
    const boxD = 1.24;
    const wallT = 0.045;

    // Đáy hộp và 4 thành hộp nhựa ABS trắng có gờ viền chống nước
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

    // Gioăng cao su đen chống nước trên miệng hộp
    const gasketRim = new THREE.Mesh(new THREE.BoxGeometry(boxW - 0.02, 0.012, boxD - 0.02), matteBlackPrintMat);
    gasketRim.position.set(0, boxH + 0.002, 0);
    boxGroup.add(gasketRim);

    // 2 Khóa gài có gân nổi ở mặt trước hộp điện (Giống Ảnh 5)
    [-0.38, 0.38].forEach((lx) => {
      const latchBase = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.22, 0.045, 2, 0.008), whitePrintMat);
      latchBase.position.set(lx, boxH - 0.11, boxD / 2 + 0.018);
      const latchClip = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.14, 0.03, 2, 0.005), aluFrameMat);
      latchClip.position.set(lx, boxH - 0.12, boxD / 2 + 0.032);
      boxGroup.add(latchBase, latchClip);
    });

    // Ăng-ten WiFi màu đen có khớp xoay & đầu nối đồng SMA gắn mặt trước hộp điện (Giống Ảnh 4 & Ảnh 5)
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

    // CÁC LINH KIỆN ĐIỆN TỬ BÊN TRONG HỘP ĐIỆN (Giống Ảnh 4)
    // 1. Bộ điều khiển sạc Solar PWM (Xanh dương - đen, có màn hình LCD & 2 cổng USB)
    const pwmBody = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.22, 0.34, 2, 0.01), matteBlackPrintMat);
    pwmBody.position.set(-0.16, 0.15, -0.34);
    boxGroup.add(pwmBody);

    const pwmFace = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.015, 0.22), pcbBlueMat);
    pwmFace.position.set(-0.16, 0.262, -0.34);
    boxGroup.add(pwmFace);

    const pwmLcd = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.018, 0.10), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2 }));
    pwmLcd.position.set(-0.18, 0.265, -0.34);
    boxGroup.add(pwmLcd);

    // 2. Bảng mạch đục lỗ trắng góc trái dưới + ESP32-S3 + 2x INA226 + DS3231 + Quạt tản nhiệt
    const perfBoard = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.025, 0.62, 2, 0.005), whitePrintMat);
    perfBoard.position.set(-0.32, 0.06, 0.18);
    boxGroup.add(perfBoard);

    const espBreakout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.26), pcbGreenMat);
    espBreakout.position.set(-0.22, 0.095, 0.26);
    const espModule = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.16), matteBlackPrintMat);
    espModule.position.set(-0.22, 0.125, 0.26);
    const espShield = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.015, 0.12), chromeSteelMat);
    espShield.position.set(-0.22, 0.142, 0.24);
    boxGroup.add(espBreakout, espModule, espShield);

    // 2 module cảm biến dòng/áp INA226 màu xanh dương + RTC DS3231 có pin cúc áo CR2032 bạc
    const ina1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.09), pcbBlueMat);
    ina1.position.set(-0.48, 0.09, 0.05);
    const ina2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.09), pcbBlueMat);
    ina2.position.set(-0.33, 0.09, 0.05);
    const rtcPcb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.11), pcbBlueMat);
    rtcPcb.position.set(-0.38, 0.09, -0.08);
    const cr2032 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.015, 20), chromeSteelMat);
    cr2032.position.set(-0.38, 0.112, -0.08);
    boxGroup.add(ina1, ina2, rtcPcb, cr2032);

    // Quạt tản nhiệt đen góc dưới trái
    const fanFrame = new THREE.Mesh(new RoundedBoxGeometry(0.20, 0.11, 0.20, 2, 0.008), matteBlackPrintMat);
    fanFrame.position.set(-0.50, 0.11, 0.34);
    boxGroup.add(fanFrame);

    const fanBladesGroup = new THREE.Group();
    fanBladesGroup.position.set(-0.50, 0.17, 0.34);
    const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), matteBlackPrintMat);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.032), blackAnodizedMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.16), blackAnodizedMat);
    fanBladesGroup.add(fanHub, blade1, blade2);
    boxGroup.add(fanBladesGroup);

    // 3. 2 Bộ Driver động cơ bước màu đen bên phải hộp + Cọc domino xanh lá
    [0.18, 0.48].forEach((dx) => {
      const drvBody = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.24, 0.62, 2, 0.01), blackAnodizedMat);
      drvBody.position.set(dx, 0.16, 0.16);
      const drvTerm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.48), pcbGreenMat);
      drvTerm.position.set(dx - 0.08, 0.29, 0.16);
      boxGroup.add(drvBody, drvTerm);
    });

    // NẮP HỘP ĐIỆN 3D CÓ BẢN LỀ BÊN PHẢI (lidGroup xoay mở nắp mượt mà)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(boxW / 2, boxH, 0);
    boxGroup.add(lidGroup);

    const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(boxW + 0.03, 0.065, boxD + 0.03, 2, 0.012), enclosureAbsMat);
    lidMesh.position.set(-boxW / 2, 0.032, 0);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // =========================================================================
    // 4. CỤM BÊN PHẢI: TẤM PIN CỐ ĐỊNH (NAM 180°, NGỬA 75° / NGHIÊNG 15° VỀ PHÍA TRƯỚC)
    // =========================================================================
    const staticX = 2.15;

    const staBase = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.12, 0.32, 2, 0.01), matteBlackPrintMat);
    staBase.position.set(staticX, frameY + 0.06, 0);
    scene.add(staBase);

    const staColH = 1.65;
    addVSlotBar(scene, 0.12, staColH, 0.12, staticX, frameY + 0.12 + staColH / 2, 0);

    // Cụm gá trắng cố định nghiêng 15° hướng Nam (+Z, về phía người xem giống hệt Hình 2)
    const staTopGroup = new THREE.Group();
    staTopGroup.position.set(staticX, frameY + 0.12 + staColH, 0);
    staTopGroup.rotation.x = THREE.MathUtils.degToRad(15);
    scene.add(staTopGroup);

    const staBracket = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.09, 0.68, 2, 0.012), whitePrintMat);
    staBracket.position.set(0, 0.03, 0);
    staTopGroup.add(staBracket);

    const staticPanel = createIndustrialSolarPanel(2.08, 1.46, false);
    staticPanel.position.set(0, 0.10, 0);
    staTopGroup.add(staticPanel);

    // =========================================================================
    // 5. DÂY CÁP ĐIỆN MÀU ĐEN UỐN CONG TỰ NHIÊN NỐI HỘP ĐIỆN VỚI 2 TRỤ PIN
    // =========================================================================
    const cableCurveLeft = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.64, frameY + 0.25, -0.15),
      new THREE.Vector3(-1.25, frameY + 0.12, -0.25),
      new THREE.Vector3(-1.75, frameY + 0.35, -0.18),
      new THREE.Vector3(-1.95, frameY + 1.15, -0.08)
    ]);
    const cableLeft = new THREE.Mesh(new THREE.TubeGeometry(cableCurveLeft, 24, 0.018, 8, false), rubberBeltMat);
    scene.add(cableLeft);

    const cableCurveRight = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.78, frameY + 0.22, -0.20),
      new THREE.Vector3(1.45, frameY + 0.10, -0.22),
      new THREE.Vector3(2.08, frameY + 0.45, -0.08),
      new THREE.Vector3(2.12, frameY + 1.45, -0.05)
    ]);
    const cableRight = new THREE.Mesh(new THREE.TubeGeometry(cableCurveRight, 24, 0.016, 8, false), rubberBeltMat);
    scene.add(cableRight);

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
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
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

      // Nội suy mượt góc phương vị Trục 1 (quanh trục Y) và góc nghiêng Trục 2 (quanh trục Z — nghiêng mặt về bên trái y hệt Hình 2)
      azimuthGroup.rotation.y += (phiRad - azimuthGroup.rotation.y) * 0.1;
      elevationGroup.rotation.z += (tiltRad - elevationGroup.rotation.z) * 0.1;

      // Nội suy đóng/mở nắp hộp điện 3D
      lidGroup.rotation.z += (-lidRad - lidGroup.rotation.z) * 0.12;

      // Quay cánh quạt tản nhiệt trong hộp điện
      fanBladesGroup.rotation.y += 0.14;

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

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 720;
      const newH = container.clientHeight || 430;
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
      pmremGenerator.dispose();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const toggleSandbox = () => {
    if (!isInteractiveSim) {
      setSimPhi(Math.round((livePhi ?? 2.3) * 10) / 10);
      setSimEps(Math.round((liveEps ?? 9.3) * 10) / 10);
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
                Cận cảnh Trục & Đai răng
              </button>
              <button
                onClick={() => applyCameraPreset('box')}
                className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                  cameraPreset === 'box'
                    ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white border border-zinc-300 dark:border-slate-600'
                    : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                }`}
              >
                Soi bên trong Hộp điện
              </button>
              <button
                onClick={() => applyCameraPreset('front')}
                className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                  cameraPreset === 'front'
                    ? 'bg-white dark:bg-slate-700 font-bold text-zinc-900 dark:text-white border border-zinc-300 dark:border-slate-600'
                    : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white font-medium'
                }`}
              >
                Góc nhìn chính diện
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsBoxOpen((prev) => !prev)}
                className={`px-2.5 py-1 rounded-xs border cursor-pointer font-semibold transition-colors ${
                  isBoxOpen
                    ? 'bg-zinc-800 text-white border-zinc-700 dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 border-zinc-300 dark:border-slate-600 hover:bg-zinc-100'
                }`}
              >
                {isBoxOpen ? 'Đóng nắp hộp điện' : 'Mở nắp hộp điện'}
              </button>

              <button
                onClick={toggleSandbox}
                className={`px-2.5 py-1 rounded-xs border cursor-pointer font-semibold transition-colors ${
                  isInteractiveSim
                    ? 'bg-blue-700 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 border-zinc-300 dark:border-slate-600 hover:bg-zinc-100'
                }`}
              >
                {isInteractiveSim ? 'Đang thử góc 3D (Về thực tế)' : 'Thử xoay góc 3D'}
              </button>
            </div>
          </div>

          {/* Thanh trượt thử nghiệm xoay 2 trục 3D (Khi bật chế độ Thử xoay góc 3D) */}
          {isInteractiveSim && (
            <div className="px-3.5 py-2.5 bg-zinc-100 dark:bg-slate-800/70 border-b border-zinc-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-zinc-800 dark:text-slate-200 mb-1">
                  <span>Góc quay Trục 1 (Phương vị φ):</span>
                  <span>{formatSignedNumber(simPhi, 1, '°')}</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="150"
                  step="1"
                  value={simPhi}
                  onChange={(e) => setSimPhi(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-1.5"
                />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-zinc-800 dark:text-slate-200 mb-1">
                  <span>Góc ngửa Trục 2 (Độ ngửa ε):</span>
                  <span>{formatValueOrDash(simEps, 1, '°')}</span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="90"
                  step="1"
                  value={simEps}
                  onChange={(e) => setSimEps(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-1.5"
                />
              </div>
            </div>
          )}

          {/* Khung Canvas 3D WebGL */}
          <div className="relative w-full h-[390px] sm:h-[440px]">
            <div
              ref={mountRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              title="Kéo chuột trái để xoay 360°, lăn chuột để phóng to/thu nhỏ, nhấn vào hộp điện để mở nắp"
            />

            {/* Nhãn hướng dẫn thao tác chuột tối giản dưới góc khung 3D */}
            <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-[11px] text-zinc-600 dark:text-slate-300">
              <span className="bg-white/85 dark:bg-slate-900/85 px-2.5 py-1 rounded-xs border border-zinc-200 dark:border-slate-700">
                Chuột trái: Xoay 360° | Con lăn: Thu phóng | Chuột phải: Di chuyển | Nhấn vào hộp điện: Mở nắp
              </span>
              <span className="bg-white/85 dark:bg-slate-900/85 px-2.5 py-1 rounded-xs border border-zinc-200 dark:border-slate-700 font-semibold text-zinc-800 dark:text-slate-100">
                Trạng thái: {system?.displayState || 'Bình thường'}
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 COLS): BẢNG SO SÁNH ĐỐI CHỨNG HAI TẤM PIN (GIỐNG HỆT FONT CHỮ, FONT SỐ & PHONG CÁCH CỦA MODE THƯỜNG) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="overflow-x-auto">
            <table className="lab-table text-xs sm:text-sm">
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-slate-800/90 text-zinc-700 dark:text-slate-200">
                  <th className="text-left font-bold py-2.5 px-3 text-zinc-900 dark:text-white">
                    Thông số đo đạc
                  </th>
                  <th className="text-left font-bold py-2.5 px-3 text-blue-700 dark:text-sky-300">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${trkBadge.dotColor}`} />
                      <span>Tấm tracker (Trục kép)</span>
                    </div>
                    <span className={`text-xs font-semibold block mt-0.5 ${trkBadge.textColor}`}>
                      {trkBadge.text}
                    </span>
                  </th>
                  <th className="text-left font-bold py-2.5 px-3 text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${staBadge.dotColor}`} />
                      <span>Tấm cố định (Nam, 75°)</span>
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

                {/* 4. Năng lượng hôm nay */}
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

                {/* 5. Góc định hướng hiện tại */}
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
                      <span className="mx-1.5 text-zinc-400 dark:text-slate-500">|</span>
                      <span>Ngửa ε: </span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {effectiveEps !== null ? formatValueOrDash(effectiveEps, 1, '°') : '--'}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                      {compassAzimuth !== null
                        ? `Phương vị: ${formatSignedNumber(compassAzimuth, 1, '°')} (${getCompassDirectionName(compassAzimuth)})`
                        : '(Nằm ngang = 50°, CTHT = 90°)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100">
                    <div className="font-medium text-zinc-900 dark:text-white">
                      Hướng Nam 180°, ngửa 75°
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mt-0.5">
                      (Góc nghiêng cố định 15°)
                    </span>
                  </td>
                </tr>

                {/* 6. Trạng thái công tắc hành trình cơ khí */}
                <tr>
                  <td className="py-2.5 px-3 text-zinc-700 dark:text-slate-200 font-medium">
                    Công tắc hành trình
                  </td>
                  <td className="py-2.5 px-3 text-zinc-800 dark:text-slate-100" colSpan={2}>
                    <span>SW1 (Phương vị): </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {az.limitHome ? 'Đang chạm (Home)' : 'Hở (Bình thường)'}
                    </span>
                    <span className="mx-2 text-zinc-400 dark:text-slate-500">|</span>
                    <span>SW2 (Độ ngửa): </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {el.limitSwitch90 ? 'Đang chạm (90°)' : 'Hở (Bình thường)'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dòng kết luận Chênh lệch năng lượng % Gain (Giống hệt Mode thường) */}
          <div className="p-3 bg-zinc-50 dark:bg-slate-800/90 border border-zinc-200 dark:border-slate-700 rounded-sm flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-slate-200">
              Chênh lệch năng lượng hôm nay (k = 1,018):
            </span>
            <div className="text-xs sm:text-sm">
              {hasValidGain ? (
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base">
                  {formatSignedNumber(comparison.percentGain, 1, '%')}
                  {comparison.powerDelta !== null && (
                    <span className="text-xs text-zinc-600 dark:text-slate-300 font-normal ml-1.5">
                      ({formatSignedNumber(comparison.powerDelta, 1, 'W')})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-slate-300 font-medium italic">
                  {tracking.connStatus !== 'LIVE' || stat.connStatus !== 'LIVE'
                    ? 'Chưa đủ dữ liệu (mất kết nối)'
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
