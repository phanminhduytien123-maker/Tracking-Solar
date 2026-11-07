with open('firmware/esp32_devkit_test/src/main.cpp', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Declare the flags
target_flags = "bool isTestSleepMode = false;"
replacement_flags = """bool isTestSleepMode = false;
volatile bool m1MovingAwayFromHome = false;
volatile bool m2MovingAwayFromHome = false;"""

assert target_flags in text, "target_flags not found"
text = text.replace(target_flags, replacement_flags, 1)

# 2. In stepPositionControl:
target_spc1 = """    if (errDeg > 0.0f) {
      // Cần tăng góc -> Quay ra xa Home (DIR_AWAY_HOME)"""

replacement_spc1 = """    if (errDeg > 0.0f) {
      // Cần tăng góc -> Quay ra xa Home (DIR_AWAY_HOME)
      m1MovingAwayFromHome = true;"""

assert target_spc1 in text, "target_spc1 not found"
text = text.replace(target_spc1, replacement_spc1, 1)

target_spc1_down = """    } else {
      // Cần giảm góc -> Quay về phía Home (DIR_TOWARD_HOME)"""

replacement_spc1_down = """    } else {
      // Cần giảm góc -> Quay về phía Home (DIR_TOWARD_HOME)
      m1MovingAwayFromHome = false;"""

assert target_spc1_down in text, "target_spc1_down not found"
text = text.replace(target_spc1_down, replacement_spc1_down, 1)

# For axis 2:
target_spc2 = """    if (errDeg > 0.0f) {
      // Cần tăng góc nâng (ngửa lên) -> Quay về phía Home (DIR_TOWARD_HOME)"""

replacement_spc2 = """    if (errDeg > 0.0f) {
      // Cần tăng góc nâng (ngửa lên) -> Quay về phía Home (DIR_TOWARD_HOME)
      m2MovingAwayFromHome = false;"""

assert target_spc2 in text, "target_spc2 not found"
text = text.replace(target_spc2, replacement_spc2, 1)

target_spc2_down = """    } else {
      // Cần giảm góc nâng (hạ thấp) -> Quay ra xa Home (DIR_AWAY_HOME)"""

replacement_spc2_down = """    } else {
      // Cần giảm góc nâng (hạ thấp) -> Quay ra xa Home (DIR_AWAY_HOME)
      m2MovingAwayFromHome = true;"""

assert target_spc2_down in text, "target_spc2_down not found"
text = text.replace(target_spc2_down, replacement_spc2_down, 1)

# In moveMotorSteps:
target_mms = """bool moveMotorSteps(int axis, bool direction, int32_t steps,
                    uint32_t speedHz = 0) {
  FastAccelStepper *s = (axis == 1) ? stepper1 : stepper2;"""

replacement_mms = """bool moveMotorSteps(int axis, bool direction, int32_t steps,
                    uint32_t speedHz = 0) {
  FastAccelStepper *s = (axis == 1) ? stepper1 : stepper2;
  if (axis == 1) m1MovingAwayFromHome = (direction == DIR_AWAY_HOME);
  if (axis == 2) m2MovingAwayFromHome = (direction == DIR_AWAY_HOME);"""

assert target_mms in text, "target_mms not found"
text = text.replace(target_mms, replacement_mms, 1)

# 3. In loop() safety check:
target_loop_safety = """  if (stepper1) {
    if (isHome1Triggered()) {
      if (stateM1 != STATE_AUTO_HOMING) {
        // Chỉ phanh khẩn cấp nếu motor đang quay VỀ phía công tắc Home (target <= current)
        // Khi motor đang quay RA XA công tắc (target > current để tăng góc phi), TUYỆT ĐỐI KHÔNG CHẶN để motor nhả switch!
        bool isMovingAwayFromHome1 = (stepper1->getPositionAfterCommandsCompleted() > stepper1->getCurrentPosition());
        if (stepper1->isRunning() && !isMovingAwayFromHome1) {
          stepper1->forceStopAndNewPosition(0);
          resetEncoder1(0);
          stateM1 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 1] Dang quay ve Home va cham CTHT 1 -> DUNG KHAN CAP & SET GOC 0.0°!");
        }
      }
    }"""

replacement_loop_safety = """  if (stepper1) {
    if (isHome1Triggered()) {
      if (stateM1 != STATE_AUTO_HOMING) {
        // Chỉ phanh khẩn cấp nếu motor đang quay VỀ phía công tắc Home (!m1MovingAwayFromHome)
        // Khi motor đang quay RA XA công tắc (m1MovingAwayFromHome = true để tăng góc phi), TUYỆT ĐỐI KHÔNG CHẶN để motor nhả switch!
        if (stepper1->isRunning() && !m1MovingAwayFromHome) {
          stepper1->forceStopAndNewPosition(0);
          resetEncoder1(0);
          stateM1 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 1] Dang quay ve Home va cham CTHT 1 -> DUNG KHAN CAP & SET GOC 0.0°!");
        }
      }
    } else {
      m1MovingAwayFromHome = false;
    }"""

assert target_loop_safety in text, "target_loop_safety not found"
text = text.replace(target_loop_safety, replacement_loop_safety, 1)

target_loop_safety2 = """  if (stepper2) {
    if (isHome2Triggered()) {
      if (stateM2 != STATE_AUTO_HOMING) {
        bool isMovingAwayFromHome2 = (stepper2->getPositionAfterCommandsCompleted() > stepper2->getCurrentPosition());
        if (stepper2->isRunning() && !isMovingAwayFromHome2) {
          stepper2->forceStopAndNewPosition(0);
          resetEncoder2(0);
          stateM2 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 2] Dang quay ve Home va cham CTHT 2 -> DUNG KHAN CAP & SET EPSILON = 90.0°!");
        }
      }
    }"""

replacement_loop_safety2 = """  if (stepper2) {
    if (isHome2Triggered()) {
      if (stateM2 != STATE_AUTO_HOMING) {
        if (stepper2->isRunning() && !m2MovingAwayFromHome) {
          stepper2->forceStopAndNewPosition(0);
          resetEncoder2(0);
          stateM2 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 2] Dang quay ve Home va cham CTHT 2 -> DUNG KHAN CAP & SET EPSILON = 90.0°!");
        }
      }
    } else {
      m2MovingAwayFromHome = false;
    }"""

assert target_loop_safety2 in text, "target_loop_safety2 not found"
text = text.replace(target_loop_safety2, replacement_loop_safety2, 1)

with open('firmware/esp32_devkit_test/src/main.cpp', 'w', encoding='utf-8') as f:
    f.write(text)

print("Patched main.cpp with m1MovingAwayFromHome and m2MovingAwayFromHome successfully!")

