/**
 * @file solar_ephemeris.h
 * @brief THUẬT TOÁN THIÊN VĂN NOAA TÍNH VỊ TRÍ MẶT TRỜI CHUẨN XÁC CAO
 * @details Tính toán Julian Day, độ xích vĩ (Declination), phương trình thời gian (Equation of Time),
 *          góc giờ (Hour Angle), phương vị mặt trời (Azimuth), góc nâng (Elevation), bù khúc xạ khí quyển,
 *          và thời điểm mặt trời mọc/lặn.
 *          Tương thích C++17 thuần, không phụ thuộc thư viện ngoài.
 */

#ifndef SOLAR_EPHEMERIS_H
#define SOLAR_EPHEMERIS_H

#include "solar_types.h"
#include <stdint.h>

namespace solar {

class SolarEphemeris {
public:
    /**
     * @brief Tính toán vị trí mặt trời và thông số nhật triều tại một thời điểm bất kỳ
     * @param year Năm (vd: 2026)
     * @param month Tháng (1..12)
     * @param day Ngày (1..31)
     * @param hour Giờ (0..23)
     * @param minute Phút (0..59)
     * @param second Giây (0..59)
     * @param tz_offset_hours Chênh lệch múi giờ UTC (Việt Nam = +7.0)
     * @param lat_deg Vĩ độ nơi đặt giàn (Placeholder CFG_A_LATITUDE_DEG)
     * @param lon_deg Kinh độ nơi đặt giàn (Placeholder CFG_B_LONGITUDE_DEG)
     * @param enable_refraction true để bù khúc xạ khí quyển
     * @return Struct SolarPosition chứa azimuth, elevation, zenith, sunrise, sunset
     */
    static SolarPosition calculate(int year, int month, int day,
                                  int hour, int minute, int second,
                                  float tz_offset_hours,
                                  float lat_deg, float lon_deg,
                                  bool enable_refraction = true);

    /**
     * @brief Hàm wrap góc về miền [0, 360) độ
     */
    static float wrap360(float angle_deg);

    /**
     * @brief Hàm wrap góc về miền [-180, +180) độ
     */
    static float wrap180(float angle_deg);
};

} // namespace solar

#endif // SOLAR_EPHEMERIS_H
