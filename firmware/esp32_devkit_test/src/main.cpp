// =========================================================================
// FIRMWARE TEST TOÀN DIỆN ESP32-S3 N16R8:
// ĐỘNG CƠ BƯỚC NEMA 23 + DRIVER DM556 + ENCODER 3806 + CTHT HOME
// + ĐỒNG HỒ THỜI GIAN THỰC RTC DS3231 + 4 CẢM BIẾN QUANG TEMT6000 (ADC1)
//
// Phân bổ chân chuẩn 100% cho ESP32-S3 N16R8 (Tránh hoàn toàn GPIO 26-37):
//   - Trục 1 (Azimuth - Xoay Ngang)  : PUL=10, DIR=11, HOME=18, ENC A=6, ENC B=7
//   - Trục 2 (Elevation - Độ Ngửa)   : PUL=12, DIR=13, HOME=21, ENC A=16, ENC B=17
//   - I2C Bus (DS3231 + INA226)      : SDA=8, SCL=9, SQW/INT=47 (Có timeout chống treo)
//   - Cảm biến quang TEMT6000 (ADC1) : TOP=1, BOT=2, LFT=3, RGT=4
// =========================================================================

#include <Arduino.h>
#include <Preferences.h>
#include <Wire.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <FastAccelStepper.h>
#include <driver/pcnt.h>
#include <INA226.h>
#include "config.h"
#include "param_registry.h"
#include "calibration_store.h"
#include "bench_wizard.h"
#include "offline_queue.h"
#include <esp_task_wdt.h>
#include <esp_sleep.h>
#include <driver/gpio.h>
#include "solar_ephemeris.h"
#include "solar_geometry.h"

Preferences prefs;

// FastAccelStepper Hardware Pulse Generator
FastAccelStepperEngine engine = FastAccelStepperEngine();
FastAccelStepper *stepper1 = NULL;
FastAccelStepper *stepper2 = NULL;

// FreeRTOS Core 0 Task & Thread Safety
TaskHandle_t      telemetryTaskHandle = NULL;
SemaphoreHandle_t i2cMutex            = NULL;
volatile bool     telemetryDirty      = false;

void requestTelemetryPrint() {
  telemetryDirty = true;
}

// Khai báo trước hàm điều khiển vị trí góc
bool stepPositionControl(int axis, float targetDeg, uint32_t speedHz = 0);

// Firebase Objects
FirebaseData   fbdo;
FirebaseAuth   auth;
FirebaseConfig fbConfig;

// Cảm biến đo công suất INA226 cho cả 2 tấm pin (Chung bus I2C SDA: GPIO 8, SCL: GPIO 9)
// Tấm cố định: 0x41 (A0 hàn VCC) | Tấm xoay Tracker: 0x44 (Địa chỉ thực tế trên bus)
INA226 inaTracker(0x44, &Wire);
INA226 inaStatic(0x41, &Wire);
bool inaTrackerFound = false;
bool inaStaticFound = false;
double energyWhTracker = 0.0;
double energyWhStatic  = 0.0;
float voltTrkLive = 0.0f, currTrkLive = 0.0f, pwrTrkLive = 0.0f;
float voltStaLive = 0.0f, currStaLive = 0.0f, pwrStaLive = 0.0f;
unsigned long lastEnergyCalcTime = 0;
unsigned long lastEnergySaveTime = 0;
int lastRtcDay = -1;
unsigned long  lastFirebasePushTime = 0;

// Thống kê 1 phút phục vụ bản ghi MinuteRecord & Hàng đợi Offline LittleFS (Mục 2 & Mục 9)
static double lastMinuteWhTracker = 0.0;
static double lastMinuteWhStatic  = 0.0;
static float  minVTrkSum = 0.0f, minITrkSum = 0.0f, minPTrkSum = 0.0f, minPTrkPeak = 0.0f;
static float  minVStaSum = 0.0f, minIStaSum = 0.0f, minPStaSum = 0.0f, minPStaPeak = 0.0f;
static int    minSamplesCount = 0;
static unsigned long lastMinuteRecordTime = 0;

// -------------------------------------------------------------------------
// 1. CẤU HÌNH CHÂN NGOẠI VI CHO ESP32-S3 N16R8
// -------------------------------------------------------------------------
// Trục 1: Azimuth (Góc quay phương vị)
#define M1_PUL_PIN        10  // PUL+ Driver DM556 #1 (J1 Pin 16)
#define M1_DIR_PIN        11  // DIR+ Driver DM556 #1 (J1 Pin 17)
#define M1_HOME_SW_PIN    18  // Công tắc hành trình Home 1 (NO vào GPIO 18, COM vào GND - J1 Pin 11)
#define M1_ENC_A_PIN      6   // Pha A Encoder #1 (Dây Trắng - J1 Pin 6) -> MỚI ĐỔI (Tránh lỗi chân 14)
#define M1_ENC_B_PIN      7   // Pha B Encoder #1 (Dây Xanh Lá - J1 Pin 7) -> MỚI ĐỔI (Tránh lỗi chân 15)

// Trục 2: Elevation (Độ ngửa / Nâng hạ)
#define M2_PUL_PIN        12  // PUL+ Driver DM556 #2 (J1 Pin 18)
#define M2_DIR_PIN        13  // DIR+ Driver DM556 #2 (J1 Pin 19)
#define M2_HOME_SW_PIN    21  // Công tắc hành trình Home 2 (NO vào GPIO 21, COM vào GND - J3 Pin 18)
#define M2_ENC_A_PIN      16  // Pha A Encoder #2 (Dây Trắng - J1 Pin 9)
#define M2_ENC_B_PIN      17  // Pha B Encoder #2 (Dây Xanh Lá - J1 Pin 10)

// I2C Bus & RTC DS3231
#define I2C_SDA_PIN       8
#define I2C_SCL_PIN       9
#define DS3231_I2C_ADDR   0x68
#define DS3231_SQW_PIN    47  // Chân ngắt báo thức Alarm 1 (J3 Pin 17 - Hàng bên phải, ngay trên CTHT 2)

// 4 Cảm biến quang TEMT6000 (Chân ADC1 hoàn toàn độc lập với WiFi)
#define PIN_TEMT_TOP      1   // ADC1_CH0
#define PIN_TEMT_BOT      2   // ADC1_CH1
#define PIN_TEMT_LFT      3   // ADC1_CH2
#define PIN_TEMT_RGT      4   // ADC1_CH3

#define HOME_ACTIVE_LEVEL LOW // Chân kéo INPUT_PULLUP: Chạm Home = LOW

// Chiều quay cơ khí:
#define DIR_TOWARD_HOME   LOW   // Chiều tiến vào công tắc Home
#define DIR_AWAY_HOME     HIGH  // Chiều lùi ra xa công tắc Home

// -------------------------------------------------------------------------
// 2. THAM SỐ CƠ KHÍ & ENCODER & TỐC ĐỘ (600 PPR, HỘP SỐ 3:1)
// -------------------------------------------------------------------------
const float ENCODER_PPR       = 600.0f;                  // 600 xung/vòng
const float COUNTS_PER_REV    = 4.0f * ENCODER_PPR;      // 2400 counts / vòng ngắt 4X

// Tỷ số truyền cơ khí động cơ : tải = 3 : 1
const float GEAR_RATIO           = 3.0f;

// Driver DM556 thiết lập SW3=ON, SW8=ON -> 25600 xung/vòng động cơ (dòng đỉnh 3.2A, SW4=OFF half-current)
const float PULSES_PER_REV_MOTOR = 25600.0f;

// Số xung phát từ driver trên 1 độ quay của tấm pin (Tấm quay 360° = Động cơ quay 3 vòng = 76800 xung)
const float PULSES_PER_DEG_PANEL = (PULSES_PER_REV_MOTOR * GEAR_RATIO) / 360.0f; // 213.333 xung / độ tấm

// Tham số vị trí lắp đặt Encoder (ĐÍNH CHÍNH QUAN TRỌNG: Mặc định UNKNOWN cho tới khi chạy Bench B2)
enum EncoderLocation {
  ENCODER_LOC_UNKNOWN = 0, // Chưa xác nhận bằng Bench B2 (Tạm tính theo ENCODER_ON_LOAD: 0.15°/count)
  ENCODER_ON_LOAD     = 1, // ĐÃ CHỐT: Encoder 1:1 trên trục tải (trục tấm): 2400 count/vòng tấm = 0.15°/count, 32 xung/count
  ENCODER_ON_MOTOR    = 2  // ĐÃ CHỐT: Encoder trên trục động cơ (trước hộp số 3:1): 2400 count/vòng motor = 0.05°/count tấm
};

EncoderLocation encoderLocation = ENCODER_LOC_UNKNOWN; // Cần Bench B2 để chốt giá trị

// Độ phân giải góc tấm tính theo vị trí Encoder (Đọc động từ ParamRegistry)
inline float getDegPerCount() {
  int encLoc = ParamRegistry.getInt("ENCODER_ON_LOAD", (int)encoderLocation);
  float ppr = ParamRegistry.get("ENCODER_PPR_AZ", 600.0f);
  float gearRatio = ParamRegistry.get("GEAR_RATIO_AZ", 3.0f);
  float cpr = 4.0f * ppr;
  if (encLoc == ENCODER_ON_MOTOR) {
    return (360.0f / cpr) / gearRatio; // 0.05°/count nếu gắn trục motor
  }
  // Mặc định hoặc ENCODER_ON_LOAD: Gắn trên trục tấm pin (tải): 360° / 2400 = 0.15°/count
  return 360.0f / cpr; // 0.15°/count (KHÔNG chia tỉ số truyền!)
}

// Số xung phát tương ứng 1 count encoder (Đọc động từ ParamRegistry)
inline float getPulsesPerCount() {
  int encLoc = ParamRegistry.getInt("ENCODER_ON_LOAD", (int)encoderLocation);
  float ppr = ParamRegistry.get("ENCODER_PPR_AZ", 600.0f);
  float pulsesPerRev = ParamRegistry.get("E_PULSES_PER_REV_AZ", 25600.0f);
  float gearRatio = ParamRegistry.get("GEAR_RATIO_AZ", 3.0f);
  float cpr = 4.0f * ppr;
  if (encLoc == ENCODER_ON_MOTOR) {
    return pulsesPerRev / cpr; // 25600 / 2400 = 10.667 xung/count
  }
  return (pulsesPerRev * gearRatio) / cpr; // 76800 / 2400 = 32.0 xung/count
}

const float DEG_PER_COUNT        = 360.0f / COUNTS_PER_REV; // 0.15° / count danh định

// Forward declarations
bool isHome1Triggered();
bool isHome2Triggered();
float getAngleDeg1();
float getAngleDeg2();
float getElevationEpsilon();
float getCompassAzimuth();
inline float getAzMaxSoftLimitDeg();
inline float getElMinSoftLimitDeg();
inline float getElMaxSoftLimitDeg();

// Hằng số hình học lắp đặt & La bàn địa lý (Đọc động từ ParamRegistry, UNVERIFIED)
inline float getGHomeAzDeg()        { return ParamRegistry.get("G_AZ_HOME", 45.0f); }
inline float getHOffsetAzDeg()      { return ParamRegistry.get("H_AZ_OFFSET", 0.0f); }
inline float getJHomeElDeg()        { return ParamRegistry.get("J_EL_HOME", 90.0f); }
#ifdef CFG_G_AZ_HOME_SW_DEG
#undef CFG_G_AZ_HOME_SW_DEG
#endif
#define CFG_G_AZ_HOME_SW_DEG (getGHomeAzDeg())

#ifdef CFG_H_AZ_OFFSET_DEG
#undef CFG_H_AZ_OFFSET_DEG
#endif
#define CFG_H_AZ_OFFSET_DEG  (getHOffsetAzDeg())

#ifdef CFG_J_EL_HOME_SW_DEG
#undef CFG_J_EL_HOME_SW_DEG
#endif
#define CFG_J_EL_HOME_SW_DEG (getJHomeElDeg())

// Giới hạn mềm an toàn bảo vệ cơ học (Đọc động từ ParamRegistry, UNVERIFIED)
inline float getAzMaxSoftLimitDeg() { return ParamRegistry.get("SOFT_MAX_AZ", 270.0f); }
inline float getElMinSoftLimitDeg() { return ParamRegistry.get("L_EL_MIN_SOFT", 10.0f); }
inline float getElMaxSoftLimitDeg() { return ParamRegistry.get("SOFT_MAX_EL", 90.0f); } // ε tại switch = 90°

#ifdef CFG_I_AZ_MAX_SOFT_LIMIT_DEG
#undef CFG_I_AZ_MAX_SOFT_LIMIT_DEG
#endif
#define CFG_I_AZ_MAX_SOFT_LIMIT_DEG (getAzMaxSoftLimitDeg())

#ifdef CFG_L_EL_MIN_SOFT_LIMIT_DEG
#undef CFG_L_EL_MIN_SOFT_LIMIT_DEG
#endif
#define CFG_L_EL_MIN_SOFT_LIMIT_DEG (getElMinSoftLimitDeg())

#ifdef CFG_J_EL_MAX_SOFT_LIMIT_DEG
#undef CFG_J_EL_MAX_SOFT_LIMIT_DEG
#endif
#define CFG_J_EL_MAX_SOFT_LIMIT_DEG (getElMaxSoftLimitDeg())

// Kiểm tra giới hạn mềm & công tắc trong tầng điều khiển (A8)
inline bool checkMotionAllowed(int axis, int dir) {
  if (axis == 1) {
    if (dir < 0) return !isHome1Triggered(); // Hướng về Home
    if (dir > 0) return (getAngleDeg1() < getAzMaxSoftLimitDeg()); // Hướng ra xa Home
  } else if (axis == 2) {
    if (dir < 0) return (!isHome2Triggered() && (getElevationEpsilon() < getElMaxSoftLimitDeg())); // Ngửa lên về Home
    if (dir > 0) return (getElevationEpsilon() > getElMinSoftLimitDeg()); // Hạ thấp
  }
  return true;
}

// Spinlock bảo vệ truy cập atomic cho bộ đếm Encoder (A2)
static portMUX_TYPE encMux = portMUX_INITIALIZER_UNLOCKED;

volatile int32_t encoderCount1 = 0;
volatile int32_t encoderCount2 = 0;
volatile uint32_t rawEdges1A   = 0; // Đếm cạnh xung riêng biệt Pha A Trục 1 (GPIO 6)
volatile uint32_t rawEdges1B   = 0; // Đếm cạnh xung riêng biệt Pha B Trục 1 (GPIO 7)
volatile uint32_t rawEdges2A   = 0; // Đếm cạnh xung riêng biệt Pha A Trục 2 (GPIO 16)
volatile uint32_t rawEdges2B   = 0; // Đếm cạnh xung riêng biệt Pha B Trục 2 (GPIO 17)
bool rawEncStream = false;          // Cờ bật/tắt in mức logic & so sánh song song mỗi 200ms
bool rawEdgesAttached = false;      // Cờ quản lý gắn ngắt cạnh rawEdges (A11)

// Bộ đếm phần mềm 4X (Lookup Table 16 phần tử - phương pháp cũ đã chạy chuẩn)
DRAM_ATTR static const int8_t ENC_STATES[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};
volatile int32_t swEncoderCount1 = 0;
volatile int32_t swEncoderCount2 = 0;
volatile uint8_t swOldState1     = 0;
volatile uint8_t swOldState2     = 0;

bool invertEncoderDir1 = false;
bool invertEncoderDir2 = false;

void IRAM_ATTR isrEnc1A() {
  rawEdges1A++;
  uint8_t s = (digitalRead(M1_ENC_A_PIN) << 1) | digitalRead(M1_ENC_B_PIN);
  swOldState1 = ((swOldState1 << 2) | s) & 0x0F;
  int8_t diff = ENC_STATES[swOldState1];
  if (invertEncoderDir1) diff = -diff;
  swEncoderCount1 += diff;
}

void IRAM_ATTR isrEnc1B() {
  rawEdges1B++;
  uint8_t s = (digitalRead(M1_ENC_A_PIN) << 1) | digitalRead(M1_ENC_B_PIN);
  swOldState1 = ((swOldState1 << 2) | s) & 0x0F;
  int8_t diff = ENC_STATES[swOldState1];
  if (invertEncoderDir1) diff = -diff;
  swEncoderCount1 += diff;
}

void IRAM_ATTR isrEnc2A() {
  rawEdges2A++;
  uint8_t s = (digitalRead(M2_ENC_A_PIN) << 1) | digitalRead(M2_ENC_B_PIN);
  swOldState2 = ((swOldState2 << 2) | s) & 0x0F;
  int8_t diff = ENC_STATES[swOldState2];
  if (invertEncoderDir2) diff = -diff;
  swEncoderCount2 += diff;
}

void IRAM_ATTR isrEnc2B() {
  rawEdges2B++;
  uint8_t s = (digitalRead(M2_ENC_A_PIN) << 1) | digitalRead(M2_ENC_B_PIN);
  swOldState2 = ((swOldState2 << 2) | s) & 0x0F;
  int8_t diff = ENC_STATES[swOldState2];
  if (invertEncoderDir2) diff = -diff;
  swEncoderCount2 += diff;
}

bool liveEncoderMonitor = false;   // Chế độ Live Monitor hiển thị từng cạnh xung ngay lập tức (phím V)

// Quản lý ngắt đếm cạnh thô rawEdges (A11: Chỉ bật khi Bench/debug, tiết kiệm CPU)
void enableRawEdgeInterrupts() {
  if (!rawEdgesAttached) {
    attachInterrupt(digitalPinToInterrupt(M1_ENC_A_PIN), isrEnc1A, CHANGE);
    attachInterrupt(digitalPinToInterrupt(M1_ENC_B_PIN), isrEnc1B, CHANGE);
    attachInterrupt(digitalPinToInterrupt(M2_ENC_A_PIN), isrEnc2A, CHANGE);
    attachInterrupt(digitalPinToInterrupt(M2_ENC_B_PIN), isrEnc2B, CHANGE);
    rawEdgesAttached = true;
  }
}

void disableRawEdgeInterrupts() {
  if (rawEdgesAttached) {
    detachInterrupt(digitalPinToInterrupt(M1_ENC_A_PIN));
    detachInterrupt(digitalPinToInterrupt(M1_ENC_B_PIN));
    detachInterrupt(digitalPinToInterrupt(M2_ENC_A_PIN));
    detachInterrupt(digitalPinToInterrupt(M2_ENC_B_PIN));
    rawEdgesAttached = false;
  }
}

// Biến đo độ lặp lại Homing (A9: repeatability metric)
int32_t lastHomeTouchCount1 = 0;
int32_t lastHomeTouchCount2 = 0;

// Trạng thái kiểm chuẩn Homing khi khởi động (A3: Boot -> UNCALIBRATED -> Homing)
bool systemHomed = false;

// Tốc độ (Hz = steps/s) và Gia tốc (steps/s^2) phần cứng FastAccelStepper (Mặc định êm ái, an toàn, mô-men xoắn cao)
uint32_t manualSpeedHz    = 1200; // Tốc độ chạy tay (Hz) - tương đương ~350us của code cũ, chạy đầm, êm
uint32_t autoSpeedHz      = 1600; // Tốc độ Homing tự động (Hz)
uint32_t stepperAccel     = 2400; // Gia tốc (steps/s^2) - tạo dốc S-curve êm ái trong 0.5s, không giật giàn cơ
int stepsPerPress         = 400;  // Số bước mỗi lần bấm phím A/D (400 bước vừa phải như code 1 motor cũ)

// Thông số Homing 2 giai đoạn (Two-Stage Precision Homing: Fast -> Retract -> Creep)
const uint32_t HOME_FAST_SPEED_HZ  = 1200; // Giai đoạn 1: Tiếp cận nhanh vừa phải (Hz)
const uint32_t HOME_CREEP_SPEED_HZ = 200;  // Giai đoạn 3: Rà chậm tiếp xúc chính xác (Hz, sai số <= 1 bước)
const int32_t  HOME_RETRACT_STEPS  = 300;  // Giai đoạn 2: Lùi nhả switch (~1.5 vòng vi bước)

// -------------------------------------------------------------------------
// 3. VỊ TRÍ MẶC ĐỊNH M1 VÀ M2 (LƯU VĨNH VIỄN TRONG FLASH NVS)
// -------------------------------------------------------------------------
const int32_t INIT_DEFAULT_COUNTS_1 = 600;
const float   INIT_DEFAULT_DEG_1    = 90.0f;   // 600 counts * 0.15° = 90.0° góc giàn pin (khi Encoder ở tải)

const int32_t INIT_DEFAULT_COUNTS_2 = -389;
const float   INIT_DEFAULT_DEG_2    = -58.35f; // -389 counts * 0.15° = -58.35° góc giàn pin (khi Encoder ở tải)

int32_t defaultCount1 = INIT_DEFAULT_COUNTS_1;
float   defaultDeg1   = INIT_DEFAULT_DEG_1;
bool    hasDefault1   = true;

int32_t defaultCount2 = INIT_DEFAULT_COUNTS_2;
float   defaultDeg2   = INIT_DEFAULT_DEG_2;
bool    hasDefault2   = true;

enum MotorState {
  STATE_IDLE = 0,
  STATE_MANUAL_TOWARD_HOME,
  STATE_MANUAL_AWAY_HOME,
  STATE_AUTO_HOMING,
  STATE_AUTO_SEEK_DEFAULT
};

MotorState stateM1 = STATE_IDLE;
MotorState stateM2 = STATE_IDLE;
int activeAxis = 1;
// Chế độ nguồn bám mặt trời (TrackSource)
enum TrackSourceMode {
  TRACK_SRC_OFF = 0,
  TRACK_SRC_EPHEMERIS = 1, // Chỉ thiên văn NOAA Feedforward thuần (EPHEMERIS_ONLY)
  TRACK_SRC_SENSOR = 2,    // Chỉ cảm biến quang TEMT6000 (SENSOR_ONLY)
  TRACK_SRC_HYBRID = 3     // Hợp nhất Hybrid: NOAA Feedforward + TEMT6000 Optical Feedback
};
TrackSourceMode currentTrackSource = TRACK_SRC_OFF;

// Máy trạng thái hữu hạn FSM vận hành hệ thống (Mục 6)
enum SystemFsmState {
  FSM_STATE_IDLE = 0,
  FSM_STATE_HOMING = 1,
  FSM_STATE_SEEK_DEF = 2,
  FSM_STATE_TRACKING = 3,
  FSM_STATE_MOVING = 4,
  FSM_STATE_PARK = 5,
  FSM_STATE_PREP_SLEEP = 6,
  FSM_STATE_LIGHT_SLEEP = 7,
  FSM_STATE_DAWN_POLL = 8,
  FSM_STATE_FAULT = 9
};
SystemFsmState systemFsmState = FSM_STATE_IDLE;

// Trạng thái chu kỳ điều chỉnh và giữ bước 15 phút (Hybrid Tracking Hold)
enum TrackCyclePhase {
  TRACK_CYCLE_ADJUSTING = 0, // Đang tính toán và quay đón góc mục tiêu
  TRACK_CYCLE_HOLD = 1       // Đã cân bằng ổn định -> đứng im giữ bước trong 15 phút
};
TrackCyclePhase trackCyclePhase = TRACK_CYCLE_ADJUSTING;
unsigned long   trackHoldStartTimeMs = 0;
bool            isMaxAzimuthReached = false;

// Trạng thái Bám quang tự động (Optical Tracking) & Lọc tín hiệu
bool autoOpticalTracking = false;
unsigned long lastOpticalTrackTime = 0;
const float OPTICAL_NORM_DEADBAND   = 0.05f; // Vùng chết chuẩn hóa: sai số <= 5% (0.05) coi như đã cân bằng hoàn hảo
const float OPTICAL_FINE_THRESHOLD  = 0.15f; // Ngưỡng gần đều: sai số > 15% chạy liên tục cả 2 động cơ, 5%..15% nhích vi chỉnh
const int   OPTICAL_NIGHT_THRESHOLD = 50;    // Ngưỡng trời tối (dưới 50 ADC counts -> dừng quay tiết kiệm điện)
const float EMA_ALPHA               = 0.25f; // Hệ số lọc số mũ EMA (0.25: mượt mà, triệt tiêu 100% rung 1-count)

// Biến lưu trạng thái trước đó để kiểm tra thay đổi
int32_t    prevCount1 = -999999, prevCount2 = -999999;
bool       prevHome1  = false,   prevHome2  = false;
MotorState prevState1 = (MotorState)-1, prevState2 = (MotorState)-1;
int        prevActiveAxis = -1;
unsigned long lastPrintTime = 0;

// -------------------------------------------------------------------------
// 4. BỘ ĐẾM XUNG PHẦN CỨNG PCNT (ESP32-S3 SILICON 4X QUADRATURE DECODER)
// -------------------------------------------------------------------------
// Thay thế ngắt GPIO ISR mềm: Đếm 100% bằng phần cứng silicon PCNT trên ESP32-S3.
// Tích hợp Hardware Glitch Filter (200 chu kỳ APB = 2.5us) triệt tiêu hoàn toàn nhiễu DM556!
static int16_t lastPcntVal1 = 0;
static int16_t lastPcntVal2 = 0;

void initPcntEncoder(pcnt_unit_t unit, int pinA, int pinB) {
  pcnt_config_t pcnt_config_a = {
    .pulse_gpio_num = pinA,
    .ctrl_gpio_num  = pinB,
    .lctrl_mode     = PCNT_MODE_REVERSE,
    .hctrl_mode     = PCNT_MODE_KEEP,
    .pos_mode       = PCNT_COUNT_DEC,
    .neg_mode       = PCNT_COUNT_INC,
    .counter_h_lim  = 32000,
    .counter_l_lim  = -32000,
    .unit           = unit,
    .channel        = PCNT_CHANNEL_0,
  };
  pcnt_unit_config(&pcnt_config_a);

  pcnt_config_t pcnt_config_b = {
    .pulse_gpio_num = pinB,
    .ctrl_gpio_num  = pinA,
    .lctrl_mode     = PCNT_MODE_REVERSE,
    .hctrl_mode     = PCNT_MODE_KEEP,
    .pos_mode       = PCNT_COUNT_INC,
    .neg_mode       = PCNT_COUNT_DEC,
    .counter_h_lim  = 32000,
    .counter_l_lim  = -32000,
    .unit           = unit,
    .channel        = PCNT_CHANNEL_1,
  };
  pcnt_unit_config(&pcnt_config_b);

  // Bộ lọc phần cứng Glitch Filter (80 chu kỳ clock APB 80MHz = 1000 ns = 1.0 micro-giây)
  // Nhỏ hơn 1/10 độ rộng xung nhỏ nhất của Encoder ở tốc độ tối đa
  pcnt_set_filter_value(unit, 80);
  pcnt_filter_enable(unit);

  pcnt_counter_pause(unit);
  pcnt_counter_clear(unit);
  pcnt_counter_resume(unit);
}

// -------------------------------------------------------------------------
// ĐỘC QUYỀN CẬP NHẬT ENCODER TẠI CORE 1 (A2)
// Chỉ 1 nơi duy nhất được quyền gọi pcnt_get_counter_value(...) và cập nhật count.
// Chu kỳ gọi: trong loop() (Core 1) >= 500 Hz (thời gian chu kỳ <= 2ms).
// -------------------------------------------------------------------------
void updateHardwareEncoders() {
  int16_t hw1 = 0;
  int16_t hw2 = 0;
  pcnt_get_counter_value(PCNT_UNIT_0, &hw1);
  pcnt_get_counter_value(PCNT_UNIT_1, &hw2);

  portENTER_CRITICAL(&encMux);
  int16_t diff1 = hw1 - lastPcntVal1;
  lastPcntVal1 = hw1;
  if (invertEncoderDir1) diff1 = -diff1;
  encoderCount1 += diff1;

  int16_t diff2 = hw2 - lastPcntVal2;
  lastPcntVal2 = hw2;
  if (invertEncoderDir2) diff2 = -diff2;
  encoderCount2 += diff2;
  portEXIT_CRITICAL(&encMux);
}

// Đọc atomic bản sao chốt của Encoder từ bất kỳ Core / Task nào (A2)
int32_t getEncoderCount1() {
  portENTER_CRITICAL(&encMux);
  int32_t val = encoderCount1;
  portEXIT_CRITICAL(&encMux);
  return val;
}

int32_t getEncoderCount2() {
  portENTER_CRITICAL(&encMux);
  int32_t val = encoderCount2;
  portEXIT_CRITICAL(&encMux);
  return val;
}

void resetEncoder1(int32_t val = 0) {
  pcnt_counter_pause(PCNT_UNIT_0);
  pcnt_counter_clear(PCNT_UNIT_0);
  portENTER_CRITICAL(&encMux);
  lastPcntVal1 = 0;
  encoderCount1 = val;
  swEncoderCount1 = val;
  swOldState1 = (digitalRead(M1_ENC_A_PIN) << 1) | digitalRead(M1_ENC_B_PIN);
  portEXIT_CRITICAL(&encMux);
  pcnt_counter_resume(PCNT_UNIT_0);
}

void resetEncoder2(int32_t val = 0) {
  pcnt_counter_pause(PCNT_UNIT_1);
  pcnt_counter_clear(PCNT_UNIT_1);
  portENTER_CRITICAL(&encMux);
  lastPcntVal2 = 0;
  encoderCount2 = val;
  swEncoderCount2 = val;
  swOldState2 = (digitalRead(M2_ENC_A_PIN) << 1) | digitalRead(M2_ENC_B_PIN);
  portEXIT_CRITICAL(&encMux);
  pcnt_counter_resume(PCNT_UNIT_1);
}

// Hàm trả về góc thực tế của GIÀN PIN (Đọc theo tham số encoderLocation, KHÔNG chia 3 nếu ở tải!)
float getAngleDeg1()      { return (float)getEncoderCount1() * getDegPerCount(); }
float getAngleDeg2()      { return (float)getEncoderCount2() * getDegPerCount(); }

// Hàm trả về góc trên TRỤC ĐỘNG CƠ phục vụ chẩn đoán
float getMotorAngleDeg1() {
  if (encoderLocation == ENCODER_ON_LOAD) return (float)getEncoderCount1() * getDegPerCount() * GEAR_RATIO;
  return (float)getEncoderCount1() * DEG_PER_COUNT;
}
float getMotorAngleDeg2() {
  if (encoderLocation == ENCODER_ON_LOAD) return (float)getEncoderCount2() * getDegPerCount() * GEAR_RATIO;
  return (float)getEncoderCount2() * DEG_PER_COUNT;
}

// Góc La bàn địa lý Azimuth (tính từ Bắc = 0° theo chiều KĐH: Bắc 0°, Đông 90°, Nam 180°, Tây 270°)
float getCompassAzimuth() {
  float az = CFG_G_AZ_HOME_SW_DEG + CFG_H_AZ_OFFSET_DEG + getAngleDeg1();
  while (az >= 360.0f) az -= 360.0f;
  while (az < 0.0f)    az += 360.0f;
  return az;
}

// Góc nâng thực tế của giàn pin (Elevation/Epsilon: 0° = mặt đất, 90° = đỉnh trời/zenith)
// Switch Home 2 đặt tại vị trí ngửa đỉnh trời (Zenith = 90.0°). Khi quay ra xa Home, góc nâng hạ dần xuống chân trời.
float getElevationEpsilon() {
  return CFG_J_EL_HOME_SW_DEG - getAngleDeg2();
}

// -------------------------------------------------------------------------
// 5. BỘ LỌC DEBOUNCE CHỐNG DỘI TIẾP ĐIỂM & CHỐNG NHIỄU XUNG BĂM DM556
// -------------------------------------------------------------------------
static portMUX_TYPE homeMux = portMUX_INITIALIZER_UNLOCKED;

bool isHome1Triggered() {
  portENTER_CRITICAL(&homeMux);
  static bool debouncedState1 = false;
  static unsigned long lowStartTime1 = 0;
  static unsigned long highStartTime1 = 0;
  const unsigned long DEBOUNCE_MS = 25;

  bool isRawLow = (digitalRead(M1_HOME_SW_PIN) == HOME_ACTIVE_LEVEL);

  if (isRawLow) {
    highStartTime1 = 0;
    if (!debouncedState1) {
      if (lowStartTime1 == 0) {
        lowStartTime1 = millis();
      } else if (millis() - lowStartTime1 >= DEBOUNCE_MS) {
        debouncedState1 = true;
      }
    }
  } else {
    lowStartTime1 = 0;
    if (debouncedState1) {
      if (highStartTime1 == 0) {
        highStartTime1 = millis();
      } else if (millis() - highStartTime1 >= DEBOUNCE_MS) {
        debouncedState1 = false;
      }
    }
  }
  bool res = debouncedState1;
  portEXIT_CRITICAL(&homeMux);
  return res;
}

bool isHome2Triggered() {
  portENTER_CRITICAL(&homeMux);
  static bool debouncedState2 = false;
  static unsigned long lowStartTime2 = 0;
  static unsigned long highStartTime2 = 0;
  const unsigned long DEBOUNCE_MS = 25;

  bool isRawLow = (digitalRead(M2_HOME_SW_PIN) == HOME_ACTIVE_LEVEL);

  if (isRawLow) {
    highStartTime2 = 0;
    if (!debouncedState2) {
      if (lowStartTime2 == 0) {
        lowStartTime2 = millis();
      } else if (millis() - lowStartTime2 >= DEBOUNCE_MS) {
        debouncedState2 = true;
      }
    }
  } else {
    lowStartTime2 = 0;
    if (debouncedState2) {
      if (highStartTime2 == 0) {
        highStartTime2 = millis();
      } else if (millis() - highStartTime2 >= DEBOUNCE_MS) {
        debouncedState2 = false;
      }
    }
  }
  bool res = debouncedState2;
  portEXIT_CRITICAL(&homeMux);
  return res;
}

// Đọc trực tiếp không trễ (phục vụ ngắt khẩn cấp hoặc rà chính xác)
bool isHome1Raw() { return (digitalRead(M1_HOME_SW_PIN) == HOME_ACTIVE_LEVEL); }
bool isHome2Raw() { return (digitalRead(M2_HOME_SW_PIN) == HOME_ACTIVE_LEVEL); }

// -------------------------------------------------------------------------
// 5. GIAO TIẾP I2C & ĐỌC ĐỒNG HỒ RTC DS3231 (TỰ ĐỘNG KHÔNG CẦN LIB NGOÀI)
// -------------------------------------------------------------------------
uint8_t decToBcd(uint8_t val) { return ((val / 10 * 16) + (val % 10)); }
uint8_t bcdToDec(uint8_t val) { return ((val / 16 * 10) + (val % 16)); }

bool readDS3231(int &year, int &month, int &day, int &hour, int &minute, int &second, float &tempC) {
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(50)) != pdTRUE) return false;

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x00); // Bắt đầu đọc từ thanh ghi giây 0x00
  if (Wire.endTransmission() != 0) {
    if (i2cMutex) xSemaphoreGive(i2cMutex);
    return false;
  }

  Wire.requestFrom((uint8_t)DS3231_I2C_ADDR, (uint8_t)7);
  if (Wire.available() < 7) {
    if (i2cMutex) xSemaphoreGive(i2cMutex);
    return false;
  }

  second = bcdToDec(Wire.read() & 0x7F);
  minute = bcdToDec(Wire.read());
  hour   = bcdToDec(Wire.read() & 0x3F);
  Wire.read(); // Bỏ qua day of week
  day    = bcdToDec(Wire.read());
  month  = bcdToDec(Wire.read() & 0x1F);
  year   = 2000 + bcdToDec(Wire.read());

  // Đọc cảm biến nhiệt độ tích hợp trong chip DS3231 (Thanh ghi 0x11, 0x12)
  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x11);
  if (Wire.endTransmission() == 0) {
    Wire.requestFrom((uint8_t)DS3231_I2C_ADDR, (uint8_t)2);
    if (Wire.available() >= 2) {
      int8_t msb = Wire.read();
      uint8_t lsb = Wire.read();
      tempC = (float)msb + ((lsb >> 6) * 0.25f);
    }
  }
  if (i2cMutex) xSemaphoreGive(i2cMutex);
  return true;
}

bool writeDS3231(int year, int month, int day, int hour, int minute, int second) {
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) != pdTRUE) return false;

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x00); // Thanh ghi giay 0x00
  Wire.write(decToBcd(second));
  Wire.write(decToBcd(minute));
  Wire.write(decToBcd(hour));
  Wire.write(decToBcd(1)); // Thu trong tuan
  Wire.write(decToBcd(day));
  Wire.write(decToBcd(month));
  Wire.write(decToBcd(year >= 2000 ? year - 2000 : year));
  byte err = Wire.endTransmission();

  if (i2cMutex) xSemaphoreGive(i2cMutex);
  return (err == 0);
}

// Hàm chuyển đổi thời gian thực RTC DS3231 sang Unix Timestamp UTC+7 (A5)
uint32_t getRtcEpochUTC7() {
  int y, m, d, hh, mm, ss;
  float tC;
  if (!readDS3231(y, m, d, hh, mm, ss, tC)) {
    return 0;
  }
  struct tm t;
  memset(&t, 0, sizeof(t));
  t.tm_year = y - 1900;
  t.tm_mon  = m - 1;
  t.tm_mday = d;
  t.tm_hour = hh;
  t.tm_min  = mm;
  t.tm_sec  = ss;
  t.tm_isdst = 0;
  time_t epoch = mktime(&t);
  return (uint32_t)epoch;
}

// =========================================================================
// QUẢN LÝ BÁO THỨC RTC DS3231 ALARM 1 & NGỦ ĐÊM BẰNG LIGHT SLEEP (MỤC 7)
// =========================================================================

// Cài đặt báo thức Alarm 1 trên DS3231 khớp chính xác giờ, phút, giây
bool setDS3231Alarm1(int hour, int minute, int second) {
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) != pdTRUE) return false;

  // 1. Ghi thanh ghi Alarm 1 (0x07 .. 0x0A)
  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x07);
  Wire.write(decToBcd(second) & 0x7F);  // A1M1 = 0: khớp giây
  Wire.write(decToBcd(minute) & 0x7F);  // A1M2 = 0: khớp phút
  Wire.write(decToBcd(hour) & 0x7F);    // A1M3 = 0: khớp giờ
  Wire.write(0x80);                      // A1M4 = 1: lặp lại hàng ngày khi khớp giờ:phút:giây
  byte err = Wire.endTransmission();
  if (err != 0) {
    if (i2cMutex) xSemaphoreGive(i2cMutex);
    return false;
  }

  // 2. Bật A1IE (bit 0) và INTCN (bit 2) trong thanh ghi Control 0x0E
  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0E);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)DS3231_I2C_ADDR, (uint8_t)1);
  uint8_t ctrl = Wire.available() ? Wire.read() : 0;
  ctrl |= 0x05; // Bật bit 0 (A1IE) và bit 2 (INTCN)

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0E);
  Wire.write(ctrl);
  Wire.endTransmission();

  // 3. Xóa cờ A1F (bit 0) trong thanh ghi Status 0x0F
  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0F);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)DS3231_I2C_ADDR, (uint8_t)1);
  uint8_t stat = Wire.available() ? Wire.read() : 0;
  stat &= ~0x01; // Xóa cờ A1F

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0F);
  Wire.write(stat);
  Wire.endTransmission();

  if (i2cMutex) xSemaphoreGive(i2cMutex);
  return true;
}

// Xóa cờ báo thức A1F trên thanh ghi 0x0F DS3231 (Bắt buộc sau khi thức dậy để chân SQW nhả về HIGH)
bool clearDS3231Alarm1Flag() {
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) != pdTRUE) return false;

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0F);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)DS3231_I2C_ADDR, (uint8_t)1);
  uint8_t stat = Wire.available() ? Wire.read() : 0;
  stat &= ~0x01; // Xóa cờ A1F

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0F);
  Wire.write(stat);
  byte err = Wire.endTransmission();

  if (i2cMutex) xSemaphoreGive(i2cMutex);
  return (err == 0);
}

// Kiểm tra cờ dừng dao động OSF (Oscillator Stop Flag - Bit 7 thanh ghi 0x0F)
bool checkDS3231OSF() {
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(50)) != pdTRUE) return false;

  Wire.beginTransmission(DS3231_I2C_ADDR);
  Wire.write(0x0F);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)DS3231_I2C_ADDR, (uint8_t)1);
  uint8_t stat = Wire.available() ? Wire.read() : 0;
  if (i2cMutex) xSemaphoreGive(i2cMutex);

  return (stat & 0x80) != 0; // True nếu OSF = 1 (mất nguồn pin RTC)
}

// Hàm kích hoạt chế độ ngủ đêm bằng Light Sleep (Mục 7)
void enterNightLightSleep(uint32_t sleepMinutes = 2) {
  Serial.printf("\n>> [PREP_SLEEP] Chuan bi vao Light Sleep (%u phut)...\n", (unsigned int)sleepMinutes);

  // 1. Dừng động cơ, đảm bảo RMT rảnh
  if (stepper1) stepper1->stopMove();
  if (stepper2) stepper2->stopMove();
  delay(100);

  // 2. Lấy giờ hiện tại từ RTC và hẹn báo thức Alarm 1 sau sleepMinutes phút
  int curY, curM, curD, curH, curMin, curS;
  float curTemp;
  if (readDS3231(curY, curM, curD, curH, curMin, curS, curTemp)) {
    int targetMin = (curMin + sleepMinutes) % 60;
    int targetH   = (curH + ((curMin + sleepMinutes) / 60)) % 24;
    setDS3231Alarm1(targetH, targetMin, curS);
    Serial.printf(">> [ALARM 1 SET] Hen gio RTC: %02d:%02d:%02d (Hien tai: %02d:%02d:%02d)\n",
                  targetH, targetMin, curS, curH, curMin, curS);
  } else {
    Serial.println(">> [CANH BAO] Khong doc duoc RTC! Su dung Timer du phong.");
  }

  // 3. Đẩy 1 lần thông báo trạng thái ngủ lên Firebase
  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    FirebaseJson sleepJson;
    sleepJson.set("state", "NGU_DEM");
    sleepJson.set("status", "SLEEPING");
    sleepJson.set("online", true);
    sleepJson.set("source", "device");
    Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &sleepJson);
  }

  // 4. Tắt WiFi để giảm thiểu dòng điện
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(100);

  // 5. Cấu hình ngắt đánh thức Light Sleep bằng GPIO 47 mức LOW (từ chân SQW open-drain)
  gpio_wakeup_enable((gpio_num_t)DS3231_SQW_PIN, GPIO_INTR_LOW_LEVEL);
  esp_sleep_enable_gpio_wakeup();

  // Timer dự phòng bảo vệ an toàn
  esp_sleep_enable_timer_wakeup((uint64_t)(sleepMinutes * 60 + 15) * 1000000ULL);

  Serial.printf(">> [LIGHT SLEEP START] ESP32-S3 bat dau ngu! Hen gap lai sau %u phut...\n\n", (unsigned int)sleepMinutes);
  Serial.flush();

  // 6. BẮT ĐẦU LIGHT SLEEP (RAM VÀ TRẠNG THÁI CPU NGUYÊN VẸN 100%)
  esp_light_sleep_start();

  // ================== THỨC DẬY TẠI ĐÂY ==================
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  Serial.println("\n>> =======================================================");
  Serial.println(">> [WAKEUP] ESP32-S3 DA THUC DAY TU LIGHT SLEEP!");
  if (cause == ESP_SLEEP_WAKEUP_GPIO) {
    Serial.printf(">> [WAKEUP CAUSE] Chinh xac boi ngat GPIO %d (DS3231 Alarm 1 SQW LOW)!\n", DS3231_SQW_PIN);
  } else if (cause == ESP_SLEEP_WAKEUP_TIMER) {
    Serial.println(">> [WAKEUP CAUSE] Boi Timer du phong!");
  } else {
    Serial.printf(">> [WAKEUP CAUSE] Nguyen nhan khac: %d\n", (int)cause);
  }

  // 7. XÓA CỜ BÁO THỨC A1F TRÊN DS3231 (BẮT BUỘC ĐỂ CHÂN SQW QUAY LẠI MỨC HIGH)
  clearDS3231Alarm1Flag();
  Serial.println(">> [RTC] Da xoa co bao thuc A1F tren DS3231. Chan SQW da tro ve muc HIGH.");

  // Đọc lại giờ thực tế khi thức dậy
  if (readDS3231(curY, curM, curD, curH, curMin, curS, curTemp)) {
    Serial.printf(">> [RTC GIO THUC] Thoi gian thuc hien tai: %02d:%02d:%02d\n", curH, curMin, curS);
  }
  Serial.println(">> =======================================================\n");

  // 8. Bật lại WiFi và tiếp tục hoạt động
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// Quy trình ngủ đêm chính thức: Đưa giàn pin về tư thế Park an toàn, hẹn giờ thức dậy lúc 04:00 AM bằng DS3231 Alarm 1
void enterNightSleepUntil4AM() {
  Serial.println("\n=======================================================");
  Serial.println(">> [NIGHT SLEEP] BAT DAU QUY TRINH NGU DEM TOI 04:00 SANG!");
  Serial.println("=======================================================");

  systemFsmState = FSM_STATE_PREP_SLEEP;

  // 1. Đưa giàn pin về tư thế đỗ an toàn (Park position: Az=0.0°, El=90.0°)
  Serial.println("   [1/5] Dang dua gian pin ve the Park an toan (Az: 0.0°, El: 90.0°)...");
  stepPositionControl(2, 90.0f, 1500);
  stepPositionControl(1, 0.0f, 1500);

  // Chờ động cơ chạy về vị trí Park và dừng hẳn (tối đa 20 giây)
  unsigned long startWait = millis();
  while (((stepper1 && stepper1->isRunning()) || (stepper2 && stepper2->isRunning())) && (millis() - startWait < 20000)) {
    vTaskDelay(pdMS_TO_TICKS(50));
    esp_task_wdt_reset();
  }
  if (stepper1) stepper1->stopMove();
  if (stepper2) stepper2->stopMove();
  Serial.println("   -> Gian pin da ve the Park an toan thanh cong!");

  // 2. Lấy giờ hiện tại từ RTC và hẹn báo thức Alarm 1 lúc 04:00:00 sáng
  int curY = 0, curM = 0, curD = 0, curH = 0, curMin = 0, curS = 0;
  float curTemp = 0.0f;
  uint32_t totalSleepSec = 9 * 3600; // Mặc định 9 tiếng nếu không đọc được RTC
  if (readDS3231(curY, curM, curD, curH, curMin, curS, curTemp)) {
    if (curH >= 19) {
      totalSleepSec = ((24 - curH) + 4) * 3600 - curMin * 60 - curS;
    } else if (curH < 4) {
      totalSleepSec = (4 - curH) * 3600 - curMin * 60 - curS;
    }
    setDS3231Alarm1(4, 0, 0); // Đặt báo thức chính xác lúc 04:00:00 AM
    Serial.printf("   [2/5] Hen gio RTC DS3231 Alarm 1 luc 04:00:00 sang (Hien tai: %02d:%02d:%02d, Ngu trong: %u phut)\n",
                  curH, curMin, curS, (unsigned int)(totalSleepSec / 60));
  } else {
    Serial.println("   [2/5] [CANH BAO] Khong doc duoc RTC! Su dung Timer du phong 9 tieng.");
  }

  // 3. Đẩy thông báo trạng thái ngủ đêm lên Firebase
  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    FirebaseJson sleepJson;
    sleepJson.set("state", "DEEP_SLEEP");
    sleepJson.set("status", "SLEEPING");
    sleepJson.set("wake_at", "04:00");
    sleepJson.set("isSleeping", true);
    sleepJson.set("source", "device");
    Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &sleepJson);
    Serial.println("   [3/5] Da cap nhat trang thai DEEP_SLEEP (wake_at: 04:00) len Firebase.");
  }

  // 4. Tắt WiFi để giảm thiểu dòng điện
  Serial.println("   [4/5] Ngat ket noi WiFi de tiet kiem nang luong ban dem...");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(100);

  // 5. Cấu hình ngắt ngoài GPIO 47 và khởi động Light Sleep
  gpio_wakeup_enable((gpio_num_t)DS3231_SQW_PIN, GPIO_INTR_LOW_LEVEL);
  esp_sleep_enable_gpio_wakeup();

  // Timer dự phòng bảo vệ an toàn (thêm 2 phút trừ hao)
  esp_sleep_enable_timer_wakeup((uint64_t)(totalSleepSec + 120) * 1000000ULL);

  Serial.println("   [5/5] ESP32-S3 bat dau Light Sleep. Hen gap lai luc 04:00 sang!\n");
  Serial.flush();

  systemFsmState = FSM_STATE_LIGHT_SLEEP;

  // 6. BẮT ĐẦU LIGHT SLEEP (RAM VÀ TRẠNG THÁI CPU NGUYÊN VẸN 100%)
  esp_light_sleep_start();

  // ================== THỨC DẬY TẠI ĐÂY LÚC 04:00 SÁNG ==================
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  Serial.println("\n>> =======================================================");
  Serial.println(">> [WAKEUP 04:00 AM] ESP32-S3 DA THUC DAY TU LIGHT SLEEP!");
  if (cause == ESP_SLEEP_WAKEUP_GPIO) {
    Serial.printf(">> [WAKEUP CAUSE] Chinh xac boi ngat GPIO %d (DS3231 Alarm 1 SQW LOW luc 04:00)!\n", DS3231_SQW_PIN);
  } else if (cause == ESP_SLEEP_WAKEUP_TIMER) {
    Serial.println(">> [WAKEUP CAUSE] Boi Timer du phong!");
  } else {
    Serial.printf(">> [WAKEUP CAUSE] Nguyen nhan khac: %d\n", (int)cause);
  }

  // 7. Xóa cờ báo thức A1F trên DS3231
  clearDS3231Alarm1Flag();
  Serial.println(">> [RTC] Da xoa co bao thuc A1F tren DS3231. Chan SQW da tro ve muc HIGH.");

  if (readDS3231(curY, curM, curD, curH, curMin, curS, curTemp)) {
    Serial.printf(">> [RTC GIO THUC] Thoi gian khi thuc day: %02d:%02d:%02d %02d/%02d/%04d\n",
                  curH, curMin, curS, curD, curM, curY);
  }
  Serial.println(">> =======================================================\n");

  // 8. Bật lại WiFi và tiếp tục hoạt động ngày mới
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // 9. Đặt lại các biến trạng thái ngày mới
  isMaxAzimuthReached = false;
  trackCyclePhase = TRACK_CYCLE_ADJUSTING;
  systemFsmState = FSM_STATE_IDLE;
}

// Giám sát phát hiện kẹt động cơ (Stall Detection) & mất nguồn 24V (Mục 8)
void checkStallProtection() {
  static unsigned long m1MoveStartTime = 0;
  static int32_t m1StartEnc = 0;
  static int32_t m1StartStepPos = 0;
  static bool m1WasRunning = false;

  bool m1Running = (stepper1 && stepper1->isRunning());
  if (m1Running && !m1WasRunning) {
    m1MoveStartTime = millis();
    m1StartEnc = getEncoderCount1();
    m1StartStepPos = stepper1->getCurrentPosition();
    m1WasRunning = true;
  } else if (!m1Running && m1WasRunning) {
    m1WasRunning = false;
  } else if (m1Running && m1WasRunning) {
    if (millis() - m1MoveStartTime > 600) { // Đợi 600ms sau khi bắt đầu chuyển động
      int32_t deltaSteps = abs(stepper1->getCurrentPosition() - m1StartStepPos);
      int32_t deltaEnc   = abs(getEncoderCount1() - m1StartEnc);
      float pulsesPerCount = getPulsesPerCount();
      float stallThreshCounts = ParamRegistry.get("STALL_THRESH_COUNTS", 5.0f);

      if (deltaSteps > (int32_t)(stallThreshCounts * pulsesPerCount) && deltaEnc < 2) {
        stepper1->stopMove();
        stateM1 = STATE_IDLE;
        autoOpticalTracking = false;
        Serial.printf("\n>> [STALL / NO_MOTION M1] PHAT HIEN KET TRUC 1 HOAC MAT NGUON 24V! (Phat: %ld xung, Encoder chi nhich: %ld count)\n",
                      (long)deltaSteps, (long)deltaEnc);
        m1WasRunning = false;
      }
    }
  }

  static unsigned long m2MoveStartTime = 0;
  static int32_t m2StartEnc = 0;
  static int32_t m2StartStepPos = 0;
  static bool m2WasRunning = false;

  bool m2Running = (stepper2 && stepper2->isRunning());
  if (m2Running && !m2WasRunning) {
    m2MoveStartTime = millis();
    m2StartEnc = getEncoderCount2();
    m2StartStepPos = stepper2->getCurrentPosition();
    m2WasRunning = true;
  } else if (!m2Running && m2WasRunning) {
    m2WasRunning = false;
  } else if (m2Running && m2WasRunning) {
    if (millis() - m2MoveStartTime > 600) {
      int32_t deltaSteps = abs(stepper2->getCurrentPosition() - m2StartStepPos);
      int32_t deltaEnc   = abs(getEncoderCount2() - m2StartEnc);
      float pulsesPerCount = getPulsesPerCount();
      float stallThreshCounts = ParamRegistry.get("STALL_THRESH_COUNTS", 5.0f);

      if (deltaSteps > (int32_t)(stallThreshCounts * pulsesPerCount) && deltaEnc < 2) {
        stepper2->stopMove();
        stateM2 = STATE_IDLE;
        autoOpticalTracking = false;
        Serial.printf("\n>> [STALL / NO_MOTION M2] PHAT HIEN KET TRUC 2 HOAC MAT NGUON 24V! (Phat: %ld xung, Encoder chi nhich: %ld count)\n",
                      (long)deltaSteps, (long)deltaEnc);
        m2WasRunning = false;
      }
    }
  }
}

// Cập nhật công suất, tích phân năng lượng độc lập với WiFi/Firebase, và tạo bản ghi 1 phút (Mục 2, A4, A5, Mục 9)
void updateEnergyAndPower() {
  // 1. Đọc 2 cảm biến INA226 qua I2C Mutex
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    if (inaTrackerFound) {
      voltTrkLive = inaTracker.getBusVoltage();
      currTrkLive = inaTracker.getCurrent_mA() / 1000.0f;
      if (currTrkLive < 0) currTrkLive = 0.0f;
      pwrTrkLive = voltTrkLive * currTrkLive;
    }
    if (inaStaticFound) {
      voltStaLive = inaStatic.getBusVoltage();
      currStaLive = inaStatic.getCurrent_mA() / 1000.0f;
      if (currStaLive < 0) currStaLive = 0.0f;
      pwrStaLive = voltStaLive * currStaLive;
    }
    xSemaphoreGive(i2cMutex);
  }

  // Tích lũy mẫu thống kê cho cửa sổ 1 phút (Mục 9)
  minVTrkSum += voltTrkLive;
  minITrkSum += currTrkLive;
  minPTrkSum += pwrTrkLive;
  if (pwrTrkLive > minPTrkPeak) minPTrkPeak = pwrTrkLive;

  minVStaSum += voltStaLive;
  minIStaSum += currStaLive;
  minPStaSum += pwrStaLive;
  if (pwrStaLive > minPStaPeak) minPStaPeak = pwrStaLive;
  minSamplesCount++;

  // 2. Tích phân năng lượng Wh theo dt thực tế (A4)
  unsigned long nowMs = millis();
  if (lastEnergyCalcTime > 0) {
    double dtHours = (double)(nowMs - lastEnergyCalcTime) / 3600000.0;
    if (dtHours > 0.0 && dtHours < 0.1) {
      energyWhTracker += (pwrTrkLive * dtHours);
      energyWhStatic += (pwrStaLive * dtHours);
    }
  }
  lastEnergyCalcTime = nowMs;

  // 3. Reset năng lượng về 0.0 lúc sang ngày mới 00:00:00 (A4)
  int y = 0, m = 0, d = 0, hh = 0, mm = 0, ss = 0;
  float tC = 25.0f;
  readDS3231(y, m, d, hh, mm, ss, tC);
  if (lastRtcDay != -1 && d != lastRtcDay) {
    Serial.printf(">> [ENERGY] Sang ngay moi (%02d/%02d) -> Reset Wh ve 0.0!\n", d, m);
    energyWhTracker = 0.0;
    energyWhStatic  = 0.0;
    lastMinuteWhTracker = 0.0;
    lastMinuteWhStatic  = 0.0;
    prefs.putFloat("wh_trk", 0.0f);
    prefs.putFloat("wh_sta", 0.0f);
    prefs.putInt("wh_day", d);
  }
  lastRtcDay = d;

  // 4. Định kỳ mỗi 60 giây: Đóng gói 1 bản ghi MinuteRecord (Mục 2 & Mục 9)
  if (lastMinuteRecordTime == 0) lastMinuteRecordTime = nowMs;
  if (nowMs - lastMinuteRecordTime >= 60000) {
    lastMinuteRecordTime = nowMs;

    MinuteRecord rec;
    rec.epoch_ts = getRtcEpochUTC7();
    if (rec.epoch_ts == 0) rec.epoch_ts = (uint32_t)(nowMs / 1000);

    rec.delta_wh_trk = (float)(energyWhTracker - lastMinuteWhTracker);
    rec.delta_wh_sta = (float)(energyWhStatic - lastMinuteWhStatic);
    lastMinuteWhTracker = energyWhTracker;
    lastMinuteWhStatic  = energyWhStatic;

    int samples = (minSamplesCount > 0) ? minSamplesCount : 1;
    rec.v_avg_trk = minVTrkSum / samples;
    rec.i_avg_trk = minITrkSum / samples;
    rec.p_avg_trk = minPTrkSum / samples;
    rec.p_peak_trk = minPTrkPeak;

    rec.v_avg_sta = minVStaSum / samples;
    rec.i_avg_sta = minIStaSum / samples;
    rec.p_avg_sta = minPStaSum / samples;
    rec.p_peak_sta = minPStaPeak;

    rec.rtc_temp = tC;
    rec.fsm_state = (uint8_t)systemFsmState;
    rec.sys_mode = (currentTrackSource != TRACK_SRC_OFF) ? 1 : 0;
    rec.flags = (!systemHomed ? 0x04 : 0x00);

    // Kiểm tra kết nối mạng để quyết định đẩy thẳng lên Firebase hay lưu hàng đợi LittleFS
    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
      char histPath[64];
      snprintf(histPath, sizeof(histPath), "/solar/history/%lu", (unsigned long)rec.epoch_ts);
      FirebaseJson hJson;
      hJson.set("epoch_ts", (double)rec.epoch_ts);
      hJson.set("wh_trk", rec.delta_wh_trk);
      hJson.set("wh_sta", rec.delta_wh_sta);
      hJson.set("v_trk", rec.v_avg_trk);
      hJson.set("i_trk", rec.i_avg_trk);
      hJson.set("p_trk", rec.p_avg_trk);
      hJson.set("p_peak_trk", rec.p_peak_trk);
      hJson.set("v_sta", rec.v_avg_sta);
      hJson.set("i_sta", rec.i_avg_sta);
      hJson.set("p_sta", rec.p_avg_sta);
      hJson.set("p_peak_sta", rec.p_peak_sta);
      hJson.set("rtc_temp", rec.rtc_temp);
      hJson.set("fsm_state", (int)rec.fsm_state);
      hJson.set("sys_mode", (int)rec.sys_mode);
      hJson.set("flags", (int)rec.flags);
      hJson.set("source", "device");
      Firebase.RTDB.updateNode(&fbdo, histPath, &hJson);
    } else {
      // MẤT MẠNG: Đẩy bản ghi vào hàng đợi Offline LittleFS (Mục 2 & Mục 9)
      OfflineQueue.pushRecord(rec);
      Serial.printf(">> [OFFLINE QUEUE] Mat ket noi -> Da luu ban ghi %lu vao LittleFS (Cho day: %u ban ghi)\n",
                    (unsigned long)rec.epoch_ts, (unsigned int)OfflineQueue.getPendingCount());
    }

    // Reset bộ đệm thống kê 1 phút
    minVTrkSum = 0.0f; minITrkSum = 0.0f; minPTrkSum = 0.0f; minPTrkPeak = 0.0f;
    minVStaSum = 0.0f; minIStaSum = 0.0f; minPStaSum = 0.0f; minPStaPeak = 0.0f;
    minSamplesCount = 0;
  }

  // 5. Lưu NVS định kỳ mỗi 60s để chống mất dữ liệu khi mất điện (A4)
  if (nowMs - lastEnergySaveTime >= 60000) {
    lastEnergySaveTime = nowMs;
    prefs.putFloat("wh_trk", (float)energyWhTracker);
    prefs.putFloat("wh_sta", (float)energyWhStatic);
    if (lastRtcDay != -1) prefs.putInt("wh_day", lastRtcDay);
  }
}

void scanI2CBus() {
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(500)) != pdTRUE) {
    Serial.println(">> [I2C SCANNER] Bus I2C dang ban boi tac vu khac!");
    return;
  }

  Serial.println(">> [I2C SCANNER] Bat dau quet bus I2C (SDA: GPIO 8, SCL: GPIO 9)...");
  int nDevices = 0;
  for (byte address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("   [+] Tim thay thiet bi tai 0x%02X: ", address);
      if (address == 0x68) Serial.print("RTC DS3231 [CHIP CHINH]");
      else if (address == 0x57 || address == 0x50) Serial.print("EEPROM AT24C32 (tren module RTC)");
      else if (address == 0x44 || address == 0x40) Serial.print("INA226 #1 (Tam Xoay Tracker)");
      else if (address == 0x41) Serial.print("INA226 #2 (Tam Co Dinh Static)");
      else Serial.print("Thiet bi I2C");
      Serial.println();
      nDevices++;
    }
  }
  if (nDevices == 0) {
    Serial.println("   [!] Khong tim thay thiet bi I2C nao tren bus.");
    Serial.println("   -> Kiem tra: Day VCC 3.3V, GND, SDA (G8) va SCL (G9) co tiep xuc tot khong.");
  } else {
    Serial.printf(">> Tong cong tim thay: %d thiet bi I2C hoat dong tot!\n", nDevices);
  }
  Serial.println();
  if (i2cMutex) xSemaphoreGive(i2cMutex);
}

void printRTCStatus() {
  int y, m, d, hh, mm, ss;
  float tC = 0.0f;
  if (readDS3231(y, m, d, hh, mm, ss, tC)) {
    Serial.printf(">> [RTC DS3231 LIVE] Gio: %02d:%02d:%02d | Ngay: %02d/%02d/%04d | Nhiet do: %.2f °C\n\n",
                  hh, mm, ss, d, m, y, tC);
  } else {
    Serial.println(">> [RTC DS3231] Chua ket noi duoc DS3231 tai dia chi 0x68.\n");
  }
}

// -------------------------------------------------------------------------
// 6. ĐỌC 4 CẢM BIẾN QUANG TEMT6000 & THUẬT TOÁN BÁM SÁNG
// (Cấu trúc OpticalData đã được định nghĩa chuẩn trong config.h)

OpticalData latestOpticalData = {};

// Bộ nhớ đệm cho bộ lọc EMA (Exponential Moving Average)
static float emaTop = 0.0f;
static float emaBot = 0.0f;
static float emaLft = 0.0f;
static float emaRgt = 0.0f;
static bool  emaInitialized = false;

// Bộ nhớ đệm cửa sổ 3 mẫu cho bộ lọc trung vị (Median Filter chống xung gai đột ngột)
static uint16_t medBufTop[3] = {0, 0, 0};
static uint16_t medBufBot[3] = {0, 0, 0};
static uint16_t medBufLft[3] = {0, 0, 0};
static uint16_t medBufRgt[3] = {0, 0, 0};
static uint8_t  medIdx = 0;

inline uint16_t getMedian3(uint16_t a, uint16_t b, uint16_t c) {
  if ((a <= b && b <= c) || (c <= b && b <= a)) return b;
  if ((b <= a && a <= c) || (c <= a && a <= b)) return a;
  return c;
}

OpticalData readOpticalSensors() {
  // 1. Oversampling 64 mẫu trong đúng 20 ms (2 chu kỳ điện lưới 50Hz / chớp đèn 100Hz)
  const int SAMPLES = 64;
  uint32_t sumTop = 0, sumBot = 0, sumLft = 0, sumRgt = 0;

  for (int i = 0; i < SAMPLES; i++) {
    sumTop += analogRead(PIN_TEMT_TOP);
    sumBot += analogRead(PIN_TEMT_BOT);
    sumLft += analogRead(PIN_TEMT_LFT);
    sumRgt += analogRead(PIN_TEMT_RGT);
    delayMicroseconds(260); // Đọc 4 kênh ADC (~50us) + delay (260us) = ~310us * 64 ≈ 20 ms
  }

  uint16_t avgSampleTop = sumTop / SAMPLES;
  uint16_t avgSampleBot = sumBot / SAMPLES;
  uint16_t avgSampleLft = sumLft / SAMPLES;
  uint16_t avgSampleRgt = sumRgt / SAMPLES;

  // 2. Bộ lọc trung vị (Median Filter 3 mẫu) triệt tiêu hoàn toàn xung gai đột biến
  medBufTop[medIdx] = avgSampleTop;
  medBufBot[medIdx] = avgSampleBot;
  medBufLft[medIdx] = avgSampleLft;
  medBufRgt[medIdx] = avgSampleRgt;
  medIdx = (medIdx + 1) % 3;

  uint16_t medTop = getMedian3(medBufTop[0], medBufTop[1], medBufTop[2]);
  uint16_t medBot = getMedian3(medBufBot[0], medBufBot[1], medBufBot[2]);
  uint16_t medLft = getMedian3(medBufLft[0], medBufLft[1], medBufLft[2]);
  uint16_t medRgt = getMedian3(medBufRgt[0], medBufRgt[1], medBufRgt[2]);

  // 3. Bộ lọc số mũ EMA (Exponential Moving Average, alpha = 0.25) làm mượt phẳng tín hiệu
  if (!emaInitialized) {
    emaTop = medTop; emaBot = medBot; emaLft = medLft; emaRgt = medRgt;
    emaInitialized = true;
  } else {
    emaTop = EMA_ALPHA * medTop + (1.0f - EMA_ALPHA) * emaTop;
    emaBot = EMA_ALPHA * medBot + (1.0f - EMA_ALPHA) * emaBot;
    emaLft = EMA_ALPHA * medLft + (1.0f - EMA_ALPHA) * emaLft;
    emaRgt = EMA_ALPHA * medRgt + (1.0f - EMA_ALPHA) * emaRgt;
  }

  OpticalData data;
  data.top = (int)(emaTop + 0.5f);
  data.bot = (int)(emaBot + 0.5f);
  data.lft = (int)(emaLft + 0.5f);
  data.rgt = (int)(emaRgt + 0.5f);
  data.diffAz = data.lft - data.rgt;
  data.diffEl = data.top - data.bot;
  data.avg    = (data.top + data.bot + data.lft + data.rgt) / 4;

  // 4. Chuẩn hóa sai số quang học: (L - R)/(L + R) và (T - B)/(T + B)
  float sumAz = (float)(data.lft + data.rgt);
  float sumEl = (float)(data.top + data.bot);

  data.normDiffAz = (sumAz > 20.0f) ? ((float)data.diffAz / sumAz) : 0.0f;
  data.normDiffEl = (sumEl > 20.0f) ? ((float)data.diffEl / sumEl) : 0.0f;
  data.timestamp  = getRtcEpochUTC7();
  if (data.timestamp == 0) data.timestamp = (uint32_t)(millis() / 1000);

  latestOpticalData = data;
  return data;
}

void printOpticalSensors() {
  OpticalData opt = readOpticalSensors();
  Serial.printf(">> [TEMT6000 FILTERED] TOP: %4d | BOT: %4d | LFT: %4d | RGT: %4d | AVG: %4d\n",
                opt.top, opt.bot, opt.lft, opt.rgt, opt.avg);
  Serial.printf("   [CHUAN HOA] dAZ_norm: %+6.3f (%+5.1f%%) | dEL_norm: %+6.3f (%+5.1f%%) | Vung chet: ±%.1f%% | Nguong nhich: ±%.1f%%\n",
                opt.normDiffAz, opt.normDiffAz * 100.0f,
                opt.normDiffEl, opt.normDiffEl * 100.0f,
                OPTICAL_NORM_DEADBAND * 100.0f,
                OPTICAL_FINE_THRESHOLD * 100.0f);
  Serial.printf("   -> CHE DO BAM QUANG [O]: %s\n",
                autoOpticalTracking ? "DANG BAT (ON) - Chay lien tuc (>15%) & Nhich vi chinh (5%-15%)"
                                    : "DANG TAT (OFF) - Hay bam phim [O] tren ban phim de BAT!");
  if (opt.avg < OPTICAL_NIGHT_THRESHOLD) {
    Serial.printf("   [!] CHU Y: Do sang trung binh AVG=%d < %d (Nguong toi). Can soi den sang hon de he thong bat dau quay!\n",
                  opt.avg, OPTICAL_NIGHT_THRESHOLD);
  } else if (fabs(opt.normDiffAz) <= OPTICAL_NORM_DEADBAND && fabs(opt.normDiffEl) <= OPTICAL_NORM_DEADBAND) {
    Serial.printf("   [i] CAN BANG: Ca 2 truc deu nam trong vung chet (<= %.1f%%) -> Gian pin dang can bang hoan hao.\n",
                  OPTICAL_NORM_DEADBAND * 100.0f);
  } else {
    Serial.printf("   [+] CO LECH SANG: dAZ=%+5.1f%%, dEL=%+5.1f%% -> ",
                  opt.normDiffAz * 100.0f, opt.normDiffEl * 100.0f);
    if (fabs(opt.normDiffAz) > OPTICAL_FINE_THRESHOLD || fabs(opt.normDiffEl) > OPTICAL_FINE_THRESHOLD) {
      Serial.println("Chay LIEN TUC ca 2 dong co den khi gan deu!");
    } else {
      Serial.println("Gan deu -> Nhich vi chinh tung buoc nho!");
    }
  }
}

// -------------------------------------------------------------------------
// 6B. HÀM ĐIỀU KHIỂN VỊ TRÍ GÓC (POSITION CONTROLLER) & THIÊN VĂN HYBRID (MỤC 3, 4, 5, 6)
// -------------------------------------------------------------------------
inline float clampVal(float val, float minVal, float maxVal) {
  if (val < minVal) return minVal;
  if (val > maxVal) return maxVal;
  return val;
}

// Vòng điều khiển vị trí góc đóng vòng qua Encoder (Mục 3)
// Nhận góc mục tiêu (độ), kiểm tra vùng chết backlash (mặc định ±0.45° ~ 3 counts)
bool stepPositionControl(int axis, float targetDeg, uint32_t speedHz) {
  FastAccelStepper* s = (axis == 1) ? stepper1 : stepper2;
  if (!s) return false;

  if (speedHz == 0) {
    speedHz = (uint32_t)ParamRegistry.get("POS_STEP_SPEED_HZ", 2000.0f);
  }
  float deadbandDeg = ParamRegistry.get("POS_PID_DEADBAND_DEG", 0.45f);
  float degPerCount = getDegPerCount();
  float pulsesPerCount = getPulsesPerCount();

  if (axis == 1) {
    // Trục 1: Azimuth (Phi). Home = 0.0°, Giới hạn mềm = CFG_I_AZ_MAX_SOFT_LIMIT_DEG
    float maxLimit = CFG_I_AZ_MAX_SOFT_LIMIT_DEG;
    float safeMax = maxLimit - 0.2f;
    targetDeg = clampVal(targetDeg, 0.0f, safeMax);
    float curDeg = getAngleDeg1();
    float errDeg = targetDeg - curDeg;

    if (fabs(errDeg) <= deadbandDeg || (targetDeg >= safeMax - 0.3f && curDeg >= safeMax - deadbandDeg)) {
      if (s->isRunning()) s->stopMove();
      return true; // Đã đạt vị trí cân bằng trong dải chết hoặc đã chạm góc max an toàn
    }

    if (errDeg > 0.0f) {
      // Cần tăng góc -> Quay ra xa Home (DIR_AWAY_HOME)
      if (curDeg >= safeMax || !checkMotionAllowed(1, 1)) {
        if (s->isRunning()) s->stopMove();
        return true; // Đã chạm giới hạn mềm max, không quay tiếp và coi như cân bằng
      }
      int32_t steps = (int32_t)((errDeg / degPerCount) * pulsesPerCount);
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(steps);
      }
    } else {
      // Cần giảm góc -> Quay về phía Home (DIR_TOWARD_HOME)
      if (isHome1Triggered() || !checkMotionAllowed(1, -1)) {
        if (s->isRunning()) s->stopMove();
        return false;
      }
      int32_t steps = (int32_t)((-errDeg / degPerCount) * pulsesPerCount);
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(-steps);
      }
    }
  } else {
    // Trục 2: Elevation (Epsilon). Home = 90.0° (ngửa đỉnh trời), Giới hạn hạ = CFG_L_EL_MIN_SOFT_LIMIT_DEG (25.0°)
    float minLimit = CFG_L_EL_MIN_SOFT_LIMIT_DEG + 0.2f;
    float maxLimit = CFG_J_EL_MAX_SOFT_LIMIT_DEG - 0.2f;
    targetDeg = clampVal(targetDeg, minLimit, maxLimit);
    float curDeg = getElevationEpsilon();
    float errDeg = targetDeg - curDeg;

    if (fabs(errDeg) <= deadbandDeg ||
        (targetDeg <= minLimit + 0.3f && curDeg <= minLimit + deadbandDeg) ||
        (targetDeg >= maxLimit - 0.3f && curDeg >= maxLimit - deadbandDeg)) {
      if (s->isRunning()) s->stopMove();
      return true; // Đã đạt vị trí cân bằng trong dải chết hoặc chạm giới hạn góc
    }

    if (errDeg > 0.0f) {
      // Cần tăng góc nâng (ngửa lên) -> Quay về phía Home (DIR_TOWARD_HOME, xung âm)
      if (isHome2Triggered() || curDeg >= maxLimit || !checkMotionAllowed(2, -1)) {
        if (s->isRunning()) s->stopMove();
        return true; // Đã chạm giới hạn ngửa tối đa
      }
      int32_t steps = (int32_t)((errDeg / degPerCount) * pulsesPerCount);
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(-steps);
      }
    } else {
      // Cần giảm góc nâng (hạ thấp) -> Quay ra xa Home (DIR_AWAY_HOME, xung dương)
      if (curDeg <= minLimit || !checkMotionAllowed(2, 1)) {
        if (s->isRunning()) s->stopMove();
        return true; // Đã chạm giới hạn hạ thấp tối đa
      }
      int32_t steps = (int32_t)((-errDeg / degPerCount) * pulsesPerCount);
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(steps);
      }
    }
  }
  return true;
}

// Tính toán góc mục tiêu từ thiên văn NOAA & Hợp nhất Hybrid (Mục 4 & 5)
bool computeSolarTrackingTargets(float &targetAz, float &targetEl, float &azSun, float &elSun, float &zenithSun, float &ws, bool &isDaylight) {
  int y = 0, m = 0, d = 0, hh = 0, mm = 0, ss = 0;
  float tC = 25.0f;
  if (!readDS3231(y, m, d, hh, mm, ss, tC)) {
    return false;
  }

  double lat = (double)ParamRegistry.get("PANEL_LATITUDE", 10.7626f);
  double lon = (double)ParamRegistry.get("PANEL_LONGITUDE", 106.660f);
  double tz  = (double)ParamRegistry.get("TIMEZONE_OFFSET", 7.0f);

  solar::SolarPosition pos = solar::SolarEphemeris::calculate(y, m, d, hh, mm, ss, tz, lat, lon);
  azSun = (float)pos.azimuth_deg;
  elSun = (float)pos.elevation_deg;
  zenithSun = (float)pos.zenith_deg;
  isDaylight = pos.is_daylight;

  solar::AxisTarget outAz, outEl;
  solar::SolarGeometry::computeAxisTargets(pos, outAz, outEl, defaultDeg1);

  OpticalData opt = readOpticalSensors();
  // Tính trọng số quang ws: mây mù/tối ngắt quang ws=0; trời nắng ws=1
  if (opt.avg < OPTICAL_NIGHT_THRESHOLD) {
    ws = 0.0f;
  } else if (opt.avg >= 500) {
    ws = 1.0f;
  } else {
    ws = (float)(opt.avg - OPTICAL_NIGHT_THRESHOLD) / (500.0f - OPTICAL_NIGHT_THRESHOLD);
  }

  if (currentTrackSource == TRACK_SRC_EPHEMERIS) {
    targetAz = outAz.final_ref_deg;
    targetEl = outEl.final_ref_deg;
  } else if (currentTrackSource == TRACK_SRC_HYBRID) {
    float zSens = ParamRegistry.get("HYBRID_Z_SENSITIVITY", 15.0f);
    float z2Sat = ParamRegistry.get("HYBRID_Z2_SAT_DEG", 6.0f);

    float corrAz = clampVal(-ws * zSens * opt.normDiffAz, -z2Sat, z2Sat);
    float corrEl = clampVal(+ws * zSens * opt.normDiffEl, -z2Sat, z2Sat);

    targetAz = clampVal(outAz.final_ref_deg + corrAz, 0.0f, CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
    targetEl = clampVal(outEl.final_ref_deg + corrEl, CFG_L_EL_MIN_SOFT_LIMIT_DEG, CFG_J_EL_MAX_SOFT_LIMIT_DEG);
  } else {
    targetAz = outAz.final_ref_deg;
    targetEl = outEl.final_ref_deg;
  }
  return true;
}

// Đưa giàn pin về tư thế đỗ an toàn ban đêm / chống giông bão (Mục 6)
void parkPanels() {
  Serial.println("\n>> [PARK PANELS] Kich hoat che do do an toan ban dem / chong gio bao...");
  systemFsmState = FSM_STATE_PARK;
  currentTrackSource = TRACK_SRC_OFF;
  autoOpticalTracking = false;

  Serial.println("   -> Dang dua Elevation ve 90.0° (thien dinh) va Azimuth ve 0.0° (Home)...");
  stepPositionControl(2, 90.0f, 1500);
  stepPositionControl(1, 0.0f, 1500);

  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    FirebaseJson parkJson;
    parkJson.set("state", "PARK");
    parkJson.set("status", "PARKED");
    parkJson.set("target_az", 0.0f);
    parkJson.set("target_el", 90.0f);
    parkJson.set("source", "device");
    Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &parkJson);
  }
}

// -------------------------------------------------------------------------
// 7. IN TELEMETRY VÀ MENU
// -------------------------------------------------------------------------
const char* getStateStr(MotorState s) {
  switch (s) {
    case STATE_IDLE:               return "DUNG";
    case STATE_MANUAL_TOWARD_HOME: return "CHAY-HOME";
    case STATE_MANUAL_AWAY_HOME:   return "CHAY-XA";
    case STATE_AUTO_HOMING:        return "AUTO-HOMING";
    case STATE_AUTO_SEEK_DEFAULT:  return "SEEK-M(AUTO)";
    default:                       return "UNKNOWN";
  }
}

void printTelemetryIfChanged() {
  bool curHome1 = isHome1Triggered();
  bool curHome2 = isHome2Triggered();
  
  bool m1Running = (stateM1 != STATE_IDLE) || (stepper1 && stepper1->isRunning());
  bool m2Running = (stateM2 != STATE_IDLE) || (stepper2 && stepper2->isRunning());

  // Chỉ in khi:
  // - Trục đang chạy: theo dõi từng xung
  // - Trục đứng yên: chỉ cập nhật nếu lệch >= 2 counts (chống rung lắc 1-bit nhấp nháy 0<->1 khi trục kia chạy)
  bool enc1Changed  = m1Running ? (encoderCount1 != prevCount1) : (abs(encoderCount1 - prevCount1) >= 2);
  bool enc2Changed  = m2Running ? (encoderCount2 != prevCount2) : (abs(encoderCount2 - prevCount2) >= 2);
  bool home1Changed = (curHome1 != prevHome1);
  bool home2Changed = (curHome2 != prevHome2);
  bool stateChanged = (stateM1 != prevState1) || (stateM2 != prevState2);
  bool axisChanged  = (activeAxis != prevActiveAxis);

  bool isChanged = enc1Changed || enc2Changed || home1Changed || home2Changed || stateChanged || axisChanged;

  if (isChanged) {
    unsigned long minInterval = (m1Running || m2Running) ? 100 : 250;
    if (millis() - lastPrintTime >= minInterval) {
      lastPrintTime = millis();

      if (home1Changed) {
        Serial.println(curHome1 ? "\n>> [CTHT 1 TRIGGERED] Cong tac 1 (GPIO 18) DANG CHAM (LOW)!"
                                : "\n>> [CTHT 1 RELEASED] Cong tac 1 (GPIO 18) DA NHA (HIGH)!");
      }
      if (home2Changed) {
        Serial.println(curHome2 ? "\n>> [CTHT 2 TRIGGERED] Cong tac 2 (GPIO 21) DANG CHAM (LOW)!"
                                : "\n>> [CTHT 2 RELEASED] Cong tac 2 (GPIO 21) DA NHA (HIGH)!");
      }

      prevCount1     = encoderCount1;
      prevCount2     = encoderCount2;
      prevHome1      = curHome1;
      prevHome2      = curHome2;
      prevState1     = stateM1;
      prevState2     = stateM2;
      prevActiveAxis = activeAxis;

      float curPhi = getAngleDeg1();
      float compAz = getCompassAzimuth();
      float curEps = getElevationEpsilon();

      Serial.printf("[M1-AZ%s] Phi: %+6.2f° (La ban: %5.1f°) | Cnt: %6ld | CTHT: %-4s | Def: %+.1f° | TT: %-11s\n",
                    (activeAxis == 1) ? "*" : " ",
                    curPhi, compAz, (long)encoderCount1,
                    curHome1 ? "CHAM" : "HO",
                    hasDefault1 ? defaultDeg1 : 0.0f,
                    getStateStr(stateM1));

      Serial.printf("[M2-EL%s] Epsilon: %5.1f° (Ngua: %+5.1f°) | Cnt: %6ld | CTHT: %-4s | Def: %+.1f° | TT: %-11s\n",
                    (activeAxis == 2) ? "*" : " ",
                    curEps, getAngleDeg2(), (long)encoderCount2,
                    curHome2 ? "CHAM" : "HO",
                    hasDefault2 ? defaultDeg2 : 0.0f,
                    getStateStr(stateM2));
    }
  }
}

// -------------------------------------------------------------------------
// 8. ĐỒNG BỘ TELEMETRY LÊN FIREBASE REALTIME DATABASE (WEB DASHBOARD)
// -------------------------------------------------------------------------
void pushTelemetryToFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!Firebase.ready()) return;

  OpticalData opt = latestOpticalData;
  if (opt.avg == 0) {
    opt = readOpticalSensors();
  }

  float curPhi = getAngleDeg1();
  float curEpsilon = getElevationEpsilon();
  float compassAz = getCompassAzimuth();

  FirebaseJson trk;
  trk.set("phi", curPhi);
  trk.set("epsilon", curEpsilon);
  trk.set("azimuthAngle", compassAz);
  trk.set("elevationAngle", curEpsilon);
  trk.set("azEncoder", encoderCount1);
  trk.set("elEncoder", encoderCount2);
  trk.set("encoderPulses", encoderCount1);

  trk.set("ldrTop", opt.top);
  trk.set("ldrBottom", opt.bot);
  trk.set("ldrLeft", opt.lft);
  trk.set("ldrRight", opt.rgt);
  trk.set("normDiffAz", opt.normDiffAz);
  trk.set("normDiffEl", opt.normDiffEl);

  bool h1 = isHome1Triggered();
  bool h2 = isHome2Triggered();
  trk.set("limitHome", h1);
  trk.set("limitHome2", h2);

  // Trạng thái vận hành thực tế (A6, Mục 8: Chỉ hiện MOVE khi Encoder xác nhận có chuyển động)
  bool m1MotorRunning = (stepper1 && stepper1->isRunning());
  bool m2MotorRunning = (stepper2 && stepper2->isRunning());
  bool encActuallyMoved = (abs(encoderCount1 - prevCount1) > 0 || abs(encoderCount2 - prevCount2) > 0);
  bool isMoving = (m1MotorRunning || m2MotorRunning) && encActuallyMoved;
  trk.set("mode", (currentTrackSource != TRACK_SRC_OFF) ? "AUTO" : "MANUAL");
  
  const char* stStr = "IDLE";
  if (stateM1 == STATE_AUTO_HOMING || stateM2 == STATE_AUTO_HOMING) {
    stStr = "HOMING";
  } else if (stateM1 == STATE_AUTO_SEEK_DEFAULT || stateM2 == STATE_AUTO_SEEK_DEFAULT) {
    stStr = "SEEK_DEFAULT";
  } else if (systemFsmState == FSM_STATE_PARK) {
    stStr = "PARK";
  } else if (systemFsmState == FSM_STATE_PREP_SLEEP || systemFsmState == FSM_STATE_LIGHT_SLEEP) {
    stStr = "SLEEP";
  } else if (isMaxAzimuthReached) {
    stStr = "MAX_HOLD";
  } else if (trackCyclePhase == TRACK_CYCLE_HOLD) {
    stStr = "HOLD_15M";
  } else if (isMoving) {
    stStr = "MOVING";
  } else if (currentTrackSource != TRACK_SRC_OFF) {
    stStr = "TRACKING";
  }
  trk.set("state", stStr);
  trk.set("status", isMoving ? "MOVE" : ((currentTrackSource != TRACK_SRC_OFF) ? "TRACKING_ACTIVE" : "STABLE"));
  
  // Nguồn thuật toán bám (Mục 4 & 5): EPHEMERIS_ONLY, SENSOR_ONLY, HYBRID, NONE
  const char* algStr = (currentTrackSource == TRACK_SRC_EPHEMERIS) ? "EPHEMERIS_ONLY" :
                       (currentTrackSource == TRACK_SRC_SENSOR)    ? "SENSOR_ONLY" :
                       (currentTrackSource == TRACK_SRC_HYBRID)    ? "HYBRID" : "NONE";
  trk.set("activeAlgorithm", algStr);
  
  // Timestamp là Unix epoch UTC+7 từ RTC DS3231 (A5: bỏ millis())
  uint32_t epochNow = getRtcEpochUTC7();
  double nowMs = (epochNow > 0) ? ((double)epochNow * 1000.0) : (double)(1730550000000.0 + millis());
  if (epochNow > 0) {
    trk.set("data_ts", (double)epochNow);
  }
  trk.set("lastUpdate", nowMs);
  trk.set("rtc_timestamp", nowMs);
  trk.set("server_time/.sv", "timestamp");
  trk.set("tz", "UTC+7");
  trk.set("online", true);
  trk.set("source", "device"); // Cờ bảo mật xác nhận dữ liệu từ thiết bị thật

  // Dữ liệu dòng, áp, công suất, năng lượng lấy từ bộ cập nhật độc lập (A4)
  trk.set("voltage", voltTrkLive);
  trk.set("current", currTrkLive);
  trk.set("power", pwrTrkLive);
  trk.set("dailyEnergyWh", (float)energyWhTracker);

  // Đọc RTC an toàn qua Mutex
  int y, m, d, hh, mm, ss;
  float tC = 0.0f;
  if (readDS3231(y, m, d, hh, mm, ss, tC)) {
    char timeStr[32];
    snprintf(timeStr, sizeof(timeStr), "%02d:%02d:%02d %02d/%02d/%04d", hh, mm, ss, d, m, y);
    trk.set("rtcTime", timeStr);
    trk.set("rtcTemp", tC);
  }

  // 1. Đẩy Telemetry Tấm Tracker lên /solar/tracking
  Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &trk);

  // 2. Đẩy Telemetry Tấm Cố Định lên /solar/static (A12: đọc từ ParamRegistry)
  FirebaseJson sta;
  sta.set("voltage", voltStaLive);
  sta.set("current", currStaLive);
  sta.set("power", pwrStaLive);
  sta.set("dailyEnergyWh", (float)energyWhStatic);
  
  float fixedAz = ParamRegistry.get("FIXED_AZ_DEG", 180.0f);
  float fixedTilt = ParamRegistry.get("FIXED_TILT_DEG", 15.0f);
  float fixedElev = 90.0f - fixedTilt;
  sta.set("fixed_az_deg", fixedAz);
  sta.set("fixed_tilt_beta_deg", fixedTilt);
  sta.set("fixed_elevation_eps", fixedElev);

  if (epochNow > 0) {
    sta.set("data_ts", (double)epochNow);
  }
  sta.set("lastUpdate", nowMs);
  sta.set("rtc_timestamp", nowMs);
  sta.set("server_time/.sv", "timestamp");
  sta.set("tz", "UTC+7");
  sta.set("online", true);
  sta.set("source", "device");
  Firebase.RTDB.updateNode(&fbdo, "/solar/static", &sta);
}

// -------------------------------------------------------------------------
// 9. FREE-RTOS TASK: CHẠY ĐỘC LẬP TRÊN CORE 0 (SERIAL TELEMETRY + FIREBASE + OFFLINE QUEUE)
// -------------------------------------------------------------------------
void telemetryTask(void *pvParameters) {
  unsigned long lastFbPushTime = 0;
  unsigned long lastTelPrintTime = 0;
  unsigned long lastEnergyUpdateTime = 0;
  unsigned long lastOptSampleTime = 0;
  unsigned long lastQueueDrainTime = 0;

  for (;;) {
    unsigned long now = millis();

    // 1. Cập nhật đo dòng, áp, công suất và tích phân năng lượng độc lập mỗi 1000ms (A4)
    if (now - lastEnergyUpdateTime >= 1000) {
      lastEnergyUpdateTime = now;
      updateEnergyAndPower();
    }

    // 2. Lấy mẫu cảm biến quang TEMT6000 định kỳ non-blocking mỗi 100ms (A13)
    if (now - lastOptSampleTime >= 100) {
      lastOptSampleTime = now;
      readOpticalSensors();
    }

    // 3. In Telemetry qua Serial Monitor (Core 0 chịu trách nhiệm, không bao giờ chặn Core 1)
    if (telemetryDirty || (now - lastTelPrintTime >= 100)) {
      telemetryDirty = false;
      lastTelPrintTime = now;
      printTelemetryIfChanged();
    }

    // 4. Đẩy Telemetry lên Firebase RTDB đều đặn 1s/lần cho Dashboard luôn LIVE (Mục 9)
    unsigned long fbPushInterval = 1000;
    if (now - lastFbPushTime >= fbPushInterval) {
      lastFbPushTime = now;
      pushTelemetryToFirebase();
    }

    // 5. Xả hàng đợi LittleFS Offline khi có kết nối Firebase (Mục 2 & Mục 9)
    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
      if (OfflineQueue.getPendingCount() > 0 && (now - lastQueueDrainTime >= 200)) {
        lastQueueDrainTime = now;
        MinuteRecord pendingRec;
        if (OfflineQueue.peekRecord(pendingRec)) {
          char histPath[64];
          snprintf(histPath, sizeof(histPath), "/solar/history/%lu", (unsigned long)pendingRec.epoch_ts);
          FirebaseJson hJson;
          hJson.set("epoch_ts", (double)pendingRec.epoch_ts);
          hJson.set("wh_trk", pendingRec.delta_wh_trk);
          hJson.set("wh_sta", pendingRec.delta_wh_sta);
          hJson.set("v_trk", pendingRec.v_avg_trk);
          hJson.set("i_trk", pendingRec.i_avg_trk);
          hJson.set("p_trk", pendingRec.p_avg_trk);
          hJson.set("p_peak_trk", pendingRec.p_peak_trk);
          hJson.set("v_sta", pendingRec.v_avg_sta);
          hJson.set("i_sta", pendingRec.i_avg_sta);
          hJson.set("p_sta", pendingRec.p_avg_sta);
          hJson.set("p_peak_sta", pendingRec.p_peak_sta);
          hJson.set("rtc_temp", pendingRec.rtc_temp);
          hJson.set("fsm_state", (int)pendingRec.fsm_state);
          hJson.set("sys_mode", (int)pendingRec.sys_mode);
          hJson.set("flags", (int)pendingRec.flags);
          hJson.set("source", "device");
          hJson.set("backfill", true);
          if (Firebase.RTDB.updateNode(&fbdo, histPath, &hJson)) {
            OfflineQueue.popRecord();
            Serial.printf(">> [OFFLINE QUEUE] Day bu thanh cong ban ghi %lu len Firebase | Con lai trong Queue: %u\n",
                          (unsigned long)pendingRec.epoch_ts, (unsigned int)OfflineQueue.getPendingCount());
          }
        }
      }
    }

    vTaskDelay(pdMS_TO_TICKS(20)); // Nhường CPU 20ms cho WiFi / TCP-IP stack trên Core 0
  }
}

void printMenu() {
  Serial.println("=======================================================");
  Serial.println("  HE THONG TEST ESP32-S3: 2 TRUC NEMA 23 + RTC + OPTICAL");
  Serial.println("=======================================================");
  Serial.printf(" >> TRUC DANG CHON DIEU KHIEN: TRUC [%d] (%s)\n",
                activeAxis, (activeAxis == 1) ? "AZIMUTH - GOC QUAY" : "ELEVATION - DO NGUA");
  Serial.println("-------------------------------------------------------");
  Serial.println(" [1] : Chuyen sang dieu khien TRUC 1 (Azimuth - Xoay Ngang)");
  Serial.println(" [2] : Chuyen sang dieu khien TRUC 2 (Elevation - Do Ngua)");
  Serial.println("-------------------------------------------------------");
  Serial.println(" PHIM DIEU KHIEN CHUYEN DONG (CHO TRUC DANG CHON):");
  Serial.println("   [A] : Quay buoc ve huong HOME (Cham Home tu dung)");
  Serial.println("   [D] : Quay buoc ra xa HOME");
  Serial.println("   [Q] : Quay LIEN TUC ve huong HOME (Cham Home tu dung)");
  Serial.println("   [E] : Quay LIEN TUC ra xa HOME");
  Serial.println("   [M] : GHI DE GOC HIEN TAI LAM MOC MAC DINH (Luu Flash NVS)");
  Serial.println("   [G] : AUTO FAST HOMING CHO TRUC DANG CHON (Home -> Moc mac dinh)");
  Serial.println("   [0] : Reset truc tiep goc hien tai ve 0.0°");
  Serial.println("   [I] : Dao chieu dem Encoder (+/-)");
  Serial.println("-------------------------------------------------------");
  Serial.println(" PHIM NONG DUAL, CHAN DOAN & TIN HIEU:");
  Serial.println("   [H]       : DUAL AUTO HOMING: CA 2 TRUC VE HOME ROI VE MAC DINH");
  Serial.println("   [Z]       : TEST LIGHT SLEEP: NGU 2 PHUT ROI HEN GIO DS3231 WAKEUP");
  Serial.println("   [V]       : BAT / TAT LIVE ENCODER MONITOR (Hien thi tung xung khi xoay tay)");
  Serial.println("   [T]       : DIAGNOSTIC (Kiem tra muc dien ap logic tat ca cac chan & ngat)");
  Serial.println("   [K]       : BAT / TAT STREAM MUC LOGIC THO & DEM CANH PHA A/B (200ms)");
  Serial.println("   [O]       : BAT / TAT CHE DO TU DONG BAM HUONG ANH SANG (OPTICAL)");
  Serial.println("   [L]       : DOC GIA TRI 4 CAM BIEN QUANG TEMT6000 (LIVE ADC)");
  Serial.println("   [C]       : DOC DONG HO THOI GIAN THUC RTC DS3231 & QUET I2C");
  Serial.println("   [+] / [-] : Tang / Giam so buoc moi lan bam A/D (+/- 100 buoc)");
  Serial.println("   [>] / [<] : Tang / Giam toc do chay tay ([.] / [,])");
  Serial.println("   []] / [[] : Tang / Giam toc do Auto Homing (Delay us)");
  Serial.println("   [Space]/[X]: DUNG KHAN CAP TOAN BO DONG CO");
  Serial.println("   [R]       : HIEN THI LAI MENU NAY");
  Serial.println("-------------------------------------------------------");
  Serial.println(" VAN HANH BAM MAT TROI & DIEU KHIEN GOC (MUC 3, 4, 5, 6, 7):");
  Serial.println("   noaa                   : Tinh & in goc mat troi thien van NOAA + Thoi gian RTC");
  Serial.println("   track <mode>           : Chon nguon bam: 'noaa' | 'sensor' | 'hybrid' | 'off'");
  Serial.println("   step <truc> <delta_deg>: Nhay bac tuong doi (Vi du: step 1 5 hoac step 2 -10)");
  Serial.println("   goto <truc> <goc_deg>  : Quay den goc tuyet doi (Vi du: goto 1 45.0)");
  Serial.println("   park                   : Dua gian pin ve the do an toan (Az=0.0°, El=90.0°)");
  Serial.println("   sleep <phut>           : Ngu tiet kiem Light Sleep, danh thuc boi RTC Alarm 1");
  Serial.println("-------------------------------------------------------");
  Serial.println(" LENH BENCHMARK & HIEU CHUAN (PARAM REGISTRY & FLASH NVS):");
  Serial.println("   params                 : In toan bo bang 38 tham so he thong");
  Serial.println("   set <TEN> <GIATRI>     : Cap nhat thu cong tham so (Kiem tra min/max)");
  Serial.println("   rollback <TEN>         : Khoi phuc gia tri truoc do cua tham so");
  Serial.println("   calib save             : Luu bang tham so vao Flash NVS (kem CRC32)");
  Serial.println("   calib load             : Nap lai bang tham so tu Flash NVS");
  Serial.println("   calib reset            : Xoa trang NVS, ve tham so mac dinh");
  Serial.println("   calib export / export  : Xuat JSON cau hinh (Chuan Firebase)");
  Serial.println("-------------------------------------------------------");
  Serial.println(" QUY TRINH KIEM CHUAN BENCH WIZARD & KHOA AN TOAN (GATING):");
  Serial.println("   bench                  : Hien thi bang trang thai 16 buoc kiem chuan B0-B15");
  Serial.println("   bench all              : Chay toan bo quy trinh tu B0 den B15");
  Serial.println("   bench <N>              : Chay buoc kiem chuan cu the (Vi du: bench 2)");
  Serial.println("   y / n                  : Dong y (Y) hoac Bo qua (N) cap nhat tham so");
  Serial.println("   arm                    : Kich hoat van hanh (Yeu cau pass cac buoc Critical)");
  Serial.println("   disarm                 : Khoa an toan, dung toan bo dong co");
  Serial.println("   mode op / mode bench   : Chuyen doi che do Van hanh / Kiem chuan");
  Serial.println("   status                 : Kiem tra dieu kien Gating & trang thai he thong");
  Serial.println("=======================================================");
  Serial.printf(" M1 DANG LUU FLASH : %+.2f do (%ld counts) | GIOI HAN: 0.0° -> %+.1f°\n", defaultDeg1, (long)defaultCount1, CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
  Serial.printf(" M2 DANG LUU FLASH : %+.2f do (%ld counts) | GIOI HAN: %+.1f° -> %+.1f°\n", defaultDeg2, (long)defaultCount2, CFG_L_EL_MIN_SOFT_LIMIT_DEG, CFG_J_EL_MAX_SOFT_LIMIT_DEG);
  Serial.printf(" VI TRI ENCODER    : %s\n",
                (encoderLocation == ENCODER_ON_LOAD) ? "O TAI / TRUC TAM (0.15°/count, 32 xung/count - KHONG CHIA 3)" :
                (encoderLocation == ENCODER_ON_MOTOR) ? "O TRUC MOTOR (0.05°/count, 10.67 xung/count - CO CHIA 3)" :
                "CHUA XAC NHAN (UNKNOWN - Tam tinh 0.15°/count, hay chay Bench B2!)");
  Serial.printf(" TOC DO AUTO [G, H]: %lu Hz | TOC DO TAY: %lu Hz | GIA TOC: %lu | BUOC: %d\n",
                (unsigned long)autoSpeedHz, (unsigned long)manualSpeedHz, (unsigned long)stepperAccel, stepsPerPress);
  Serial.println("=======================================================\n");
}

// -------------------------------------------------------------------------
// 8. HÀM PHÁT XUNG BƯỚC KHÔNG CHẶN QUA FASTACCELSTEPPER (CÓ RAMP GIA TỐC)
// -------------------------------------------------------------------------
bool moveMotorSteps(int axis, bool direction, int32_t steps, uint32_t speedHz = 0) {
  FastAccelStepper* s = (axis == 1) ? stepper1 : stepper2;
  if (!s) return false;

  int dir = (direction == DIR_AWAY_HOME) ? 1 : -1;
  if (!checkMotionAllowed(axis, dir)) {
    Serial.printf(">> [KHOA TRUC %d] Chieu quay %s bi khoa boi gioi han mem hoac cong tac Home!\n",
                  axis, (dir < 0) ? "ve Home" : "ra xa Home");
    return false;
  }

  if (speedHz == 0) speedHz = manualSpeedHz;
  s->setSpeedInHz(speedHz);
  s->setAcceleration(stepperAccel);

  int32_t delta = (direction == DIR_AWAY_HOME) ? steps : -steps;
  s->move(delta); // Non-blocking: phần cứng RMT/MCPWM tự phát xung, CPU không bị chặn!
  requestTelemetryPrint();
  return true;
}

// -------------------------------------------------------------------------
// 9. SINGLE AUTO HOMING CHO 1 TRỤC [G] (2 TỐC ĐỘ: NHANH + RÀ CHẬM + LÙI ĐỘNG A9)
// -------------------------------------------------------------------------
void runSingleAutoHoming(int axis) {
  FastAccelStepper* s = (axis == 1) ? stepper1 : stepper2;
  if (!s) return;

  const char* axisName = (axis == 1) ? "Truc 1 (Azimuth)" : "Truc 2 (Elevation)";
  float targetDeg = (axis == 1) ? defaultDeg1 : defaultDeg2;
  int32_t targetCount = (axis == 1) ? defaultCount1 : defaultCount2;

  Serial.println("\n=======================================================");
  Serial.printf(">> [KICH HOAT SINGLE AUTO HOMING (G)] - %s\n", axisName);
  Serial.printf("   Muc tieu ve default: %+.2f do giang pin (%ld counts)\n", targetDeg, (long)targetCount);
  Serial.println("   Chu trinh Homing 2 toc do: [1] Chay nhanh -> [2] Lui dong nha switch (+100 buoc) -> [3] Ra cham -> [4] Ve Default");
  Serial.println("   (Bam [Space] hoac [X] de dung khan cap)");
  Serial.println("=======================================================");

  if (axis == 1) stateM1 = STATE_AUTO_HOMING;
  else           stateM2 = STATE_AUTO_HOMING;

  auto checkCancel = [&]() -> bool {
    esp_task_wdt_reset();
    updateHardwareEncoders();
    if (Serial.available() > 0) {
      char c = Serial.read();
      if (c == ' ' || c == 'x' || c == 'X') {
        s->stopMove();
        stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
        Serial.println("\n>> [STOP] Da dung khan cap Single Homing!");
        requestTelemetryPrint();
        return true;
      }
    }
    return false;
  };

  auto isTriggered = [&]() -> bool {
    return (axis == 1) ? isHome1Triggered() : isHome2Triggered();
  };

  uint32_t tStart = millis();

  // BƯỚC 1: NẾU ĐANG CHẠM HOME TỪ TRƯỚC -> LÙI ĐỘNG RA XA (A9)
  if (isTriggered()) {
    Serial.println(">> [BUOC 0] Dang cham switch san -> Dang lui dong ra xa de nha switch...");
    s->setSpeedInHz(manualSpeedHz);
    s->setAcceleration(stepperAccel);
    s->runForward();
    uint32_t tRetract0 = millis();
    while (isTriggered()) {
      if (checkCancel()) return;
      if (millis() - tRetract0 > 10000) {
        s->stopMove();
        stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
        Serial.println("\n>> [LOI AN TOAN] Switch bi ket dinh (Stuck LOW)! Timeout lui nha cong tac.");
        requestTelemetryPrint();
        return;
      }
      delay(2);
    }
    s->stopMove();
    delay(50);
    s->move(100);
    while (s->isRunning()) { if (checkCancel()) return; delay(2); }
    delay(100);
  }

  // BƯỚC 2: TIẾP CẬN NHANH (FAST APPROACH)
  Serial.println(">> [BUOC 1] Dang chay nhanh tiep can Home (Fast Approach)...");
  s->setSpeedInHz(HOME_FAST_SPEED_HZ);
  s->setAcceleration(stepperAccel);
  s->runBackward();

  while (!isTriggered()) {
    if (checkCancel()) return;
    if (millis() - tStart > 35000) {
      s->stopMove();
      stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
      Serial.println("\n>> [CANH BAO AN TOAN] Timeout 35s! Da dung.");
      requestTelemetryPrint();
      return;
    }
    delay(1);
  }

  s->forceStopAndNewPosition(0);
  Serial.println(">> [BUOC 1 OK] Da cham switch lan 1! Dung ngay lap tuc.");
  delay(150);

  // BƯỚC 3: LÙI ĐỘNG RA XA ĐỂ NHẢ SWITCH (DYNAMIC RETRACT + 100 SAFETY STEPS) (A9)
  Serial.println(">> [BUOC 2] Dang lui dong ra xa cho den khi switch nha hoan toan + 100 buoc...");
  s->setSpeedInHz(manualSpeedHz);
  s->setAcceleration(stepperAccel);
  s->runForward();
  uint32_t tRetract = millis();
  while (isTriggered()) {
    if (checkCancel()) return;
    if (millis() - tRetract > 10000) {
      s->stopMove();
      stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
      Serial.println("\n>> [LOI AN TOAN] Switch bi ket dinh (Stuck LOW)! Timeout lui nha cong tac.");
      requestTelemetryPrint();
      return;
    }
    delay(2);
  }
  s->stopMove();
  delay(50);
  s->move(100); // Biên an toàn 100 bước
  while (s->isRunning()) {
    if (checkCancel()) return;
    delay(2);
  }
  delay(150);

  // BƯỚC 4: RÀ CHẬM TIẾP XÚC CHÍNH XÁC (SLOW CREEP, SAI SỐ <= 1 BƯỚC)
  Serial.println(">> [BUOC 3] Dang ra cham tiep xuc chinh xac (Slow Creep 200 Hz)...");
  s->setSpeedInHz(HOME_CREEP_SPEED_HZ);
  s->setAcceleration(stepperAccel);
  s->runBackward();

  uint32_t tCreepStart = millis();
  while (!isTriggered()) {
    if (checkCancel()) return;
    if (millis() - tCreepStart > 10000) {
      s->stopMove();
      stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
      Serial.println("\n>> [CANH BAO AN TOAN] Timeout 10s o pha ra cham! Da dung.");
      requestTelemetryPrint();
      return;
    }
    delay(1);
  }

  s->forceStopAndNewPosition(0);

  // Đo độ lặp lại cơ học Homing (A9: repeatability metric)
  int32_t touchCnt = (axis == 1) ? getEncoderCount1() : getEncoderCount2();
  int32_t prevTouch = (axis == 1) ? lastHomeTouchCount1 : lastHomeTouchCount2;
  int32_t diffRepeat = touchCnt - prevTouch;
  if (axis == 1) lastHomeTouchCount1 = touchCnt;
  else           lastHomeTouchCount2 = touchCnt;
  Serial.printf(">> [DO LAP LAI CO HOC - REPEATABILITY] %s Touch Cnt: %ld (Delta: %+ld counts | %+.3f°)\n",
                axisName, (long)touchCnt, (long)diffRepeat, (float)diffRepeat * getDegPerCount());

  if (axis == 1) resetEncoder1(0); else resetEncoder2(0);
  systemHomed = true;
  Serial.printf(">> [BUOC 3 OK] %s DA CHOT MOC HOME 0.0° CHINH XAC TUYET DOI!\n", axisName);
  requestTelemetryPrint();
  delay(250);

  // BƯỚC 5: QUAY VỀ MỐC MẶC ĐỊNH (SEEK DEFAULT)
  Serial.println(">> [BUOC 4] Dang quay ve vi tri mac dinh da luu...");
  if (axis == 1) stateM1 = STATE_AUTO_SEEK_DEFAULT;
  else           stateM2 = STATE_AUTO_SEEK_DEFAULT;

  s->setSpeedInHz(autoSpeedHz);
  s->setAcceleration(stepperAccel);
  s->runForward();

  bool reached = false;
  uint32_t p2Start = millis();

  while (!reached) {
    if (checkCancel()) return;

    int32_t curCnt = (axis == 1) ? getEncoderCount1() : getEncoderCount2();
    reached = (targetCount >= 0) ? (curCnt >= targetCount) : (curCnt <= targetCount);

    if (reached) {
      s->stopMove();
      Serial.printf(">> [%s VE DICH] Dat: %+.2f do gian pin (%ld counts)\n", axisName, (axis == 1) ? getAngleDeg1() : getAngleDeg2(), (long)curCnt);
      break;
    }

    // Khi cách đích < 50 counts, giảm tốc mượt mà
    if (abs(targetCount - curCnt) < 50) {
      s->setSpeedInHz(autoSpeedHz / 2);
      s->applySpeedAcceleration();
    }

    if (millis() - p2Start > 35000) {
      s->stopMove();
      stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
      Serial.println("\n>> [CANH BAO AN TOAN] Timeout 35s Seek Default! Da dung.");
      requestTelemetryPrint();
      return;
    }
    delay(2);
  }

  while (s->isRunning()) {
    esp_task_wdt_reset();
    updateHardwareEncoders();
    delay(2);
  }

  stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
  Serial.printf("\n>> [HOAN TAT] %s da hoan tat Homing 2 toc do va ve vi tri mac dinh!\n\n", axisName);
  requestTelemetryPrint();
}

// -------------------------------------------------------------------------
// 10. DUAL AUTO HOMING: CẢ 2 TRỤC VỀ HOME RỒI VỀ MẶC ĐỊNH [H] (2 TỐC ĐỘ ĐỒNG THỜI + LÙI ĐỘNG A9)
// -------------------------------------------------------------------------
void runDualAutoHoming() {
  if (!stepper1 || !stepper2) return;

  Serial.println("\n=======================================================");
  Serial.println(">> [KICH HOAT DUAL AUTO HOMING CUNG LUC CHO CA 2 TRUC (H)]");
  Serial.printf("   Truc 1 (Azimuth)  : Home -> Muc tieu: %+.2f do (%ld counts)\n", defaultDeg1, (long)defaultCount1);
  Serial.printf("   Truc 2 (Elevation): Home -> Muc tieu: %+.2f do (%ld counts)\n", defaultDeg2, (long)defaultCount2);
  Serial.println("   Chu trinh Homing 2 toc do DONG THOI: [1] Chay nhanh -> [2] Lui dong nha switch (+100 buoc) -> [3] Ra cham -> [4] Ve Default");
  Serial.println("   (Bam [Space] hoac [X] de dung khan cap)");
  Serial.println("=======================================================");

  stateM1 = STATE_AUTO_HOMING;
  stateM2 = STATE_AUTO_HOMING;

  enum AxisHomeStage {
    STAGE_FAST,
    STAGE_RETRACT_SEEK_RELEASE,
    STAGE_RETRACT_SAFETY,
    STAGE_CREEP,
    STAGE_DONE
  };

  AxisHomeStage stage1 = STAGE_FAST;
  AxisHomeStage stage2 = STAGE_FAST;
  uint32_t tRetract1 = 0;
  uint32_t tRetract2 = 0;

  auto checkCancel = [&]() -> bool {
    esp_task_wdt_reset();
    updateHardwareEncoders();
    if (Serial.available() > 0) {
      char c = Serial.read();
      if (c == ' ' || c == 'x' || c == 'X') {
        stepper1->stopMove();
        stepper2->stopMove();
        stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
        Serial.println("\n>> [STOP] Da dung khan cap Dual Homing!");
        requestTelemetryPrint();
        return true;
      }
    }
    return false;
  };

  // Khởi động giai đoạn cho từng trục (A9)
  if (isHome1Triggered()) {
    stepper1->setSpeedInHz(manualSpeedHz);
    stepper1->setAcceleration(stepperAccel);
    stepper1->runForward();
    tRetract1 = millis();
    stage1 = STAGE_RETRACT_SEEK_RELEASE;
    Serial.println(">> [M1] Dang cham switch san -> Dang lui dong ra xa de nha...");
  } else {
    stepper1->setSpeedInHz(HOME_FAST_SPEED_HZ);
    stepper1->setAcceleration(stepperAccel);
    stepper1->runBackward();
    stage1 = STAGE_FAST;
  }

  delay(50); // Giãn cách 50ms chống sụt áp nguồn inrush khi khởi động 2 động cơ cùng lúc

  if (isHome2Triggered()) {
    stepper2->setSpeedInHz(manualSpeedHz);
    stepper2->setAcceleration(stepperAccel);
    stepper2->runForward();
    tRetract2 = millis();
    stage2 = STAGE_RETRACT_SEEK_RELEASE;
    Serial.println(">> [M2] Dang cham switch san -> Dang lui dong ra xa de nha...");
  } else {
    stepper2->setSpeedInHz(HOME_FAST_SPEED_HZ);
    stepper2->setAcceleration(stepperAccel);
    stepper2->runBackward();
    stage2 = STAGE_FAST;
  }

  uint32_t p1Start = millis();

  // VÒNG LẶP HOMING 2 TỐC ĐỘ ĐỒNG THỜI CHO CẢ 2 TRỤC
  while (stage1 != STAGE_DONE || stage2 != STAGE_DONE) {
    if (checkCancel()) return;

    if (millis() - p1Start > 45000) {
      stepper1->stopMove();
      stepper2->stopMove();
      stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
      Serial.println("\n>> [CANH BAO AN TOAN] Timeout 45s Dual Homing! Da dung.");
      requestTelemetryPrint();
      return;
    }

    // Xử lý trục 1
    switch (stage1) {
      case STAGE_FAST:
        if (isHome1Triggered()) {
          stepper1->forceStopAndNewPosition(0);
          Serial.println(">> [M1 FAST OK] Da cham switch 1 lan dau! Dang lui dong ra xa...");
          stepper1->setSpeedInHz(manualSpeedHz);
          stepper1->setAcceleration(stepperAccel);
          stepper1->runForward();
          tRetract1 = millis();
          stage1 = STAGE_RETRACT_SEEK_RELEASE;
        }
        break;

      case STAGE_RETRACT_SEEK_RELEASE:
        if (!isHome1Triggered()) {
          // Switch đã nhả -> Dừng và phát thêm 100 bước an toàn
          stepper1->stopMove();
          stepper1->move(100);
          stage1 = STAGE_RETRACT_SAFETY;
        } else if (millis() - tRetract1 > 10000) {
          stepper1->stopMove(); stepper2->stopMove();
          stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
          Serial.println("\n>> [LOI AN TOAN M1] Switch 1 bi ket dinh (Stuck LOW)! Da dung.");
          requestTelemetryPrint();
          return;
        }
        break;

      case STAGE_RETRACT_SAFETY:
        if (!stepper1->isRunning()) {
          Serial.println(">> [M1 CREEP] Dang ra cham switch 1 voi toc do 200 Hz...");
          stepper1->setSpeedInHz(HOME_CREEP_SPEED_HZ);
          stepper1->setAcceleration(stepperAccel);
          stepper1->runBackward();
          stage1 = STAGE_CREEP;
        }
        break;

      case STAGE_CREEP:
        if (isHome1Triggered()) {
          stepper1->forceStopAndNewPosition(0);
          int32_t touchCnt1 = getEncoderCount1();
          int32_t diff1 = touchCnt1 - lastHomeTouchCount1;
          lastHomeTouchCount1 = touchCnt1;
          Serial.printf(">> [DO LAP LAI CO HOC M1] Touch Cnt: %ld (Delta: %+ld counts | %+.3f°)\n",
                        (long)touchCnt1, (long)diff1, (float)diff1 * getDegPerCount());
          resetEncoder1(0);
          stage1 = STAGE_DONE;
          Serial.println(">> [M1 DUAL 2-STAGE OK] Truc 1 da chot Home 0.0° chinh xac!");
          requestTelemetryPrint();
        }
        break;

      case STAGE_DONE:
      default:
        break;
    }

    // Xử lý trục 2
    switch (stage2) {
      case STAGE_FAST:
        if (isHome2Triggered()) {
          stepper2->forceStopAndNewPosition(0);
          Serial.println(">> [M2 FAST OK] Da cham switch 2 lan dau! Dang lui dong ra xa...");
          stepper2->setSpeedInHz(manualSpeedHz);
          stepper2->setAcceleration(stepperAccel);
          stepper2->runForward();
          tRetract2 = millis();
          stage2 = STAGE_RETRACT_SEEK_RELEASE;
        }
        break;

      case STAGE_RETRACT_SEEK_RELEASE:
        if (!isHome2Triggered()) {
          // Switch đã nhả -> Dừng và phát thêm 100 bước an toàn
          stepper2->stopMove();
          stepper2->move(100);
          stage2 = STAGE_RETRACT_SAFETY;
        } else if (millis() - tRetract2 > 10000) {
          stepper1->stopMove(); stepper2->stopMove();
          stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
          Serial.println("\n>> [LOI AN TOAN M2] Switch 2 bi ket dinh (Stuck LOW)! Da dung.");
          requestTelemetryPrint();
          return;
        }
        break;

      case STAGE_RETRACT_SAFETY:
        if (!stepper2->isRunning()) {
          Serial.println(">> [M2 CREEP] Dang ra cham switch 2 voi toc do 200 Hz...");
          stepper2->setSpeedInHz(HOME_CREEP_SPEED_HZ);
          stepper2->setAcceleration(stepperAccel);
          stepper2->runBackward();
          stage2 = STAGE_CREEP;
        }
        break;

      case STAGE_CREEP:
        if (isHome2Triggered()) {
          stepper2->forceStopAndNewPosition(0);
          int32_t touchCnt2 = getEncoderCount2();
          int32_t diff2 = touchCnt2 - lastHomeTouchCount2;
          lastHomeTouchCount2 = touchCnt2;
          Serial.printf(">> [DO LAP LAI CO HOC M2] Touch Cnt: %ld (Delta: %+ld counts | %+.3f°)\n",
                        (long)touchCnt2, (long)diff2, (float)diff2 * getDegPerCount());
          resetEncoder2(0);
          stage2 = STAGE_DONE;
          Serial.println(">> [M2 DUAL 2-STAGE OK] Truc 2 da chot Home 0.0° chinh xac!");
          requestTelemetryPrint();
        }
        break;

      case STAGE_DONE:
      default:
        break;
    }

    delay(1);
  }

  Serial.println("\n>> [PHA 1 HOAN TAT 100%] Ca 2 truc da chot diem Home 0.0° voi do chinh xac tuyet doi!");
  Serial.println(">> Nghi 0.25s triet tieu quan tinh truoc khi sang Pha 2...");
  delay(250);

  // PHA 2: CHẠY ĐỒNG THỜI VỀ VỊ TRÍ MẶC ĐỊNH M1 VÀ M2
  Serial.println(">> Pha 2: Ca 2 truc dang DONG THOI quay ve vi tri mac dinh (FastAccelStepper)...");
  stateM1 = STATE_AUTO_SEEK_DEFAULT;
  stateM2 = STATE_AUTO_SEEK_DEFAULT;

  stepper1->setSpeedInHz(autoSpeedHz);
  stepper1->setAcceleration(stepperAccel);
  stepper1->runForward();

  delay(50); // Giãn cách 50ms chống sụt áp nguồn inrush

  stepper2->setSpeedInHz(autoSpeedHz);
  stepper2->setAcceleration(stepperAccel);
  stepper2->runForward();

  bool m1Reached = false;
  bool m2Reached = false;
  uint32_t p2Start = millis();

  while (!m1Reached || !m2Reached) {
    if (checkCancel()) return;

    if (!m1Reached) {
      bool reached1 = (defaultCount1 >= 0) ? (getEncoderCount1() >= defaultCount1) : (getEncoderCount1() <= defaultCount1);
      if (reached1) {
        stepper1->stopMove();
        m1Reached = true;
        Serial.printf(">> [M1 VE DICH] Truc 1 dat: %+.2f do (%ld counts)\n", getAngleDeg1(), (long)getEncoderCount1());
        requestTelemetryPrint();
      } else if (abs(defaultCount1 - getEncoderCount1()) < 50) {
        stepper1->setSpeedInHz(autoSpeedHz / 2);
        stepper1->applySpeedAcceleration();
      }
    }

    if (!m2Reached) {
      bool reached2 = (defaultCount2 >= 0) ? (getEncoderCount2() >= defaultCount2) : (getEncoderCount2() <= defaultCount2);
      if (reached2) {
        stepper2->stopMove();
        m2Reached = true;
        Serial.printf(">> [M2 VE DICH] Truc 2 dat: %+.2f do (%ld counts)\n", getAngleDeg2(), (long)getEncoderCount2());
        requestTelemetryPrint();
      } else if (abs(defaultCount2 - getEncoderCount2()) < 50) {
        stepper2->setSpeedInHz(autoSpeedHz / 2);
        stepper2->applySpeedAcceleration();
      }
    }

    if (millis() - p2Start > 35000) {
      stepper1->stopMove();
      stepper2->stopMove();
      stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
      Serial.println("\n>> [CANH BAO AN TOAN] Timeout 35s Seek Default! Da dung.");
      requestTelemetryPrint();
      return;
    }
    delay(2);
  }

  while (stepper1->isRunning() || stepper2->isRunning()) {
    esp_task_wdt_reset();
    updateHardwareEncoders();
    delay(2);
  }

  stateM1 = STATE_IDLE;
  stateM2 = STATE_IDLE;
  systemHomed = true;
  Serial.println("\n=======================================================");
  Serial.println(">> [DUAL AUTO HOAN TAT 100%] CA 2 TRUC DA VE DUNG DICH!");
  Serial.printf("   Truc 1 (Azimuth)  : %+.2f do giang pin (%ld counts)\n", getAngleDeg1(), (long)getEncoderCount1());
  Serial.printf("   Truc 2 (Elevation): %+.2f do giang pin (%ld counts)\n", getAngleDeg2(), (long)getEncoderCount2());
  Serial.println("=======================================================");
  requestTelemetryPrint();
}

// -------------------------------------------------------------------------
// 10. SETUP
// -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  
  delay(300);
  Serial.println("\n\n=======================================================");
  Serial.println(">> BO MACH ESP32-S3 DUAL SOLAR TRACKER DA KHOI DONG!");
  esp_reset_reason_t rstReason = esp_reset_reason();
  Serial.printf(">> [RESET REASON] Code %d: ", (int)rstReason);
  switch (rstReason) {
    case ESP_RST_POWERON:   Serial.println("POWER ON (Cap nguon moi)"); break;
    case ESP_RST_SW:        Serial.println("SOFTWARE RESET (Lenh phan mem)"); break;
    case ESP_RST_PANIC:     Serial.println("EXCEPTION / CRASH PANIC"); break;
    case ESP_RST_INT_WDT:   Serial.println("INTERRUPT WATCHDOG"); break;
    case ESP_RST_TASK_WDT:  Serial.println("TASK WATCHDOG TIMEOUT (Loop blocked)"); break;
    case ESP_RST_WDT:       Serial.println("OTHER WATCHDOG"); break;
    case ESP_RST_DEEPSLEEP: Serial.println("DEEP SLEEP WAKE"); break;
    case ESP_RST_BROWNOUT:  Serial.println("BROWNOUT (Sut ap nguon 3.3V/5V/24V)!"); break;
    default:                Serial.println("UNKNOWN"); break;
  }
  Serial.println("=======================================================");

  // 1. Khởi tạo FastAccelStepper Engine phần cứng (DÙNG 100% RMT, TUYỆT ĐỐI KHÔNG DÙNG PCNT) cho Driver DM556
  engine.init();
  stepper1 = engine.stepperConnectToPin(M1_PUL_PIN, DRIVER_RMT);
  if (stepper1) {
    stepper1->setDirectionPin(M1_DIR_PIN);
    stepper1->setSpeedInHz(manualSpeedHz);
    stepper1->setAcceleration(stepperAccel);
    stepper1->setAutoEnable(false);
    Serial.println(">> [STEPPER 1 OK] Da khoi tao FastAccelStepper M1 (Azimuth - 100% RMT Hardware)!");
  } else {
    Serial.println(">> [LOI] Khong the khoi tao Stepper 1 qua FastAccelStepper!");
  }

  stepper2 = engine.stepperConnectToPin(M2_PUL_PIN, DRIVER_RMT);
  if (stepper2) {
    stepper2->setDirectionPin(M2_DIR_PIN);
    stepper2->setSpeedInHz(manualSpeedHz);
    stepper2->setAcceleration(stepperAccel);
    stepper2->setAutoEnable(false);
    Serial.println(">> [STEPPER 2 OK] Da khoi tao FastAccelStepper M2 (Elevation - 100% RMT Hardware)!");
  } else {
    Serial.println(">> [LOI] Khong the khoi tao Stepper 2 qua FastAccelStepper!");
  }

  // 2. Cấu hình Công tắc hành trình Home
  pinMode(M1_HOME_SW_PIN, INPUT_PULLUP);
  pinMode(M2_HOME_SW_PIN, INPUT_PULLUP);

  // 3. Cấu hình chân Encoder và khởi tạo bộ đếm phần cứng PCNT 4X với Glitch Filter
  pinMode(M1_ENC_A_PIN, INPUT_PULLUP);
  pinMode(M1_ENC_B_PIN, INPUT_PULLUP);
  pinMode(M2_ENC_A_PIN, INPUT_PULLUP);
  pinMode(M2_ENC_B_PIN, INPUT_PULLUP);

  initPcntEncoder(PCNT_UNIT_0, M1_ENC_A_PIN, M1_ENC_B_PIN);
  initPcntEncoder(PCNT_UNIT_1, M2_ENC_A_PIN, M2_ENC_B_PIN);

  // A11: Không tự ý gắn ngắt mềm rawEdges lúc setup() để giải phóng CPU.
  // Ngắt chỉ được bật theo yêu cầu khi chạy Bench hoặc bật chế độ theo dõi xung thô [K] / [V].
  disableRawEdgeInterrupts();

  Serial.println(">> [PCNT HARDWARE OK] Da khoi tao PCNT Unit 0 & Unit 1 (Hardware 4X + Glitch Filter 1.0us)!");

  // 4. Khởi tạo Flash NVS (Preferences) & Nạp CalibrationStore
  prefs.begin("solar_pos", false);

  // Khởi tạo Bảng tham số trung tâm (ParamRegistry) & Nạp dữ liệu NVS Flash (CalibrationStore)
  CalibrationStore.begin();
  ParamRegistry.set("L_EL_MIN_SOFT", 10.0f);

  // Khởi tạo Bench Wizard (16 bước B0-B15 & Operation Gating)
  BenchWizard.begin();

  // Đồng bộ vị trí Encoder & tốc độ từ ParamRegistry
  encoderLocation = (EncoderLocation)ParamRegistry.getInt("ENCODER_ON_LOAD", (int)ENCODER_LOC_UNKNOWN);
  manualSpeedHz   = (uint32_t)ParamRegistry.get("MANUAL_SPEED_AZ", 2000.0f);
  stepperAccel    = (uint32_t)ParamRegistry.get("U_MAX_ACCEL_AZ", 5000.0f);
  invertEncoderDir1 = prefs.getBool("inv_enc1", (ParamRegistry.getInt("ENC_INVERT_AZ", 0) == 1));
  invertEncoderDir2 = prefs.getBool("inv_enc2", (ParamRegistry.getInt("ENC_INVERT_EL", 0) == 1));
  if (!prefs.isKey("def_cnt1")) prefs.putInt("def_cnt1", INIT_DEFAULT_COUNTS_1);
  if (!prefs.isKey("def_cnt2")) prefs.putInt("def_cnt2", INIT_DEFAULT_COUNTS_2);

  defaultCount1 = prefs.getInt("def_cnt1", INIT_DEFAULT_COUNTS_1);
  defaultDeg1   = (float)defaultCount1 * getDegPerCount();
  prefs.putFloat("def_deg1", defaultDeg1);

  defaultCount2 = prefs.getInt("def_cnt2", INIT_DEFAULT_COUNTS_2);
  defaultDeg2   = (float)defaultCount2 * getDegPerCount();
  prefs.putFloat("def_deg2", defaultDeg2);

  if (isHome1Triggered()) resetEncoder1(0);
  if (isHome2Triggered()) resetEncoder2(0);

  // Kiểm tra trạng thái Homing khi khởi động (A3)
  esp_sleep_wakeup_cause_t wakeupCause = esp_sleep_get_wakeup_cause();
  bool homeOnWake = (ParamRegistry.getInt("HOME_ON_WAKE", 0) == 1);
  if (wakeupCause == ESP_SLEEP_WAKEUP_GPIO && systemHomed && !homeOnWake) {
    Serial.println(">> [BOOT] Thuc day tu Light Sleep: RAM nguyen ven, giu moc Home!");
  } else {
    systemHomed = false;
    Serial.println(">> [BOOT] Khoi dong moi (Power-on/Reset) -> Trang thai UNCALIBRATED (Can Homing)!");
  }

  // 5. Cấu hình 4 mắt cảm biến quang TEMT6000
  pinMode(PIN_TEMT_TOP, INPUT);
  pinMode(PIN_TEMT_BOT, INPUT);
  pinMode(PIN_TEMT_LFT, INPUT);
  pinMode(PIN_TEMT_RGT, INPUT);
  analogReadResolution(12);

  // 6. Cấu hình I2C & RTC DS3231 (CÓ TIMEOUT 25ms CHỐNG TREO)
  Serial.println(">> Dang khoi tao bus I2C (SDA: GPIO 8, SCL: GPIO 9)...");
  if (!i2cMutex) i2cMutex = xSemaphoreCreateMutex();
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 100000); // Chuẩn 100 kHz
  Wire.setTimeOut(25); // Timeout 25ms: Neu day long hoac cam nguoc thi bo qua, khong bi treo!
  pinMode(DS3231_SQW_PIN, INPUT_PULLUP);

  // Khởi tạo hàng đợi Offline LittleFS (Mục 2 & Mục 9)
  OfflineQueue.begin();

  // Đọc thông số INA226 từ ParamRegistry (A7)
  float shuntTrk = ParamRegistry.get("INA_SHUNT_TRK", 0.002f);
  float maxCurrTrk = ParamRegistry.get("INA_MAX_CURR_TRK", 10.0f);
  float shuntSta = ParamRegistry.get("INA_SHUNT_STA", 0.002f);
  float maxCurrSta = ParamRegistry.get("INA_MAX_CURR_STA", 10.0f);

  ParamEntry* peTrk = ParamRegistry.getEntry("INA_SHUNT_TRK");
  if (peTrk && peTrk->status == PARAM_STATUS_UNVERIFIED) {
    Serial.println(">> [CANH BAO INA226] Tham so INA_SHUNT_TRK chua duoc kiem chuan (UNVERIFIED)! Hay chay Bench B7/B8.");
  }

  // Khởi tạo 2 cảm biến đo dòng/áp INA226
  if (inaTracker.begin()) {
    inaTrackerFound = true;
    inaTracker.setMaxCurrentShunt(maxCurrTrk, shuntTrk);
    Serial.printf(">> [INA226 #1 OK] Da tim thay INA226 (0x44 - Tam Xoay Tracker)! Shunt: %.4f ohm, MaxCurr: %.1f A\n", shuntTrk, maxCurrTrk);
  } else {
    inaTracker = INA226(0x40, &Wire);
    if (inaTracker.begin()) {
      inaTrackerFound = true;
      inaTracker.setMaxCurrentShunt(maxCurrTrk, shuntTrk);
      Serial.printf(">> [INA226 #1 OK] Da tim thay INA226 (0x40 - Tam Xoay Tracker)! Shunt: %.4f ohm, MaxCurr: %.1f A\n", shuntTrk, maxCurrTrk);
    } else {
      Serial.println(">> [INA226 #1 --] Chua tim thay INA226 (Tam Tracker - da thu 0x44 va 0x40)");
    }
  }

  if (inaStatic.begin()) {
    inaStaticFound = true;
    inaStatic.setMaxCurrentShunt(maxCurrSta, shuntSta);
    Serial.printf(">> [INA226 #2 OK] Da tim thay INA226 (0x41 - Tam Co Dinh Static)! Shunt: %.4f ohm, MaxCurr: %.1f A\n", shuntSta, maxCurrSta);
  } else {
    Serial.println(">> [INA226 #2 --] Chua tim thay INA226 (0x41 - Tam Co Dinh)");
  }

  // 7. Quét thiết bị I2C và in giờ RTC ban đầu
  scanI2CBus();
  printRTCStatus();

  // Khôi phục năng lượng tích lũy trong ngày từ Flash NVS (A4)
  int yRtc, mRtc, dRtc, hhRtc, mmRtc, ssRtc;
  float tCRtc;
  int savedDay = prefs.getInt("wh_day", -1);
  if (readDS3231(yRtc, mRtc, dRtc, hhRtc, mmRtc, ssRtc, tCRtc)) {
    lastRtcDay = dRtc;
    if (savedDay == dRtc) {
      energyWhTracker = prefs.getFloat("wh_trk", 0.0f);
      energyWhStatic  = prefs.getFloat("wh_sta", 0.0f);
      Serial.printf(">> [ENERGY NVS] Khoi phuc nang luong trong ngay: Tracker=%.2f Wh, Static=%.2f Wh\n",
                    energyWhTracker, energyWhStatic);
    } else {
      Serial.println(">> [ENERGY NVS] Khoi dong ngay moi -> Reset nang luong 0.0 Wh");
      energyWhTracker = 0.0f;
      energyWhStatic  = 0.0f;
      prefs.putFloat("wh_trk", 0.0f);
      prefs.putFloat("wh_sta", 0.0f);
      prefs.putInt("wh_day", dRtc);
    }
  }

  // 8. Khởi tạo WiFi & Firebase Realtime Database
  Serial.printf(">> Dang ket noi WiFi toi SSID: %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startWifi < 2500)) {
    delay(150);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n>> [WIFI OK] Da ket noi! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n>> [WIFI WAIT] Dang tiep tuc ket noi ngam trong background...");
  }

  fbConfig.api_key = API_KEY;
  fbConfig.database_url = DATABASE_URL;
  fbConfig.signer.test_mode = true;
  fbConfig.timeout.socketConnection = 1500;
  fbConfig.timeout.serverResponse = 1500;
  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println(">> [FIREBASE OK] Da san sang day Telemetry len Web Dashboard!\n");

  // 8. Đăng ký Task Watchdog bảo vệ Core 1 (Mục 2) & Khởi tạo Background Task trên Core 0
  esp_task_wdt_init(15, true); // Timeout 15s (thay vì 5s quá nhạy), panic reset nếu Core 1 bị treo (Mục 2)
  esp_task_wdt_add(NULL);     // Đăng ký loop() task hiện tại vào Watchdog

  if (!i2cMutex) i2cMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(
    telemetryTask,
    "TelemetryTask",
    10240,            // 10 KB stack cho Firebase TLS
    NULL,
    0,                // Priority 0 (tskIDLE_PRIORITY) - Time-slice cong bang voi IDLE0, chong triet de Task Watchdog!
    &telemetryTaskHandle,
    0                 // Core 0 (PRO_CPU)
  );
  Serial.println(">> [FREE-RTOS CORE 0] TelemetryTask da khoi chay doc lap tren Core 0!");
  Serial.println("   -> Core 1 ranh tay 100% cho dieu khien dong co & bam quang!\n");

  // 9. In Menu
  printMenu();
  requestTelemetryPrint();
  Serial.print("\n[CLI]> ");
}

// -------------------------------------------------------------------------
// 11. XỬ LÝ LỆNH CLI CHUỖI (PARAM REGISTRY & CALIBRATION STORE)
// -------------------------------------------------------------------------
void handleCliCommand(const String& cmdStr) {
  if (cmdStr.equalsIgnoreCase("stop")) {
    stateM1 = STATE_IDLE;
    stateM2 = STATE_IDLE;
    autoOpticalTracking = false;
    if (stepper1) stepper1->stopMove();
    if (stepper2) stepper2->stopMove();
    BenchWizard.abort("Nguoi dung nhan E-Stop (stop)");
    Serial.println("\n>> [STOP] DA DUNG KHAN CAP TOAN BO HE THONG (FastAccelStepper Decel)!");
    requestTelemetryPrint();
  } else if (cmdStr.equalsIgnoreCase("params")) {
    ParamRegistry.printTable();
  } else if (cmdStr.equalsIgnoreCase("bench")) {
    BenchWizard.printStatus();
  } else if (cmdStr.equalsIgnoreCase("bench all")) {
    enableRawEdgeInterrupts();
    BenchWizard.startAll();
  } else if (cmdStr.startsWith("bench ") || cmdStr.startsWith("BENCH ")) {
    String arg = cmdStr.substring(6);
    arg.trim();
    if (arg.equalsIgnoreCase("abort")) {
      BenchWizard.abort();
    } else {
      int stepId = arg.toInt();
      enableRawEdgeInterrupts();
      BenchWizard.startStep(stepId);
    }
  } else if (cmdStr.equalsIgnoreCase("y") || cmdStr.equalsIgnoreCase("yes")) {
    BenchWizard.confirm(true);
  } else if (cmdStr.equalsIgnoreCase("n") || cmdStr.equalsIgnoreCase("no")) {
    BenchWizard.confirm(false);
  } else if (cmdStr.equalsIgnoreCase("arm")) {
    BenchWizard.arm();
  } else if (cmdStr.equalsIgnoreCase("disarm")) {
    BenchWizard.disarm();
  } else if (cmdStr.equalsIgnoreCase("mode op") || cmdStr.equalsIgnoreCase("mode operation")) {
    BenchWizard.setSystemMode(MODE_OPERATION);
  } else if (cmdStr.equalsIgnoreCase("mode bench")) {
    BenchWizard.setSystemMode(MODE_BENCH);
  } else if (cmdStr.equalsIgnoreCase("status")) {
    BenchWizard.printStatus();
  } else if (cmdStr.startsWith("set ") || cmdStr.startsWith("SET ")) {
    int firstSpace = cmdStr.indexOf(' ');
    int secondSpace = cmdStr.indexOf(' ', firstSpace + 1);
    if (secondSpace < 0) {
      Serial.println(">> Cu phap sai! Hay dung: set <TEN_THAM_SO> <GIATRI>");
    } else {
      String pName = cmdStr.substring(firstSpace + 1, secondSpace);
      pName.trim();
      String pValStr = cmdStr.substring(secondSpace + 1);
      pValStr.trim();
      float val = pValStr.toFloat();
      ParamEntry* pe = ParamRegistry.getEntry(pName.c_str());
      if (!pe) {
        Serial.printf(">> [PARAM] Loi: Khong tim thay tham so '%s'!\n", pName.c_str());
      } else {
        float oldVal = pe->val;
        if (ParamRegistry.set(pName.c_str(), val, PARAM_SRC_MANUAL, "MANUAL")) {
          CalibrationStore.save();
          Serial.printf(">> [PARAM OK] %s: %.4f -> %.4f (%s) [Da luu NVS Flash]\n",
                        pName.c_str(), oldVal, val, pe->unit);
          if (pName.equalsIgnoreCase("MANUAL_SPEED_AZ") || pName.equalsIgnoreCase("MANUAL_SPEED_EL")) {
            manualSpeedHz = (uint32_t)val;
          } else if (pName.equalsIgnoreCase("U_MAX_ACCEL_AZ") || pName.equalsIgnoreCase("U_MAX_ACCEL_EL")) {
            stepperAccel = (uint32_t)val;
          } else if (pName.equalsIgnoreCase("ENCODER_ON_LOAD")) {
            encoderLocation = (EncoderLocation)ParamRegistry.getInt("ENCODER_ON_LOAD", (int)ENCODER_LOC_UNKNOWN);
          }
        }
      }
    }
  } else if (cmdStr.startsWith("rollback ") || cmdStr.startsWith("ROLLBACK ")) {
    int spaceIdx = cmdStr.indexOf(' ');
    String pName = cmdStr.substring(spaceIdx + 1);
    pName.trim();
    if (ParamRegistry.rollback(pName.c_str())) {
      CalibrationStore.save();
      Serial.printf(">> [PARAM OK] Da rollback '%s' ve %.4f va luu NVS!\n",
                    pName.c_str(), ParamRegistry.get(pName.c_str()));
      if (pName.equalsIgnoreCase("ENCODER_ON_LOAD")) {
        encoderLocation = (EncoderLocation)ParamRegistry.getInt("ENCODER_ON_LOAD", (int)ENCODER_LOC_UNKNOWN);
      }
    }
  } else if (cmdStr.equalsIgnoreCase("calib save")) {
    CalibrationStore.save();
  } else if (cmdStr.equalsIgnoreCase("calib load")) {
    CalibrationStore.load();
    encoderLocation = (EncoderLocation)ParamRegistry.getInt("ENCODER_ON_LOAD", (int)ENCODER_LOC_UNKNOWN);
    manualSpeedHz = (uint32_t)ParamRegistry.get("MANUAL_SPEED_AZ", 2000.0f);
    stepperAccel = (uint32_t)ParamRegistry.get("U_MAX_ACCEL_AZ", 5000.0f);
  } else if (cmdStr.equalsIgnoreCase("calib reset")) {
    CalibrationStore.resetToDefaults();
    encoderLocation = (EncoderLocation)ParamRegistry.getInt("ENCODER_ON_LOAD", (int)ENCODER_LOC_UNKNOWN);
    manualSpeedHz = (uint32_t)ParamRegistry.get("MANUAL_SPEED_AZ", 2000.0f);
    stepperAccel = (uint32_t)ParamRegistry.get("U_MAX_ACCEL_AZ", 5000.0f);
  } else if (cmdStr.equalsIgnoreCase("calib export") || cmdStr.equalsIgnoreCase("export")) {
    CalibrationStore.printJson();
  } else if (cmdStr.equalsIgnoreCase("raw") || cmdStr.equalsIgnoreCase("enc")) {
    rawEncStream = !rawEncStream;
    if (rawEncStream || liveEncoderMonitor) enableRawEdgeInterrupts();
    else disableRawEdgeInterrupts();
    Serial.printf("\n>> [RAW ENCODER STREAM: %s] %s\n",
                  rawEncStream ? "ON" : "OFF",
                  rawEncStream ? "Dang in muc logic thô & so canh rieng Pha A/B moi 200ms... (Go 'raw' hoac bam [K] de tat)" : "Da tat stream.");
  } else if (cmdStr.startsWith("time ") || cmdStr.startsWith("rtc set ") || cmdStr.startsWith("rtc ")) {
    int hh = 0, mm = 0, ss = 0, d = 1, m = 11, y = 2026;
    String arg = cmdStr;
    if (arg.startsWith("time ")) arg = arg.substring(5);
    else if (arg.startsWith("rtc set ")) arg = arg.substring(8);
    else if (arg.startsWith("rtc ")) arg = arg.substring(4);
    arg.trim();
    int parsed = sscanf(arg.c_str(), "%d:%d:%d %d/%d/%d", &hh, &mm, &ss, &d, &m, &y);
    if (parsed >= 3) {
      if (writeDS3231(y, m, d, hh, mm, ss)) {
        Serial.printf("\n>> [RTC DS3231 OK] Da cai dat gio thanh cong: %02d:%02d:%02d ngay %02d/%02d/%04d!\n",
                      hh, mm, ss, d, m, y);
      } else {
        Serial.println("\n>> [LOI] Khong the ghi gio vao DS3231 qua I2C!");
      }
    } else {
      Serial.println("\n>> Cu phap: 'time HH:MM:SS DD/MM/YYYY' (Vi du: time 23:05:00 01/11/2026)");
    }
  } else if (cmdStr.equalsIgnoreCase("noaa")) {
    int y = 0, m = 0, d = 0, hh = 0, mm = 0, ss = 0;
    float tC = 25.0f;
    if (!readDS3231(y, m, d, hh, mm, ss, tC)) {
      Serial.println("\n>> [LOI] Khong the doc RTC DS3231 qua I2C de tinh vi tri mat troi!");
    } else {
      double lat = (double)ParamRegistry.get("PANEL_LATITUDE", 10.7626f);
      double lon = (double)ParamRegistry.get("PANEL_LONGITUDE", 106.660f);
      double tz  = (double)ParamRegistry.get("TIMEZONE_OFFSET", 7.0f);

      solar::SolarPosition pos = solar::SolarEphemeris::calculate(y, m, d, hh, mm, ss, tz, lat, lon);
      solar::AxisTarget outAz, outEl;
      solar::SolarGeometry::computeAxisTargets(pos, outAz, outEl, defaultDeg1);

      Serial.println("\n=======================================================");
      Serial.println("  [NOAA SOLAR EPHEMERIS] THONG SO THIEN VAN MAT TROI");
      Serial.println("=======================================================");
      Serial.printf(" RTC DS3231       : %02d:%02d:%02d ngay %02d/%02d/%04d (Nhiet do: %.2f°C)\n",
                    hh, mm, ss, d, m, y, tC);
      Serial.printf(" Toa do tram dat  : Vi do: %.5f° N | Kinh do: %.5f° E | Mui gio: UTC%+0.1f\n",
                    lat, lon, tz);
      Serial.println("-------------------------------------------------------");
      Serial.printf(" Phuong vi (Azimuth): %7.2f° (0°=Bac, 90°=Dong, 180°=Nam, 270°=Tay)\n", pos.azimuth_deg);
      Serial.printf(" Do cao (Elevation) : %+7.2f° (0°=Chan troi, 90°=Thien dinh/Zenith)\n", pos.elevation_deg);
      Serial.printf(" Thien dinh (Zenith): %7.2f°\n", pos.zenith_deg);
      Serial.printf(" Chieu sang         : %s\n", pos.is_daylight ? "BAN NGAY (Co the bam)" : "BAN DEM / DUOI CHAN TROI");
      Serial.printf(" Nhat trieu         : Binh minh: %02d:%02d | Hoang hon: %02d:%02d\n",
                    pos.sunrise_min / 60, pos.sunrise_min % 60,
                    pos.sunset_min / 60, pos.sunset_min % 60);
      Serial.printf(" Cua so bam nang    : Bat dau: %02d:%02d | Ket thuc: %02d:%02d\n",
                    pos.tracking_start_min / 60, pos.tracking_start_min % 60,
                    pos.tracking_end_min / 60, pos.tracking_end_min % 60);
      Serial.println("-------------------------------------------------------");
      Serial.println(" GOC MUC TIEU CUA GIAN PIN THEO THIEN VAN FEEDFORWARD:");
      Serial.printf("   - Truc 1 (Azimuth)  : phi_ff = %+.2f° (Kep mem: 0°..%.1f°)\n",
                    outAz.final_ref_deg, CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
      Serial.printf("   - Truc 2 (Elevation): eps_ff = %+.2f° (Kep an toan: %.1f°..%.1f°)\n",
                    outEl.final_ref_deg, CFG_L_EL_MIN_SOFT_LIMIT_DEG, CFG_J_EL_MAX_SOFT_LIMIT_DEG);
      Serial.println(" VI TRI THUC TE HIEN TAI TREN GIAN PIN (ENCODER):");
      float curPhi = getAngleDeg1();
      float curEps = getElevationEpsilon();
      Serial.printf("   - Truc 1 (Azimuth)  : phi_act = %+.2f° -> Sai lech: %+.2f°\n",
                    curPhi, outAz.final_ref_deg - curPhi);
      Serial.printf("   - Truc 2 (Elevation): eps_act = %+.2f° -> Sai lech: %+.2f°\n",
                    curEps, outEl.final_ref_deg - curEps);
      Serial.println("=======================================================\n");
    }
  } else if (cmdStr.equalsIgnoreCase("track") || cmdStr.startsWith("track ") || cmdStr.startsWith("TRACK ")) {
    String sub = "";
    if (cmdStr.indexOf(' ') > 0) {
      sub = cmdStr.substring(cmdStr.indexOf(' ') + 1);
      sub.trim();
    }
    if (sub.length() == 0 || sub.equalsIgnoreCase("status")) {
      Serial.println("\n=======================================================");
      Serial.println("  [TRACKING STATUS] TRANG THAI BAM MAT TROI HE THONG");
      Serial.println("=======================================================");
      const char* mStr = (currentTrackSource == TRACK_SRC_EPHEMERIS) ? "EPHEMERIS_ONLY (Thien van NOAA)" :
                         (currentTrackSource == TRACK_SRC_SENSOR)    ? "SENSOR_ONLY (Quang hoc TEMT6000)" :
                         (currentTrackSource == TRACK_SRC_HYBRID)    ? "HYBRID (Hop nhat NOAA + TEMT6000)" : "OFF (Tat)";
      Serial.printf(" Che do bam hien tai : %s\n", mStr);
      Serial.printf(" FSM State           : %d\n", (int)systemFsmState);
      float tAz = 0.0f, tEl = 0.0f, azS = 0.0f, elS = 0.0f, zenS = 0.0f, ws = 0.0f;
      bool isDay = false;
      if (computeSolarTrackingTargets(tAz, tEl, azS, elS, zenS, ws, isDay)) {
        Serial.printf(" Mat troi (NOAA)     : Azimuth=%+.2f°, Elevation=%+.2f° (Zenith=%+.2f°) [%s]\n",
                      azS, elS, zenS, isDay ? "BAN NGAY" : "BAN DEM / CHAN TROI");
        Serial.printf(" Muc tieu dat cho pin: TargetAz=%+.2f°, TargetEl=%+.2f°\n", tAz, tEl);
        Serial.printf(" Vi tri thuc gian pin: Phi=%+.2f°, Epsilon=%+.2f°\n", getAngleDeg1(), getElevationEpsilon());
        Serial.printf(" Trong so quang (ws) : %.2f (Do sang AVG: %d)\n", ws, latestOpticalData.avg);
      } else {
        Serial.println(" [!] Khong doc duoc RTC DS3231!");
      }
      Serial.println(" Goi y cu phap thay doi:");
      Serial.println("   track noaa    : Bam theo thien van NOAA thuan (EPHEMERIS_ONLY)");
      Serial.println("   track sensor  : Bam theo 4 cam bien quang (SENSOR_ONLY)");
      Serial.println("   track hybrid  : Hop nhat NOAA Feedforward + Bu sai so quang (HYBRID)");
      Serial.println("   track off     : Tat che do tu dong bam");
      Serial.println("=======================================================\n");
    } else if (sub.equalsIgnoreCase("noaa") || sub.equalsIgnoreCase("ephemeris")) {
      currentTrackSource = TRACK_SRC_EPHEMERIS;
      autoOpticalTracking = true;
      systemFsmState = FSM_STATE_TRACKING;
      Serial.println("\n>> [TRACK MODE] DA KICH HOAT CHE DO: EPHEMERIS_ONLY (Thien van NOAA)!");
      Serial.println("   He thong tinh goc mat troi thoi gian thuc va dieu khien dong co bam lien tuc.");
    } else if (sub.equalsIgnoreCase("sensor") || sub.equalsIgnoreCase("opt")) {
      currentTrackSource = TRACK_SRC_SENSOR;
      autoOpticalTracking = true;
      systemFsmState = FSM_STATE_TRACKING;
      Serial.println("\n>> [TRACK MODE] DA KICH HOAT CHE DO: SENSOR_ONLY (Cam bien quang TEMT6000)!");
      Serial.println("   He thong bam ti le: lech nhieu (>15%) chay lien tuc ca 2 truc, gan deu nhich vi chinh.");
    } else if (sub.equalsIgnoreCase("hybrid")) {
      currentTrackSource = TRACK_SRC_HYBRID;
      autoOpticalTracking = true;
      trackCyclePhase = TRACK_CYCLE_ADJUSTING;
      isMaxAzimuthReached = false;
      systemFsmState = FSM_STATE_TRACKING;
      Serial.println("\n>> [TRACK MODE] DA KICH HOAT CHE DO: HYBRID (NOAA Feedforward + TEMT6000 Correction)!");
      Serial.println("   Chu ky: Dieu chinh on dinh -> Dung im giu buoc 15 phut. Dat goc max giu buoc den 19:00.");
    } else if (sub.equalsIgnoreCase("off") || sub.equalsIgnoreCase("stop")) {
      currentTrackSource = TRACK_SRC_OFF;
      autoOpticalTracking = false;
      systemFsmState = FSM_STATE_IDLE;
      if (stepper1) stepper1->stopMove();
      if (stepper2) stepper2->stopMove();
      Serial.println("\n>> [TRACK MODE] DA TAT CHE DO TU DONG BAM -> He thong chuyen ve IDLE.");
    } else {
      Serial.printf(">> Tuy chon track khong hop le: '%s'. Dung: track noaa | sensor | hybrid | off\n", sub.c_str());
    }
  } else if (cmdStr.startsWith("step ") || cmdStr.startsWith("STEP ")) {
    int firstSpace = cmdStr.indexOf(' ');
    int secondSpace = cmdStr.indexOf(' ', firstSpace + 1);
    if (secondSpace < 0) {
      Serial.println(">> Cu phap: step <truc (1|2)> <delta_deg> (Vi du: step 1 5 hoac step 2 -10)");
    } else {
      int axis = cmdStr.substring(firstSpace + 1, secondSpace).toInt();
      String degStr = cmdStr.substring(secondSpace + 1);
      degStr.trim();
      float degVal = degStr.toFloat();

      if (axis != 1 && axis != 2) {
        Serial.println(">> Truc khong hop le! Chi co truc 1 (Azimuth) hoac truc 2 (Elevation).");
      } else {
        float startDeg = (axis == 1) ? getAngleDeg1() : getElevationEpsilon();
        int32_t startCnt = (axis == 1) ? getEncoderCount1() : getEncoderCount2();
        float targetDeg = startDeg + degVal;
        Serial.printf("\n>> [STEP COMMAND] Truc %d: Goc ban dau: %+.2f° -> Nhay bac: %+.2f° -> Muc tieu: %+.2f°\n",
                      axis, startDeg, degVal, targetDeg);

        bool success = stepPositionControl(axis, targetDeg);
        if (success) {
          Serial.println("   -> Da phat lenh di chuyen. Dang doi dong co den vi tri...");
          unsigned long t0 = millis();
          FastAccelStepper* s = (axis == 1) ? stepper1 : stepper2;
          while (s && s->isRunning() && (millis() - t0 < 8000)) {
            esp_task_wdt_reset();
            delay(10);
            updateHardwareEncoders();
          }
          float endDeg = (axis == 1) ? getAngleDeg1() : getElevationEpsilon();
          int32_t endCnt = (axis == 1) ? getEncoderCount1() : getEncoderCount2();
          float achievedDelta = endDeg - startDeg;
          float errDeg = targetDeg - endDeg;
          int32_t cntDelta = endCnt - startCnt;

          Serial.println(">> -------------------------------------------------------");
          Serial.printf(">> [KET QUA DO NGHIEM THU BUOC NHAY TRUC %d]:\n", axis);
          Serial.printf("   - Goc ban dau : %+.2f° (%ld counts)\n", startDeg, (long)startCnt);
          Serial.printf("   - Muc tieu    : %+.2f°\n", targetDeg);
          Serial.printf("   - Goc dat duoc: %+.2f° (%ld counts) -> Nhay thuc te: %+.2f° (%+ld counts)\n",
                        endDeg, (long)endCnt, achievedDelta, (long)cntDelta);
          Serial.printf("   - Sai so con lai (Steady Error): %+.3f° (Vung chet: ±%.2f°)\n",
                        errDeg, ParamRegistry.get("POS_PID_DEADBAND_DEG", 0.45f));
          Serial.printf("   - Danh gia    : %s\n",
                        (fabs(errDeg) <= ParamRegistry.get("POS_PID_DEADBAND_DEG", 0.45f)) ? "DAT (PASS)" : "CON LECH (FAIL / LIMIT HIT)");
          Serial.println(">> -------------------------------------------------------");
        } else {
          Serial.println(">> [LOI] Khong the thuc hien buoc nhay vi vuong CTHT hoac Gioi han mem!");
        }
      }
    }
  } else if (cmdStr.startsWith("goto ") || cmdStr.startsWith("GOTO ")) {
    int firstSpace = cmdStr.indexOf(' ');
    int secondSpace = cmdStr.indexOf(' ', firstSpace + 1);
    if (secondSpace < 0) {
      Serial.println(">> Cu phap: goto <truc (1|2)> <goc_dich_tuyet_doi> (Vi du: goto 1 45.0)");
    } else {
      int axis = cmdStr.substring(firstSpace + 1, secondSpace).toInt();
      float targetDeg = cmdStr.substring(secondSpace + 1).toFloat();
      if (axis != 1 && axis != 2) {
        Serial.println(">> Truc khong hop le! Chi co 1 (Azimuth) hoac 2 (Elevation).");
      } else {
        float startDeg = (axis == 1) ? getAngleDeg1() : getElevationEpsilon();
        Serial.printf("\n>> [GOTO COMMAND] Truc %d: Tu %+.2f° toi goc tuyet doi: %+.2f°\n", axis, startDeg, targetDeg);
        stepPositionControl(axis, targetDeg);
      }
    }
  } else if (cmdStr.equalsIgnoreCase("park")) {
    parkPanels();
  } else if (cmdStr.equalsIgnoreCase("sleep") || cmdStr.startsWith("sleep ") || cmdStr.startsWith("SLEEP ")) {
    uint32_t mins = 2;
    if (cmdStr.indexOf(' ') > 0) {
      mins = cmdStr.substring(cmdStr.indexOf(' ') + 1).toInt();
      if (mins == 0) mins = 2;
    }
    systemFsmState = FSM_STATE_PREP_SLEEP;
    enterNightLightSleep(mins);
    systemFsmState = FSM_STATE_IDLE;
  } else if (cmdStr.equalsIgnoreCase("help") || cmdStr.equalsIgnoreCase("menu") || cmdStr.equalsIgnoreCase("?")) {
    printMenu();
  } else {
    Serial.printf(">> Lenh khong hop le: '%s'. Go 'params' de xem tham so hoac 'r' de xem menu.\n", cmdStr.c_str());
  }
}

// -------------------------------------------------------------------------
// 12. LOOP CHÍNH
// -------------------------------------------------------------------------
void loop() {
  // 1. Reset Task Watchdog bảo vệ Core 1 (Mục 2)
  esp_task_wdt_reset();

  // 2. Giám sát phát hiện kẹt động cơ & mất nguồn 24V (Mục 8)
  checkStallProtection();

  // 3. Cập nhật trạng thái Bench Wizard theo thời gian thực (Non-blocking)
  BenchWizard.update();

  // 4. Cập nhật đếm xung phần cứng PCNT độc quyền tại Core 1 (A2, chu kỳ <= 2ms, >= 500 Hz)
  updateHardwareEncoders();

  // A. XỬ LÝ LỆNH TỪ SERIAL MONITOR (NON-BLOCKING + DỪNG KHẨN CẤP <50ms)
  static String serialLineBuffer = "";
  static unsigned long lastSerialCharMs = 0;
  char cmd = 0;
  bool hasCmd = false;

  while (Serial.available() > 0) {
    char c = (char)Serial.read();

    // DỪNG KHẨN CẤP TỨC THÌ (<1ms):
    // - Phím ESC (ASCII 27) luôn dừng ngay lập tức ở mọi tình huống
    // - Phím Space hoặc X/x khi chưa bắt đầu gõ lệnh (buffer rỗng)
    if (c == 27 || (serialLineBuffer.length() == 0 && (c == ' ' || c == 'x' || c == 'X'))) {
      stateM1 = STATE_IDLE;
      stateM2 = STATE_IDLE;
      autoOpticalTracking = false;
      if (stepper1) stepper1->stopMove();
      if (stepper2) stepper2->stopMove();
      BenchWizard.abort("Nguoi dung nhan E-Stop (Space/X/ESC)");
      Serial.println("\n>> [STOP] DA DUNG KHAN CAP TOAN BO HE THONG (FastAccelStepper Decel)!");
      Serial.println(">> (Goi y: Go 'menu' hoac '?' de xem huong dan, 'params' de xem thong so, 'set ...' de cai dat)");
      Serial.print("\n[CLI]> ");
      requestTelemetryPrint();
      serialLineBuffer = "";
      return;
    }

    if (c == '\r' || c == '\n') {
      if (serialLineBuffer.length() > 0) {
        String line = serialLineBuffer;
        serialLineBuffer = "";
        line.trim();
        Serial.println(); // Xuong dong tren man hinh Terminal
        if (line.length() == 1) {
          cmd = line.charAt(0);
          hasCmd = true;
          break;
        } else if (line.length() > 1) {
          handleCliCommand(line);
          Serial.print("\n[CLI]> ");
        }
      } else {
        Serial.print("\n[CLI]> ");
      }
    } else if (c == '\b' || (uint8_t)c == 127) {
      if (serialLineBuffer.length() > 0) {
        serialLineBuffer.remove(serialLineBuffer.length() - 1);
        Serial.print("\b \b"); // Xoa ky tu tren man hinh Terminal
      }
    } else if (c >= 32 && c <= 126) {
      serialLineBuffer += c;
      Serial.print(c); // ECHO truc tiep de nguoi dung thay ky tu minh dang go!
    }
  }

  if (hasCmd) {

    if (cmd == ' ' || cmd == 'x' || cmd == 'X') {
      stateM1 = STATE_IDLE;
      stateM2 = STATE_IDLE;
      autoOpticalTracking = false;
      if (stepper1) stepper1->stopMove();
      if (stepper2) stepper2->stopMove();
      Serial.println("\n>> [STOP] DA DUNG KHAN CAP TOAN BO HE THONG (FastAccelStepper Decel)!");
      requestTelemetryPrint();
      return;
    }

    if (cmd == '1') {
      activeAxis = 1;
      Serial.println("\n>> DANG CHON DIEU KHIEN: TRUC 1 (AZIMUTH - GOC QUAY)");
      requestTelemetryPrint();
      return;
    }
    if (cmd == '2') {
      activeAxis = 2;
      Serial.println("\n>> DANG CHON DIEU KHIEN: TRUC 2 (ELEVATION - DO NGUA)");
      requestTelemetryPrint();
      return;
    }

    switch (cmd) {
      case 'a': case 'A':
        stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
        moveMotorSteps(activeAxis, DIR_TOWARD_HOME, stepsPerPress);
        break;

      case 'd': case 'D':
        stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
        moveMotorSteps(activeAxis, DIR_AWAY_HOME, stepsPerPress);
        break;

      case 'q': case 'Q':
        if (activeAxis == 1) {
          if (isHome1Triggered()) {
            Serial.println(">> [TRUC 1] Dang cham Home, khong the chay tiep ve Home!");
          } else {
            stateM1 = STATE_MANUAL_TOWARD_HOME;
            stepper1->setSpeedInHz(manualSpeedHz);
            stepper1->setAcceleration(stepperAccel);
            stepper1->runBackward(); // Non-blocking: tăng tốc êm ái
            Serial.println(">> [TRUC 1] Chay lien tuc ve Home (FastAccelStepper)...");
          }
        } else {
          if (isHome2Triggered()) {
            Serial.println(">> [TRUC 2] Dang cham Home, khong the chay tiep ve Home!");
          } else {
            stateM2 = STATE_MANUAL_TOWARD_HOME;
            stepper2->setSpeedInHz(manualSpeedHz);
            stepper2->setAcceleration(stepperAccel);
            stepper2->runBackward(); // Non-blocking: tăng tốc êm ái
            Serial.println(">> [TRUC 2] Chay lien tuc ve Home (FastAccelStepper)...");
          }
        }
        break;

      case 'e': case 'E':
        if (activeAxis == 1) {
          if (getAngleDeg1() >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
            Serial.printf(">> [TRUC 1] Goc phi = %+.1f° da cham gioi han mem %+.1f° (Chong xoan cap)! Khong chay.\n",
                          getAngleDeg1(), CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
          } else {
            stateM1 = STATE_MANUAL_AWAY_HOME;
            stepper1->setSpeedInHz(manualSpeedHz);
            stepper1->setAcceleration(stepperAccel);
            stepper1->runForward(); // Non-blocking: tăng tốc êm ái
            Serial.println(">> [TRUC 1] Chay lien tuc ra xa Home (FastAccelStepper)...");
          }
        } else {
          if (getElevationEpsilon() >= CFG_J_EL_MAX_SOFT_LIMIT_DEG) {
            Serial.printf(">> [TRUC 2] Goc ngua epsilon = %+.1f° da cham gioi han ngua toi da %+.1f°! Khong ngua tiep.\n",
                          getElevationEpsilon(), CFG_J_EL_MAX_SOFT_LIMIT_DEG);
          } else if (getElevationEpsilon() <= CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
            Serial.printf(">> [TRUC 2] Goc ngua epsilon = %+.1f° da cham gioi han ha thap an toan %+.1f° (Chong can khung Z)! Khong ha.\n",
                          getElevationEpsilon(), CFG_L_EL_MIN_SOFT_LIMIT_DEG);
          } else {
            stateM2 = STATE_MANUAL_AWAY_HOME;
            stepper2->setSpeedInHz(manualSpeedHz);
            stepper2->setAcceleration(stepperAccel);
            stepper2->runForward(); // Non-blocking: tăng tốc êm ái
            Serial.println(">> [TRUC 2] Chay lien tuc ra xa Home (FastAccelStepper)...");
          }
        }
        break;

      case 'm': case 'M':
        if (activeAxis == 1) {
          defaultCount1 = getEncoderCount1(); defaultDeg1 = getAngleDeg1();
          prefs.putInt("def_cnt1", defaultCount1); prefs.putFloat("def_deg1", defaultDeg1);
          Serial.printf("\n>> [NVS] Da luu goc mac dinh M1: %+.2f do gian pin (%ld counts)\n", defaultDeg1, (long)defaultCount1);
        } else {
          defaultCount2 = getEncoderCount2(); defaultDeg2 = getAngleDeg2();
          prefs.putInt("def_cnt2", defaultCount2); prefs.putFloat("def_deg2", defaultDeg2);
          Serial.printf("\n>> [NVS] Da luu goc mac dinh M2: %+.2f do gian pin (%ld counts)\n", defaultDeg2, (long)defaultCount2);
        }
        break;

      case '0':
        if (activeAxis == 1) { resetEncoder1(0); Serial.println(">> Set M1 = 0.0°"); }
        else                 { resetEncoder2(0); Serial.println(">> Set M2 = 0.0°"); }
        break;

      case 'i': case 'I':
        if (activeAxis == 1) {
          invertEncoderDir1 = !invertEncoderDir1;
          encoderCount1 = -encoderCount1;
          swEncoderCount1 = -swEncoderCount1;
          prefs.putBool("inv_enc1", invertEncoderDir1);
          ParamRegistry.set("ENC_INVERT_AZ", invertEncoderDir1 ? 1.0f : 0.0f, PARAM_SRC_MANUAL, "MANUAL");
          CalibrationStore.save();
          Serial.printf(">> [ENC 1] Dao chieu dem: %s | Goc hien tai: %+.2f do (%ld counts)\n",
                        invertEncoderDir1 ? "NGHICH (-)" : "THUAN (+)", getAngleDeg1(), (long)encoderCount1);
        } else {
          invertEncoderDir2 = !invertEncoderDir2;
          encoderCount2 = -encoderCount2;
          swEncoderCount2 = -swEncoderCount2;
          prefs.putBool("inv_enc2", invertEncoderDir2);
          ParamRegistry.set("ENC_INVERT_EL", invertEncoderDir2 ? 1.0f : 0.0f, PARAM_SRC_MANUAL, "MANUAL");
          CalibrationStore.save();
          Serial.printf(">> [ENC 2] Dao chieu dem: %s | Goc hien tai: %+.2f do (%ld counts)\n",
                        invertEncoderDir2 ? "NGHICH (-)" : "THUAN (+)", getAngleDeg2(), (long)encoderCount2);
        }
        break;

      // PHÍM G: SINGLE AUTO HOMING CHO TRỤC ĐANG CHỌN
      case 'g': case 'G':
        autoOpticalTracking = false;
        runSingleAutoHoming(activeAxis);
        break;

      // PHÍM H: DUAL AUTO HOMING & VỀ MỐC MẶC ĐỊNH
      case 'h': case 'H':
        autoOpticalTracking = false;
        runDualAutoHoming();
        break;

      // PHÍM V: BẬT / TẮT CHẾ ĐỘ LIVE ENCODER MONITOR
      case 'v': case 'V':
        liveEncoderMonitor = !liveEncoderMonitor;
        if (liveEncoderMonitor || rawEncStream) enableRawEdgeInterrupts();
        else disableRawEdgeInterrupts();
        if (liveEncoderMonitor) {
          Serial.println("\n=======================================================");
          Serial.println(">> [LIVE ENCODER MONITOR: ON] DA BAT THEO DOI ENCODER LIVE!");
          Serial.println("   Xoay truc encoder bang tay -> Moi canh ngat se in ngay lap tuc!");
          Serial.println("   (Bam [V] lan nua de tat).");
          Serial.println("=======================================================\n");
        } else {
          Serial.println("\n>> [LIVE ENCODER MONITOR: OFF] Da tat theo doi live.\n");
        }
        break;

      // CHỈNH TỐC ĐỘ AUTO HOMING [ ] (Hz)
      case ']': case '}':
        autoSpeedHz += 200;
        Serial.printf(">> TANG TOC DO AUTO [G, H]: %lu Hz\n", (unsigned long)autoSpeedHz);
        break;

      case '[': case '{':
        if (autoSpeedHz > 400) autoSpeedHz -= 200;
        Serial.printf(">> GIAM TOC DO AUTO [G, H]: %lu Hz\n", (unsigned long)autoSpeedHz);
        break;

      // CHỈNH BƯỚC VÀ TỐC ĐỘ TAY
      case '+': case '=':
        stepsPerPress += 100;
        Serial.printf(">> TANG SO BUOC TAY: %d buoc/lan\n", stepsPerPress);
        break;

      case '-': case '_':
        if (stepsPerPress > 100) stepsPerPress -= 100;
        Serial.printf(">> GIAM SO BUOC TAY: %d buoc/lan\n", stepsPerPress);
        break;

      case '>': case '.':
        manualSpeedHz += 200;
        if (stepper1) stepper1->setSpeedInHz(manualSpeedHz);
        if (stepper2) stepper2->setSpeedInHz(manualSpeedHz);
        Serial.printf(">> TANG TOC DO TAY: %lu Hz\n", (unsigned long)manualSpeedHz);
        break;

      case '<': case ',':
        if (manualSpeedHz > 400) manualSpeedHz -= 200;
        if (stepper1) stepper1->setSpeedInHz(manualSpeedHz);
        if (stepper2) stepper2->setSpeedInHz(manualSpeedHz);
        Serial.printf(">> GIAM TOC DO TAY: %lu Hz\n", (unsigned long)manualSpeedHz);
        break;

      // PHÍM O: BẬT / TẮT CHẾ ĐỘ BÁM QUANG (OPTICAL TRACKING)
      case 'o': case 'O':
        autoOpticalTracking = !autoOpticalTracking;
        stateM1 = STATE_IDLE; stateM2 = STATE_IDLE;
        if (autoOpticalTracking) {
          currentTrackSource = TRACK_SRC_SENSOR;
          systemFsmState = FSM_STATE_TRACKING;
          Serial.println("\n=======================================================");
          Serial.println(">> [OPTICAL MODE: ON] DA BAT CHE DO TU DONG BAM ANH SANG (SENSOR_ONLY)!");
          Serial.println("   - Lech nhieu (>15%): Chay LIEN TUC ca 2 truc muot ma khong giat");
          Serial.println("   - Gan deu (5%-15%):  Nhich vi chinh tung buoc nho de can bang");
          Serial.println("   - Can bang (<=5%):   Dung yen giu vi tri.");
          Serial.println("=======================================================\n");
        } else {
          currentTrackSource = TRACK_SRC_OFF;
          systemFsmState = FSM_STATE_IDLE;
          Serial.println("\n>> [OPTICAL MODE: OFF] Da tat che do bam anh sang -> Ve Idle.");
          if (stepper1) stepper1->stopMove();
          if (stepper2) stepper2->stopMove();
        }
        break;

      // PHÍM Y: BẬT / TẮT CHẾ ĐỘ TRACK HYBRID (NOAA + TEMT, CHU KỲ 15 PHÚT)
      case 'y': case 'Y':
        if (currentTrackSource == TRACK_SRC_HYBRID) {
          currentTrackSource = TRACK_SRC_OFF;
          autoOpticalTracking = false;
          systemFsmState = FSM_STATE_IDLE;
          if (stepper1) stepper1->stopMove();
          if (stepper2) stepper2->stopMove();
          Serial.println("\n>> [TRACK HYBRID: OFF] Da tat che do Hybrid -> Chuyen ve IDLE.");
        } else {
          currentTrackSource = TRACK_SRC_HYBRID;
          autoOpticalTracking = true;
          trackCyclePhase = TRACK_CYCLE_ADJUSTING;
          isMaxAzimuthReached = false;
          systemFsmState = FSM_STATE_TRACKING;
          Serial.println("\n=======================================================");
          Serial.println(">> [TRACK HYBRID: ON] DA BAT CHE DO HOP NHAT HYBRID!");
          Serial.println("   - Track theo thien van NOAA + Hieu chinh tinh bang TEMT6000.");
          Serial.println("   - Khi on dinh: Dung im giu buoc trong 15 phut roi moi quay tiep.");
          Serial.println("   - Khi cham goc max: Khoa goc dung im giu buoc den 19:00.");
          Serial.println("   - 19:00 toi: Park ve 0°/90° va Light Sleep den 04:00 sang.");
          Serial.println("=======================================================\n");
        }
        break;

      // PHÍM Z: TEST NHANH LIGHT SLEEP 2 PHÚT (MỤC 7)
      case 'z': case 'Z':
        Serial.println("\n>> [PHIM NONG Z] Kich hoat nhanh che do Light Sleep 2 phut...");
        systemFsmState = FSM_STATE_PREP_SLEEP;
        enterNightLightSleep(2);
        systemFsmState = FSM_STATE_IDLE;
        break;

      // PHÍM L: ĐỌC 4 CẢM BIẾN QUANG TEMT6000 LIVE
      case 'l': case 'L':
        printOpticalSensors();
        break;

      // PHÍM C: ĐỌC ĐỒNG HỒ RTC DS3231 & QUÉT I2C
      case 'c': case 'C':
        scanI2CBus();
        printRTCStatus();
        break;

      // PHÍM T: KIỂM TRA MỨC ĐIỆN ÁP LOGIC TẤT CẢ CÁC CHÂN & ĐẾM NGẮT
      case 't': case 'T':
        Serial.println("\n=======================================================");
        Serial.println("  [DIAGNOSTIC] KIEM TRA MUC DIEN AP LIVE TREN ESP32-S3");
        Serial.println("=======================================================");
        Serial.printf(" CTHT 1 (GPIO %2d): %s (Doc: %d)\n", M1_HOME_SW_PIN, isHome1Triggered() ? "CHAM (LOW)" : "HO (HIGH)", digitalRead(M1_HOME_SW_PIN));
        Serial.printf(" CTHT 2 (GPIO %2d): %s (Doc: %d)\n", M2_HOME_SW_PIN, isHome2Triggered() ? "CHAM (LOW)" : "HO (HIGH)", digitalRead(M2_HOME_SW_PIN));
        Serial.printf(" ENC 1 (PCNT Unit 0 - G%2d, G%2d): A=%d (edges: %6lu), B=%d (edges: %6lu) | Cnt: %ld (%+.2f do giang pin)\n",
                      M1_ENC_A_PIN, M1_ENC_B_PIN, digitalRead(M1_ENC_A_PIN), (unsigned long)rawEdges1A, digitalRead(M1_ENC_B_PIN), (unsigned long)rawEdges1B, (long)getEncoderCount1(), getAngleDeg1());
        Serial.printf(" ENC 2 (PCNT Unit 1 - G%2d, G%2d): A=%d (edges: %6lu), B=%d (edges: %6lu) | Cnt: %ld (%+.2f do giang pin)\n",
                      M2_ENC_A_PIN, M2_ENC_B_PIN, digitalRead(M2_ENC_A_PIN), (unsigned long)rawEdges2A, digitalRead(M2_ENC_B_PIN), (unsigned long)rawEdges2B, (long)getEncoderCount2(), getAngleDeg2());
        Serial.printf(" VI TRI ENCODER    : %s (He so: %.4f do/count | %.1f xung/count)\n",
                      (encoderLocation == ENCODER_ON_LOAD) ? "O TAI (TRUC TAM)" :
                      (encoderLocation == ENCODER_ON_MOTOR) ? "O TRUC MOTOR" : "CHUA XAC NHAN (UNKNOWN)",
                      getDegPerCount(), getPulsesPerCount());
        Serial.printf(" DS3231 INT (GPIO %2d): %s\n", DS3231_SQW_PIN, digitalRead(DS3231_SQW_PIN) ? "HIGH (Chua ngat)" : "LOW (Dang kich ngat)");
        printOpticalSensors();
        printRTCStatus();
        Serial.println("=======================================================\n");
        break;

      // PHÍM K: BẬT / TẮT STREAM MỨC LOGIC THÔ & ĐẾM CẠNH (200ms)
      case 'k': case 'K':
        rawEncStream = !rawEncStream;
        if (liveEncoderMonitor || rawEncStream) enableRawEdgeInterrupts();
        else disableRawEdgeInterrupts();
        Serial.printf("\n>> [RAW ENCODER STREAM: %s] %s\n",
                      rawEncStream ? "ON" : "OFF",
                      rawEncStream ? "Dang in muc logic tho & so canh rieng Pha A/B moi 200ms... (Bam 'k' hoac go 'raw' de tat)" : "Da tat stream.");
        break;

      case 'r': case 'R': case '?':
        printMenu();
        break;

      default:
        break;
    }
    Serial.print("\n[CLI]> ");
  }

  // THEO DÕI LIVE ENCODER KHI BẬT CHẾ ĐỘ PHÍM V (PCNT HARDWARE COUNTS)
  static int32_t lastLiveCnt1 = 0, lastLiveCnt2 = 0;
  if (liveEncoderMonitor) {
    int32_t curC1 = getEncoderCount1();
    int32_t curC2 = getEncoderCount2();
    if (curC1 != lastLiveCnt1 || curC2 != lastLiveCnt2) {
      lastLiveCnt1 = curC1; lastLiveCnt2 = curC2;
      Serial.printf(">> [PCNT LIVE] M1(G%d,%d): %-5ld (%+5.1f°) | M2(G%d,%d): %-5ld (%+5.1f°)\n",
                    M1_ENC_A_PIN, M1_ENC_B_PIN, (long)curC1, getAngleDeg1(),
                    M2_ENC_A_PIN, M2_ENC_B_PIN, (long)curC2, getAngleDeg2());
    }
  }

  // 0. TỰ ĐỘNG NGỦ ĐÊM (TỪ 19:00 TỐI ĐẾN 04:00 SÁNG) THEO ĐỒNG HỒ RTC DS3231
  static unsigned long lastNightCheckMs = 0;
  if (millis() - lastNightCheckMs >= 5000) {
    lastNightCheckMs = millis();
    int curY = 0, curM = 0, curD = 0, curH = 0, curMin = 0, curS = 0;
    float curTemp = 0.0f;
    if (readDS3231(curY, curM, curD, curH, curMin, curS, curTemp)) {
      if ((curH >= 19 || curH < 4) && (millis() - lastSerialCharMs >= 30000)) {
        if (stateM1 == STATE_IDLE && stateM2 == STATE_IDLE) {
          enterNightSleepUntil4AM();
        }
      }
    }
  }

  // B. XỬ LÝ CÁC CHẾ ĐỘ TỰ ĐỘNG BÁM MẶT TRỜI (NOAA EPHEMERIS / SENSOR / HYBRID)
  static unsigned long lastOpticalLogTime = 0;
  static unsigned long lastSolarTrackTime = 0;
  static unsigned long lastSolarLogTime   = 0;

  if (autoOpticalTracking || currentTrackSource != TRACK_SRC_OFF) {
    if (currentTrackSource == TRACK_SRC_SENSOR || currentTrackSource == TRACK_SRC_OFF) {
      if (millis() - lastOpticalTrackTime >= 100) { // Chu kỳ bám 100ms
      lastOpticalTrackTime = millis();
      OpticalData opt = readOpticalSensors();

      if (opt.avg < OPTICAL_NIGHT_THRESHOLD) {
        // Quá tối, không quay lung tung
        if (millis() - lastOpticalLogTime >= 3000) {
          lastOpticalLogTime = millis();
          Serial.printf(">> [OPTICAL TRACKING] Troi toi (AVG=%d < %d) -> Tam dung quay de tiet kiem nang luong.\n",
                        opt.avg, OPTICAL_NIGHT_THRESHOLD);
        }
        if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
        if (stepper2 && stepper2->isRunning()) stepper2->stopMove();
      } else {
        // -----------------------------------------------------------------
        // 1. TRỤC AZIMUTH (M1): CHẠY LIÊN TỤC KHI LỆCH NHIỀU (>15%), NHÍCH KHI GẦN ĐỀU (5%-15%), DỪNG KHI CÂN BẰNG (<=5%)
        // -----------------------------------------------------------------
        float absErrAz = fabs(opt.normDiffAz);
        if (absErrAz <= OPTICAL_NORM_DEADBAND) {
          // VÙNG CÂN BẰNG: Dừng êm
          if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
        } else if (absErrAz <= OPTICAL_FINE_THRESHOLD) {
          // VÙNG GẦN ĐỀU (5% .. 15%): NHÍCH TỪNG BƯỚC NHỎ ĐỂ HIỆU CHỈNH DẦN
          if (stepper1) {
            if (stepper1->isRunningContinuously()) {
              stepper1->stopMove(); // Nếu đang chạy liên tục thì hãm dừng trước khi chuyển sang nhích
            } else if (!stepper1->isRunning()) {
              float ratioFineAz = (absErrAz - OPTICAL_NORM_DEADBAND) / (OPTICAL_FINE_THRESHOLD - OPTICAL_NORM_DEADBAND);
              uint32_t speedAz = 600 + (uint32_t)(ratioFineAz * 400); // 600 .. 1000 Hz
              int32_t  stepsAz = 30 + (int32_t)(ratioFineAz * 50);    // 30 .. 80 bước (~0.14° .. 0.38°)

              stepper1->setSpeedInHz(speedAz);
              stepper1->setAcceleration(stepperAccel);

              if (opt.normDiffAz > 0) {
                // Ánh sáng lệch trái -> Quay về phía Home (âm)
                if (isHome1Triggered()) {
                  if (millis() - lastOpticalLogTime >= 2000) {
                    lastOpticalLogTime = millis();
                    Serial.println(">> [TRACKING M1] Anh sang huong ve Home nhung da CHAM CTHT 1 -> Khoa!");
                  }
                } else {
                  stepper1->move(-stepsAz);
                }
              } else {
                // Ánh sáng lệch phải -> Quay ra xa Home (dương)
                if (getAngleDeg1() >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
                  if (millis() - lastOpticalLogTime >= 2000) {
                    lastOpticalLogTime = millis();
                    Serial.printf(">> [TRACKING M1] Da CHAM GIOI HAN MEM Tay (%+.1f°) -> Khoa chieu quay ra xa!\n", CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
                  }
                } else {
                  stepper1->move(stepsAz);
                }
              }
            }
          }
        } else {
          // VÙNG LỆCH HẲN 1 BÊN (> 15%): CHẠY LIÊN TỤC MƯỢT MÀ KHÔNG GIẬT
          if (stepper1) {
            float ratioContAz = (absErrAz - OPTICAL_FINE_THRESHOLD) / (1.0f - OPTICAL_FINE_THRESHOLD);
            if (ratioContAz > 1.0f) ratioContAz = 1.0f;
            uint32_t speedAz = 1200 + (uint32_t)(ratioContAz * 3300); // 1200 .. 4500 Hz tỉ lệ theo độ lệch

            stepper1->setSpeedInHz(speedAz);
            stepper1->setAcceleration(stepperAccel);

            if (opt.normDiffAz > 0) {
              // Ánh sáng lệch trái -> Chạy liên tục về phía Home (runBackward)
              if (isHome1Triggered()) {
                if (stepper1->isRunning()) stepper1->stopMove();
                if (millis() - lastOpticalLogTime >= 2000) {
                  lastOpticalLogTime = millis();
                  Serial.println(">> [TRACKING M1] Anh sang huong ve Home nhung da CHAM CTHT 1 -> Khoa!");
                }
              } else {
                if (stepper1->isRunning() && (stepper1->rampState() & RAMP_DIRECTION_COUNT_DOWN)) {
                  stepper1->applySpeedAcceleration(); // Cập nhật tốc độ mượt mà không khựng lại
                } else {
                  stepper1->runBackward(); // Bắt đầu chạy liên tục êm ái
                }
              }
            } else {
              // Ánh sáng lệch phải -> Chạy liên tục ra xa Home (runForward)
              if (getAngleDeg1() >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
                if (stepper1->isRunning()) stepper1->stopMove();
                if (millis() - lastOpticalLogTime >= 2000) {
                  lastOpticalLogTime = millis();
                  Serial.printf(">> [TRACKING M1] Da CHAM GIOI HAN MEM Tay (%+.1f°) -> Khoa chieu quay ra xa!\n", CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
                }
              } else {
                if (stepper1->isRunning() && (stepper1->rampState() & RAMP_DIRECTION_COUNT_UP)) {
                  stepper1->applySpeedAcceleration(); // Cập nhật tốc độ mượt mà không khựng lại
                } else {
                  stepper1->runForward(); // Bắt đầu chạy liên tục êm ái
                }
              }
            }
          }
        }

        // -----------------------------------------------------------------
        // 2. TRỤC ELEVATION (M2): CHẠY LIÊN TỤC KHI LỆCH NHIỀU (>15%), NHÍCH KHI GẦN ĐỀU (5%-15%), DỪNG KHI CÂN BẰNG (<=5%) - ĐỒNG THỜI
        // -----------------------------------------------------------------
        float absErrEl = fabs(opt.normDiffEl);
        if (absErrEl <= OPTICAL_NORM_DEADBAND) {
          // VÙNG CÂN BẰNG: Dừng êm
          if (stepper2 && stepper2->isRunning()) stepper2->stopMove();
        } else if (absErrEl <= OPTICAL_FINE_THRESHOLD) {
          // VÙNG GẦN ĐỀU (5% .. 15%): NHÍCH TỪNG BƯỚC NHỎ ĐỂ HIỆU CHỈNH DẦN
          if (stepper2) {
            if (stepper2->isRunningContinuously()) {
              stepper2->stopMove(); // Nếu đang chạy liên tục thì hãm dừng trước khi chuyển sang nhích
            } else if (!stepper2->isRunning()) {
              float ratioFineEl = (absErrEl - OPTICAL_NORM_DEADBAND) / (OPTICAL_FINE_THRESHOLD - OPTICAL_NORM_DEADBAND);
              uint32_t speedEl = 600 + (uint32_t)(ratioFineEl * 400); // 600 .. 1000 Hz
              int32_t  stepsEl = 30 + (int32_t)(ratioFineEl * 40);    // 30 .. 70 bước (~0.14° .. 0.32°)

              stepper2->setSpeedInHz(speedEl);
              stepper2->setAcceleration(stepperAccel);

              if (opt.normDiffEl > 0) {
                // Ánh sáng lệch trên (Top > Bot) -> Ngửa lên về phía Home (xung âm, tăng Epsilon)
                if (isHome2Triggered() || getElevationEpsilon() >= CFG_J_EL_MAX_SOFT_LIMIT_DEG) {
                  if (millis() - lastOpticalLogTime >= 2000) {
                    lastOpticalLogTime = millis();
                    Serial.printf(">> [TRACKING M2] Da CHAM GIOI HAN MEM Ngua (%+.1f°) hoac CTHT 2 -> Khoa!\n", CFG_J_EL_MAX_SOFT_LIMIT_DEG);
                  }
                } else {
                  stepper2->move(-stepsEl);
                }
              } else {
                // Ánh sáng lệch dưới (Bot > Top) -> Hạ thấp ra xa Home (xung dương, giảm Epsilon)
                if (getElevationEpsilon() <= CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
                  if (millis() - lastOpticalLogTime >= 2000) {
                    lastOpticalLogTime = millis();
                    Serial.printf(">> [TRACKING M2] Da CHAM GIOI HAN MEM Ha Thap (%+.1f° - Chong can khung Z) -> Khoa!\n", CFG_L_EL_MIN_SOFT_LIMIT_DEG);
                  }
                } else {
                  stepper2->move(stepsEl);
                }
              }
            }
          }
        } else {
          // VÙNG LỆCH HẲN 1 BÊN (> 15%): CHẠY LIÊN TỤC MƯỢT MÀ KHÔNG GIẬT
          if (stepper2) {
            float ratioContEl = (absErrEl - OPTICAL_FINE_THRESHOLD) / (1.0f - OPTICAL_FINE_THRESHOLD);
            if (ratioContEl > 1.0f) ratioContEl = 1.0f;
            uint32_t speedEl = 1000 + (uint32_t)(ratioContEl * 3000); // 1000 .. 4000 Hz tỉ lệ theo độ lệch

            stepper2->setSpeedInHz(speedEl);
            stepper2->setAcceleration(stepperAccel);

            if (opt.normDiffEl > 0) {
              // Ánh sáng lệch trên (Top > Bot) -> Chạy liên tục ngửa lên về Home (runBackward, tăng Epsilon)
              if (isHome2Triggered() || getElevationEpsilon() >= CFG_J_EL_MAX_SOFT_LIMIT_DEG) {
                if (stepper2->isRunning()) stepper2->stopMove();
                if (millis() - lastOpticalLogTime >= 2000) {
                  lastOpticalLogTime = millis();
                  Serial.printf(">> [TRACKING M2] Da CHAM GIOI HAN MEM Ngua (%+.1f°) hoac CTHT 2 -> Khoa!\n", CFG_J_EL_MAX_SOFT_LIMIT_DEG);
                }
              } else {
                if (stepper2->isRunning() && (stepper2->rampState() & RAMP_DIRECTION_COUNT_DOWN)) {
                  stepper2->applySpeedAcceleration(); // Cập nhật tốc độ mượt mà không khựng lại
                } else {
                  stepper2->runBackward(); // Bắt đầu chạy liên tục ngửa lên êm ái
                }
              }
            } else {
              // Ánh sáng lệch dưới (Bot > Top) -> Chạy liên tục hạ thấp ra xa Home (runForward, giảm Epsilon)
              if (getElevationEpsilon() <= CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
                if (stepper2->isRunning()) stepper2->stopMove();
                if (millis() - lastOpticalLogTime >= 2000) {
                  lastOpticalLogTime = millis();
                  Serial.printf(">> [TRACKING M2] Da CHAM GIOI HAN MEM Ha Thap (%+.1f° - Chong can khung Z) -> Khoa!\n", CFG_L_EL_MIN_SOFT_LIMIT_DEG);
                }
              } else {
                if (stepper2->isRunning() && (stepper2->rampState() & RAMP_DIRECTION_COUNT_UP)) {
                  stepper2->applySpeedAcceleration(); // Cập nhật tốc độ mượt mà không khựng lại
                } else {
                  stepper2->runForward(); // Bắt đầu chạy liên tục hạ thấp êm ái
                }
              }
            }
          }
        }

        // In telemetry tracking định kỳ mỗi 800ms
        if (millis() - lastOpticalLogTime >= 800) {
          lastOpticalLogTime = millis();
          const char* m1Status = (absErrAz <= OPTICAL_NORM_DEADBAND) ? "CAN BANG" :
                                 (absErrAz <= OPTICAL_FINE_THRESHOLD ? "NHICH" : "LIEN TUC");
          const char* m2Status = (absErrEl <= OPTICAL_NORM_DEADBAND) ? "CAN BANG" :
                                 (absErrEl <= OPTICAL_FINE_THRESHOLD ? "NHICH" : "LIEN TUC");
          Serial.printf(">> [PROPORTIONAL TRACK] dAZ=%+5.1f%% [%s] | dEL=%+5.1f%% [%s] | Goc: Az=%+.1f°, El=%+.1f°\n",
                        opt.normDiffAz * 100.0f, m1Status,
                        opt.normDiffEl * 100.0f, m2Status,
                        getAngleDeg1(), getElevationEpsilon());
        }
      }
    }
  } else if (currentTrackSource == TRACK_SRC_EPHEMERIS || currentTrackSource == TRACK_SRC_HYBRID) {
    // -------------------------------------------------------------------------
    // BÁM MẶT TRỜI HYBRID (NOAA + TEMT6000): ĐIỀU CHỈNH ỔN ĐỊNH -> GIỮ BƯỚC 15P -> ĐẠT MAX THÌ GIỮ ĐẾN 19:00
    // -------------------------------------------------------------------------
    float maxAzLimit = CFG_I_AZ_MAX_SOFT_LIMIT_DEG;
    float deadbandDeg = ParamRegistry.get("POS_PID_DEADBAND_DEG", 0.45f);
    float safeMaxAz = maxAzLimit - 0.2f;

    // 1. TRƯỜNG HỢP ĐÃ ĐẠT GÓC MAX (Buổi chiều sau khi quay hết hành trình cho phép):
    // Giữ nguyên vị trí đó, không quay nhấp nháy, đứng im giữ bước đến 19:00
    if (isMaxAzimuthReached) {
      if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
      if (stepper2 && stepper2->isRunning()) stepper2->stopMove();
      systemFsmState = FSM_STATE_TRACKING;

      static unsigned long lastMaxHoldLogMs = 0;
      if (millis() - lastMaxHoldLogMs >= 30000) {
        lastMaxHoldLogMs = millis();
        Serial.printf(">> [MAX ANGLE HOLD] Gian pin dang GIU BUOC tai goc toi da (Phi=%+.1f° / Max=%+.1f°). Khoa goc dung im den 19:00 toi!\n",
                      getAngleDeg1(), maxAzLimit);
      }
    }
    // 2. TRƯỜNG HỢP ĐANG TRONG THỜI GIAN GIỮ BƯỚC 15 PHÚT (HOLD 15 MIN):
    else if (trackCyclePhase == TRACK_CYCLE_HOLD) {
      if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
      if (stepper2 && stepper2->isRunning()) stepper2->stopMove();
      systemFsmState = FSM_STATE_TRACKING;

      unsigned long holdDuration = (unsigned long)ParamRegistry.get("TRACK_INTERVAL_MS", 900000.0f); // Mặc định 15 phút (900,000 ms)
      unsigned long elapsedHold = millis() - trackHoldStartTimeMs;

      if (elapsedHold >= holdDuration) {
        // Hết 15 phút giữ bước -> Kích hoạt chu kỳ tính toán và điều chỉnh mới
        trackCyclePhase = TRACK_CYCLE_ADJUSTING;
        Serial.println("\n>> [TRACK 15-MIN CYCLE] Da het 15 phut dung im! Bat dau chu ky tinh toan NOAA + TEMT6000 va dieu chinh vi tri moi...");
      } else {
        static unsigned long lastHoldLogMs = 0;
        if (millis() - lastHoldLogMs >= 15000) { // Mỗi 15 giây thông báo 1 lần
          lastHoldLogMs = millis();
          unsigned long remainSec = (holdDuration - elapsedHold) / 1000UL;
          Serial.printf(">> [HOLD 15-MIN] Dang giu buoc on dinh: Az=%+.1f°, El=%+.1f° | Chu ky quay tiep theo sau: %02lu:%02lu\n",
                        getAngleDeg1(), getElevationEpsilon(),
                        remainSec / 60, remainSec % 60);
        }
      }
    }
    // 3. TRƯỜNG HỢP ĐANG ĐIỀU CHỈNH VỊ TRÍ THEO NOAA + TEMT6000:
    else {
      static unsigned long lastSolarCalcTime = 0;
      if (millis() - lastSolarCalcTime >= 500) {
        lastSolarCalcTime = millis();

        float targetAz = 0.0f, targetEl = 0.0f;
        float azSun = 0.0f, elSun = 0.0f, zenSun = 0.0f, ws = 0.0f;
        bool isDaylight = false;

        if (computeSolarTrackingTargets(targetAz, targetEl, azSun, elSun, zenSun, ws, isDaylight)) {
          if (!isDaylight || elSun < 0.0f) {
            if (systemFsmState != FSM_STATE_PARK) {
              Serial.println("\n>> [AUTO PARK] Mat troi da lan duoi chan troi (el < 0°) -> Tu dong dua gian pin ve the Park!");
              parkPanels();
            }
          } else {
            systemFsmState = FSM_STATE_TRACKING;

            // Kiểm tra giới hạn mềm cận trên Azimuth
            bool azHitMax = false;
            if (targetAz >= safeMaxAz) {
              targetAz = safeMaxAz;
              if (getAngleDeg1() >= safeMaxAz - deadbandDeg) {
                azHitMax = true;
              }
            }

            // Phát lệnh điều khiển vị trí
            bool m1Done = stepPositionControl(1, targetAz);
            bool m2Done = stepPositionControl(2, targetEl);

            // Nếu đã chạm góc max thì Trục 1 xem như đã hoàn thành
            if (azHitMax) {
              m1Done = true;
              if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
            }

            bool motorsStopped = (!stepper1 || !stepper1->isRunning()) && (!stepper2 || !stepper2->isRunning());

            // ĐÁNH GIÁ ĐIỀU KIỆN ỔN ĐỊNH CÂN BẰNG:
            if (m1Done && m2Done && motorsStopped) {
              if (azHitMax) {
                isMaxAzimuthReached = true;
                Serial.printf("\n>> [MAX ANGLE REACHED] Gian pin da dat goc toi da cho phep (Phi=%+.1f° >= %+.1f°). DUNG IM GIU BUOC DEN 19:00!\n",
                              getAngleDeg1(), maxAzLimit);
              } else {
                trackCyclePhase = TRACK_CYCLE_HOLD;
                trackHoldStartTimeMs = millis();
                Serial.printf("\n>> [TRACK STEADY] Da can bang on dinh tai Az=%+.1f°, El=%+.1f°! DUNG IM GIU BUOC trong 15 phut...\n",
                              getAngleDeg1(), getElevationEpsilon());
              }
            } else {
              if (millis() - lastSolarLogTime >= 1500) {
                lastSolarLogTime = millis();
                Serial.printf(">> [%s TRACK] Sun: Az=%+5.1f°, El=%+5.1f° | Tgt: Az=%+5.1f°, El=%+5.1f° | Act: Az=%+5.1f°, El=%+5.1f° | Err: dAz=%+5.2f°, dEl=%+5.2f° (ws=%.2f)\n",
                              (currentTrackSource == TRACK_SRC_HYBRID) ? "HYBRID" : "EPHEMERIS",
                              azSun, elSun, targetAz, targetEl,
                              getAngleDeg1(), getElevationEpsilon(),
                              targetAz - getAngleDeg1(), targetEl - getElevationEpsilon(),
                              ws);
              }
            }
          }
        }
      }
    }
  }
}

  // C. GIÁM SÁT AN TOÀN VÀ CÔNG TẮC HÀNH TRÌNH HOME & GIỚI HẠN MỀM CHO M1 & M2 (NON-BLOCKING)
  if (stepper1) {
    if (isHome1Triggered()) {
      if (stateM1 == STATE_MANUAL_TOWARD_HOME || (stepper1->isRunning() && (stepper1->rampState() & RAMP_DIRECTION_COUNT_DOWN))) {
        stepper1->forceStopAndNewPosition(0);
        resetEncoder1(0);
        stateM1 = STATE_IDLE;
        Serial.println("\n>> [HOME TRIGGER TRUC 1] Da cham CTHT 1 -> DUNG & SET GOC 0.0°!");
      }
    }
    // Giám sát giới hạn mềm cận trên trục 1 (phi >= 270.0°)
    if (getAngleDeg1() >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
      if (stateM1 == STATE_MANUAL_AWAY_HOME || (stepper1->isRunning() && (stepper1->rampState() & RAMP_DIRECTION_COUNT_UP))) {
        stepper1->stopMove();
        stateM1 = STATE_IDLE;
        Serial.printf("\n>> [GIOI HAN MEM TRUC 1] Phi = %+.1f° >= %+.1f° -> DUNG DE CHONG XOAN CAP!\n",
                      getAngleDeg1(), CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
      }
    }
    if (stateM1 != STATE_IDLE && stateM1 != STATE_AUTO_HOMING && stateM1 != STATE_AUTO_SEEK_DEFAULT) {
      if (!stepper1->isRunning()) stateM1 = STATE_IDLE;
    }
  }

  if (stepper2) {
    if (isHome2Triggered()) {
      if (stateM2 == STATE_MANUAL_TOWARD_HOME || (stepper2->isRunning() && (stepper2->rampState() & RAMP_DIRECTION_COUNT_DOWN))) {
        stepper2->forceStopAndNewPosition(0);
        resetEncoder2(0);
        stateM2 = STATE_IDLE;
        Serial.println("\n>> [HOME TRIGGER TRUC 2] Da cham CTHT 2 -> DUNG & SET EPSILON = 90.0°!");
      }
    }
    // Giám sát giới hạn mềm cận trên trục 2 (epsilon >= SOFT_MAX_EL, ngửa lên về Home)
    if (getElevationEpsilon() >= CFG_J_EL_MAX_SOFT_LIMIT_DEG) {
      if (stateM2 == STATE_MANUAL_TOWARD_HOME || (stepper2->isRunning() && (stepper2->rampState() & RAMP_DIRECTION_COUNT_DOWN))) {
        stepper2->stopMove();
        stateM2 = STATE_IDLE;
        Serial.printf("\n>> [GIOI HAN MEM TRUC 2] Epsilon = %+.1f° >= %+.1f° -> DUNG DE CHONG QUA GOC!\n",
                      getElevationEpsilon(), CFG_J_EL_MAX_SOFT_LIMIT_DEG);
      }
    }
    // Giám sát giới hạn mềm cận dưới trục 2 (epsilon <= 25.0°)
    if (getElevationEpsilon() <= CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
      if (stateM2 == STATE_MANUAL_AWAY_HOME || (stepper2->isRunning() && (stepper2->rampState() & RAMP_DIRECTION_COUNT_UP))) {
        stepper2->stopMove();
        stateM2 = STATE_IDLE;
        Serial.printf("\n>> [GIOI HAN MEM TRUC 2] Epsilon = %+.1f° <= %+.1f° -> DUNG DE CHONG CAN TRUC Z!\n",
                      getElevationEpsilon(), CFG_L_EL_MIN_SOFT_LIMIT_DEG);
      }
    }
    if (stateM2 != STATE_IDLE && stateM2 != STATE_AUTO_HOMING && stateM2 != STATE_AUTO_SEEK_DEFAULT) {
      if (!stepper2->isRunning()) stateM2 = STATE_IDLE;
    }
  }

  // C. IN DINH KY 200ms MUC LOGIC THO & SO SANH SONG SONG PCNT (HW) VS LOOKUP TABLE (SW)
  static unsigned long lastRawStreamMs = 0;
  if (rawEncStream && (millis() - lastRawStreamMs >= 200)) {
    lastRawStreamMs = millis();
    int32_t hwCnt1 = getEncoderCount1();
    int32_t hwCnt2 = getEncoderCount2();
    bool match1 = (hwCnt1 == swEncoderCount1);
    bool match2 = (hwCnt2 == swEncoderCount2);

    Serial.printf("[ENC1-AZ] A(G%2d): %d (eA:%5lu) | B(G%2d): %d (eB:%5lu) | HW:%6ld | SW:%6ld | %s\n",
                  M1_ENC_A_PIN, digitalRead(M1_ENC_A_PIN), (unsigned long)rawEdges1A,
                  M1_ENC_B_PIN, digitalRead(M1_ENC_B_PIN), (unsigned long)rawEdges1B,
                  (long)hwCnt1, (long)swEncoderCount1, match1 ? "MATCH (OK)" : "MISMATCH (!)");
    Serial.printf("[ENC2-EL] A(G%2d): %d (eA:%5lu) | B(G%2d): %d (eB:%5lu) | HW:%6ld | SW:%6ld | %s\n",
                  M2_ENC_A_PIN, digitalRead(M2_ENC_A_PIN), (unsigned long)rawEdges2A,
                  M2_ENC_B_PIN, digitalRead(M2_ENC_B_PIN), (unsigned long)rawEdges2B,
                  (long)hwCnt2, (long)swEncoderCount2, match2 ? "MATCH (OK)" : "MISMATCH (!)");
  }

}
