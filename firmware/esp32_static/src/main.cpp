// =========================================================================
// ESP32-S3 #2: TẤM PIN CỐ ĐỊNH (FIXED SOLAR PANEL COMPARISON NODE)
// PlatformIO Framework: Arduino (espressif32)
// =========================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_INA219.h>
#include <ArduinoJson.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

#include "config.h"

// Firebase Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;

// Cảm biến đo dòng & áp
Adafruit_INA219 ina219_static(INA219_I2C_ADDR);

float totalEnergyWh = 0.0;
unsigned long lastTelemetryTime = 0;

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
    Serial.println("\nWiFi Connected! IP Address: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi Connection Failed! Sẽ tự động thử lại...");
  }
}

void initFirebase() {
  fbConfig.api_key = API_KEY;
  fbConfig.database_url = DATABASE_URL;
  fbConfig.signer.test_mode = true;

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println("  ESP32-S3 FIXED SOLAR PANEL NODE (COMPARISON)");
  Serial.println("=======================================================");

  // Khởi tạo I2C & Cảm biến INA219
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!ina219_static.begin()) {
    Serial.println("[CẢNH BÁO] Không tìm thấy INA219 tấm cố định. Kiểm tra địa chỉ I2C / dây nối!");
  } else {
    Serial.println("[OK] Đã kết nối INA219 tấm cố định.");
  }

  connectWiFi();
  initFirebase();
}

void loop() {
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();

    float voltage = ina219_static.getBusVoltage_V();
    float current = ina219_static.getCurrent_mA() / 1000.0;
    float power = voltage * current;
    if (power < 0) power = 0;

    totalEnergyWh += (power * (TELEMETRY_INTERVAL_MS / 3600000.0));

    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("dailyEnergy", totalEnergyWh / 1000.0); // kWh
    json.set("fixedAzimuth", (double)FIXED_AZIMUTH_DEG);
    json.set("fixedElevation", (double)FIXED_ELEVATION_DEG);
    json.set("lastUpdate", (double)millis());

    if (Firebase.ready()) {
      if (Firebase.RTDB.updateNode(&fbdo, "/solar/static", &json)) {
        Serial.printf("[ESP32-2 STATIC] V=%.2fV | I=%.3fA | P=%.2fW | Energy=%.4fkWh\n", 
                      voltage, current, power, totalEnergyWh / 1000.0);
      } else {
        Serial.println("[ESP32-2 Gửi lỗi]: " + fbdo.errorReason());
      }
    }
  }
}
