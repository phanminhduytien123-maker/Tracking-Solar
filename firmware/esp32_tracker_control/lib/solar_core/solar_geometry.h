/**
 * @file solar_geometry.h
 * @brief CHUYỂN ĐỔI TỌA ĐỘ THIÊN VĂN THÀNH GÓC MỤC TIÊU TẤM PIN & KẸP AN TOÀN
 * @details Chịu trách nhiệm:
 *          1. Tính góc Feedforward phi_ff, epsilon_ff từ az_sun, el_sun.
 *          2. Kẹp góc mềm trong giới hạn cơ học [phi_min, I] và [L, J].
 *          3. Xử lý vùng kỳ dị gần thiên đỉnh (Zenith singularity avoidance).
 *          4. Tính thời điểm báo thức sáng cho DS3231: max(03:00, mọc - 30 phút).
 */

#ifndef SOLAR_GEOMETRY_H
#define SOLAR_GEOMETRY_H

#include "solar_types.h"
#include "solar_config.h"

namespace solar {

struct WakeupTime {
    uint8_t hour;
    uint8_t minute;
};

class SolarGeometry {
public:
    /**
     * @brief Chuyển đổi tọa độ mặt trời sang góc mục tiêu 2 trục của tấm pin
     * @param sun_pos Tọa độ thiên văn (azimuth_deg, elevation_deg)
     * @param[out] out_target_az Kết quả mục tiêu trục Azimuth (phi_ff, clamp, cờ)
     * @param[out] out_target_el Kết quả mục tiêu trục Elevation (epsilon_ff, clamp, cờ)
     * @return true nếu điều kiện góc cho phép kích hoạt bám chủ động (el_sun >= ngưỡng)
     */
    static bool computeAxisTargets(const SolarPosition& sun_pos,
                                  AxisTarget& out_target_az,
                                  AxisTarget& out_target_el);

    /**
     * @brief Tính giờ báo thức thức dậy buổi sáng
     * @param sunrise_min Thời điểm mặt trời mọc tính từ 00:00 (phút)
     * @return Struct WakeupTime (hour, minute)
     */
    static WakeupTime computeMorningWakeup(uint16_t sunrise_min);

    /**
     * @brief Kiểm tra mặt trời có đang nằm trong vùng kỳ dị gần thiên đỉnh hay không
     * @param el_sun Góc nâng mặt trời (độ)
     * @return true nếu el_sun > 88.0 độ (vùng nhảy vọt phương vị)
     */
    static bool isZenithSingularity(float el_sun);
};

} // namespace solar

#endif // SOLAR_GEOMETRY_H
