/**
 * @file solar_ephemeris.cpp
 * @brief HIỆN THỰC THUẬT TOÁN NOAA VÀ SPENCER SOLAR POSITION CALCULATOR
 */

#include "solar_ephemeris.h"
#include <cmath>
#include <algorithm>

namespace solar {

namespace {
    constexpr double PI = 3.14159265358979323846;
    constexpr double DEG_TO_RAD = PI / 180.0;
    constexpr double RAD_TO_DEG = 180.0 / PI;

    inline double degToRad(double deg) { return deg * DEG_TO_RAD; }
    inline double radToDeg(double rad) { return rad * RAD_TO_DEG; }

    template <typename T>
    inline T clampVal(T val, T low, T high) {
        return (val < low) ? low : ((val > high) ? high : val);
    }
}

bool SolarEphemeris::isLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int SolarEphemeris::dayOfYear(int year, int month, int day) {
    static const int days_in_month[12] = {
        31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    };
    if (month < 1 || month > 12) return -1;
    int doy = 0;
    for (int i = 0; i < month - 1; ++i) {
        doy += days_in_month[i];
    }
    if (month > 2 && isLeapYear(year)) {
        doy += 1;
    }
    return doy + day;
}

double SolarEphemeris::wrap360(double angle_deg) {
    double res = std::fmod(angle_deg, 360.0);
    if (res < 0.0) {
        res += 360.0;
    }
    return res;
}

double SolarEphemeris::wrap180(double angle_deg) {
    double res = wrap360(angle_deg);
    if (res >= 180.0) {
        res -= 360.0;
    }
    return res;
}

SolarPosition SolarEphemeris::calculate(int year, int month, int day,
                                      int hour, int minute, int second,
                                      double tz_offset_hours,
                                      double lat_deg, double lon_deg,
                                      bool enable_refraction,
                                      double tracking_threshold_deg) {
    // 0. Kiểm tra tính hợp lệ của đầu vào
    if (month < 1 || month > 12 || day < 1 || day > 31 ||
        hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59 ||
        std::isnan(lat_deg) || std::isnan(lon_deg) || std::isinf(lat_deg) || std::isinf(lon_deg)) {
        SolarPosition pos = {};
        pos.is_daylight = false;
        return pos;
    }

    SolarPosition pos = {};
    pos.atmospheric_refract_applied = enable_refraction;

    // 1. Julian Day (JD) calculation
    int y = year;
    int m = month;
    if (m <= 2) {
        y -= 1;
        m += 12;
    }
    int a_term = y / 100;
    int b_term = 2 - a_term + (a_term / 4);

    double day_fraction = (hour + (minute / 60.0) + (second / 3600.0) - tz_offset_hours) / 24.0;
    double jd = std::floor(365.25 * (y + 4716)) + std::floor(30.6001 * (m + 1)) + day + b_term - 1524.5 + day_fraction;

    // Julian Century
    double t = (jd - 2451545.0) / 36525.0;

    // 2. Geometric Mean Longitude of Sun (L0, degrees)
    double l0 = 280.46646 + t * (36000.76983 + 0.0003032 * t);
    l0 = wrap360(l0);

    // 3. Geometric Mean Anomaly of Sun (M, degrees)
    double m_anomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    m_anomaly = wrap360(m_anomaly);

    // 4. Eccentricity of Earth orbit (e)
    double e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

    // 5. Sun Equation of Center (C, degrees)
    double m_rad = degToRad(m_anomaly);
    double c = std::sin(m_rad) * (1.914602 - t * (0.004817 + 0.000014 * t))
             + std::sin(2.0 * m_rad) * (0.019993 - 0.000101 * t)
             + std::sin(3.0 * m_rad) * 0.000289;

    // 6. Sun True Longitude (degrees)
    double sun_true_lon = l0 + c;

    // 7. Sun Apparent Longitude (lambda, degrees)
    double omega = 125.04 - 1934.136 * t;
    double lambda = sun_true_lon - 0.00569 - 0.00478 * std::sin(degToRad(omega));

    // 8. Mean Obliquity of Ecliptic & Corrected Obliquity (epsilon, degrees)
    double eps0 = 23.0 + (26.0 + (21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0;
    double eps = eps0 + 0.00256 * std::cos(degToRad(omega));

    // 9. Solar Declination (delta, degrees)
    double eps_rad = degToRad(eps);
    double lambda_rad = degToRad(lambda);
    double sin_delta = std::sin(eps_rad) * std::sin(lambda_rad);
    double delta_rad = std::asin(clampVal(sin_delta, -1.0, 1.0));

    // 10. Equation of Time (EoT, minutes)
    double y_param = std::tan(eps_rad / 2.0);
    y_param = y_param * y_param;
    double l0_rad = degToRad(l0);

    double eot = 4.0 * RAD_TO_DEG * (
        y_param * std::sin(2.0 * l0_rad)
        - 2.0 * e * std::sin(m_rad)
        + 4.0 * e * y_param * std::sin(m_rad) * std::cos(2.0 * l0_rad)
        - 0.5 * y_param * y_param * std::sin(4.0 * l0_rad)
        - 1.25 * e * e * std::sin(2.0 * m_rad)
    );

    // 11. True Solar Time & Hour Angle (H, degrees)
    double time_offset = eot + 4.0 * lon_deg - 60.0 * tz_offset_hours;
    double true_solar_time_min = (hour * 60.0 + minute + second / 60.0) + time_offset;
    true_solar_time_min = std::fmod(true_solar_time_min, 1440.0);
    if (true_solar_time_min < 0.0) true_solar_time_min += 1440.0;

    double hour_angle_deg = (true_solar_time_min / 4.0) - 180.0;
    if (hour_angle_deg < -180.0) hour_angle_deg += 360.0;

    // 12. Solar Zenith and Raw Elevation
    double ha_rad = degToRad(hour_angle_deg);
    double lat_rad = degToRad(lat_deg);

    double cos_zenith = std::sin(lat_rad) * std::sin(delta_rad)
                      + std::cos(lat_rad) * std::cos(delta_rad) * std::cos(ha_rad);
    cos_zenith = clampVal(cos_zenith, -1.0, 1.0);
    double zenith_rad = std::acos(cos_zenith);
    double zenith_deg = radToDeg(zenith_rad);
    double el_raw = 90.0 - zenith_deg;

    // 13. Atmospheric Refraction Correction
    double el_corrected = el_raw;
    if (enable_refraction && el_raw > -0.85) {
        double r_arcsec = 0.0;
        if (el_raw > 5.0) {
            double tan_el = std::tan(degToRad(el_raw));
            r_arcsec = (58.1 / tan_el) - (0.07 / (tan_el * tan_el * tan_el)) + (0.000086 / (tan_el * tan_el * tan_el * tan_el * tan_el));
        } else if (el_raw >= -0.575) {
            r_arcsec = 1735.0 + el_raw * (-518.2 + el_raw * (103.4 + el_raw * (-12.79 + el_raw * 0.711)));
        } else {
            r_arcsec = -20.774 / std::tan(degToRad(el_raw));
        }
        el_corrected += (r_arcsec / 3600.0);
    }

    // 14. Solar Azimuth (Clockwise from North = 0°)
    double sin_ha = std::sin(ha_rad);
    double cos_ha = std::cos(ha_rad);
    double x_az = std::cos(lat_rad) * std::sin(delta_rad) - std::sin(lat_rad) * std::cos(delta_rad) * cos_ha;
    double y_az = -std::cos(delta_rad) * sin_ha;

    double az_from_south = std::atan2(y_az, x_az);
    double az_from_north = radToDeg(az_from_south);
    az_from_north = wrap360(az_from_north);

    // 15. Sunrise & Sunset Calculation (standard astronomical zenith 90.833°)
    double cos_h0 = (std::cos(degToRad(90.833)) - std::sin(lat_rad) * std::sin(delta_rad)) /
                    (std::cos(lat_rad) * std::cos(delta_rad));

    double solar_noon_min = 720.0 - 4.0 * lon_deg - eot + 60.0 * tz_offset_hours;
    solar_noon_min = std::fmod(solar_noon_min, 1440.0);
    if (solar_noon_min < 0.0) solar_noon_min += 1440.0;

    if (cos_h0 > 1.0) {
        // Polar night (Sun never rises)
        pos.sunrise_min = 0;
        pos.sunset_min = 0;
    } else if (cos_h0 < -1.0) {
        // Midnight sun (Sun never sets)
        pos.sunrise_min = 0;
        pos.sunset_min = 1440;
    } else {
        double h0_deg = radToDeg(std::acos(clampVal(cos_h0, -1.0, 1.0)));
        pos.sunrise_min = static_cast<uint16_t>(clampVal(solar_noon_min - 4.0 * h0_deg, 0.0, 1440.0));
        pos.sunset_min = static_cast<uint16_t>(clampVal(solar_noon_min + 4.0 * h0_deg, 0.0, 1440.0));
    }

    // 16. Tracking Start & End Calculation (when el_sun reaches tracking_threshold_deg)
    double sin_el_track = std::sin(degToRad(tracking_threshold_deg));
    double cos_h_track = (sin_el_track - std::sin(lat_rad) * std::sin(delta_rad)) /
                         (std::cos(lat_rad) * std::cos(delta_rad));

    if (cos_h_track > 1.0) {
        pos.tracking_start_min = 0;
        pos.tracking_end_min = 0;
    } else if (cos_h_track < -1.0) {
        pos.tracking_start_min = 0;
        pos.tracking_end_min = 1440;
    } else {
        double h_track_deg = radToDeg(std::acos(clampVal(cos_h_track, -1.0, 1.0)));
        pos.tracking_start_min = static_cast<uint16_t>(clampVal(solar_noon_min - 4.0 * h_track_deg, 0.0, 1440.0));
        pos.tracking_end_min = static_cast<uint16_t>(clampVal(solar_noon_min + 4.0 * h_track_deg, 0.0, 1440.0));
    }

    pos.azimuth_deg = az_from_north;
    pos.elevation_deg = el_corrected;
    pos.zenith_deg = 90.0 - el_corrected;
    pos.is_daylight = (pos.elevation_deg >= 0.0);

    return pos;
}

SolarPosition SolarEphemeris::calculateSpencer(int year, int month, int day,
                                              int hour, int minute, int second,
                                              double tz_offset_hours,
                                              double lat_deg, double lon_deg,
                                              bool enable_refraction,
                                              double tracking_threshold_deg) {
    if (month < 1 || month > 12 || day < 1 || day > 31 ||
        hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59 ||
        std::isnan(lat_deg) || std::isnan(lon_deg) || std::isinf(lat_deg) || std::isinf(lon_deg)) {
        SolarPosition pos = {};
        pos.is_daylight = false;
        return pos;
    }

    SolarPosition pos = {};
    pos.atmospheric_refract_applied = enable_refraction;

    int N = dayOfYear(year, month, day);
    double total_days = isLeapYear(year) ? 366.0 : 365.0;
    double day_fraction = (hour + minute / 60.0 + second / 3600.0 - 12.0 - tz_offset_hours) / 24.0;
    double gamma = 2.0 * PI * (N - 1.0 + day_fraction) / total_days;

    // 2. Spencer Equation of Time (EoT, minutes)
    double eot = 229.18 * (0.000075 + 0.001868 * std::cos(gamma) - 0.032077 * std::sin(gamma)
                          - 0.014615 * std::cos(2.0 * gamma) - 0.040849 * std::sin(2.0 * gamma));

    // 3. Spencer Declination (delta, radians)
    double delta = (0.006918 - 0.399912 * std::cos(gamma) + 0.070257 * std::sin(gamma)
                   - 0.006758 * std::cos(2.0 * gamma) + 0.000907 * std::sin(2.0 * gamma)
                   - 0.002697 * std::cos(3.0 * gamma) + 0.00148 * std::sin(3.0 * gamma));

    // 4. True solar time & hour angle
    double time_offset = eot + 4.0 * lon_deg - 60.0 * tz_offset_hours;
    double true_solar_time_min = (hour * 60.0 + minute + second / 60.0) + time_offset;
    true_solar_time_min = std::fmod(true_solar_time_min, 1440.0);
    if (true_solar_time_min < 0.0) true_solar_time_min += 1440.0;

    double hour_angle_deg = (true_solar_time_min / 4.0) - 180.0;
    if (hour_angle_deg < -180.0) hour_angle_deg += 360.0;

    double ha_rad = degToRad(hour_angle_deg);
    double lat_rad = degToRad(lat_deg);

    // 5. Zenith & raw elevation
    double cos_zenith = std::sin(lat_rad) * std::sin(delta)
                      + std::cos(lat_rad) * std::cos(delta) * std::cos(ha_rad);
    cos_zenith = clampVal(cos_zenith, -1.0, 1.0);
    double zenith_rad = std::acos(cos_zenith);
    double zenith_deg = radToDeg(zenith_rad);
    double el_raw = 90.0 - zenith_deg;

    // 6. Refraction
    double el_corrected = el_raw;
    if (enable_refraction && el_raw > -0.85) {
        double r_arcsec = 0.0;
        if (el_raw > 5.0) {
            double tan_el = std::tan(degToRad(el_raw));
            r_arcsec = (58.1 / tan_el) - (0.07 / (tan_el * tan_el * tan_el)) + (0.000086 / (tan_el * tan_el * tan_el * tan_el * tan_el));
        } else if (el_raw >= -0.575) {
            r_arcsec = 1735.0 + el_raw * (-518.2 + el_raw * (103.4 + el_raw * (-12.79 + el_raw * 0.711)));
        } else {
            r_arcsec = -20.774 / std::tan(degToRad(el_raw));
        }
        el_corrected += (r_arcsec / 3600.0);
    }

    // 7. Azimuth
    double sin_ha = std::sin(ha_rad);
    double cos_ha = std::cos(ha_rad);
    double x_az = std::cos(lat_rad) * std::sin(delta) - std::sin(lat_rad) * std::cos(delta) * cos_ha;
    double y_az = -std::cos(delta) * sin_ha;

    double az_from_south = std::atan2(y_az, x_az);
    double az_from_north = radToDeg(az_from_south);
    az_from_north = wrap360(az_from_north);

    // 8. Sunrise & Sunset
    double cos_h0 = (std::cos(degToRad(90.833)) - std::sin(lat_rad) * std::sin(delta)) /
                    (std::cos(lat_rad) * std::cos(delta));

    double solar_noon_min = 720.0 - 4.0 * lon_deg - eot + 60.0 * tz_offset_hours;
    solar_noon_min = std::fmod(solar_noon_min, 1440.0);
    if (solar_noon_min < 0.0) solar_noon_min += 1440.0;

    if (cos_h0 > 1.0) {
        pos.sunrise_min = 0;
        pos.sunset_min = 0;
    } else if (cos_h0 < -1.0) {
        pos.sunrise_min = 0;
        pos.sunset_min = 1440;
    } else {
        double h0_deg = radToDeg(std::acos(clampVal(cos_h0, -1.0, 1.0)));
        pos.sunrise_min = static_cast<uint16_t>(clampVal(solar_noon_min - 4.0 * h0_deg, 0.0, 1440.0));
        pos.sunset_min = static_cast<uint16_t>(clampVal(solar_noon_min + 4.0 * h0_deg, 0.0, 1440.0));
    }

    // 9. Tracking Start & End Calculation (Spencer)
    double sin_el_track = std::sin(degToRad(tracking_threshold_deg));
    double cos_h_track = (sin_el_track - std::sin(lat_rad) * std::sin(delta)) /
                         (std::cos(lat_rad) * std::cos(delta));

    if (cos_h_track > 1.0) {
        pos.tracking_start_min = 0;
        pos.tracking_end_min = 0;
    } else if (cos_h_track < -1.0) {
        pos.tracking_start_min = 0;
        pos.tracking_end_min = 1440;
    } else {
        double h_track_deg = radToDeg(std::acos(clampVal(cos_h_track, -1.0, 1.0)));
        pos.tracking_start_min = static_cast<uint16_t>(clampVal(solar_noon_min - 4.0 * h_track_deg, 0.0, 1440.0));
        pos.tracking_end_min = static_cast<uint16_t>(clampVal(solar_noon_min + 4.0 * h_track_deg, 0.0, 1440.0));
    }

    pos.azimuth_deg = az_from_north;
    pos.elevation_deg = el_corrected;
    pos.zenith_deg = 90.0 - el_corrected;
    pos.is_daylight = (pos.elevation_deg >= 0.0);

    return pos;
}

} // namespace solar
