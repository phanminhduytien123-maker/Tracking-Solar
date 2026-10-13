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

def compute_axis_targets(sun_pos: SolarPosition) -> Tuple[bool, AxisTarget, AxisTarget]:
    target_az = AxisTarget()
    target_el = AxisTarget()

    # 1. Tính toán góc Feedforward thô
    phi_raw = wrap360(sun_pos.azimuth_deg - cfg.CFG_G_AZ_HOME_SW_DEG - cfg.CFG_H_AZ_OFFSET_DEG)
    target_az.feedforward_deg = round(phi_raw, 4)

    eps_raw = sun_pos.elevation_deg
    target_el.feedforward_deg = round(eps_raw, 4)

    # 2. Kẹp góc mềm trục Azimuth: phi trong [CFG_AZ_MIN_SOFT_LIMIT_DEG, CFG_I_AZ_MAX_SOFT_LIMIT_DEG]
    phi_clamped = phi_raw
    if phi_raw < cfg.CFG_AZ_MIN_SOFT_LIMIT_DEG:
        phi_clamped = cfg.CFG_AZ_MIN_SOFT_LIMIT_DEG
        target_az.is_clamped = True
        target_az.clamp_reason = "CABLE_LIMIT_MIN"
    elif phi_raw > cfg.CFG_I_AZ_MAX_SOFT_LIMIT_DEG:
        phi_clamped = cfg.CFG_I_AZ_MAX_SOFT_LIMIT_DEG
        target_az.is_clamped = True
        target_az.clamp_reason = "CABLE_LIMIT_MAX"
    target_az.final_ref_deg = round(phi_clamped, 4)

    # 3. Kẹp góc mềm trục Elevation: epsilon trong [CFG_L_EL_MIN_SOFT_LIMIT_DEG, CFG_J_EL_HOME_SW_DEG]
    # BẢO VỆ CHỐNG VA CHẠM TRỤC Z
    eps_clamped = eps_raw
    if eps_raw < cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG:
        eps_clamped = cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG
        target_el.is_clamped = True
        target_el.clamp_reason = "Z_AXIS_CLASH_PROTECT"
    elif eps_raw > cfg.CFG_J_EL_HOME_SW_DEG:
        eps_clamped = cfg.CFG_J_EL_HOME_SW_DEG
        target_el.is_clamped = True
        target_el.clamp_reason = "ZENITH_CLAMP"
    target_el.final_ref_deg = round(eps_clamped, 4)

    is_tracking_active = (sun_pos.elevation_deg >= cfg.CFG_EL_SUN_TRACKING_THRESHOLD_DEG)
    return is_tracking_active, target_az, target_el

def compute_morning_wakeup(sunrise_min: int) -> Tuple[int, int]:
    # Báo thức sáng = max(03:00 = 180 phút, sunrise_min - 30 phút)
    wake_min = sunrise_min - 30
    min_allowed = cfg.CFG_NIGHT_SLEEP_END_HOUR * 60 + cfg.CFG_NIGHT_SLEEP_END_MINUTE
    if wake_min < min_allowed:
        wake_min = min_allowed
    hour = (wake_min // 60) % 24
    minute = wake_min % 60
    return hour, minute
