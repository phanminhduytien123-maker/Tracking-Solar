/**
 * @file motion_kinematics.cpp
 * @brief HIỆN THỰC TÍNH TOÁN QUY ĐỔI XUNG, ENCODER & ĐỘNG HỌC CHUYỂN ĐỘNG (PHASE 3)
 */

#include "motion_kinematics.h"

namespace solar {

int32_t MotionKinematics::angleToPulses(AxisId axis, float angle_deg) {
    float k = getPulsePerDegree(axis);
    return static_cast<int32_t>(std::round(angle_deg * k));
}

float MotionKinematics::pulsesToAngle(AxisId axis, int32_t pulses) {
    float k = getPulsePerDegree(axis);
    return (k > 0.0f) ? (static_cast<float>(pulses) / k) : 0.0f;
}

float MotionKinematics::encoderCountsToAngle(AxisId axis, int32_t counts) {
    float k = getEncoderCountsPerDegree(axis);
    return (k > 0.0f) ? (static_cast<float>(counts) / k) : 0.0f;
}

int32_t MotionKinematics::angleToEncoderCounts(AxisId axis, float angle_deg) {
    float k = getEncoderCountsPerDegree(axis);
    return static_cast<int32_t>(std::round(angle_deg * k));
}

bool MotionKinematics::checkStepLoss(AxisId axis,
                                    int32_t commanded_pulses,
                                    int32_t encoder_counts,
                                    int32_t tolerance_counts,
                                    float* out_loss_deg) {
    int32_t diff = std::abs(commanded_pulses - encoder_counts);
    if (out_loss_deg != nullptr) {
        float k = getEncoderCountsPerDegree(axis);
        *out_loss_deg = (k > 0.0f) ? (static_cast<float>(diff) / k) : 0.0f;
    }
    return (diff > tolerance_counts);
}

MotionProfile MotionKinematics::calculateTrapezoidalProfile(int32_t total_pulses,
                                                           float max_freq_hz,
                                                           float min_freq_hz,
                                                           float accel_hz_s) {
    MotionProfile prof;
    int32_t N = std::abs(total_pulses);
    prof.total_pulses = N;

    if (N == 0) {
        prof.total_time_sec = 0.0f;
        prof.accel_time_sec = 0.0f;
        prof.cruise_time_sec = 0.0f;
        prof.peak_freq_hz = 0.0f;
        prof.is_triangular = false;
        return prof;
    }

    if (accel_hz_s <= 0.0f) {
        accel_hz_s = CFG_U_MAX_PULSE_ACCEL_HZ_PER_S;
    }
    if (max_freq_hz < min_freq_hz) {
        max_freq_hz = min_freq_hz;
    }

    // Tính thời gian và số xung để tăng từ min_freq_hz lên max_freq_hz
    float t_acc = (max_freq_hz - min_freq_hz) / accel_hz_s;
    float N_acc = 0.5f * (min_freq_hz + max_freq_hz) * t_acc;

    // Kiểm tra xem có đủ quãng đường để tăng tốc rồi giảm tốc không (2 * N_acc <= N)
    if (2.0f * N_acc > static_cast<float>(N)) {
        // Biên dạng hình tam giác (Triangular Profile)
        prof.is_triangular = true;
        // f_peak^2 = f_min^2 + a * N
        float f_peak = std::sqrt(min_freq_hz * min_freq_hz + accel_hz_s * static_cast<float>(N));
        prof.peak_freq_hz = f_peak;
        prof.accel_time_sec = (f_peak - min_freq_hz) / accel_hz_s;
        prof.cruise_time_sec = 0.0f;
        prof.total_time_sec = 2.0f * prof.accel_time_sec;
    } else {
        // Biên dạng hình thang đầy đủ (Trapezoidal Profile)
        prof.is_triangular = false;
        prof.peak_freq_hz = max_freq_hz;
        prof.accel_time_sec = t_acc;
        float N_cruise = static_cast<float>(N) - 2.0f * N_acc;
        prof.cruise_time_sec = N_cruise / max_freq_hz;
        prof.total_time_sec = 2.0f * prof.accel_time_sec + prof.cruise_time_sec;
    }

    return prof;
}

float MotionKinematics::calculateMoveTime(AxisId axis,
                                         float from_angle_deg,
                                         float to_angle_deg,
                                         float max_freq_hz) {
    float d_angle = std::fabs(to_angle_deg - from_angle_deg);
    int32_t pulses = static_cast<int32_t>(std::round(d_angle * getPulsePerDegree(axis)));
    MotionProfile p = calculateTrapezoidalProfile(pulses, max_freq_hz, CFG_T_MIN_PULSE_FREQ_HZ, CFG_U_MAX_PULSE_ACCEL_HZ_PER_S);
    return p.total_time_sec;
}

bool MotionKinematics::isWithinSoftLimits(AxisId axis, float angle_deg) {
    if (axis == AxisId::AZIMUTH) {
        return (angle_deg >= CFG_AZ_MIN_SOFT_LIMIT_DEG && angle_deg <= CFG_I_AZ_MAX_SOFT_LIMIT_DEG);
    } else {
        return (angle_deg >= CFG_L_EL_MIN_SOFT_LIMIT_DEG && angle_deg <= CFG_J_EL_HOME_SW_DEG);
    }
}

float MotionKinematics::calculateWakeupRoutineTime(float home_el_deg,
                                                  float target_el_deg,
                                                  float home_az_deg,
                                                  float target_az_deg) {
    // 1. Homing Elevation (Trục Elevation luôn Homing TRƯỚC để nhấc giàn lên cao tránh cọ xát)
    // Giả định trường hợp bất lợi nhất: tấm đang ở giới hạn thấp nhất L=25° cần quay lên J=90°
    float worst_case_el_seek = std::fabs(home_el_deg - CFG_L_EL_MIN_SOFT_LIMIT_DEG);
    float t_el_seek = calculateMoveTime(AxisId::ELEVATION, 0.0f, worst_case_el_seek, CFG_HOMING_FAST_FREQ_HZ);
    float t_el_backoff = calculateMoveTime(AxisId::ELEVATION, 0.0f, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ);
    float t_el_latch = calculateMoveTime(AxisId::ELEVATION, 0.0f, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ);
    float t_el_homing = t_el_seek + t_el_backoff + t_el_latch + 2.0f; // Cộng 2s delay tiếp điểm cơ khí

    // 2. Homing Azimuth (Trục Azimuth Homing SAU khi Elevation đã an toàn)
    // Giả định trường hợp bất lợi nhất: tấm đang ở cuối chiều quay 270° cần quay ngược về switch 45°
    float worst_case_az_seek = std::fabs(CFG_I_AZ_MAX_SOFT_LIMIT_DEG - home_az_deg);
    float t_az_seek = calculateMoveTime(AxisId::AZIMUTH, 0.0f, worst_case_az_seek, CFG_HOMING_FAST_FREQ_HZ);
    float t_az_backoff = calculateMoveTime(AxisId::AZIMUTH, 0.0f, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ);
    float t_az_latch = calculateMoveTime(AxisId::AZIMUTH, 0.0f, CFG_HOMING_BACKOFF_DEG, CFG_HOMING_SLOW_FREQ_HZ);
    float t_az_homing = t_az_seek + t_az_backoff + t_az_latch + 2.0f; // Cộng 2s delay tiếp điểm

    // 3. Di chuyển đón nắng sớm từ Home về góc mục tiêu (Slew to Morning Capture Position)
    // Elevation từ 90° hạ xuống 25°
    float t_slew_el = calculateMoveTime(AxisId::ELEVATION, home_el_deg, target_el_deg, CFG_HOMING_FAST_FREQ_HZ);
    // Azimuth từ 45° quay sang Az_sun(06:36) ~ 108.5°
    float t_slew_az = calculateMoveTime(AxisId::AZIMUTH, home_az_deg, target_az_deg, CFG_HOMING_FAST_FREQ_HZ);

    // Thời gian ổn định cơ khí giàn pin
    float t_settle = 3.0f;

    // Tổng thời gian chu trình thức dậy hoàn chỉnh
    return (t_el_homing + t_az_homing + t_slew_el + t_slew_az + t_settle);
}

} // namespace solar
