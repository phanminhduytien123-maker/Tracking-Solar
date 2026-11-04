#ifndef PARAM_REGISTRY_H
#define PARAM_REGISTRY_H

#include <Arduino.h>

// Nguồn gốc của tham số
enum ParamSource : uint8_t {
  PARAM_SRC_DEFAULT = 0, // Giá trị mặc định trong code
  PARAM_SRC_AUTO    = 1, // Do Bench wizard tự động đo và tính toán
  PARAM_SRC_MANUAL  = 2  // Do người dùng cấu hình thủ công qua Serial
};

// Trạng thái kiểm chứng của tham số
enum ParamStatus : uint8_t {
  PARAM_STATUS_UNVERIFIED = 0, // Chưa qua phép thử/kiểm chứng
  PARAM_STATUS_VALID      = 1, // Đã kiểm chứng, hợp lệ
  PARAM_STATUS_STALE      = 2  // Cũ / Cần hiệu chuẩn lại
};

// Chính sách cập nhật tham số
enum ParamPolicy : uint8_t {
  POLICY_AUTO_ON_CONFIRM = 0, // Đo xong hỏi xác nhận [Y/N] mới lưu
  POLICY_MANUAL_ONLY     = 1, // Chỉ cho phép cập nhật bằng lệnh set thủ công
  POLICY_SUGGEST_ONLY    = 2  // Chỉ gợi ý trên Serial, không ghi đè cấu hình chính
};

#define PARAM_MAX_HISTORY   5
#define PARAM_MAX_NAME_LEN  24
#define PARAM_MAX_UNIT_LEN  12
#define PARAM_MAX_STEP_LEN  10

struct ParamEntry {
  char        name[PARAM_MAX_NAME_LEN];
  float       val;
  char        unit[PARAM_MAX_UNIT_LEN];
  float       min_val;
  float       max_val;
  ParamSource source;
  uint32_t    timestamp;                       // Millis hoặc RTC epoch
  char        bench_step[PARAM_MAX_STEP_LEN];  // "INIT", "B0".."B15", "MANUAL"
  float       std_dev;                         // Độ lệch chuẩn nếu có đo lặp
  uint16_t    sample_count;                    // Số mẫu đo
  ParamStatus status;
  ParamPolicy policy;

  // Lịch sử tối đa 5 giá trị gần nhất phục vụ lệnh rollback
  float       history[PARAM_MAX_HISTORY];
  uint8_t     history_count;
};

class ParamRegistryClass {
public:
  void init();

  // Truy xuất giá trị
  float get(const char* name, float defaultVal = 0.0f) const;
  int32_t getInt(const char* name, int32_t defaultVal = 0) const;
  bool getBool(const char* name, bool defaultVal = false) const;

  // Lấy con trỏ struct
  ParamEntry* getEntry(const char* name);
  const ParamEntry* getEntry(const char* name) const;

  // Cập nhật tham số (có kiểm tra khoảng an toàn min_val <= value <= max_val)
  bool set(const char* name, float value, 
           ParamSource src = PARAM_SRC_MANUAL, 
           const char* step = "MANUAL", 
           float stdDev = 0.0f, 
           uint16_t sampleCount = 1);

  // Khôi phục giá trị trước đó từ history
  bool rollback(const char* name);

  // In bảng ASCII tổng hợp trực quan ra Serial
  void printTable() const;

  // Duyệt danh sách
  size_t count() const { return _paramCount; }
  const ParamEntry* getByIndex(size_t index) const;
  ParamEntry* getByIndexMutable(size_t index);

  // Đăng ký tham số vào registry
  bool registerParam(const char* name, float defaultVal, const char* unit,
                     float minVal, float maxVal, ParamPolicy policy,
                     const char* benchStep = "INIT");

  // Reset toàn bộ về giá trị default ban đầu
  void resetToDefaults();

private:
  static const size_t MAX_PARAMS = 64;
  ParamEntry _params[MAX_PARAMS];
  size_t     _paramCount = 0;

  int findIndex(const char* name) const;
};

extern ParamRegistryClass ParamRegistry;

#endif // PARAM_REGISTRY_H
