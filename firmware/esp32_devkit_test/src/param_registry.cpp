#include "param_registry.h"

ParamRegistryClass ParamRegistry;

int ParamRegistryClass::findIndex(const char* name) const {
  if (!name) return -1;
  for (size_t i = 0; i < _paramCount; i++) {
    if (strcasecmp(_params[i].name, name) == 0) {
      return (int)i;
    }
  }
  return -1;
}

bool ParamRegistryClass::registerParam(const char* name, float defaultVal, const char* unit,
                                      float minVal, float maxVal, ParamPolicy policy,
                                      const char* benchStep) {
  if (!name || _paramCount >= MAX_PARAMS) return false;
  int existing = findIndex(name);
  if (existing >= 0) return false;

  ParamEntry &e = _params[_paramCount++];
  memset(&e, 0, sizeof(ParamEntry));
  strncpy(e.name, name, PARAM_MAX_NAME_LEN - 1);
  e.val = defaultVal;
  strncpy(e.unit, unit ? unit : "", PARAM_MAX_UNIT_LEN - 1);
  e.min_val = minVal;
  e.max_val = maxVal;
  e.source = PARAM_SRC_DEFAULT;
  e.timestamp = millis();
  strncpy(e.bench_step, benchStep ? benchStep : "INIT", PARAM_MAX_STEP_LEN - 1);
  e.std_dev = 0.0f;
  e.sample_count = 1;
  e.status = PARAM_STATUS_UNVERIFIED;
  e.policy = policy;
  e.history_count = 0;
  return true;
}

void ParamRegistryClass::init() {
  _paramCount = 0;

  // 1. Cấu hình Driver Động cơ Bước & Tỉ số truyền cơ khí
  registerParam("E_PULSES_PER_REV_AZ", 25600.0f, "pulses",  200.0f,  51200.0f, POLICY_AUTO_ON_CONFIRM, "B0");
  registerParam("E_PULSES_PER_REV_EL", 25600.0f, "pulses",  200.0f,  51200.0f, POLICY_AUTO_ON_CONFIRM, "B0");
  registerParam("GEAR_RATIO_AZ",       3.0f,     "ratio",   1.0f,    50.0f,    POLICY_MANUAL_ONLY,     "B2");
  registerParam("GEAR_RATIO_EL",       3.0f,     "ratio",   1.0f,    50.0f,    POLICY_MANUAL_ONLY,     "B2");

  // 2. Cấu hình Encoder Quang 3806 & Vị trí lắp
  registerParam("ENCODER_PPR_AZ",      600.0f,   "ppr",     100.0f,  10000.0f, POLICY_MANUAL_ONLY,     "INIT");
  registerParam("ENCODER_PPR_EL",      600.0f,   "ppr",     100.0f,  10000.0f, POLICY_MANUAL_ONLY,     "INIT");
  // ENCODER_ON_LOAD: 0 = UNKNOWN, 1 = ON_LOAD (0.15°/count), 2 = ON_MOTOR (0.05°/count)
  registerParam("ENCODER_ON_LOAD",     1.0f,     "enum",    0.0f,    2.0f,     POLICY_AUTO_ON_CONFIRM, "B2");

  // 3. Cực tính chiều quay động cơ & Chiều đếm Encoder (0 = bình thường, 1 = đảo chiều)
  registerParam("DIR_POL_AZ",          0.0f,     "bool",    0.0f,    1.0f,     POLICY_AUTO_ON_CONFIRM, "B1");
  registerParam("DIR_POL_EL",          0.0f,     "bool",    0.0f,    1.0f,     POLICY_AUTO_ON_CONFIRM, "B1");
  registerParam("ENC_INVERT_AZ",       0.0f,     "bool",    0.0f,    1.0f,     POLICY_AUTO_ON_CONFIRM, "B1");
  registerParam("ENC_INVERT_EL",       0.0f,     "bool",    0.0f,    1.0f,     POLICY_AUTO_ON_CONFIRM, "B1");

  // 4. Giới hạn Tốc độ & Gia tốc (FastAccelStepper Profile S-Curve)
  registerParam("T_MAX_SPEED_AZ",      3500.0f,  "Hz",      100.0f,  25000.0f, POLICY_AUTO_ON_CONFIRM, "B4");
  registerParam("T_MAX_SPEED_EL",      2500.0f,  "Hz",      100.0f,  25000.0f, POLICY_AUTO_ON_CONFIRM, "B4");
  registerParam("U_MAX_ACCEL_AZ",      7000.0f,  "Hz/s",    100.0f,  50000.0f, POLICY_AUTO_ON_CONFIRM, "B4");
  registerParam("U_MAX_ACCEL_EL",      5000.0f,  "Hz/s",    100.0f,  50000.0f, POLICY_AUTO_ON_CONFIRM, "B4");
  registerParam("MANUAL_SPEED_AZ",     1200.0f,  "Hz",      100.0f,  10000.0f, POLICY_MANUAL_ONLY,     "INIT");
  registerParam("MANUAL_SPEED_EL",     1200.0f,  "Hz",      100.0f,  10000.0f, POLICY_MANUAL_ONLY,     "INIT");

  // 5. Chu trình tìm gốc Homing 2 cấp tốc độ
  registerParam("HOMING_FAST_AZ",      1200.0f,  "Hz",      100.0f,  10000.0f, POLICY_AUTO_ON_CONFIRM, "B5");
  registerParam("HOMING_FAST_EL",      1200.0f,  "Hz",      100.0f,  10000.0f, POLICY_AUTO_ON_CONFIRM, "B5");
  registerParam("HOMING_SLOW_AZ",      200.0f,   "Hz",      10.0f,   1000.0f,  POLICY_AUTO_ON_CONFIRM, "B5");
  registerParam("HOMING_SLOW_EL",      200.0f,   "Hz",      10.0f,   1000.0f,  POLICY_AUTO_ON_CONFIRM, "B5");
  registerParam("HOMING_RETRACT_AZ",   1000.0f,  "pulses",  50.0f,   10000.0f, POLICY_MANUAL_ONLY,     "B5");
  registerParam("HOMING_RETRACT_EL",   1000.0f,  "pulses",  50.0f,   10000.0f, POLICY_MANUAL_ONLY,     "B5");
  registerParam("DEBOUNCE_MS",         3.0f,     "ms",      1.0f,    50.0f,    POLICY_MANUAL_ONLY,     "B5");

  // 6. Giới hạn mềm phần mềm & Hình học công tắc Home
  registerParam("SOFT_MIN_AZ",         0.0f,     "deg",   -360.0f,   360.0f,   POLICY_AUTO_ON_CONFIRM, "B6");
  registerParam("SOFT_MAX_AZ",         270.0f,   "deg",   -360.0f,   360.0f,   POLICY_AUTO_ON_CONFIRM, "B6");
  registerParam("G_AZ_HOME",           45.0f,    "deg",   -360.0f,   360.0f,   POLICY_MANUAL_ONLY,     "INIT");
  registerParam("H_AZ_OFFSET",         0.0f,     "deg",   -180.0f,   180.0f,   POLICY_MANUAL_ONLY,     "INIT");
  registerParam("J_EL_HOME",           90.0f,    "deg",   -180.0f,   360.0f,   POLICY_AUTO_ON_CONFIRM, "B6");
  registerParam("L_EL_MIN_SOFT",       10.0f,    "deg",   -180.0f,   360.0f,   POLICY_AUTO_ON_CONFIRM, "B6");
  registerParam("SOFT_MAX_EL",         90.0f,    "deg",   -180.0f,   360.0f,   POLICY_AUTO_ON_CONFIRM, "B6");

  // 7. Vị trí góc khởi đầu mặc định khi chưa bắt đầu ngày mới
  registerParam("INIT_DEFAULT_AZ",     90.0f,    "deg",     0.0f,    270.0f,   POLICY_MANUAL_ONLY,     "INIT");
  registerParam("INIT_DEFAULT_EL",    -58.35f,   "deg",    -90.0f,   0.0f,     POLICY_MANUAL_ONLY,     "INIT");
  registerParam("HOME_ON_WAKE",        0.0f,     "bool",    0.0f,    1.0f,     POLICY_MANUAL_ONLY,     "INIT");

  // 8. Thuật toán Bám quang (Optical Filter & Proportional Tracking)
  registerParam("OPT_NORM_DEADBAND",   0.05f,    "ratio",   0.005f,  0.20f,    POLICY_AUTO_ON_CONFIRM, "B12");
  registerParam("OPT_FINE_THRESH",     0.15f,    "ratio",   0.05f,   0.50f,    POLICY_MANUAL_ONLY,     "INIT");
  registerParam("OPT_EMA_ALPHA",       0.25f,    "ratio",   0.05f,   1.0f,     POLICY_MANUAL_ONLY,     "B11");
  registerParam("OPT_DIFF_THRESHOLD",  0.05f,    "ratio",   0.01f,   0.50f,    POLICY_MANUAL_ONLY,     "B12");
  registerParam("TRACK_INTERVAL_MS",   900000.0f, "ms",      1000.0f, 3600000.0f, POLICY_MANUAL_ONLY,     "INIT");

  // 9. Giám sát an toàn Kẹt Động Cơ (Stall Detection) & Độ Rơ Khớp Nối (Backlash)
  registerParam("STALL_THRESH_PULSES", 300.0f,   "pulses",  50.0f,   5000.0f,  POLICY_AUTO_ON_CONFIRM, "B3");
  registerParam("STALL_THRESH_COUNTS", 5.0f,     "count",   1.0f,    50.0f,    POLICY_MANUAL_ONLY,     "INIT");
  registerParam("BACKLASH_STEPS_AZ",   0.0f,     "pulses",  0.0f,    2000.0f,  POLICY_AUTO_ON_CONFIRM, "B7");
  registerParam("BACKLASH_STEPS_EL",   0.0f,     "pulses",  0.0f,    2000.0f,  POLICY_AUTO_ON_CONFIRM, "B7");

  // 10. Cảm biến đo công suất INA226 (Tracker & Static)
  registerParam("INA_SHUNT_TRK",       0.002f,   "ohm",     0.0001f, 1.0f,     POLICY_MANUAL_ONLY,     "B14");
  registerParam("INA_MAX_CURR_TRK",    10.0f,    "A",       0.1f,    50.0f,    POLICY_MANUAL_ONLY,     "B14");
  registerParam("INA_SHUNT_STA",       0.002f,   "ohm",     0.0001f, 1.0f,     POLICY_MANUAL_ONLY,     "B14");
  registerParam("INA_MAX_CURR_STA",    10.0f,    "A",       0.1f,    50.0f,    POLICY_MANUAL_ONLY,     "B14");

  // 11. Tấm cố định đối chứng (Fixed Panel Parameters)
  registerParam("FIXED_AZ_DEG",        180.0f,   "deg",     0.0f,    360.0f,   POLICY_MANUAL_ONLY,     "INIT");
  registerParam("FIXED_TILT_DEG",      15.0f,    "deg",     0.0f,    90.0f,    POLICY_MANUAL_ONLY,     "INIT");

  // 12. Địa lý & La bàn địa từ
  registerParam("COMPASS_DECLINATION", -0.5f,    "deg",    -30.0f,   30.0f,    POLICY_MANUAL_ONLY,     "B9");
  registerParam("PANEL_LATITUDE",      10.7831f, "deg",    -90.0f,   90.0f,    POLICY_MANUAL_ONLY,     "INIT");
  registerParam("PANEL_LONGITUDE",     106.6721f,"deg",    -180.0f,  180.0f,   POLICY_MANUAL_ONLY,     "INIT");
  registerParam("TIMEZONE_OFFSET",     7.0f,     "hours",  -12.0f,   14.0f,    POLICY_MANUAL_ONLY,     "INIT");

  // 13. Thuật toán hợp nhất Hybrid (NOAA Feedforward + TEMT6000 Optical Feedback)
  registerParam("HYBRID_Z_SENSITIVITY",15.0f,    "deg",     1.0f,    45.0f,    POLICY_MANUAL_ONLY,     "INIT");
  registerParam("HYBRID_Z2_SAT_DEG",   6.0f,     "deg",     1.0f,    30.0f,    POLICY_MANUAL_ONLY,     "INIT");
  registerParam("POS_PID_DEADBAND_DEG",0.45f,    "deg",     0.1f,    5.0f,     POLICY_MANUAL_ONLY,     "INIT");
  registerParam("POS_STEP_SPEED_HZ",   2000.0f,  "Hz",      200.0f,  10000.0f, POLICY_MANUAL_ONLY,     "INIT");
}

void ParamRegistryClass::resetToDefaults() {
  init();
}

float ParamRegistryClass::get(const char* name, float defaultVal) const {
  int idx = findIndex(name);
  if (idx >= 0) return _params[idx].val;
  return defaultVal;
}

int32_t ParamRegistryClass::getInt(const char* name, int32_t defaultVal) const {
  int idx = findIndex(name);
  if (idx >= 0) return (int32_t)roundf(_params[idx].val);
  return defaultVal;
}

bool ParamRegistryClass::getBool(const char* name, bool defaultVal) const {
  int idx = findIndex(name);
  if (idx >= 0) return (_params[idx].val > 0.5f);
  return defaultVal;
}

ParamEntry* ParamRegistryClass::getEntry(const char* name) {
  int idx = findIndex(name);
  if (idx >= 0) return &_params[idx];
  return nullptr;
}

const ParamEntry* ParamRegistryClass::getEntry(const char* name) const {
  int idx = findIndex(name);
  if (idx >= 0) return &_params[idx];
  return nullptr;
}

const ParamEntry* ParamRegistryClass::getByIndex(size_t index) const {
  if (index < _paramCount) return &_params[index];
  return nullptr;
}

ParamEntry* ParamRegistryClass::getByIndexMutable(size_t index) {
  if (index < _paramCount) return &_params[index];
  return nullptr;
}

bool ParamRegistryClass::set(const char* name, float value, 
                             ParamSource src, const char* step, 
                             float stdDev, uint16_t sampleCount) {
  int idx = findIndex(name);
  if (idx < 0) {
    Serial.printf("[PARAM] Loi: Khong tim thay tham so '%s'!\n", name);
    return false;
  }

  ParamEntry &e = _params[idx];

  // Kiểm tra ngưỡng an toàn min_val <= value <= max_val
  if (value < e.min_val || value > e.max_val) {
    Serial.printf("[PARAM] CANH BAO: Gia tri %.3f nam ngoai khoang an toan [%.3f, %.3f] cua '%s'!\n",
                  value, e.min_val, e.max_val, e.name);
    return false;
  }

  // Đẩy giá trị cũ vào lịch sử rollback (shift ring-buffer tối đa 5 giá trị)
  if (e.history_count < PARAM_MAX_HISTORY) {
    e.history[e.history_count++] = e.val;
  } else {
    for (int i = 0; i < PARAM_MAX_HISTORY - 1; i++) {
      e.history[i] = e.history[i + 1];
    }
    e.history[PARAM_MAX_HISTORY - 1] = e.val;
  }

  // Cập nhật giá trị mới
  e.val = value;
  e.source = src;
  e.timestamp = millis();
  if (step) strncpy(e.bench_step, step, PARAM_MAX_STEP_LEN - 1);
  e.std_dev = stdDev;
  e.sample_count = (sampleCount > 0) ? sampleCount : 1;
  e.status = PARAM_STATUS_VALID;

  return true;
}

bool ParamRegistryClass::rollback(const char* name) {
  int idx = findIndex(name);
  if (idx < 0) {
    Serial.printf("[PARAM] Loi: Khong tim thay tham so '%s'!\n", name);
    return false;
  }

  ParamEntry &e = _params[idx];
  if (e.history_count == 0) {
    Serial.printf("[PARAM] Khong co lich su gia tri truoc do cho '%s' de rollback!\n", e.name);
    return false;
  }

  float prevVal = e.history[--e.history_count];
  Serial.printf("[PARAM] Rollback '%s': %.3f -> %.3f (%s)\n", e.name, e.val, prevVal, e.unit);
  e.val = prevVal;
  e.source = PARAM_SRC_MANUAL;
  e.timestamp = millis();
  strncpy(e.bench_step, "ROLLBACK", PARAM_MAX_STEP_LEN - 1);
  return true;
}

void ParamRegistryClass::printTable() const {
  Serial.println("\n+----+----------------------+------------+----------+------------+------------+---------+--------+--------+------------+");
  Serial.println("| No | Parameter Name       | Value      | Unit     | Min Safe   | Max Safe   | Source  | Step   | StdDev | Status     |");
  Serial.println("+----+----------------------+------------+----------+------------+------------+---------+--------+--------+------------+");

  for (size_t i = 0; i < _paramCount; i++) {
    const ParamEntry &e = _params[i];

    const char* srcStr = "DEFAULT";
    if (e.source == PARAM_SRC_AUTO)   srcStr = "AUTO";
    if (e.source == PARAM_SRC_MANUAL) srcStr = "MANUAL";

    const char* statStr = "UNVERIFIED";
    if (e.status == PARAM_STATUS_VALID) statStr = "VALID";
    if (e.status == PARAM_STATUS_STALE) statStr = "STALE";

    char valBuf[16];
    if (fabs(e.val) >= 100.0f || e.val == (float)((int32_t)e.val)) {
      snprintf(valBuf, sizeof(valBuf), "%.2f", e.val);
    } else {
      snprintf(valBuf, sizeof(valBuf), "%.4f", e.val);
    }

    char minBuf[16], maxBuf[16];
    snprintf(minBuf, sizeof(minBuf), "%.1f", e.min_val);
    snprintf(maxBuf, sizeof(maxBuf), "%.1f", e.max_val);

    char devBuf[12];
    if (e.std_dev > 0.0f) snprintf(devBuf, sizeof(devBuf), "%.3f", e.std_dev);
    else strncpy(devBuf, "-", sizeof(devBuf));

    Serial.printf("| %2d | %-20s | %10s | %-8s | %10s | %10s | %-7s | %-6s | %6s | %-10s |\n",
                  (int)(i + 1), e.name, valBuf, e.unit, minBuf, maxBuf, srcStr, e.bench_step, devBuf, statStr);
  }
  Serial.println("+----+----------------------+------------+----------+------------+------------+---------+--------+--------+------------+");
  Serial.printf("Tong so tham so: %d | Co san lenh: 'set <TEN> <GIATRI>' hoac 'rollback <TEN>'\n\n", (int)_paramCount);
}
