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
                                      float base_az_deg,
                                      float zenith_el_deg) {
    // Khởi tạo struct mặc định
    out_target_az.sensor_corr_deg = 0.0f;
    out_target_el.sensor_corr_deg = 0.0f;
    out_target_az.is_clamped = false;
    out_target_el.is_clamped = false;
    out_target_az.clamp_reason = "NONE";
    out_target_el.clamp_reason = "NONE";

    // 1. ĐỘNG HỌC HỆ CƠ CẤU GIÀN PIN THỰC TẾ (HỆ TỌA ĐỘ 2 TRỤC XOAY NGANG & NGỬA DỌC):
    // Trục 1 (Azimuth / Xoay Ngang):
    // Switch Home 1 đặt tại góc la bàn Chính Nam (base_az_deg = 180.0°).
    // Chiều quay phi tăng từ Home (0.0°) quay ngược chiều kim đồng hồ ra xa về phía Đông (90.0°).
    // - Buổi sáng (az_sun <= base_az_deg): Mặt pin hướng thẳng đón nắng Đông -> Nam:
    //     phi_target = base_az_deg - az_sun
    // - Buổi chiều (az_sun > base_az_deg): Trục 1 quay sang hướng đối diện (Đông Bắc), Trục 2 ngửa lật ra sau đón nắng Tây:
    //     phi_target = 360.0f - az_sun (Ví dụ: az_sun = 260° Tây Nam -> phi_target = 100° Đông Bắc)
    float az_s = static_cast<float>(sun_pos.azimuth_deg);
    float el_s = static_cast<float>(sun_pos.elevation_deg);
    float phi_raw = 0.0f;
    float eps_raw = zenith_el_deg;

    // Khoảng cách góc so với thiên đỉnh (Zenith distance: 0° tại đỉnh trời, 90° tại chân trời)
    float delta_zenith = 90.0f - el_s;
    if (delta_zenith < 0.0f) delta_zenith = 0.0f;

    // Kẹp biên an toàn cho zenith_el_deg trong dải [20.0°, 70.0°]
    if (zenith_el_deg < 20.0f) zenith_el_deg = 20.0f;
    if (zenith_el_deg > 70.0f) zenith_el_deg = 70.0f;

    if (az_s <= base_az_deg) {
        // Buổi sáng: Trục 1 đón nắng Đông -> Nam, Trục 2 nghiêng sườn trước đón Đông (tiến về phía switch 90°)
        phi_raw = base_az_deg - az_s;
        eps_raw = zenith_el_deg + delta_zenith * ((CFG_J_EL_HOME_SW_DEG - zenith_el_deg) / 90.0f);
    } else {
        // Buổi chiều: Trục 1 quay sang Đông Bắc, Trục 2 NGỬA LẬT RA SAU đón nắng Tây (tiến về phía 10°)
        phi_raw = 360.0f - az_s;
        eps_raw = zenith_el_deg - delta_zenith * ((zenith_el_deg - CFG_L_EL_MIN_SOFT_LIMIT_DEG) / 90.0f);
    }
    out_target_az.feedforward_deg = phi_raw;
    out_target_el.feedforward_deg = eps_raw;

    // 2. Kẹp góc mềm trục Azimuth (Trục 1): [0.0°, CFG_I_AZ_MAX_SOFT_LIMIT_DEG]
    // Nếu góc nằm ngoài phạm vi hành trình trục, kẹp lại an toàn chống xoắn cáp
    float min_az_allowed = 0.0f;
    float max_az_allowed = CFG_I_AZ_MAX_SOFT_LIMIT_DEG;
    float phi_clamped = phi_raw;
    if (phi_raw < min_az_allowed) {
        phi_clamped = min_az_allowed;
        out_target_az.is_clamped = true;
        out_target_az.clamp_reason = "AZ_MIN_LIMIT";
    } else if (phi_raw > max_az_allowed) {
        phi_clamped = max_az_allowed;
        out_target_az.is_clamped = true;
        out_target_az.clamp_reason = "AZ_MAX_LIMIT";
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
