"""
simulate_energy_loss_L.py
Mô phỏng hình học và bức xạ quang năng:
1. Xác định thời điểm bắt đầu/kết thúc bám (El >= 10°) và thoát kẹp (El >= L=25°) trong tháng 11 tại TP.HCM.
2. Tính toán chính xác độ suy giảm năng lượng quang học (POA Irradiance) khi L = 25°
   so với các trường hợp L = 20°, L = 15°, L = 10°, và L = 0° (không giới hạn).
3. Đánh giá bức xạ quang học theo mô hình Clear-Sky chuẩn Ineichen / Perez / Haurwitz.
"""

import sys
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import math
import numpy as np
import pandas as pd
import pvlib
from datetime import datetime

# Import NOAA module
from solar_ephemeris import calculate_solar_position

lat = 10.78310
lon = 106.67210
tz_hours = 7.0
tz_name = "Asia/Ho_Chi_Minh"

def run_analysis():
    # -------------------------------------------------------------------------
    # 1. Khảo sát ngày điển hình: 15/11/2026 (bước thời gian 1 phút)
    # -------------------------------------------------------------------------
    times_1min = pd.date_range('2026-11-15 05:00', '2026-11-15 18:30', freq='1min', tz=tz_name)
    
    # Tính vị trí mặt trời theo NOAA
    el_list = []
    az_list = []
    for t in times_1min:
        pos = calculate_solar_position(2026, 11, 15, t.hour, t.minute, t.second, tz_hours, lat, lon, True)
        el_list.append(pos.elevation_deg)
        az_list.append(pos.azimuth_deg)

    df_day = pd.DataFrame({'time': times_1min, 'el': el_list, 'az': az_list})

    # Các mốc góc nâng
    t_sr = df_day[df_day['el'] >= 0.0]['time'].iloc[0]
    t_10_start = df_day[df_day['el'] >= 10.0]['time'].iloc[0]
    t_15_start = df_day[df_day['el'] >= 15.0]['time'].iloc[0]
    t_20_start = df_day[df_day['el'] >= 20.0]['time'].iloc[0]
    t_25_start = df_day[df_day['el'] >= 25.0]['time'].iloc[0]

    t_25_end = df_day[df_day['el'] >= 25.0]['time'].iloc[-1]
    t_20_end = df_day[df_day['el'] >= 20.0]['time'].iloc[-1]
    t_15_end = df_day[df_day['el'] >= 15.0]['time'].iloc[-1]
    t_10_end = df_day[df_day['el'] >= 10.0]['time'].iloc[-1]
    t_ss = df_day[df_day['el'] >= 0.0]['time'].iloc[-1]

    # Tính bức xạ trời trong (Clear-sky Irradiance) bằng mô hình Ineichen / pvlib
    location = pvlib.location.Location(lat, lon, tz=tz_name)
    cs = location.get_clearsky(times_1min, model='ineichen')
    # cs chứa 'ghi', 'dni', 'dhi'

    df_day['dni'] = cs['dni'].values
    df_day['dhi'] = cs['dhi'].values
    df_day['ghi'] = cs['ghi'].values

    # -------------------------------------------------------------------------
    # 2. Tính toán bức xạ trên mặt phẳng tấm pin POA (Plane of Array)
    #    với các giá trị L khác nhau: L in [0, 10, 15, 20, 25]
    # -------------------------------------------------------------------------
    # Khi bám 2 trục:
    # - Nếu El_sun < 10°: Không bám (tấm pin ở vị trí đỗ / an toàn, hoặc nằm ngang)
    # - Nếu El_sun >= 10°: Bám chủ động.
    #   Trục Azimuth: phi = Az_sun (không bị kẹp trong dải này vì Az trong khoảng 109° đến 251°)
    #   Trục Elevation: eps = max(L, El_sun).
    #   Góc lệch tia tới (Angle of Incidence - AOI):
    #   Do azimuth bám hoàn hảo vào mặt trời, góc tới giữa pháp tuyến mặt tấm và tia tới là:
    #   theta_AOI = eps - El_sun = max(0, L - El_sun) (độ)
    #
    #   Thành phần trực xạ trên mặt tấm:
    #   I_beam = DNI * cos(theta_AOI)
    #   Thành phần tán xạ trên mặt tấm (mô hình đẳng hướng):
    #   I_diffuse = DHI * (1 + cos(90° - eps)) / 2 = DHI * (1 + sin(eps)) / 2
    #   Thành phần phản xạ từ mặt đất (albedo = 0.2):
    #   I_ground = GHI * 0.2 * (1 - sin(eps)) / 2
    #   Tổng bức xạ POA:
    #   G_poa = I_beam + I_diffuse + I_ground

    L_values = [0.0, 10.0, 15.0, 20.0, 25.0]
    results_energy = {}

    for L in L_values:
        poa_list = []
        for idx, row in df_day.iterrows():
            el = row['el']
            if el < 10.0:
                # Dưới ngưỡng bám 10°: không bám, năng lượng coi như ở trạng thái chờ
                # Hoặc tấm giữ ở mốc đỗ L
                eps = L
                theta_aoi = math.radians(abs(eps - max(0.0, el)))
                # Bức xạ chiếu vào tấm khi không bám
                i_beam = max(0.0, row['dni'] * math.cos(theta_aoi))
                i_diff = row['dhi'] * (1.0 + math.sin(math.radians(eps))) / 2.0
                i_gnd = row['ghi'] * 0.2 * (1.0 - math.sin(math.radians(eps))) / 2.0
                poa_list.append(i_beam + i_diff + i_gnd)
            else:
                # Trong dải bám chủ động (El >= 10°)
                eps = max(L, el)
                theta_aoi = math.radians(eps - el)
                i_beam = max(0.0, row['dni'] * math.cos(theta_aoi))
                i_diff = row['dhi'] * (1.0 + math.sin(math.radians(eps))) / 2.0
                i_gnd = row['ghi'] * 0.2 * (1.0 - math.sin(math.radians(eps))) / 2.0
                poa_list.append(i_beam + i_diff + i_gnd)

        # Tích phân năng lượng cả ngày: bước 1 phút = 1/60 giờ
        e_kwh_m2 = np.sum(poa_list) * (1.0 / 60.0) / 1000.0
        # Năng lượng chỉ tính trong khoảng bám chủ động (El >= 10°)
        poa_tracking = [poa_list[i] for i in range(len(df_day)) if df_day['el'].iloc[i] >= 10.0]
        e_track_kwh_m2 = np.sum(poa_tracking) * (1.0 / 60.0) / 1000.0

        results_energy[L] = {
            'total_kwh_m2': e_kwh_m2,
            'tracking_kwh_m2': e_track_kwh_m2
        }

    # Bức xạ của tấm cố định (Tilt = 15°, Azimuth = 180° Nam)
    poa_fixed = []
    for idx, row in df_day.iterrows():
        el = row['el']
        az = row['az']
        if el > 0.0:
            # Góc tới trên tấm cố định: tilt beta = 15°, az_panel = 180°
            # cos(theta) = sin(el)*cos(beta) + cos(el)*sin(beta)*cos(az - 180°)
            beta_rad = math.radians(15.0)
            el_rad = math.radians(el)
            az_diff_rad = math.radians(az - 180.0)
            cos_aoi = math.sin(el_rad) * math.cos(beta_rad) + math.cos(el_rad) * math.sin(beta_rad) * math.cos(az_diff_rad)
            cos_aoi = max(0.0, cos_aoi)
            i_beam = row['dni'] * cos_aoi
            i_diff = row['dhi'] * (1.0 + math.cos(beta_rad)) / 2.0
            i_gnd = row['ghi'] * 0.2 * (1.0 - math.cos(beta_rad)) / 2.0
            poa_fixed.append(i_beam + i_diff + i_gnd)
        else:
            poa_fixed.append(0.0)
    e_fixed_kwh_m2 = np.sum(poa_fixed) * (1.0 / 60.0) / 1000.0

    # -------------------------------------------------------------------------
    # 3. Mở rộng mô phỏng cho TOÀN BỘ 30 NGÀY CỦA THÁNG 11
    # -------------------------------------------------------------------------
    times_nov = pd.date_range('2026-11-01 00:00', '2026-11-30 23:59', freq='10min', tz=tz_name)
    cs_nov = location.get_clearsky(times_nov, model='ineichen')
    
    el_nov = []
    for t in times_nov:
        if t.hour < 5 or t.hour > 18:
            el_nov.append(-10.0)
        else:
            p = calculate_solar_position(2026, 11, t.day, t.hour, t.minute, t.second, tz_hours, lat, lon)
            el_nov.append(p.elevation_deg)
    df_nov = pd.DataFrame({'time': times_nov, 'el': el_nov, 'dni': cs_nov['dni'].values, 'dhi': cs_nov['dhi'].values, 'ghi': cs_nov['ghi'].values})

    nov_energy = {}
    for L in L_values:
        poa_nov = []
        for idx, row in df_nov.iterrows():
            el = row['el']
            if el < 10.0:
                eps = L
                theta_aoi = math.radians(abs(eps - max(0.0, el)))
                i_beam = max(0.0, row['dni'] * math.cos(theta_aoi))
                i_diff = row['dhi'] * (1.0 + math.sin(math.radians(eps))) / 2.0
                i_gnd = row['ghi'] * 0.2 * (1.0 - math.sin(math.radians(eps))) / 2.0
                poa_nov.append(i_beam + i_diff + i_gnd)
            else:
                eps = max(L, el)
                theta_aoi = math.radians(eps - el)
                i_beam = max(0.0, row['dni'] * math.cos(theta_aoi))
                i_diff = row['dhi'] * (1.0 + math.sin(math.radians(eps))) / 2.0
                i_gnd = row['ghi'] * 0.2 * (1.0 - math.sin(math.radians(eps))) / 2.0
                poa_nov.append(i_beam + i_diff + i_gnd)
        # 10 phút = 1/6 giờ
        e_month = np.sum(poa_nov) * (1.0 / 6.0) / 1000.0
        nov_energy[L] = e_month

    # Tấm cố định tháng 11
    poa_fixed_nov = []
    for idx, row in df_nov.iterrows():
        el = row['el']
        t = row['time']
        if el > 0.0:
            sp = calculate_solar_position(2026, 11, t.day, t.hour, t.minute, t.second, tz_hours, lat, lon)
            az = sp.azimuth_deg
            beta_rad = math.radians(15.0)
            el_rad = math.radians(el)
            az_diff_rad = math.radians(az - 180.0)
            cos_aoi = math.sin(el_rad) * math.cos(beta_rad) + math.cos(el_rad) * math.sin(beta_rad) * math.cos(az_diff_rad)
            cos_aoi = max(0.0, cos_aoi)
            i_beam = row['dni'] * cos_aoi
            i_diff = row['dhi'] * (1.0 + math.cos(beta_rad)) / 2.0
            i_gnd = row['ghi'] * 0.2 * (1.0 - math.cos(beta_rad)) / 2.0
            poa_fixed_nov.append(i_beam + i_diff + i_gnd)
        else:
            poa_fixed_nov.append(0.0)
    e_fixed_month = np.sum(poa_fixed_nov) * (1.0 / 6.0) / 1000.0

    return {
        't_sr': t_sr,
        't_ss': t_ss,
        't_10_start': t_10_start,
        't_10_end': t_10_end,
        't_15_start': t_15_start,
        't_15_end': t_15_end,
        't_20_start': t_20_start,
        't_20_end': t_20_end,
        't_25_start': t_25_start,
        't_25_end': t_25_end,
        'day_energy': results_energy,
        'e_fixed_day': e_fixed_kwh_m2,
        'month_energy': nov_energy,
        'e_fixed_month': e_fixed_month
    }

if __name__ == '__main__':
    res = run_analysis()
    print("=" * 80)
    print("1. KẾT QUẢ KHẢO SÁT MỐC THỜI GIAN NGÀY 15/11/2026 TẠI TP.HCM")
    print("=" * 80)
    print(f"Mặt trời mọc (El = 0°):               {res['t_sr'].strftime('%H:%M:%S')}")
    print(f"Vượt ngưỡng bám tối thiểu (El = 10°): {res['t_10_start'].strftime('%H:%M:%S')} (Sáng) -> {res['t_10_end'].strftime('%H:%M:%S')} (Chiều)")
    print(f"Góc nâng đạt 15°:                     {res['t_15_start'].strftime('%H:%M:%S')}        -> {res['t_15_end'].strftime('%H:%M:%S')}")
    print(f"Góc nâng đạt 20°:                     {res['t_20_start'].strftime('%H:%M:%S')}        -> {res['t_20_end'].strftime('%H:%M:%S')}")
    print(f"Thoát kẹp mềm L = 25° (El = 25°):     {res['t_25_start'].strftime('%H:%M:%S')} (Sáng) -> {res['t_25_end'].strftime('%H:%M:%S')} (Chiều)")
    print(f"Mặt trời lặn (El = 0°):               {res['t_ss'].strftime('%H:%M:%S')}")

    dur_tracking = (res['t_10_end'] - res['t_10_start']).total_seconds() / 3600.0
    dur_clamp_am = (res['t_25_start'] - res['t_10_start']).total_seconds() / 60.0
    dur_clamp_pm = (res['t_10_end'] - res['t_25_end']).total_seconds() / 60.0
    print(f"\nTổng thời gian bám chủ động trong ngày (El >= 10°): {dur_tracking:.2f} giờ ({dur_tracking*60:.0f} phút)")
    print(f"Khoảng thời gian bị kẹp L = 25° buổi sáng: {res['t_10_start'].strftime('%H:%M')} đến {res['t_25_start'].strftime('%H:%M')} ({dur_clamp_am:.0f} phút)")
    print(f"Khoảng thời gian bị kẹp L = 25° buổi chiều: {res['t_25_end'].strftime('%H:%M')} đến {res['t_10_end'].strftime('%H:%M')} ({dur_clamp_pm:.0f} phút)")

    print("\n" + "=" * 80)
    print("2. ĐÁNH GIÁ NĂNG LƯỢNG QUANG HỌC THEO CÁC GIÁ TRỊ L (NGÀY 15/11/2026)")
    print("=" * 80)
    e_ideal = res['day_energy'][0.0]['total_kwh_m2']
    print(f"{'Mức kẹp L':<12} | {'Năng lượng ngày (kWh/m²)':<25} | {'Hao hụt vs Lý tưởng (0°)':<25} | {'Độ lợi vs Tấm cố định':<22}")
    print("-" * 90)
    for L in [0.0, 10.0, 15.0, 20.0, 25.0]:
        e = res['day_energy'][L]['total_kwh_m2']
        loss_pct = (1.0 - e / e_ideal) * 100.0
        gain_vs_fixed = (e / res['e_fixed_day'] - 1.0) * 100.0
        print(f"L = {L:>4.1f}°     | {e:<25.4f} | -{loss_pct:<24.4f}% | +{gain_vs_fixed:<21.2f}%")
    
    print(f"Tấm cố định  | {res['e_fixed_day']:<25.4f} | (Góc nghiêng beta=15°, Az=180° Nam)")

    print("\n" + "=" * 80)
    print("3. ĐÁNH GIÁ NĂNG LƯỢNG TOÀN BỘ THÁNG 11/2026 (30 NGÀY)")
    print("=" * 80)
    e_nov_ideal = res['month_energy'][0.0]
    print(f"{'Mức kẹp L':<12} | {'Tổng năng lượng tháng (kWh/m²)':<30} | {'Hao hụt vs L=0°':<20} | {'Hao hụt vs L=10°':<20}")
    print("-" * 90)
    e_nov_10 = res['month_energy'][10.0]
    for L in [0.0, 10.0, 15.0, 20.0, 25.0]:
        e = res['month_energy'][L]
        loss_ideal = (1.0 - e / e_nov_ideal) * 100.0
        loss_vs_10 = (1.0 - e / e_nov_10) * 100.0
        print(f"L = {L:>4.1f}°     | {e:<30.3f} | -{loss_ideal:<19.3f}% | -{loss_vs_10:<19.3f}%")
    print(f"Tấm cố định  | {res['e_fixed_month']:<30.3f} | (Tháng 11)")
