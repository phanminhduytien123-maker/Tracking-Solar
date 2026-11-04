#ifndef CALIBRATION_STORE_H
#define CALIBRATION_STORE_H

#include <Arduino.h>
#include "param_registry.h"

#define CALIB_MAGIC_NUMBER  0x534F4C52  // Ký hiệu ASCII: "SOLR"
#define CALIB_VERSION       1
#define CALIB_NVS_NAMESPACE "solar_calib"
#define CALIB_NVS_KEY       "calib_blob"

// Cấu trúc tiêu đề gói dữ liệu lưu Flash (NVS)
struct CalibHeader {
  uint32_t magic;      // 0x534F4C52
  uint16_t version;    // 1
  uint16_t count;      // Số lượng tham số lưu
  uint32_t timestamp;  // Thời điểm lưu (millis hoặc epoch)
  uint32_t crc32;      // Mã kiểm tra toàn vẹn CRC32 của mảng bản ghi
};

// Cấu trúc từng bản ghi tham số trong NVS
struct CalibRecord {
  char     name[PARAM_MAX_NAME_LEN];
  float    val;
  uint8_t  source;
  uint8_t  status;
  uint16_t sample_count;
  float    std_dev;
  uint32_t timestamp;
  char     bench_step[PARAM_MAX_STEP_LEN];
};

class CalibrationStoreClass {
public:
  // Khởi động NVS, tự động nạp cấu hình đã lưu (nếu hợp lệ sẽ ghi đè default)
  bool begin();

  // Lưu toàn bộ bảng tham số hiện tại vào ESP32 NVS với mã CRC32
  bool save();

  // Tải lại cấu hình từ NVS và kiểm tra CRC32
  bool load();

  // Xóa trắng NVS và nạp lại cấu hình mặc định (Factory Reset)
  bool resetToDefaults();

  // Xuất bảng thông số ra chuỗi JSON (sẵn sàng đẩy lên Firebase /solar/calibration)
  String exportJson() const;

  // In JSON trực tiếp ra Serial
  void printJson() const;

  // Tính toán CRC32 chuẩn IEEE 802.3
  static uint32_t calculateCRC32(const uint8_t* data, size_t length);
};

extern CalibrationStoreClass CalibrationStore;

#endif // CALIBRATION_STORE_H
