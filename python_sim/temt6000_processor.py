"""
temt6000_processor.py
BẢN THAM CHIẾU PYTHON CHO THUẬT TOÁN XỬ LÝ TÍN HIỆU CẢM BIẾN QUANG TEMT6000
Khớp 100% với temt6000_processor.cpp trong C++ Firmware.
"""

from typing import Tuple, List, Optional
from solar_types import TemtReadings
import solar_config as cfg

def process_temt_readings(
    raw_adc: List[int],
    gain_v: Optional[List[float]] = None
) -> TemtReadings:
    if gain_v is None:
        gain_v = [cfg.CFG_V_GAIN_LDR_TOP, cfg.CFG_V_GAIN_LDR_BOTTOM, cfg.CFG_V_GAIN_LDR_LEFT, cfg.CFG_V_GAIN_LDR_RIGHT]

    readings = TemtReadings()
    saturated = False
    comp = []

    for i in range(4):
        val = raw_adc[i]
        readings.raw_adc[i] = val
        if val >= cfg.CFG_W_ADC_SATURATION_THRESHOLD:
            saturated = True
        g = gain_v[i] if (gain_v[i] > 0.0) else 1.0
        c = val * g
        comp.append(c)
        readings.compensated[i] = round(c, 2)

    sum_intensity = sum(comp)
    readings.is_saturated = saturated
    readings.total_intensity = round(sum_intensity, 2)

    # Trọng số tin cậy w_s
    if saturated or sum_intensity < cfg.CFG_X_T_DARK_THRESHOLD:
        w_s = 0.0
    elif sum_intensity >= cfg.CFG_Y_T_BRIGHT_THRESHOLD:
        w_s = 1.0
    else:
        w_s = (sum_intensity - cfg.CFG_X_T_DARK_THRESHOLD) / (cfg.CFG_Y_T_BRIGHT_THRESHOLD - cfg.CFG_X_T_DARK_THRESHOLD)

    readings.w_s = round(w_s, 4)

    # Chuẩn hóa sai số quang học
    sum_az = comp[2] + comp[3]
    diff_az = comp[2] - comp[3]
    e_az = (diff_az / sum_az) if (sum_az > 1.0) else 0.0

    sum_el = comp[0] + comp[1]
    diff_el = comp[0] - comp[1]
    e_el = (diff_el / sum_el) if (sum_el > 1.0) else 0.0

    # Deadband
    if abs(e_az) < cfg.CFG_OPTICAL_DEADBAND:
        e_az = 0.0
    if abs(e_el) < cfg.CFG_OPTICAL_DEADBAND:
        e_el = 0.0

    readings.e_s_az = round(e_az, 4)
    readings.e_s_el = round(e_el, 4)
    return readings

def compute_correction_angles(readings: TemtReadings) -> Tuple[float, float]:
    raw_corr_az = readings.w_s * cfg.CFG_Z_OPTICAL_CONV_FACTOR_DEG * readings.e_s_az
    raw_corr_el = readings.w_s * cfg.CFG_Z_OPTICAL_CONV_FACTOR_DEG * readings.e_s_el

    z2 = cfg.CFG_Z2_MAX_OPTICAL_CORRECTION_DEG
    corr_az = max(-z2, min(z2, raw_corr_az))
    corr_el = max(-z2, min(z2, raw_corr_el))

    return round(corr_az, 4), round(corr_el, 4)

def calibrate_gain(uniform_adc: List[int]) -> Tuple[bool, List[float]]:
    for val in uniform_adc:
        if val < 200 or val > 3800:
            return False, [1.0, 1.0, 1.0, 1.0]

    avg = sum(uniform_adc) / 4.0
    gain_v = [round(avg / val, 4) for val in uniform_adc]
    return True, gain_v
