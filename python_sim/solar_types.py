"""
solar_types.py
ĐỊNH NGHĨA KIỂU DỮ LIỆU PYTHON ĐỒNG BỘ VỚI solar_types.h TRONG C++ FIRMWARE
"""

from enum import IntEnum, auto
from dataclasses import dataclass, field
from typing import List, Optional

class AxisId(IntEnum):
    AZIMUTH = 0
    ELEVATION = 1

class ControlMode(IntEnum):
    PID = 0
    FUZZY_PID = 1
    PSO_FUZZY_PID = 2

class TrackerState(IntEnum):
    BOOT = 0
    HOMING_EL = 1
    HOMING_AZ = 2
    IDLE = 3
    SENSE = 4
    DECIDE = 5
    PSO_OPT = 6
    MOVE = 7
    SETTLE = 8
    LOG_TELEMETRY = 9
    PARK = 10
    PREP_SLEEP = 11
    DEEP_SLEEP = 12
    DAWN_POLL = 13
    FAULT = 14

class FaultFlag(IntEnum):
    NONE = 0
    STEP_LOSS_AZ = 1 << 0
    STEP_LOSS_EL = 1 << 1
    LIMIT_SWITCH_AZ_UNEXP = 1 << 2
    LIMIT_SWITCH_EL_UNEXP = 1 << 3
    SOFT_LIMIT_AZ_EXCEEDED = 1 << 4
    SOFT_LIMIT_EL_EXCEEDED = 1 << 5
    MOVE_TIMEOUT_AZ = 1 << 6
    MOVE_TIMEOUT_EL = 1 << 7
    ESTOP_TRIGGERED = 1 << 8
    LOW_BATTERY = 1 << 9
    RTC_INVALID = 1 << 10
    PSO_TIMEOUT = 1 << 11
    ADC_SATURATION = 1 << 12
    ENCODER_GLITCH = 1 << 13
    HOMING_FAILED = 1 << 14
    DIR_POLARITY_UNCERTAIN = 1 << 15
    SEVERE_DATA_INVALID = 1 << 16

@dataclass
class SolarPosition:
    azimuth_deg: float = 0.0
    elevation_deg: float = 0.0
    zenith_deg: float = 90.0
    is_daylight: bool = False
    sunrise_min: int = 360
    sunset_min: int = 1080
    atmospheric_refract_applied: bool = True

@dataclass
class AxisTarget:
    feedforward_deg: float = 0.0
    sensor_corr_deg: float = 0.0
    final_ref_deg: float = 0.0
    is_clamped: bool = False
    clamp_reason: str = "NONE"

@dataclass
class AxisState:
    actual_angle_deg: float = 0.0
    error_deg: float = 0.0
    commanded_pulses: int = 0
    encoder_counts: int = 0
    pulse_count_diff: int = 0
    is_moving: bool = False
    is_homed: bool = False

@dataclass
class TemtReadings:
    raw_adc: List[int] = field(default_factory=lambda: [0, 0, 0, 0])
    compensated: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    total_intensity: float = 0.0
    e_s_az: float = 0.0
    e_s_el: float = 0.0
    w_s: float = 0.0
    is_saturated: bool = False

@dataclass
class InaReadings:
    bus_voltage_v: float = 0.0
    shunt_current_a: float = 0.0
    power_w: float = 0.0
    energy_wh: float = 0.0

@dataclass
class PidGains:
    kp: float = 0.0
    ki: float = 0.0
    kd: float = 0.0

@dataclass
class FuzzyAdjustment:
    d_kp: float = 0.0
    d_ki: float = 0.0
    d_kd: float = 0.0

@dataclass
class TelemetryPacket:
    timestamp_epoch: int = 0
    year: int = 2026
    month: int = 11
    day: int = 1
    hour: int = 6
    minute: int = 0
    second: int = 0
    state: TrackerState = TrackerState.BOOT
    control_mode: ControlMode = ControlMode.PSO_FUZZY_PID
    solar_pos: SolarPosition = field(default_factory=SolarPosition)
    target_az: AxisTarget = field(default_factory=AxisTarget)
    target_el: AxisTarget = field(default_factory=AxisTarget)
    state_az: AxisState = field(default_factory=AxisState)
    state_el: AxisState = field(default_factory=AxisState)
    base_gains_az: PidGains = field(default_factory=PidGains)
    base_gains_el: PidGains = field(default_factory=PidGains)
    fuzzy_adj_az: FuzzyAdjustment = field(default_factory=FuzzyAdjustment)
    fuzzy_adj_el: FuzzyAdjustment = field(default_factory=FuzzyAdjustment)
    temt: TemtReadings = field(default_factory=TemtReadings)
    ina_tracker: InaReadings = field(default_factory=InaReadings)
    ina_static: InaReadings = field(default_factory=InaReadings)
    move_duration_az_sec: float = 0.0
    move_duration_el_sec: float = 0.0
    final_rms_error_deg: float = 0.0
    fault_flags: int = FaultFlag.NONE
    is_pso_converged: bool = True
    is_day_invalid: bool = False
