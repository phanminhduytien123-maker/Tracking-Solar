import re

path = 'firmware/esp32_devkit_test/src/main.cpp'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace updateHardwareEncoders and getEncoderCount1
old_enc_block = """void updateHardwareEncoders() {
  int16_t hw1 = 0;
  int16_t hw2 = 0;
  pcnt_get_counter_value(PCNT_UNIT_0, &hw1);
  pcnt_get_counter_value(PCNT_UNIT_1, &hw2);

  portENTER_CRITICAL(&encMux);
  // Trục 1: Encoder phần cứng bị hỏng (nước mưa, A=0, B=0).
  // Chuyển sang Step-Count Tracking: Đồng bộ trực tiếp từ bộ đếm xung vi bước FastAccelStepper
  if (stepper1) {
    float pulsesPerCount = getPulsesPerCount();
    if (pulsesPerCount > 0.0f) {
      encoderCount1 = (int32_t)((float)stepper1->getCurrentPosition() / pulsesPerCount);
    }
  }

  int16_t diff2 = hw2 - lastPcntVal2;
  lastPcntVal2 = hw2;
  if (invertEncoderDir2)
    diff2 = -diff2;
  encoderCount2 += diff2;
  portEXIT_CRITICAL(&encMux);
}

// Đọc atomic bản sao chốt của Encoder từ bất kỳ Core / Task nào (A2)
int32_t getEncoderCount1() {
  if (stepper1) {
    float pulsesPerCount = getPulsesPerCount();
    if (pulsesPerCount > 0.0f) {
      return (int32_t)((float)stepper1->getCurrentPosition() / pulsesPerCount);
    }
  }
  portENTER_CRITICAL(&encMux);
  int32_t val = encoderCount1;
  portEXIT_CRITICAL(&encMux);
  return val;
}"""

new_enc_block = """void updateHardwareEncoders() {
  int16_t hw1 = 0;
  int16_t hw2 = 0;
  pcnt_get_counter_value(PCNT_UNIT_0, &hw1);
  pcnt_get_counter_value(PCNT_UNIT_1, &hw2);

  // Trục 1: Encoder phần cứng bị hỏng do nước mưa -> Đồng bộ từ vi bước FastAccelStepper
  // 32 vi bước = 1 count encoder (25600 pulses/rev * 3 gear / 2400 cpr = 32.0)
  // Thực hiện tính toán ngoài spinlock để triệt tiêu hoàn toàn nguy cơ deadlock/watchdog
  int32_t calcCount1 = 0;
  if (stepper1) {
    calcCount1 = (int32_t)(stepper1->getCurrentPosition() / 32);
  }

  portENTER_CRITICAL(&encMux);
  encoderCount1 = calcCount1;
  int16_t diff2 = hw2 - lastPcntVal2;
  lastPcntVal2 = hw2;
  if (invertEncoderDir2)
    diff2 = -diff2;
  encoderCount2 += diff2;
  portEXIT_CRITICAL(&encMux);
}

// Đọc atomic bản sao chốt của Encoder từ bất kỳ Core / Task nào (A2, O(1) an toàn tuyệt đối)
int32_t getEncoderCount1() {
  portENTER_CRITICAL(&encMux);
  int32_t val = encoderCount1;
  portEXIT_CRITICAL(&encMux);
  return val;
}"""

if old_enc_block in content:
    content = content.replace(old_enc_block, new_enc_block, 1)
    print("Replaced encoder block successfully!")
else:
    print("Could not find exact old_enc_block, searching with regex...")
    # fallback
    pattern = r'void updateHardwareEncoders\(\)\s*\{[\s\S]*?int32_t getEncoderCount1\(\)\s*\{[\s\S]*?return val;\s*\}'
    if re.search(pattern, content):
        content = re.sub(pattern, new_enc_block, content, count=1)
        print("Replaced via regex successfully!")
    else:
        print("ERROR: Regex did not match!")

# Add debug telemetry fields
old_tel = """  trk.set("enc2_a", digitalRead(M2_ENC_A_PIN));
  trk.set("enc2_b", digitalRead(M2_ENC_B_PIN));"""

new_tel = """  trk.set("enc2_a", digitalRead(M2_ENC_A_PIN));
  trk.set("enc2_b", digitalRead(M2_ENC_B_PIN));
  trk.set("uptime_s", (double)(millis() / 1000UL));
  trk.set("rst_reason", (int)esp_reset_reason());"""

if old_tel in content:
    content = content.replace(old_tel, new_tel, 1)
    print("Added debug telemetry fields successfully!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished patching main.cpp")

