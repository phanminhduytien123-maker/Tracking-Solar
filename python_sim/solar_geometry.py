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

def compute_axis_targets(sun_pos: SolarPosition, base_az_deg: float = 180.0, zenith_el_deg: float = 50.0) -> Tuple[bool, AxisTarget, AxisTarget]:
    target_az = AxisTarget()
    target_el = AxisTarget()

    az_s = sun_pos.azimuth_deg
    el_s = sun_pos.elevation_deg
    delta_zenith = max(0.0, 90.0 - el_s)

    zenith_clamped = max(20.0, min(70.0, zenith_el_deg))

    if az_s <= base_az_deg:
        phi_raw = max(0.0, base_az_deg - az_s)
        eps_raw = zenith_clamped + delta_zenith * ((cfg.CFG_J_EL_HOME_SW_DEG - zenith_clamped) / 90.0)
    else:
        phi_raw = 360.0 - az_s
        eps_raw = zenith_clamped - delta_zenith * ((zenith_clamped - cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG) / 90.0)

    target_az.feedforward_deg = round(phi_raw, 4)
    target_el.feedforward_deg = round(eps_raw, 4)

    # 2. Kẹp góc mềm trục Azimuth (Trục 1): [0.0°, CFG_I_AZ_MAX_SOFT_LIMIT_DEG]
    min_az_allowed = 0.0
    max_az_allowed = cfg.CFG_I_AZ_MAX_SOFT_LIMIT_DEG
    phi_clamped = phi_raw
    if phi_raw < min_az_allowed:
        phi_clamped = min_az_allowed
        target_az.is_clamped = True
        target_az.clamp_reason = "AZ_MIN_LIMIT"
    elif phi_raw > max_az_allowed:
        phi_clamped = max_az_allowed
        target_az.is_clamped = True
        target_az.clamp_reason = "AZ_MAX_LIMIT"
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

    # 4. Điều kiện kích hoạt bám
    is_tracking_active = sun_pos.elevation_deg >= cfg.CFG_EL_SUN_TRACKING_THRESHOLD_DEG

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
