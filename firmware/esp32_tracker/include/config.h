#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// CẤU HÌNH WIFI NHÀ
// =========================================================================
#define WIFI_SSID "Tyny"
#define WIFI_PASSWORD "11860868"

// =========================================================================
// CẤU HÌNH FIREBASE REALTIME DATABASE (Lấy từ Firebase Console)
// =========================================================================
#define API_KEY "AIzaSyD0i6DhiIncmRaEd6D3UZjLJ1EHNBzXces"
#define DATABASE_URL "final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"

// =========================================================================
// ĐỊNH NGHĨA CHÂN CẢM BIẾN & NGOẠI VI CHO ESP32-S3
// =========================================================================
// 4 Cảm biến quang trở LDR (ADC Pins)
#define PIN_LDR_TOP 4
#define PIN_LDR_BOTTOM 5
#define PIN_LDR_LEFT 6
#define PIN_LDR_RIGHT 7

// I2C Pins cho Cảm biến  INA226 (Mặc định ESP32-S3: SDA=8, SCL=9 hoặc theo
// board của bạn)
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9
#define INA226_I2C_ADDR 0x40

// Tần số gửi Telemetry lên Firebase (Mili-giây)
#define TELEMETRY_INTERVAL_MS 1000

#endif // CONFIG_H
