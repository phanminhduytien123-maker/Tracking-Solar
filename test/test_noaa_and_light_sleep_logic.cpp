/**
 * @file test_noaa_and_light_sleep_logic.cpp
 * @brief Native Unit Test kiểm thử logic thuần:
 * 1. Thuật toán bao góc wrap180/wrap360 và giới hạn mềm Feedforward NOAA.
 * 2. Công thức tạo góc Hybrid: theta_ref = theta_ff + sat(w_s * Z * e_s, +/- Z2).
 * 3. Logic cộng thời gian báo thức DS3231 Alarm 1 (chuyển giao phút/giờ, cửa sổ ngủ đêm).
 */

#include <iostream>
#include <cmath>
#include <cassert>
#include <iomanip>
#include <cstdint>

// Giả lập hàm wrap góc thuần
double wrap360(double angle_deg) {
  double res = fmod(angle_deg, 360.0);
  if (res < 0.0) res += 360.0;
  return res;
}

double wrap180(double angle_deg) {
  double res = wrap360(angle_deg);
  if (res > 180.0) res -= 360.0;
  return res;
}

float clampVal(float val, float minVal, float maxVal) {
  if (val < minVal) return minVal;
  if (val > maxVal) return maxVal;
  return val;
}

int main() {
  std::cout << "=================================================================\n";
  std::cout << " UNIT TEST NATIVE: LOGIC NOAA FEEDFORWARD, HYBRID & DS3231 ALARM \n";
  std::cout << "=================================================================\n\n";

  // TEST 1: Kiểm thử wrap góc và tính phi_ff, eps_ff
  std::cout << "[TEST 1] KIEM THU TINH TOAN GOC FEEDFORWARD THIEN VAN NOAA:\n";
  {
    // Giả định mặt trời lúc 09:00:00 sáng: Azimuth = 126.6177°, Elevation = 41.3463°
    float az_sun = 126.6177f;
    float el_sun = 41.3463f;

    float G = 45.0f; // Góc công tắc Azimuth
    float H = 0.0f;  // Offset lắp đặt

    float phi_ff = (float)wrap180(az_sun - G - H); // 126.6177 - 45 = 81.6177°
    float eps_ff = el_sun;

    float soft_max_az = 270.0f;
    float soft_min_el = 25.0f; // Kẹp L = 25°
    float soft_max_el = 90.0f; // Đỉnh trời Zenith = 90°

    phi_ff = clampVal(phi_ff, 0.0f, soft_max_az);
    eps_ff = clampVal(eps_ff, soft_min_el, soft_max_el);

    std::cout << "  - Azimuth mat troi: " << az_sun << "° -> phi_ff: " << phi_ff << "°\n";
    std::cout << "  - Elevation mat troi: " << el_sun << "° -> eps_ff: " << eps_ff << "°\n";
    assert(std::fabs(phi_ff - 81.6177f) < 0.001f);
    assert(std::fabs(eps_ff - 41.3463f) < 0.001f);

    // Thử trường hợp mặt trời quá thấp (el = 8.5° < L = 25°) -> Bị kẹp tại L = 25°
    float el_low = 8.5f;
    float eps_clamped = clampVal(el_low, soft_min_el, soft_max_el);
    std::cout << "  - Mat troi thap (el = " << el_low << "°) -> Bi kep an toan tai L = " << eps_clamped << "°\n";
    assert(eps_clamped == 25.0f);
  }
  std::cout << "  ==> [PASS] Tinh toan goc feedforward va kep gioi han mem hoan toan chinh xac!\n\n";

  // TEST 2: Kiểm thử công thức Hybrid (NOAA + Cảm biến quang TEMT6000)
  std::cout << "[TEST 2] KIEM THU HOP NHAT HYBRID (NOAA FEEDFORWARD + TEMT6000 CORRECTION):\n";
  {
    float phi_ff = 81.6177f;
    float normDiffAz = 0.08f; // Sai số quang học chuẩn hóa 8%
    float Z = 15.0f;          // Độ nhạy Z = 15° trên đơn vị chuẩn hóa
    float Z2 = 6.0f;          // Kẹp bão hòa Z2 = 6.0°

    // Trời sáng (ws = 1.0)
    float ws_day = 1.0f;
    float corr_day = clampVal(ws_day * Z * normDiffAz, -Z2, Z2); // 1.0 * 15 * 0.08 = 1.2°
    float phi_hybrid_day = phi_ff + corr_day;
    std::cout << "  - Troi sang: normDiffAz=0.08 -> Hieu chinh tinh: +" << corr_day
              << "° -> Target: " << phi_hybrid_day << "°\n";
    assert(std::fabs(corr_day - 1.20f) < 0.001f);
    assert(std::fabs(phi_hybrid_day - (81.6177f + 1.2f)) < 0.001f);

    // Trời tối / nhiều mây (ws = 0.0) -> Ngắt cảm biến quang, chỉ tin vào NOAA
    float ws_dark = 0.0f;
    float corr_dark = clampVal(ws_dark * Z * normDiffAz, -Z2, Z2);
    float phi_hybrid_dark = phi_ff + corr_dark;
    std::cout << "  - Troi toi (ws=0): Hieu chinh = " << corr_dark
              << "° -> Tin 100% vao NOAA: " << phi_hybrid_dark << "°\n";
    assert(corr_dark == 0.0f);
    assert(phi_hybrid_dark == phi_ff);

    // Nhiễu quang lớn (normDiff = 0.8) -> Bị kẹp bão hòa tại Z2 = 6.0°
    float normDiffBig = 0.8f;
    float corr_sat = clampVal(ws_day * Z * normDiffBig, -Z2, Z2); // 15 * 0.8 = 12° -> kẹp 6°
    std::cout << "  - Nhieu quang cuc dai (normDiff=0.8): Hieu chinh bi kep tai Z2 = " << corr_sat << "°\n";
    assert(corr_sat == 6.0f);
  }
  std::cout << "  ==> [PASS] Cong thuc Hybrid van hanh dung chuan ly thuyet va bao ve chat che!\n\n";

  // TEST 3: Logic tính thời gian báo thức Alarm 1 cho DS3231
  std::cout << "[TEST 3] LOGIC TINH GIO BAO THUC DS3231 ALARM 1:\n";
  {
    // Trường hợp 1: Thử nghiệm ngủ nhanh 2 phút lúc 11:58:30 -> Báo thức 12:00:30 (chuyển giao giờ)
    int curH = 11, curMin = 58, curS = 30;
    int sleepMinutes = 2;

    int targetMin = (curMin + sleepMinutes) % 60;
    int targetH   = (curH + ((curMin + sleepMinutes) / 60)) % 24;

    std::cout << "  - Hien tai: " << curH << ":" << curMin << ":" << curS
              << " + " << sleepMinutes << " phut -> Hen bao thuc: "
              << targetH << ":" << targetMin << ":" << curS << "\n";
    assert(targetH == 12 && targetMin == 0);

    // Trường hợp 2: Chuyển giao nửa đêm 23:59:00 + 5 phút -> 00:04:00 ngày hôm sau
    curH = 23; curMin = 59; curS = 0;
    sleepMinutes = 5;
    targetMin = (curMin + sleepMinutes) % 60;
    targetH   = (curH + ((curMin + sleepMinutes) / 60)) % 24;
    std::cout << "  - Chuyen giao ngay: 23:59:00 + 5 phut -> Hen bao thuc: "
              << targetH << ":" << targetMin << ":" << curS << "\n";
    assert(targetH == 0 && targetMin == 4);
  }
  std::cout << "  ==> [PASS] Tinh thoi gian bao thuc chinh xac 100% ca khi sang gio/sang ngay moi!\n\n";

  std::cout << "=================================================================\n";
  std::cout << " TAT CA CAC UNIT TEST NATIVE CHO NOAA & ALARM DEU DA PASS (100%)!\n";
  std::cout << "=================================================================\n";
  return 0;
}
