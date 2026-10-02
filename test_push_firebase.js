// =========================================================================
// TEST SCRIPT: PUSH REAL SOLAR TELEMETRY TO FIREBASE REALTIME DATABASE
// Sử dụng để kiểm tra kết nối từ máy tính lên Firebase & xem Web phản hồi
// =========================================================================

const DATABASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/";

async function clearFirebase() {
  console.log("\n🧹 Đang xoá toàn bộ dữ liệu cũ trên Firebase node /solar...");
  try {
    const res = await fetch(`${DATABASE_URL}solar.json`, {
      method: "DELETE"
    });
    if (res.ok) {
      console.log("✅ Đã xoá sạch dữ liệu ảo/cũ trên Firebase!");
    } else {
      console.error("❌ Lỗi xoá dữ liệu:", res.status, res.statusText);
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối Firebase:", err.message);
  }
}

async function sendSinglePacket(customData = {}) {
  console.log("\n🚀 Đang gửi 1 bộ dữ liệu mẫu lên Firebase...");

  const timestamp = Date.now();

  // Dữ liệu Tấm 1: Dual-Axis Tracker
  const trackingData = {
    voltage: 19.45,       // Điện áp 19.45V
    current: 2.580,       // Dòng điện 2.58A
    power: 50.18,         // Công suất 50.18W
    dailyEnergy: 0.285,   // Sản lượng 0.285 kWh
    azimuthAngle: 165.2,  // Góc phương vị 165.2°
    elevationAngle: 52.8, // Góc nâng 52.8°
    targetAzimuth: 165.5,
    targetElevation: 53.0,
    ldrTop: 3150,
    ldrBottom: 3120,
    ldrLeft: 3200,
    ldrRight: 3180,
    mode: "AUTO",
    status: "TRACKING_ACTIVE",
    estop: false,
    lastUpdate: timestamp,
    ...customData.tracking
  };

  // Dữ liệu Tấm 2: Cố định 15 độ hướng Nam (So sánh)
  const staticData = {
    voltage: 17.80,       // Điện áp 17.80V
    current: 1.820,       // Dòng điện 1.82A
    power: 32.40,         // Công suất 32.40W (Thấp hơn tấm xoay ~54.8%)
    dailyEnergy: 0.190,   // Sản lượng 0.190 kWh
    fixedAzimuth: 180.0,
    fixedElevation: 15.0,
    lastUpdate: timestamp,
    ...customData.static
  };

  const payload = {
    tracking: trackingData,
    static: staticData,
    algorithm: {
      name: "Fuzzy-PID & PSO",
      kp: 2.65,
      ki: 0.08,
      kd: 0.72,
      psoBestFitness: 0.992,
      psoIteration: 18
    }
  };

  try {
    const res = await fetch(`${DATABASE_URL}solar.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log("✅ Gửi thành công lên Firebase!");
      console.log("--------------------------------------------------");
      console.log(`☀️  Tấm Xoay:  ${trackingData.voltage}V | ${trackingData.current}A | ${trackingData.power}W | Góc: [Az: ${trackingData.azimuthAngle}°, El: ${trackingData.elevationAngle}°]`);
      console.log(`🔒 Tấm Cố Định: ${staticData.voltage}V | ${staticData.current}A | ${staticData.power}W`);
      const gain = (((trackingData.power - staticData.power) / staticData.power) * 100).toFixed(1);
      console.log(`📈 Hiệu suất chênh lệch: +${gain}% (Tấm xoay vượt trội hơn)`);
      console.log("--------------------------------------------------");
    } else {
      console.error("❌ Lỗi gửi:", res.status, res.statusText);
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối:", err.message);
  }
}

async function startStreamSimulation(durationSeconds = 60) {
  console.log(`\n🔄 BẮT ĐẦU CHẠY MÔ PHỎNG LIÊN TỤC TRONG ${durationSeconds} GIÂY (Mỗi 1s gửi 1 lần)...`);
  console.log("👉 Hãy mở Web Dashboard để quan sát các thông số nhảy trực tiếp!");

  let second = 0;
  let azimuth = 150.0;
  let elevation = 48.0;
  let energyTracking = 0.285;
  let energyStatic = 0.190;

  const interval = setInterval(async () => {
    second++;
    azimuth += 0.2;
    elevation += 0.1;

    // Giả lập dao động ánh sáng mặt trời tự nhiên
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
        dailyEnergy: +energyStatic.toFixed(4)
      }
    });

    if (second >= durationSeconds) {
      clearInterval(interval);
      console.log(`\n🏁 Đã hoàn thành đợt kiểm tra ${durationSeconds} giây!`);
    }
  }, 1000);
}

// Xử lý tham số dòng lệnh
const arg = process.argv[2];

if (arg === '--clear') {
  clearFirebase();
} else if (arg === '--stream') {
  const duration = parseInt(process.argv[3]) || 30;
  startStreamSimulation(duration);
} else {
  // Mặc định: gửi 1 gói
  sendSinglePacket();
}
