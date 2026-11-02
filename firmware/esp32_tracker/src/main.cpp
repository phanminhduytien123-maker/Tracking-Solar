// =========================================================================
// ESP32-S3 #1: SMART DUAL-AXIS SOLAR TRACKER (FUZZY-PID & PSO)
// PlatformIO Framework: Arduino (espressif32)
// =========================================================================

#include <Adafruit_ INA226.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include <Firebase_ESP_Client.h>
#include <WiFi.h>
#include <Wire.h>
#include <addons/RTDBHelper.h>
#include <addons/TokenHelper.h>

#include "config.h"

// Firebase Objects
FirebaseData fbdo;
FirebaseData fbdoStream;
FirebaseAuth auth;
FirebaseConfig fbConfig;

// Cảm biến đo dòng & áp pin mặt trời
Adafruit_ INA226 INA226(INA226_I2C_ADDR);

// Trạng thái hệ thống & Góc quay
float currentAzimuth = 142.5;  // Góc phương vị hiện tại (Độ)
float currentElevation = 45.0; // Góc nâng hiện tại (Độ)
float targetAzimuth = 143.0;
float targetElevation = 45.5;

float totalEnergyWh = 0.0;
unsigned long lastTelemetryTime = 0;
String systemMode = "AUTO"; // "AUTO" | "MANUAL" | "CALIBRATION" | "PARK"
bool isEstop = false;

// Hàm xử lý lệnh điều khiển từ xa từ Web Dashboard
void handleControlStream(FirebaseStream data) {
  Serial.print("[Firebase Stream] Nhận dữ liệu: ");
  Serial.println(data.dataPath() + " => " + data.stringData());

  if (data.dataType() == "json") {
    JsonDocument doc;
    deserializeJson(doc, data.jsonString());

    const char *cmd = doc["cmd"] | "";
    if (strcmp(cmd, "set_mode") == 0) {
      systemMode = doc["mode"] | "AUTO";
      Serial.println("[LỆNH] Đổi chế độ sang: " + systemMode);
    } else if (strcmp(cmd, "jog") == 0) {
      const char *axis = doc["axis"] | "azimuth";
      const char *dir = doc["direction"] | "CW";
      float step = doc["step"] | 5.0;

      if (strcmp(axis, "azimuth") == 0) {
        currentAzimuth += (strcmp(dir, "CW") == 0) ? step : -step;
      } else {
        currentElevation += (strcmp(dir, "CW") == 0) ? step : -step;
      }
      Serial.printf("[LỆNH JOG] Axis: %s, Dir: %s, Step: %.1f\n", axis, dir,
                    step);
    } else if (strcmp(cmd, "estop") == 0) {
      isEstop = doc["state"] | false;
      Serial.println(isEstop ? "[LỆNH] DỪNG KHẨN CẤP (E-STOP)!"
                             : "[LỆNH] Huỷ dừng khẩn cấp.");
    } else if (strcmp(cmd, "park") == 0) {
      currentAzimuth = 180.0;
      currentElevation = 10.0;
      systemMode = "PARK";
      Serial.println(
          "[LỆNH] Đã đưa tấm pin về vị trí nghỉ an toàn (Park Mode).");
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("[Firebase Stream] Stream timeout, đang kết nối lại...");
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP Address: " +
                   WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi Connection Failed! Sẽ tự động kết nối lại trong "
                   "vòng lặp loop.");
  }
}

void initFirebase() {
  fbConfig.api_key = API_KEY;
  fbConfig.database_url = DATABASE_URL;
  fbConfig.signer.test_mode = true;

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);

  // Đăng ký Stream nhận lệnh điều khiển thời gian thực
  if (!Firebase.RTDB.beginStream(&fbdoStream, "/solar/control")) {
    Serial.println("[Firebase Stream Error]: " + fbdoStream.errorReason());
  } else {
    Firebase.RTDB.setStreamCallback(&fbdoStream, handleControlStream,
                                    streamTimeoutCallback);
    Serial.println("[Firebase Stream] Đã mở kênh lắng nghe lệnh điều khiển "
                   "(/solar/control)");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println("  ESP32-S3 SOLAR TRACKER FIRMWARE (FUZZY-PID & PSO)");
  Serial.println("=======================================================");

  // Khởi tạo I2C &  INA226
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!INA226.begin()) {
    Serial.println("[CẢNH BÁO] Không tìm thấy cảm biến  INA226 (0x40). Kiểm "
                   "tra dây nối I2C!");
  } else {
    Serial.println("[OK] Đã kết nối cảm biến  INA226.");
  }

  // Cấu hình chân Analog LDR
  pinMode(PIN_LDR_TOP, INPUT);
  pinMode(PIN_LDR_BOTTOM, INPUT);
  pinMode(PIN_LDR_LEFT, INPUT);
  pinMode(PIN_LDR_RIGHT, INPUT);

  // Kết nối WiFi & Firebase
  connectWiFi();
  initFirebase();
}

void loop() {
  // Gửi gói Telemetry định kỳ lên Firebase
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();

    // 1. Đọc số liệu cảm biến  INA226
    float voltage = INA226.getBusVoltage_V();
    float current = INA226.getCurrent_mA() / 1000.0; // Chuyển sang Ampe
    float power = voltage * current;                 // Công suất Watt
    if (power < 0)
      power = 0;

    // Tích luỹ năng lượng Wh (Wh = P(W) * dt(h))
    totalEnergyWh += (power * (TELEMETRY_INTERVAL_MS / 3600000.0));

    // 2. Đọc 4 cảm biến quang trở LDR
    int ldrTop = analogRead(PIN_LDR_TOP);
    int ldrBottom = analogRead(PIN_LDR_BOTTOM);
    int ldrLeft = analogRead(PIN_LDR_LEFT);
    int ldrRight = analogRead(PIN_LDR_RIGHT);

    // 3. Đóng gói JSON gửi lên Firebase RTDB
    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("dailyEnergy", totalEnergyWh / 1000.0); // Quy đổi sang kWh
    json.set("azimuthAngle", currentAzimuth);
    json.set("elevationAngle", currentElevation);
    json.set("targetAzimuth", targetAzimuth);
    json.set("targetElevation", targetElevation);
    json.set("ldrTop", ldrTop);
    json.set("ldrBottom", ldrBottom);
    json.set("ldrLeft", ldrLeft);
    json.set("ldrRight", ldrRight);
    json.set("mode", systemMode);
    json.set("status", isEstop ? "EMERGENCY_STOP" : "TRACKING_ACTIVE");
    json.set("estop", isEstop);
    json.set("lastUpdate", (double)millis());

    if (Firebase.ready()) {
      if (Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &json)) {
        Serial.printf("[ESP32-1 TELEMETRY] V=%.2fV | I=%.3fA | P=%.2fW | "
                      "Az=%.1f° | El=%.1f°\n",
                      voltage, current, power, currentAzimuth,
                      currentElevation);
      } else {
        Serial.println("[ESP32-1 Gửi lỗi]: " + fbdo.errorReason());
      }
    }
  }
}
