"""
solar_geometry.py
BẢN THAM CHIẾU PYTHON CHO BIẾN ĐỔI HÌNH HỌC TẤM PIN, KẸP AN TOÀN VÀ BÁO THỨC
Khớp chính xác với solar_geometry.cpp trong C++ Firmware.
"""

from typing import Tuple
from solar_types import SolarPosition, AxisTarget
import solar_config as cfg
from solar_ephemeris import wrap360

def is_zenith_singularity(el_sun: float) -> bool:
    return el_sun >= 88.0

import math

def compute_axis_targets(sun_pos: SolarPosition, base_az_deg: float = 90.0) -> Tuple[bool, AxisTarget, AxisTarget]:
    target_az = AxisTarget()
    target_el = AxisTarget()

    # 1. Động học hệ cơ cấu giàn pin:
    # Trục 1: Trục bù góc mùa Bắc - Nam quanh hướng Đông mặc định (base_az_deg)
    el_rad = math.radians(sun_pos.elevation_deg)
    az_rad = math.radians(sun_pos.azimuth_deg)
    sy = max(-1.0, min(1.0, math.cos(el_rad) * math.cos(az_rad)))
    delta_phi = math.degrees(math.asin(sy))

    phi_raw = base_az_deg - delta_phi
    target_az.feedforward_deg = round(phi_raw, 4)

    # Trục 2: Trục nhật động Đông - Tây theo góc nâng mặt trời
    eps_raw = sun_pos.elevation_deg
    target_el.feedforward_deg = round(eps_raw, 4)

    # 2. Kẹp góc mềm trục Azimuth (Trục 1): [base_az - 45°, base_az + 45°]
    min_az_allowed = max(0.0, base_az_deg - 45.0)
    max_az_allowed = min(cfg.CFG_I_AZ_MAX_SOFT_LIMIT_DEG, base_az_deg + 45.0)
    phi_clamped = phi_raw
    if phi_raw < min_az_allowed:
        phi_clamped = min_az_allowed
        target_az.is_clamped = True
        target_az.clamp_reason = "SEASONAL_MIN_45"
    elif phi_raw > max_az_allowed:
        phi_clamped = max_az_allowed
        target_az.is_clamped = True
        target_az.clamp_reason = "SEASONAL_MAX_45"
    target_az.final_ref_deg = round(phi_clamped, 4)

    # 3. Kẹp góc mềm trục Elevation (Trục 2): [CFG_L_EL_MIN_SOFT_LIMIT_DEG (10.0°), CFG_J_EL_HOME_SW_DEG (90.0°)]
    eps_clamped = eps_raw
    if eps_raw < cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG:
        eps_clamped = cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG
        target_el.is_clamped = True
        target_el.clamp_reason = "WEST_HORIZON_LIMIT_10"
    elif eps_raw > cfg.CFG_J_EL_HOME_SW_DEG:
        eps_clamped = cfg.CFG_J_EL_HOME_SW_DEG
        target_el.is_clamped = True
        target_el.clamp_reason = "ZENITH_CLAMP"
    target_el.final_ref_deg = round(eps_clamped, 4)

    is_tracking_active = (sun_pos.elevation_deg >= cfg.CFG_EL_SUN_TRACKING_THRESHOLD_DEG)
    return is_tracking_active, target_az, target_el

def compute_morning_wakeup(tracking_start_min: int, lead_minutes: int = cfg.CFG_WAKEUP_LEAD_TIME_MIN) -> Tuple[int, int]:
    # Báo thức sáng = max(03:00 = 180 phút, tracking_start_min - lead_minutes)
    wake_min = tracking_start_min - lead_minutes
    min_allowed = cfg.CFG_NIGHT_SLEEP_END_HOUR * 60 + cfg.CFG_NIGHT_SLEEP_END_MINUTE
    if wake_min < min_allowed:
        wake_min = min_allowed
    hour = (wake_min // 60) % 24
    minute = wake_min % 60
    return hour, minute
