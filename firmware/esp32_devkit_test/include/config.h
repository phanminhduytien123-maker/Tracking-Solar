#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// CẤU HÌNH WIFI NHÀ
// =========================================================================
#define WIFI_SSID     "Duy Loc 2.4GHz"
#define WIFI_PASSWORD "0947202895"

// =========================================================================
// CẤU HÌNH FIREBASE REALTIME DATABASE (ĐỒNG BỘ TẤM CỐ ĐỊNH)
// =========================================================================
#define API_KEY       "AIzaSyD0i6DhiIncmRaEd6D3UZjLJ1EHNBzXces"
#define DATABASE_URL  "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Node Firebase đẩy trực tiếp dữ liệu tấm cố định
#define FIREBASE_STATIC_PATH   "/solar/static"
#define FIREBASE_TEST_PATH     "/solar/test_devkit"

// =========================================================================
// SƠ ĐỒ CHÂN (PINOUT) CHO ESP32 DEVKIT V1 (30 pins / 36 pins)
// =========================================================================
// 1. Giao tiếp I2C Cảm biến INA226
#define I2C_SDA_PIN   21       // D21 (GPIO 21) nối chân SDA của INA226
#define I2C_SCL_PIN   22       // D22 (GPIO 22) nối chân SCL của INA226
#define INA226_ADDR   0x40     // Địa chỉ I2C mặc định của INA226 (hoặc quét tự động)

// Thông số mạch đo INA226
#define SHUNT_RESISTOR_OHM     0.100   // Điện trở Shunt R100 trên mạch = 0.1 Ohm
#define MAX_EXPECTED_CURRENT_A 3.0     // Dòng điện tối đa dự kiến (Ampe)

// 2. Chân tín hiệu LED RGB / LED Strip (DIN)
#define PIN_LED_DIN   18       // D18 (GPIO 18) nối chân DIN của LED
#define NUM_LEDS      8        // Số lượng bóng LED (mặc định 8, tuỳ chỉnh theo dải LED)
#define LED_BRIGHTNESS 80      // Độ sáng mặc định (0 - 255)

// 3. Chân cảm biến quang trở LDR (tuỳ chọn khi test xoay pin - ADC1 Pins)
#define PIN_LDR_TOP    34      // D34 (GPIO 34)
#define PIN_LDR_BOTTOM 35      // D35 (GPIO 35)
#define PIN_LDR_LEFT   32      // D32 (GPIO 32)
#define PIN_LDR_RIGHT  33      // D33 (GPIO 33)

// =========================================================================
// THỜI GIAN ĐỊNH KỲ (Mili-giây)
// =========================================================================
#define SENSOR_READ_INTERVAL_MS 500    // Đọc cảm biến mỗi 500ms
#define TELEMETRY_INTERVAL_MS   1000   // Gửi Firebase & in Serial mỗi 1000ms

#endif // CONFIG_H
