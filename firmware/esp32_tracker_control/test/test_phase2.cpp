/**
 * @file test_phase2.cpp
 * @brief BỘ KIỂM THỬ TOÀN DIỆN CẢM BIẾN QUANG TEMT6000 & THUẬT TOÁN CHUẨN HÓA
 * @details Kiểm tra:
 *          1. Cân bằng tâm sáng (Sun Centroid) khi nắng chính diện
 *          2. Độ lệch quang có định hướng: Lệch trái, lệch phải, lệch trên, lệch dưới
 *          3. Kẹp bão hòa sat(w_s * Z * e_s, ±Z2) bảo vệ chống mây lừa
 *          4. Vùng chết Deadband ±0.04 triệt tiêu dao động cơ học vi bước
 *          5. Xử lý trời tối / mây mù (T_dark) đưa trọng số w_s về 0
 *          6. Cảnh báo bão hòa ADC (W = 3950)
 *          7. Tự động cân bằng Zero-Offset (Gain Calibration)
 */

#include <iostream>
#include <iomanip>
#include <cmath>
#include <cassert>

#include "solar_config.h"
#include "solar_types.h"
#include "temt6000_processor.h"

int main() {
    std::cout << "================================================================================" << std::endl;
    std::cout << "[PHASE 2 C++ UNIT TEST] KIEM THU THUAT TOAN XU LY CAM BIEN QUANG TEMT6000" << std::endl;
    std::cout << "================================================================================" << std::endl;

    const float default_gain[4] = {1.0f, 1.0f, 1.0f, 1.0f};

    // -------------------------------------------------------------------------
    // TEST 1: Nắng chiếu vuông góc chính diện (Tâm sáng cân bằng)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 1: NANG CHINH DIEN (CAN BANG 4 MAT DOC) ---" << std::endl;
    uint16_t adc_balanced[4] = {2000, 2000, 2000, 2000};
    solar::TemtReadings r1;
    solar::Temt6000Processor::processReadings(adc_balanced, default_gain, r1);

    float corr_az = 0.0f, corr_el = 0.0f;
    solar::Temt6000Processor::computeCorrectionAngles(r1, corr_az, corr_el);

    std::cout << "  e_s_az = " << r1.e_s_az << ", e_s_el = " << r1.e_s_el 
              << ", w_s = " << r1.w_s << ", corr_az = " << corr_az << " deg, corr_el = " << corr_el << " deg" << std::endl;
    assert(r1.e_s_az == 0.0f);
    assert(r1.e_s_el == 0.0f);
    assert(r1.w_s == 1.0f);
    assert(corr_az == 0.0f);
    assert(corr_el == 0.0f);
    std::cout << "  [PASS] Tam sang can bang tuyet doi, khong co goc lech hieu chinh" << std::endl;

    // -------------------------------------------------------------------------
    // TEST 2: Nắng lệch sang trái (Left sáng hơn Right)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 2: NANG LECH SANG TRAI (LEFT > RIGHT) ---" << std::endl;
    // Top=2000, Bottom=2000, Left=2500, Right=1500
    // e_s_az = (2500 - 1500)/(4000) = 1000/4000 = 0.25
    // corr_az = 1.0 * 12.0° * 0.25 = +3.0°
    uint16_t adc_left[4] = {2000, 2000, 2500, 1500};
    solar::TemtReadings r2;
    solar::Temt6000Processor::processReadings(adc_left, default_gain, r2);
    solar::Temt6000Processor::computeCorrectionAngles(r2, corr_az, corr_el);

    std::cout << "  e_s_az = " << r2.e_s_az << " (ly thuyet: 0.25), corr_az = " << corr_az << " deg (ly thuyet: +3.0 deg)" << std::endl;
    assert(std::fabs(r2.e_s_az - 0.25f) < 1e-4);
    assert(std::fabs(r2.e_s_el - 0.0f) < 1e-4);
    assert(std::fabs(corr_az - 3.0f) < 1e-4);
    assert(std::fabs(corr_el - 0.0f) < 1e-4);
    std::cout << "  [PASS] Phat hien lech trai chinh xac, sinh goc hieu chinh +3.0 deg" << std::endl;

    // -------------------------------------------------------------------------
    // TEST 3: Nắng lệch mạnh góc lớn -> Kiểm tra Kẹp Saturation ±Z2 (±6.0°)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 3: NANG LECH MANH -> KEP BAO VE ±Z2 (±6.0 DEG) ---" << std::endl;
    // Left=3500, Right=500 -> e_s_az = 3000/4000 = 0.75
    // raw_corr = 1.0 * 12.0° * 0.75 = 9.0° -> Vuot Z2 (6.0°)
    uint16_t adc_large_tilt[4] = {2000, 2000, 3500, 500};
    solar::TemtReadings r3;
    solar::Temt6000Processor::processReadings(adc_large_tilt, default_gain, r3);
    solar::Temt6000Processor::computeCorrectionAngles(r3, corr_az, corr_el);

    std::cout << "  e_s_az = " << r3.e_s_az << " -> raw = 9.0 deg -> Clamp sat(±Z2) = " << corr_az << " deg" << std::endl;
    assert(std::fabs(corr_az - CFG_Z2_MAX_OPTICAL_CORRECTION_DEG) < 1e-4);
    std::cout << "  [PASS] Bao ve sat ±Z2 hoat dong hoan hao, gioi han bien do toi da 6.0 deg" << std::endl;

    // -------------------------------------------------------------------------
    // TEST 4: Vùng chết Deadband (±0.04)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 4: VUNG CHET DEADBAND (|e_s| < 0.04) ---" << std::endl;
    // Left=2020, Right=1980 -> diff=40, sum=4000 -> e_s_az = 0.01 (< 0.04)
    uint16_t adc_deadband[4] = {2000, 2000, 2020, 1980};
    solar::TemtReadings r4;
    solar::Temt6000Processor::processReadings(adc_deadband, default_gain, r4);
    solar::Temt6000Processor::computeCorrectionAngles(r4, corr_az, corr_el);

    std::cout << "  e_s_az truoc deadband = 0.01 -> Sau deadband = " << r4.e_s_az 
              << ", corr_az = " << corr_az << " deg" << std::endl;
    assert(r4.e_s_az == 0.0f);
    assert(corr_az == 0.0f);
    std::cout << "  [PASS] Deadband triet tieu thanh cong sai lech nho, ngan dong co rung lac" << std::endl;

    // -------------------------------------------------------------------------
    // TEST 5: Trời tối / Mây mù (Tổng cường độ sáng < T_dark = 400)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 5: TROI TOI / MAY MU NANG (SUM < T_DARK) ---" << std::endl;
    uint16_t adc_dark[4] = {80, 70, 90, 60}; // Sum = 300 < 400
    solar::TemtReadings r5;
    solar::Temt6000Processor::processReadings(adc_dark, default_gain, r5);
    solar::Temt6000Processor::computeCorrectionAngles(r5, corr_az, corr_el);

    std::cout << "  Sum = " << r5.total_intensity << " < T_dark(400) -> w_s = " << r5.w_s 
              << ", corr_az = " << corr_az << " deg, corr_el = " << corr_el << " deg" << std::endl;
    assert(r5.w_s == 0.0f);
    assert(corr_az == 0.0f);
    assert(corr_el == 0.0f);
    std::cout << "  [PASS] Khi troi toi, w_s tu dong ve 0, he thong chi tin vao feedforward NOAA" << std::endl;

    // -------------------------------------------------------------------------
    // TEST 6: Bão hòa quang ADC (Một mắt đọc >= W = 3950)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 6: BAO HOA QUANG (RAW >= W = 3950) ---" << std::endl;
    uint16_t adc_sat[4] = {2000, 2000, 3980, 2000};
    solar::TemtReadings r6;
    solar::Temt6000Processor::processReadings(adc_sat, default_gain, r6);
    solar::Temt6000Processor::computeCorrectionAngles(r6, corr_az, corr_el);

    std::cout << "  Left = 3980 >= W(3950) -> is_saturated = " << (r6.is_saturated ? "TRUE" : "FALSE")
              << ", w_s = " << r6.w_s << ", corr_az = " << corr_az << " deg" << std::endl;
    assert(r6.is_saturated == true);
    assert(r6.w_s == 0.0f);
    assert(corr_az == 0.0f);
    std::cout << "  [PASS] Phat hien bao hoa ADC, khoa an toan cam bien quang" << std::endl;

    // -------------------------------------------------------------------------
    // TEST 7: Tự động cân bằng Zero-Offset (Gain Calibration)
    // -------------------------------------------------------------------------
    std::cout << "\n--- TEST 7: TU DONG CAN BANG ZERO-OFFSET (CALIBRATION) ---" << std::endl;
    // Dưới ánh sáng đồng nhất, 4 mắt đọc lệch nhau do dung sai linh kiện:
    // Top=1900, Bottom=2100, Left=1950, Right=2050 (Avg = 2000.0)
    uint16_t uniform_adc[4] = {1900, 2100, 1950, 2050};
    float calib_gain[4] = {1.0f, 1.0f, 1.0f, 1.0f};

    bool calib_ok = solar::Temt6000Processor::calibrateGain(uniform_adc, calib_gain);
    assert(calib_ok);

    std::cout << "  He so gain tinh duoc: V_top=" << calib_gain[0] << ", V_bot=" << calib_gain[1]
              << ", V_left=" << calib_gain[2] << ", V_right=" << calib_gain[3] << std::endl;

    // Áp dụng hệ số gain này vào mắt đọc:
    solar::TemtReadings r7;
    solar::Temt6000Processor::processReadings(uniform_adc, calib_gain, r7);
    solar::Temt6000Processor::computeCorrectionAngles(r7, corr_az, corr_el);

    std::cout << "  Sau calib: Comp=[T:" << r7.compensated[0] << ", B:" << r7.compensated[1] 
              << ", L:" << r7.compensated[2] << ", R:" << r7.compensated[3] << "]" << std::endl;
    std::cout << "  e_s_az = " << r7.e_s_az << ", e_s_el = " << r7.e_s_el 
              << ", corr_az = " << corr_az << " deg, corr_el = " << corr_el << " deg" << std::endl;

    assert(std::fabs(r7.compensated[0] - 2000.0f) < 1.0f);
    assert(std::fabs(r7.compensated[1] - 2000.0f) < 1.0f);
    assert(std::fabs(r7.compensated[2] - 2000.0f) < 1.0f);
    assert(std::fabs(r7.compensated[3] - 2000.0f) < 1.0f);
    assert(r7.e_s_az == 0.0f);
    assert(r7.e_s_el == 0.0f);
    assert(corr_az == 0.0f);
    assert(corr_el == 0.0f);
    std::cout << "  [PASS] Zero-Offset Calibration can bang hoan hao 4 mat doc ve cung 2000.0!" << std::endl;

    std::cout << "\n================================================================================" << std::endl;
    std::cout << "[PHASE 2 C++ TEST] TAT CA 7 KIEM THU CAM BIEN QUANG TEMT6000 PASS 100%!" << std::endl;
    std::cout << "================================================================================" << std::endl;

    return 0;
}
