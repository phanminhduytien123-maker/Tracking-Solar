#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// CẤU HÌNH WIFI NHÀ
// =========================================================================
#define WIFI_SSID     "Tyny"
#define WIFI_PASSWORD "11860868"

// =========================================================================
#define API_KEY       "AIzaSyD0i6DhiIncmRaEd6D3UZjLJ1EHNBzXces"
#define DATABASE_URL  "final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"

// Node Firebase đẩy trực tiếp dữ liệu tấm cố định
#define FIREBASE_STATIC_PATH   "/solar/static"
#define FIREBASE_TEST_PATH     "/solar/test_devkit"

// =========================================================================
// SƠ ĐỒ CHÂN (PINOUT) CHO ESP32 DEVKIT V1 (30 pins / 36 pins)
// =========================================================================
#ifndef I2C_SDA_PIN
#define I2C_SDA_PIN   8        // ESP32-S3: GPIO 8
#endif
#ifndef I2C_SCL_PIN
#define I2C_SCL_PIN   9        // ESP32-S3: GPIO 9
#endif
#ifndef DS3231_SQW_PIN
#define DS3231_SQW_PIN 47      // ESP32-S3: GPIO 47 (Chân ngắt báo thức Alarm 1 RTC DS3231 - J3 Pin 17)
#endif
#define INA226_ADDR   0x40     // Địa chỉ I2C mặc định của INA226 (hoặc quét tự động)

// Thông số mạch đo INA226
#define SHUNT_RESISTOR_OHM     0.100   // Điện trở Shunt R100 trên mạch = 0.1 Ohm
#define MAX_EXPECTED_CURRENT_A 0.80    // Dòng điện tối đa dự kiến (Ampe) - R100 (0.1 ohm) * 0.8A = 80mV <= 81.9mV chuẩn INA226

// 2. Chân tín hiệu LED RGB / LED Strip (DIN)
#define PIN_LED_DIN   18       // D18 (GPIO 18) nối chân DIN của LED
#define NUM_LEDS      8        // Số lượng bóng LED (mặc định 8, tuỳ chỉnh theo dải LED)
#define LED_BRIGHTNESS 80      // Độ sáng mặc định (0 - 255)

// 3. Chân cảm biến quang trở LDR (tuỳ chọn khi test xoay pin - ADC1 Pins)
#define PIN_LDR_TOP    34      // D34 (GPIO 34)
#define PIN_LDR_BOTTOM 35      // D35 (GPIO 35)
#define PIN_LDR_LEFT   32      // D32 (GPIO 32)
#define PIN_LDR_RIGHT  33      // D33 (GPIO 33)

// Cấu trúc dữ liệu cảm biến quang TEMT6000
struct OpticalData {
  int top;
  int bot;
  int lft;
  int rgt;
  int diffAz;       // Raw diff: Lft - Rgt
  int diffEl;       // Raw diff: Top - Bot
  float normDiffAz; // Sai số chuẩn hóa Azimuth: (Lft - Rgt)/(Lft + Rgt) trong khoảng [-1.0, +1.0]
  float normDiffEl; // Sai số chuẩn hóa Elevation: (Top - Bot)/(Top + Bot) trong khoảng [-1.0, +1.0]
  int avg;          // Cường độ sáng trung bình 4 mắt
  uint32_t timestamp; // Mốc thời gian đo (ms)
};

#endif // CONFIG_H
