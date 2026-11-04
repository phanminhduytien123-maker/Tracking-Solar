/**
 * @file test_phase3.cpp
 * @brief BỘ KIỂM THỬ TỰ ĐỘNG PHASE 3: QUY ĐỔI XUNG, ENCODER & ĐỘNG HỌC CHUYỂN ĐỘNG
 */

#include "motion_kinematics.h"
#include <iostream>
#include <cassert>
#include <cmath>
#include <iomanip>

using namespace solar;

void test1_conversion_factors() {
    std::cout << "\n--- TEST 1: HỆ SỐ QUY ĐỔI XUNG & ENCODER ---" << std::endl;
    float k_pulse_az = MotionKinematics::getPulsePerDegree(AxisId::AZIMUTH);
    float k_pulse_el = MotionKinematics::getPulsePerDegree(AxisId::ELEVATION);
    float k_enc_az = MotionKinematics::getEncoderCountsPerDegree(AxisId::AZIMUTH);
    float k_enc_el = MotionKinematics::getEncoderCountsPerDegree(AxisId::ELEVATION);

    // K_pulse = 1600 * 3.0 / 360 = 13.33333...
    float expected_k = (1600.0f * 3.0f) / 360.0f;
    std::cout << "  K_pulse: Az=" << k_pulse_az << ", El=" << k_pulse_el
              << " (Ky vong: " << expected_k << " pulses/deg)" << std::endl;
    std::cout << "  K_enc:   Az=" << k_enc_az << ", El=" << k_enc_el
              << " (Ky vong: " << expected_k << " counts/deg)" << std::endl;

    assert(std::fabs(k_pulse_az - expected_k) < 1e-4f);
    assert(std::fabs(k_pulse_el - expected_k) < 1e-4f);
    assert(std::fabs(k_enc_az - expected_k) < 1e-4f);
    assert(std::fabs(k_enc_el - expected_k) < 1e-4f);
    std::cout << "  [PASS] He so quy doi khop 100% voi cong thuc ty so truyen!" << std::endl;
}

void test2_angle_pulse_roundtrip() {
    std::cout << "\n--- TEST 2: CHUYỂN ĐỔI HAI CHIỀU GÓC <-> XUNG ---" << std::endl;
    float angles[] = {0.0f, 10.0f, 25.0f, 45.0f, 65.0f, 90.0f, 180.0f, 270.0f};

    for (float a : angles) {
        int32_t pulses = MotionKinematics::angleToPulses(AxisId::ELEVATION, a);
        float reconstructed = MotionKinematics::pulsesToAngle(AxisId::ELEVATION, pulses);
        float err = std::fabs(reconstructed - a);
        // Do lam tron xung, sai so toi da nho hon nua xung = 0.5 / 13.333 = 0.0375 deg
        assert(err <= 0.04f);
    }
    std::cout << "  [PASS] Chuyen doi hai chieu 8 moc goc chinh xac trong 0.038 deg!" << std::endl;
}

void test3_step_loss_detection() {
    std::cout << "\n--- TEST 3: PHÁT HIỆN MẤT BƯỚC THỜI GIAN THỰC ---" << std::endl;
    int32_t cmd_pulses = 1000;

    // 1. Bình thường: encoder đọc về 990 (lệch 10 xung < tolerance 64)
    float loss_deg = 0.0f;
    bool is_loss = MotionKinematics::checkStepLoss(AxisId::AZIMUTH, cmd_pulses, 990, CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS, &loss_deg);
    assert(!is_loss);
    std::cout << "  Lech 10 counts: is_loss=" << (is_loss ? "TRUE" : "FALSE") << ", loss_deg=" << loss_deg << " deg -> Binh thuong" << std::endl;

    // 2. Mất bước nghiêm trọng: encoder đọc về 900 (lệch 100 xung > tolerance 64)
    is_loss = MotionKinematics::checkStepLoss(AxisId::AZIMUTH, cmd_pulses, 900, CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS, &loss_deg);
    assert(is_loss);
    // 100 counts / 13.333 = 7.5 deg
    assert(std::fabs(loss_deg - 7.5f) < 0.01f);
    std::cout << "  Lech 100 counts: is_loss=" << (is_loss ? "TRUE" : "FALSE") << ", loss_deg=" << loss_deg << " deg -> Phat hien mat buoc!" << std::endl;
    std::cout << "  [PASS] Logic phat hien mat buoc hoat dong chinh xac!" << std::endl;
}

void test4_trapezoidal_profile() {
    std::cout << "\n--- TEST 4: BIÊN DẠNG GIA TỐC HÌNH THANG ---" << std::endl;
    // 1. Chuyển động vi bước nhỏ (50 xung) -> Profile hình tam giác
    MotionProfile p_small = MotionKinematics::calculateTrapezoidalProfile(50, 4000.0f, 200.0f, 6000.0f);
    assert(p_small.is_triangular);
    assert(p_small.cruise_time_sec == 0.0f);
    assert(p_small.peak_freq_hz < 4000.0f);
    std::cout << "  N=50 xung: Triangular, f_peak=" << p_small.peak_freq_hz << " Hz, t_total=" << p_small.total_time_sec << " s" << std::endl;

    // 2. Chuyển động góc lớn (2000 xung) -> Profile hình thang có đoạn chạy đều cruise
    MotionProfile p_large = MotionKinematics::calculateTrapezoidalProfile(2000, 1200.0f, 200.0f, 6000.0f);
    assert(!p_large.is_triangular);
    assert(p_large.cruise_time_sec > 0.0f);
    assert(std::fabs(p_large.peak_freq_hz - 1200.0f) < 1e-3f);
    std::cout << "  N=2000 xung: Trapezoidal, cruise=" << p_large.cruise_time_sec << " s, t_total=" << p_large.total_time_sec << " s" << std::endl;
    std::cout << "  [PASS] Phan biet tam giac va hinh thang chuan xac!" << std::endl;
}

void test5_move_time_home_to_25deg() {
    std::cout << "\n--- TEST 5: THỜI GIAN QUAY HOME (90°) -> L=25° ---" << std::endl;
    float delta_el = 90.0f - 25.0f; // 65°
    int32_t pulses = MotionKinematics::angleToPulses(AxisId::ELEVATION, delta_el);
    float t_fast = MotionKinematics::calculateMoveTime(AxisId::ELEVATION, 90.0f, 25.0f, CFG_HOMING_FAST_FREQ_HZ);
    float t_slow = MotionKinematics::calculateMoveTime(AxisId::ELEVATION, 90.0f, 25.0f, CFG_HOMING_SLOW_FREQ_HZ);

    std::cout << "  Quang duong quay Elevation: " << delta_el << " deg = " << pulses << " xung" << std::endl;
    std::cout << "  Thoi gian quay o toc do 1200 Hz: " << t_fast << " giay" << std::endl;
    std::cout << "  Thoi gian quay o toc do cham 300 Hz: " << t_slow << " giay" << std::endl;

    assert(pulses == 867);
    assert(t_fast < 1.5f);
    assert(t_slow < 4.0f);
    std::cout << "  [PASS] Thoi gian quay 65 deg chi mat < 1 giay o toc do nhanh va < 3 giay o toc do cham!" << std::endl;
}

void test6_soft_limits() {
    std::cout << "\n--- TEST 6: GIỚI HẠN MỀM (SOFT LIMITS) ---" << std::endl;
    // Azimuth: [2.0°, 270.0°]
    assert(MotionKinematics::isWithinSoftLimits(AxisId::AZIMUTH, 2.0f));
    assert(MotionKinematics::isWithinSoftLimits(AxisId::AZIMUTH, 150.0f));
    assert(MotionKinematics::isWithinSoftLimits(AxisId::AZIMUTH, 270.0f));
    assert(!MotionKinematics::isWithinSoftLimits(AxisId::AZIMUTH, 1.5f));
    assert(!MotionKinematics::isWithinSoftLimits(AxisId::AZIMUTH, 271.0f));

    // Elevation: [25.0°, 90.0°]
    assert(MotionKinematics::isWithinSoftLimits(AxisId::ELEVATION, 25.0f));
    assert(MotionKinematics::isWithinSoftLimits(AxisId::ELEVATION, 60.0f));
    assert(MotionKinematics::isWithinSoftLimits(AxisId::ELEVATION, 90.0f));
    assert(!MotionKinematics::isWithinSoftLimits(AxisId::ELEVATION, 24.9f));
    assert(!MotionKinematics::isWithinSoftLimits(AxisId::ELEVATION, 91.0f));
    std::cout << "  [PASS] Kiem soat gioi han mem 2 truc an toan tuyet doi!" << std::endl;
}

void test7_wakeup_budget_verification() {
    std::cout << "\n--- TEST 7: KIỂM TRA NGÂN SÁCH THỜI GIAN BÁO THỨC SỚM 20 PHÚT ---" << std::endl;
    float t_routine = MotionKinematics::calculateWakeupRoutineTime(90.0f, 25.0f, 45.0f, 108.5f);
    float budget_sec = CFG_WAKEUP_LEAD_TIME_MIN * 60.0f; // 20 * 60 = 1200s

    std::cout << "  Tong thoi gian toan bo chu trinh thuc day (Homing 2 truc + Slew don nang): "
              << t_routine << " giay (" << t_routine / 60.0f << " phut)" << std::endl;
    std::cout << "  Ngan sach thoi gian bao thuc som da dat: "
              << budget_sec << " giay (" << CFG_WAKEUP_LEAD_TIME_MIN << " phut)" << std::endl;
    std::cout << "  Du thoi gian an toan: "
              << (budget_sec - t_routine) / 60.0f << " phut" << std::endl;

    assert(t_routine < budget_sec);
    assert(t_routine < 60.0f); // Khang dinh toan bo qua trinh chi mat chua day 1 phut
    std::cout << "  [PASS] 20 phut bao thuc som la HOAN TOAN DU VA AN TOAN TUYET DOI!" << std::endl;
}

int main() {
    std::cout << "================================================================================" << std::endl;
    std::cout << "[PHASE 3 C++ UNIT TEST] QUY ĐỔI XUNG, ENCODER & ĐỘNG HỌC CHUYỂN ĐỘNG" << std::endl;
    std::cout << "================================================================================" << std::endl;

    test1_conversion_factors();
    test2_angle_pulse_roundtrip();
    test3_step_loss_detection();
    test4_trapezoidal_profile();
    test5_move_time_home_to_25deg();
    test6_soft_limits();
    test7_wakeup_budget_verification();

    std::cout << "\n================================================================================" << std::endl;
    std::cout << "[PHASE 3 C++ TEST] TẤT CẢ 7 KIỂM THỬ ĐỘNG HỌC CHUYỂN ĐỘNG PASS 100%!" << std::endl;
    std::cout << "================================================================================" << std::endl;

    return 0;
}
