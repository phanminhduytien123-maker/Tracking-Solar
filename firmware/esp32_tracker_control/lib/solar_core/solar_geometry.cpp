/**
 * @file solar_geometry.cpp
 * @brief HIỆN THỰC CHUYỂN ĐỔI HÌNH HỌC TẤM PIN & KẸP AN TOÀN
 */

#include "solar_geometry.h"
#include "solar_ephemeris.h"
#include <algorithm>

namespace solar {

bool SolarGeometry::isZenithSingularity(float el_sun) {
    // Vùng góc nâng > 88°, bán kính quỹ đạo phương vị cực nhỏ khiến az_sun biến thiên cực nhanh
    return (el_sun >= 88.0f);
}

bool SolarGeometry::computeAxisTargets(const SolarPosition& sun_pos,
                                      AxisTarget& out_target_az,
                                      AxisTarget& out_target_el) {
    // Khởi tạo struct mặc định
    out_target_az.sensor_corr_deg = 0.0f;
    out_target_el.sensor_corr_deg = 0.0f;
    out_target_az.is_clamped = false;
    out_target_el.is_clamped = false;
    out_target_az.clamp_reason = "NONE";
    out_target_el.clamp_reason = "NONE";

    // 1. Tính toán góc Feedforward thô
    // Trục Azimuth: phi_ff = wrap360(az_sun - G - H)
    float phi_raw = SolarEphemeris::wrap360(sun_pos.azimuth_deg - CFG_G_AZ_HOME_SW_DEG - CFG_H_AZ_OFFSET_DEG);
    out_target_az.feedforward_deg = phi_raw;

    // Trục Elevation: epsilon_ff = el_sun
    float eps_raw = sun_pos.elevation_deg;
    out_target_el.feedforward_deg = eps_raw;

    // 2. Kẹp góc mềm trục Azimuth: phi trong [CFG_AZ_MIN_SOFT_LIMIT_DEG, CFG_I_AZ_MAX_SOFT_LIMIT_DEG]
    float phi_clamped = phi_raw;
    if (phi_raw < CFG_AZ_MIN_SOFT_LIMIT_DEG) {
        phi_clamped = CFG_AZ_MIN_SOFT_LIMIT_DEG;
        out_target_az.is_clamped = true;
        out_target_az.clamp_reason = "CABLE_LIMIT_MIN";
    } else if (phi_raw > CFG_I_AZ_MAX_SOFT_LIMIT_DEG) {
        phi_clamped = CFG_I_AZ_MAX_SOFT_LIMIT_DEG;
        out_target_az.is_clamped = true;
        out_target_az.clamp_reason = "CABLE_LIMIT_MAX";
    }
    out_target_az.final_ref_deg = phi_clamped;

    // 3. Kẹp góc mềm trục Elevation: epsilon trong [CFG_L_EL_MIN_SOFT_LIMIT_DEG, CFG_J_EL_HOME_SW_DEG]
    // BẢO VỆ CHỐNG ĐÂM TRỤC Z: epsilon không bao giờ được nhỏ hơn L
    float eps_clamped = eps_raw;
    if (eps_raw < CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
        eps_clamped = CFG_L_EL_MIN_SOFT_LIMIT_DEG;
        out_target_el.is_clamped = true;
        out_target_el.clamp_reason = "Z_AXIS_CLASH_PROTECT";
    } else if (eps_raw > CFG_J_EL_HOME_SW_DEG) {
        eps_clamped = CFG_J_EL_HOME_SW_DEG;
        out_target_el.is_clamped = true;
        out_target_el.clamp_reason = "ZENITH_CLAMP";
    }
    out_target_el.final_ref_deg = eps_clamped;

    // 4. Kiểm tra điều kiện bắt đầu bám (el_sun >= ngưỡng góc nâng quy định)
    bool is_tracking_active = (sun_pos.elevation_deg >= CFG_EL_SUN_TRACKING_THRESHOLD_DEG);

    return is_tracking_active;
}

WakeupTime SolarGeometry::computeMorningWakeup(uint16_t sunrise_min) {
    WakeupTime wt;
    // Báo thức sáng = max(03:00 = 180 phút, sunrise_min - 30 phút)
    int wake_min = static_cast<int>(sunrise_min) - 30;
    int min_allowed = CFG_NIGHT_SLEEP_END_HOUR * 60 + CFG_NIGHT_SLEEP_END_MINUTE; // 3 * 60 = 180

    if (wake_min < min_allowed) {
        wake_min = min_allowed;
    }

    wt.hour = static_cast<uint8_t>((wake_min / 60) % 24);
    wt.minute = static_cast<uint8_t>(wake_min % 60);
    return wt;
}

} // namespace solar
