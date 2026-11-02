/**
 * @file solar_geometry.cpp
 * @brief HIỆN THỰC CHUYỂN ĐỔI HÌNH HỌC TẤM PIN & KẸP AN TOÀN
 */

#include "solar_geometry.h"
#include "solar_ephemeris.h"
#include <algorithm>

#include <cmath>

namespace solar {

bool SolarGeometry::isZenithSingularity(float el_sun) {
    // Vùng góc nâng > 88°, bán kính quỹ đạo phương vị cực nhỏ khiến az_sun biến thiên cực nhanh
    return (el_sun >= 88.0f);
}

bool SolarGeometry::computeAxisTargets(const SolarPosition& sun_pos,
                                      AxisTarget& out_target_az,
                                      AxisTarget& out_target_el,
                                      float base_az_deg) {
    // Khởi tạo struct mặc định
    out_target_az.sensor_corr_deg = 0.0f;
    out_target_el.sensor_corr_deg = 0.0f;
    out_target_az.is_clamped = false;
    out_target_el.is_clamped = false;
    out_target_az.clamp_reason = "NONE";
    out_target_el.clamp_reason = "NONE";

    // 1. ĐỘNG HỌC HỆ CƠ CẤU GIÀN PIN THỰC TẾ:
    // Trục 1 (Azimuth / Bắc - Nam): Hướng mặc định quay thẳng hướng Đông (~90° hoặc defaultDeg1).
    // Chỉ dao động trong khoảng [base_az - 45°, base_az + 45°] bù góc lệch mùa theo trục Bắc - Nam.
    // Thành phần vector mặt trời hướng Bắc (+)/Nam (-): Sy = cos(El) * cos(Az)
    double el_rad = sun_pos.elevation_deg * (M_PI / 180.0);
    double az_rad = sun_pos.azimuth_deg * (M_PI / 180.0);
    double sy = std::cos(el_rad) * std::cos(az_rad);
    if (sy > 1.0) sy = 1.0;
    if (sy < -1.0) sy = -1.0;
    float delta_phi = static_cast<float>(std::asin(sy) * (180.0 / M_PI)); // Lệch mùa: tối đa ±23.45°

    float phi_raw = base_az_deg - delta_phi;
    out_target_az.feedforward_deg = phi_raw;

    // Trục 2 (Elevation / Đông - Tây): Đảm nhiệm bám nhật động Đông -> Tây theo góc nâng mặt trời.
    // Hạ dần từ 90° (đỉnh trời) xuống 10° (chân trời)
    float eps_raw = static_cast<float>(sun_pos.elevation_deg);
    out_target_el.feedforward_deg = eps_raw;

    // 2. Kẹp góc mềm trục Azimuth (Trục 1):
    // Giới hạn biên độ [base_az - 45.0°, base_az + 45.0°] và [0.0°, CFG_I_AZ_MAX_SOFT_LIMIT_DEG]
    float min_az_allowed = std::max(0.0f, base_az_deg - 45.0f);
    float max_az_allowed = std::min(CFG_I_AZ_MAX_SOFT_LIMIT_DEG, base_az_deg + 45.0f);
    float phi_clamped = phi_raw;
    if (phi_raw < min_az_allowed) {
        phi_clamped = min_az_allowed;
        out_target_az.is_clamped = true;
        out_target_az.clamp_reason = "SEASONAL_MIN_45";
    } else if (phi_raw > max_az_allowed) {
        phi_clamped = max_az_allowed;
        out_target_az.is_clamped = true;
        out_target_az.clamp_reason = "SEASONAL_MAX_45";
    }
    out_target_az.final_ref_deg = phi_clamped;

    // 3. Kẹp góc mềm trục Elevation (Trục 2): [CFG_L_EL_MIN_SOFT_LIMIT_DEG (10.0°), CFG_J_EL_HOME_SW_DEG (90.0°)]
    float eps_clamped = eps_raw;
    if (eps_raw < CFG_L_EL_MIN_SOFT_LIMIT_DEG) {
        eps_clamped = CFG_L_EL_MIN_SOFT_LIMIT_DEG;
        out_target_el.is_clamped = true;
        out_target_el.clamp_reason = "WEST_HORIZON_LIMIT_10";
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

WakeupTime SolarGeometry::computeMorningWakeup(uint16_t tracking_start_min, uint8_t lead_minutes) {
    WakeupTime wt;
    // Báo thức sáng = max(03:00 = 180 phút, tracking_start_min - lead_minutes)
    int wake_min = static_cast<int>(tracking_start_min) - lead_minutes;
    int min_allowed = CFG_NIGHT_SLEEP_END_HOUR * 60 + CFG_NIGHT_SLEEP_END_MINUTE; // 3 * 60 = 180

    if (wake_min < min_allowed) {
        wake_min = min_allowed;
    }

    wt.hour = static_cast<uint8_t>((wake_min / 60) % 24);
    wt.minute = static_cast<uint8_t>(wake_min % 60);
    return wt;
}

} // namespace solar
