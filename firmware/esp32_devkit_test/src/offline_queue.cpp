#include "offline_queue.h"

OfflineQueueManager OfflineQueue;

OfflineQueueManager::OfflineQueueManager()
  : _initialized(false), _queueMutex(nullptr) {}

bool OfflineQueueManager::begin() {
  if (_queueMutex == nullptr) {
    _queueMutex = xSemaphoreCreateMutex();
  }

  if (!LittleFS.begin(true)) {
    Serial.println(">> [OFFLINE QUEUE] ERROR: Khong the mount LittleFS!");
    _initialized = false;
    return false;
  }

  if (xSemaphoreTake(_queueMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
    if (!LittleFS.exists(_queuePath)) {
      File f = LittleFS.open(_queuePath, "w");
      if (f) {
        QueueHeader hdr = {0x534F4C51, 0, 0, 0, 0};
        f.write((const uint8_t*)&hdr, sizeof(QueueHeader));
        f.close();
        Serial.println(">> [OFFLINE QUEUE] Khoi tao file queue moi thanh cong tren LittleFS.");
      } else {
        Serial.println(">> [OFFLINE QUEUE] ERROR: Khong the tao file queue tren LittleFS!");
        xSemaphoreGive(_queueMutex);
        return false;
      }
    } else {
      QueueHeader hdr;
      if (readHeader(hdr)) {
        size_t pending = (hdr.tail_index > hdr.head_index) ? (hdr.tail_index - hdr.head_index) : 0;
        Serial.printf(">> [OFFLINE QUEUE] LittleFS san sang | Ban ghi cho day: %u | File size: %u bytes\n",
                      (unsigned int)pending, (unsigned int)getFileSize());
      }
    }
    xSemaphoreGive(_queueMutex);
    _initialized = true;
    return true;
  }

  return false;
}

bool OfflineQueueManager::readHeader(QueueHeader& hdr) {
  if (!LittleFS.exists(_queuePath)) return false;
  File f = LittleFS.open(_queuePath, "r");
  if (!f) return false;

  size_t bytesRead = f.read((uint8_t*)&hdr, sizeof(QueueHeader));
  f.close();

  if (bytesRead == sizeof(QueueHeader) && hdr.magic == 0x534F4C51) {
    return true;
  }
  return false;
}

bool OfflineQueueManager::writeHeader(const QueueHeader& hdr) {
  File f = LittleFS.open(_queuePath, "r+");
  if (!f) {
    f = LittleFS.open(_queuePath, "w");
  }
  if (!f) return false;

  f.seek(0, SeekSet);
  size_t written = f.write((const uint8_t*)&hdr, sizeof(QueueHeader));
  f.flush();
  f.close();
  return (written == sizeof(QueueHeader));
}

bool OfflineQueueManager::pushRecord(const MinuteRecord& rec) {
  if (!_initialized) {
    if (!begin()) return false;
  }

  if (xSemaphoreTake(_queueMutex, pdMS_TO_TICKS(1000)) != pdTRUE) {
    return false;
  }

  QueueHeader hdr;
  if (!readHeader(hdr)) {
    hdr = {0x534F4C51, 0, 0, 0, 0};
  }

  // Kiểm tra giới hạn số bản ghi
  if ((hdr.tail_index - hdr.head_index) >= _maxRecords) {
    Serial.println(">> [OFFLINE QUEUE] CANH BAO: Queue day! Tu dong bo ban ghi cu nhat.");
    hdr.head_index++;
  }

  File f = LittleFS.open(_queuePath, "r+");
  if (!f) {
    f = LittleFS.open(_queuePath, "w");
    if (f) {
      f.write((const uint8_t*)&hdr, sizeof(QueueHeader));
    }
  }
  if (!f) {
    xSemaphoreGive(_queueMutex);
    return false;
  }

  size_t writeOffset = sizeof(QueueHeader) + (size_t)hdr.tail_index * sizeof(MinuteRecord);
  f.seek(writeOffset, SeekSet);
  size_t written = f.write((const uint8_t*)&rec, sizeof(MinuteRecord));
  f.flush();
  f.close();

  if (written == sizeof(MinuteRecord)) {
    hdr.tail_index++;
    hdr.total_pushed++;
    writeHeader(hdr);
    xSemaphoreGive(_queueMutex);
    return true;
  }

  xSemaphoreGive(_queueMutex);
  return false;
}

bool OfflineQueueManager::peekRecord(MinuteRecord& rec) {
  if (!_initialized) {
    if (!begin()) return false;
  }

  if (xSemaphoreTake(_queueMutex, pdMS_TO_TICKS(500)) != pdTRUE) {
    return false;
  }

  QueueHeader hdr;
  if (!readHeader(hdr) || hdr.head_index >= hdr.tail_index) {
    xSemaphoreGive(_queueMutex);
    return false; // Queue rỗng
  }

  File f = LittleFS.open(_queuePath, "r");
  if (!f) {
    xSemaphoreGive(_queueMutex);
    return false;
  }

  size_t readOffset = sizeof(QueueHeader) + (size_t)hdr.head_index * sizeof(MinuteRecord);
  f.seek(readOffset, SeekSet);
  size_t bytesRead = f.read((uint8_t*)&rec, sizeof(MinuteRecord));
  f.close();
  xSemaphoreGive(_queueMutex);

  return (bytesRead == sizeof(MinuteRecord));
}

bool OfflineQueueManager::popRecord() {
  if (!_initialized) return false;

  if (xSemaphoreTake(_queueMutex, pdMS_TO_TICKS(500)) != pdTRUE) {
    return false;
  }

  QueueHeader hdr;
  if (!readHeader(hdr) || hdr.head_index >= hdr.tail_index) {
    xSemaphoreGive(_queueMutex);
    return false; // Queue rỗng
  }

  hdr.head_index++;
  hdr.total_popped++;

  // Khi đã đẩy hết toàn bộ hàng đợi về 0 -> reset con trỏ và cắt gọn file về kích thước header
  if (hdr.head_index >= hdr.tail_index) {
    hdr.head_index = 0;
    hdr.tail_index = 0;
    File f = LittleFS.open(_queuePath, "w");
    if (f) {
      f.write((const uint8_t*)&hdr, sizeof(QueueHeader));
      f.close();
    }
  } else {
    writeHeader(hdr);
  }

  xSemaphoreGive(_queueMutex);
  return true;
}

size_t OfflineQueueManager::getPendingCount() {
  if (!_initialized) return 0;
  QueueHeader hdr;
  if (readHeader(hdr)) {
    return (hdr.tail_index > hdr.head_index) ? (hdr.tail_index - hdr.head_index) : 0;
  }
  return 0;
}

void OfflineQueueManager::clear() {
  if (xSemaphoreTake(_queueMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
    QueueHeader hdr = {0x534F4C51, 0, 0, 0, 0};
    File f = LittleFS.open(_queuePath, "w");
    if (f) {
      f.write((const uint8_t*)&hdr, sizeof(QueueHeader));
      f.close();
      Serial.println(">> [OFFLINE QUEUE] Da xoa sach toan bo hang doi LittleFS.");
    }
    xSemaphoreGive(_queueMutex);
  }
}

size_t OfflineQueueManager::getFileSize() {
  if (!LittleFS.exists(_queuePath)) return 0;
  File f = LittleFS.open(_queuePath, "r");
  if (!f) return 0;
  size_t s = f.size();
  f.close();
  return s;
}
