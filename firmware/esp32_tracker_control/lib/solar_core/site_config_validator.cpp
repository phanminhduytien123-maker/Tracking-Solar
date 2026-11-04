/**
 * @file site_config_validator.cpp
 * @brief HIỆN THỰC THUẬT TOÁN VALIDATE & CHUẨN HÓA SiteConfig
 */

#include "site_config_validator.h"
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <algorithm>

namespace solar {

namespace {
    constexpr double VN_LAT_MIN = 8.0;
    constexpr double VN_LAT_MAX = 24.0;
    constexpr double VN_LON_MIN = 102.0;
    constexpr double VN_LON_MAX = 110.0;
}

double SiteConfigValidator::round5Decimals(double val) {
    return std::round(val * 100000.0) / 100000.0;
}

bool SiteConfigValidator::parseCoordinateString(const char* str, double& out_val) {
    if (!str || str[0] == '\0') {
        return false;
    }

    // Sao chép và thay thế dấu phẩy ',' thành dấu chấm '.'
    char buffer[64];
    size_t len = 0;
    while (str[len] != '\0' && len < sizeof(buffer) - 1) {
        if (str[len] == ',') {
            buffer[len] = '.';
        } else {
            buffer[len] = str[len];
        }
        len++;
    }
    buffer[len] = '\0';

    char* endptr = nullptr;
    double val = std::strtod(buffer, &endptr);
    if (endptr == buffer || *endptr != '\0') {
        return false;
    }

    if (std::isnan(val) || std::isinf(val)) {
        return false;
    }

    out_val = val;
    return true;
}

SiteConfig SiteConfigValidator::validateAndNormalize(double lat, double lon,
                                                     uint32_t rev, uint64_t updated_at,
                                                     const char* updated_by,
                                                     SiteSource source) {
    SiteConfig cfg = {};
    cfg.rev = rev;
    cfg.updated_at = updated_at;
    cfg.source = source;
    cfg.valid = false;
    cfg.warning_outside_vn = false;
    cfg.warning_inverted = false;

    if (updated_by) {
        std::strncpy(cfg.updated_by, updated_by, sizeof(cfg.updated_by) - 1);
        cfg.updated_by[sizeof(cfg.updated_by) - 1] = '\0';
    } else {
        std::strcpy(cfg.updated_by, "unknown");
    }

    // 1. Kiểm tra NaN / Inf
    if (std::isnan(lat) || std::isinf(lat) || std::isnan(lon) || std::isinf(lon)) {
        return cfg;
    }

    // 2. Từ chối tọa độ (0, 0)
    if (std::fabs(lat) < 1e-6 && std::fabs(lon) < 1e-6) {
        return cfg;
    }

    // 3. Kiểm tra dải hợp lệ toàn cầu: lat in [-90, 90], lon in [-180, 180]
    if (lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) {
        return cfg;
    }

    // 4. Cảnh báo đảo kinh/vĩ độ (Ví dụ: vĩ độ > 90 hoặc vĩ độ nằm trong khoảng 102..110 và kinh độ trong khoảng 8..24)
    if (lat >= VN_LON_MIN && lat <= VN_LON_MAX && lon >= VN_LAT_MIN && lon <= VN_LAT_MAX) {
        cfg.warning_inverted = true;
    }

    // 5. Cảnh báo nằm ngoài khung Việt Nam (khoảng 8-24°N, 102-110°E)
    if (lat < VN_LAT_MIN || lat > VN_LAT_MAX || lon < VN_LON_MIN || lon > VN_LON_MAX) {
        cfg.warning_outside_vn = true;
    }

    // 6. Làm tròn 5 chữ số thập phân
    cfg.lat_deg = round5Decimals(lat);
    cfg.lon_deg = round5Decimals(lon);
    cfg.valid = true;

    return cfg;
}

SiteConfig SiteConfigValidator::parseAndValidate(const char* lat_str, const char* lon_str,
                                                 uint32_t rev, uint64_t updated_at,
                                                 const char* updated_by,
                                                 SiteSource source) {
    double lat = 0.0;
    double lon = 0.0;
    if (!parseCoordinateString(lat_str, lat) || !parseCoordinateString(lon_str, lon)) {
        SiteConfig cfg = {};
        cfg.valid = false;
        cfg.source = source;
        return cfg;
    }

    return validateAndNormalize(lat, lon, rev, updated_at, updated_by, source);
}

bool SiteConfigValidator::canApplyNewSiteConfig(TrackerState currentState,
                                                bool experiment_lock,
                                                FaultFlag& inout_faults) {
    // Nếu cờ EXPERIMENT_LOCK bật (đang trong đợt đo 30 ngày chính thức)
    if (experiment_lock) {
        inout_faults = inout_faults | FaultFlag::SITE_CHANGE_REJECTED;
        return false;
    }

    // Chỉ áp dụng ở trạng thái an toàn tuyệt đối:
    // BOOT: Khi mới khởi động
    // PARK, PREP_SLEEP: Buổi tối khi đã đỗ nghỉ an toàn
    // DAWN_POLL: Khi thăm dò hừng đông trước khi bắt đầu bám
    switch (currentState) {
        case TrackerState::BOOT:
        case TrackerState::PARK:
        case TrackerState::PREP_SLEEP:
        case TrackerState::DEEP_SLEEP:
        case TrackerState::DAWN_POLL:
            return true;

        default:
            // Không được áp dụng khi đang MOVE, SENSE, DECIDE, IDLE giữa ban ngày
            // vì sẽ làm góc feedforward θ_ff nhảy bậc đột ngột gây giật động cơ
            inout_faults = inout_faults | FaultFlag::SITE_CHANGE_REJECTED;
            return false;
    }
}

bool SiteConfigValidator::isRevisionNewer(uint32_t incomingRev, uint32_t currentRev) {
    // Chỉ chấp nhận nếu revision mới lớn hơn hẳn revision hiện tại
    return incomingRev > currentRev;
}

} // namespace solar
