/**
 * @file solar_ephemeris.cpp
 * @brief HIỆN THỰC THUẬT TOÁN NOAA SOLAR POSITION CALCULATOR
 */

#include "solar_ephemeris.h"
#include <cmath>
#include <algorithm>

namespace solar {

namespace {
    constexpr double DEG_TO_RAD = 3.14159265358979323846 / 180.0;
    constexpr double RAD_TO_DEG = 180.0 / 3.14159265358979323846;

    inline double degToRad(double deg) { return deg * DEG_TO_RAD; }
    inline double radToDeg(double rad) { return rad * RAD_TO_DEG; }
}

float SolarEphemeris::wrap360(float angle_deg) {
    float res = std::fmod(angle_deg, 360.0f);
    if (res < 0.0f) {
        res += 360.0f;
    }
    return res;
}

float SolarEphemeris::wrap180(float angle_deg) {
    float res = wrap360(angle_deg);
    if (res >= 180.0f) {
        res -= 360.0f;
    }
    return res;
}

SolarPosition SolarEphemeris::calculate(int year, int month, int day,
                                      int hour, int minute, int second,
                                      float tz_offset_hours,
                                      float lat_deg, float lon_deg,
                                      bool enable_refraction) {
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
    l0 = std::fmod(l0, 360.0);
    if (l0 < 0.0) l0 += 360.0;

    // 3. Geometric Mean Anomaly of Sun (M, degrees)
    double m_anomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    m_anomaly = std::fmod(m_anomaly, 360.0);
    if (m_anomaly < 0.0) m_anomaly += 360.0;

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
    double delta_rad = std::asin(std::clamp(sin_delta, -1.0, 1.0));

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
    cos_zenith = std::clamp(cos_zenith, -1.0, 1.0);
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
    // Robust atan2 formulation avoids quadrant ambiguity
    double sin_ha = std::sin(ha_rad);
    double cos_ha = std::cos(ha_rad);
    double x_az = std::cos(lat_rad) * std::sin(delta_rad) - std::sin(lat_rad) * std::cos(delta_rad) * cos_ha;
    double y_az = -std::cos(delta_rad) * sin_ha;

    double az_from_south = std::atan2(y_az, x_az);
    double az_from_north = radToDeg(az_from_south);
    az_from_north = wrap360(static_cast<float>(az_from_north));

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
        double h0_deg = radToDeg(std::acos(cos_h0));
        pos.sunrise_min = static_cast<uint16_t>(std::clamp(solar_noon_min - 4.0 * h0_deg, 0.0, 1440.0));
        pos.sunset_min = static_cast<uint16_t>(std::clamp(solar_noon_min + 4.0 * h0_deg, 0.0, 1440.0));
    }

    pos.azimuth_deg = static_cast<float>(az_from_north);
    pos.elevation_deg = static_cast<float>(el_corrected);
    pos.zenith_deg = static_cast<float>(90.0 - el_corrected);
    pos.is_daylight = (pos.elevation_deg >= 0.0f);

    return pos;
}

} // namespace solar
