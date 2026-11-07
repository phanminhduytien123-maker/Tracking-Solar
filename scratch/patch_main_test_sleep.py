with open('firmware/esp32_devkit_test/src/main.cpp', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Forward declarations & variables
target_decl = """volatile bool remoteSleepTrigger = false;
volatile bool remoteWakeTrigger = false;"""

replacement_decl = """volatile bool remoteSleepTrigger = false;
volatile bool remoteWakeTrigger = false;
volatile bool remoteTestSleepTrigger = false;
volatile bool remoteTestWakeTrigger = false;
volatile bool remoteResumeRealTrigger = false;
bool isTestSleepMode = false;

void executeTestSleepNow();
void executeTestWakeNow();
void executeResumeRealState();"""

assert target_decl in content, "target_decl not found"
content = content.replace(target_decl, replacement_decl)

# 2. Implement the 3 functions right after wakeUpAtDawn()
target_after_dawn = """  trackCyclePhase = TRACK_CYCLE_ADJUSTING;
  isMaxAzimuthReached = false;
  systemFsmState = FSM_STATE_TRACKING;
}

// Giám sát phát hiện kẹt động cơ (Stall Detection) & mất nguồn 24V (Mục 8)"""

replacement_functions = """  trackCyclePhase = TRACK_CYCLE_ADJUSTING;
  isMaxAzimuthReached = false;
  systemFsmState = FSM_STATE_TRACKING;
}

// -------------------------------------------------------------------------
// THỬ NGHIỆM 1: TEST NGỦ (HOME 2 TRỤC -> VÀO THẾ NGỦ AN TOÀN NGAY LẬP TỨC)
// Không ảnh hưởng tới giờ RTC và lịch trình tự động hàng ngày
// -------------------------------------------------------------------------
void executeTestSleepNow() {
  Serial.println("\\n>> =======================================================");
  Serial.println(">> [TEST SLEEP] KICH HOAT CHU TRINH TEST NGU NGAY LAP TUC");
  Serial.println(">> (Khong anh huong toi gio giac RTC hay hen gio ban dem)");
  Serial.println(">> [BUOC 1/3] Homing ca 2 truc ve switch truoc khi vao the ngu...");
  Serial.println(">> =======================================================\\n");

  isTestSleepMode = true;
  currentTrackSource = TRACK_SRC_OFF;
  autoOpticalTracking = false;
  systemFsmState = FSM_STATE_PREP_SLEEP;

  if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
  if (stepper2 && stepper2->isRunning()) stepper2->stopMove();

  // 1. Luôn Home 2 trục trước khi thực hiện
  runDualHomingToSwitches();

  // 2. Trục 1 giữ 0.0° (Home). Trục 2 quay về góc ngủ an toàn (CFG_L_EL_MIN_SOFT_LIMIT_DEG)
  Serial.printf(">> [BUOC 2/3] Truc 1 giu moc Home (0.0°). Truc 2 quay ve the ngu (%.1f°)...\\n",
                CFG_L_EL_MIN_SOFT_LIMIT_DEG);
  stepPositionControl(2, CFG_L_EL_MIN_SOFT_LIMIT_DEG, autoSpeedHz);
  unsigned long startWait = millis();
  while ((stepper2 && stepper2->isRunning()) && (millis() - startWait < 25000)) {
    vTaskDelay(pdMS_TO_TICKS(50));
    esp_task_wdt_reset();
    updateHardwareEncoders();
  }
  if (stepper1) stepper1->stopMove();
  if (stepper2) stepper2->stopMove();

  systemFsmState = FSM_STATE_LIGHT_SLEEP;

  // 3. Đẩy Firebase báo trạng thái ngủ test
  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    FirebaseJson sleepJson;
    sleepJson.set("state", "DEEP_SLEEP");
    sleepJson.set("status", "SLEEPING");
    sleepJson.set("wake_at", "TEST_SLEEP");
    sleepJson.set("isSleeping", true);
    sleepJson.set("isTestSleep", true);
    sleepJson.set("displayState", "🌙 TEST NGỦ ĐÔNG (CHỜ WAKE/RESET)");
    sleepJson.set("source", "device");
    Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &sleepJson);
  }
  Serial.println(">> [BUOC 3/3] Gian pin da vao the ngu an toan! Giu nguyen khong bi anh huong boi gio RTC.\\n");
}

// -------------------------------------------------------------------------
// THỬ NGHIỆM 2: TEST WAKE UP (CHỈ KHẢ DỤNG KHI ĐANG NGỦ -> HOME -> ĐÓN BÌNH MINH)
// -------------------------------------------------------------------------
void executeTestWakeNow() {
  bool isCurrentlySleeping = isTestSleepMode || (systemFsmState == FSM_STATE_LIGHT_SLEEP) || (systemFsmState == FSM_STATE_PREP_SLEEP);
  if (!isCurrentlySleeping) {
    Serial.println("\\n>> [TEST WAKE BO QUA] He thong hien khong o trang thai ngu! Chi kha dung khi dang ngu.");
    return;
  }

  Serial.println("\\n>> =======================================================");
  Serial.println(">> [TEST WAKE] KICH HOAT CHU TRINH TEST THUC DAY");
  Serial.println(">> [BUOC 1/3] Homing ca 2 truc ve switch truoc khi danh thuc...");
  Serial.println(">> =======================================================\\n");

  systemFsmState = FSM_STATE_HOMING;

  // 1. Luôn Home 2 trục trước khi thực hiện
  runDualHomingToSwitches();

  // 2. Quay đón bình minh: Trục 2 ở 90.0° (Home), Trục 1 quay sang dawnAzTarget (78°)
  float dawnAzTarget = defaultDeg1;
  float tAz = 0.0f, tEl = 0.0f, azS = 0.0f, elS = 0.0f, zenS = 0.0f, ws = 0.0f;
  bool isDay = false;
  if (computeSolarTrackingTargets(tAz, tEl, azS, elS, zenS, ws, isDay)) {
    dawnAzTarget = tAz;
  }
  Serial.printf(">> [BUOC 2/3] Truc 2 giu 90.0°. Truc 1 quay don binh minh (%.1f°)...\\n", dawnAzTarget);
  stepPositionControl(1, dawnAzTarget, autoSpeedHz);
  unsigned long startWait = millis();
  while ((stepper1 && stepper1->isRunning()) && (millis() - startWait < 25000)) {
    vTaskDelay(pdMS_TO_TICKS(50));
    esp_task_wdt_reset();
    updateHardwareEncoders();
  }
  if (stepper1) stepper1->stopMove();

  isTestSleepMode = false;
  currentTrackSource = TRACK_SRC_OFF;
  autoOpticalTracking = false;
  systemFsmState = FSM_STATE_DAWN_POLL;

  // 3. Đẩy Firebase báo trạng thái thức dậy
  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    FirebaseJson wakeJson;
    wakeJson.set("state", "DAWN_POLL");
    wakeJson.set("status", "WAKEUP_TEST");
    wakeJson.set("wake_at", "AWAKE");
    wakeJson.set("isSleeping", false);
    wakeJson.set("isTestSleep", false);
    wakeJson.set("displayState", "☀️ TEST THỨC DẬY (THẾ ĐÓN BÌNH MINH)");
    wakeJson.set("source", "device");
    Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &wakeJson);
  }
  Serial.println(">> [BUOC 3/3] Gian pin da o the don binh minh san sang!\\n");
}

// -------------------------------------------------------------------------
// THỬ NGHIỆM 3: QUAY VỀ TRẠNG THÁI THẬT (RESET / RESUME REAL STATE)
// Home 2 trục -> Xóa mọi cờ test -> Bám mặt trời theo giờ thực tế RTC
// -------------------------------------------------------------------------
void executeResumeRealState() {
  Serial.println("\\n>> =======================================================");
  Serial.println(">> [RESUME REAL] KHOI PHUC TRANG THAI THEO GIO THUC RTC");
  Serial.println(">> [BUOC 1/3] Homing ca 2 truc ve switch truoc khi van hanh...");
  Serial.println(">> =======================================================\\n");

  isTestSleepMode = false;
  isMaxAzimuthReached = false;
  isEmergencyCoverActive = false;
  emergencyEstop = false;
  systemFsmState = FSM_STATE_HOMING;

  if (stepper1 && stepper1->isRunning()) stepper1->stopMove();
  if (stepper2 && stepper2->isRunning()) stepper2->stopMove();

  // 1. Luôn Home 2 trục trước khi thực hiện
  runDualHomingToSwitches();

  // 2. Đọc giờ thực RTC DS3231 & tính thiên văn NOAA
  int curY = 0, curM = 0, curD = 0, curH = 0, curMin = 0, curS = 0;
  float curTemp = 0.0f;
  readDS3231(curY, curM, curD, curH, curMin, curS, curTemp);
  bool isNight = (curH >= NIGHT_SLEEP_START_HOUR || curH < NIGHT_SLEEP_END_HOUR);

  float tAz = 0.0f, tEl = 0.0f, azS = 0.0f, elS = 0.0f, zenS = 0.0f, ws = 0.0f;
  bool isDay = false;
  bool hasSolar = computeSolarTrackingTargets(tAz, tEl, azS, elS, zenS, ws, isDay);

  Serial.printf(">> [BUOC 2/3] Gio RTC hien tai: %02d:%02d:%02d | Sun El=%+.1f° | Ban %s\\n",
                curH, curMin, curS, elS, isNight ? "DEM" : "NGAY");

  if (!isNight && hasSolar && elS >= 0.0f) {
    // Ban ngày: Bật Hybrid tracking và quay thẳng vào vị trí mặt trời hiện tại
    runPsoOptimization();
    currentTrackSource = TRACK_SRC_HYBRID;
    autoOpticalTracking = true;
    trackCyclePhase = TRACK_CYCLE_ADJUSTING;
    systemFsmState = FSM_STATE_TRACKING;

    Serial.printf(">> [REAL TRACK] Tu dong quay bam vi tri mat troi: Az=%.1f°, El=%.1f°...\\n", tAz, tEl);
    stepPositionControl(1, tAz, autoSpeedHz);
    stepPositionControl(2, tEl, autoSpeedHz);

    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
      FirebaseJson realJson;
      realJson.set("state", "TRACKING");
      realJson.set("status", "TRACKING_ACTIVE");
      realJson.set("displayState", "ĐANG ĐIỀU CHỈNH");
      realJson.set("wake_at", "AWAKE");
      realJson.set("isSleeping", false);
      realJson.set("isTestSleep", false);
      realJson.set("mode", "AUTO");
      realJson.set("source", "device");
      Firebase.RTDB.updateNode(&fbdo, "/solar/tracking", &realJson);
    }
  } else {
    // Ban đêm: Cho giàn pin ngủ đêm an toàn
    enterNightSleepUntil4AM();
  }
  Serial.println(">> [BUOC 3/3] He thong da hoan toan khoi phuc theo gio RTC thuc te 100%!\\n");
}

// Giám sát phát hiện kẹt động cơ (Stall Detection) & mất nguồn 24V (Mục 8)"""

assert target_after_dawn in content, "target_after_dawn not found"
content = content.replace(target_after_dawn, replacement_functions)

# 3. TelemetryTask serialization
target_telemetry_sleep = """  bool isDeviceSleeping = (systemFsmState == FSM_STATE_PREP_SLEEP ||
                           systemFsmState == FSM_STATE_LIGHT_SLEEP);
  trk.set("isSleeping", isDeviceSleeping);
  if (isDeviceSleeping) {
    trk.set("wake_at", "04:00");
  } else {
    trk.set("wake_at", "AWAKE");
  }
  if (isEmergencyCoverActive) {
    trk.set("displayState", "KHẨN CẤP (Góc Max phủ bạt)");
    trk.set("holdRemainSec", 0);
  } else if (isDeviceSleeping) {
    trk.set("displayState", "NGỦ ĐÔNG (04:00)");
    trk.set("holdRemainSec", 0);"""

replacement_telemetry_sleep = """  bool isDeviceSleeping = (systemFsmState == FSM_STATE_PREP_SLEEP ||
                           systemFsmState == FSM_STATE_LIGHT_SLEEP);
  trk.set("isSleeping", isDeviceSleeping);
  trk.set("isTestSleep", (bool)isTestSleepMode);
  if (isTestSleepMode) {
    trk.set("wake_at", "TEST_SLEEP");
    trk.set("displayState", "🌙 TEST NGỦ ĐÔNG (CHỜ WAKE/RESET)");
    trk.set("holdRemainSec", 0);
  } else if (isDeviceSleeping) {
    trk.set("wake_at", "04:00");
    trk.set("displayState", "NGỦ ĐÔNG (04:00)");
    trk.set("holdRemainSec", 0);
  } else {
    trk.set("wake_at", "AWAKE");
  }
  if (isEmergencyCoverActive) {
    trk.set("displayState", "KHẨN CẤP (Góc Max phủ bạt)");
    trk.set("holdRemainSec", 0);"""

assert target_telemetry_sleep in content, "target_telemetry_sleep not found"
content = content.replace(target_telemetry_sleep, replacement_telemetry_sleep)

# 4. Command parsing in checkRemoteFirebaseCommands()
target_cmd_sleep = """      // LỆNH NGỦ ĐÊM / THỨC DẬY TỪ XA
      else if (cmd.equalsIgnoreCase("sleep")) {
        if (!isEmergencyCoverActive) {
          remoteSleepTrigger = true;
          shouldAck = true;
          Serial.println(">> [REMOTE] Nhan lenh SLEEP dua he thong vao trang "
                         "thai ngu dem!");
        }
      } else if (cmd.equalsIgnoreCase("wake") ||
                 cmd.equalsIgnoreCase("wakeup")) {
        if (!isEmergencyCoverActive) {
          remoteWakeTrigger = true;
          shouldAck = true;
          Serial.println(
              ">> [REMOTE] Nhan lenh WAKE danh thuc he thong don binh minh!");
        }
      }"""

replacement_cmd_sleep = """      // LỆNH NGỦ ĐÊM / THỨC DẬY TỪ XA
      else if (cmd.equalsIgnoreCase("sleep")) {
        if (!isEmergencyCoverActive) {
          remoteSleepTrigger = true;
          shouldAck = true;
          Serial.println(">> [REMOTE] Nhan lenh SLEEP dua he thong vao trang "
                         "thai ngu dem!");
        }
      } else if (cmd.equalsIgnoreCase("wake") ||
                 cmd.equalsIgnoreCase("wakeup")) {
        if (!isEmergencyCoverActive) {
          remoteWakeTrigger = true;
          shouldAck = true;
          Serial.println(
              ">> [REMOTE] Nhan lenh WAKE danh thuc he thong don binh minh!");
        }
      }
      // LỆNH TEST NGỦ (HOME -> VÀO THẾ NGỦ NGAY LẬP TỨC, KHÔNG ẢNH HƯỞNG GIỜ RTC)
      else if (cmd.equalsIgnoreCase("test_sleep")) {
        if (!isEmergencyCoverActive) {
          remoteTestSleepTrigger = true;
          shouldAck = true;
          Serial.println(">> [REMOTE] Nhan lenh TEST SLEEP (Home -> Ngu ngay)!");
        }
      }
      // LỆNH TEST WAKE UP (CHỈ KHẢ DỤNG KHI ĐANG NGỦ -> HOME -> ĐÓN BÌNH MINH)
      else if (cmd.equalsIgnoreCase("test_wake") || cmd.equalsIgnoreCase("test_wakeup")) {
        if (!isEmergencyCoverActive) {
          remoteTestWakeTrigger = true;
          shouldAck = true;
          Serial.println(">> [REMOTE] Nhan lenh TEST WAKE UP (Home -> Don binh minh)!");
        }
      }
      // LỆNH QUAY VỀ TRẠNG THÁI THẬT (RESET / RESUME REAL STATE)
      else if (cmd.equalsIgnoreCase("resume_real") || cmd.equalsIgnoreCase("reset_real")) {
        remoteResumeRealTrigger = true;
        shouldAck = true;
        Serial.println(">> [REMOTE] Nhan lenh RESUME REAL STATE (Home -> Bam theo gio RTC)!");
      }"""

assert target_cmd_sleep in content, "target_cmd_sleep not found"
content = content.replace(target_cmd_sleep, replacement_cmd_sleep)

# 5. Remote triggers handling in loop()
target_triggers = """  // XỬ LÝ LỆNH SLEEP / WAKE TỪ XA QUA FIREBASE
  if (remoteSleepTrigger) {
    remoteSleepTrigger = false;
    Serial.println(
        "\\n>> [REMOTE SLEEP] Chuyen sang che do ngu dem giu WiFi...");
    enterNightSleepUntil4AM();
  }
  if (remoteWakeTrigger) {
    remoteWakeTrigger = false;
    Serial.println("\\n>> [REMOTE WAKE] Danh thuc he thong don binh minh...");
    wakeUpAtDawn();
  }

  // 0. TỰ ĐỘNG QUẢN LÝ NGỦ ĐÊM / THỨC DẬY (TỪ 19:00 TỐI ĐẾN 04:00 SÁNG) THEO
  // ĐỒNG HỒ RTC DS3231
  static unsigned long lastNightCheckMs = 0;
  if (!isEmergencyCoverActive && (millis() - lastNightCheckMs >= 3000)) {"""

replacement_triggers = """  // XỬ LÝ LỆNH SLEEP / WAKE TỪ XA QUA FIREBASE
  if (remoteSleepTrigger) {
    remoteSleepTrigger = false;
    Serial.println(
        "\\n>> [REMOTE SLEEP] Chuyen sang che do ngu dem giu WiFi...");
    enterNightSleepUntil4AM();
  }
  if (remoteWakeTrigger) {
    remoteWakeTrigger = false;
    Serial.println("\\n>> [REMOTE WAKE] Danh thuc he thong don binh minh...");
    wakeUpAtDawn();
  }
  // XỬ LÝ LỆNH TEST SLEEP / TEST WAKE / RESUME REAL
  if (remoteTestSleepTrigger) {
    remoteTestSleepTrigger = false;
    executeTestSleepNow();
  }
  if (remoteTestWakeTrigger) {
    remoteTestWakeTrigger = false;
    executeTestWakeNow();
  }
  if (remoteResumeRealTrigger) {
    remoteResumeRealTrigger = false;
    executeResumeRealState();
  }

  // 0. TỰ ĐỘNG QUẢN LÝ NGỦ ĐÊM / THỨC DẬY (TỪ 18:00 TỐI ĐẾN 04:00 SÁNG) THEO
  // ĐỒNG HỒ RTC DS3231 (BỎ QUA KHI ĐANG Ở CHẾ ĐỘ TEST NGỦ isTestSleepMode)
  static unsigned long lastNightCheckMs = 0;
  if (!isTestSleepMode && !isEmergencyCoverActive && (millis() - lastNightCheckMs >= 3000)) {"""

assert target_triggers in content, "target_triggers not found"
content = content.replace(target_triggers, replacement_triggers)

# 6. Serial commands
target_serial_cmd = """  } else if (cmdStr.equalsIgnoreCase("wake") ||
             cmdStr.equalsIgnoreCase("wakeup")) {
    Serial.println(
        "\\n>> [THU CONG] Kich hoat lenh danh thuc (Wakeup) don binh minh...");
    wakeUpAtDawn();
  }"""

replacement_serial_cmd = """  } else if (cmdStr.equalsIgnoreCase("wake") ||
             cmdStr.equalsIgnoreCase("wakeup")) {
    Serial.println(
        "\\n>> [THU CONG] Kich hoat lenh danh thuc (Wakeup) don binh minh...");
    wakeUpAtDawn();
  } else if (cmdStr.equalsIgnoreCase("test_sleep")) {
    executeTestSleepNow();
  } else if (cmdStr.equalsIgnoreCase("test_wake")) {
    executeTestWakeNow();
  } else if (cmdStr.equalsIgnoreCase("resume_real") || cmdStr.equalsIgnoreCase("reset_real")) {
    executeResumeRealState();
  }"""

assert target_serial_cmd in content, "target_serial_cmd not found"
content = content.replace(target_serial_cmd, replacement_serial_cmd)

with open('firmware/esp32_devkit_test/src/main.cpp', 'w', encoding='utf-8') as f:
    f.write(content)
print("firmware/esp32_devkit_test/src/main.cpp patched successfully.")
