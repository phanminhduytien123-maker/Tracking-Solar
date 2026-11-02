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
#include "solar_config.h"
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
     * @param lat_deg Vĩ độ nơi đặt giàn
     * @param lon_deg Kinh độ nơi đặt giàn
     * @param enable_refraction true để bù khúc xạ khí quyển
     * @param tracking_threshold_deg Ngưỡng góc nâng để tính giờ bắt đầu/kết thúc bám (mặc định CFG_EL_SUN_TRACKING_THRESHOLD_DEG)
     * @return Struct SolarPosition chứa azimuth, elevation, zenith, sunrise, sunset, tracking_start, tracking_end
     */
    static SolarPosition calculate(int year, int month, int day,
                                  int hour, int minute, int second,
                                  double tz_offset_hours,
                                  double lat_deg, double lon_deg,
                                  bool enable_refraction = true,
                                  double tracking_threshold_deg = CFG_EL_SUN_TRACKING_THRESHOLD_DEG);

    /**
     * @brief Bản rút gọn (Spencer / Fourier Series) tính toán siêu nhanh trên vi điều khiển
     */
    static SolarPosition calculateSpencer(int year, int month, int day,
                                         int hour, int minute, int second,
                                         double tz_offset_hours,
                                         double lat_deg, double lon_deg,
                                         bool enable_refraction = true,
                                         double tracking_threshold_deg = CFG_EL_SUN_TRACKING_THRESHOLD_DEG);

    /**
     * @brief Kiểm tra năm nhuận
     */
    static bool isLeapYear(int year);

    /**
     * @brief Tính số thứ tự ngày trong năm (1..366) có xử lý năm nhuận
     */
    static int dayOfYear(int year, int month, int day);

    /**
     * @brief Hàm wrap góc về miền [0, 360) độ
     */
    static double wrap360(double angle_deg);

    /**
     * @brief Hàm wrap góc về miền [-180, +180) độ
     */
    static double wrap180(double angle_deg);
};

} // namespace solar

#endif // SOLAR_EPHEMERIS_H
