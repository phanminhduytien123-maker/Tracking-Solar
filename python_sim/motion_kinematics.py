"""
motion_kinematics.py
HIỆN THỰC THUẬT TOÁN QUY ĐỔI XUNG, ENCODER & ĐỘNG HỌC (PHASE 3) TRÊN PYTHON
Đối chuẩn 1:1 với motion_kinematics.cpp
"""

import math
import sys
from typing import Tuple, Optional

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from solar_types import AxisId, MotionProfile
from solar_config import (
    CFG_E_PULSES_PER_REV_MOTOR,
    CFG_C_GEAR_RATIO_AZ,
    CFG_D_GEAR_RATIO_EL,
    CFG_F_ENCODER_PPR,
    CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS,
    CFG_T_MAX_PULSE_FREQ_HZ,
    CFG_T_MIN_PULSE_FREQ_HZ,
    CFG_U_MAX_PULSE_ACCEL_HZ_PER_S,
    CFG_HOMING_FAST_FREQ_HZ,
    CFG_HOMING_SLOW_FREQ_HZ,
    CFG_HOMING_BACKOFF_DEG,
    CFG_AZ_MIN_SOFT_LIMIT_DEG,
    CFG_I_AZ_MAX_SOFT_LIMIT_DEG,
    CFG_G_AZ_HOME_SW_DEG,
    CFG_L_EL_MIN_SOFT_LIMIT_DEG,
    CFG_J_EL_HOME_SW_DEG,
)

class MotionKinematics:
    @staticmethod
    def get_pulse_per_degree(axis: AxisId) -> float:
        ratio = CFG_C_GEAR_RATIO_AZ if axis == AxisId.AZIMUTH else CFG_D_GEAR_RATIO_EL
        return (CFG_E_PULSES_PER_REV_MOTOR * ratio) / 360.0

    @staticmethod
    def get_encoder_counts_per_degree(axis: AxisId) -> float:
        ratio = CFG_C_GEAR_RATIO_AZ if axis == AxisId.AZIMUTH else CFG_D_GEAR_RATIO_EL
        return (4.0 * CFG_F_ENCODER_PPR * ratio) / 360.0

    @staticmethod
    def angle_to_pulses(axis: AxisId, angle_deg: float) -> int:
        k = MotionKinematics.get_pulse_per_degree(axis)
        return int(round(angle_deg * k))

    @staticmethod
    def pulses_to_angle(axis: AxisId, pulses: int) -> float:
        k = MotionKinematics.get_pulse_per_degree(axis)
        return float(pulses) / k if k > 0.0 else 0.0

    @staticmethod
    def encoder_counts_to_angle(axis: AxisId, counts: int) -> float:
        k = MotionKinematics.get_encoder_counts_per_degree(axis)
        return float(counts) / k if k > 0.0 else 0.0

    @staticmethod
    def angle_to_encoder_counts(axis: AxisId, angle_deg: float) -> int:
        k = MotionKinematics.get_encoder_counts_per_degree(axis)
        return int(round(angle_deg * k))

    @staticmethod
    def check_step_loss(
        axis: AxisId,
        commanded_pulses: int,
        encoder_counts: int,
        tolerance_counts: int = CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS
    ) -> Tuple[bool, float]:
        diff = abs(commanded_pulses - encoder_counts)
        k = MotionKinematics.get_encoder_counts_per_degree(axis)
        loss_deg = float(diff) / k if k > 0.0 else 0.0
        return (diff > tolerance_counts, loss_deg)

    @staticmethod
    def calculate_trapezoidal_profile(
        total_pulses: int,
        max_freq_hz: float = CFG_T_MAX_PULSE_FREQ_HZ,
        min_freq_hz: float = CFG_T_MIN_PULSE_FREQ_HZ,
        accel_hz_s: float = CFG_U_MAX_PULSE_ACCEL_HZ_PER_S
    ) -> MotionProfile:
        N = abs(total_pulses)
        if N == 0:
            return MotionProfile(0, 0.0, 0.0, 0.0, 0.0, False)

        if accel_hz_s <= 0.0:
            accel_hz_s = CFG_U_MAX_PULSE_ACCEL_HZ_PER_S
        if max_freq_hz < min_freq_hz:
            max_freq_hz = min_freq_hz

        t_acc = (max_freq_hz - min_freq_hz) / accel_hz_s
        N_acc = 0.5 * (min_freq_hz + max_freq_hz) * t_acc

        if 2.0 * N_acc > float(N):
            f_peak = math.sqrt(min_freq_hz * min_freq_hz + accel_hz_s * float(N))
            t_acc_actual = (f_peak - min_freq_hz) / accel_hz_s
            return MotionProfile(
                total_pulses=N,
                total_time_sec=2.0 * t_acc_actual,
                accel_time_sec=t_acc_actual,
                cruise_time_sec=0.0,
                peak_freq_hz=f_peak,
                is_triangular=True
            )
        else:
            N_cruise = float(N) - 2.0 * N_acc
            t_cruise = N_cruise / max_freq_hz
            return MotionProfile(
                total_pulses=N,
                total_time_sec=2.0 * t_acc + t_cruise,
                accel_time_sec=t_acc,
                cruise_time_sec=t_cruise,
                peak_freq_hz=max_freq_hz,
                is_triangular=False
            )

    @staticmethod
    def calculate_move_time(
        axis: AxisId,
        from_angle_deg: float,
        to_angle_deg: float,
        max_freq_hz: float = CFG_HOMING_FAST_FREQ_HZ
    ) -> float:
        d_angle = abs(to_angle_deg - from_angle_deg)
        pulses = int(round(d_angle * MotionKinematics.get_pulse_per_degree(axis)))
        prof = MotionKinematics.calculate_trapezoidal_profile(
            pulses, max_freq_hz, CFG_T_MIN_PULSE_FREQ_HZ, CFG_U_MAX_PULSE_ACCEL_HZ_PER_S
        )
        return prof.total_time_sec

    @staticmethod
    def is_within_soft_limits(axis: AxisId, angle_deg: float) -> bool:
        if axis == AxisId.AZIMUTH:
            return CFG_AZ_MIN_SOFT_LIMIT_DEG <= angle_deg <= CFG_I_AZ_MAX_SOFT_LIMIT_DEG
        else:
            return CFG_L_EL_MIN_SOFT_LIMIT_DEG <= angle_deg <= CFG_J_EL_HOME_SW_DEG

    @staticmethod
    def calculate_wakeup_routine_time(
        home_el_deg: float = CFG_J_EL_HOME_SW_DEG,
        target_el_deg: float = CFG_L_EL_MIN_SOFT_LIMIT_DEG,
        home_az_deg: float = CFG_G_AZ_HOME_SW_DEG,
        target_az_deg: float = 108.5
    ) -> float:
        # 1. Homing Elevation (Elevation trước)
        worst_case_el_seek = abs(home_el_deg - CFG_L_EL_MIN_SOFT_LIMIT_DEG)
        t_el_seek = MotionKinematics.calculate_move_time(AxisId.ELEVATION, 0.0, worst_case_el_seek, CFG_HOMING_FAST_FREQ_HZ)
        t_el_backoff = MotionKinematics.calculate_move_time(AxisId.ELEVATION, 0.0, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ)
        t_el_latch = MotionKinematics.calculate_move_time(AxisId.ELEVATION, 0.0, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ)
        t_el_homing = t_el_seek + t_el_backoff + t_el_latch + 2.0

        # 2. Homing Azimuth (Azimuth sau)
        worst_case_az_seek = abs(CFG_I_AZ_MAX_SOFT_LIMIT_DEG - home_az_deg)
        t_az_seek = MotionKinematics.calculate_move_time(AxisId.AZIMUTH, 0.0, worst_case_az_seek, CFG_HOMING_FAST_FREQ_HZ)
        t_az_backoff = MotionKinematics.calculate_move_time(AxisId.AZIMUTH, 0.0, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ)
        t_az_latch = MotionKinematics.calculate_move_time(AxisId.AZIMUTH, 0.0, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ)
        t_az_homing = t_az_seek + t_az_backoff + t_az_latch + 2.0

        # 3. Slew to Morning Capture Position
        t_slew_el = MotionKinematics.calculate_move_time(AxisId.ELEVATION, home_el_deg, target_el_deg, CFG_HOMING_FAST_FREQ_HZ)
        t_slew_az = MotionKinematics.calculate_move_time(AxisId.AZIMUTH, home_az_deg, target_az_deg, CFG_HOMING_FAST_FREQ_HZ)

        t_settle = 3.0
        return t_el_homing + t_az_homing + t_slew_el + t_slew_az + t_settle


if __name__ == "__main__":
    k_pulse_az = MotionKinematics.get_pulse_per_degree(AxisId.AZIMUTH)
    k_pulse_el = MotionKinematics.get_pulse_per_degree(AxisId.ELEVATION)
    k_enc_az = MotionKinematics.get_encoder_counts_per_degree(AxisId.AZIMUTH)
    k_enc_el = MotionKinematics.get_encoder_counts_per_degree(AxisId.ELEVATION)

    print(f"K_pulse: Az={k_pulse_az:.4f} pulses/deg, El={k_pulse_el:.4f} pulses/deg")
    print(f"K_enc:   Az={k_enc_az:.4f} counts/deg, El={k_enc_el:.4f} counts/deg")

    # Kiểm tra góc 65° từ Home (90°) về L (25°)
    d_el = 65.0
    pulses_el = MotionKinematics.angle_to_pulses(AxisId.ELEVATION, d_el)
    t_el_fast = MotionKinematics.calculate_move_time(AxisId.ELEVATION, 90.0, 25.0, CFG_HOMING_FAST_FREQ_HZ)
    print(f"Di chuyển Elevation 65.0° (Home 90° -> 25°): {pulses_el} xung, Thời gian (1200Hz): {t_el_fast:.3f} s")

    # Kiểm tra góc 63.5° Azimuth từ Home (45°) về hướng đón nắng (108.5°)
    d_az = 63.5
    pulses_az = MotionKinematics.angle_to_pulses(AxisId.AZIMUTH, d_az)
    t_az_fast = MotionKinematics.calculate_move_time(AxisId.AZIMUTH, 45.0, 108.5, CFG_HOMING_FAST_FREQ_HZ)
    print(f"Di chuyển Azimuth 63.5° (Home 45° -> 108.5°): {pulses_az} xung, Thời gian (1200Hz): {t_az_fast:.3f} s")

    # Tính toàn bộ quy trình thức dậy
    t_wakeup_routine = MotionKinematics.calculate_wakeup_routine_time()
    print(f"\nTổng thời gian toàn bộ chu trình thức dậy + Homing 2 trục + Di chuyển đón nắng:")
    print(f"  Thời gian tính toán lý thuyết: {t_wakeup_routine:.2f} giây ({t_wakeup_routine / 60.0:.2f} phút)")
    print(f"  Thời gian báo thức sớm đã cấu hình: 20 phút ({20 * 60} giây)")
    print(f"  Dư thời gian an toàn: {(20 * 60 - t_wakeup_routine) / 60.0:.2f} phút")
    assert t_wakeup_routine < 1200.0, "Thời gian quy trình thức dậy vượt quá 20 phút!"
    print("\n[PASS] Kiểm thử Python Phase 3 thành công 100%!")
