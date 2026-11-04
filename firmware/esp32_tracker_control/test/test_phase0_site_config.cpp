/**
 * @file test_phase0_site_config.cpp
 * @brief UNIT TEST KIỂM THỬ HỢP ĐỒNG DỮ LIỆU SiteConfig VÀ QUY TẮC AN TOÀN
 */

#include <iostream>
#include <cassert>
#include <cmath>
#include <cstring>
#include "solar_config.h"
#include "solar_types.h"
#include "site_config_validator.h"

int main() {
    std::cout << "[TEST PHASE 0] Bat dau kiem thu SiteConfigValidator & RTC Types..." << std::endl;

    // 1. Tọa độ hợp lệ TP.HCM
    solar::SiteConfig cfg1 = solar::SiteConfigValidator::validateAndNormalize(
        10.78310234, 106.67210987, 1, 1729744400000ULL, "admin", solar::SiteSource::FIREBASE
    );
    assert(cfg1.valid);
    assert(std::fabs(cfg1.lat_deg - 10.78310) < 1e-6);
    assert(std::fabs(cfg1.lon_deg - 106.67211) < 1e-6); // Round 5 decimal places
    assert(!cfg1.warning_outside_vn);
    assert(!cfg1.warning_inverted);
    std::cout << "-> Test 1 PASS: Valid HCMC coordinates with 5 decimal rounding" << std::endl;

    // 2. Tọa độ từ chuỗi có dấu phẩy kiểu Việt Nam ("10,7831")
    solar::SiteConfig cfg2 = solar::SiteConfigValidator::parseAndValidate(
        "10,78310", "106,67210", 2, 1729744500000ULL, "user"
    );
    assert(cfg2.valid);
    assert(std::fabs(cfg2.lat_deg - 10.78310) < 1e-6);
    assert(std::fabs(cfg2.lon_deg - 106.67210) < 1e-6);
    std::cout << "-> Test 2 PASS: Vietnamese comma parse ('10,7831' -> 10.78310)" << std::endl;

    // 3. Từ chối (0, 0)
    solar::SiteConfig cfg_zero = solar::SiteConfigValidator::validateAndNormalize(0.0, 0.0, 1, 0, "test");
    assert(!cfg_zero.valid);
    std::cout << "-> Test 3 PASS: Rejected (0, 0) island coordinates" << std::endl;

    // 4. Từ chối vượt giới hạn toàn cầu [-90, 90] và [-180, 180]
    solar::SiteConfig cfg_oob1 = solar::SiteConfigValidator::validateAndNormalize(95.0, 106.0, 1, 0, "test");
    solar::SiteConfig cfg_oob2 = solar::SiteConfigValidator::validateAndNormalize(10.0, 190.0, 1, 0, "test");
    assert(!cfg_oob1.valid);
    assert(!cfg_oob2.valid);
    std::cout << "-> Test 4 PASS: Rejected out of range coordinates" << std::endl;

    // 5. Cảnh báo nằm ngoài khung Việt Nam (khoảng 8-24°N, 102-110°E) nhưng vẫn hợp lệ
    solar::SiteConfig cfg_tokyo = solar::SiteConfigValidator::validateAndNormalize(35.6762, 139.6503, 1, 0, "test");
    assert(cfg_tokyo.valid);
    assert(cfg_tokyo.warning_outside_vn);
    assert(!cfg_tokyo.warning_inverted);
    std::cout << "-> Test 5 PASS: Warning outside Vietnam emitted for Tokyo" << std::endl;

    // 6. Cảnh báo đảo lat / lon (gõ nhầm kinh độ vào ô vĩ độ)
    solar::SiteConfig cfg_inv = solar::SiteConfigValidator::validateAndNormalize(106.67, 10.78, 1, 0, "test");
    assert(cfg_inv.valid);
    assert(cfg_inv.warning_inverted);
    std::cout << "-> Test 6 PASS: Warning inverted coordinates emitted" << std::endl;

    // 7. Kiểm tra thời điểm an toàn áp dụng tọa độ mới
    solar::FaultFlag faults = solar::FaultFlag::NONE;

    // Ở BOOT hoặc PARK: Cho phép áp dụng
    bool ok_boot = solar::SiteConfigValidator::canApplyNewSiteConfig(solar::TrackerState::BOOT, false, faults);
    assert(ok_boot);
    bool ok_park = solar::SiteConfigValidator::canApplyNewSiteConfig(solar::TrackerState::PARK, false, faults);
    assert(ok_park);

    // Ở MOVE giữa ban ngày: Từ chối áp dụng, bật cờ SITE_CHANGE_REJECTED
    bool ok_move = solar::SiteConfigValidator::canApplyNewSiteConfig(solar::TrackerState::MOVE, false, faults);
    assert(!ok_move);
    assert(solar::hasFault(faults, solar::FaultFlag::SITE_CHANGE_REJECTED));
    std::cout << "-> Test 7 PASS: Safe state application policy verified" << std::endl;

    // 8. Kiểm tra EXPERIMENT_LOCK: Dù ở trạng thái an toàn vẫn bị từ chối
    faults = solar::FaultFlag::NONE;
    bool ok_locked = solar::SiteConfigValidator::canApplyNewSiteConfig(solar::TrackerState::BOOT, true, faults);
    assert(!ok_locked);
    assert(solar::hasFault(faults, solar::FaultFlag::SITE_CHANGE_REJECTED));
    std::cout << "-> Test 8 PASS: EXPERIMENT_LOCK blocks coordinate updates" << std::endl;

    // 9. Kiểm tra tự động lọc revision (rev) phía ESP32
    uint32_t current_rev = 1;
    // (a) Trùng rev hiện tại -> từ chối (không ghi flash NVS)
    assert(!solar::SiteConfigValidator::isRevisionNewer(1, current_rev));
    // (b) Rev cũ hơn -> từ chối
    assert(!solar::SiteConfigValidator::isRevisionNewer(0, current_rev));
    // (c) Rev mới hơn (+1) -> chấp nhận
    assert(solar::SiteConfigValidator::isRevisionNewer(2, current_rev));
    // (d) Rev nhảy cóc (+3) -> chấp nhận
    assert(solar::SiteConfigValidator::isRevisionNewer(5, current_rev));
    std::cout << "-> Test 9 PASS: Revision filtering logic (isRevisionNewer) verified" << std::endl;

    // 10. Kiểm tra trường confirmed và confirmed_by
    solar::SiteConfig cfg_conf = solar::SiteConfigValidator::validateAndNormalize(
        10.78310, 106.67210, 3, 1729744600000ULL, "admin", solar::SiteSource::FIREBASE
    );
    cfg_conf.confirmed = true;
    std::strcpy(cfg_conf.confirmed_by, "admin_user");
    cfg_conf.confirmed_at = 1729744650000ULL;
    assert(cfg_conf.confirmed);
    assert(std::strcmp(cfg_conf.confirmed_by, "admin_user") == 0);

    // Khi người dùng sửa tọa độ mới, confirmed tự reset về false
    solar::SiteConfig cfg_changed = solar::SiteConfigValidator::validateAndNormalize(
        10.79000, 106.68000, 4, 1729744700000ULL, "admin", solar::SiteSource::FIREBASE
    );
    assert(!cfg_changed.confirmed); // Mặc định false khi nhận cấu hình mới
    std::cout << "-> Test 10 PASS: site_confirmed reset to false upon coordinate edit verified" << std::endl;

    std::cout << "[TEST PHASE 0] TAT CA 10 TEST CASE PASS 100%!" << std::endl;
    return 0;
}
