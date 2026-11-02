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
#define API_KEY "AIzaSyD0i6DhiIncmRaEd6D3UZjLJ1EHNBzXces"
#define DATABASE_URL                                                           \
  "https://"                                                                   \
  "final-project---tracking-solar-default-rtdb.asia-southeast1."               \
  "firebasedatabase.app/"

// =========================================================================
// ĐỊNH NGHĨA CHÂN I2C &  INA226 (TẤM CỐ ĐỊNH)
// =========================================================================
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9
#define INA226_I2C_ADDR                                                        \
  0x41 // Địa chỉ I2C của  INA226 tấm cố định (hoặc 0x40 tuỳ bạn set)

// Góc lắp đặt vật lý tấm cố định (Tham chiếu đối chứng)
#define FIXED_AZIMUTH_DEG 180.0
#define FIXED_TILT_BETA_DEG 15.0
#define FIXED_ELEVATION_EPS_DEG (90.0 - FIXED_TILT_BETA_DEG) // 75.0 độ ngửa

// Tần số gửi Telemetry lên Firebase (Mili-giây)
#define TELEMETRY_INTERVAL_MS 1000

#endif // CONFIG_H
