// =========================================================================
// FIRMWARE ESP32-S3 #2 (NODE ĐỘC LẬP ĐO VOC, ISC & ĐIỀU KHIỂN ĐÈN 12V BAN ĐÊM)
// =========================================================================
// Sơ đồ chân (Pinout) chuẩn cho ESP32-S3 N16R8 (#2):
//   - GPIO 4  (ADC1_CH3) : FZ0430 #1 -> Đo áp hở mạch Voc Tấm Xoay (Tracker)
//   - GPIO 5  (ADC1_CH4) : ACS712 #1 -> Đo dòng ngắn mạch Isc Tấm Xoay (qua cầu 10k/20k)
//   - GPIO 6  (ADC1_CH5) : FZ0430 #2 -> Đo áp hở mạch Voc Tấm Cố Định (Static)
//   - GPIO 7  (ADC1_CH6) : ACS712 #2 -> Đo dòng ngắn mạch Isc Tấm Cố Định (qua cầu 10k/20k)
//   - GPIO 14 (kèm G40)  : Relay A + Relay C (Ngắt tải Sạc Tấm Xoay & Cố Định)
//   - GPIO 41 (kèm G39)  : Relay B + Relay D (Đóng ngắn mạch qua ACS712 #1 & #2)
//   - GPIO 42            : Relay E (Kênh 5 - Đèn 12V: Khi ngủ sẽ 15 phút BẬT / 15 phút TẮT luân phiên tới sáng)
// =========================================================================

#include <Arduino.h>
#include <ArduinoOTA.h>
#include <Firebase_ESP_Client.h>
#include <Preferences.h>
#include <WiFi.h>
#include <addons/RTDBHelper.h>
#include <addons/TokenHelper.h>
#include <esp_task_wdt.h>
#include <time.h>

#include "config.h"

#define VOC_ISC_FIRMWARE_VERSION "1.1.0"

// -------------------------------------------------------------------------
// 1. ĐỊNH NGHĨA CHÂN PHẦN CỨNG (PINOUT ESP32-S3 #2)
// -------------------------------------------------------------------------
#define PIN_ADC_VOC_TRK     4   // ADC1_CH3: FZ0430 #1 (Tấm Xoay)
#define PIN_ADC_ISC_TRK     5   // ADC1_CH4: ACS712 #1 (Tấm Xoay - qua cầu 10k/20k)
#define PIN_ADC_VOC_STA     6   // ADC1_CH5: FZ0430 #2 (Tấm Cố Định)
#define PIN_ADC_ISC_STA     7   // ADC1_CH6: ACS712 #2 (Tấm Cố Định - qua cầu 10k/20k)

// Chân điều khiển Module Relay A, B, C, D (Đo Voc/Isc ban ngày)
#define PIN_RELAY_A_CUT     14  // Relay A (Ngắt tải Tấm Xoay) - hoặc gộp A+C
#define PIN_RELAY_C_CUT     40  // Relay C (Ngắt tải Tấm Cố Định) - dự phòng nếu tách riêng
#define PIN_RELAY_B_ISC     41  // Relay B (Ngắn mạch đo Isc Tấm Xoay) - hoặc gộp B+D
#define PIN_RELAY_D_ISC     39  // Relay D (Ngắn mạch đo Isc Tấm Cố Định) - dự phòng nếu tách riêng

// Chân điều khiển Relay Kênh 5 (Relay E - Đèn 12V ban đêm: 15p BẬT / 15p TẮT khi ngủ)
#define PIN_RELAY_E_LAMP12V 42  // Ngay sát GPIO 41 trên hàng chân phải ESP32-S3

// Cấu hình mức kích Relay (Module Relay quang cách ly chuẩn kích mức THẤP - Active LOW)
#define RELAY_ACTIVE_LOW    true
#define RELAY_ON_LEVEL      (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_OFF_LEVEL     (RELAY_ACTIVE_LOW ? HIGH : LOW)

// Chu kỳ luân phiên BẬT / TẮT của Đèn 12V (Relay E) khi hệ thống ngủ: 15 phút = 900,000 ms
const unsigned long LAMP_TOGGLE_INTERVAL_MS = 15UL * 60UL * 1000UL; // 15 phút (900 giây)

// -------------------------------------------------------------------------
// 2. HẰNG SỐ HIỆU CHUẨN CẢM BIẾN (CALIBRATION CONSTANTS)
// -------------------------------------------------------------------------
// FZ0430 đã mắc song song điện trở 6.2kΩ vào R2 (7.5kΩ):
// R2_mới = (7.5 * 6.2) / (7.5 + 6.2) = 3.394 kΩ -> Tỉ số chia = 3.394 / (30 + 3.394) = 0.10164
// Hệ số nhân ngược = 1 / 0.10164 = 9.8386
float calVocScaleTrk = 9.8386f;
float calVocScaleSta = 9.8386f;

// ACS712ELC-05B (Độ nhạy chuẩn 185 mV/A tại ngõ ra 5V, đi qua cầu chia áp 10kΩ/20kΩ -> nhân 1.5)
float calAcsDividerGain = 1.500f;    // (10k + 20k) / 20k = 1.5
float calAcsSensMvPerA  = 185.0f;    // 185 mV/A cho bản 5A
float zeroAcsMvTrk      = 2500.0f;   // Điểm 0A tự động hiệu chuẩn trong pha hở mạch (Pha 1)
float zeroAcsMvSta      = 2500.0f;

// -------------------------------------------------------------------------
// 3. BIẾN TRẠNG THÁI HỆ THỐNG & FIREBASE
// -------------------------------------------------------------------------
Preferences prefs;
FirebaseData fbdo;
FirebaseData fbPoll;
FirebaseAuth auth;
FirebaseConfig fbConfig;

// Cấu hình chu kỳ nhảy Relay & trạng thái ngủ đồng bộ từ hệ thống chính
uint32_t relayIntervalSec = 10;      // Mặc định 10 giây / 1 chu kỳ nhảy relay A-B-C-D
bool remoteIsSleeping     = false;   // Trạng thái ngủ thực tế từ ESP32 #1
bool remoteSleepDisabled  = false;   // Cờ vô hiệu hóa ngủ đêm
bool remoteMotorsMoving   = false;   // Tránh đóng relay đúng lúc motor đang quay mạnh
bool forceSingleTest      = false;   // Cờ kích hoạt test 1 chu kỳ ngay lập tức

// Trạng thái Đèn 12V (Relay Kênh 5 - Relay E)
bool lamp12vState         = false;   // true = Đang BẬT đèn 12V, false = Đang TẮT đèn 12V
bool wasSleepingForLamp   = false;   // Theo dõi sườn chuyển trạng thái bắt đầu ngủ
unsigned long lampPhaseStartMs = 0;  // Mốc thời gian bắt đầu pha 15 phút hiện tại
int lampManualOverride    = -1;      // -1: Tự động theo giờ ngủ | 0: Ép TẮT | 1: Ép BẬT

// Kết quả đo mới nhất
float liveVocTrk  = 0.0f;
float liveIscTrk  = 0.0f;
float liveVocSta  = 0.0f;
float liveIscSta  = 0.0f;
uint32_t totalMeasureCycles = 0;

// Máy trạng thái hữu hạn (FSM) đóng ngắt Relay A-B-C-D không chặn (Non-blocking)
enum MeasureFsmState {
  MEAS_IDLE = 0,
  MEAS_PHASE1_WAIT_VOC_SETTLE,  // Đã bật Relay A+C (ngắt tải), chờ 250ms ổn định áp hở mạch
  MEAS_PHASE2_WAIT_ISC_SETTLE,  // Đã bật thêm Relay B+D (ngắn mạch qua ACS712), chờ 200ms đọc Isc
  MEAS_PHASE3_WAIT_ARC_RELEASE  // Đã nhả Relay B+D trước, chờ 50ms dập hồ quang rồi mới nhả Relay A+C
};

MeasureFsmState measState = MEAS_IDLE;
unsigned long measStateStartMs = 0;
unsigned long lastCycleFinishMs = 0;
unsigned long relayActiveStartMs = 0;
bool relaysCurrentlyActive = false;

// -------------------------------------------------------------------------
// 4. HÀM ĐIỀU KHIỂN RELAY A-B-C-D & RELAY E (ĐÈN 12V) AN TOÀN
// -------------------------------------------------------------------------
bool isCutLoadActive = false;

void setLamp12vRelay(bool on) {
  lamp12vState = on;
  digitalWrite(PIN_RELAY_E_LAMP12V, on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
}

void forceAllRelaysOff() {
  // Luôn ngắt Relay ngắn mạch B+D trước
  digitalWrite(PIN_RELAY_B_ISC, RELAY_OFF_LEVEL);
  digitalWrite(PIN_RELAY_D_ISC, RELAY_OFF_LEVEL);
  // Ngắt Relay cắt tải A+C
  digitalWrite(PIN_RELAY_A_CUT, RELAY_OFF_LEVEL);
  digitalWrite(PIN_RELAY_C_CUT, RELAY_OFF_LEVEL);
  isCutLoadActive = false;
  relaysCurrentlyActive = false;
  measState = MEAS_IDLE;
}

void setRelayCutLoad(bool on) {
  if (!on) {
    // Trước khi đóng lại tải sạc (tắt A+C), bắt buộc B+D phải đang TẮT
    digitalWrite(PIN_RELAY_B_ISC, RELAY_OFF_LEVEL);
    digitalWrite(PIN_RELAY_D_ISC, RELAY_OFF_LEVEL);
  }
  digitalWrite(PIN_RELAY_A_CUT, on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
  digitalWrite(PIN_RELAY_C_CUT, on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
  isCutLoadActive = on;
  if (on && !relaysCurrentlyActive) {
    relaysCurrentlyActive = true;
    relayActiveStartMs = millis();
  } else if (!on) {
    relaysCurrentlyActive = false;
  }
}

void setRelayShortCircuit(bool on) {
  // KHÓA LIÊN ĐỘNG MỀM: Tuyệt đối không cho phép bật Relay B+D nếu Relay A+C chưa cắt tải!
  if (on && !isCutLoadActive) {
    Serial.println(">> [INTERLOCK BLOCK] Tu choi bat Relay B+D vi Relay A+C chua ngat tai!");
    return;
  }
  digitalWrite(PIN_RELAY_B_ISC, on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
  digitalWrite(PIN_RELAY_D_ISC, on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
}

// -------------------------------------------------------------------------
// 5. ĐỌC ADC CHÍNH XÁC CAO (OVERSAMPLING 64 MẪU + TRIMMED MEAN)
// -------------------------------------------------------------------------
float readAdcMilliVoltsFiltered(uint8_t pin) {
  const int N = 64;
  uint32_t sum = 0;
  uint16_t minV = 65535;
  uint16_t maxV = 0;
  for (int i = 0; i < N; i++) {
    uint16_t mv = (uint16_t)analogReadMilliVolts(pin);
    sum += mv;
    if (mv < minV) minV = mv;
    if (mv > maxV) maxV = mv;
    delayMicroseconds(120);
  }
  sum -= minV;
  sum -= maxV;
  return (float)sum / (float)(N - 2);
}

// -------------------------------------------------------------------------
// 6. KIỂM TRA TRẠNG THÁI NGỦ CỦA HỆ THỐNG & ĐIỀU KHIỂN ĐÈN 12V (RELAY E)
// -------------------------------------------------------------------------
// Hàm trả về true khi hệ thống đang trong trạng thái ngủ đêm
bool isSystemCurrentlySleeping() {
  if (remoteSleepDisabled) {
    return false; // Đã bật Vô hiệu hóa ngủ đêm -> Hệ thống không ngủ
  }
  if (remoteIsSleeping) {
    return true;  // ESP32 #1 báo đang ở trạng thái SLEEP / TEST_SLEEP
  }
  // Kiểm tra thêm khung giờ ngủ đêm (18:00 tối đến 04:00 sáng) qua NTP dự phòng
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 5)) {
    int curH = timeinfo.tm_hour;
    if (curH >= 18 || curH < 4) {
      return true;
    }
  }
  return false;
}

// Điều khiển Relay Kênh 5 (Relay E - Đèn 12V):
// Khi hệ thống ngủ: 15 phút BẬT, 15 phút TẮT luân phiên cho tới sáng.
// Khi hệ thống thức (ban ngày): Tự động TẮT đèn 12V.
void updateNightLamp12vCycle() {
  if (lampManualOverride == 1) {
    if (!lamp12vState) setLamp12vRelay(true);
    return;
  } else if (lampManualOverride == 0) {
    if (lamp12vState) setLamp12vRelay(false);
    return;
  }

  bool sleepingNow = isSystemCurrentlySleeping();
  unsigned long now = millis();

  if (sleepingNow) {
    if (!wasSleepingForLamp) {
      // Vừa mới bước vào giờ ngủ -> Bắt đầu ngay pha đầu tiên: BẬT ĐÈN 12V trong 15 phút!
      wasSleepingForLamp = true;
      lampPhaseStartMs = now;
      setLamp12vRelay(true);
      Serial.println(">> [RELAY E - DEN 12V] He thong bat dau NGU DEM -> BAT DEN 12V (Pha 15 phut BAT dau tien)!");
    } else {
      // Đang trong giấc ngủ đêm -> Cứ đủ 15 phút (900,000 ms) thì đảo trạng thái BẬT <-> TẮT
      if (now - lampPhaseStartMs >= LAMP_TOGGLE_INTERVAL_MS) {
        lampPhaseStartMs = now;
        bool nextState = !lamp12vState;
        setLamp12vRelay(nextState);
        Serial.printf(">> [RELAY E - DEN 12V] Het 15 phut -> Chuyen sang %s DEN 12V trong 15 phut tiep theo!\n",
                      nextState ? "BAT (ON)" : "TAT (OFF)");
      }
    }
  } else {
    // Hệ thống đã thức dậy (ban ngày hoặc bật Vô hiệu hóa ngủ) -> Tắt đèn 12V ngay
    if (wasSleepingForLamp || lamp12vState) {
      wasSleepingForLamp = false;
      setLamp12vRelay(false);
      Serial.println(">> [RELAY E - DEN 12V] He thong THUC DAY -> TAT DEN 12V!");
    }
  }
}

// Kiểm tra điều kiện cho phép nhảy 4 Relay đo Voc/Isc (A, B, C, D):
// Chỉ nhảy khi KHÔNG trong giờ ngủ!
bool isRelayAllowedToClick() {
  if (forceSingleTest) return true;

  // Quy tắc 1: Trong giờ ngủ -> TUYỆT ĐỐI KHÔNG nhảy Relay A-B-C-D
  if (isSystemCurrentlySleeping()) {
    return false;
  }

  // Quy tắc 2: Nếu động cơ bước đang quay -> Đợi dừng để tránh nhiễu
  if (remoteMotorsMoving) {
    return false;
  }

  return true;
}

// -------------------------------------------------------------------------
// 7. ĐỒNG BỘ TRẠNG THÁI NGỦ & CHU KỲ RELAY TỪ FIREBASE VÀ ĐẨY KẾT QUẢ ĐO
// -------------------------------------------------------------------------
void pollSystemStateAndConfig() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;

  // 1. Đọc trạng thái hệ thống từ /solar/tracking
  if (Firebase.RTDB.getJSON(&fbPoll, "/solar/tracking")) {
    FirebaseJson &json = fbPoll.jsonObject();
    FirebaseJsonData d;

    json.get(d, "isSleeping");
    if (d.success) remoteIsSleeping = d.boolValue;

    json.get(d, "state");
    if (d.success) {
      String st = d.stringValue;
      if (st.equalsIgnoreCase("SLEEP") || st.equalsIgnoreCase("DEEP_SLEEP")) {
        remoteIsSleeping = true;
      }
      remoteMotorsMoving = st.equalsIgnoreCase("MOVING") || st.equalsIgnoreCase("HOMING");
    }

    json.get(d, "sleepDisabled");
    if (d.success) {
      remoteSleepDisabled = d.boolValue;
      if (remoteSleepDisabled) remoteIsSleeping = false;
    }

    json.get(d, "relayIntervalSec");
    if (d.success && d.intValue >= 3 && d.intValue <= 3600) {
      uint32_t newInt = (uint32_t)d.intValue;
      if (newInt != relayIntervalSec) {
        relayIntervalSec = newInt;
        prefs.putUInt("rly_sec", relayIntervalSec);
        Serial.printf(">> [SYNC FIREBASE] Cap nhat chu ky nhay Relay = %lu giay\n",
                      (unsigned long)relayIntervalSec);
      }
    }
  }

  // 2. Đọc cấu hình riêng tại /solar/config/voc_isc (nếu người dùng vừa chỉnh trên Web)
  if (Firebase.RTDB.getJSON(&fbPoll, "/solar/config/voc_isc")) {
    FirebaseJson &json = fbPoll.jsonObject();
    FirebaseJsonData d;

    json.get(d, "relay_interval_sec");
    if (d.success && d.intValue >= 3 && d.intValue <= 3600) {
      uint32_t newInt = (uint32_t)d.intValue;
      if (newInt != relayIntervalSec) {
        relayIntervalSec = newInt;
        prefs.putUInt("rly_sec", relayIntervalSec);
        Serial.printf(">> [CONFIG VOC/ISC] Cap nhat chu ky nhay Relay = %lu giay\n",
                      (unsigned long)relayIntervalSec);
      }
    }

    json.get(d, "sleep_disabled");
    if (d.success) {
      remoteSleepDisabled = d.boolValue;
      if (remoteSleepDisabled) remoteIsSleeping = false;
    }
  }
}

void pushVocIscToFirebase() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;

  unsigned long lampRemainSec = 0;
  if (wasSleepingForLamp) {
    unsigned long elapsed = millis() - lampPhaseStartMs;
    if (elapsed < LAMP_TOGGLE_INTERVAL_MS) {
      lampRemainSec = (LAMP_TOGGLE_INTERVAL_MS - elapsed) / 1000UL;
    }
  }

  // Cập nhật trực tiếp vào /solar/tracking và /solar/static để Web Dashboard hiển thị tức thời
  FirebaseJson trkPatch;
  trkPatch.set("voc_trk", liveVocTrk);
  trkPatch.set("isc_trk", liveIscTrk);
  trkPatch.set("relayIntervalSec", (int)relayIntervalSec);
  trkPatch.set("lamp12vOn", lamp12vState);
  Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &trkPatch);

  FirebaseJson staPatch;
  staPatch.set("voc_sta", liveVocSta);
  staPatch.set("isc_sta", liveIscSta);
  Firebase.RTDB.updateNode(&fbdo, "/solar/static", &staPatch);

  // Cập nhật nhánh chuyên biệt /solar/voc_isc_node để giám sát chẩn đoán
  FirebaseJson nodeJson;
  nodeJson.set("voc_trk", liveVocTrk);
  nodeJson.set("isc_trk", liveIscTrk);
  nodeJson.set("voc_sta", liveVocSta);
  nodeJson.set("isc_sta", liveIscSta);
  nodeJson.set("relay_interval_sec", (int)relayIntervalSec);
  nodeJson.set("is_sleeping", isSystemCurrentlySleeping());
  nodeJson.set("sleep_disabled", remoteSleepDisabled);
  nodeJson.set("lamp_12v_on", lamp12vState);
  nodeJson.set("lamp_phase_remain_sec", (int)lampRemainSec);
  nodeJson.set("cycles_count", (int)totalMeasureCycles);
  nodeJson.set("online", true);
  nodeJson.set("firmware", VOC_ISC_FIRMWARE_VERSION);
  nodeJson.set("updated_at/.sv", "timestamp");
  Firebase.RTDB.updateNode(&fbdo, "/solar/voc_isc_node", &nodeJson);
}

// -------------------------------------------------------------------------
// 8. MÁY TRẠNG THÁI ĐO VOC & ISC KHÔNG CHẶN (NON-BLOCKING FSM)
// -------------------------------------------------------------------------
void runMeasurementStateMachine() {
  unsigned long now = millis();

  // Bảo vệ phần cứng: Nếu vì bất kỳ lý do gì Relay đóng quá 2500ms -> Ngắt khẩn cấp ngay!
  if (relaysCurrentlyActive && (now - relayActiveStartMs > 2500)) {
    forceAllRelaysOff();
    Serial.println(">> [SAFETY CUTOFF] Relay dong qua 2.5s -> Ngat khan cap toan bo Relay!");
    return;
  }

  // Nếu đang trong giờ ngủ phát sinh giữa chừng -> Ngắt toàn bộ relay đo Voc/Isc ngay
  if (!isRelayAllowedToClick()) {
    if (measState != MEAS_IDLE || relaysCurrentlyActive) {
      forceAllRelaysOff();
      Serial.println(">> [SLEEP GUARD] He thong vao gio ngu -> Ngat toan bo Relay A-B-C-D ngay lap tuc!");
    }
    return;
  }

  switch (measState) {
    case MEAS_IDLE: {
      uint32_t intervalMs = relayIntervalSec * 1000UL;
      if (forceSingleTest || (now - lastCycleFinishMs >= intervalMs)) {
        forceSingleTest = false;
        // BẮT ĐẦU PHA 1: Đóng Relay A + C để ngắt tải sạc, tạo trạng thái hở mạch (Open-Circuit)
        setRelayShortCircuit(false);
        setRelayCutLoad(true);
        measStateStartMs = now;
        measState = MEAS_PHASE1_WAIT_VOC_SETTLE;
      }
      break;
    }

    case MEAS_PHASE1_WAIT_VOC_SETTLE: {
      // Đợi 250ms cho tiếp điểm Relay A+C ổn định và tụ ngõ vào xả hết
      if (now - measStateStartMs >= 250) {
        // 1. Đọc điện áp hở mạch Voc của 2 tấm pin
        float mvVocTrk = readAdcMilliVoltsFiltered(PIN_ADC_VOC_TRK);
        float mvVocSta = readAdcMilliVoltsFiltered(PIN_ADC_VOC_STA);

        liveVocTrk = (mvVocTrk / 1000.0f) * calVocScaleTrk;
        liveVocSta = (mvVocSta / 1000.0f) * calVocScaleSta;
        if (liveVocTrk < 0.3f) liveVocTrk = 0.0f;
        if (liveVocSta < 0.3f) liveVocSta = 0.0f;

        // 2. Tự động lấy mẫu điểm 0A (Auto-Zero Offset) của 2 cảm biến ACS712 ngay khi dòng = 0A!
        float mvZeroTrk = readAdcMilliVoltsFiltered(PIN_ADC_ISC_TRK) * calAcsDividerGain;
        float mvZeroSta = readAdcMilliVoltsFiltered(PIN_ADC_ISC_STA) * calAcsDividerGain;
        if (mvZeroTrk > 1800.0f && mvZeroTrk < 3200.0f) {
          zeroAcsMvTrk = 0.8f * zeroAcsMvTrk + 0.2f * mvZeroTrk;
        }
        if (mvZeroSta > 1800.0f && mvZeroSta < 3200.0f) {
          zeroAcsMvSta = 0.8f * zeroAcsMvSta + 0.2f * mvZeroSta;
        }

        // CHUYỂN SANG PHA 2: Đóng Relay B + D để nối ngắn mạch tấm pin qua ACS712
        setRelayShortCircuit(true);
        measStateStartMs = millis();
        measState = MEAS_PHASE2_WAIT_ISC_SETTLE;
      }
      break;
    }

    case MEAS_PHASE2_WAIT_ISC_SETTLE: {
      // Đợi 200ms cho dòng ngắn mạch ổn định rồi đọc ACS712
      if (now - measStateStartMs >= 200) {
        float mvIscAdcTrk = readAdcMilliVoltsFiltered(PIN_ADC_ISC_TRK);
        float mvIscAdcSta = readAdcMilliVoltsFiltered(PIN_ADC_ISC_STA);

        // Nhân trả lại hệ số cầu chia áp 10k/20k (x1.5)
        float mvSensorTrk = mvIscAdcTrk * calAcsDividerGain;
        float mvSensorSta = mvIscAdcSta * calAcsDividerGain;

        float iscTrk = fabs(mvSensorTrk - zeroAcsMvTrk) / calAcsSensMvPerA;
        float iscSta = fabs(mvSensorSta - zeroAcsMvSta) / calAcsSensMvPerA;
        if (iscTrk < 0.03f) iscTrk = 0.0f;
        if (iscSta < 0.03f) iscSta = 0.0f;

        liveIscTrk = iscTrk;
        liveIscSta = iscSta;

        // CHUYỂN SANG PHA 3: Ngắt Relay B + D TRƯỚC để dập hồ quang ngắn mạch
        setRelayShortCircuit(false);
        measStateStartMs = millis();
        measState = MEAS_PHASE3_WAIT_ARC_RELEASE;
      }
      break;
    }

    case MEAS_PHASE3_WAIT_ARC_RELEASE: {
      // Đợi 50ms sau khi nhả B+D rồi mới nhả Relay A+C trả tấm pin về mạch sạc
      if (now - measStateStartMs >= 50) {
        setRelayCutLoad(false);
        lastCycleFinishMs = millis();
        measState = MEAS_IDLE;
        totalMeasureCycles++;

        Serial.printf(">> [VOC/ISC #%lu] TRK: Voc=%.2fV, Isc=%.3fA | STA: Voc=%.2fV, Isc=%.3fA | Chu ky: %lus | Den 12V: %s\n",
                      (unsigned long)totalMeasureCycles,
                      liveVocTrk, liveIscTrk,
                      liveVocSta, liveIscSta,
                      (unsigned long)relayIntervalSec,
                      lamp12vState ? "ON" : "OFF");

        // Đẩy kết quả đo mới nhất lên Firebase ngay sau khi hoàn tất chu kỳ
        pushVocIscToFirebase();
      }
      break;
    }
  }
}

// -------------------------------------------------------------------------
// 9. XỬ LÝ LỆNH SERIAL CLI CHẨN ĐOÁN & HIỆU CHUẨN NHANH
// -------------------------------------------------------------------------
void handleSerialCommands() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd.equalsIgnoreCase("test")) {
    forceSingleTest = true;
    Serial.println(">> [CLI] Kich hoat 1 chu ky do Voc/Isc ngay lap tuc!");
  } else if (cmd.equalsIgnoreCase("lamp on")) {
    lampManualOverride = 1;
    setLamp12vRelay(true);
    Serial.println(">> [CLI] Da EP BAT Den 12V (Relay E = ON)!");
  } else if (cmd.equalsIgnoreCase("lamp off")) {
    lampManualOverride = 0;
    setLamp12vRelay(false);
    Serial.println(">> [CLI] Da EP TAT Den 12V (Relay E = OFF)!");
  } else if (cmd.equalsIgnoreCase("lamp auto")) {
    lampManualOverride = -1;
    Serial.println(">> [CLI] Da chuyen Den 12V (Relay E) ve che do TU DONG (15p BAT / 15p TAT khi ngu)!");
  } else if (cmd.equalsIgnoreCase("status")) {
    Serial.println("\n================ TRANG THAI NODE VOC/ISC (#2) ================");
    Serial.printf(" WiFi IP           : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf(" Chu ky Relay A-D  : %lu giay\n", (unsigned long)relayIntervalSec);
    Serial.printf(" Trang thai Ngu    : %s (Vo hieu hoa ngu: %s)\n",
                  isSystemCurrentlySleeping() ? "DANG NGU (Khoa Relay A-D, Chay Den 12V 15p/15p)" : "THUC (Cho phep Relay A-D)",
                  remoteSleepDisabled ? "BAT" : "TAT");
    Serial.printf(" Den 12V (Relay E) : %s (GPIO %d)\n",
                  lamp12vState ? "DANG BAT (ON)" : "DANG TAT (OFF)", PIN_RELAY_E_LAMP12V);
    Serial.printf(" Tam Xoay (TRK)    : Voc = %.2f V | Isc = %.3f A\n",
                  liveVocTrk, liveIscTrk);
    Serial.printf(" Tam Co Dinh (STA) : Voc = %.2f V | Isc = %.3f A\n",
                  liveVocSta, liveIscSta);
    Serial.println("==============================================================\n");
  } else if (cmd.startsWith("interval ")) {
    int sec = cmd.substring(9).toInt();
    if (sec >= 3 && sec <= 3600) {
      relayIntervalSec = (uint32_t)sec;
      prefs.putUInt("rly_sec", relayIntervalSec);
      Serial.printf(">> [CLI] Da dat chu ky nhay Relay = %lu giay!\n", (unsigned long)relayIntervalSec);
    }
  }
}

// -------------------------------------------------------------------------
// 10. SETUP & LOOP CHÍNH
// -------------------------------------------------------------------------
void setup() {
  // BƯỚC 1: KHÓA AN TOÀN TOÀN BỘ 5 RELAY (A, B, C, D, E) NGAY KHI CẤP NGUỒN!
  pinMode(PIN_RELAY_A_CUT, OUTPUT);
  pinMode(PIN_RELAY_C_CUT, OUTPUT);
  pinMode(PIN_RELAY_B_ISC, OUTPUT);
  pinMode(PIN_RELAY_D_ISC, OUTPUT);
  pinMode(PIN_RELAY_E_LAMP12V, OUTPUT);
  forceAllRelaysOff();
  setLamp12vRelay(false);

  Serial.begin(115200);
  delay(200);
  Serial.println("\n=======================================================");
  Serial.println("  ESP32-S3 #2: NODE DO VOC, ISC & DEN 12V (RELAY E)");
  Serial.println("=======================================================");

  // BƯỚC 2: Cấu hình 4 kênh ADC1 với suy hao 11dB (đo chuẩn dải 0..3100mV)
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_ADC_VOC_TRK, ADC_11db);
  analogSetPinAttenuation(PIN_ADC_ISC_TRK, ADC_11db);
  analogSetPinAttenuation(PIN_ADC_VOC_STA, ADC_11db);
  analogSetPinAttenuation(PIN_ADC_ISC_STA, ADC_11db);

  // BƯỚC 3: Khôi phục cấu hình từ NVS Flash
  prefs.begin("voc_isc_cfg", false);
  relayIntervalSec = prefs.getUInt("rly_sec", 10);
  if (relayIntervalSec < 3 || relayIntervalSec > 3600) relayIntervalSec = 10;
  calVocScaleTrk = prefs.getFloat("voc_k_trk", 9.8386f);
  calVocScaleSta = prefs.getFloat("voc_k_sta", 9.8386f);
  Serial.printf(">> [NVS] Chu ky nhay Relay A-D: %lu giay | Relay E (Den 12V): GPIO %d\n",
                (unsigned long)relayIntervalSec, PIN_RELAY_E_LAMP12V);

  // BƯỚC 4: Kết nối WiFi & đồng bộ giờ NTP (múi giờ Việt Nam UTC+7)
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf(">> Dang ket noi WiFi: %s ", WIFI_SSID);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0 < 8000)) {
    delay(250);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n>> [WIFI OK] IP ESP32-S3 #2: %s\n", WiFi.localIP().toString().c_str());
    configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  } else {
    Serial.println("\n>> [WIFI] Chua ket noi duoc ngay, se tu dong ket noi ngam...");
  }

  // BƯỚC 5: Khởi tạo Firebase
  fbConfig.api_key = API_KEY;
  fbConfig.database_url = DATABASE_URL;
  fbConfig.signer.test_mode = true;
  fbConfig.timeout.socketConnection = 8000;
  fbConfig.timeout.serverResponse = 8000;
  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);

  // BƯỚC 6: Khởi tạo ArduinoOTA cho ESP32-S3 #2
  ArduinoOTA.setHostname("esp32-voc-isc-node");
  ArduinoOTA.setPassword("solar2026");
  ArduinoOTA.onStart([]() {
    forceAllRelaysOff();
    setLamp12vRelay(false);
    Serial.println("\n>> [OTA] Ngat toan bo Relay an toan & bat dau nap OTA...");
  });
  ArduinoOTA.begin();

  // BƯỚC 7: Watchdog bảo vệ 10 giây
  esp_task_wdt_init(10, true);
  esp_task_wdt_add(NULL);

  lastCycleFinishMs = millis();
  Serial.println(">> [READY] He thong do Voc/Isc & Den 12V da san sang!\n");
}

void loop() {
  esp_task_wdt_reset();

  if (WiFi.status() == WL_CONNECTED) {
    ArduinoOTA.handle();
  }

  // Tự động reconnect WiFi nếu rớt mạng
  static unsigned long lastWifiCheckMs = 0;
  if (millis() - lastWifiCheckMs >= 5000) {
    lastWifiCheckMs = millis();
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
    }
  }

  // Đồng bộ trạng thái ngủ (isSleeping, sleepDisabled) và chu kỳ Relay từ Firebase mỗi 2 giây (khi đang ở MEAS_IDLE)
  static unsigned long lastFirebaseSyncMs = 0;
  if (measState == MEAS_IDLE && (millis() - lastFirebaseSyncMs >= 2000)) {
    lastFirebaseSyncMs = millis();
    pollSystemStateAndConfig();
  }

  // Cập nhật chu trình Đèn 12V qua Relay Kênh 5 (Relay E):
  // Khi hệ thống ngủ -> 15 phút BẬT / 15 phút TẮT luân phiên cho tới sáng
  updateNightLamp12vCycle();

  // Định kỳ mỗi 10 giây khi đang ngủ (Relay A-D không nhảy), vẫn cập nhật trạng thái Đèn 12V lên Firebase
  static unsigned long lastSleepHeartbeatMs = 0;
  if (isSystemCurrentlySleeping() && (millis() - lastSleepHeartbeatMs >= 10000)) {
    lastSleepHeartbeatMs = millis();
    pushVocIscToFirebase();
  }

  // Chạy máy trạng thái đóng ngắt Relay A-B-C-D đo Voc & Isc (Chỉ chạy khi thức)
  runMeasurementStateMachine();

  // Xử lý lệnh Serial CLI
  handleSerialCommands();

  delay(5);
}
