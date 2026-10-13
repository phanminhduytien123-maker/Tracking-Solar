"""
solar_ephemeris.py
BẢN THAM CHIẾU PYTHON CHO THUẬT TOÁN THIÊN VĂN NOAA TÍNH VỊ TRÍ MẶT TRỜI
Khớp chính xác từng bước công thức với solar_ephemeris.cpp trong C++ Firmware.
"""

import math
from typing import Tuple
from solar_types import SolarPosition

def wrap360(angle_deg: float) -> float:
    res = angle_deg % 360.0
    if res < 0.0:
        res += 360.0
    return res

def wrap180(angle_deg: float) -> float:
    res = wrap360(angle_deg)
    if res >= 180.0:
        res -= 360.0
    return res

def calculate_solar_position(
    year: int, month: int, day: int,
    hour: int, minute: int, second: int,
    tz_offset_hours: float,
    lat_deg: float, lon_deg: float,
    enable_refraction: bool = True
) -> SolarPosition:
    # 1. Julian Day (JD)
    y = year
    m = month
    if m <= 2:
        y -= 1
        m += 12
    a_term = y // 100
    b_term = 2 - a_term + (a_term // 4)

    day_fraction = (hour + (minute / 60.0) + (second / 3600.0) - tz_offset_hours) / 24.0
    jd = math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + day + b_term - 1524.5 + day_fraction

    # Julian Century
    t = (jd - 2451545.0) / 36525.0

    # 2. Geometric Mean Longitude of Sun (L0, degrees)
    l0 = 280.46646 + t * (36000.76983 + 0.0003032 * t)
    l0 = wrap360(l0)

    # 3. Geometric Mean Anomaly of Sun (M, degrees)
    m_anomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t)
    m_anomaly = wrap360(m_anomaly)

    # 4. Eccentricity of Earth orbit (e)
    e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)

    # 5. Sun Equation of Center (C, degrees)
    m_rad = math.radians(m_anomaly)
    c = (math.sin(m_rad) * (1.914602 - t * (0.004817 + 0.000014 * t))
         + math.sin(2.0 * m_rad) * (0.019993 - 0.000101 * t)
         + math.sin(3.0 * m_rad) * 0.000289)

    # 6. Sun True Longitude (degrees)
    sun_true_lon = l0 + c

    # 7. Sun Apparent Longitude (lambda, degrees)
    omega = 125.04 - 1934.136 * t
    omega_rad = math.radians(omega)
    sun_app_lon = sun_true_lon - 0.00569 - 0.00478 * math.sin(omega_rad)

    # 8. Mean Obliquity of Ecliptic & Corrected Obliquity (epsilon, degrees)
    eps0 = 23.0 + (26.0 + (21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0
    eps = eps0 + 0.00256 * math.cos(omega_rad)

    # 9. Solar Declination (delta, degrees)
    eps_rad = math.radians(eps)
    app_lon_rad = math.radians(sun_app_lon)
    sin_delta = math.sin(eps_rad) * math.sin(app_lon_rad)
    sin_delta = max(-1.0, min(1.0, sin_delta))
    delta_rad = math.asin(sin_delta)
    delta_deg = math.degrees(delta_rad)

    # 10. Equation of Time (EoT, minutes)
    y_param = math.tan(eps_rad / 2.0) ** 2
    l0_rad = math.radians(l0)

    eot = 4.0 * math.degrees(
        y_param * math.sin(2.0 * l0_rad)
        - 2.0 * e * math.sin(m_rad)
        + 4.0 * e * y_param * math.sin(m_rad) * math.cos(2.0 * l0_rad)
        - 0.5 * (y_param ** 2) * math.sin(4.0 * l0_rad)
        - 1.25 * (e ** 2) * math.sin(2.0 * m_rad)
    )

    # 11. True Solar Time & Hour Angle (H, degrees)
    time_offset = eot + 4.0 * lon_deg - 60.0 * tz_offset_hours
    true_solar_time_min = (hour * 60.0 + minute + second / 60.0) + time_offset
    true_solar_time_min = true_solar_time_min % 1440.0
    if true_solar_time_min < 0.0:
        true_solar_time_min += 1440.0

    hour_angle_deg = (true_solar_time_min / 4.0) - 180.0
    if hour_angle_deg < -180.0:
        hour_angle_deg += 360.0

    # 12. Solar Zenith and Raw Elevation
    ha_rad = math.radians(hour_angle_deg)
    lat_rad = math.radians(lat_deg)

    cos_zenith = (math.sin(lat_rad) * math.sin(delta_rad)
                  + math.cos(lat_rad) * math.cos(delta_rad) * math.cos(ha_rad))
    cos_zenith = max(-1.0, min(1.0, cos_zenith))
    zenith_rad = math.acos(cos_zenith)
    zenith_deg = math.degrees(zenith_rad)
    el_raw = 90.0 - zenith_deg

    # 13. Atmospheric Refraction Correction
    el_corrected = el_raw
    if enable_refraction and el_raw > -0.85:
        if el_raw > 5.0:
            tan_el = math.tan(math.radians(el_raw))
            r_arcsec = (58.1 / tan_el) - (0.07 / (tan_el ** 3)) + (0.000086 / (tan_el ** 5))
        elif el_raw >= -0.575:
            r_arcsec = 1735.0 + el_raw * (-518.2 + el_raw * (103.4 + el_raw * (-12.79 + el_raw * 0.711)))
        else:
            r_arcsec = -20.774 / math.tan(math.radians(el_raw))
        el_corrected += (r_arcsec / 3600.0)

    # 14. Solar Azimuth (Clockwise from North = 0°)
    sin_ha = math.sin(ha_rad)
    cos_ha = math.cos(ha_rad)
    x_az = math.cos(lat_rad) * math.sin(delta_rad) - math.sin(lat_rad) * math.cos(delta_rad) * cos_ha
    y_az = -math.cos(delta_rad) * sin_ha

    az_from_south = math.atan2(y_az, x_az)
    az_from_north = wrap360(math.degrees(az_from_south))

    # 15. Sunrise & Sunset Calculation (standard astronomical zenith 90.833°)
    cos_h0 = ((math.cos(math.radians(90.833)) - math.sin(lat_rad) * math.sin(delta_rad))
              / (math.cos(lat_rad) * math.cos(delta_rad)))

    solar_noon_min = (720.0 - 4.0 * lon_deg - eot + 60.0 * tz_offset_hours) % 1440.0
    if solar_noon_min < 0.0:
        solar_noon_min += 1440.0

    if cos_h0 > 1.0:
        sunrise_min = 0
        sunset_min = 0
    elif cos_h0 < -1.0:
        sunrise_min = 0
        sunset_min = 1440
    else:
        h0_deg = math.degrees(math.acos(cos_h0))
        sunrise_min = int(max(0.0, min(1440.0, solar_noon_min - 4.0 * h0_deg)))
        sunset_min = int(max(0.0, min(1440.0, solar_noon_min + 4.0 * h0_deg)))

    pos = SolarPosition()
    pos.azimuth_deg = round(az_from_north, 4)
    pos.elevation_deg = round(el_corrected, 4)
    pos.zenith_deg = round(90.0 - el_corrected, 4)
    pos.is_daylight = (pos.elevation_deg >= 0.0)
    pos.sunrise_min = sunrise_min
    pos.sunset_min = sunset_min
    pos.atmospheric_refract_applied = enable_refraction
    return pos
