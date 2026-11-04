/**
 * @file test_energy_and_offline_queue.cpp
 * @brief Native Unit Test kiểm thử logic thuần:
 * 1. Tích phân năng lượng độc lập Wh theo dt thực tế (chống trôi khi mạng giật).
 * 2. Cấu trúc đóng gói nhị phân MinuteRecord (48 bytes) & Header hàng đợi (20 bytes).
 * 3. Mô phỏng giải thuật FIFO Queue LittleFS (Push, Peek, Pop, Reset khi rỗng).
 */

#include <iostream>
#include <vector>
#include <cmath>
#include <cassert>
#include <cstdint>
#include <cstring>
#include <iomanip>

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

// Mô phỏng bộ nhớ Flash LittleFS cho FIFO Queue
class MockFlashQueue {
public:
  QueueHeader header;
  std::vector<MinuteRecord> storage;

  MockFlashQueue() {
    header.magic = 0x534F4C51;
    header.head_index = 0;
    header.tail_index = 0;
    header.total_pushed = 0;
    header.total_popped = 0;
  }

  bool push(const MinuteRecord& rec) {
    storage.push_back(rec);
    header.tail_index++;
    header.total_pushed++;
    return true;
  }

  bool peek(MinuteRecord& rec) {
    if (header.head_index >= header.tail_index) return false;
    rec = storage[header.head_index];
    return true;
  }

  bool pop() {
    if (header.head_index >= header.tail_index) return false;
    header.head_index++;
    header.total_popped++;
    if (header.head_index >= header.tail_index) {
      // Đã xả hết hàng đợi -> reset về 0
      header.head_index = 0;
      header.tail_index = 0;
      storage.clear();
    }
    return true;
  }

  size_t getPendingCount() const {
    return (header.tail_index > header.head_index) ? (header.tail_index - header.head_index) : 0;
  }
};

int main() {
  std::cout << "=================================================================\n";
  std::cout << " UNIT TEST NATIVE: TICH PHAN NANG LUONG VA HANG DOI OFFLINE      \n";
  std::cout << "=================================================================\n\n";

  // TEST 1: Kiểm tra cấu trúc bộ nhớ MinuteRecord và QueueHeader
  std::cout << "[TEST 1] KIEM TRA KICH THUOC DONG GOI NHI PHAN (PACKING):\n";
  std::cout << "  - sizeof(MinuteRecord): " << sizeof(MinuteRecord) << " bytes (Chuan: 52 bytes)\n";
  std::cout << "  - sizeof(QueueHeader) : " << sizeof(QueueHeader) << " bytes (Chuan: 20 bytes)\n";
  assert(sizeof(MinuteRecord) == 52);
  assert(sizeof(QueueHeader) == 20);
  std::cout << "  ==> [PASS] Kich thuoc dong goi chuan xac 100%, 0 padding thua!\n\n";

  // TEST 2: Tích phân năng lượng độc lập theo dt thực tế
  std::cout << "[TEST 2] MO PHONG TICH PHAN NANG LUONG Wh THEO dt THUC TE:\n";
  {
    // Kịch bản A: Công suất không đổi 50W chạy trong đúng 3600 giây (1 giờ), dt = 1.0s
    double P = 50.0;
    double accumulatedWh = 0.0;
    for (int t = 0; t < 3600; ++t) {
      double dt = 1.0;
      accumulatedWh += (P * dt) / 3600.0;
    }
    std::cout << "  - Cong suat 50W deu trong 3600s: Do duoc = " << std::fixed << std::setprecision(4)
              << accumulatedWh << " Wh (Ly thuyet: 50.0000 Wh)\n";
    assert(std::fabs(accumulatedWh - 50.0) < 0.0001);

    // Kịch bản B: Mạng giật lag, dt dao động ngẫu nhiên (0.8s, 1.2s, 1.5s, 0.5s), tổng thời gian = 3600s
    double dtList[] = {0.8, 1.2, 1.5, 0.5, 1.0};
    int dtIndex = 0;
    double totalTime = 0.0;
    accumulatedWh = 0.0;
    while (totalTime < 3600.0) {
      double dt = dtList[dtIndex % 5];
      if (totalTime + dt > 3600.0) {
        dt = 3600.0 - totalTime;
      }
      totalTime += dt;
      accumulatedWh += (P * dt) / 3600.0;
      dtIndex++;
    }
    std::cout << "  - Cong suat 50W voi dt bien thien (jitter): Do duoc = " << accumulatedWh
              << " Wh | Tong thoi gian: " << totalTime << "s\n";
    assert(std::fabs(accumulatedWh - 50.0) < 0.0001);
    assert(std::fabs(totalTime - 3600.0) < 0.0001);
  }
  std::cout << "  ==> [PASS] Tich phan Wh theo dt thuc tuyet doi chinh xac, mien nhiem voi giat lag mang!\n\n";

  // TEST 3: Mô phỏng lưu trữ và xả Hàng đợi Offline (LittleFS FIFO Queue)
  std::cout << "[TEST 3] MO PHONG RUT MANG 10 PHUT -> PUSH 10 BAN GHI -> CO MANG DAY BU:\n";
  {
    MockFlashQueue queue;

    // Giả lập mất mạng WiFi 10 phút: Cứ mỗi 1 phút tạo 1 MinuteRecord nạp vào queue
    uint32_t baseEpoch = 1730505600; // Mốc thời gian giả định
    for (int m = 1; m <= 10; ++m) {
      MinuteRecord rec;
      rec.epoch_ts = baseEpoch + m * 60;
      rec.delta_wh_trk = 0.8333f; // 50W * (60/3600) = 0.8333 Wh
      rec.delta_wh_sta = 0.6667f; // 40W * (60/3600) = 0.6667 Wh
      rec.v_avg_trk = 19.5f;
      rec.i_avg_trk = 2.56f;
      rec.p_avg_trk = 50.0f;
      rec.p_peak_trk = 52.1f;
      rec.v_avg_sta = 19.2f;
      rec.i_avg_sta = 2.08f;
      rec.p_avg_sta = 40.0f;
      rec.p_peak_sta = 41.5f;
      rec.rtc_temp = 28.5f;
      rec.fsm_state = 3; // TRACKING
      rec.sys_mode = 1;  // AUTO
      rec.flags = 0;

      bool ok = queue.push(rec);
      assert(ok);
    }

    std::cout << "  - Da luu vao Queue: " << queue.getPendingCount() << " ban ghi (tuong ung 10 phut mat mang)\n";
    assert(queue.getPendingCount() == 10);
    assert(queue.header.total_pushed == 10);

    // Giả lập có WiFi trở lại: Network Task bắt đầu đẩy bù từng bản ghi theo thứ tự FIFO
    std::cout << "  - Co mang tro lai: Tien hanh day bu tung ban ghi len Firebase...\n";
    int poppedCount = 0;
    while (queue.getPendingCount() > 0) {
      MinuteRecord popped;
      bool peekOk = queue.peek(popped);
      assert(peekOk);

      // Kiểm tra tính toàn vẹn thời gian và năng lượng của bản ghi lấy ra
      uint32_t expectedEpoch = baseEpoch + (poppedCount + 1) * 60;
      assert(popped.epoch_ts == expectedEpoch);
      assert(std::fabs(popped.delta_wh_trk - 0.8333f) < 0.0001f);
      assert(popped.fsm_state == 3);

      bool popOk = queue.pop();
      assert(popOk);
      poppedCount++;
    }

    std::cout << "  - Da day bu xong: " << poppedCount << " ban ghi.\n";
    std::cout << "  - So ban ghi con ton trong Queue sau khi xa: " << queue.getPendingCount() << "\n";
    assert(queue.getPendingCount() == 0);
    assert(queue.header.head_index == 0 && queue.header.tail_index == 0);
    std::cout << "  ==> [PASS] Hang doi FIFO da duoc xa sach 100%, con tro duoc reset ve 0!\n\n";
  }

  std::cout << "=================================================================\n";
  std::cout << " TAT CA CAC UNIT TEST NATIVE CHO MUC 2 DEU DA THANH CONG (100%)! \n";
  std::cout << "=================================================================\n";
  return 0;
}
