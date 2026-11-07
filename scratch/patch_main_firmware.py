import re

filepath = 'firmware/esp32_devkit_test/src/main.cpp'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update checkStallProtection
old_stall_m1 = """      if (deltaSteps > (int32_t)(stallThreshCounts * pulsesPerCount) &&
          deltaEnc < 2) {
        stepper1->stopMove();
        stateM1 = STATE_IDLE;
        autoOpticalTracking = false;
        Serial.printf(
            "\\n>> [STALL / NO_MOTION M1] PHAT HIEN KET TRUC 1 HOAC MAT NGUON "
            "24V! (Phat: %ld xung, Encoder chi nhich: %ld count)\\n",
            (long)deltaSteps, (long)deltaEnc);
        m1WasRunning = false;
      }"""

new_stall_m1 = """      if (deltaSteps > (int32_t)(stallThreshCounts * pulsesPerCount) &&
          deltaEnc < 2) {
        stepper1->forceStop();
        stateM1 = STATE_IDLE;
        currentTrackSource = TRACK_SRC_OFF;
        autoOpticalTracking = false;
        systemFsmState = FSM_STATE_FAULT;
        Serial.printf(
            "\\n>> [STALL / NO_MOTION M1] PHAT HIEN KET TRUC 1 HOAC MAT NGUON "
            "24V! NGAT TRACKING & CHUYEN FAULT! (Phat: %ld xung, Encoder chi nhich: %ld count)\\n",
            (long)deltaSteps, (long)deltaEnc);
        m1WasRunning = false;
      }"""

old_stall_m2 = """      if (deltaSteps > (int32_t)(stallThreshCounts * pulsesPerCount) &&
          deltaEnc < 2) {
        stepper2->stopMove();
        stateM2 = STATE_IDLE;
        autoOpticalTracking = false;
        Serial.printf(
            "\\n>> [STALL / NO_MOTION M2] PHAT HIEN KET TRUC 2 HOAC MAT NGUON "
            "24V! (Phat: %ld xung, Encoder chi nhich: %ld count)\\n",
            (long)deltaSteps, (long)deltaEnc);
        m2WasRunning = false;
      }"""

new_stall_m2 = """      if (deltaSteps > (int32_t)(stallThreshCounts * pulsesPerCount) &&
          deltaEnc < 2) {
        stepper2->forceStop();
        stateM2 = STATE_IDLE;
        currentTrackSource = TRACK_SRC_OFF;
        autoOpticalTracking = false;
        systemFsmState = FSM_STATE_FAULT;
        Serial.printf(
            "\\n>> [STALL / NO_MOTION M2] PHAT HIEN KET TRUC 2 HOAC MAT NGUON "
            "24V! NGAT TRACKING & CHUYEN FAULT! (Phat: %ld xung, Encoder chi nhich: %ld count)\\n",
            (long)deltaSteps, (long)deltaEnc);
        m2WasRunning = false;
      }"""

assert old_stall_m1 in content, "old_stall_m1 not found"
assert old_stall_m2 in content, "old_stall_m2 not found"
content = content.replace(old_stall_m1, new_stall_m1)
content = content.replace(old_stall_m2, new_stall_m2)
print("Stall protection patched.")

# 2. Update stepPositionControl
# Locate stepPositionControl
old_step_control = """bool stepPositionControl(int axis, float targetDeg, uint32_t speedHz) {
  FastAccelStepper *s = (axis == 1) ? stepper1 : stepper2;
  if (!s)
    return false;

  float deadbandDeg = ParamRegistry.get("POS_PID_DEADBAND_DEG", 0.45f);
  float degPerCount = getDegPerCount();
  float pulsesPerCount = getPulsesPerCount();

  if (axis == 1) {
    // Trục 1: Azimuth (Phi). Home = 0.0°, Giới hạn mềm =
    // CFG_I_AZ_MAX_SOFT_LIMIT_DEG
    float maxLimit = CFG_I_AZ_MAX_SOFT_LIMIT_DEG;
    float safeMax = maxLimit - 0.2f;
    targetDeg = clampVal(targetDeg, 0.0f, safeMax);
    float curDeg = getAngleDeg1();
    float errDeg = targetDeg - curDeg;

    static float prevErrDeg1 = 0.0f;
    float dErr1 = errDeg - prevErrDeg1;
    prevErrDeg1 = errDeg;
    FuzzyOutput fz1 = computeFuzzyAdjustment(errDeg, dErr1);
    float kpEff1 = gBestAz.kp + fz1.deltaKp;
    if (speedHz == 0) {
      float baseSpd = ParamRegistry.get("POS_STEP_SPEED_HZ", 2000.0f);
      speedHz =
          (uint32_t)constrain(baseSpd * (kpEff1 / 2.40f), 800.0f, 3500.0f);
    }

    if (fabs(errDeg) <= deadbandDeg ||
        (targetDeg >= safeMax - 0.3f && curDeg >= safeMax - deadbandDeg)) {
      if (s->isRunning())
        s->stopMove();
      return true; // Đã đạt vị trí cân bằng trong dải chết hoặc đã chạm góc max
                   // an toàn
    }

    if (errDeg > 0.0f) {
      // Cần tăng góc -> Quay ra xa Home (DIR_AWAY_HOME)
      if (curDeg >= safeMax || !checkMotionAllowed(1, 1)) {
        if (s->isRunning())
          s->stopMove();
        return true; // Đã chạm giới hạn mềm max, không quay tiếp và coi như cân
                     // bằng
      }
      int32_t steps = (int32_t)((errDeg / degPerCount) * getPulsesPerCount());
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(steps);
      }
    } else {
      // Cần giảm góc -> Quay về phía Home (DIR_TOWARD_HOME)
      if (isHome1Triggered() || !checkMotionAllowed(1, -1)) {
        if (s->isRunning())
          s->stopMove();
        return false;
      }
      int32_t steps = (int32_t)((-errDeg / degPerCount) * getPulsesPerCount());
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(-steps);
      }
    }
  } else {
    // Trục 2: Elevation (Epsilon). Home = 90.0° (ngửa đỉnh trời), Giới hạn hạ =
    // CFG_L_EL_MIN_SOFT_LIMIT_DEG (25.0°)
    float minLimit = CFG_L_EL_MIN_SOFT_LIMIT_DEG + 0.2f;
    float maxLimit = CFG_J_EL_MAX_SOFT_LIMIT_DEG - 0.2f;
    targetDeg = clampVal(targetDeg, minLimit, maxLimit);
    float curDeg = getElevationEpsilon();
    float errDeg = targetDeg - curDeg;

    static float prevErrDeg2 = 0.0f;
    float dErr2 = errDeg - prevErrDeg2;
    prevErrDeg2 = errDeg;
    FuzzyOutput fz2 = computeFuzzyAdjustment(errDeg, dErr2);
    float kpEff2 = gBestEl.kp + fz2.deltaKp;
    if (speedHz == 0) {
      float baseSpd = ParamRegistry.get("POS_STEP_SPEED_HZ", 2000.0f);
      speedHz =
          (uint32_t)constrain(baseSpd * (kpEff2 / 2.80f), 800.0f, 3500.0f);
    }

    if (fabs(errDeg) <= deadbandDeg ||
        (targetDeg <= minLimit + 0.3f && curDeg <= minLimit + deadbandDeg) ||
        (targetDeg >= maxLimit - 0.3f && curDeg >= maxLimit - deadbandDeg)) {
      if (s->isRunning())
        s->stopMove();
      return true; // Đã đạt vị trí cân bằng trong dải chết hoặc chạm giới hạn
                   // góc
    }

    if (errDeg > 0.0f) {
      // Cần tăng góc nâng (ngửa lên) -> Quay về phía Home (DIR_TOWARD_HOME,
      // xung âm)
      if (isHome2Triggered() || curDeg >= maxLimit ||
          !checkMotionAllowed(2, -1)) {
        if (s->isRunning())
          s->stopMove();
        return true; // Đã chạm giới hạn ngửa tối đa
      }
      int32_t steps = (int32_t)((errDeg / degPerCount) * getPulsesPerCount());
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(-steps);
      }
    } else {
      // Cần giảm góc nâng (hạ thấp) -> Quay ra xa Home (DIR_AWAY_HOME, xung
      // dương)
      if (curDeg <= minLimit || !checkMotionAllowed(2, 1)) {
        if (s->isRunning())
          s->stopMove();
        return true; // Đã chạm giới hạn hạ thấp tối đa
      }
      int32_t steps = (int32_t)((-errDeg / degPerCount) * getPulsesPerCount());
      if (steps > 0) {
        s->setSpeedInHz(speedHz);
        s->setAcceleration(stepperAccel);
        s->move(steps);
      }
    }
  }
  return true;
}"""

new_step_control = """bool stepPositionControl(int axis, float targetDeg, uint32_t speedHz) {
  FastAccelStepper *s = (axis == 1) ? stepper1 : stepper2;
  if (!s)
    return false;

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

    static float prevErrDeg1 = 0.0f;
    float dErr1 = errDeg - prevErrDeg1;
    prevErrDeg1 = errDeg;
    FuzzyOutput fz1 = computeFuzzyAdjustment(errDeg, dErr1);
    float kpEff1 = gBestAz.kp + fz1.deltaKp;
    if (speedHz == 0) {
      float baseSpd = ParamRegistry.get("POS_STEP_SPEED_HZ", 2000.0f);
      speedHz =
          (uint32_t)constrain(baseSpd * (kpEff1 / 2.40f), 800.0f, 3500.0f);
    }

    if (fabs(errDeg) <= deadbandDeg ||
        (targetDeg >= safeMax - 0.3f && curDeg >= safeMax - deadbandDeg)) {
      if (s->isRunning())
        s->stopMove();
      return true; // Đã đạt vị trí cân bằng trong dải chết hoặc đã chạm góc max an toàn
    }

    if (errDeg > 0.0f) {
      // Cần tăng góc -> Quay ra xa Home (DIR_AWAY_HOME)
      if (curDeg >= safeMax || !checkMotionAllowed(1, 1)) {
        if (s->isRunning())
          s->stopMove();
        return true;
      }
    } else {
      // Cần giảm góc -> Quay về phía Home (DIR_TOWARD_HOME)
      if (isHome1Triggered() || curDeg <= 0.0f || !checkMotionAllowed(1, -1)) {
        if (s->isRunning())
          s->stopMove();
        return false;
      }
    }

    // ĐIỀU KHIỂN VỊ TRÍ TUYỆT ĐỐI (ABSOLUTE POSITIONING):
    // Tuyệt đối không dùng relative move(steps) định kỳ để tránh tích lũy xung phi mã
    if (!s->isRunning()) {
      int32_t encStepPos = (int32_t)((float)getEncoderCount1() * pulsesPerCount);
      if (abs(s->getCurrentPosition() - encStepPos) > 10) {
        s->forceStopAndNewPosition(encStepPos);
      }
    }

    int32_t targetSteps = (int32_t)((targetDeg / degPerCount) * pulsesPerCount);
    int32_t maxSteps = (int32_t)((safeMax / degPerCount) * pulsesPerCount);
    if (targetSteps < 0) targetSteps = 0;
    if (targetSteps > maxSteps) targetSteps = maxSteps;

    s->setSpeedInHz(speedHz);
    s->setAcceleration(stepperAccel);
    s->moveTo(targetSteps);
    return true;
  } else {
    // Trục 2: Elevation (Epsilon). Home = 90.0° (ngửa đỉnh trời), Giới hạn hạ = CFG_L_EL_MIN_SOFT_LIMIT_DEG (25.0°)
    float minLimit = CFG_L_EL_MIN_SOFT_LIMIT_DEG + 0.2f;
    float maxLimit = CFG_J_EL_MAX_SOFT_LIMIT_DEG - 0.2f;
    targetDeg = clampVal(targetDeg, minLimit, maxLimit);
    float curDeg = getElevationEpsilon();
    float errDeg = targetDeg - curDeg;

    static float prevErrDeg2 = 0.0f;
    float dErr2 = errDeg - prevErrDeg2;
    prevErrDeg2 = errDeg;
    FuzzyOutput fz2 = computeFuzzyAdjustment(errDeg, dErr2);
    float kpEff2 = gBestEl.kp + fz2.deltaKp;
    if (speedHz == 0) {
      float baseSpd = ParamRegistry.get("POS_STEP_SPEED_HZ", 2000.0f);
      speedHz =
          (uint32_t)constrain(baseSpd * (kpEff2 / 2.80f), 800.0f, 3500.0f);
    }

    if (fabs(errDeg) <= deadbandDeg ||
        (targetDeg <= minLimit + 0.3f && curDeg <= minLimit + deadbandDeg) ||
        (targetDeg >= maxLimit - 0.3f && curDeg >= maxLimit - deadbandDeg)) {
      if (s->isRunning())
        s->stopMove();
      return true; // Đã đạt vị trí cân bằng trong dải chết hoặc chạm giới hạn góc
    }

    if (errDeg > 0.0f) {
      // Cần tăng góc nâng (ngửa lên) -> Quay về phía Home (DIR_TOWARD_HOME)
      if (isHome2Triggered() || curDeg >= maxLimit || !checkMotionAllowed(2, -1)) {
        if (s->isRunning())
          s->stopMove();
        return true;
      }
    } else {
      // Cần giảm góc nâng (hạ thấp) -> Quay ra xa Home (DIR_AWAY_HOME)
      if (curDeg <= minLimit || !checkMotionAllowed(2, 1)) {
        if (s->isRunning())
          s->stopMove();
        return true;
      }
    }

    // ĐIỀU KHIỂN VỊ TRÍ TUYỆT ĐỐI (ABSOLUTE POSITIONING):
    if (!s->isRunning()) {
      int32_t encStepPos = (int32_t)((float)getEncoderCount2() * pulsesPerCount);
      if (abs(s->getCurrentPosition() - encStepPos) > 10) {
        s->forceStopAndNewPosition(encStepPos);
      }
    }

    int32_t targetSteps = (int32_t)(((CFG_J_EL_HOME_SW_DEG - targetDeg) / degPerCount) * pulsesPerCount);
    int32_t minSteps = (int32_t)(((CFG_J_EL_HOME_SW_DEG - maxLimit) / degPerCount) * pulsesPerCount);
    int32_t maxSteps = (int32_t)(((CFG_J_EL_HOME_SW_DEG - minLimit) / degPerCount) * pulsesPerCount);
    if (targetSteps < minSteps) targetSteps = minSteps;
    if (targetSteps > maxSteps) targetSteps = maxSteps;

    s->setSpeedInHz(speedHz);
    s->setAcceleration(stepperAccel);
    s->moveTo(targetSteps);
    return true;
  }
}"""

assert old_step_control in content, "old_step_control not found"
content = content.replace(old_step_control, new_step_control)
print("stepPositionControl patched.")

# 3. Update steady evaluation in tracking loop
old_steady = """              bool motorsStopped = (!stepper1 || !stepper1->isRunning()) &&
                                   (!stepper2 || !stepper2->isRunning());

              // ĐÁNH GIÁ ĐIỀU KIỆN ỔN ĐỊNH CÂN BẰNG:
              if (m1Done && m2Done && motorsStopped) {"""

new_steady = """              bool motorsStopped = (!stepper1 || !stepper1->isRunning()) &&
                                   (!stepper2 || !stepper2->isRunning());

              bool m1Reached = (fabs(targetAz - getAngleDeg1()) <= deadbandDeg) || azHitMax;
              bool m2Reached = (fabs(targetEl - getElevationEpsilon()) <= deadbandDeg);

              // ĐÁNH GIÁ ĐIỀU KIỆN ỔN ĐỊNH CÂN BẰNG:
              if (m1Reached && m2Reached && motorsStopped) {"""

assert old_steady in content, "old_steady not found"
content = content.replace(old_steady, new_steady)
print("Steady evaluation patched.")

# 4. Update Home switch & limit safety checks in loop()
old_safety = """  // C. GIÁM SÁT AN TOÀN VÀ CÔNG TẮC HÀNH TRÌNH HOME & GIỚI HẠN MỀM CHO M1 & M2
  // (NON-BLOCKING)
  if (stepper1) {
    if (isHome1Triggered()) {
      if (stateM1 == STATE_MANUAL_TOWARD_HOME ||
          (stepper1->isRunning() &&
           (stepper1->rampState() & RAMP_DIRECTION_COUNT_DOWN))) {
        stepper1->forceStopAndNewPosition(0);
        resetEncoder1(0);
        stateM1 = STATE_IDLE;
        Serial.println("\\n>> [HOME TRIGGER TRUC 1] Da cham CTHT 1 -> DUNG & "
                       "SET GOC 0.0°!");
      }
    }
    // Giám sát giới hạn mềm cận trên trục 1 (phi >= 270.0°)
    if (getAngleDeg1() >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
      if (stateM1 == STATE_MANUAL_AWAY_HOME ||
          (stepper1->isRunning() &&
           (stepper1->rampState() & RAMP_DIRECTION_COUNT_UP))) {
        stepper1->stopMove();
        stateM1 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM TRUC 1] Phi = %+.1f° >= %+.1f° -> "
                      "DUNG DE CHONG XOAN CAP!\\n",
                      getAngleDeg1(), CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
      }
    }
    if (stateM1 != STATE_IDLE && stateM1 != STATE_AUTO_HOMING &&
        stateM1 != STATE_AUTO_SEEK_DEFAULT) {
      if (!stepper1->isRunning())
        stateM1 = STATE_IDLE;
    }
  }

  if (stepper2) {
    if (isHome2Triggered()) {
      if (stateM2 == STATE_MANUAL_TOWARD_HOME ||
          (stepper2->isRunning() &&
           (stepper2->rampState() & RAMP_DIRECTION_COUNT_DOWN))) {
        stepper2->forceStopAndNewPosition(0);
        resetEncoder2(0);
        stateM2 = STATE_IDLE;
        Serial.println("\\n>> [HOME TRIGGER TRUC 2] Da cham CTHT 2 -> DUNG & "
                       "SET EPSILON = 90.0°!");
      }
    }
    // Giám sát giới hạn mềm cận trên trục 2 (epsilon >= SOFT_MAX_EL, ngửa lên
    // về Home)
    if (getElevationEpsilon() >= CFG_J_EL_MAX_SOFT_LIMIT_DEG) {
      if (stateM2 == STATE_MANUAL_TOWARD_HOME ||
          (stepper2->isRunning() &&
           (stepper2->rampState() & RAMP_DIRECTION_COUNT_DOWN))) {
        stepper2->stopMove();
        stateM2 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM TRUC 2] Epsilon = %+.1f° >= %+.1f° "
                      "-> DUNG DE CHONG QUA GOC!\\n",
                      getElevationEpsilon(), CFG_J_EL_MAX_SOFT_LIMIT_DEG);
      }
    }
    // Giám sát giới hạn mềm cận dưới trục 2 (epsilon <= 25.0°)
    if (getElevationEpsilon() <= CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
      if (stateM2 == STATE_MANUAL_AWAY_HOME ||
          (stepper2->isRunning() &&
           (stepper2->rampState() & RAMP_DIRECTION_COUNT_UP))) {
        stepper2->stopMove();
        stateM2 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM TRUC 2] Epsilon = %+.1f° <= %+.1f° "
                      "-> DUNG DE CHONG CAN TRUC Z!\\n",
                      getElevationEpsilon(), CFG_L_EL_MIN_SOFT_LIMIT_DEG);
      }
    }"""

new_safety = """  // C. GIÁM SÁT AN TOÀN VÀ CÔNG TẮC HÀNH TRÌNH HOME & GIỚI HẠN MỀM CHO M1 & M2
  // (NON-BLOCKING)
  if (stepper1) {
    if (isHome1Triggered()) {
      if (stateM1 != STATE_AUTO_HOMING) {
        if (stepper1->isRunning()) {
          stepper1->forceStopAndNewPosition(0);
          resetEncoder1(0);
          stateM1 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 1] Da cham CTHT 1 -> DUNG KHAN CAP & SET GOC 0.0°!");
        }
      }
    }
    // Giám sát giới hạn mềm cận trên trục 1 (phi >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG)
    if (getAngleDeg1() >= CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
      if (stepper1->isRunning()) {
        stepper1->forceStop();
        stateM1 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM TRUC 1] Phi = %+.1f° >= %+.1f° -> DUNG KHAN CAP CHONG QUA GOC!\\n",
                      getAngleDeg1(), CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
      }
    }
    // Giám sát góc âm trục 1 (phi < -0.5°)
    if (getAngleDeg1() <= -0.5f) {
      if (stepper1->isRunning()) {
        stepper1->forceStopAndNewPosition(0);
        resetEncoder1(0);
        stateM1 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM AM TRUC 1] Phi = %+.1f° < 0° -> DUNG KHAN CAP & RESET 0.0°!\\n",
                      getAngleDeg1());
      }
    }
    if (stateM1 != STATE_IDLE && stateM1 != STATE_AUTO_HOMING &&
        stateM1 != STATE_AUTO_SEEK_DEFAULT) {
      if (!stepper1->isRunning())
        stateM1 = STATE_IDLE;
    }
  }

  if (stepper2) {
    if (isHome2Triggered()) {
      if (stateM2 != STATE_AUTO_HOMING) {
        if (stepper2->isRunning()) {
          stepper2->forceStopAndNewPosition(0);
          resetEncoder2(0);
          stateM2 = STATE_IDLE;
          Serial.println("\\n>> [HOME TRIGGER TRUC 2] Da cham CTHT 2 -> DUNG KHAN CAP & SET EPSILON = 90.0°!");
        }
      }
    }
    // Giám sát giới hạn mềm cận trên trục 2 (epsilon >= SOFT_MAX_EL, ngửa lên về Home)
    if (getElevationEpsilon() >= CFG_J_EL_MAX_SOFT_LIMIT_DEG) {
      if (stepper2->isRunning()) {
        stepper2->forceStop();
        stateM2 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM TRUC 2] Epsilon = %+.1f° >= %+.1f° -> DUNG KHAN CAP!\\n",
                      getElevationEpsilon(), CFG_J_EL_MAX_SOFT_LIMIT_DEG);
      }
    }
    // Giám sát giới hạn mềm cận dưới trục 2 (epsilon <= 25.0°)
    if (getElevationEpsilon() <= CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
      if (stepper2->isRunning()) {
        stepper2->forceStop();
        stateM2 = STATE_IDLE;
        Serial.printf("\\n>> [GIOI HAN MEM TRUC 2] Epsilon = %+.1f° <= %+.1f° -> DUNG KHAN CAP!\\n",
                      getElevationEpsilon(), CFG_L_EL_MIN_SOFT_LIMIT_DEG);
      }
    }"""

assert old_safety in content, "old_safety not found"
content = content.replace(old_safety, new_safety)
print("Safety monitor patched.")

# 5. Sunset log hour
old_sunset_log = """                  Serial.printf("\\n>> [SUNSET HOLD] Mat troi da lan (El=%+.1f° "
                                "< 0°). Gian pin DUNG IM GIU BUOC tai vi tri "
                                "chieu den 22:00 toi!\\n",
                                elSun);"""
new_sunset_log = """                  Serial.printf("\\n>> [SUNSET HOLD] Mat troi da lan (El=%+.1f° "
                                "< 0°). Gian pin DUNG IM GIU BUOC tai vi tri "
                                "chieu den %02d:00 toi!\\n",
                                elSun, NIGHT_SLEEP_START_HOUR);"""
if old_sunset_log in content:
    content = content.replace(old_sunset_log, new_sunset_log)
    print("Sunset log patched.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("ALL PATCHES APPLIED TO main.cpp SUCCESSFULLY!")

