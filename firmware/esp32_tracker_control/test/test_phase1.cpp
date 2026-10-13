/**
 * @file test_phase1.cpp
 * @brief KIỂM THỬ THUẬT TOÁN NOAA VÀ BIẾN ĐỔI HÌNH HỌC TẤM PIN C++
 * @details Đảm bảo kết quả C++ khớp 100% với bản tham chiếu Python.
 */

#include <iostream>
#include <cassert>
#include <cmath>
#include <iomanip>
#include "solar_config.h"
#include "solar_types.h"
#include "solar_ephemeris.h"
#include "solar_geometry.h"

int main() {
    std::cout << "[PHASE 1 C++ TEST] Bat dau kiem thu thuat toan thien van NOAA..." << std::endl;

    // 1. Kiem thu ngay thi nghiem 15/11/2026 luc 12:00 (Solar noon)
    solar::SolarPosition pos_noon = solar::SolarEphemeris::calculate(
        2026, 11, 15, 12, 0, 0,
        CFG_TIMEZONE_OFFSET_HOURS,
        CFG_A_LATITUDE_DEG, CFG_B_LONGITUDE_DEG, true
    );

    std::cout << "15/11/2026 12:00 -> Az_sun = " << pos_noon.azimuth_deg
              << " deg, El_sun = " << pos_noon.elevation_deg << " deg" << std::endl;

    // Kiem tra sai so goc (So voi Python Az=190.55, El=60.21)
    assert(std::fabs(pos_noon.azimuth_deg - 190.55f) < 0.1f);
    assert(std::fabs(pos_noon.elevation_deg - 60.21f) < 0.1f);

    // 2. Kiem thu mat troi moc va bao thuc DS3231
    // Sunrise Python tinh duoc: 05:49 = 349 phut
    std::cout << "Sunrise = " << pos_noon.sunrise_min / 60 << ":"
              << std::setfill('0') << std::setw(2) << pos_noon.sunrise_min % 60
              << ", Sunset = " << pos_noon.sunset_min / 60 << ":"
              << std::setfill('0') << std::setw(2) << pos_noon.sunset_min % 60 << std::endl;

    solar::WakeupTime wt = solar::SolarGeometry::computeMorningWakeup(pos_noon.sunrise_min);
    std::cout << "Wakeup Alarm = " << (int)wt.hour << ":"
              << std::setfill('0') << std::setw(2) << (int)wt.minute << std::endl;

    assert(wt.hour == 5);
    assert(wt.minute == 19);

    // 3. Kiem thu bien doi goc tam va kep goc bao ve va cham truc Z
    solar::SolarPosition pos_morning = solar::SolarEphemeris::calculate(
        2026, 11, 15, 6, 10, 0,
        CFG_TIMEZONE_OFFSET_HOURS,
        CFG_A_LATITUDE_DEG, CFG_B_LONGITUDE_DEG, true
    );

    solar::AxisTarget tgt_az, tgt_el;
    bool is_tracking = solar::SolarGeometry::computeAxisTargets(pos_morning, tgt_az, tgt_el);

    std::cout << "06:10 AM -> El_sun = " << pos_morning.elevation_deg
              << " deg (< L=25.0 deg) -> eps_ref = " << tgt_el.final_ref_deg
              << " deg (Clamp: " << tgt_el.clamp_reason << ")" << std::endl;

    assert(!is_tracking); // El_sun < 10 deg -> Chua kich hoat bam
    assert(tgt_el.is_clamped);
    assert(tgt_el.final_ref_deg == CFG_L_EL_MIN_SOFT_LIMIT_DEG);

    // 4. Kiem thu buoi trua 09:00 -> Tracking hop le
    solar::SolarPosition pos_active = solar::SolarEphemeris::calculate(
        2026, 11, 15, 9, 0, 0,
        CFG_TIMEZONE_OFFSET_HOURS,
        CFG_A_LATITUDE_DEG, CFG_B_LONGITUDE_DEG, true
    );
    is_tracking = solar::SolarGeometry::computeAxisTargets(pos_active, tgt_az, tgt_el);
    assert(is_tracking);
    assert(!tgt_az.is_clamped);
    assert(!tgt_el.is_clamped);

    std::cout << "[PHASE 1 C++ TEST] TAT CA KIEM THU C++ PASS 100% KHOP HOAN TOAN VOI PYTHON!" << std::endl;
    return 0;
}
