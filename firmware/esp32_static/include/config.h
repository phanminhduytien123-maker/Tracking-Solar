#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// CẤU HÌNH WIFI NHÀ
// =========================================================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// =========================================================================
// CẤU HÌNH FIREBASE REALTIME DATABASE (Lấy từ Firebase Console)
// =========================================================================
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app/"

// =========================================================================
// ĐỊNH NGHĨA CHÂN I2C & INA219 (TẤM CỐ ĐỊNH)
// =========================================================================
#define I2C_SDA_PIN     8
#define I2C_SCL_PIN     9
#define INA219_I2C_ADDR 0x41  // Địa chỉ I2C của INA219 tấm cố định (hoặc 0x40 tuỳ bạn set)

// Góc lắp đặt vật lý cố định
#define FIXED_AZIMUTH_DEG   180.0
#define FIXED_ELEVATION_DEG 15.0

// Tần số gửi Telemetry lên Firebase (Mili-giây)
#define TELEMETRY_INTERVAL_MS 1000

#endif // CONFIG_H
