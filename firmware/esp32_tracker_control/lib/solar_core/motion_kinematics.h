/**
 * @file motion_kinematics.h
 * @brief TÍNH TOÁN QUY ĐỔI XUNG, ENCODER, ĐỘNG HỌC & THỜI GIAN CHUYỂN ĐỘNG (PHASE 3)
 * @details C++17 thuần, không phụ thuộc ngoại vi phần cứng, dùng chung cho Firmware và Unit Test.
 */

#ifndef MOTION_KINEMATICS_H
#define MOTION_KINEMATICS_H

#include "solar_types.h"
#include "solar_config.h"
#include <cmath>
#include <algorithm>

namespace solar {

class MotionKinematics {
public:
    // =========================================================================
    // 1. HỆ SỐ QUY ĐỔI XUNG & GÓC
    // =========================================================================

    /**
     * @brief Lấy hệ số quy đổi xung phát trên 1 độ góc tấm pin (Pulses / Degree)
     * K_pulse = (E * Ratio) / 360.0
     */
    static constexpr float getPulsePerDegree(AxisId axis) {
        return (axis == AxisId::AZIMUTH)
            ? (CFG_E_PULSES_PER_REV_MOTOR * CFG_C_GEAR_RATIO_AZ / 360.0f)
            : (CFG_E_PULSES_PER_REV_MOTOR * CFG_D_GEAR_RATIO_EL / 360.0f);
    }

    /**
     * @brief Lấy hệ số quy đổi xung Encoder trên 1 độ góc tấm pin (Counts / Degree)
     * K_enc = (4 * F * Ratio) / 360.0 (ESP32 PCNT đếm 4 cạnh xung A/B)
     */
    static constexpr float getEncoderCountsPerDegree(AxisId axis) {
        return (axis == AxisId::AZIMUTH)
            ? (4.0f * CFG_F_ENCODER_PPR * CFG_C_GEAR_RATIO_AZ / 360.0f)
            : (4.0f * CFG_F_ENCODER_PPR * CFG_D_GEAR_RATIO_EL / 360.0f);
    }

    /**
     * @brief Chuyển đổi từ góc tấm pin (độ) sang số xung phát điều khiển động cơ bước
     */
    static int32_t angleToPulses(AxisId axis, float angle_deg);

    /**
     * @brief Chuyển đổi từ số xung phát sang góc quay tấm pin (độ)
     */
    static float pulsesToAngle(AxisId axis, int32_t pulses);

    /**
     * @brief Chuyển đổi từ số count đọc được của Encoder sang góc quay thực tế của tấm (độ)
     */
    static float encoderCountsToAngle(AxisId axis, int32_t counts);

    /**
     * @brief Chuyển đổi từ góc quay (độ) sang số count Encoder tương ứng
     */
    static int32_t angleToEncoderCounts(AxisId axis, float angle_deg);

    // =========================================================================
    // 2. PHÁT HIỆN MẤT BƯỚC THỜI GIAN THỰC (STEP LOSS DETECTION)
    // =========================================================================

    /**
     * @brief Kiểm tra mất bước giữa xung phát lệnh và xung đọc về từ Encoder
     * @param axis Trục kiểm tra
     * @param commanded_pulses Tổng số xung đã phát
     * @param encoder_counts Tổng số count đọc từ bộ đếm phần cứng PCNT
     * @param tolerance_counts Ngưỡng dung sai xung cho phép (mặc định CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS)
     * @param out_loss_deg (Tùy chọn) Con trỏ nhận giá trị sai lệch góc tương ứng (độ)
     * @return true nếu mất bước vượt ngưỡng cho phép
     */
    static bool checkStepLoss(AxisId axis,
                             int32_t commanded_pulses,
                             int32_t encoder_counts,
                             int32_t tolerance_counts = CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS,
                             float* out_loss_deg = nullptr);

    // =========================================================================
    // 3. BIÊN DẠNG GIA TỐC HÌNH THANG & TÍNH THỜI GIAN QUAY (TRAPEZOIDAL PROFILE)
    // =========================================================================

    /**
     * @brief Tính toán chi tiết biên dạng gia tốc hình thang cho một quãng xung N
     * @param total_pulses Số xung cần di chuyển (|N|)
     * @param max_freq_hz Tần số phát xung cực đại mong muốn (Hz)
     * @param min_freq_hz Tần số khởi động ban đầu (Hz, tránh giật)
     * @param accel_hz_s Gia tốc phát xung (Hz/giây)
     * @return Struct MotionProfile chứa thời gian tăng tốc, thời gian chạy đều, tổng thời gian
     */
    static MotionProfile calculateTrapezoidalProfile(int32_t total_pulses,
                                                     float max_freq_hz = CFG_T_MAX_PULSE_FREQ_HZ,
                                                     float min_freq_hz = CFG_T_MIN_PULSE_FREQ_HZ,
                                                     float accel_hz_s = CFG_U_MAX_PULSE_ACCEL_HZ_PER_S);

    /**
     * @brief Tính thời gian di chuyển từ góc nguồn đến góc đích (giây)
     */
    static float calculateMoveTime(AxisId axis,
                                  float from_angle_deg,
                                  float to_angle_deg,
                                  float max_freq_hz = CFG_HOMING_FAST_FREQ_HZ);

    // =========================================================================
    // 4. KIỂM TRA GIỚI HẠN MỀM (SOFT LIMITS)
    // =========================================================================

    /**
     * @brief Kiểm tra xem một góc có nằm trong giới hạn mềm an toàn không
     */
    static bool isWithinSoftLimits(AxisId axis, float angle_deg);

    // =========================================================================
    // 5. MÔ PHỎNG & KIỂM TRA THỜI GIAN QUY TRÌNH THỨC DẬY SÁNG
    // =========================================================================

    /**
     * @brief Tính tổng thời gian dự kiến cho toàn bộ chu trình thức dậy sáng sớm:
     *        1. Homing Elevation (chạm nhanh -> lùi -> chạm chậm).
     *        2. Homing Azimuth (chạm nhanh -> lùi -> chạm chậm).
     *        3. Quay từ Home về góc đón nắng: Elevation -> 25°, Azimuth -> Az_sun(06:36).
     * @return Tổng thời gian ước tính (giây)
     */
    static float calculateWakeupRoutineTime(float home_el_deg = CFG_J_EL_HOME_SW_DEG,
                                           float target_el_deg = CFG_L_EL_MIN_SOFT_LIMIT_DEG,
                                           float home_az_deg = CFG_G_AZ_HOME_SW_DEG,
                                           float target_az_deg = 108.5f);
};

} // namespace solar

#endif // MOTION_KINEMATICS_H
