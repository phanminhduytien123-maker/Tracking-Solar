// =========================================================================
// FIRMWARE TEST CHO ESP32 DEVKIT V1 (ESP-WROOM-32)
// Sơ đồ mạch: Cảm biến INA226 (I2C) + LED RGB (DIN) + Đo áp & dòng Tấm Pin
// =========================================================================

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <INA226.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

#include "config.h"

// -------------------------------------------------------------------------
// Đối tượng phần cứng & Mạng
// -------------------------------------------------------------------------
INA226 ina226(INA226_ADDR, &Wire);
Adafruit_NeoPixel strip(NUM_LEDS, PIN_LED_DIN, NEO_GRB + NEO_KHZ800);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;

// -------------------------------------------------------------------------
// Biến trạng thái hệ thống
// -------------------------------------------------------------------------
bool inaFound = false;
bool wifiEnabled = false;
float busVoltage = 0.0f;      // Điện áp tấm pin (V)
float shuntVoltage = 0.0f;    // Điện áp rơi trên trở shunt (mV)
float current_mA = 0.0f;      // Dòng điện tải (mA)
float current_A = 0.0f;       // Dòng điện tải (A)
float power_W = 0.0f;         // Công suất tải (W)
float totalEnergyWh = 0.0f;   // Năng lượng tích luỹ (Wh)

unsigned long lastSensorRead = 0;
unsigned long lastTelemetry = 0;
unsigned long lastLedUpdate = 0;

// Chế độ LED: 0 = Theo dõi công suất Pin, 1 = Rainbow Test, 2 = Vàng Solar, 3 = Thở Xanh, 4 = Tắt
int ledMode = 0;
uint8_t ledBrightness = LED_BRIGHTNESS;
uint16_t rainbowHue = 0;

// -------------------------------------------------------------------------
// Hàm quét bus I2C tìm địa chỉ thiết bị
// -------------------------------------------------------------------------
void scanI2C() {
  Serial.println("\n-------------------------------------------------------");
  Serial.println("[I2C SCAN] Đang quét các thiết bị trên Bus I2C (SDA=21, SCL=22)...");
  byte count = 0;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.printf("  -> Tìm thấy thiết bị tại địa chỉ: 0x%02X", address);
      if (address == 0x40) Serial.print(" (Địa chỉ mặc định INA226 / INA219)");
      else if (address == 0x41) Serial.print(" (INA226 / INA219 A0=VCC)");
      else if (address == 0x44) Serial.print(" (INA226 / INA219 A0=SDA)");
      else if (address == 0x45) Serial.print(" (INA226 / INA219 A0=SCL)");
      else if (address == 0x3C || address == 0x3D) Serial.print(" (Màn hình OLED SSD1306)");
      Serial.println();
      count++;
    } else if (error == 4) {
      Serial.printf("  -> Lỗi không xác định tại địa chỉ: 0x%02X\n", address);
    }
  }

  if (count == 0) {
    Serial.println("[CẢNH BÁO] Không tìm thấy bất kỳ thiết bị I2C nào!");
    Serial.println("  -> Vui lòng kiểm tra dây SDA (D21), SCL (D22), VCC (3V3) và GND.");
  } else {
    Serial.printf("[I2C SCAN] Hoàn thành! Tìm thấy tổng cộng %d thiết bị.\n", count);
  }
  Serial.println("-------------------------------------------------------\n");
}

// -------------------------------------------------------------------------
// Hiệu ứng LED RGB (DIN Pin D18)
// -------------------------------------------------------------------------
uint32_t wheel(byte WheelPos) {
  WheelPos = 255 - WheelPos;
  if (WheelPos < 85) {
    return strip.Color(255 - WheelPos * 3, 0, WheelPos * 3);
  }
  if (WheelPos < 170) {
    WheelPos -= 85;
    return strip.Color(0, WheelPos * 3, 255 - WheelPos * 3);
  }
  WheelPos -= 170;
  return strip.Color(WheelPos * 3, 255 - WheelPos * 3, 0);
}

void updateLedAnimation() {
  if (millis() - lastLedUpdate < 30) return;
  lastLedUpdate = millis();

  switch (ledMode) {
    case 0: { // Chế độ: Thể hiện công suất pin mặt trời
      // 0W -> Xanh dương, 0.5W -> Xanh lá, 1.5W -> Cam, >2.5W -> Đỏ rực
      uint32_t color;
      if (power_W < 0.05f) {
        color = strip.Color(0, 20, 80); // Chế độ chờ (Xanh dương dịu)
      } else if (power_W < 0.5f) {
        color = strip.Color(0, 120, 30); // Công suất nhỏ (Xanh lá)
      } else if (power_W < 1.5f) {
        color = strip.Color(180, 100, 0); // Công suất vừa (Vàng cam)
      } else {
        color = strip.Color(255, 30, 0); // Công suất cao (Đỏ cam)
      }
      for (int i = 0; i < strip.numPixels(); i++) {
        strip.setPixelColor(i, color);
      }
      strip.show();
      break;
    }
    case 1: { // Chế độ: Rainbow Cycle (Kiểm tra tín hiệu DIN và bóng LED)
      for (int i = 0; i < strip.numPixels(); i++) {
        int pixelHue = (i * 256 / strip.numPixels()) + rainbowHue;
        strip.setPixelColor(i, wheel(pixelHue & 255));
      }
      strip.show();
      rainbowHue = (rainbowHue + 2) & 255;
      break;
    }
    case 2: { // Chế độ: Vàng Solar ấm áp
      for (int i = 0; i < strip.numPixels(); i++) {
        strip.setPixelColor(i, strip.Color(255, 180, 20));
      }
      strip.show();
      break;
    }
    case 3: { // Chế độ: Thở xanh dương / Cyan
      float breath = (exp(sin(millis() / 1500.0 * PI)) - 0.36787944) * 108.0;
      uint8_t b = (uint8_t)constrain(breath, 10, 255);
      for (int i = 0; i < strip.numPixels(); i++) {
        strip.setPixelColor(i, strip.Color(0, b / 2, b));
      }
      strip.show();
      break;
    }
    case 4: // Tắt LED
    default:
      strip.clear();
      strip.show();
      break;
  }
}

// -------------------------------------------------------------------------
// Kết nối WiFi & Firebase (Không treo nếu không có mạng)
// -------------------------------------------------------------------------
void connectWiFi() {
  if (String(WIFI_SSID) == "YOUR_WIFI_SSID" || strlen(WIFI_SSID) == 0) {
    Serial.println("[WIFI] Chưa cấu hình WiFi SSID trong include/config.h -> Chạy chế độ Serial Test Offline.");
    wifiEnabled = false;
    return;
  }

  Serial.printf("[WIFI] Đang kết nối tới: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiEnabled = true;
    Serial.println("\n[WIFI] ĐÃ KẾT NỐI THÀNH CÔNG!");
    Serial.printf("  -> IP ESP32: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("  -> RSSI: %d dBm\n", WiFi.RSSI());

    // Khởi tạo Firebase
    fbConfig.api_key = API_KEY;
    fbConfig.database_url = DATABASE_URL;
    fbConfig.signer.test_mode = true;
    Firebase.begin(&fbConfig, &auth);
    Firebase.reconnectWiFi(true);
    Serial.println("[FIREBASE] Đã khởi tạo Firebase Client sẵn sàng truyền dữ liệu.");
  } else {
    wifiEnabled = false;
    Serial.println("\n[WIFI] Kết nối WiFi thất bại! Chuyển sang chế độ Serial Offline.");
  }
}

// -------------------------------------------------------------------------
// Đọc cảm biến INA226 & Tính toán công suất theo Định luật Ohm chính xác cao
// -------------------------------------------------------------------------
void readSensors() {
  if (inaFound) {
    busVoltage = ina226.getBusVoltage();        // Volts
    shuntVoltage = ina226.getShuntVoltage_mV(); // mV
    
    // Tính dòng điện trực tiếp: I (mA) = V_shunt (mV) / R_shunt (Ohm)
    current_mA = shuntVoltage / SHUNT_RESISTOR_OHM;
    if (current_mA < 0.0f) current_mA = 0.0f;   // Loại bỏ nhiễu âm
    
    current_A = current_mA / 1000.0f;
    power_W = busVoltage * current_A;

    // Tích luỹ năng lượng Wh: Wh = P(W) * dt(h)
    float dtHours = (float)SENSOR_READ_INTERVAL_MS / 3600000.0f;
    totalEnergyWh += (power_W * dtHours);
  } else {
    busVoltage = 0.0f;
    shuntVoltage = 0.0f;
    current_mA = 0.0f;
    current_A = 0.0f;
    power_W = 0.0f;
  }
}

// -------------------------------------------------------------------------
// Xử lý các lệnh điều khiển nhập từ Serial Monitor
// -------------------------------------------------------------------------
void handleSerialCommands() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() == 0) return;

    Serial.printf("\n[SERIAL CMD] Nhận lệnh: '%s'\n", cmd.c_str());

    if (cmd.equalsIgnoreCase("help") || cmd.equalsIgnoreCase("?")) {
      Serial.println("\n===== DANH SÁCH LỆNH SERIAL MONITOR =====");
      Serial.println("  help            : Hiện menu trợ giúp này");
      Serial.println("  scan            : Quét lại tất cả thiết bị trên bus I2C");
      Serial.println("  led <0-4>       : Đổi chế độ LED");
      Serial.println("                    0=Theo công suất Pin, 1=Rainbow, 2=Vàng Solar, 3=Thở Xanh, 4=Tắt");
      Serial.println("  bright <0-255>  : Đặt độ sáng LED");
      Serial.println("  reset           : Reset bộ đếm năng lượng Wh về 0");
      Serial.println("  status          : In bảng trạng thái chi tiết");
      Serial.println("==========================================\n");
    }
    else if (cmd.equalsIgnoreCase("scan")) {
      scanI2C();
    }
    else if (cmd.startsWith("led ") || cmd.startsWith("LED ")) {
      int mode = cmd.substring(4).toInt();
      if (mode >= 0 && mode <= 4) {
        ledMode = mode;
        Serial.printf("[LED] Đã chuyển sang chế độ LED: %d\n", ledMode);
      } else {
        Serial.println("[LỖI] Giá trị chế độ LED không hợp lệ (hợp lệ từ 0 đến 4).");
      }
    }
    else if (cmd.startsWith("bright ") || cmd.startsWith("BRIGHT ")) {
      int b = cmd.substring(7).toInt();
      if (b >= 0 && b <= 255) {
        ledBrightness = b;
        strip.setBrightness(ledBrightness);
        Serial.printf("[LED] Đã đặt độ sáng: %d/255\n", ledBrightness);
      }
    }
    else if (cmd.equalsIgnoreCase("reset")) {
      totalEnergyWh = 0.0f;
      Serial.println("[NĂNG LƯỢNG] Đã reset bộ đếm tích luỹ Wh về 0.000 Wh.");
    }
    else if (cmd.equalsIgnoreCase("status")) {
      Serial.println("\n===== BẢNG TRẠNG THÁI HỆ THỐNG =====");
      Serial.printf("  Board         : ESP32 DevKit V1 (ESP-WROOM-32)\n");
      Serial.printf("  INA226        : %s (Addr: 0x%02X, Shunt: %.3f Ohm)\n", inaFound ? "ĐÃ KẾT NỐI" : "CHƯA TÌM THẤY", INA226_ADDR, SHUNT_RESISTOR_OHM);
      Serial.printf("  LED DIN Pin   : GPIO %d (Số LED: %d, Mode: %d, Sáng: %d)\n", PIN_LED_DIN, NUM_LEDS, ledMode, ledBrightness);
      Serial.printf("  I2C Pins      : SDA=GPIO %d, SCL=GPIO %d\n", I2C_SDA_PIN, I2C_SCL_PIN);
      Serial.printf("  WiFi          : %s\n", wifiEnabled ? WiFi.localIP().toString().c_str() : "OFFLINE / CHƯA KẾT NỐI");
      Serial.printf("  Điện áp (V)   : %.3f V\n", busVoltage);
      Serial.printf("  Dòng điện (mA): %.2f mA (%.4f A)\n", current_mA, current_A);
      Serial.printf("  Công suất (W) : %.3f W\n", power_W);
      Serial.printf("  Tổng Wh       : %.4f Wh\n", totalEnergyWh);
      Serial.println("=====================================\n");
    } else {
      Serial.println("[LỆNH KHÔNG HỢP LỆ] Gõ 'help' để xem các lệnh hỗ trợ.");
    }
  }
}

// -------------------------------------------------------------------------
// Setup
// -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n=======================================================");
  Serial.println("    ESP32 DEVKIT V1 - TEST BENCH FIRMWARE");
  Serial.println("    Đo Dòng/Áp INA226 (I2C) & Điều Khiển LED (DIN)");
  Serial.println("=======================================================");

  // 1. Khởi tạo LED NeoPixel (DIN trên GPIO 18)
  Serial.printf("[KHỞI TẠO] Thiết lập chân LED DIN: GPIO %d (Số bóng: %d)...\n", PIN_LED_DIN, NUM_LEDS);
  strip.begin();
  strip.setBrightness(ledBrightness);
  strip.show(); // Tắt tất cả led ban đầu

  // Hiệu ứng khởi động flash 3 màu
  for (int i = 0; i < strip.numPixels(); i++) strip.setPixelColor(i, strip.Color(50, 0, 0));
  strip.show(); delay(150);
  for (int i = 0; i < strip.numPixels(); i++) strip.setPixelColor(i, strip.Color(0, 50, 0));
  strip.show(); delay(150);
  for (int i = 0; i < strip.numPixels(); i++) strip.setPixelColor(i, strip.Color(0, 0, 50));
  strip.show(); delay(150);
  strip.clear();
  strip.show();

  // 2. Khởi tạo I2C trên D21 (SDA) và D22 (SCL)
  Serial.printf("[KHỞI TẠO] Mở giao tiếp I2C: SDA=GPIO %d, SCL=GPIO %d\n", I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000); // 100 kHz Standard I2C

  // Quét bus I2C để kiểm tra phần cứng
  scanI2C();

  // 3. Khởi tạo INA226
  Serial.printf("[INA226] Đang kết nối tới cảm biến INA226 tại địa chỉ 0x%02X...\n", INA226_ADDR);
  if (!ina226.begin()) {
    Serial.println("[CẢNH BÁO] Không tìm thấy INA226 tại địa chỉ 0x40!");
    Serial.println("  -> Hãy kiểm tra lại dây SDA, SCL, nguồn 3.3V và chân VBS nối vào IN+.");
    inaFound = false;
  } else {
    inaFound = true;
    // Cài đặt dòng định mức và trở Shunt R100 (0.1 Ohm)
    ina226.setMaxCurrentShunt(MAX_EXPECTED_CURRENT_A, SHUNT_RESISTOR_OHM);
    Serial.printf("[INA226] [OK] Đã kết nối thành công! Shunt = %.3f Ohm, Max Current = %.1f A\n", 
                  SHUNT_RESISTOR_OHM, MAX_EXPECTED_CURRENT_A);
  }

  // 4. Kết nối WiFi (nếu có cấu hình)
  connectWiFi();

  Serial.println("\n[HỆ THỐNG SẴN SÀNG] Bắt đầu đo lường...");
  Serial.println(">> Mẹo: Nhập 'help' vào Serial Monitor để xem danh sách lệnh điều khiển.\n");
}

// -------------------------------------------------------------------------
// Loop
// -------------------------------------------------------------------------
void loop() {
  // 1. Cập nhật hiệu ứng LED RGB liên tục
  updateLedAnimation();

  // 2. Lắng nghe lệnh từ Serial Monitor
  handleSerialCommands();

  // 3. Đọc cảm biến định kỳ
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = millis();
    readSensors();
  }

  // 4. In Serial Monitor & Đẩy Firebase định kỳ
  if (millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    lastTelemetry = millis();

    // In ra Serial dạng bảng trực quan độ phân giải cao
    Serial.printf("[TEST DEVKIT] Áp Pin: %5.2f V | Rơi Shunt: %5.2f mV | Dòng: %6.2f mA (%7.4f A) | P: %6.3f W (%6.2f mW) | Năng Lượng: %8.5f Wh\n",
                  busVoltage, shuntVoltage, current_mA, current_A, power_W, power_W * 1000.0f, totalEnergyWh);

    // Đẩy lên Firebase nếu WiFi sẵn sàng (Đẩy trực tiếp vào Tấm Cố Định /solar/static)
    if (wifiEnabled && Firebase.ready()) {
      FirebaseJson json;
      json.set("voltage", busVoltage);
      json.set("current", current_A);
      json.set("power", power_W);
      json.set("dailyEnergy", totalEnergyWh / 1000.0f); // kWh
      json.set("fixedAzimuth", 180.0);
      json.set("fixedElevation", 15.0);
      json.set("shunt_mV", shuntVoltage);
      json.set("current_mA", current_mA);
      json.set("totalEnergyWh", totalEnergyWh);
      json.set("status", "ONLINE_ACTIVE");
      json.set("board", "ESP32 DevKit V1");
      json.set("ledMode", ledMode);
      json.set("lastUpdate", (double)millis());

      // Gửi vào node Tấm Cố Định
      if (Firebase.RTDB.updateNode(&fbdo, FIREBASE_STATIC_PATH, &json)) {
        // Gửi thành công
      } else {
        Serial.println("[FIREBASE LỖI]: " + fbdo.errorReason());
      }
    }
  }
}
