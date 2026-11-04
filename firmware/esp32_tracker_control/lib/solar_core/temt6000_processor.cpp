/**
 * @file temt6000_processor.cpp
 * @brief HIỆN THỰC THUẬT TOÁN XỬ LÝ TÍN HIỆU CẢM BIẾN QUANG TEMT6000
 */

#include "temt6000_processor.h"
#include <cmath>
#include <algorithm>

namespace solar {

namespace {
    template <typename T>
    inline T clampVal(T val, T low, T high) {
        return (val < low) ? low : ((val > high) ? high : val);
    }
}

void Temt6000Processor::processReadings(const uint16_t raw_adc[4],
                                       const float gain_v[4],
                                       TemtReadings& out_readings) {
    bool saturated = false;
    float sum = 0.0f;

    for (int i = 0; i < 4; ++i) {
        out_readings.raw_adc[i] = raw_adc[i];
        if (raw_adc[i] >= CFG_W_ADC_SATURATION_THRESHOLD) {
            saturated = true;
        }
        float g = (gain_v != nullptr && gain_v[i] > 0.0f) ? gain_v[i] : 1.0f;
        out_readings.compensated[i] = static_cast<float>(raw_adc[i]) * g;
        sum += out_readings.compensated[i];
    }

    out_readings.is_saturated = saturated;
    out_readings.total_intensity = sum;

    // Trọng số tin cậy w_s
    if (saturated || sum < CFG_X_T_DARK_THRESHOLD) {
        // Bão hòa hoặc trời tối mù mịt: không tin cậy cảm biến
        out_readings.w_s = 0.0f;
    } else if (sum >= CFG_Y_T_BRIGHT_THRESHOLD) {
        // Nắng rõ: tin cậy 100%
        out_readings.w_s = 1.0f;
    } else {
        // Hysteresis / nội suy tuyến tính trong khoảng [X, Y]
        out_readings.w_s = (sum - CFG_X_T_DARK_THRESHOLD) / (CFG_Y_T_BRIGHT_THRESHOLD - CFG_X_T_DARK_THRESHOLD);
    }

    // Chuẩn hóa sai số quang học
    // Trục Azimuth: Left (2) vs Right (3)
    float sum_az = out_readings.compensated[2] + out_readings.compensated[3];
    float diff_az = out_readings.compensated[2] - out_readings.compensated[3];
    float e_az = (sum_az > 1.0f) ? (diff_az / sum_az) : 0.0f;

    // Trục Elevation: Top (0) vs Bottom (1)
    float sum_el = out_readings.compensated[0] + out_readings.compensated[1];
    float diff_el = out_readings.compensated[0] - out_readings.compensated[1];
    float e_el = (sum_el > 1.0f) ? (diff_el / sum_el) : 0.0f;

    // Vùng chết (Deadband CFG_OPTICAL_DEADBAND = 0.04)
    if (std::fabs(e_az) < CFG_OPTICAL_DEADBAND) {
        e_az = 0.0f;
    }
    if (std::fabs(e_el) < CFG_OPTICAL_DEADBAND) {
        e_el = 0.0f;
    }

    out_readings.e_s_az = e_az;
    out_readings.e_s_el = e_el;
}

void Temt6000Processor::computeCorrectionAngles(const TemtReadings& readings,
                                               float& out_corr_az,
                                               float& out_corr_el) {
    // Delta_theta = sat(w_s * Z * e_s, ±Z2)
    float raw_corr_az = readings.w_s * CFG_Z_OPTICAL_CONV_FACTOR_DEG * readings.e_s_az;
    float raw_corr_el = readings.w_s * CFG_Z_OPTICAL_CONV_FACTOR_DEG * readings.e_s_el;

    out_corr_az = clampVal(raw_corr_az, -CFG_Z2_MAX_OPTICAL_CORRECTION_DEG, CFG_Z2_MAX_OPTICAL_CORRECTION_DEG);
    out_corr_el = clampVal(raw_corr_el, -CFG_Z2_MAX_OPTICAL_CORRECTION_DEG, CFG_Z2_MAX_OPTICAL_CORRECTION_DEG);
}

bool Temt6000Processor::calibrateGain(const uint16_t uniform_adc[4],
                                     float out_gain_v[4]) {
    for (int i = 0; i < 4; ++i) {
        if (uniform_adc[i] < 200 || uniform_adc[i] > 3800) {
            // Quá tối hoặc gần bão hòa: hiệu chuẩn không tin cậy
            return false;
        }
    }

    float avg = (static_cast<float>(uniform_adc[0]) +
                 static_cast<float>(uniform_adc[1]) +
                 static_cast<float>(uniform_adc[2]) +
                 static_cast<float>(uniform_adc[3])) / 4.0f;

    for (int i = 0; i < 4; ++i) {
        out_gain_v[i] = avg / static_cast<float>(uniform_adc[i]);
    }
    return true;
}

} // namespace solar
