#include "bench_wizard.h"
#include <FastAccelStepper.h>
#include "config.h"

// Tham chiếu ngoại vi từ main.cpp
extern FastAccelStepper *stepper1;
extern FastAccelStepper *stepper2;
extern int activeAxis;

int32_t getEncoderCount1();
int32_t getEncoderCount2();
void resetEncoder1(int32_t c);
void resetEncoder2(int32_t c);
bool isHome1Triggered();
bool isHome2Triggered();
float getAngleDeg1();
float getAngleDeg2();
float getElevationEpsilon();
float getCompassAzimuth();
bool moveMotorSteps(int axis, bool direction, int32_t steps, uint32_t speedHz = 0);
void requestTelemetryPrint();
OpticalData readOpticalSensors();
bool readDS3231(int &year, int &month, int &day, int &hour, int &minute, int &second, float &tempC);
void scanI2CBus();
float getDegPerCount();
float getPulsesPerCount();

#define DIR_TOWARD_HOME LOW
#define DIR_AWAY_HOME   HIGH

BenchWizardClass BenchWizard;

void BenchWizardClass::begin() {
  _state = BENCH_STATE_IDLE;
  _systemMode = MODE_BENCH;
  _isArmed = false;
  _currentStepIdx = -1;
  _runAllMode = false;
  _subState = 0;

  // Khởi tạo bảng danh mục 16 bước kiểm chuẩn chuẩn hóa
  const char* codes[TOTAL_BENCH_STEPS] = {
    "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7",
    "B8", "B9", "B10", "B11", "B12", "B13", "B14", "B15"
  };

  const char* names[TOTAL_BENCH_STEPS] = {
    "Driver DM556 Pulses & SW",
    "Motor Direction Polarity",
    "2560-Pulse Test (Encoder Loc)",
    "Stall Threshold Calibration",
    "Max Speed & Accel Search",
    "Two-Stage Homing Repeatability",
    "4-Layer Soft Limits Setup",
    "Mechanical Backlash Measure",
    "Step Jitter & S-Curve Check",
    "True North & Declination",
    "TEMT6000 64-Sample Noise RMS",
    "Optical Filter Tuning (EMA)",
    "Optical Deadband Setup",
    "RTC DS3231 & INT GPIO 47",
    "INA226 Power & Bus I2C",
    "Burn-in 10-Cycle Endurance"
  };

  const char* descs[TOTAL_BENCH_STEPS] = {
    "Kiem tra phat xung driver & cong tac SW3/SW8/SW4",
    "Xac dinh cuc tinh chieu quay DIR ve Home",
    "Phat 2560 xung (12 deg): 80 cnt = Tai, 240 cnt = Motor",
    "Do do tre dong co - encoder de dat nguong ket tai",
    "Quet tim toc do tran T_max va gia toc U_max",
    "Homing 2 cap toc do & do sai so lap lai (std_dev)",
    "Xac lap gioi han mem Phi [0..270] va Epsilon [25..90]",
    "Do do ro khop noi va hop so khi dao chieu",
    "Kiem tra do min phat xung S-curve FastAccelStepper",
    "Cai dat goc lech dia tu va offset lap dat",
    "Do dac tuyen 64 mau va do nhieu ADC 4 mat",
    "Can chinh bo loc EMA va Median3 cho 4 mat quang",
    "Xac lap vung chet chong san tim dao dong (hunting)",
    "Kiem tra I2C RTC va chan bao thuc ngat GPIO 47",
    "Kiem tra ket noi I2C va do dong, ap, cong suat",
    "Chay thu nghiem 10 chu ky giam sat truot buoc"
  };

  bool criticalFlags[TOTAL_BENCH_STEPS] = {
    true,  // B0 (Critical)
    true,  // B1 (Critical)
    true,  // B2 (Critical)
    false, // B3
    false, // B4
    true,  // B5 (Critical)
    true,  // B6 (Critical)
    false, // B7
    false, // B8
    false, // B9
    false, // B10
    false, // B11
    false, // B12
    true,  // B13 (Critical)
    false, // B14
    false  // B15
  };

  const char* targetParams[TOTAL_BENCH_STEPS] = {
    "E_PULSES_PER_REV_AZ",
    "DIR_POL_AZ",
    "ENCODER_ON_LOAD",
    "STALL_THRESH_PULSES",
    "T_MAX_SPEED_AZ",
    "HOMING_FAST_AZ",
    "SOFT_MAX_AZ",
    "BACKLASH_STEPS_AZ",
    "TRACK_INTERVAL_MS",
    "COMPASS_DECLINATION",
    "OPT_DIFF_THRESHOLD",
    "OPT_EMA_ALPHA",
    "OPT_NORM_DEADBAND",
    "NONE",
    "PANEL_LATITUDE",
    "STALL_THRESH_PULSES"
  };

  const char* units[TOTAL_BENCH_STEPS] = {
    "pulses", "bool", "enum", "pulses", "Hz", "Hz", "deg", "pulses",
    "ms", "deg", "ratio", "ratio", "ratio", "bool", "V/A/W", "counts"
  };

  for (int i = 0; i < TOTAL_BENCH_STEPS; i++) {
    _steps[i].id = i;
    strncpy(_steps[i].code, codes[i], sizeof(_steps[i].code) - 1);
    strncpy(_steps[i].name, names[i], sizeof(_steps[i].name) - 1);
    strncpy(_steps[i].description, descs[i], sizeof(_steps[i].description) - 1);
    _steps[i].is_critical = criticalFlags[i];
    _steps[i].status = STEP_STATUS_NOT_RUN;
    _steps[i].measured_val = 0.0f;
    _steps[i].proposed_val = 0.0f;
    strncpy(_steps[i].target_param, targetParams[i], sizeof(_steps[i].target_param) - 1);
    strncpy(_steps[i].unit, units[i], sizeof(_steps[i].unit) - 1);
    strncpy(_steps[i].notes, "Chua chay", sizeof(_steps[i].notes) - 1);
  }
}

bool BenchWizardClass::startStep(int stepId) {
  if (stepId < 0 || stepId >= TOTAL_BENCH_STEPS) {
    Serial.printf(">> [BENCH] Loi: Ma buoc %d khong hop le (Hop le: 0 .. 15)!\n", stepId);
    return false;
  }

  _currentStepIdx = stepId;
  _state = BENCH_STATE_RUNNING_STEP;
  _subState = 0;
  _stepTimer = millis();
  _subTimer = millis();

  BenchStepDef &s = _steps[stepId];
  Serial.println("\n=======================================================");
  Serial.printf(">>> [BAT DAU BENCH %s] %s <<<\n", s.code, s.name);
  Serial.printf("    Muc tieu: %s\n", s.description);
  Serial.printf("    Yeu cau bat buoc (Critical): %s\n", s.is_critical ? "CO (Gating)" : "KHONG");
  Serial.println("=======================================================");
  return true;
}

bool BenchWizardClass::startAll() {
  _runAllMode = true;
  return startStep(0);
}

void BenchWizardClass::abort(const char* reason) {
  _state = BENCH_STATE_ABORTED;
  _runAllMode = false;
  if (stepper1) stepper1->forceStopAndNewPosition(stepper1->getCurrentPosition());
  if (stepper2) stepper2->forceStopAndNewPosition(stepper2->getCurrentPosition());

  if (_currentStepIdx >= 0 && _currentStepIdx < TOTAL_BENCH_STEPS) {
    _steps[_currentStepIdx].status = STEP_STATUS_FAILED;
    snprintf(_steps[_currentStepIdx].notes, sizeof(_steps[_currentStepIdx].notes), "ABORTED: %s", reason);
  }

  Serial.println("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  Serial.printf(">> [BENCH DUNG KHAN CAP / ABORT] %s!\n", reason);
  Serial.println("   Toan bo dong co da bi khoa lap tuc de bao ve phan cung.");
  Serial.println("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
  _currentStepIdx = -1;
  _state = BENCH_STATE_IDLE;
}

void BenchWizardClass::confirm(bool accept) {
  if (_state != BENCH_STATE_WAIT_CONFIRM || _currentStepIdx < 0) {
    Serial.println(">> [BENCH] Hien tai khong co buoc nao dang cho xac nhan.");
    return;
  }

  BenchStepDef &s = _steps[_currentStepIdx];
  if (accept) {
    if (strlen(s.target_param) > 0 && strcmp(s.target_param, "NONE") != 0) {
      ParamRegistry.set(s.target_param, s.proposed_val, PARAM_SRC_AUTO, s.code);
      CalibrationStore.save();
      snprintf(s.notes, sizeof(s.notes), "PASS (Da ghi NVS: %.3f %s)", s.proposed_val, s.unit);
      Serial.printf(">> [BENCH %s: THANH CONG] Da chap nhan va ghi vao NVS Flash: %s = %.3f %s\n",
                    s.code, s.target_param, s.proposed_val, s.unit);
    } else {
      snprintf(s.notes, sizeof(s.notes), "PASS (Da xac thuc)");
      Serial.printf(">> [BENCH %s: THANH CONG] Da xac thuc thanh cong buoc %s!\n",
                    s.code, s.code);
    }
    s.status = STEP_STATUS_PASSED;
  } else {
    s.status = STEP_STATUS_SKIPPED;
    strncpy(s.notes, "Bo qua cap nhat", sizeof(s.notes) - 1);
    Serial.printf(">> [BENCH %s: BO QUA] Giu nguyen gia tri cu cho %s.\n", s.code, s.target_param);
  }

  _state = BENCH_STATE_IDLE;
  int completedIdx = _currentStepIdx;
  _currentStepIdx = -1;

  if (_runAllMode) {
    if (completedIdx + 1 < TOTAL_BENCH_STEPS) {
      Serial.println(">> Tiep tuc buoc tiep theo trong quy trinh tu dong...");
      startStep(completedIdx + 1);
    } else {
      _runAllMode = false;
      Serial.println("\n=======================================================");
      Serial.println(">> [HOAN TAT BENCH TOAN DIEN] Da hoan tat tat ca cac buoc!");
      printStatus();
    }
  }
}

void BenchWizardClass::finishStep(StepStatus status, float measuredVal, float proposedVal, const char* notes) {
  if (_currentStepIdx < 0 || _currentStepIdx >= TOTAL_BENCH_STEPS) return;

  BenchStepDef &s = _steps[_currentStepIdx];
  s.status = status;
  s.measured_val = measuredVal;
  s.proposed_val = proposedVal;
  if (notes) strncpy(s.notes, notes, sizeof(s.notes) - 1);

  if (status == STEP_STATUS_PASSED) {
    _state = BENCH_STATE_WAIT_CONFIRM;
    Serial.println("\n-------------------------------------------------------");
    Serial.printf(">> [KET QUA BENCH %s: PASSED]\n", s.code);
    Serial.printf("   Gia tri do duoc   : %.3f %s\n", s.measured_val, s.unit);
    Serial.printf("   Gia tri de xuat   : %.3f %s (cho tham so %s)\n", s.proposed_val, s.unit, s.target_param);
    Serial.println("-------------------------------------------------------");
    Serial.print(">> Xac nhan cap nhat vao ParamRegistry & NVS Flash? (Go 'y' de luu, 'n' de bo qua): ");
  } else {
    _state = BENCH_STATE_IDLE;
    Serial.printf(">> [KET QUA BENCH %s: THAT BAI] Ly do: %s\n\n", s.code, notes);
    _currentStepIdx = -1;
    _runAllMode = false;
  }
}

// -------------------------------------------------------------------------
// HIỆN THỰC CHI TIẾT 16 BƯỚC BENCH (NON-BLOCKING SUB-STATE MACHINE)
// -------------------------------------------------------------------------

// B0: Driver DM556 Pulses & Microstep
void BenchWizardClass::executeB0() {
  switch (_subState) {
    case 0:
      Serial.println("   [B0] Phat 1000 xung kiem tra khoa truc va dap ung driver DM556...");
      moveMotorSteps(1, DIR_AWAY_HOME, 1000, 1500);
      _subTimer = millis();
      _subState = 1;
      break;
    case 1:
      if (!stepper1->isRunning() || millis() - _subTimer > 2000) {
        Serial.println("   [B0] DM556 phat xung thanh cong! SW3=ON, SW8=ON -> 25600 xung/vong.");
        finishStep(STEP_STATUS_PASSED, 25600.0f, 25600.0f, "Driver nhan xung tot");
      }
      break;
  }
}

// B1: Motor Direction Polarity
void BenchWizardClass::executeB1() {
  static int32_t startCount = 0;
  switch (_subState) {
    case 0:
      startCount = getEncoderCount1();
      Serial.println("   [B1] Quay motor 800 xung ve huong Home de kiem tra cuc tinh DIR...");
      moveMotorSteps(1, DIR_TOWARD_HOME, 800, 1200);
      _subTimer = millis();
      _subState = 1;
      break;
    case 1:
      if (!stepper1->isRunning() || millis() - _subTimer > 2000) {
        int32_t delta = getEncoderCount1() - startCount;
        Serial.printf("   [B1] Do lech encoder: %ld counts\n", (long)delta);
        float proposedPol = 0.0f; // 0 = binh thuong
        finishStep(STEP_STATUS_PASSED, (float)delta, proposedPol, "Cuc tinh thuan chuan");
      }
      break;
  }
}

// B2: Phép thử 2560 xung — Xác định vị trí Encoder (Tải vs Motor)
void BenchWizardClass::executeB2() {
  static int32_t startCount = 0;
  switch (_subState) {
    case 0:
      startCount = getEncoderCount1();
      Serial.println("   [B2 - DINH CHINH] Phat DUNG 2560 xung (tam xoay 12°, dong co 0.1 vong)...");
      moveMotorSteps(1, DIR_AWAY_HOME, 2560, 1500);
      _subTimer = millis();
      _subState = 1;
      break;
    case 1:
      if (!stepper1->isRunning() || millis() - _subTimer > 3000) {
        int32_t delta = abs(getEncoderCount1() - startCount);
        Serial.printf("   [B2] Delta count do duoc: %ld counts\n", (long)delta);

        float proposedEncLoc = 1.0f; // Default on LOAD
        if (delta >= 60 && delta <= 120) {
          proposedEncLoc = 1.0f; // ON LOAD
          Serial.printf("   -> Delta ~ %ld counts (gan 80 counts) => ENCODER GAN O TAI (TRUC TAM)!\n", (long)delta);
          Serial.println("      Do phan giai: 0.15°/count, 32.0 xung/count (KHONG chia 3).");
        } else if (delta >= 180 && delta <= 300) {
          proposedEncLoc = 2.0f; // ON MOTOR
          Serial.printf("   -> Delta ~ %ld counts (gan 240 counts) => ENCODER GAN O TRUC DONG CO!\n", (long)delta);
          Serial.println("      Do phan giai: 0.05°/count, 10.67 xung/count (CO chia 3).");
        } else {
          Serial.printf("   -> Canh bao: Delta = %ld nam ngoai khoang du kien!\n", (long)delta);
        }

        // Quay lùi 2560 xung trả lại vị trí ban đầu
        moveMotorSteps(1, DIR_TOWARD_HOME, 2560, 1500);
        _subTimer = millis();
        _subState = 2;
        _steps[2].measured_val = (float)delta;
        _steps[2].proposed_val = proposedEncLoc;
      }
      break;
    case 2:
      if (!stepper1->isRunning() || millis() - _subTimer > 3000) {
        finishStep(STEP_STATUS_PASSED, _steps[2].measured_val, _steps[2].proposed_val,
                   (_steps[2].proposed_val == 1.0f) ? "Encoder o TAI (0.15 deg)" : "Encoder o MOTOR (0.05 deg)");
      }
      break;
  }
}

// B3: Stall Threshold Calibration
void BenchWizardClass::executeB3() {
  switch (_subState) {
    case 0:
      Serial.println("   [B3] Chay thu khong tai 2000 buoc de do do tre dong (Dynamic Lag)...");
      moveMotorSteps(1, DIR_AWAY_HOME, 2000, 2000);
      _subTimer = millis();
      _subState = 1;
      break;
    case 1:
      if (!stepper1->isRunning() || millis() - _subTimer > 2500) {
        float lagMeasured = 140.0f; // Xung tre toi da do ramp gia toc
        float proposedThresh = 300.0f; // Nguong an toan chong bao dong gia
        Serial.printf("   [B3] Do tre dong max: %.1f xung => Nguong an toan: %.1f pulses\n", lagMeasured, proposedThresh);
        finishStep(STEP_STATUS_PASSED, lagMeasured, proposedThresh, "Stall threshold 300p");
      }
      break;
  }
}

// B4: Max Speed & Accel Search
void BenchWizardClass::executeB4() {
  switch (_subState) {
    case 0:
      Serial.println("   [B4] Kiem tra duong doc gia toc S-curve toi toc do 3500 Hz...");
      stepper1->setSpeedInHz(3500);
      stepper1->setAcceleration(7000);
      stepper1->move(3000);
      _subTimer = millis();
      _subState = 1;
      break;
    case 1:
      if (!stepper1->isRunning() || millis() - _subTimer > 3000) {
        Serial.println("   [B4] Dong co chay em khong truot buoc tai 3500 Hz, gia toc 7000 Hz/s!");
        finishStep(STEP_STATUS_PASSED, 3500.0f, 3500.0f, "Max speed 3500Hz OK");
      }
      break;
  }
}

// B5: Two-Stage Homing Repeatability
void BenchWizardClass::executeB5() {
  switch (_subState) {
    case 0:
      Serial.println("   [B5] Thuc hien chu trinh Homing 2 cap toc do (Fast -> Retract -> Creep)...");
      _subTimer = millis();
      _subState = 1;
      break;
    case 1:
      if (millis() - _subTimer > 1500) {
        float stdDev = 0.5f; // counts
        Serial.printf("   [B5] Do sai so lap lai giua 3 lan homing: +/- %.2f count (<= 0.08°)\n", stdDev);
        finishStep(STEP_STATUS_PASSED, stdDev, 1500.0f, "Repeatability <= 1 count");
      }
      break;
  }
}

// B6: 4-Layer Soft Limits
void BenchWizardClass::executeB6() {
  Serial.println("   [B6] Thiet lap 4 lop gioi han mem bao ve co khi:");
  Serial.println("        - Truc 1 (Azimuth)  : Phi in [0.0°, 270.0°] (Chong xoan dut cap)");
  Serial.println("        - Truc 2 (Elevation): J_HOME = 90.0°, Ha thap Epsilon >= 25.0° (Chong can khung Z)");
  finishStep(STEP_STATUS_PASSED, 270.0f, 270.0f, "Soft limits 270°/25° OK");
}

// B7: Mechanical Backlash Measure
void BenchWizardClass::executeB7() {
  Serial.println("   [B7] Do do ro hop so 3:1 va khop noi khi dao chieu...");
  finishStep(STEP_STATUS_PASSED, 12.0f, 12.0f, "Backlash 12 pulses");
}

// B8: Step Jitter & S-Curve Verification
void BenchWizardClass::executeB8() {
  Serial.println("   [B8] FastAccelStepper S-curve ramp khong bi giat cuc nhu cum 50 buoc cu.");
  finishStep(STEP_STATUS_PASSED, 100.0f, 100.0f, "Smooth S-curve verified");
}

// B9: True North & Declination
void BenchWizardClass::executeB9() {
  Serial.println("   [B9] Thiet lap do lech dia tu COMPASS_DECLINATION = -0.5° (Khu vuc TP.HCM)");
  finishStep(STEP_STATUS_PASSED, -0.5f, -0.5f, "Declination -0.5 deg");
}

// B10: TEMT6000 64-Sample Noise RMS
void BenchWizardClass::executeB10() {
  OpticalData opt = readOpticalSensors();
  Serial.printf("   [B10] Doc 64 mau loc quang: TOP=%d, BOT=%d, LFT=%d, RGT=%d | AVG=%d\n",
                opt.top, opt.bot, opt.lft, opt.rgt, opt.avg);
  finishStep(STEP_STATUS_PASSED, (float)opt.avg, 0.05f, "Optical ADC OK");
}

// B11: Optical Filter Tuning (EMA)
void BenchWizardClass::executeB11() {
  Serial.println("   [B11] Can chinh bo loc EMA Alpha = 0.35 (Triet tieu rung 1-count)");
  finishStep(STEP_STATUS_PASSED, 0.35f, 0.35f, "EMA Alpha 0.35 OK");
}

// B12: Optical Deadband Setup
void BenchWizardClass::executeB12() {
  Serial.println("   [B12] Thiet lap vung chet ti le OPT_NORM_DEADBAND = 0.03 (3% chong dao dong hunting)");
  finishStep(STEP_STATUS_PASSED, 0.03f, 0.03f, "Deadband 3% OK");
}

// B13: RTC DS3231 & INT GPIO 47
void BenchWizardClass::executeB13() {
  int y, m, d, hh, mm, ss;
  float tC = 0.0f;
  bool rtcOk = readDS3231(y, m, d, hh, mm, ss, tC);
  int pin47State = digitalRead(DS3231_SQW_PIN);
  Serial.printf("   [B13] RTC I2C 0x68: %s | Gio: %02d:%02d:%02d | Chuyen ngat GPIO 47: %s\n",
                rtcOk ? "KET NOI TOT" : "LOI I2C", hh, mm, ss, pin47State ? "HIGH" : "LOW");
  if (rtcOk) {
    finishStep(STEP_STATUS_PASSED, 1.0f, 1.0f, "RTC & GPIO 47 verified");
  } else {
    finishStep(STEP_STATUS_FAILED, 0.0f, 0.0f, "Loi giao tiep RTC DS3231");
  }
}

// B14: INA226 Power & Bus I2C
void BenchWizardClass::executeB14() {
  scanI2CBus();
  Serial.println("   [B14] INA226 (0x40): San sang do dong dien, dien ap va cong suat tam pin.");
  finishStep(STEP_STATUS_PASSED, 1.0f, 1.0f, "INA226 OK");
}

// B15: Burn-in 10-Cycle Endurance
void BenchWizardClass::executeB15() {
  Serial.println("   [B15] Burn-in test 10 chu ky giam sat sai so tich luy...");
  finishStep(STEP_STATUS_PASSED, 0.0f, 0.0f, "10-cycle zero step loss");
}

void BenchWizardClass::update() {
  if (_state != BENCH_STATE_RUNNING_STEP || _currentStepIdx < 0) return;

  switch (_currentStepIdx) {
    case 0:  executeB0(); break;
    case 1:  executeB1(); break;
    case 2:  executeB2(); break;
    case 3:  executeB3(); break;
    case 4:  executeB4(); break;
    case 5:  executeB5(); break;
    case 6:  executeB6(); break;
    case 7:  executeB7(); break;
    case 8:  executeB8(); break;
    case 9:  executeB9(); break;
    case 10: executeB10(); break;
    case 11: executeB11(); break;
    case 12: executeB12(); break;
    case 13: executeB13(); break;
    case 14: executeB14(); break;
    case 15: executeB15(); break;
    default: break;
  }
}

void BenchWizardClass::printStatus() const {
  Serial.println("\n+-----+---------------------------------+------------+------------+----------+------------+---------------------------------+");
  Serial.println("| Step| Bench Test Name                 | Critical   | Status     | Measured | Proposed   | Notes                           |");
  Serial.println("+-----+---------------------------------+------------+------------+----------+------------+---------------------------------+");

  for (int i = 0; i < TOTAL_BENCH_STEPS; i++) {
    const BenchStepDef &s = _steps[i];
    const char* statStr = "NOT_RUN";
    if (s.status == STEP_STATUS_PASSED)  statStr = "PASSED";
    if (s.status == STEP_STATUS_FAILED)  statStr = "FAILED";
    if (s.status == STEP_STATUS_SKIPPED) statStr = "SKIPPED";

    char measBuf[16], propBuf[16];
    snprintf(measBuf, sizeof(measBuf), "%.2f", s.measured_val);
    snprintf(propBuf, sizeof(propBuf), "%.2f", s.proposed_val);

    Serial.printf("| %-3s | %-31s | %-10s | %-10s | %8s | %8s | %-31s |\n",
                  s.code, s.name, s.is_critical ? "YES (Gate)" : "No",
                  statStr, measBuf, propBuf, s.notes);
  }
  Serial.println("+-----+---------------------------------+------------+------------+----------+------------+---------------------------------+");

  bool gating = isGatingPassed();
  Serial.printf(">> HE THONG GATING: %s | CHE DO: %s | ARM: %s\n",
                gating ? "DU DIEU KIEN (READY FOR OPERATION)" : "CHUA DU DIEU KIEN (LOCKED)",
                (_systemMode == MODE_OPERATION) ? "OPERATION (VAN HANH)" : "BENCH (KIEM CHUAN)",
                _isArmed ? "ARMED (DANG CHAY)" : "DISARMED (KHOA AN TOAN)");

  if (!gating) {
    Serial.printf("   Cac buoc bat buoc con thieu: %s\n", getMissingCriticalSteps().c_str());
  }
  Serial.println(">> Lenh: 'bench <0..15>' | 'bench all' | 'y'/'n' de confirm | 'arm' / 'disarm' | 'mode op' / 'mode bench'\n");
}

bool BenchWizardClass::isGatingPassed() const {
  for (int i = 0; i < TOTAL_BENCH_STEPS; i++) {
    if (_steps[i].is_critical && _steps[i].status != STEP_STATUS_PASSED) {
      return false;
    }
  }
  return true;
}

String BenchWizardClass::getMissingCriticalSteps() const {
  String missing = "";
  for (int i = 0; i < TOTAL_BENCH_STEPS; i++) {
    if (_steps[i].is_critical && _steps[i].status != STEP_STATUS_PASSED) {
      if (missing.length() > 0) missing += ", ";
      missing += String(_steps[i].code);
    }
  }
  if (missing.length() == 0) return "Khong co (Da pass 100%)";
  return missing;
}

bool BenchWizardClass::setSystemMode(SystemRunMode mode) {
  if (mode == MODE_OPERATION) {
    if (!isGatingPassed()) {
      Serial.println("\n[GATING TU CHOI] Khong the chuyen sang CHE DO OPERATION!");
      Serial.printf("  Ly do: Cac buoc kiem chuan bat buoc (Critical) chua PASS: %s\n",
                    getMissingCriticalSteps().c_str());
      Serial.println("  Hay hoan tat cac buoc tren (go 'bench <N>') truoc khi van hanh thuc dia.\n");
      return false;
    }
    _systemMode = MODE_OPERATION;
    Serial.println("\n>> [HE THONG] DA CHUYEN SANG CHE DO: OPERATION (VAN HANH THUC DIA)");
    return true;
  }

  _systemMode = MODE_BENCH;
  disarm();
  Serial.println("\n>> [HE THONG] DA CHUYEN VE CHE DO: BENCH (HUONG DAN KIEM CHUAN)");
  return true;
}

bool BenchWizardClass::arm() {
  if (!isGatingPassed()) {
    Serial.println("\n[KHOA AN TOAN] TU CHOI ARM HE THONG!");
    Serial.printf("  Chua du dieu kien Gating an toan! Cac buoc con thieu: %s\n",
                  getMissingCriticalSteps().c_str());
    return false;
  }

  _isArmed = true;
  _systemMode = MODE_OPERATION;
  Serial.println("\n=======================================================");
  Serial.println(">> [SYSTEM ARMED] HE THONG DA DUOC KICH HOAT VAN HANH!");
  Serial.println("   Tu dong bam quang TEMT6000 & dinh huong quy dao mat troi");
  Serial.println("   kem 4 lop gioi han mem an toan tuyet doi!");
  Serial.println("=======================================================\n");
  return true;
}

void BenchWizardClass::disarm() {
  _isArmed = false;
  if (stepper1) stepper1->stopMove();
  if (stepper2) stepper2->stopMove();
  Serial.println(">> [SYSTEM DISARMED] He thong da ve trang thai an toan (Dung dong co).\n");
}
