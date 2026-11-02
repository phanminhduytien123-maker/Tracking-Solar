"""
solar_config.py
BẢN THAM CHIẾU PYTHON CHO TOÀN BỘ CẤU HÌNH HỆ THỐNG SOLAR TRACKER 2 TRỤC
Khớp 100% với solar_config.h trong Firmware C++ (ESP-IDF / Native).
Mọi đơn vị, công thức và giá trị placeholder được đồng bộ hóa hoàn toàn.
"""

from dataclasses import dataclass

# =============================================================================
# SECTION 1: HẰNG SỐ ĐỊA LÝ, THỜI GIAN & RTC DS3231 (GEOGRAPHIC, TIME & RTC)
# =============================================================================
# [A] Vĩ độ TP.HCM (Độ thập phân, Bắc = dương, 5 số thập phân)
CFG_A_LATITUDE_DEG: float = 10.78310

# [B] Kinh độ TP.HCM (Độ thập phân, Đông = dương, 5 số thập phân)
CFG_B_LONGITUDE_DEG: float = 106.67210

# Múi giờ UTC+7 cố định (Việt Nam không có DST). RTC DS3231 lưu theo giờ địa phương UTC+7.
CFG_TZ_OFFSET_MIN: int = 420
CFG_TIMEZONE_OFFSET_HOURS: float = 7.0

# Pin dự phòng RTC DS3231: Pin CR2032 (3V). VCC 3.3V, tháo mạch sạc trên module ZS-042.
CFG_RTC_BACKUP_BATTERY: bool = True

# Khóa thí nghiệm: True khi chạy đợt đo 30 ngày chính thức
CFG_EXPERIMENT_LOCK: bool = False

# Nguồn tạo góc mục tiêu
CFG_TRACK_SOURCE_EPHEMERIS_ONLY: int = 0
CFG_TRACK_SOURCE_SENSOR_ONLY: int = 1
CFG_TRACK_SOURCE_HYBRID: int = 2
CFG_TRACK_SOURCE_DEFAULT: int = CFG_TRACK_SOURCE_HYBRID

# Tự động cập nhật H: Mặc định tắt trong đợt đo 30 ngày
CFG_AUTO_UPDATE_H: bool = False

# Bù khúc xạ khí quyển cho góc nâng el_sun nhỏ
CFG_USE_REFRACTION: bool = True

# Quy ước tên hiển thị chuẩn
CFG_LABEL_MOTOR_1: str = "Góc quay"
CFG_LABEL_MOTOR_2: str = "Độ ngửa"



# =============================================================================
# SECTION 2: CƠ KHÍ & XUNG ĐỘNG CƠ / ENCODER (KINEMATICS & PULSES)
# =============================================================================
# [C] Tỷ số truyền trục Azimuth (ĐÃ CHỐT = 3.0)
CFG_C_GEAR_RATIO_AZ: float = 3.0

# [D] Tỷ số truyền trục Elevation (ĐÃ CHỐT = 3.0)
CFG_D_GEAR_RATIO_EL: float = 3.0

# [E] Số xung/vòng động cơ do driver DM556 vi bước SW5-8 (Xung/vòng)
CFG_E_PULSES_PER_REV_MOTOR: float = 1600.0

# [F] PPR Encoder 3806 (Xung/vòng). Đếm x4 PCNT -> 4 * F
CFG_F_ENCODER_PPR: float = 400.0

# Cực tính DIR: +1 nếu HIGH tăng góc, -1 nếu LOW tăng góc
CFG_DIR_POL_AZ: int = 1
CFG_DIR_POL_EL: int = 1


# =============================================================================
# SECTION 3: HÌNH HỌC LẮP ĐẶT & GIỚI HẠN GÓC (GEOMETRY & LIMITS)
# =============================================================================
# [G] Phương vị thực tế của công tắc Azimuth HOME từ hướng Bắc (Độ)
CFG_G_AZ_HOME_SW_DEG: float = 45.0

# [H] Độ lệch khung so với chuẩn Đông-Tây thật (Độ)
CFG_H_AZ_OFFSET_DEG: float = 0.0

# [I] Giới hạn mềm góc phi trục Azimuth (Độ)
CFG_I_AZ_MAX_SOFT_LIMIT_DEG: float = 270.0
CFG_AZ_MIN_SOFT_LIMIT_DEG: float = 2.0

# [J] epsilon tại công tắc hành trình el (Độ).
# Vị trí chạm công tắc hành trình (HOME) của trục el.
# Được TUNE bằng công tắc hành trình kết hợp số xung Encoder và thước đo góc ngoài.
CFG_J_EL_HOME_SW_DEG: float = 90.0

# [K] epsilon_stow đậu ban đêm (Độ) = 90.0°
CFG_K_EL_STOW_DEG: float = 90.0

# [L] epsilon_min_soft giới hạn mềm đầu HẠ THẤP NHẤT trục Elevation (Độ)
# TRẠNG THÁI: [TẠM, CHỜ ĐO CƠ KHÍ THỰC TẾ]
# DÙNG CHUNG DUY NHẤT CHO CẢ BA BỘ ĐIỀU KHIỂN: PID / FUZZY-PID / PSO (KHÔNG HARD-CODE Ở FILE KHÁC)
# Tấm KHÔNG THỂ dựng đứng vuông góc mặt đất (0°) vì sẽ VA CHẠM VÀO TRỤC Z (Phần khung)!
# Cần đo cơ khí góc cấn thực tế trên giàn thật và đặt L lớn hơn góc cấn ít nhất 3° - 5°.
CFG_L_EL_MIN_SOFT_LIMIT_DEG: float = 25.0

# Hành trình ngửa tối đa cho phép tính từ HOME (Độ)
CFG_EL_MAX_STROKE_FROM_HOME_DEG: float = 70.0

# Ngưỡng góc nâng mặt trời tối thiểu để bắt đầu bám (Độ)
# TRẠNG THÁI: [TẠM, CHỜ ĐO CƠ KHÍ THỰC TẾ]
# DÙNG CHUNG DUY NHẤT CHO CẢ BA BỘ ĐIỀU KHIỂN: PID / FUZZY-PID / PSO (KHÔNG HARD-CODE Ở FILE KHÁC)
# Dưới góc này, bức xạ yếu (AM > 5.76), năng lượng thu được không bù nổi năng lượng quay động cơ.
CFG_EL_SUN_TRACKING_THRESHOLD_DEG: float = 10.0

# Thời gian đánh thức DS3231 trước khi mặt trời đạt ngưỡng bám (Phút)
CFG_WAKEUP_LEAD_TIME_MIN: int = 20

# Thông số lắp đặt tấm cố định đối chứng (Static Panel) lưu bằng 2 field riêng:
CFG_FIXED_AZ_DEG: float = 180.0         # Hướng chính Nam (South 180°)
CFG_FIXED_TILT_BETA_DEG: float = 15.0   # Góc nghiêng cố định beta 15° so với mặt đất
CFG_STATIC_PANEL_AZIMUTH_DEG: float = CFG_FIXED_AZ_DEG
CFG_STATIC_PANEL_TILT_DEG: float = CFG_FIXED_TILT_BETA_DEG

def get_fixed_epsilon_deg(beta: float = CFG_FIXED_TILT_BETA_DEG) -> float:
    """Góc ngửa epsilon = 90 - beta (tính ra khi hiển thị, không lưu thành field thứ 3)."""
    return 90.0 - beta



# =============================================================================
# SECTION 4: ĐỘNG HỌC & MÔ HÌNH CƠ ĐIỆN TẢI (DYNAMICS & STEPPER CONSTRAINTS)
# =============================================================================
# [M] Quán tính tải trục Azimuth quy về trục động cơ (kg.m^2)
CFG_M_INERTIA_AZ_EQUIV_KG_M2: float = 0.0005

# [N] Quán tính tải trục Elevation quy về trục động cơ (kg.m^2)
CFG_N_INERTIA_EL_EQUIV_KG_M2: float = 0.0004

# [O] Ma sát khô Coulomb (N.m) và nhớt (N.m.s/rad)
CFG_O_FRICTION_COULOMB_NM: float = 0.08
CFG_O_FRICTION_VISCOUS_NMS_RAD: float = 0.001

# [P] Độ cứng dây đai k_belt (N.m/rad)
CFG_P_BELT_STIFFNESS_NM_RAD: float = 450.0

# [Q] Độ rơ cơ khí Backlash (Độ góc tấm)
CFG_Q_BACKLASH_DEG: float = 0.15

# [R] Mô-men gió danh định trên mặt tấm (N.m)
CFG_R_WIND_TORQUE_LOAD_NM: float = 1.5

# [S] Mô-men giữ NEMA23 ở half-current (N.m)
CFG_S_MOTOR_HOLD_TORQUE_HALF_NM: float = 0.9

# [T] Tần số xung tối đa không mất bước (Hz)
CFG_T_MAX_PULSE_FREQ_HZ: float = 4000.0
CFG_T_MIN_PULSE_FREQ_HZ: float = 200.0

# [U] Gia tốc xung tối đa không mất bước (Hz/s)
CFG_U_MAX_PULSE_ACCEL_HZ_PER_S: float = 6000.0

# Tần số homing
CFG_HOMING_FAST_FREQ_HZ: float = 1200.0
CFG_HOMING_SLOW_FREQ_HZ: float = 300.0
CFG_HOMING_BACKOFF_DEG: float = 5.0


# =============================================================================
# SECTION 5: CẢM BIẾN QUANG TEMT6000 & ADC (OPTICAL FUSION)
# =============================================================================
# [V] Hệ số bù gain giữa 4 cảm biến quang (Top, Bottom, Left, Right)
CFG_V_GAIN_LDR_TOP: float = 1.00
CFG_V_GAIN_LDR_BOTTOM: float = 1.00
CFG_V_GAIN_LDR_LEFT: float = 1.00
CFG_V_GAIN_LDR_RIGHT: float = 1.00

# [W] Ngưỡng bão hòa ADC 12-bit
# TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]
CFG_W_ADC_SATURATION_THRESHOLD: int = 3950

# [X] T_dark: Ngưỡng tối xác nhận đi ngủ (ADC sum)
# TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]
CFG_X_T_DARK_THRESHOLD: float = 400.0

# [Y] T_bright: Ngưỡng sáng xác nhận thức dậy bám chủ động (ADC sum)
# TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]
CFG_Y_T_BRIGHT_THRESHOLD: float = 900.0

# [Z] k_s: Hệ số chuyển sai số quang thành góc lệch (Độ)
# TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]
CFG_Z_OPTICAL_CONV_FACTOR_DEG: float = 12.0

# [Z2] Delta_s_max: Giới hạn hiệu chỉnh tối đa từ quang (Độ)
# TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]
CFG_Z2_MAX_OPTICAL_CORRECTION_DEG: float = 6.0

# Vùng chết sai số quang học normalized
# TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]
CFG_OPTICAL_DEADBAND: float = 0.04

# Số mẫu oversampling ADC
CFG_ADC_OVERSAMPLE_COUNT: int = 64


# =============================================================================
# SECTION 6: CHU KỲ & NGƯỠNG ĐIỀU HÀNH
# =============================================================================
# Chu kỳ vòng ngoài T_outer (Giây)
CFG_T_OUTER_PERIOD_SEC: int = 120

# Chu kỳ vòng trong T_inner (Giây)
CFG_T_INNER_PERIOD_MS: int = 20
CFG_T_INNER_PERIOD_SEC: float = 0.020

# Ngưỡng góc kích hoạt quay theta_th (Độ)
CFG_THETA_THRESHOLD_DEG: float = 2.5

# Vùng chết dừng điều khiển (Độ)
CFG_THETA_DEADBAND_DEG: float = 0.3

# Thời gian quay tối đa cho phép (Giây)
CFG_MAX_MOVE_TIMEOUT_SEC: float = 45.0

# Ngưỡng đếm lệch phát hiện mất bước (Encoder counts)
CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS: int = 64

# Cửa sổ ngủ đêm cứng (19:00 -> 03:00)
CFG_NIGHT_SLEEP_START_HOUR: int = 19
CFG_NIGHT_SLEEP_START_MINUTE: int = 0
CFG_NIGHT_SLEEP_END_HOUR: int = 3
CFG_NIGHT_SLEEP_END_MINUTE: int = 0


# =============================================================================
# SECTION 7: CẤU HÌNH PSO & FUZZY-PID
# =============================================================================
CFG_PSO_SWARM_SIZE: int = 10
CFG_PSO_MAX_ITERATIONS: int = 25
CFG_PSO_W_INERTIA: float = 0.729
CFG_PSO_C1_COGNITIVE: float = 1.494
CFG_PSO_C2_SOCIAL: float = 1.494
CFG_PSO_SIM_DT_SEC: float = 0.01
CFG_PSO_SIM_DURATION_SEC: float = 2.5

CFG_FITNESS_W_ITAE: float = 1.0
CFG_FITNESS_W_OVERSHOOT: float = 20.0
CFG_FITNESS_W_SETTLING_TIME: float = 2.0
CFG_FITNESS_PENALTY_STEP_LOSS: float = 5000.0
CFG_FITNESS_PENALTY_INSTABILITY: float = 10000.0
