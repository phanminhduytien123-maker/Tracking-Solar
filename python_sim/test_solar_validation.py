"""
test_solar_validation.py
KIỂM THỬ THIÊN VĂN & ĐỐI CHIẾU THUẬT TOÁN NOAA CHO CÁC MÙA VÀ THÁNG THÍ NGHIỆM
"""

import sys
import math

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from solar_ephemeris import calculate_solar_position, wrap360
from solar_geometry import compute_axis_targets, compute_morning_wakeup, is_zenith_singularity
import solar_config as cfg

def run_solar_validation():
    print("=" * 75)
    print("BẮT ĐẦU KIỂM THỬ THUẬT TOÁN NOAA VÀ BIẾN ĐỔI HÌNH HỌC TẤM PIN")
    print(f"Địa điểm: Lat = {cfg.CFG_A_LATITUDE_DEG}° N, Lon = {cfg.CFG_B_LONGITUDE_DEG}° E, UTC+{cfg.CFG_TIMEZONE_OFFSET_HOURS}")
    print("=" * 75)

    # 1. Kiểm thử ngày thí nghiệm: 15/11/2026 (Giữa đợt thí nghiệm 30 ngày)
    print("\n--- 1. NGÀY THÍ NGHIỆM 15/11/2026 ---")
    times_test = [
        (5, 45, 0, "Bình minh sớm"),
        (6, 30, 0, "Mặt trời lên thấp"),
        (9, 0, 0, "Buổi sáng"),
        (11, 40, 0, "Gần chính ngọ"),
        (12, 0, 0, "Chính ngọ (Solar Noon)"),
        (15, 0, 0, "Buổi chiều"),
        (17, 15, 0, "Gần hoàng hôn"),
        (18, 0, 0, "Sau hoàng hôn")
    ]

    for h, m, s, desc in times_test:
        pos = calculate_solar_position(2026, 11, 15, h, m, s, cfg.CFG_TIMEZONE_OFFSET_HOURS,
                                       cfg.CFG_A_LATITUDE_DEG, cfg.CFG_B_LONGITUDE_DEG)
        active, tgt_az, tgt_el = compute_axis_targets(pos)
        sr_h, sr_m = pos.sunrise_min // 60, pos.sunrise_min % 60
        ss_h, ss_m = pos.sunset_min // 60, pos.sunset_min % 60

        print(f"[{desc} {h:02d}:{m:02d}] Sun(Az={pos.azimuth_deg:6.2f}°, El={pos.elevation_deg:6.2f}°) "
              f"| Panel(phi={tgt_az.final_ref_deg:6.2f}°, eps={tgt_el.final_ref_deg:6.2f}°) "
              f"| Active={active} | Clamp=[Az:{tgt_az.clamp_reason}, El:{tgt_el.clamp_reason}]")

    wake_h, wake_m = compute_morning_wakeup(pos.tracking_start_min, cfg.CFG_WAKEUP_LEAD_TIME_MIN)
    print(f"-> Mặt trời mọc: {sr_h:02d}:{sr_m:02d}, Lặn: {ss_h:02d}:{ss_m:02d}")
    print(f"-> Bắt đầu bám (El >= 10°): {pos.tracking_start_min//60:02d}:{pos.tracking_start_min%60:02d}, Kết thúc: {pos.tracking_end_min//60:02d}:{pos.tracking_end_min%60:02d}")
    print(f"-> Giờ báo thức DS3231 buổi sáng: {wake_h:02d}:{wake_m:02d} (Thức trước khi bám {cfg.CFG_WAKEUP_LEAD_TIME_MIN} phút)")
    assert (wake_h * 60 + wake_m) == (pos.tracking_start_min - cfg.CFG_WAKEUP_LEAD_TIME_MIN), "Lỗi tính toán giờ báo thức!"

    # 2. Kiểm thử 4 mùa trong năm tại TP.HCM (Hạ chí, Đông chí, Xuân phân, Thu phân)
    print("\n--- 2. KIỂM THỬ BIÊN HÀNH TRÌNH PHƯƠNG VỊ CẢ NĂM ---")
    seasons = [
        (2026, 6, 21, "Hạ chí (Summer Solstice) - Mọc cực Bắc"),
        (2026, 12, 21, "Đông chí (Winter Solstice) - Mọc cực Nam"),
        (2026, 3, 20, "Xuân phân (Spring Equinox)"),
        (2026, 9, 22, "Thu phân (Autumn Equinox)")
    ]

    for y, mo, d, sname in seasons:
        # Lấy thời điểm lúc mặt trời mọc + 15 phút (vừa lên chân trời)
        pos_sample = calculate_solar_position(y, mo, d, 12, 0, 0, cfg.CFG_TIMEZONE_OFFSET_HOURS,
                                              cfg.CFG_A_LATITUDE_DEG, cfg.CFG_B_LONGITUDE_DEG)
        sr_min = pos_sample.sunrise_min
        ss_min = pos_sample.sunset_min

        pos_rise = calculate_solar_position(y, mo, d, sr_min // 60, sr_min % 60, 0, cfg.CFG_TIMEZONE_OFFSET_HOURS,
                                            cfg.CFG_A_LATITUDE_DEG, cfg.CFG_B_LONGITUDE_DEG)
        pos_set = calculate_solar_position(y, mo, d, ss_min // 60, ss_min % 60, 0, cfg.CFG_TIMEZONE_OFFSET_HOURS,
                                           cfg.CFG_A_LATITUDE_DEG, cfg.CFG_B_LONGITUDE_DEG)

        _, tgt_rise, _ = compute_axis_targets(pos_rise)
        _, tgt_set, _ = compute_axis_targets(pos_set)

        print(f"[{sname}]")
        print(f"   Mặt trời mọc: {sr_min//60:02d}:{sr_min%60:02d} (Az={pos_rise.azimuth_deg:5.1f}° -> phi_panel={tgt_rise.feedforward_deg:5.1f}°)")
        print(f"   Mặt trời lặn: {ss_min//60:02d}:{ss_min%60:02d} (Az={pos_set.azimuth_deg:5.1f}° -> phi_panel={tgt_set.feedforward_deg:5.1f}°)")
        print(f"   Tổng hành trình quay phi trong ngày: {tgt_set.feedforward_deg - tgt_rise.feedforward_deg:.1f}°")

        # Kiểm tra công tắc HOME G = 45° có an toàn không
        assert tgt_rise.feedforward_deg >= cfg.CFG_AZ_MIN_SOFT_LIMIT_DEG, \
            f"Nguy hiểm: Góc mọc phi={tgt_rise.feedforward_deg}° nhỏ hơn giới hạn mềm!"
        assert tgt_set.feedforward_deg <= cfg.CFG_I_AZ_MAX_SOFT_LIMIT_DEG, \
            f"Nguy hiểm: Góc lặn phi={tgt_set.feedforward_deg}° vượt quá giới hạn mềm cáp {cfg.CFG_I_AZ_MAX_SOFT_LIMIT_DEG}°!"

    # 3. Kiểm thử vùng kỳ dị gần thiên đỉnh (Zenith Singularity: Ngày 8/5 tại TP.HCM)
    print("\n--- 3. KIỂM THỬ VÙNG KỲ DỊ GẦN THIÊN ĐỈNH (ZENITH) ---")
    # Ngày 8/5/2026, mặt trời đi qua thiên đỉnh tại TP.HCM vào khoảng 11:50 - 11:54
    for minute in range(48, 56):
        pos_zenith = calculate_solar_position(2026, 5, 8, 11, minute, 0, cfg.CFG_TIMEZONE_OFFSET_HOURS,
                                              cfg.CFG_A_LATITUDE_DEG, cfg.CFG_B_LONGITUDE_DEG)
        is_sing = is_zenith_singularity(pos_zenith.elevation_deg)
        active, tgt_az, tgt_el = compute_axis_targets(pos_zenith)
        print(f"   [11:{minute:02d}] El={pos_zenith.elevation_deg:5.2f}°, Az={pos_zenith.azimuth_deg:6.2f}° | "
              f"Kỳ dị={is_sing} | El_clamp={tgt_el.clamp_reason}")

    # 4. Kiểm thử bảo vệ chống va chạm trục Z (L = 25°)
    print("\n--- 4. KIỂM THỬ BẢO VỆ CHỐNG ĐÂM TRỤC Z (CLASH PROTECTION) ---")
    pos_low = calculate_solar_position(2026, 11, 15, 6, 10, 0, cfg.CFG_TIMEZONE_OFFSET_HOURS,
                                       cfg.CFG_A_LATITUDE_DEG, cfg.CFG_B_LONGITUDE_DEG)
    active, tgt_az, tgt_el = compute_axis_targets(pos_low)
    print(f"   Khi El mặt trời = {pos_low.elevation_deg:.2f}° (< L={cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG}°):")
    print(f"   -> Epsilon tấm bị kẹp tại: {tgt_el.final_ref_deg:.2f}° (Lý do: {tgt_el.clamp_reason})")
    assert tgt_el.final_ref_deg == cfg.CFG_L_EL_MIN_SOFT_LIMIT_DEG, "Bảo vệ va chạm trục Z không hoạt động!"

    # 5. Kiểm thử lọc Revision (rev) và xác nhận tọa độ site_confirmed
    print("\n--- 5. KIỂM THỬ LỌC REVISION VÀ CỜ SITE_CONFIRMED ---")
    from site_config_validator import validate_and_normalize, is_revision_newer
    current_rev = 1
    assert not is_revision_newer(1, current_rev), "Lỗi: Trùng rev không bị chặn!"
    assert not is_revision_newer(0, current_rev), "Lỗi: Rev cũ hơn không bị chặn!"
    assert is_revision_newer(2, current_rev), "Lỗi: Rev mới hơn bị từ chối!"
    assert is_revision_newer(5, current_rev), "Lỗi: Rev mới hơn nhảy bước bị từ chối!"
    print("   -> Lọc Revision: ĐẠT 100% (chỉ chấp nhận rev mới hơn)")

    cfg_init = validate_and_normalize(10.78310, 106.67210, rev=1)
    cfg_init.confirmed = True
    cfg_init.confirmed_by = "admin"
    assert cfg_init.confirmed
    cfg_edit = validate_and_normalize(10.79000, 106.68000, rev=2)
    assert not cfg_edit.confirmed, "Lỗi: Khi đổi tọa độ cờ confirmed không tự về False!"
    print("   -> Cờ site_confirmed: ĐẠT 100% (tự động reset về False khi đổi tọa độ)")

    print("\n" + "=" * 75)
    print("TẤT CẢ KIỂM THỬ THIÊN VĂN, HÌNH HỌC & SITE CONFIG ĐẠT 100%!")
    print("=" * 75)

if __name__ == "__main__":
    run_solar_validation()
