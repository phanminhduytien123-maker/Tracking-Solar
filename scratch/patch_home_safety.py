with open('firmware/esp32_devkit_test/src/main.cpp', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = """  if (stepper1) {
    if (isHome1Triggered()) {
      if (stateM1 != STATE_AUTO_HOMING) {
        if (stepper1->isRunning()) {
          stepper1->forceStopAndNewPosition(0);
          resetEncoder1(0);
          stateM1 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 1] Da cham CTHT 1 -> DUNG KHAN CAP & SET GOC 0.0°!");
        }
      }
    }"""

replacement1 = """  if (stepper1) {
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

target2 = """  if (stepper2) {
    if (isHome2Triggered()) {
      if (stateM2 != STATE_AUTO_HOMING) {
        if (stepper2->isRunning()) {
          stepper2->forceStopAndNewPosition(0);
          resetEncoder2(0);
          stateM2 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 2] Da cham CTHT 2 -> DUNG KHAN CAP & SET EPSILON = 90.0°!");
        }
      }
    }"""

replacement2 = """  if (stepper2) {
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

assert target1 in text, "target1 not found"
assert target2 in text, "target2 not found"

text = text.replace(target1, replacement1, 1)
text = text.replace(target2, replacement2, 1)

with open('firmware/esp32_devkit_test/src/main.cpp', 'w', encoding='utf-8') as f:
    f.write(text)

print("firmware/esp32_devkit_test/src/main.cpp patched successfully!")

