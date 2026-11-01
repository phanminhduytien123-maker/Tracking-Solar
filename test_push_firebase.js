// =========================================================================
// TEST SCRIPT: PUSH MOCK SOLAR TELEMETRY TO FIREBASE
// Mặc định ghi vào nhánh riêng /solar_mock, KHÔNG ghi vào /solar
// Gắn cờ source: "mock" trên mỗi bản ghi để Web phân biệt tuyệt đối
// =========================================================================

const DATABASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/";
const TARGET_PATH = "solar_mock"; // Đích mặc định: /solar_mock

async function clearMockFirebase() {
  console.log(`\n🧹 Đang xoá dữ liệu giả lập trên Firebase node /${TARGET_PATH}...`);
  try {
    const res = await fetch(`${DATABASE_URL}${TARGET_PATH}.json`, {
      method: "DELETE"
    });
    if (res.ok) {
      console.log(`✅ Đã xoá sạch dữ liệu giả lập trên /${TARGET_PATH}!`);
    } else {
      console.error("❌ Lỗi xoá dữ liệu:", res.status, res.statusText);
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối Firebase:", err.message);
  }
}

async function sendSinglePacket(customData = {}) {
  console.log(`\n🚀 Đang gửi 1 bộ dữ liệu GIẢ LẬP (source: 'mock') lên /${TARGET_PATH}...`);

  const timestamp = Date.now();

  // Dữ liệu Tấm 1: Dual-Axis Tracker (GIẢ LẬP)
  const trackingData = {
    source: "mock",       // Cờ phân biệt: dữ liệu ảo
    voltage: 19.45,       // Điện áp 19.45V
    current: 2.580,       // Dòng điện 2.58A
    power: 50.18,         // Công suất 50.18W
    dailyEnergy: 0.285,   // Sản lượng 0.285 kWh
    dailyEnergyWh: 285.0, // Sản lượng Wh
    phi: -14.8,
    epsilon: 52.8,
    azimuthAngle: 165.2,  // Góc phương vị 165.2°
    elevationAngle: 52.8, // Góc nâng 52.8°
    targetAzimuth: 165.5,
    targetElevation: 53.0,
    targetPhi: -14.5,
    targetEpsilon: 53.0,
    error_az_deg: 0.3,
    error_el_deg: 0.2,
    ldrTop: 3150,
    ldrBottom: 3120,
    ldrLeft: 3200,
    ldrRight: 3180,
    adc_saturated: false,
    light_state: "DAY",
    mode: "AUTO",
    state: "TRACKING",
    status: "TRACKING_ACTIVE",
    estop: false,
    lastUpdate: timestamp,
    ...customData.tracking
  };

  // Dữ liệu Tấm 2: Cố định Hướng Nam 180°, ngửa 75° (nghiêng 15°)
  const staticData = {
    source: "mock",       // Cờ phân biệt: dữ liệu ảo
    voltage: 17.80,       // Điện áp 17.80V
    current: 1.820,       // Dòng điện 1.82A
    power: 32.40,         // Công suất 32.40W
    dailyEnergy: 0.190,   // Sản lượng 0.190 kWh
    dailyEnergyWh: 190.0,
    fixed_az_deg: 180.0,
    fixed_tilt_beta_deg: 15.0,
    fixedAzimuth: 180.0,
    fixed_elevation_eps: 75.0,
    fixedElevation: 75.0,
    lastUpdate: timestamp,
    ...customData.static
  };

  const payload = {
    source: "mock",
    tracking: trackingData,
    static: staticData,
    algorithm: {
      source: "mock",
      algo_state: "RUNNING",
      name: "Fuzzy-PID & PSO (Mock Test)",
      kp: 2.65,
      ki: 0.08,
      kd: 0.72,
      psoBestFitness: 0.992,
      cost_j: 0.0382,
      psoIteration: 18,
      run_time_ms: 142
    }
  };

  try {
    const res = await fetch(`${DATABASE_URL}${TARGET_PATH}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`✅ Gửi thành công lên Firebase /${TARGET_PATH}!`);
      console.log("--------------------------------------------------");
      console.log(`⚠️  DỮ LIỆU GIẢ LẬP ĐƯỢC GẮN source='mock' TẠI /${TARGET_PATH}`);
      console.log(`☀️  Tấm Xoay:  ${trackingData.voltage}V | ${trackingData.current}A | ${trackingData.power}W | Góc: [Az: ${trackingData.azimuthAngle}°, El: ${trackingData.elevationAngle}°]`);
      console.log(`🔒 Tấm Cố Định: ${staticData.voltage}V | ${staticData.current}A | ${staticData.power}W (Hướng Nam 180°, ngửa 75°)`);
      console.log("--------------------------------------------------");
    } else {
      console.error("❌ Lỗi gửi:", res.status, res.statusText);
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối:", err.message);
  }
}

async function startStreamSimulation(durationSeconds = 60) {
  console.log(`\n🔄 BẮT ĐẦU MÔ PHỎNG GIẢ LẬP LIÊN TỤC TRONG ${durationSeconds}s VÀO /${TARGET_PATH}...`);

  let second = 0;
  let azimuth = 150.0;
  let elevation = 48.0;
  let energyTracking = 0.285;
  let energyStatic = 0.190;

  const interval = setInterval(async () => {
    second++;
    azimuth += 0.2;
    elevation += 0.1;

    const noise = (Math.random() - 0.5) * 0.05;
    const vTrk = +(19.2 + Math.random() * 0.4).toFixed(2);
    const iTrk = +(2.55 + noise).toFixed(3);
    const pTrk = +(vTrk * iTrk).toFixed(2);

    const vSta = +(17.6 + Math.random() * 0.3).toFixed(2);
    const iSta = +(1.80 + noise * 0.6).toFixed(3);
    const pSta = +(vSta * iSta).toFixed(2);

    energyTracking += (pTrk / 3600000);
    energyStatic += (pSta / 3600000);

    await sendSinglePacket({
      tracking: {
        voltage: vTrk,
        current: iTrk,
        power: pTrk,
        dailyEnergy: +energyTracking.toFixed(4),
        dailyEnergyWh: +(energyTracking * 1000).toFixed(1),
        azimuthAngle: +azimuth.toFixed(1),
        elevationAngle: +elevation.toFixed(1),
        ldrTop: Math.floor(3000 + Math.random() * 200),
        ldrBottom: Math.floor(3000 + Math.random() * 200),
        ldrLeft: Math.floor(3100 + Math.random() * 200),
        ldrRight: Math.floor(3100 + Math.random() * 200)
      },
      static: {
        voltage: vSta,
        current: iSta,
        power: pSta,
        dailyEnergy: +energyStatic.toFixed(4),
        dailyEnergyWh: +(energyStatic * 1000).toFixed(1)
      }
    });

    if (second >= durationSeconds) {
      clearInterval(interval);
      console.log(`\n🏁 Đã hoàn thành đợt mô phỏng ${durationSeconds} giây!`);
    }
  }, 1000);
}

// Xử lý tham số dòng lệnh
const arg = process.argv[2];

if (arg === '--clear') {
  clearMockFirebase();
} else if (arg === '--stream') {
  const duration = parseInt(process.argv[3]) || 30;
  startStreamSimulation(duration);
} else {
  sendSinglePacket();
}
