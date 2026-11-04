/**
 * @file site_config_validator.h
 * @brief BỘ KIỂM TRA HỢP LỆ & QUẢN LÝ TỌA ĐỘ LẮP ĐẶT (SiteConfig)
 * @details Thuần C++17, độc lập mạng, kiểm tra biên, xử lý dấu phẩy thập phân,
 *          cảnh báo đảo trục lat/lon, làm tròn 5 số thập phân và kiểm soát an toàn áp dụng.
 */

#ifndef SITE_CONFIG_VALIDATOR_H
#define SITE_CONFIG_VALIDATOR_H

#include "solar_types.h"
#include <string>

namespace solar {

class SiteConfigValidator {
public:
    /**
     * @brief Kiểm tra và chuẩn hóa SiteConfig từ giá trị số double
     */
    static SiteConfig validateAndNormalize(double lat, double lon,
                                           uint32_t rev, uint64_t updated_at,
                                           const char* updated_by,
                                           SiteSource source = SiteSource::FIREBASE);

    /**
     * @brief Phân tích chuỗi (hỗ trợ dấu phẩy thập phân kiểu VN "10,7831") và validate
     */
    static SiteConfig parseAndValidate(const char* lat_str, const char* lon_str,
                                       uint32_t rev, uint64_t updated_at,
                                       const char* updated_by,
                                       SiteSource source = SiteSource::FIREBASE);

    /**
     * @brief Kiểm tra xem hệ thống có đang ở trạng thái an toàn để áp dụng SiteConfig mới hay không
     * @param currentState Trạng thái FSM hiện tại của Tracker
     * @param experiment_lock Cờ EXPERIMENT_LOCK (đang đo 30 ngày)
     * @param[in,out] inout_faults Cờ lỗi hệ thống để ghi SITE_CHANGE_REJECTED hoặc SITE_CHANGED_IN_EXPERIMENT
     * @return true nếu được phép áp dụng ngay, false nếu phải từ chối hoặc trì hoãn
     */
    static bool canApplyNewSiteConfig(TrackerState currentState,
                                      bool experiment_lock,
                                      FaultFlag& inout_faults);

    /**
     * @brief Kiểm tra xem bản tin SiteConfig mới có số revision hợp lệ (lớn hơn revision hiện tại) hay không
     * @param incomingRev Số rev nhận được từ Firebase/Command
     * @param currentRev Số rev hiện tại đang lưu trong hệ thống
     * @return true nếu incomingRev > currentRev, false nếu bằng hoặc cũ hơn
     */
    static bool isRevisionNewer(uint32_t incomingRev, uint32_t currentRev);

    /**
     * @brief Helper parse chuỗi số thực xử lý dấu phẩy thập phân ("10,7831" -> 10.7831)
     */
    static bool parseCoordinateString(const char* str, double& out_val);

    /**
     * @brief Làm tròn số thực đến đúng 5 chữ số thập phân
     */
    static double round5Decimals(double val);
};

} // namespace solar

#endif // SITE_CONFIG_VALIDATOR_H
