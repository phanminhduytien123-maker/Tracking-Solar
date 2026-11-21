import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Tạo texture gạch lát sân thượng màu kem/trắng vân đá cẩm thạch nhạt (4x4 viên / tile repeat)
 */
function createMarbleTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e7e2da';
  ctx.fillRect(0, 0, 1024, 1024);

  const tiles = 4;
  const size = 1024 / tiles;
  const seedRand = (seed) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let row = 0; row < tiles; row++) {
    for (let col = 0; col < tiles; col++) {
      const idx = row * tiles + col + 1;
      const x0 = col * size;
      const y0 = row * size;

      const shade = 204 + Math.floor(seedRand(idx) * 12);
      ctx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade - 12})`;
      ctx.fillRect(x0 + 2, y0 + 2, size - 4, size - 4);

      // Vân đá nhẹ tự nhiên trên từng viên gạch
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 2, y0 + 2, size - 4, size - 4);
      ctx.clip();

      for (let v = 0; v < 4; v++) {
        ctx.strokeStyle = `rgba(120, 114, 106, ${0.14 + seedRand(idx * 7 + v) * 0.1})`;
        ctx.lineWidth = 1.6 + seedRand(idx * 13 + v) * 2.4;
        ctx.beginPath();
        const sx = x0 + seedRand(idx * 19 + v) * size * 0.4;
        const sy = y0 + seedRand(idx * 23 + v) * size;
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(
          x0 + size * (0.25 + seedRand(idx * 29 + v) * 0.4),
          y0 + seedRand(idx * 31 + v) * size,
          x0 + size * (0.55 + seedRand(idx * 37 + v) * 0.35),
          y0 + seedRand(idx * 41 + v) * size,
          x0 + size,
          y0 + seedRand(idx * 43 + v) * size
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Đường ron gạch mảnh sắc nét
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 5;
  for (let i = 0; i <= tiles; i++) {
    const pos = i * size;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(1024, pos);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9.15 / 6.08, 7.07 / 6.08);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Tạo texture xi măng/bê tông sân thượng tự nhiên cho gờ lan can, khối kỹ thuật & tường nhà
 */
function createWeatheredConcreteTexture(baseR = 148, baseG = 153, baseB = 160) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1600; i++) {
    const s = Math.sin(i * 91.345) * 43758.5453;
    const r1 = s - Math.floor(s);
    const s2 = Math.sin(i * 47.123) * 28461.123;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin(i * 19.77) * 19283.45;
    const r3 = s3 - Math.floor(s3);

    const x = r1 * 512;
    const y = r2 * 512;
    const rad = 2 + r3 * 16;
    const delta = Math.floor((r3 - 0.5) * 28);
    ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, baseR + delta))}, ${Math.max(0, Math.min(255, baseG + delta))}, ${Math.max(0, Math.min(255, baseB + delta))}, 0.14)`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Tạo texture & bump map mái tôn sóng phía Đông
 */
function createCorrugatedRoofTextures() {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 512;
  colorCanvas.height = 256;
  const cCtx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d');

  const ribs = 18;
  for (let x = 0; x < 512; x++) {
    const wave = 0.5 + 0.5 * Math.sin((x / 512) * Math.PI * 2 * ribs);
    const cVal = Math.round(135 + wave * 65);
    cCtx.fillStyle = `rgb(${cVal - 6}, ${cVal}, ${cVal + 8})`;
    cCtx.fillRect(x, 0, 1, 256);

    const bVal = Math.round(wave * 255);
    bCtx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
    bCtx.fillRect(x, 0, 1, 256);
  }

  // Đường nối tôn & bụi mờ nhẹ theo chiều dài
  cCtx.fillStyle = 'rgba(71, 85, 105, 0.14)';
  cCtx.fillRect(0, 126, 512, 3);

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(3, 1);
  colorTex.anisotropy = 4;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(3, 1);

  return { colorTex, bumpTex };
}

/**
 * Tạo texture bình nước nóng inox ngang với dải tem xanh "ISO 9001" quay về sân thượng (+Z)
 */
function createWaterTankTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Nền inox phay xước theo chu vi (trên CylinderGeometry: X = chu vi u, Y = chiều dài v từ -X sang +X)
  const baseGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  baseGrad.addColorStop(0, '#94a3b8');
  baseGrad.addColorStop(0.25, '#cbd5e1');
  baseGrad.addColorStop(0.5, '#eef2f6');
  baseGrad.addColorStop(0.75, '#cbd5e1');
  baseGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Vệt xước inox theo chu vi
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let y = 0; y < 1024; y += 7) {
    ctx.fillRect(0, y, 1024, 2);
  }

  // Đường gân dập nổi theo chu vi thân bồn (chạy dọc canvas X)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  [120, 290, 512, 734, 904].forEach((gy) => {
    ctx.fillRect(0, gy, 1024, 6);
  });

  // Vùng tem xanh lam đặc trưng nằm ngang dọc theo thân bồn quay về phía sân (+Z)
  // Canvas X là hướng lên trên; Canvas Y là chiều từ Trái (-X) sang Phải (+X)
  ctx.fillStyle = '#1e4e8c';
  ctx.fillRect(380, 220, 220, 584);
  ctx.fillStyle = '#163a68';
  ctx.fillRect(380, 220, 44, 584);

  // Chữ "ISO 9001" nằm ngang chuẩn đọc từ trái sang phải khi nhìn từ sân (+Z -> -Z)
  ctx.save();
  ctx.translate(512, 512);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 74px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISO 9001', 0, -24);

  ctx.fillStyle = '#dbeafe';
  ctx.font = '600 28px "Be Vietnam Pro", sans-serif';
  ctx.fillText('SOLAR WATER HEATER', 0, 38);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Tạo texture mặt trước cục nóng điều hòa Panasonic Inverter (hướng +X về tấm Tracker)
 */
function createAcFrontTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  // Thân vỏ trắng ngà ngoài trời
  ctx.fillStyle = '#e8e7e2';
  ctx.fillRect(0, 0, 512, 384);

  // Đường rãnh nắp trên và mặt nạ
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 492, 364);
  ctx.beginPath();
  ctx.moveTo(10, 56);
  ctx.lineTo(502, 56);
  ctx.stroke();

  // Lưới bảo vệ quạt gió tròn lớn phía bên trái
  const fanCx = 188;
  const fanCy = 205;
  const fanR = 148;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(fanCx, fanCy, fanR, 0, Math.PI * 2);
  ctx.fill();

  // Cánh quạt bên trong lờ mờ
  ctx.fillStyle = '#334155';
  for (let b = 0; b < 3; b++) {
    ctx.save();
    ctx.translate(fanCx, fanCy);
    ctx.rotate((b * Math.PI * 2) / 3 + 0.35);
    ctx.beginPath();
    ctx.ellipse(62, 0, 62, 28, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Các vòng tròn đồng tâm & nan bảo vệ màu trắng ngà
  ctx.strokeStyle = '#dedcd5';
  for (let r = 24; r <= fanR; r += 17) {
    ctx.lineWidth = r > fanR - 6 ? 6 : 3.5;
    ctx.beginPath();
    ctx.arc(fanCx, fanCy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let s = 0; s < 16; s++) {
    const a = (s * Math.PI * 2) / 16;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fanCx + Math.cos(a) * 24, fanCy + Math.sin(a) * 24);
    ctx.lineTo(fanCx + Math.cos(a) * fanR, fanCy + Math.sin(a) * fanR);
    ctx.stroke();
  }
  ctx.fillStyle = '#d4d2cb';
  ctx.beginPath();
  ctx.arc(fanCx, fanCy, 24, 0, Math.PI * 2);
  ctx.fill();

  // Logo Panasonic & nhãn Inverter bên phải
  ctx.fillStyle = '#0f2d6b';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Panasonic', 352, 118);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(354, 138, 122, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('INVERTER', 368, 158);

  // Tem năng lượng nhỏ
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(386, 184, 58, 72);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(392, 190, 46, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Tạo texture mặt sau dàn nóng điều hòa Panasonic (lưới tản nhiệt lá nhôm tối + khung trắng ngà)
 */
function createAcRearTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e2e1dc';
  ctx.fillRect(0, 0, 512, 384);

  // Ô lưới dàn ngưng tụ lớn phía sau
  ctx.fillStyle = '#334155';
  ctx.fillRect(36, 36, 390, 312);

  // Các nan lá tản nhiệt ngang
  ctx.fillStyle = '#64748b';
  for (let y = 44; y < 344; y += 12) {
    ctx.fillRect(42, y, 378, 4);
  }
  ctx.fillStyle = '#94a3b8';
  for (let x = 120; x < 410; x += 95) {
    ctx.fillRect(x, 36, 6, 312);
  }

  // Ô tem/vít bên phải
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(438, 48, 54, 90);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Xây dựng toàn bộ mô hình môi trường sân thượng 3D khớp theo 9 ảnh thực tế:
 * - (-Z) ĐÔNG: Gờ bê tông, ống bọc bạc, lan can inox 5 thanh, mái tôn, bồn nước nóng ISO 9001 + ống thủy tinh chân không
 * - (+Z) TÂY: Lối cửa cầu thang mở hất sang Đông (-Z), ô giếng thang phát sáng, song sắt bảo vệ, giếng trời lam chớp + mái che, bồn inox đứng, tường nhà & cửa sổ nhà hàng xóm
 * - (+X) NAM: Gờ + lan can inox chữ L, 3 ống PVC đứng góc Đông-Nam, bục bê tông kê gạch dự phòng
 * - (-X) BẮC: 2 cục nóng điều hòa Panasonic Inverter quay mặt về hệ thống
 */
export function createRooftopEnvironment() {
  const rooftopEnvGroup = new THREE.Group();
  rooftopEnvGroup.name = 'rooftopEnvironment';

  const geometries = [];
  const materials = [];
  const textures = [];
  const cutawayMaterials = [];

  const trackGeom = (g) => {
    geometries.push(g);
    return g;
  };
  const trackMat = (m, isCutaway = false) => {
    materials.push(m);
    if (isCutaway) cutawayMaterials.push(m);
    return m;
  };
  const trackTex = (t) => {
    textures.push(t);
    return t;
  };

  // --- TEXTURES & MATERIALS ---
  const tileTex = trackTex(createMarbleTileTexture());
  const concreteTex = trackTex(createWeatheredConcreteTexture(146, 151, 158));
  const darkConcreteTex = trackTex(createWeatheredConcreteTexture(102, 108, 118));
  const stuccoTex = trackTex(createWeatheredConcreteTexture(168, 174, 182));
  const { colorTex: roofColorTex, bumpTex: roofBumpTex } = createCorrugatedRoofTextures();
  trackTex(roofColorTex);
  trackTex(roofBumpTex);
  const tankTex = trackTex(createWaterTankTexture());
  const acFrontTex = trackTex(createAcFrontTexture());
  const acRearTex = trackTex(createAcRearTexture());

  const floorTileMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.34,
      metalness: 0.04
    })
  );
  const concreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.92,
      metalness: 0.04
    })
  );
  const darkConcreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: darkConcreteTex,
      roughness: 0.94,
      metalness: 0.05
    })
  );
  const westWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: stuccoTex,
      roughness: 0.9,
      metalness: 0.03
    }),
    true
  );
  const stainlessMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      metalness: 0.88,
      roughness: 0.22
    })
  );
  const steelFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.72,
      roughness: 0.42
    })
  );
  const insulatedPipeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.65,
      roughness: 0.38
    })
  );
  const pvcWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.48,
      metalness: 0.05
    })
  );
  const paintedWhiteMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      roughness: 0.42,
      metalness: 0.14
    })
  );
  const cageWhiteCutawayMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.45,
      metalness: 0.18
    }),
    true
  );
  const corrugatedRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: roofColorTex,
      bumpMap: roofBumpTex,
      bumpScale: 0.08,
      metalness: 0.55,
      roughness: 0.42
    })
  );
  const heaterTankBodyMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tankTex,
      metalness: 0.76,
      roughness: 0.24
    })
  );
  const standingTankMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.82,
      roughness: 0.25
    }),
    true
  );
  const standingTankBandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.35,
      roughness: 0.45
    }),
    true
  );
  const vacuumTubeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b1f3a,
      metalness: 0.45,
      roughness: 0.14
    })
  );
  const acWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe8e7e2,
      roughness: 0.46,
      metalness: 0.1
    })
  );
  const acFrontMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: acFrontTex,
      roughness: 0.4,
      metalness: 0.12
    })
  );
  const acRearMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: acRearTex,
      roughness: 0.55,
      metalness: 0.25
    })
  );
  const rubberFootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.88,
      metalness: 0.05
    })
  );
  const skylightRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.28
    })
  );
  const skylightCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.12,
      roughness: 0.65
    })
  );
  const louverWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.45,
      metalness: 0.12
    })
  );
  const stairwellWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
      metalness: 0.05
    }),
    true
  );
  const stairwellGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xbaf2ef,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.55,
      roughness: 0.28
    })
  );
  const doorGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.42,
      roughness: 0.18,
      metalness: 0.08,
      transmission: 0.25
    })
  );
  const neighborWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3f2419,
      roughness: 0.72,
      metalness: 0.12
    }),
    true
  );
  const neighborFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x26150e,
      roughness: 0.78,
      metalness: 0.1
    }),
    true
  );

  // ===========================================================================
  // 1. SÀN GẠCH SÂN THƯỢNG (Y = -0.005) & VIỀN ĐẾ DIORAMA
  // X ∈ [-4.85, +4.30], Z ∈ [-2.52, +4.55]
  // ===========================================================================
  const slabMesh = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(9.15, 0.34, 7.07)), floorTileMat);
  slabMesh.position.set(-0.275, -0.175, 1.015);
  slabMesh.receiveShadow = true;
  rooftopEnvGroup.add(slabMesh);

  // Lớp bê tông đỡ dưới mặt gạch giúp khối diorama nhìn chắc chắn từ mọi góc
  const slabSkirt = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(9.21, 0.26, 7.13)), darkConcreteMat);
  slabSkirt.position.set(-0.275, -0.225, 1.015);
  slabSkirt.receiveShadow = true;
  rooftopEnvGroup.add(slabSkirt);

  // ===========================================================================
  // 2. GỜ BÊ TÔNG BAO QUANH, BỤC KÊ GẠCH & ĐƯỜNG ỐNG KỸ THUẬT
  // ===========================================================================
  // Gờ bê tông phía Đông (-Z)
  const eastCurb = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(9.15, 0.52, 0.36)), concreteMat);
  eastCurb.position.set(-0.275, 0.26, -2.34);
  eastCurb.castShadow = true;
  eastCurb.receiveShadow = true;
  rooftopEnvGroup.add(eastCurb);

  // Gờ bê tông phía Nam (+X)
  const southCurb = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.36, 0.52, 7.07)), concreteMat);
  southCurb.position.set(4.14, 0.26, 1.015);
  southCurb.castShadow = true;
  southCurb.receiveShadow = true;
  rooftopEnvGroup.add(southCurb);

  // Gờ chắn nước thấp phía Bắc (-X)
  const northCurb = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.3, 0.22, 7.07)), concreteMat);
  northCurb.position.set(-4.7, 0.11, 1.015);
  northCurb.castShadow = true;
  northCurb.receiveShadow = true;
  rooftopEnvGroup.add(northCurb);

  // Đường ống bọc bảo ôn bạc chạy dọc chân gờ phía Đông từ cục nóng sang khối kỹ thuật
  const mainInsulatedCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0.26, -1.78),
    new THREE.Vector3(-2.6, 0.24, -1.96),
    new THREE.Vector3(-0.6, 0.27, -1.95),
    new THREE.Vector3(1.2, 0.29, -1.97),
    new THREE.Vector3(2.4, 0.31, -2.02),
    new THREE.Vector3(3.65, 0.28, -2.02)
  ]);
  const mainInsulatedPipe = new THREE.Mesh(
    trackGeom(new THREE.TubeGeometry(mainInsulatedCurve, 48, 0.092, 12, false)),
    insulatedPipeMat
  );
  mainInsulatedPipe.castShadow = true;
  mainInsulatedPipe.receiveShadow = true;
  rooftopEnvGroup.add(mainInsulatedPipe);

  const secInsulatedCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.9, 0.16, -1.86),
    new THREE.Vector3(-1.4, 0.15, -2.02),
    new THREE.Vector3(1.8, 0.17, -2.04)
  ]);
  const secInsulatedPipe = new THREE.Mesh(
    trackGeom(new THREE.TubeGeometry(secInsulatedCurve, 32, 0.058, 10, false)),
    insulatedPipeMat
  );
  secInsulatedPipe.castShadow = true;
  rooftopEnvGroup.add(secInsulatedPipe);

  // Khối trụ kỹ thuật bê tông & 3 tấm gạch xếp chồng phía sau tấm Cố định (X = 2.38, Z = -1.74)
  const utilityBlock = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.92, 1.08, 0.88)), darkConcreteMat);
  utilityBlock.position.set(2.38, 0.54, -1.74);
  utilityBlock.castShadow = true;
  utilityBlock.receiveShadow = true;
  rooftopEnvGroup.add(utilityBlock);

  [
    { y: 1.102, dx: 0.0, dz: 0.0, rot: 0.02 },
    { y: 1.148, dx: 0.02, dz: -0.015, rot: -0.01 },
    { y: 1.194, dx: -0.015, dz: 0.02, rot: 0.03 }
  ].forEach((tile) => {
    const spareTile = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.16, 0.04, 1.12)), floorTileMat);
    spareTile.position.set(2.38 + tile.dx, tile.y, -1.74 + tile.dz);
    spareTile.rotation.y = tile.rot;
    spareTile.castShadow = true;
    spareTile.receiveShadow = true;
    rooftopEnvGroup.add(spareTile);
  });

  // 3 Ống PVC trắng cao ở góc Đông-Nam (Ảnh 5, 6, 7, 9)
  const pvcCornerRisers = [
    { topX: 3.66, topZ: -1.94, h: 5.15 },
    { topX: 3.74, topZ: -2.02, h: 5.42 },
    { topX: 3.82, topZ: -1.92, h: 5.6 }
  ];
  pvcCornerRisers.forEach((p) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p.topX - 0.14, 0.24, -1.98),
      new THREE.Vector3(p.topX - 0.04, 0.42, -1.97),
      new THREE.Vector3(p.topX, 1.6, -1.97),
      new THREE.Vector3(p.topX, p.h, p.topZ)
    ]);
    const tube = new THREE.Mesh(trackGeom(new THREE.TubeGeometry(curve, 24, 0.042, 10, false)), pvcWhiteMat);
    tube.castShadow = true;
    rooftopEnvGroup.add(tube);

    const topCap = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.056, 0.056, 0.09, 12)), pvcWhiteMat);
    topCap.position.set(p.topX, p.h + 0.03, p.topZ);
    rooftopEnvGroup.add(topCap);
  });

  // Vòng kẹp cố định bó 3 ống PVC vào lan can góc
  const pvcTieBand = new THREE.Mesh(trackGeom(new THREE.TorusGeometry(0.14, 0.015, 8, 20)), rubberFootMat);
  pvcTieBand.rotation.x = Math.PI / 2;
  pvcTieBand.position.set(3.74, 3.05, -1.96);
  rooftopEnvGroup.add(pvcTieBand);

  // ===========================================================================
  // 3. LAN CAN INOX 5 THANH NGANG CHỮ L (PHÍA ĐÔNG -Z & PHÍA NAM +X)
  // ===========================================================================
  const handrailY = 3.05;
  const railBarLevels = [0.92, 1.35, 1.78, 2.21, 2.64];

  // Tay vịn tròn trên cùng (Đông + Nam + Khớp góc)
  const eastLen = 8.89; // -4.75 .. +4.14
  const eastTopRail = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(0.068, 0.068, eastLen, 20)),
    stainlessMat
  );
  eastTopRail.rotation.z = Math.PI / 2;
  eastTopRail.position.set(-0.305, handrailY, -2.34);
  eastTopRail.castShadow = true;
  rooftopEnvGroup.add(eastTopRail);

  const southLen = 6.79; // -2.34 .. +4.45
  const southTopRail = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(0.068, 0.068, southLen, 20)),
    stainlessMat
  );
  southTopRail.rotation.x = Math.PI / 2;
  southTopRail.position.set(4.14, handrailY, 1.055);
  southTopRail.castShadow = true;
  rooftopEnvGroup.add(southTopRail);

  const seCornerJoint = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.072, 16, 16)), stainlessMat);
  seCornerJoint.position.set(4.14, handrailY, -2.34);
  rooftopEnvGroup.add(seCornerJoint);

  // 5 thanh inox tròn nằm ngang
  railBarLevels.forEach((ry) => {
    const eastBar = new THREE.Mesh(
      trackGeom(new THREE.CylinderGeometry(0.024, 0.024, eastLen, 14)),
      stainlessMat
    );
    eastBar.rotation.z = Math.PI / 2;
    eastBar.position.set(-0.305, ry, -2.34);
    eastBar.castShadow = true;
    rooftopEnvGroup.add(eastBar);

    const southBar = new THREE.Mesh(
      trackGeom(new THREE.CylinderGeometry(0.024, 0.024, southLen, 14)),
      stainlessMat
    );
    southBar.rotation.x = Math.PI / 2;
    southBar.position.set(4.14, ry, 1.055);
    southBar.castShadow = true;
    rooftopEnvGroup.add(southBar);
  });

  // Trụ đứng vuông lan can inox
  const postHeight = handrailY - 0.52;
  const postGeom = trackGeom(new THREE.BoxGeometry(0.085, postHeight, 0.085));
  const railingPostCoords = [
    [-4.7, -2.34],
    [-2.45, -2.34],
    [-0.25, -2.34],
    [1.95, -2.34],
    [4.14, -2.34],
    [4.14, -0.1],
    [4.14, 2.15],
    [4.14, 4.4]
  ];
  railingPostCoords.forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeom, stainlessMat);
    post.position.set(px, 0.52 + postHeight / 2, pz);
    post.castShadow = true;
    rooftopEnvGroup.add(post);
  });

  // 4 cột thép mảnh góc ngoài & thanh giằng mảnh trên cao (không chắn tầm nhìn Toàn cảnh)
  const cornerTallGeom = trackGeom(new THREE.BoxGeometry(0.04, 5.45, 0.04));
  [
    [-4.72, -2.34],
    [4.14, -2.34],
    [4.14, 4.42]
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(cornerTallGeom, steelFrameMat);
    col.position.set(cx, 2.725, cz);
    rooftopEnvGroup.add(col);
  });

  const topPerimeterEast = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(8.88, 0.03, 0.03)), steelFrameMat);
  topPerimeterEast.position.set(-0.29, 5.45, -2.34);
  const topPerimeterSouth = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.03, 0.03, 6.78)), steelFrameMat);
  topPerimeterSouth.position.set(4.14, 5.45, 1.04);
  rooftopEnvGroup.add(topPerimeterEast, topPerimeterSouth);

  // ===========================================================================
  // 4. PHÍA ĐÔNG (-Z): MÁI TÔN SÓNG & BÌNH NƯỚC NÓNG NĂNG LƯỢNG MẶT TRỜI (ISO 9001)
  // ===========================================================================
  const eastRoofSlopeAngle = THREE.MathUtils.degToRad(7.8);
  const eastRoof = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(9.4, 0.08, 3.65)), corrugatedRoofMat);
  eastRoof.position.set(-0.4, -0.14, -4.3);
  eastRoof.rotation.x = -eastRoofSlopeAngle;
  eastRoof.receiveShadow = true;
  rooftopEnvGroup.add(eastRoof);

  // Xà gồ thép đỡ mái tôn phía Đông
  const purlinGeom = trackGeom(new THREE.BoxGeometry(9.4, 0.08, 0.08));
  [-2.9, -4.3, -5.7].forEach((pz) => {
    const py = -0.18 + (pz + 4.3) * Math.tan(eastRoofSlopeAngle);
    const purlin = new THREE.Mesh(purlinGeom, steelFrameMat);
    purlin.position.set(-0.4, py, pz);
    rooftopEnvGroup.add(purlin);
  });

  // Bồn nước nóng năng lượng mặt trời nằm ngang phía Đông (X = -1.15, Y = 2.65, Z = -4.25)
  const heaterGroup = new THREE.Group();
  heaterGroup.position.set(-1.15, 0, -4.25);
  rooftopEnvGroup.add(heaterGroup);

  const tankY = 2.65;
  const tankRadius = 1.08;
  const tankLen = 3.65;

  const tankCylinder = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(tankRadius, tankRadius, tankLen, 40, 1)),
    heaterTankBodyMat
  );
  tankCylinder.rotation.z = Math.PI / 2;
  tankCylinder.rotation.x = Math.PI; // Xoay để tem "ISO 9001" quay mặt về sân (+Z)
  tankCylinder.position.y = tankY;
  tankCylinder.castShadow = true;
  tankCylinder.receiveShadow = true;
  heaterGroup.add(tankCylinder);

  // Hai nắp chỏm cầu hai đầu bồn inox
  const endCapGeom = trackGeom(new THREE.SphereGeometry(tankRadius, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2));
  const capNorth = new THREE.Mesh(endCapGeom, stainlessMat);
  capNorth.scale.set(1, 0.36, 1);
  capNorth.rotation.z = Math.PI / 2;
  capNorth.position.set(-tankLen / 2, tankY, 0);
  capNorth.castShadow = true;

  const capSouth = new THREE.Mesh(endCapGeom, stainlessMat);
  capSouth.scale.set(1, 0.36, 1);
  capSouth.rotation.z = -Math.PI / 2;
  capSouth.position.set(tankLen / 2, tankY, 0);
  capSouth.castShadow = true;
  heaterGroup.add(capNorth, capSouth);

  // 6 vòng đai gân gia cường thân bồn inox
  const bandRingGeom = trackGeom(new THREE.TorusGeometry(tankRadius + 0.015, 0.024, 10, 36));
  [-1.75, -1.05, -0.35, 0.35, 1.05, 1.75].forEach((bx) => {
    const band = new THREE.Mesh(bandRingGeom, stainlessMat);
    band.rotation.y = Math.PI / 2;
    band.position.set(bx, tankY, 0);
    heaterGroup.add(band);
  });

  // Nắp thăm bồn & ống thông hơi trên đỉnh bồn
  const hatchLid = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(0.28, 0.3, 0.09, 24)),
    stainlessMat
  );
  hatchLid.position.set(-0.75, tankY + tankRadius + 0.02, 0.12);
  hatchLid.castShadow = true;

  const breatherPipe = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(0.036, 0.036, 0.36, 12)),
    rubberFootMat
  );
  breatherPipe.position.set(1.2, tankY + tankRadius + 0.14, 0.05);
  heaterGroup.add(hatchLid, breatherPipe);

  // Khung chân chữ V / chữ A inox đỡ bồn nước nóng đứng trên mái tôn
  [-1.32, 1.32].forEach((sx) => {
    const legA = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 2.45, 0.08)), stainlessMat);
    legA.position.set(sx, 1.0, 0.65);
    legA.rotation.x = 0.28;
    legA.castShadow = true;

    const legB = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 2.65, 0.08)), stainlessMat);
    legB.position.set(sx, 0.92, -0.68);
    legB.rotation.x = -0.26;
    legB.castShadow = true;

    const cradleBar = new THREE.Mesh(
      trackGeom(new THREE.TorusGeometry(tankRadius + 0.04, 0.042, 8, 24, Math.PI * 0.78)),
      stainlessMat
    );
    cradleBar.rotation.y = Math.PI / 2;
    cradleBar.rotation.z = -Math.PI * 0.89;
    cradleBar.position.set(sx, tankY, 0);

    const crossTie = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.06, 0.06, 1.45)), stainlessMat);
    crossTie.position.set(sx, 0.72, 0);

    heaterGroup.add(legA, legB, cradleBar, crossTie);
  });

  const tankLongTieFront = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.75, 0.06, 0.06)), stainlessMat);
  tankLongTieFront.position.set(0, 0.72, 0.68);
  const tankLongTieBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.75, 0.06, 0.06)), stainlessMat);
  tankLongTieBack.position.set(0, 0.72, -0.68);
  heaterGroup.add(tankLongTieFront, tankLongTieBack);

  // Dàn ống thủy tinh chân không thu nhiệt bên cạnh (phía Đông-Bắc bồn)
  const collectorGroup = new THREE.Group();
  collectorGroup.position.set(-3.85, 0.65, -4.35);
  rooftopEnvGroup.add(collectorGroup);

  const manifoldBox = new THREE.Mesh(
    trackGeom(new RoundedBoxGeometry(1.75, 0.24, 0.24, 2, 0.03)),
    stainlessMat
  );
  manifoldBox.position.set(0, 0.62, 0.55);
  manifoldBox.castShadow = true;
  collectorGroup.add(manifoldBox);

  const vacTubeGeom = trackGeom(new THREE.CylinderGeometry(0.046, 0.046, 2.05, 16));
  for (let i = 0; i < 12; i++) {
    const tx = -0.78 + i * 0.142;
    const tube = new THREE.Mesh(vacTubeGeom, vacuumTubeMat);
    tube.rotation.x = Math.PI * 0.36;
    tube.position.set(tx, 0.15, -0.35);
    tube.castShadow = true;
    collectorGroup.add(tube);
  }

  // Ống cấp/thoát PVC từ đầu Nam bình nước nóng chạy sang lan can góc Đông-Nam
  const tankPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.95, 1.88, -4.25),
    new THREE.Vector3(2.35, 1.65, -3.55),
    new THREE.Vector3(3.62, 1.35, -2.28),
    new THREE.Vector3(3.66, 0.35, -1.96)
  ]);
  const tankFeedPipe = new THREE.Mesh(
    trackGeom(new THREE.TubeGeometry(tankPipeCurve, 24, 0.038, 10, false)),
    pvcWhiteMat
  );
  tankFeedPipe.castShadow = true;
  rooftopEnvGroup.add(tankFeedPipe);

  // ===========================================================================
  // 5. PHÍA BẮC (-X): 2 CỤC NÓNG ĐIỀU HÒA PANASONIC INVERTER
  // ===========================================================================
  [-0.55, 1.65].forEach((acZ) => {
    const acGroup = new THREE.Group();
    acGroup.position.set(-4.36, 0.08, acZ);

    const acMaterials = [
      acFrontMat, // +X (quay mặt quạt & logo về hướng Nam/+X phía giàn Tracker)
      acRearMat,  // -X (lưới lá tản nhiệt dàn nóng phía sau)
      acWhiteMat, // +Y
      acWhiteMat, // -Y
      acWhiteMat, // +Z
      acWhiteMat  // -Z
    ];
    const acBody = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.84, 1.68, 1.98)), acMaterials);
    acBody.position.y = 0.84;
    acBody.castShadow = true;
    acBody.receiveShadow = true;
    acGroup.add(acBody);

    // 4 chân đế cao su chống rung
    const footGeom = trackGeom(new THREE.BoxGeometry(0.76, 0.08, 0.14));
    [-0.78, 0.78].forEach((fz) => {
      const foot = new THREE.Mesh(footGeom, rubberFootMat);
      foot.position.set(0, -0.04, fz);
      acGroup.add(foot);
    });

    // Cụm van gas & rắc-co đồng bên hông (-Z)
    const valveCover = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.28, 0.42, 0.08)), rubberFootMat);
    valveCover.position.set(0.18, 0.38, -1.0);
    acGroup.add(valveCover);

    rooftopEnvGroup.add(acGroup);
  });

  // ===========================================================================
  // 6. PHÍA TÂY (+Z): CỬA SÂN THƯỢNG MỞ SANG ĐÔNG, GIẾNG THANG SÁNG & GIẾNG TRỜI
  // ===========================================================================
  const westDoorGroup = new THREE.Group();
  rooftopEnvGroup.add(westDoorGroup);

  // Khung bao cửa trắng cao X ∈ [+1.55, +4.05], Z = +4.45
  const leftJamb = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.18, 5.15, 0.24)), paintedWhiteMetalMat);
  leftJamb.position.set(1.64, 2.575, 4.46);
  leftJamb.castShadow = true;

  const rightJamb = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.18, 5.15, 0.24)), paintedWhiteMetalMat);
  rightJamb.position.set(3.96, 2.575, 4.46);
  rightJamb.castShadow = true;

  const topLintel = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.5, 0.22, 0.24)), paintedWhiteMetalMat);
  topLintel.position.set(2.8, 5.04, 4.46);
  topLintel.castShadow = true;

  // Mái hắt bê tông mỏng phía trên lồng cửa thang
  const doorCanopy = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.88, 0.14, 2.5)), paintedWhiteMetalMat);
  doorCanopy.position.set(2.8, 5.26, 5.3);
  doorCanopy.castShadow = true;
  doorCanopy.receiveShadow = true;

  const canopyFascia = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.9, 0.08, 0.08)), skylightRoofMat);
  canopyFascia.position.set(2.8, 5.26, 4.05);

  westDoorGroup.add(leftJamb, rightJamb, topLintel, doorCanopy, canopyFascia);

  // Lồng song sắt bảo vệ giếng thang phía sau cửa (Z ∈ [4.55, 6.32])
  const rearBarGeomV = trackGeom(new THREE.BoxGeometry(0.036, 4.95, 0.036));
  for (let bx = 1.75; bx <= 3.85; bx += 0.35) {
    const bar = new THREE.Mesh(rearBarGeomV, cageWhiteCutawayMat);
    bar.position.set(bx, 2.55, 6.32);
    westDoorGroup.add(bar);
  }
  const rearBarGeomH = trackGeom(new THREE.BoxGeometry(2.45, 0.036, 0.036));
  for (let by = 1.05; by <= 4.7; by += 0.55) {
    const bar = new THREE.Mesh(rearBarGeomH, cageWhiteCutawayMat);
    bar.position.set(2.8, by, 6.32);
    westDoorGroup.add(bar);
  }
  const sideBarGeomH = trackGeom(new THREE.BoxGeometry(0.036, 0.036, 1.85));
  for (let by = 1.05; by <= 4.7; by += 0.55) {
    const northBar = new THREE.Mesh(sideBarGeomH, cageWhiteCutawayMat);
    northBar.position.set(1.62, by, 5.4);
    const southBar = new THREE.Mesh(sideBarGeomH, cageWhiteCutawayMat);
    southBar.position.set(3.98, by, 5.4);
    westDoorGroup.add(northBar, southBar);
  }
  const topCageBarGeom = trackGeom(new THREE.BoxGeometry(2.38, 0.036, 0.036));
  for (let bz = 4.65; bz <= 6.2; bz += 0.3) {
    const bar = new THREE.Mesh(topCageBarGeom, cageWhiteCutawayMat);
    bar.position.set(2.8, 5.12, bz);
    westDoorGroup.add(bar);
  }

  // Hai cột hậu góc sau lồng thang
  const rearPostL = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.14, 5.15, 0.14)), cageWhiteCutawayMat);
  rearPostL.position.set(1.62, 2.575, 6.32);
  const rearPostR = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.14, 5.15, 0.14)), cageWhiteCutawayMat);
  rearPostR.position.set(3.98, 2.575, 6.32);
  westDoorGroup.add(rearPostL, rearPostR);

  // Ô sáng giếng thang tầng dưới & vách lồng cầu thang bên trong cửa (Ảnh 1-8)
  const stairwellBox = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.98, 0.1, 1.62)), stairwellGlowMat);
  stairwellBox.position.set(2.8, 0.01, 5.42);
  westDoorGroup.add(stairwellBox);

  // Vách lồng thang phía sau & bên cạnh cao tầm 2.3m (phía trên là khung song sắt thoáng)
  const stairInnerBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.26, 2.15, 0.08)), stairwellWallMat);
  stairInnerBack.position.set(2.8, 1.075, 6.26);
  const stairInnerSide = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 2.15, 1.72)), stairwellWallMat);
  stairInnerSide.position.set(1.66, 1.075, 5.4);
  westDoorGroup.add(stairInnerBack, stairInnerSide);

  const stairwellLight = new THREE.PointLight(0x7dd3fc, 0.75, 6.0, 1.6);
  stairwellLight.position.set(2.8, 1.15, 5.25);
  westDoorGroup.add(stairwellLight);

  // Bậc ngưỡng cửa trắng dưới chân
  const threshold = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.45, 0.08, 0.24)), paintedWhiteMetalMat);
  threshold.position.set(2.8, 0.04, 4.46);
  westDoorGroup.add(threshold);

  // CÁNH CỬA NHÔM KÍNH TRẮNG: Bản lề tại cạnh Nam (+X = 3.88, Z = 4.46), mở ra sân phía Đông (-Z) ~84°
  const doorHingeGroup = new THREE.Group();
  doorHingeGroup.position.set(3.88, 0.04, 4.46);
  // Theo quy tắc bàn tay phải quanh +Y: vec(-L,0,0) xoay góc âm sẽ vươn về -Z (hướng Đông)
  doorHingeGroup.rotation.y = -THREE.MathUtils.degToRad(84);
  westDoorGroup.add(doorHingeGroup);

  const dW = 2.12;
  const dH = 4.86;
  const dT = 0.075;

  // Khung ngoài cánh cửa (đố dọc ngoài, đố dọc bản lề, đố trên, đố đáy)
  const hingeStile = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.15, dH, dT)), paintedWhiteMetalMat);
  hingeStile.position.set(-0.075, dH / 2, 0);
  hingeStile.castShadow = true;

  const latchStile = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.16, dH, dT)), paintedWhiteMetalMat);
  latchStile.position.set(-dW + 0.08, dH / 2, 0);
  latchStile.castShadow = true;

  const topRail = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(dW, 0.16, dT)), paintedWhiteMetalMat);
  topRail.position.set(-dW / 2, dH - 0.08, 0);
  topRail.castShadow = true;

  const bottomRail = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(dW, 0.24, dT)), paintedWhiteMetalMat);
  bottomRail.position.set(-dW / 2, 0.12, 0);
  bottomRail.castShadow = true;

  // Đố chia ô kính theo đúng tỉ lệ cửa thực tế (Ảnh 1)
  const transomUpper = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.16, 0.12, dT)), paintedWhiteMetalMat);
  transomUpper.position.set(-1.38, 3.82, 0);

  const transomLower = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.82, 0.11, dT)), paintedWhiteMetalMat);
  transomLower.position.set(-dW / 2, 0.72, 0);

  const innerVertMid = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.11, 4.46, dT)), paintedWhiteMetalMat);
  innerVertMid.position.set(-0.78, 2.48, 0);

  const innerVertLeft = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.1, 3.1, dT)), paintedWhiteMetalMat);
  innerVertLeft.position.set(-1.36, 2.27, 0);

  // Kính mờ trong khung cánh cửa
  const glassTopLeft = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.1, 0.84, 0.02)), doorGlassMat);
  glassTopLeft.position.set(-1.38, 4.3, 0);
  const glassTallOuter = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.48, 3.0, 0.02)), doorGlassMat);
  glassTallOuter.position.set(-1.68, 2.26, 0);
  const glassTallMid = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.46, 3.0, 0.02)), doorGlassMat);
  glassTallMid.position.set(-1.07, 2.26, 0);
  const glassSideFull = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.56, 3.88, 0.02)), doorGlassMat);
  glassSideFull.position.set(-0.44, 2.75, 0);
  const glassBottom = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.8, 0.42, 0.02)), doorGlassMat);
  glassBottom.position.set(-dW / 2, 0.46, 0);

  // 3 bản lề trắng bên cạnh cố định & bộ khóa tay gạt inox trên cả hai mặt cạnh khóa
  [0.85, 2.45, 4.05].forEach((hy) => {
    const hinge = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10)), stainlessMat);
    hinge.position.set(0, hy, -dT / 2);
    doorHingeGroup.add(hinge);
  });

  const lockPlate = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.09, 0.58, 0.11)), steelFrameMat);
  lockPlate.position.set(-dW + 0.09, 1.98, 0);
  const handleF = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 0.045, 0.05)), stainlessMat);
  handleF.position.set(-dW + 0.2, 2.1, -0.075);
  const handleB = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 0.045, 0.05)), stainlessMat);
  handleB.position.set(-dW + 0.2, 2.1, 0.075);

  doorHingeGroup.add(
    hingeStile,
    latchStile,
    topRail,
    bottomRail,
    transomUpper,
    transomLower,
    innerVertMid,
    innerVertLeft,
    glassTopLeft,
    glassTallOuter,
    glassTallMid,
    glassSideFull,
    glassBottom,
    lockPlate,
    handleF,
    handleB
  );

  // GIẾNG TRỜI (PHÍA TÂY-BẮC CẠNH CỬA SÂN THƯỢNG): Bệ bê tông + hộp lam chớp trắng + mái phẳng đua rộng
  const skylightGroup = new THREE.Group();
  rooftopEnvGroup.add(skylightGroup);

  const skylightBase = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.6, 0.55, 1.95)), concreteMat);
  skylightBase.position.set(-1.05, 0.275, 5.42);
  skylightBase.castShadow = true;
  skylightBase.receiveShadow = true;
  skylightGroup.add(skylightBase);

  // Lõi sáng bên trong giếng trời
  const skylightCore = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.15, 1.58, 1.38)), skylightCoreMat);
  skylightCore.position.set(-0.85, 1.38, 5.25);
  skylightGroup.add(skylightCore);

  // 4 cột góc khung giếng trời màu trắng
  const skyCornerGeom = trackGeom(new THREE.BoxGeometry(0.11, 1.72, 0.11));
  [
    [-1.98, 4.52],
    [0.28, 4.52],
    [-1.98, 5.98],
    [0.28, 5.98]
  ].forEach(([sx, sz]) => {
    const corner = new THREE.Mesh(skyCornerGeom, paintedWhiteMetalMat);
    corner.position.set(sx, 1.41, sz);
    corner.castShadow = true;
    skylightGroup.add(corner);
  });

  // 10 thanh lam chớp ngang màu trắng trên mặt trước (-Z) và hai bên
  const louverFrontGeom = trackGeom(new THREE.BoxGeometry(2.26, 0.055, 0.12));
  const louverSideGeom = trackGeom(new THREE.BoxGeometry(0.12, 0.055, 1.48));
  for (let l = 0; l < 10; l++) {
    const ly = 0.66 + l * 0.155;
    const fLouver = new THREE.Mesh(louverFrontGeom, louverWhiteMat);
    fLouver.position.set(-0.85, ly, 4.5);
    fLouver.rotation.x = 0.35;
    fLouver.castShadow = true;

    const lLouver = new THREE.Mesh(louverSideGeom, louverWhiteMat);
    lLouver.position.set(-2.0, ly, 5.25);
    lLouver.rotation.z = -0.35;

    const rLouver = new THREE.Mesh(louverSideGeom, louverWhiteMat);
    rLouver.position.set(0.3, ly, 5.25);
    rLouver.rotation.z = 0.35;

    skylightGroup.add(fLouver, lLouver, rLouver);
  }

  // Nắp mái che giếng trời vươn rộng hơi dốc về Đông (-Z) thoát nước mưa
  const skylightRoofLid = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(3.08, 0.08, 2.28)), skylightRoofMat);
  skylightRoofLid.position.set(-0.85, 2.28, 5.15);
  skylightRoofLid.rotation.x = THREE.MathUtils.degToRad(4.2);
  skylightRoofLid.castShadow = true;
  skylightRoofLid.receiveShadow = true;
  skylightGroup.add(skylightRoofLid);

  // BỒN NƯỚC INOX ĐỨNG PHÍA SAU GIẾNG TRỜI (Ảnh 1, 3, 4, 7, 8)
  const standingTankGroup = new THREE.Group();
  standingTankGroup.position.set(0.55, 2.38, 6.08);
  rooftopEnvGroup.add(standingTankGroup);

  const standTankCylinder = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(0.7, 0.7, 2.1, 32)),
    standingTankMat
  );
  standTankCylinder.position.y = 1.4;
  standTankCylinder.castShadow = true;

  // Các vòng gân inox dập nổi quanh thân bồn đứng
  const standRibGeom = trackGeom(new THREE.TorusGeometry(0.706, 0.014, 8, 32));
  [0.65, 1.05, 1.45, 1.85, 2.2].forEach((ry) => {
    const rib = new THREE.Mesh(standRibGeom, standingTankMat);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = ry;
    standingTankGroup.add(rib);
  });

  const standTankBand = new THREE.Mesh(
    trackGeom(new THREE.CylinderGeometry(0.708, 0.708, 0.14, 32, 1, true)),
    standingTankBandMat
  );
  standTankBand.position.y = 2.02;

  const standTankTop = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.64, 0.7, 0.14, 32)), standingTankMat);
  standTankTop.position.y = 2.52;

  const tankLegGeom = trackGeom(new THREE.BoxGeometry(0.08, 0.72, 0.08));
  [
    [-0.46, -0.46],
    [0.46, -0.46],
    [-0.46, 0.46],
    [0.46, 0.46]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(tankLegGeom, steelFrameMat);
    leg.position.set(lx, 0.15, lz);
    standingTankGroup.add(leg);
  });
  standingTankGroup.add(standTankCylinder, standTankBand, standTankTop);

  // TƯỜNG BAO PHÍA TÂY (+Z) & TƯỜNG NHÀ BÊN CẠNH CÓ CỬA SỔ NÂU (Cutaway vừa phải giúp nhìn rõ giếng trời từ Toàn cảnh)
  const westBackWall = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(6.4, 2.65, 0.24)), westWallMat);
  westBackWall.position.set(-1.65, 1.325, 6.52);
  westBackWall.castShadow = true;
  westBackWall.receiveShadow = true;
  rooftopEnvGroup.add(westBackWall);

  // Tường nhà hàng xóm bên Nam cửa thang (ảnh 1, 3, 4, 7 bên trái cửa trắng)
  const neighborWall = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.75, 4.65, 0.26)), westWallMat);
  neighborWall.position.set(4.85, 2.325, 4.92);
  neighborWall.castShadow = true;
  neighborWall.receiveShadow = true;
  rooftopEnvGroup.add(neighborWall);

  // Cửa sổ gỗ nâu nhỏ 4 ô trên tường nhà bên cạnh (mặt quay về -Z / Đông)
  const windowFrame = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.86, 1.02, 0.12)), neighborFrameMat);
  windowFrame.position.set(4.78, 2.55, 4.76);
  const windowInner = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.72, 0.88, 0.14)), neighborWindowMat);
  windowInner.position.set(4.78, 2.55, 4.75);
  const winMullionV = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.05, 0.88, 0.16)), neighborFrameMat);
  winMullionV.position.set(4.78, 2.55, 4.74);
  const winMullionH = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.72, 0.05, 0.16)), neighborFrameMat);
  winMullionH.position.set(4.78, 2.55, 4.74);
  rooftopEnvGroup.add(windowFrame, windowInner, winMullionV, winMullionH);

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    rooftopEnvGroup,
    cutawayMaterials,
    dispose
  };
}

