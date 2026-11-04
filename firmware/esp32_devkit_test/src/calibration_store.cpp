#include "calibration_store.h"
#include <Preferences.h>

CalibrationStoreClass CalibrationStore;

uint32_t CalibrationStoreClass::calculateCRC32(const uint8_t* data, size_t length) {
  uint32_t crc = 0xFFFFFFFF;
  for (size_t i = 0; i < length; i++) {
    crc ^= data[i];
    for (uint8_t j = 0; j < 8; j++) {
      crc = (crc >> 1) ^ (0xEDB88320 & (-(crc & 1)));
    }
  }
  return ~crc;
}

bool CalibrationStoreClass::begin() {
  // 1. Luôn nạp bảng mặc định trước
  ParamRegistry.init();

  // 2. Thử tải cấu hình từ NVS Flash (nếu có và CRC hợp lệ sẽ ghi đè mặc định)
  bool loaded = load();
  if (loaded) {
    Serial.println(">> [CALIB STORE] Da nap thanh cong tham so tu Flash NVS (Ghi de gia tri mac dinh)!");
  } else {
    Serial.println(">> [CALIB STORE] Chua co du lieu NVS hop le -> Su dung toan bo tham so MAC DINH (DEFAULT).");
  }
  return loaded;
}

bool CalibrationStoreClass::save() {
  size_t count = ParamRegistry.count();
  if (count == 0) return false;

  size_t recordsSize = count * sizeof(CalibRecord);
  size_t totalSize = sizeof(CalibHeader) + recordsSize;

  uint8_t* buffer = (uint8_t*)malloc(totalSize);
  if (!buffer) {
    Serial.println(">> [CALIB STORE] Loi: Khong du bo nho RAM de luu NVS!");
    return false;
  }

  CalibHeader* hdr = (CalibHeader*)buffer;
  CalibRecord* records = (CalibRecord*)(buffer + sizeof(CalibHeader));

  for (size_t i = 0; i < count; i++) {
    const ParamEntry* e = ParamRegistry.getByIndex(i);
    if (!e) continue;

    memset(&records[i], 0, sizeof(CalibRecord));
    strncpy(records[i].name, e->name, PARAM_MAX_NAME_LEN - 1);
    records[i].val = e->val;
    records[i].source = (uint8_t)e->source;
    records[i].status = (uint8_t)e->status;
    records[i].sample_count = e->sample_count;
    records[i].std_dev = e->std_dev;
    records[i].timestamp = e->timestamp;
    strncpy(records[i].bench_step, e->bench_step, PARAM_MAX_STEP_LEN - 1);
  }

  uint32_t crc = calculateCRC32((const uint8_t*)records, recordsSize);

  hdr->magic = CALIB_MAGIC_NUMBER;
  hdr->version = CALIB_VERSION;
  hdr->count = (uint16_t)count;
  hdr->timestamp = millis();
  hdr->crc32 = crc;

  Preferences calibPrefs;
  if (!calibPrefs.begin(CALIB_NVS_NAMESPACE, false)) {
    Serial.println(">> [CALIB STORE] Loi: Khong the mo NVS namespace de ghi!");
    free(buffer);
    return false;
  }

  size_t bytesWritten = calibPrefs.putBytes(CALIB_NVS_KEY, buffer, totalSize);
  calibPrefs.end();
  free(buffer);

  if (bytesWritten == totalSize) {
    Serial.printf(">> [CALIB STORE] DA LUU %d THAM SO VAO NVS FLASH! CRC32 = 0x%08X (%d bytes)\n",
                  (int)count, crc, (int)totalSize);
    return true;
  } else {
    Serial.printf(">> [CALIB STORE] Loi: Ghi NVS khong du bytes (%d / %d)!\n", (int)bytesWritten, (int)totalSize);
    return false;
  }
}

bool CalibrationStoreClass::load() {
  Preferences calibPrefs;
  if (!calibPrefs.begin(CALIB_NVS_NAMESPACE, true)) {
    return false;
  }

  if (!calibPrefs.isKey(CALIB_NVS_KEY)) {
    calibPrefs.end();
    return false;
  }

  size_t blobLen = calibPrefs.getBytesLength(CALIB_NVS_KEY);
  if (blobLen < sizeof(CalibHeader)) {
    calibPrefs.end();
    return false;
  }

  uint8_t* buffer = (uint8_t*)malloc(blobLen);
  if (!buffer) {
    calibPrefs.end();
    return false;
  }

  size_t bytesRead = calibPrefs.getBytes(CALIB_NVS_KEY, buffer, blobLen);
  calibPrefs.end();

  if (bytesRead != blobLen) {
    free(buffer);
    return false;
  }

  const CalibHeader* hdr = (const CalibHeader*)buffer;
  if (hdr->magic != CALIB_MAGIC_NUMBER || hdr->version != CALIB_VERSION) {
    Serial.printf(">> [CALIB STORE] Canh bao: Magic number (0x%08X) hoac Version (%d) khong khop!\n",
                  hdr->magic, hdr->version);
    free(buffer);
    return false;
  }

  size_t expectedRecordsSize = hdr->count * sizeof(CalibRecord);
  if (blobLen != sizeof(CalibHeader) + expectedRecordsSize) {
    Serial.println(">> [CALIB STORE] Canh bao: Kich thuoc du lieu NVS khong hop le!");
    free(buffer);
    return false;
  }

  const CalibRecord* records = (const CalibRecord*)(buffer + sizeof(CalibHeader));
  uint32_t calcCrc = calculateCRC32((const uint8_t*)records, expectedRecordsSize);

  if (calcCrc != hdr->crc32) {
    Serial.printf(">> [CALIB STORE] LOI CRC32! Tinh duoc: 0x%08X != Luu trong Flash: 0x%08X -> Bo qua du lieu loi!\n",
                  calcCrc, hdr->crc32);
    free(buffer);
    return false;
  }

  // CRC32 hoàn toàn hợp lệ -> Nạp dữ liệu vào ParamRegistry
  size_t updatedCount = 0;
  for (size_t i = 0; i < hdr->count; i++) {
    ParamEntry* e = ParamRegistry.getEntry(records[i].name);
    if (e) {
      // Đẩy giá trị cũ vào lịch sử rollback trước khi nạp
      if (e->history_count < PARAM_MAX_HISTORY) {
        e->history[e->history_count++] = e->val;
      }
      e->val = records[i].val;
      e->source = (ParamSource)records[i].source;
      e->status = (ParamStatus)records[i].status;
      e->sample_count = records[i].sample_count;
      e->std_dev = records[i].std_dev;
      e->timestamp = records[i].timestamp;
      strncpy(e->bench_step, records[i].bench_step, PARAM_MAX_STEP_LEN - 1);
      updatedCount++;
    }
  }

  free(buffer);
  Serial.printf(">> [CALIB STORE] Kiem tra CRC32 (0x%08X) THANH CONG! Da cap nhat %d tham so tu NVS.\n",
                hdr->crc32, (int)updatedCount);
  return true;
}

bool CalibrationStoreClass::resetToDefaults() {
  Preferences calibPrefs;
  if (calibPrefs.begin(CALIB_NVS_NAMESPACE, false)) {
    calibPrefs.clear();
    calibPrefs.end();
  }
  ParamRegistry.resetToDefaults();
  Serial.println(">> [CALIB STORE] DA XOA TOAN BO FLASH NVS VA RESET VE GIA TRI MAC DINH BAN DAU!");
  return true;
}

String CalibrationStoreClass::exportJson() const {
  String out;
  out.reserve(2048);

  out += "{\n";
  out += "  \"magic\": \"SOLR\",\n";
  out += "  \"version\": 1,\n";
  out += "  \"timestamp\": " + String(millis()) + ",\n";
  out += "  \"param_count\": " + String(ParamRegistry.count()) + ",\n";
  out += "  \"params\": {\n";

  size_t count = ParamRegistry.count();
  for (size_t i = 0; i < count; i++) {
    const ParamEntry* e = ParamRegistry.getByIndex(i);
    if (!e) continue;

    out += "    \"" + String(e->name) + "\": {";
    out += "\"val\": " + String(e->val, 4) + ", ";
    out += "\"unit\": \"" + String(e->unit) + "\", ";

    const char* srcStr = "DEFAULT";
    if (e->source == PARAM_SRC_AUTO)   srcStr = "AUTO";
    if (e->source == PARAM_SRC_MANUAL) srcStr = "MANUAL";
    out += "\"source\": \"" + String(srcStr) + "\", ";

    const char* statStr = "UNVERIFIED";
    if (e->status == PARAM_STATUS_VALID) statStr = "VALID";
    if (e->status == PARAM_STATUS_STALE) statStr = "STALE";
    out += "\"status\": \"" + String(statStr) + "\", ";

    out += "\"step\": \"" + String(e->bench_step) + "\", ";
    out += "\"std_dev\": " + String(e->std_dev, 3);
    out += "}";

    if (i + 1 < count) out += ",";
    out += "\n";
  }

  out += "  }\n";
  out += "}\n";
  return out;
}

void CalibrationStoreClass::printJson() const {
  Serial.println("\n========== [CALIBRATION JSON EXPORT (FIREBASE COMPLIANT)] ==========");
  Serial.println(exportJson());
  Serial.println("====================================================================\n");
}
