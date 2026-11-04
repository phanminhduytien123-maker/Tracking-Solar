#ifndef OFFLINE_QUEUE_H
#define OFFLINE_QUEUE_H

#include <Arduino.h>
#include <LittleFS.h>

#pragma pack(push, 1)
struct MinuteRecord {
  uint32_t epoch_ts;        // Unix epoch timestamp (UTC+7)
  float delta_wh_trk;      // Wh tăng trong 1 phút qua của tấm Tracker
  float delta_wh_sta;      // Wh tăng trong 1 phút qua của tấm Static
  float v_avg_trk;         // Điện áp trung bình (V) Tracker
  float i_avg_trk;         // Dòng trung bình (A) Tracker
  float p_avg_trk;         // Công suất trung bình (W) Tracker
  float p_peak_trk;        // Công suất đỉnh (W) Tracker
  float v_avg_sta;         // Điện áp trung bình (V) Static
  float i_avg_sta;         // Dòng trung bình (A) Static
  float p_avg_sta;         // Công suất trung bình (W) Static
  float p_peak_sta;        // Công suất đỉnh (W) Static
  float rtc_temp;          // Nhiệt độ DS3231 (°C)
  uint8_t fsm_state;       // 0: IDLE, 1: HOMING, 2: SEEK_DEF, 3: TRACKING, 4: MOVING, 5: PARK, 6: SLEEP
  uint8_t sys_mode;        // 0: MANUAL, 1: AUTO
  uint16_t flags;          // Bit 0: STALL, Bit 1: LIMIT_HIT, Bit 2: UNCALIBRATED, Bit 3: CLOUD_MODE
};

struct QueueHeader {
  uint32_t magic;           // 0x534F4C51 ('SOLQ')
  uint32_t head_index;      // Vị trí bản ghi đầu tiên cần đọc (FIFO)
  uint32_t tail_index;      // Vị trí bản ghi tiếp theo sẽ ghi
  uint32_t total_pushed;    // Tổng số bản ghi đã từng ghi
  uint32_t total_popped;    // Tổng số bản ghi đã từng pop
};
#pragma pack(pop)

class OfflineQueueManager {
public:
  OfflineQueueManager();
  bool begin();
  bool pushRecord(const MinuteRecord& rec);
  bool peekRecord(MinuteRecord& rec);
  bool popRecord();
  size_t getPendingCount();
  void clear();
  size_t getFileSize();
  bool isInitialized() const { return _initialized; }

private:
  const char* _queuePath = "/offline_queue.bin";
  const size_t _maxRecords = 10000; // Tối đa 10,000 phút = ~7 ngày lưu trữ offline liên tục
  bool _initialized = false;
  SemaphoreHandle_t _queueMutex;

  bool readHeader(QueueHeader& hdr);
  bool writeHeader(const QueueHeader& hdr);
};

extern OfflineQueueManager OfflineQueue;

#endif // OFFLINE_QUEUE_H
