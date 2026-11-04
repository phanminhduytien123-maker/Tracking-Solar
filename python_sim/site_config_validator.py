"""
site_config_validator.py
BẢN THAM CHIẾU PYTHON CHO BỘ KIỂM TRA HỢP LỆ SiteConfig (ĐỒNG BỘ 100% VỚI C++)
"""

import math
from typing import Tuple
from solar_types import SiteConfig, SiteSource, TrackerState, FaultFlag

VN_LAT_MIN = 8.0
VN_LAT_MAX = 24.0
VN_LON_MIN = 102.0
VN_LON_MAX = 110.0

def round5_decimals(val: float) -> float:
    return round(val, 5)

def parse_coordinate_string(s: str) -> Tuple[bool, float]:
    if not s:
        return False, 0.0
    clean_s = s.strip().replace(',', '.')
    try:
        val = float(clean_s)
        if math.isnan(val) or math.isinf(val):
            return False, 0.0
        return True, val
    except ValueError:
        return False, 0.0

def validate_and_normalize(lat: float, lon: float, rev: int = 1,
                           updated_at: int = 0, updated_by: str = "default",
                           source: SiteSource = SiteSource.FIREBASE) -> SiteConfig:
    cfg = SiteConfig(
        lat_deg=0.0,
        lon_deg=0.0,
        rev=rev,
        updated_at=updated_at,
        updated_by=updated_by or "unknown",
        valid=False,
        warning_outside_vn=False,
        warning_inverted=False,
        source=source
    )

    if math.isnan(lat) or math.isinf(lat) or math.isnan(lon) or math.isinf(lon):
        return cfg

    # Từ chối (0, 0)
    if abs(lat) < 1e-6 and abs(lon) < 1e-6:
        return cfg

    # Dải hợp lệ toàn cầu
    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        return cfg

    # Cảnh báo đảo kinh/vĩ độ
    if VN_LON_MIN <= lat <= VN_LON_MAX and VN_LAT_MIN <= lon <= VN_LAT_MAX:
        cfg.warning_inverted = True

    # Cảnh báo nằm ngoài khung Việt Nam
    if lat < VN_LAT_MIN or lat > VN_LAT_MAX or lon < VN_LON_MIN or lon > VN_LON_MAX:
        cfg.warning_outside_vn = True

    cfg.lat_deg = round5_decimals(lat)
    cfg.lon_deg = round5_decimals(lon)
    cfg.valid = True
    return cfg

def can_apply_new_site_config(current_state: TrackerState, experiment_lock: bool) -> Tuple[bool, int]:
    faults = FaultFlag.NONE
    if experiment_lock:
        faults |= FaultFlag.SITE_CHANGE_REJECTED
        return False, faults

    if current_state in (TrackerState.BOOT, TrackerState.PARK, TrackerState.PREP_SLEEP,
                         TrackerState.DEEP_SLEEP, TrackerState.DAWN_POLL):
        return True, faults

    faults |= FaultFlag.SITE_CHANGE_REJECTED
    return False, faults

def is_revision_newer(incoming_rev: int, current_rev: int) -> bool:
    return incoming_rev > current_rev

