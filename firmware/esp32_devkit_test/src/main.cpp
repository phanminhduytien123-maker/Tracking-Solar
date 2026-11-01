// =========================================================================
// FIRMWARE ĐIỀU KHIỂN SOLAR TRACKER 2 TRỤC BẰNG THUẬT TOÁN PSO & FUZZY-PID
// Test Tương Tác: Rọi Đèn Flash Điện Thoại -> 2 Động Cơ Bước Tự Động Bám
// Đồng Bộ Thời Gian Thực Lên Web: https://tracking-solar.onrender.com/
// Bo Mạch: ESP32 DevKit V1 (ESP-WROOM-32)
// =========================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <Wire.h>
#include <INA226.h>

#include "config.h"

// -------------------------------------------------------------------------
// 1. ĐỊNH NGHĨA CHÂN NGOẠI VI (PHẦN CỨNG THỰC TẾ)
// -------------------------------------------------------------------------
// 2 Động cơ bước NEMA 23 + Driver DM556
#define M1_PUL_PIN        25    // Xung ĐC 1 (Azimuth - Xoay Ngang)
#define M1_DIR_PIN        26    // Hướng ĐC 1
#define M2_PUL_PIN        27    // Xung ĐC 2 (Elevation - Nâng Ngẩng)
#define M2_DIR_PIN        14    // Hướng ĐC 2

// 4 Cảm biến quang trở 3 chân S-V-G (ADC1 Pins an toàn khi bật WiFi)
#define LDR_TOP_PIN       34    // GPIO 34 (ADC1_CH6) - TRÊN (Top)
#define LDR_BOTTOM_PIN    35    // GPIO 35 (ADC1_CH7) - DƯỚI (Bottom)
#define LDR_LEFT_PIN      32    // GPIO 32 (ADC1_CH4) - TRÁI (Left)
#define LDR_RIGHT_PIN     33    // GPIO 33 (ADC1_CH5) - PHẢI (Right)

// -------------------------------------------------------------------------
// 2. THAM SỐ CƠ KHÍ & ĐIỀU KHIỂN BƯỚC
// -------------------------------------------------------------------------
const float DEGREES_PER_STEP = 0.225f; // 1 vòng 1600 bước -> 360 / 1600 = 0.225 độ/bước
const float DEADBAND_ERROR   = 0.040f; // Vùng chết sai số (|e| < 0.04 -> Dừng motor chống giật)
const int   MIN_DELAY_US     = 350;    // Tốc độ cao nhất (nửa chu kỳ xung micro-giây)
const int   MAX_DELAY_US     = 1400;   // Tốc độ êm dịu khi tiệm cận vùng chết

// Cờ đảo chiều quay (nếu đấu dây cuộn A/B ngược)
bool invertAzDir = false;
bool invertElDir = false;
bool isEStop     = false;

// Trạng thái góc ảo & xung (vì chưa có công tắc Home, test động cơ trần)
float curPhi     = 0.0f;    // Góc Azimuth (-90° đến +90°)
float curEpsilon = 45.0f;   // Góc Elevation (15° đến 85°)
int32_t azCommandPulses = 0;
int32_t elCommandPulses = 0;

// -------------------------------------------------------------------------
// 3. ĐỐI TƯỢNG VÀ BIẾN TOÀN CỤC
// -------------------------------------------------------------------------
FirebaseData   fbdo;
FirebaseAuth   auth;
FirebaseConfig fbConfig;

INA226 ina226(INA226_ADDR, &Wire);
bool inaFound = false;

// Đọc ADC 4 mắt
int rawTop = 0, rawBottom = 0, rawLeft = 0, rawRight = 0;
float esAz = 0.0f; // Sai số quang Azimuth = (L - R) / (L + R)
float esEl = 0.0f; // Sai số quang Elevation = (T - B) / (T + B)
int totalLux = 0;
bool isSaturated = false;

// Sai số vòng trước để tính đạo hàm de/dt
float prevEsAz = 0.0f;
float prevEsEl = 0.0f;
unsigned long lastInnerLoopTime = 0;
const unsigned long INNER_LOOP_MS = 25; // Vòng trong 40Hz (25ms) phát xung động cơ

unsigned long lastTelemetryTime = 0;

// -------------------------------------------------------------------------
// 4. MÔ HÌNH THUẬT TOÁN TỐI ƯU HÓA BẦY ĐÀN (PSO) ONLINE TRÊN RAM
// -------------------------------------------------------------------------
struct PsoParams {
  float kp;
  float ki;
  float kd;
  float cost;
};

// Cấu hình bầy đàn PSO
const int PSO_SWARM_SIZE      = 10;
const int PSO_MAX_ITER        = 20;
const float PSO_W_INERTIA     = 0.729f;
const float PSO_C1_COG        = 1.494f;
const float PSO_C2_SOC        = 1.494f;

// Bộ thông số tối ưu tốt nhất tìm được từ PSO
PsoParams gBestAz = { 2.40f, 0.08f, 0.65f, 0.038f };
PsoParams gBestEl = { 2.80f, 0.10f, 0.75f, 0.042f };
uint32_t psoRunTimeMs = 45;
int psoCurrentIter = 20;

// Hàm đánh giá hàm mục tiêu chi phí (Fitness Function) trên mô hình mô phỏng nhanh
float evaluateFitness(float kp, float ki, float kd) {
  float simError = 1.0f;
  float simIntegral = 0.0f;
  float simPrevError = 1.0f;
  float totalCost = 0.0f;
  float dt = 0.02f;

  for (int k = 1; k <= 50; k++) {
    float deriv = (simError - simPrevError) / dt;
    simIntegral += simError * dt;
    float u = kp * simError + ki * simIntegral + kd * deriv;
    u = constrain(u, -3.0f, 3.0f);

    // Mô hình đáp ứng góc của động cơ bước + quang sai (khâu tích phân bậc 1)
    simPrevError = simError;
    simError -= u * 0.15f * dt;

    // Chi phí ITAE (Integral Time Absolute Error) + phạt Overshoot
    totalCost += (k * dt) * abs(simError) * dt;
    if (simError < 0) totalCost += 10.0f * abs(simError); // Phạt lố đích
  }
  return totalCost;
}

// Thuật toán PSO chạy tìm bộ [Kp, Ki, Kd] tối ưu trong RAM
void runPsoOptimization() {
  unsigned long startT = millis();
  Serial.println("\n>>> [PSO] Đang chạy thuật toán tối ưu hóa bầy đàn trong RAM...");

  float pPos[PSO_SWARM_SIZE][3]; // [Kp, Ki, Kd]
  float pVel[PSO_SWARM_SIZE][3];
  float pBestPos[PSO_SWARM_SIZE][3];
  float pBestCost[PSO_SWARM_SIZE];

  // 1. Khởi tạo bầy hạt ngẫu nhiên quanh vùng lân cận nghiệm
  for (int i = 0; i < PSO_SWARM_SIZE; i++) {
    pPos[i][0] = 1.5f + (float)random(0, 300) / 100.0f; // Kp: 1.5 -> 4.5
    pPos[i][1] = 0.02f + (float)random(0, 20) / 100.0f; // Ki: 0.02 -> 0.22
    pPos[i][2] = 0.3f + (float)random(0, 150) / 100.0f; // Kd: 0.3 -> 1.8

    pVel[i][0] = 0.0f;
    pVel[i][1] = 0.0f;
    pVel[i][2] = 0.0f;

    pBestCost[i] = evaluateFitness(pPos[i][0], pPos[i][1], pPos[i][2]);
    pBestPos[i][0] = pPos[i][0];
    pBestPos[i][1] = pPos[i][1];
    pBestPos[i][2] = pPos[i][2];

    if (pBestCost[i] < gBestAz.cost) {
      gBestAz.cost = pBestCost[i];
      gBestAz.kp = pPos[i][0];
      gBestAz.ki = pPos[i][1];
      gBestAz.kd = pPos[i][2];
    }
  }

  // 2. Vòng lặp cập nhật vận tốc và tọa độ hạt
  for (int iter = 0; iter < PSO_MAX_ITER; iter++) {
    for (int i = 0; i < PSO_SWARM_SIZE; i++) {
      for (int d = 0; d < 3; d++) {
        float r1 = (float)random(0, 1000) / 1000.0f;
        float r2 = (float)random(0, 1000) / 1000.0f;
        pVel[i][d] = PSO_W_INERTIA * pVel[i][d]
                   + PSO_C1_COG * r1 * (pBestPos[i][d] - pPos[i][d])
                   + PSO_C2_SOC * r2 * (gBestAz.kp - pPos[i][d]);
        pPos[i][d] += pVel[i][d];
      }

      // Giới hạn biên tham số hợp lệ
      pPos[i][0] = constrain(pPos[i][0], 1.0f, 6.0f);
      pPos[i][1] = constrain(pPos[i][1], 0.01f, 0.5f);
      pPos[i][2] = constrain(pPos[i][2], 0.1f, 3.0f);

      float currentCost = evaluateFitness(pPos[i][0], pPos[i][1], pPos[i][2]);
      if (currentCost < pBestCost[i]) {
        pBestCost[i] = currentCost;
        pBestPos[i][0] = pPos[i][0];
        pBestPos[i][1] = pPos[i][1];
        pBestPos[i][2] = pPos[i][2];
        if (currentCost < gBestAz.cost) {
          gBestAz.cost = currentCost;
          gBestAz.kp = pPos[i][0];
          gBestAz.ki = pPos[i][1];
          gBestAz.kd = pPos[i][2];
        }
      }
    }
  }

  // Trục Elevation gán tỷ lệ thích nghi theo trọng lực
  gBestEl.kp = gBestAz.kp * 1.15f;
  gBestEl.ki = gBestAz.ki * 1.10f;
  gBestEl.kd = gBestAz.kd * 1.20f;
  gBestEl.cost = gBestAz.cost * 1.05f;

  psoRunTimeMs = millis() - startT;
  psoCurrentIter = PSO_MAX_ITER;

  Serial.printf(">>> [PSO HOÀN THÀNH trong %u ms] Hội tụ: Cost J = %.4f\n", psoRunTimeMs, gBestAz.cost);
  Serial.printf("    Bộ tham số tối ưu Azimuth  : Kp=%.2f, Ki=%.3f, Kd=%.2f\n", gBestAz.kp, gBestAz.ki, gBestAz.kd);
  Serial.printf("    Bộ tham số tối ưu Elevation: Kp=%.2f, Ki=%.3f, Kd=%.2f\n\n", gBestEl.kp, gBestEl.ki, gBestEl.kd);
}

// -------------------------------------------------------------------------
// 5. MÔ HÌNH SUY LUẬN MỜ FUZZY-PID VÒNG TRONG (MAMDANI / SUGENO TỰ CHỈNH)
// -------------------------------------------------------------------------
struct FuzzyOutput {
  float deltaKp;
  float deltaKi;
  float deltaKd;
  const char* activeRule;
};

// Hàm suy luận mờ tính lượng gia tăng ΔKp, ΔKi, ΔKd dựa trên sai số e và đạo hàm de
FuzzyOutput computeFuzzyAdjustment(float e, float de) {
  FuzzyOutput out;
  float absE = abs(e);
  float absDe = abs(de);

  // Mức độ mờ ngôn ngữ:
  // Sai số Lớn (Big) -> Tăng mạnh Kp để bám đuổi nhanh, giảm Ki tránh vọt lố (Overshoot)
  if (absE >= 0.40f) {
    out.deltaKp = 0.85f;
    out.deltaKi = -0.040f;
    out.deltaKd = 0.25f;
    out.activeRule = "R12: PB x ZE -> PB (Fast Slew)";
  } 
  // Sai số Trung bình (Medium / Small) -> Cân bằng giữa tốc độ và độ êm
  else if (absE >= 0.12f) {
    out.deltaKp = 0.35f;
    out.deltaKi = 0.010f;
    out.deltaKd = 0.15f;
    out.activeRule = "R08: PS x NS -> PS (Fine Slew)";
  } 
  // Sai số Nhỏ (Tiệm cận vùng chết Deadband) -> Giảm Kp để không bị giật, tăng Ki triệt tiêu sai số xác lập
  else {
    out.deltaKp = -0.30f;
    out.deltaKi = 0.035f;
    out.deltaKd = 0.30f;
    out.activeRule = "R01: ZE x ZE -> ZE (Steady Deadband)";
  }

  // Tăng cường Damping nếu tốc độ thay đổi de quá gắt
  if (absDe > 0.8f) {
    out.deltaKd += 0.25f;
  }

  return out;
}

// -------------------------------------------------------------------------
// 6. PHÁT XUNG ĐIỀU KHIỂN ĐỘNG CƠ BƯỚC KHÔNG GÂY TREO HỆ THỐNG
// -------------------------------------------------------------------------
void stepMotor(int pulPin, int dirPin, bool direction, int steps, int delayUs) {
  if (steps <= 0) return;
  digitalWrite(dirPin, direction ? HIGH : LOW);
  delayMicroseconds(20);

  for (int i = 0; i < steps; i++) {
    digitalWrite(pulPin, HIGH);
    delayMicroseconds(delayUs);
    digitalWrite(pulPin, LOW);
    delayMicroseconds(delayUs);
  }
}

// -------------------------------------------------------------------------
// 7. ĐỌC CẢM BIẾN QUANG TRỞ VÀ TÍNH SAI SỐ CHUẨN HOÁ
// -------------------------------------------------------------------------
int readAdcFiltered(int pin, int samples = 16) {
  uint32_t sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(50);
  }
  return (int)(sum / samples);
}

void readSensors() {
  rawTop    = readAdcFiltered(LDR_TOP_PIN);
  rawBottom = readAdcFiltered(LDR_BOTTOM_PIN);
  rawLeft   = readAdcFiltered(LDR_LEFT_PIN);
  rawRight  = readAdcFiltered(LDR_RIGHT_PIN);

  int sumLR = max(1, rawLeft + rawRight);
  int sumTB = max(1, rawTop + rawBottom);

  esAz = (float)(rawLeft - rawRight) / (float)sumLR;
  esEl = (float)(rawTop - rawBottom) / (float)sumTB;

  totalLux = (int)(((rawTop + rawBottom + rawLeft + rawRight) / 4.0f) * 20.0f);
  isSaturated = (rawTop >= 3950 || rawBottom >= 3950 || rawLeft >= 3950 || rawRight >= 3950);
}

// -------------------------------------------------------------------------
// 8. VÒNG LẶP ĐIỀU KHIỂN KẾT HỢP FUZZY-PID VÀ PHÁT XUNG ĐỘNG CƠ
// -------------------------------------------------------------------------
String lastActionAz = "DỪNG (Cân bằng)";
String lastActionEl = "DỪNG (Cân bằng)";
FuzzyOutput fuzzyAz;
FuzzyOutput fuzzyEl;

void updateFuzzyPidControl() {
  if (isEStop) return;

  float dt = (millis() - lastInnerLoopTime) / 1000.0f;
  if (dt <= 0.001f) dt = 0.025f;
  lastInnerLoopTime = millis();

  // Đạo hàm sai số quang de/dt
  float deAz = (esAz - prevEsAz) / dt;
  float deEl = (esEl - prevEsEl) / dt;
  prevEsAz = esAz;
  prevEsEl = esEl;

  // 1. Tự động chỉnh thông số qua Fuzzy Logic
  fuzzyAz = computeFuzzyAdjustment(esAz, deAz);
  fuzzyEl = computeFuzzyAdjustment(esEl, deEl);

  float activeKpAz = gBestAz.kp + fuzzyAz.deltaKp;
  float activeKdAz = gBestAz.kd + fuzzyAz.deltaKd;

  float activeKpEl = gBestEl.kp + fuzzyEl.deltaKp;
  float activeKdEl = gBestEl.kd + fuzzyEl.deltaKd;

  // 2. Tính tín hiệu điều khiển PID
  float uAz = activeKpAz * esAz + activeKdAz * deAz;
  float uEl = activeKpEl * esEl + activeKdEl * deEl;

  // --- ĐIỀU KHIỂN TRỤC 1: AZIMUTH (XOAY TRÁI / PHẢI) ---
  if (abs(esAz) > DEADBAND_ERROR) {
    // Chiều quay: esAz > 0 (Trái sáng hơn) -> Quay sang Trái bám theo đèn
    bool dir = (esAz > 0);
    if (invertAzDir) dir = !dir;

    // Số bước tỷ lệ theo độ lệch quang (Fuzzy-PID điều tiết số bước và tốc độ)
    int steps = constrain((int)(abs(uAz) * 28.0f), 2, 45);
    int delayUs = map(steps, 2, 45, MAX_DELAY_US, MIN_DELAY_US);

    stepMotor(M1_PUL_PIN, M1_DIR_PIN, dir, steps, delayUs);

    // Cập nhật vị trí góc ảo
    float stepDeg = steps * DEGREES_PER_STEP;
    curPhi += (dir ? 1 : -1) * stepDeg;
    curPhi = constrain(curPhi, -90.0f, 90.0f);
    azCommandPulses += (dir ? steps : -steps);

    lastActionAz = String(dir ? "QUAY TRÁI (<-) " : "QUAY PHẢI (->) ") + steps + " bước";
  } else {
    lastActionAz = "DỪNG (Vùng chết)";
  }

  // --- ĐIỀU KHIỂN TRỤC 2: ELEVATION (NÂNG LÊN / HẠ XUỐNG) ---
  if (abs(esEl) > DEADBAND_ERROR) {
    // Chiều quay: esEl > 0 (Trên sáng hơn) -> Nâng lên đón sáng
    bool dir = (esEl > 0);
    if (invertElDir) dir = !dir;

    int steps = constrain((int)(abs(uEl) * 28.0f), 2, 45);
    int delayUs = map(steps, 2, 45, MAX_DELAY_US, MIN_DELAY_US);

    stepMotor(M2_PUL_PIN, M2_DIR_PIN, dir, steps, delayUs);

    float stepDeg = steps * DEGREES_PER_STEP;
    curEpsilon += (dir ? 1 : -1) * stepDeg;
    curEpsilon = constrain(curEpsilon, 15.0f, 85.0f);
    elCommandPulses += (dir ? steps : -steps);

    lastActionEl = String(dir ? "NÂNG LÊN (^) " : "HẠ XUỐNG (v) ") + steps + " bước";
  } else {
    lastActionEl = "DỪNG (Vùng chết)";
  }
}

// -------------------------------------------------------------------------
// 9. ĐẨY DỮ LIỆU ĐỒNG BỘ LÊN FIREBASE CHO WEB RENDER
// -------------------------------------------------------------------------
void pushTelemetryToFirebase() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;

  // 1. Cập nhật node /solar/tracking
  FirebaseJson trk;
  trk.set("ldrTop", rawTop);
  trk.set("ldrBottom", rawBottom);
  trk.set("ldrLeft", rawLeft);
  trk.set("ldrRight", rawRight);

  trk.set("lastUpdate", (double)millis());

  // Góc thực tế & Góc mục tiêu phản hồi theo bước quay
  float compassAz = 180.0f + curPhi;
  trk.set("phi", curPhi);
  trk.set("epsilon", curEpsilon);
  trk.set("azimuthAngle", compassAz);
  trk.set("elevationAngle", curEpsilon);
  trk.set("targetPhi", curPhi + (esAz * 15.0f));
  trk.set("targetEpsilon", constrain(curEpsilon + (esEl * 15.0f), 15.0f, 85.0f));

  trk.set("azCommandPulses", azCommandPulses);
  trk.set("elCommandPulses", elCommandPulses);
  trk.set("azEncoder", azCommandPulses); // Test bare motor: đồng bộ xung lệnh
  trk.set("elEncoder", elCommandPulses);

  trk.set("voltage", 19.20);
  trk.set("current", 1.85);
  trk.set("power", 35.52);
  trk.set("dailyEnergyWh", 168.5);

  bool isMoving = (abs(esAz) > DEADBAND_ERROR || abs(esEl) > DEADBAND_ERROR);
  trk.set("mode", "AUTO");
  trk.set("state", isMoving ? "MOVE" : "TRACKING");
  trk.set("status", isEStop ? "EMERGENCY_STOP" : "TRACKING_ACTIVE");
  trk.set("estop", isEStop);
  trk.set("activeAlgorithm", "PSO_FUZZY_PID");
  trk.set("weightWs", totalLux >= 200 ? 0.85 : (totalLux >= 40 ? 0.35 : 0.0));

  Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &trk);

  // 2. Cập nhật node /solar/algorithm
  FirebaseJson alg;
  alg.set("name", "PSO_FUZZY_PID");
  alg.set("kpAzBase", gBestAz.kp);
  alg.set("kiAzBase", gBestAz.ki);
  alg.set("kdAzBase", gBestAz.kd);
  alg.set("deltaKpAz", fuzzyAz.deltaKp);
  alg.set("deltaKiAz", fuzzyAz.deltaKi);
  alg.set("deltaKdAz", fuzzyAz.deltaKd);

  alg.set("kpElBase", gBestEl.kp);
  alg.set("kiElBase", gBestEl.ki);
  alg.set("kdElBase", gBestEl.kd);
  alg.set("deltaKpEl", fuzzyEl.deltaKp);
  alg.set("deltaKiEl", fuzzyEl.deltaKi);
  alg.set("deltaKdEl", fuzzyEl.deltaKd);

  alg.set("psoCostJ", gBestAz.cost);
  alg.set("psoBestFitness", gBestAz.cost);
  alg.set("psoRunTimeMs", psoRunTimeMs);
  alg.set("psoSwarmSize", PSO_SWARM_SIZE);
  alg.set("psoIteration", psoCurrentIter);
  alg.set("psoMaxIterations", PSO_MAX_ITER);
  alg.set("psoStatus", "CONVERGED");
  alg.set("psoSource", "ONLINE");

  Firebase.RTDB.updateNode(&fbdo, "/solar/algorithm", &alg);
}

// -------------------------------------------------------------------------
// 10. IN THÔNG SỐ TRỰC QUAN RA SERIAL MONITOR
// -------------------------------------------------------------------------
void printSerialStatus() {
  Serial.println("\n=========================================================================");
  Serial.printf(" [FUZZY-PID & PSO] THEO DÕI ĐÈN FLASH -> ĐỘNG CƠ TỰ QUAY BÁM SÁNG\n");
  Serial.printf(" Web Dashboard: https://tracking-solar.onrender.com/ | WiFi: %s\n",
                WiFi.status() == WL_CONNECTED ? "ONLINE" : "OFFLINE");
  Serial.println("=========================================================================");
  Serial.printf(" Quang sai Azimuth   (Trái - Phải): %+0.3f -> Hành động ĐC 1: %s\n", esAz, lastActionAz.c_str());
  Serial.printf(" Quang sai Elevation (Trên - Dưới): %+0.3f -> Hành động ĐC 2: %s\n", esEl, lastActionEl.c_str());
  Serial.println("-------------------------------------------------------------------------");
  Serial.printf("  Góc ảo hiện tại : Phi (Az) = %+5.1f° | Epsilon (El) = %5.1f°\n", curPhi, curEpsilon);
  Serial.printf("  Xung đã phát    : Az = %6ld xung | El = %6ld xung\n", azCommandPulses, elCommandPulses);
  Serial.printf("  Fuzzy Azimuth   : Kp=%.2f (+%.2f) | Kd=%.2f (+%.2f) | Luật: %s\n",
                gBestAz.kp, fuzzyAz.deltaKp, gBestAz.kd, fuzzyAz.deltaKd, fuzzyAz.activeRule);
  Serial.printf("  Fuzzy Elevation : Kp=%.2f (+%.2f) | Kd=%.2f (+%.2f) | Luật: %s\n",
                gBestEl.kp, fuzzyEl.deltaKp, gBestEl.kd, fuzzyEl.deltaKd, fuzzyEl.activeRule);
  Serial.printf("  PSO Optimization: Cost J = %.4f | Swarm: 10 hạt | Thời gian: %u ms\n",
                gBestAz.cost, psoRunTimeMs);
  Serial.printf("  Đảo chiều quay  : ĐC 1 (Az): %s [Bấm 'i'] | ĐC 2 (El): %s [Bấm 'k']\n",
                invertAzDir ? "NGƯỢC" : "THUẬN", invertElDir ? "NGƯỢC" : "THUẬN");
  Serial.println("=========================================================================");
}

// -------------------------------------------------------------------------
// 11. XỬ LÝ LỆNH PHÍM TẮT SERIAL
// -------------------------------------------------------------------------
void handleSerialCommands() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') return;

    if (c == ' ' || c == 's' || c == 'S') {
      isEStop = !isEStop;
      Serial.printf("\n>> [E-STOP] Trạng thái dừng khẩn cấp: %s\n", isEStop ? "ĐÃ DỪNG!" : "HOẠT ĐỘNG TRỞ LẠI");
    } else if (c == 'p' || c == 'P') {
      runPsoOptimization();
      pushTelemetryToFirebase();
    } else if (c == 'i' || c == 'I') {
      invertAzDir = !invertAzDir;
      Serial.printf("\n>> [ĐẢO CHIỀU ĐC 1 - AZIMUTH]: Hiện tại = %s\n", invertAzDir ? "ĐẢO NGƯỢC" : "THUẬN");
    } else if (c == 'k' || c == 'K') {
      invertElDir = !invertElDir;
      Serial.printf("\n>> [ĐẢO CHIỀU ĐC 2 - ELEVATION]: Hiện tại = %s\n", invertElDir ? "ĐẢO NGƯỢC" : "THUẬN");
    } else if (c == '0') {
      curPhi = 0.0f;
      curEpsilon = 45.0f;
      azCommandPulses = 0;
      elCommandPulses = 0;
      Serial.println("\n>> [RESET GÓC] Đã đưa góc ảo về mốc Phi=0.0°, Epsilon=45.0°");
    } else if (c == '?' || c == 'h' || c == 'H') {
      Serial.println("\n--- MENU PHÍM TẮT ĐIỀU KHIỂN ---");
      Serial.println("  [P]      : Chạy lại thuật toán PSO tối ưu trong RAM");
      Serial.println("  [I]      : Đảo chiều quay Động cơ 1 (Azimuth / Trái - Phải)");
      Serial.println("  [K]      : Đảo chiều quay Động cơ 2 (Elevation / Lên - Xuống)");
      Serial.println("  [0]      : Reset góc ảo và bộ đếm xung về 0");
      Serial.println("  [Space/S]: DỪNG KHẨN CẤP / TIẾP TỤC");
      Serial.println("  [?]      : Hiện lại menu này");
      Serial.println("---------------------------------");
    }
  }
}

// -------------------------------------------------------------------------
// 12. SETUP & LOOP
// -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("  HỆ THỐNG SOLAR TRACKER 2 TRỤC - THUẬT TOÁN PSO & FUZZY-PID");
  Serial.println("  Test Tương Tác: Rọi Đèn Flash -> 2 Động Cơ Tự Quay Bám");
  Serial.println("=======================================================");

  // Cấu hình chân Động cơ bước
  pinMode(M1_PUL_PIN, OUTPUT);
  pinMode(M1_DIR_PIN, OUTPUT);
  pinMode(M2_PUL_PIN, OUTPUT);
  pinMode(M2_DIR_PIN, OUTPUT);

  digitalWrite(M1_PUL_PIN, LOW);
  digitalWrite(M1_DIR_PIN, LOW);
  digitalWrite(M2_PUL_PIN, LOW);
  digitalWrite(M2_DIR_PIN, LOW);

  // Cấu hình ADC cho 4 cảm biến quang trở
  analogReadResolution(12);
  #if defined(ESP32)
    analogSetAttenuation(ADC_11db);
  #endif
  pinMode(LDR_TOP_PIN, INPUT);
  pinMode(LDR_BOTTOM_PIN, INPUT);
  pinMode(LDR_LEFT_PIN, INPUT);
  pinMode(LDR_RIGHT_PIN, INPUT);

  // Chạy PSO lần đầu để tìm bộ thông số tối ưu [Kp, Ki, Kd]
  runPsoOptimization();

  // Kết nối WiFi & Firebase
  Serial.printf("[WIFI] Đang kết nối mạng %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] ĐÃ KẾT NỐI! IP: " + WiFi.localIP().toString());
    configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");

    fbConfig.api_key = API_KEY;
    fbConfig.database_url = DATABASE_URL;
    fbConfig.signer.test_mode = true;
    Firebase.begin(&fbConfig, &auth);
    Firebase.reconnectWiFi(true);
    Serial.println("[FIREBASE] Đã sẵn sàng đồng bộ lên Web: https://tracking-solar.onrender.com/");
  } else {
    Serial.println("\n[WIFI] Offline mode -> Vẫn chạy điều khiển motor bình thường.");
  }

  Serial.println("\n>> HỆ THỐNG ĐÃ SẴN SÀNG! Hãy giơ đèn flash điện thoại rọi vào các mắt cảm biến!");
}

void loop() {
  handleSerialCommands();

  // Vòng trong 40Hz (25ms): Đọc cảm biến + tính Fuzzy-PID + phát xung quay động cơ
  if (millis() - lastInnerLoopTime >= INNER_LOOP_MS) {
    readSensors();
    updateFuzzyPidControl();
  }

  // Vòng ngoài định kỳ 1000ms: Đẩy Firebase lên Web & In Serial Monitor
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();
    printSerialStatus();
    pushTelemetryToFirebase();
  }
}
