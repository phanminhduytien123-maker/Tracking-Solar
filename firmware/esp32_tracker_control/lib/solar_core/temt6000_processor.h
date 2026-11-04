/**
 * @file temt6000_processor.h
 * @brief XỬ LÝ TÍN HIỆU CẢM BIẾN QUANG TEMT6000 & THUẬT TOÁN CHUẨN HÓA SAI SỐ
 * @details Chịu trách nhiệm:
 *          1. Bù sai lệch gain 4 mắt đọc: Top, Bottom, Left, Right
 *          2. Kiểm tra bão hòa ADC (ngưỡng W = 3950)
 *          3. Tính tổng cường độ sáng và trọng số tin cậy w_s (ngưỡng tối X, ngưỡng sáng Y)
 *          4. Chuẩn hóa sai số quang học e_s,az = (L-R)/(L+R) và e_s,el = (T-B)/(T+B)
 *          5. Lọc vùng chết Deadband (±0.04) chống dao động cơ học
 *          6. Tính góc hiệu chỉnh tinh delta_theta = sat(w_s * Z * e_s, ±Z2)
 *          7. Tự động cân bằng Zero-Offset (Calibration) dưới ánh sáng đồng nhất
 */

#ifndef TEMT6000_PROCESSOR_H
#define TEMT6000_PROCESSOR_H

#include "solar_types.h"
#include "solar_config.h"

namespace solar {

class Temt6000Processor {
public:
    /**
     * @brief Xử lý dữ liệu đọc ADC 4 cảm biến quang TEMT6000
     * @param raw_adc Mảng 4 giá trị ADC raw 12-bit [0:Top, 1:Bottom, 2:Left, 3:Right]
     * @param gain_v Mảng 4 hệ số bù gain V [Top, Bottom, Left, Right]
     * @param[out] out_readings Struct TemtReadings chứa giá trị bù, tổng cường độ, sai số chuẩn hóa và trọng số
     */
    static void processReadings(const uint16_t raw_adc[4],
                               const float gain_v[4],
                               TemtReadings& out_readings);

    /**
     * @brief Tính góc hiệu chỉnh quang học cho 2 trục
     * @param readings Struct TemtReadings đã xử lý
     * @param[out] out_corr_az Góc hiệu chỉnh trục Azimuth (Độ, đã qua sat ±Z2)
     * @param[out] out_corr_el Góc hiệu chỉnh trục Elevation (Độ, đã qua sat ±Z2)
     */
    static void computeCorrectionAngles(const TemtReadings& readings,
                                       float& out_corr_az,
                                       float& out_corr_el);

    /**
     * @brief Tự động cân bằng Zero-Offset (Calibration) dưới nguồn sáng đồng nhất
     * @param uniform_adc Mảng 4 giá trị ADC raw đo dưới nguồn sáng đồng nhất
     * @param[out] out_gain_v Mảng 4 hệ số bù gain mới
     * @return true nếu cân bằng thành công (không bị tối hoặc bão hòa)
     */
    static bool calibrateGain(const uint16_t uniform_adc[4],
                             float out_gain_v[4]);
};

} // namespace solar

#endif // TEMT6000_PROCESSOR_H
