"""
benchmark_pvlib_grid.py
PHASE 1 SOLAR EPHEMERIS ACCURACY BENCHMARK AGAINST NREL SPA (PVLIB)

Executes:
1. 1,584-point grid benchmark (12 months x 33 timepoints x 4 locations)
   - Locations: HCMC, Hanoi, Da Nang, Sydney
   - Computes Max & Mean absolute error for Azimuth, Elevation (El > 5° vs El < 5°), Sunrise, Sunset
   - Evaluates for both Full NOAA and Simplified Spencer models
2. Point comparison on 15/11/2026 at 09:00 vs NREL SPA
3. Edge case testing:
   - Leap years (2024, 2028), leap day 29/02
   - Midnight (00:00:00) and day transition
   - Near-zenith singularity (HCMC in April and August)
   - Negative latitude (Sydney) and longitude crossing 180°
   - Invalid inputs (month 13, day 32, hour 25, NaN, Inf)
4. Four-year consecutive drift analysis (15/11 at 12:00 for 2024, 2025, 2026, 2027)
5. Exports test_vectors_phase1.json for C++ validation
"""

import sys
import math
import json
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import numpy as np
import pandas as pd
import pvlib
from datetime import datetime, time
import pytz

from solar_ephemeris import (
    calculate_solar_position,
    calculate_solar_position_spencer,
    is_leap_year,
    day_of_year,
    wrap360,
    wrap180
)

LOCATIONS = [
    {
        "id": "HCMC",
        "name": "TP. Ho Chi Minh (Site lap dat)",
        "lat": 10.78310,
        "lon": 106.67210,
        "tz_hours": 7.0,
        "tz_name": "Asia/Ho_Chi_Minh"
    },
    {
        "id": "HANOI",
        "name": "Ha Noi",
        "lat": 21.02850,
        "lon": 105.85420,
        "tz_hours": 7.0,
        "tz_name": "Asia/Ho_Chi_Minh"
    },
    {
        "id": "DANANG",
        "name": "Da Nang",
        "lat": 16.05440,
        "lon": 108.20220,
        "tz_hours": 7.0,
        "tz_name": "Asia/Ho_Chi_Minh"
    },
    {
        "id": "SYDNEY",
        "name": "Sydney, Australia (Nam ban cau)",
        "lat": -33.86880,
        "lon": 151.20930,
        "tz_hours": 10.0,
        "tz_name": "Australia/Sydney"
    }
]

def angular_diff(a1: float, a2: float) -> float:
    """Calculate minimum absolute difference between two azimuth angles in [0, 360)."""
    d = abs(a1 - a2) % 360.0
    return min(d, 360.0 - d)

def run_grid_benchmark():
    print("=" * 80)
    print("1. RUNNING 1,584-POINT ANNUAL GRID BENCHMARK AGAINST PVLIB (NREL SPA)")
    print("=" * 80)

    # 12 months (day 1 of each month), hours 04:00 to 20:00 every 30 mins (33 timepoints/day)
    year = 2026
    months = list(range(1, 13))
    hours_minutes = []
    for h in range(4, 21): # 4 to 20
        hours_minutes.append((h, 0))
        if h < 20:
            hours_minutes.append((h, 30))
    assert len(hours_minutes) == 33, f"Expected 33 timepoints, got {len(hours_minutes)}"

    records = []

    for loc in LOCATIONS:
        tz_fixed = pytz.FixedOffset(int(loc["tz_hours"] * 60))
        for m in months:
            # First calculate sunrise/sunset from pvlib for day 1 of month m
            day_ts = pd.Timestamp(year, m, 1, 0, 0, 0, tz=tz_fixed)
            dt_idx = pd.DatetimeIndex([day_ts])
            sr_df = pvlib.solarposition.sun_rise_set_transit_spa(dt_idx, loc["lat"], loc["lon"])
            
            # Extract pvlib sunrise/sunset in minutes from midnight local
            pv_sr_ts = sr_df['sunrise'].iloc[0]
            pv_ss_ts = sr_df['sunset'].iloc[0]
            pv_sr_min = (pv_sr_ts.hour * 60 + pv_sr_ts.minute + pv_sr_ts.second / 60.0) if pd.notnull(pv_sr_ts) else None
            pv_ss_min = (pv_ss_ts.hour * 60 + pv_ss_ts.minute + pv_ss_ts.second / 60.0) if pd.notnull(pv_ss_ts) else None

            # Calculate sunrise/sunset from NOAA and Spencer at noon
            pos_noaa_day = calculate_solar_position(year, m, 1, 12, 0, 0, loc["tz_hours"], loc["lat"], loc["lon"], True)
            pos_spencer_day = calculate_solar_position_spencer(year, m, 1, 12, 0, 0, loc["tz_hours"], loc["lat"], loc["lon"], True)

            err_sr_noaa = abs(pos_noaa_day.sunrise_min - pv_sr_min) if pv_sr_min is not None else 0.0
            err_ss_noaa = abs(pos_noaa_day.sunset_min - pv_ss_min) if pv_ss_min is not None else 0.0
            err_sr_spencer = abs(pos_spencer_day.sunrise_min - pv_sr_min) if pv_sr_min is not None else 0.0
            err_ss_spencer = abs(pos_spencer_day.sunset_min - pv_ss_min) if pv_ss_min is not None else 0.0

            for h, minute in hours_minutes:
                # Timestamp for pvlib with fixed offset
                t_idx = pd.DatetimeIndex([pd.Timestamp(year, m, 1, h, minute, 0, tz=tz_fixed)])
                spa_res = pvlib.solarposition.spa_python(t_idx, loc["lat"], loc["lon"])

                pv_az = float(spa_res['azimuth'].iloc[0])
                pv_el = float(spa_res['apparent_elevation'].iloc[0])

                # Models
                noaa = calculate_solar_position(year, m, 1, h, minute, 0, loc["tz_hours"], loc["lat"], loc["lon"], True)
                spencer = calculate_solar_position_spencer(year, m, 1, h, minute, 0, loc["tz_hours"], loc["lat"], loc["lon"], True)

                # Errors
                err_az_noaa = angular_diff(noaa.azimuth_deg, pv_az)
                err_el_noaa = abs(noaa.elevation_deg - pv_el)

                err_az_spencer = angular_diff(spencer.azimuth_deg, pv_az)
                err_el_spencer = abs(spencer.elevation_deg - pv_el)

                records.append({
                    "loc_id": loc["id"],
                    "loc_name": loc["name"],
                    "month": m,
                    "hour": h,
                    "minute": minute,
                    "pv_az": pv_az,
                    "pv_el": pv_el,
                    "noaa_az": noaa.azimuth_deg,
                    "noaa_el": noaa.elevation_deg,
                    "spencer_az": spencer.azimuth_deg,
                    "spencer_el": spencer.elevation_deg,
                    "err_az_noaa": err_az_noaa,
                    "err_el_noaa": err_el_noaa,
                    "err_az_spencer": err_az_spencer,
                    "err_el_spencer": err_el_spencer,
                    "err_sr_noaa": err_sr_noaa,
                    "err_ss_noaa": err_ss_noaa,
                    "err_sr_spencer": err_sr_spencer,
                    "err_ss_spencer": err_ss_spencer,
                    "is_daylight_tracking": (pv_el > 5.0)
                })

    df = pd.DataFrame(records)
    print(f"Total simulated data points: {len(df)} points (12 months x 33 timepoints x 4 locations = {12*33*4})")
    return df

def generate_error_tables(df: pd.DataFrame):
    print("\n" + "=" * 80)
    print("ACCURACY SUMMARY TABLE: FULL NOAA VS PVLIB (NREL SPA)")
    print("=" * 80)

    # Segregation: All points, El > 5° (Tracking range), El <= 5° (Horizon / Night)
    subsets = {
        "Tat ca 1,584 diem": df,
        "Vung bam ban ngay (El > 5°)": df[df["is_daylight_tracking"] == True],
        "Vung sat chan troi / dem (El <= 5°)": df[df["is_daylight_tracking"] == False]
    }

    noaa_stats = []
    spencer_stats = []

    for name, sub in subsets.items():
        n_pts = len(sub)
        noaa_stats.append({
            "Tap du lieu": name,
            "So diem": n_pts,
            "Az Max Error (deg)": sub["err_az_noaa"].max(),
            "Az Mean Error (deg)": sub["err_az_noaa"].mean(),
            "El Max Error (deg)": sub["err_el_noaa"].max(),
            "El Mean Error (deg)": sub["err_el_noaa"].mean(),
            "Sunrise Max Err (min)": sub["err_sr_noaa"].max(),
            "Sunrise Mean Err (min)": sub["err_sr_noaa"].mean(),
            "Sunset Max Err (min)": sub["err_ss_noaa"].max(),
            "Sunset Mean Err (min)": sub["err_ss_noaa"].mean(),
        })

        spencer_stats.append({
            "Tap du lieu": name,
            "So diem": n_pts,
            "Az Max Error (deg)": sub["err_az_spencer"].max(),
            "Az Mean Error (deg)": sub["err_az_spencer"].mean(),
            "El Max Error (deg)": sub["err_el_spencer"].max(),
            "El Mean Error (deg)": sub["err_el_spencer"].mean(),
            "Sunrise Max Err (min)": sub["err_sr_spencer"].max(),
            "Sunrise Mean Err (min)": sub["err_sr_spencer"].mean(),
            "Sunset Max Err (min)": sub["err_ss_spencer"].max(),
            "Sunset Mean Err (min)": sub["err_ss_spencer"].mean(),
        })

    df_noaa_stats = pd.DataFrame(noaa_stats)
    df_spencer_stats = pd.DataFrame(spencer_stats)

    print("\n--- THUẬT TOÁN FULL NOAA (CHUẨN THIÊN VĂN) ---")
    print(df_noaa_stats.to_string(index=False))

    print("\n--- THUẬT TOÁN RÚT GỌN SPENCER 1971 (FOURIER SERIES) ---")
    print(df_spencer_stats.to_string(index=False))

    # Location breakdown for El > 5°
    print("\n--- SAI SỐ THEO TỪNG ĐỊA ĐIỂM (CHỈ XÉT VÙNG BÁM BAN NGÀY El > 5°) ---")
    loc_breakdown = []
    for loc in LOCATIONS:
        sub = df[(df["loc_id"] == loc["id"]) & (df["is_daylight_tracking"] == True)]
        loc_breakdown.append({
            "Dia diem": loc["name"],
            "So diem El>5°": len(sub),
            "NOAA Az Max": round(sub["err_az_noaa"].max(), 4),
            "NOAA Az Mean": round(sub["err_az_noaa"].mean(), 4),
            "NOAA El Max": round(sub["err_el_noaa"].max(), 4),
            "NOAA El Mean": round(sub["err_el_noaa"].mean(), 4),
            "Spencer Az Max": round(sub["err_az_spencer"].max(), 4),
            "Spencer Az Mean": round(sub["err_az_spencer"].mean(), 4),
            "Spencer El Max": round(sub["err_el_spencer"].max(), 4),
            "Spencer El Mean": round(sub["err_el_spencer"].mean(), 4),
        })
    df_loc = pd.DataFrame(loc_breakdown)
    print(df_loc.to_string(index=False))

    return df_noaa_stats, df_spencer_stats, df_loc

def test_point_comparison():
    print("\n" + "=" * 80)
    print("2. POINT COMPARISON: 15/11/2026 AT 09:00:00 (HCMC) VS PVLIB (NREL SPA)")
    print("=" * 80)
    lat, lon, tz_hours = 10.78310, 106.67210, 7.0

    t_idx = pd.DatetimeIndex([pd.Timestamp('2026-11-15 09:00:00', tz='Asia/Ho_Chi_Minh')])
    spa_res = pvlib.solarposition.spa_python(t_idx, lat, lon)
    sr_df = pvlib.solarposition.sun_rise_set_transit_spa(t_idx, lat, lon)

    pv_az = float(spa_res['azimuth'].iloc[0])
    pv_el = float(spa_res['apparent_elevation'].iloc[0])
    pv_sr = sr_df['sunrise'].iloc[0]
    pv_ss = sr_df['sunset'].iloc[0]
    pv_sr_min = pv_sr.hour * 60 + pv_sr.minute + pv_sr.second / 60.0
    pv_ss_min = pv_ss.hour * 60 + pv_ss.minute + pv_ss.second / 60.0

    noaa = calculate_solar_position(2026, 11, 15, 9, 0, 0, tz_hours, lat, lon, True)
    spencer = calculate_solar_position_spencer(2026, 11, 15, 9, 0, 0, tz_hours, lat, lon, True)

    cmp_data = [
        {
            "Thong so": "Azimuth (°)",
            "pvlib (NREL SPA)": f"{pv_az:.4f}°",
            "Full NOAA": f"{noaa.azimuth_deg:.4f}°",
            "Delta NOAA": f"{angular_diff(noaa.azimuth_deg, pv_az):.4f}°",
            "Spencer 1971": f"{spencer.azimuth_deg:.4f}°",
            "Delta Spencer": f"{angular_diff(spencer.azimuth_deg, pv_az):.4f}°"
        },
        {
            "Thong so": "Elevation (°)",
            "pvlib (NREL SPA)": f"{pv_el:.4f}°",
            "Full NOAA": f"{noaa.elevation_deg:.4f}°",
            "Delta NOAA": f"{abs(noaa.elevation_deg - pv_el):.4f}°",
            "Spencer 1971": f"{spencer.elevation_deg:.4f}°",
            "Delta Spencer": f"{abs(spencer.elevation_deg - pv_el):.4f}°"
        },
        {
            "Thong so": "Sunrise (hh:mm)",
            "pvlib (NREL SPA)": f"{int(pv_sr_min//60):02d}:{int(pv_sr_min%60):02d} ({pv_sr_min:.1f}m)",
            "Full NOAA": f"{noaa.sunrise_min//60:02d}:{noaa.sunrise_min%60:02d} ({noaa.sunrise_min}m)",
            "Delta NOAA": f"{abs(noaa.sunrise_min - pv_sr_min):.2f} min",
            "Spencer 1971": f"{spencer.sunrise_min//60:02d}:{spencer.sunrise_min%60:02d} ({spencer.sunrise_min}m)",
            "Delta Spencer": f"{abs(spencer.sunrise_min - pv_sr_min):.2f} min"
        },
        {
            "Thong so": "Sunset (hh:mm)",
            "pvlib (NREL SPA)": f"{int(pv_ss_min//60):02d}:{int(pv_ss_min%60):02d} ({pv_ss_min:.1f}m)",
            "Full NOAA": f"{noaa.sunset_min//60:02d}:{noaa.sunset_min%60:02d} ({noaa.sunset_min}m)",
            "Delta NOAA": f"{abs(noaa.sunset_min - pv_ss_min):.2f} min",
            "Spencer 1971": f"{spencer.sunset_min//60:02d}:{spencer.sunset_min%60:02d} ({spencer.sunset_min}m)",
            "Delta Spencer": f"{abs(spencer.sunset_min - pv_ss_min):.2f} min"
        }
    ]
    df_cmp = pd.DataFrame(cmp_data)
    print(df_cmp.to_string(index=False))
    return df_cmp

def test_edge_cases():
    print("\n" + "=" * 80)
    print("3. EDGE CASE TESTING")
    print("=" * 80)
    lat, lon, tz = 10.78310, 106.67210, 7.0

    cases = []

    # 1. Leap year 2024: 29/02/2024 vs 28/02/2024 vs 01/03/2024
    doy_leap_28 = day_of_year(2024, 2, 28)
    doy_leap_29 = day_of_year(2024, 2, 29)
    doy_leap_01 = day_of_year(2024, 3, 1)
    doy_nonleap_01 = day_of_year(2025, 3, 1)
    cases.append({
        "Case": "Nam nhuan 2024 (29/02)",
        "Description": f"DOY 28/02={doy_leap_28}, DOY 29/02={doy_leap_29}, DOY 01/03={doy_leap_01} (Nam thuong 01/03={doy_nonleap_01})",
        "Pass": (doy_leap_29 == 60 and doy_leap_01 == 61 and doy_nonleap_01 == 60)
    })

    # Calculation on 29/02/2024 at 12:00 vs pvlib
    t_leap = pd.DatetimeIndex([pd.Timestamp('2024-02-29 12:00:00', tz='Asia/Ho_Chi_Minh')])
    spa_leap = pvlib.solarposition.spa_python(t_leap, lat, lon)
    noaa_leap = calculate_solar_position(2024, 2, 29, 12, 0, 0, tz, lat, lon, True)
    spencer_leap = calculate_solar_position_spencer(2024, 2, 29, 12, 0, 0, tz, lat, lon, True)
    delta_noaa_leap = angular_diff(noaa_leap.azimuth_deg, float(spa_leap['azimuth'].iloc[0]))
    cases.append({
        "Case": "Tinh toan 29/02/2024 12:00",
        "Description": f"NOAA Az={noaa_leap.azimuth_deg}°, pvlib={float(spa_leap['azimuth'].iloc[0]):.4f}° (Diff={delta_noaa_leap:.4f}°)",
        "Pass": (delta_noaa_leap < 0.05)
    })

    # 2. Midnight (00:00:00) & Day change boundary (23:59:59 -> 00:00:00)
    pos_2359 = calculate_solar_position(2026, 11, 15, 23, 59, 59, tz, lat, lon, True)
    pos_0000 = calculate_solar_position(2026, 11, 16, 0, 0, 0, tz, lat, lon, True)
    t_0000 = pd.DatetimeIndex([pd.Timestamp('2026-11-16 00:00:00', tz='Asia/Ho_Chi_Minh')])
    spa_0000 = pvlib.solarposition.spa_python(t_0000, lat, lon)
    cases.append({
        "Case": "Chuyen giao ngay 23:59:59 -> 00:00:00",
        "Description": f"23:59:59 El={pos_2359.elevation_deg:.2f}°, 00:00:00 El={pos_0000.elevation_deg:.2f}°, pvlib={float(spa_0000['apparent_elevation'].iloc[0]):.2f}°",
        "Pass": (abs(pos_0000.elevation_deg - float(spa_0000['apparent_elevation'].iloc[0])) < 0.05)
    })

    # 3. Near-zenith singularity at HCMC
    # HCMC (lat 10.7831°N) solar transit through zenith peaks around April 18 and August 24
    # On 2026-04-18 at 11:52 local time, elevation reaches 89.82° (Zenith = 0.18°)
    t_zenith = pd.DatetimeIndex([pd.Timestamp('2026-04-18 11:52:00', tz='Asia/Ho_Chi_Minh')])
    spa_zenith = pvlib.solarposition.spa_python(t_zenith, lat, lon)
    noaa_zenith = calculate_solar_position(2026, 4, 18, 11, 52, 0, tz, lat, lon, True)
    spencer_zenith = calculate_solar_position_spencer(2026, 4, 18, 11, 52, 0, tz, lat, lon, True)
    cases.append({
        "Case": "Vung ky di gan thien dinh (18/04/2026 11:52 HCMC)",
        "Description": f"NOAA El={noaa_zenith.elevation_deg:.4f}°, pvlib El={float(spa_zenith['apparent_elevation'].iloc[0]):.4f}°, Zen={noaa_zenith.zenith_deg:.4f}°",
        "Pass": (noaa_zenith.elevation_deg > 89.5 and abs(noaa_zenith.elevation_deg - float(spa_zenith['apparent_elevation'].iloc[0])) < 0.05)
    })

    # 4. Negative latitude (Sydney, Southern Hemisphere)
    t_syd = pd.DatetimeIndex([pd.Timestamp('2026-06-21 12:00:00', tz='Australia/Sydney')])
    spa_syd = pvlib.solarposition.spa_python(t_syd, -33.8688, 151.2093)
    noaa_syd = calculate_solar_position(2026, 6, 21, 12, 0, 0, 10.0, -33.8688, 151.2093, True)
    diff_syd_az = angular_diff(noaa_syd.azimuth_deg, float(spa_syd['azimuth'].iloc[0]))
    cases.append({
        "Case": "Vi do am (Sydney -33.8688°S dong chi nam)",
        "Description": f"NOAA Az={noaa_syd.azimuth_deg}°, pvlib={float(spa_syd['azimuth'].iloc[0]):.4f}° (Diff={diff_syd_az:.4f}°)",
        "Pass": (diff_syd_az < 0.05)
    })

    # 5. Longitude crossing 180°
    noaa_179 = calculate_solar_position(2026, 6, 21, 12, 0, 0, 12.0, 0.0, 179.99, True)
    noaa_neg179 = calculate_solar_position(2026, 6, 21, 12, 0, 0, -12.0, 0.0, -179.99, True)
    cases.append({
        "Case": "Vuot kinh tuyen doi ngay (+179.99° va -179.99°)",
        "Description": f"El(+179.99°)={noaa_179.elevation_deg:.4f}°, El(-179.99°)={noaa_neg179.elevation_deg:.4f}°",
        "Pass": (abs(noaa_179.elevation_deg - noaa_neg179.elevation_deg) < 0.01)
    })

    # 6. Invalid inputs: month 13, day 32, hour 25, NaN, Inf
    inv_month = calculate_solar_position(2026, 13, 1, 12, 0, 0, tz, lat, lon)
    inv_day = calculate_solar_position(2026, 1, 32, 12, 0, 0, tz, lat, lon)
    inv_hour = calculate_solar_position(2026, 1, 1, 25, 0, 0, tz, lat, lon)
    inv_nan = calculate_solar_position(2026, 1, 1, 12, 0, 0, tz, float('nan'), lon)
    inv_inf = calculate_solar_position(2026, 1, 1, 12, 0, 0, tz, lat, float('inf'))
    all_invalid_safe = (
        not inv_month.is_daylight and not inv_day.is_daylight and
        not inv_hour.is_daylight and not inv_nan.is_daylight and not inv_inf.is_daylight
    )
    cases.append({
        "Case": "Du lieu dau vao khong hop le (m=13, d=32, h=25, NaN, Inf)",
        "Description": "Tat ca tra ve is_daylight=False an toan, khong throw exception / crash",
        "Pass": all_invalid_safe
    })

    df_cases = pd.DataFrame(cases)
    print(df_cases.to_string(index=False))
    return df_cases

def test_four_year_drift():
    print("\n" + "=" * 80)
    print("4. FOUR CONSECUTIVE YEARS DRIFT ANALYSIS (15/11 AT 12:00:00 FOR 2024-2027)")
    print("=" * 80)
    lat, lon, tz = 10.78310, 106.67210, 7.0

    years = [2024, 2025, 2026, 2027]
    drift_data = []

    for y in years:
        t_idx = pd.DatetimeIndex([pd.Timestamp(f'{y}-11-15 12:00:00', tz='Asia/Ho_Chi_Minh')])
        spa = pvlib.solarposition.spa_python(t_idx, lat, lon)
        noaa = calculate_solar_position(y, 11, 15, 12, 0, 0, tz, lat, lon, True)
        spencer = calculate_solar_position_spencer(y, 11, 15, 12, 0, 0, tz, lat, lon, True)

        pv_az = float(spa['azimuth'].iloc[0])
        pv_el = float(spa['apparent_elevation'].iloc[0])

        drift_data.append({
            "Nam": y,
            "Nam nhuan": is_leap_year(y),
            "pvlib Az (°)": round(pv_az, 4),
            "pvlib El (°)": round(pv_el, 4),
            "NOAA Az (°)": noaa.azimuth_deg,
            "NOAA El (°)": noaa.elevation_deg,
            "NOAA dAz (°)": round(angular_diff(noaa.azimuth_deg, pv_az), 4),
            "NOAA dEl (°)": round(abs(noaa.elevation_deg - pv_el), 4),
            "Spencer Az (°)": spencer.azimuth_deg,
            "Spencer El (°)": spencer.elevation_deg,
            "Spencer dAz (°)": round(angular_diff(spencer.azimuth_deg, pv_az), 4),
            "Spencer dEl (°)": round(abs(spencer.elevation_deg - pv_el), 4),
        })

    df_drift = pd.DataFrame(drift_data)
    print(df_drift.to_string(index=False))

    # Calculate year-over-year drift
    print("\nDo lech vi tri mat troi cung ngay/gio giua cac nam lien tiep (Solar drift due to leap cycle):")
    for i in range(1, len(drift_data)):
        y_prev = drift_data[i-1]["Nam"]
        y_curr = drift_data[i]["Nam"]
        d_az = angular_diff(drift_data[i]["NOAA Az (°)"], drift_data[i-1]["NOAA Az (°)"])
        d_el = abs(drift_data[i]["NOAA El (°)"] - drift_data[i-1]["NOAA El (°)"])
        print(f"  {y_curr} vs {y_prev}: Delta Azimuth = {d_az:.4f}°, Delta Elevation = {d_el:.4f}°")

    return df_drift

def export_test_vectors():
    print("\n" + "=" * 80)
    print("5. EXPORTING TEST VECTORS FILE FOR C++ UNIT VALIDATION")
    print("=" * 80)

    # We will pick a diverse set of 30 test vectors representing:
    # - Experimental target date 15/11/2026 throughout the day
    # - Solstices (Summer 21/06, Winter 21/12) and Equinoxes (21/03, 23/09)
    # - 4 locations (HCMC, Hanoi, Da Nang, Sydney)
    # - Leap year 29/02/2024
    # - Near-zenith pass
    test_cases = [
        # 1-6: 15/11/2026 at HCMC
        {"name": "HCMC_15Nov_0600", "y": 2026, "m": 11, "d": 15, "h": 6, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_15Nov_0800", "y": 2026, "m": 11, "d": 15, "h": 8, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_15Nov_0900", "y": 2026, "m": 11, "d": 15, "h": 9, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_15Nov_1200", "y": 2026, "m": 11, "d": 15, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_15Nov_1500", "y": 2026, "m": 11, "d": 15, "h": 15, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_15Nov_1730", "y": 2026, "m": 11, "d": 15, "h": 17, "min": 30, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        # 7-10: Solstices & Equinoxes HCMC
        {"name": "HCMC_SummerSolstice_1200", "y": 2026, "m": 6, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_WinterSolstice_1200", "y": 2026, "m": 12, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_SpringEquinox_1200", "y": 2026, "m": 3, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "HCMC_AutumnEquinox_1200", "y": 2026, "m": 9, "d": 23, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        # 11-13: Hanoi
        {"name": "Hanoi_15Nov_0900", "y": 2026, "m": 11, "d": 15, "h": 9, "min": 0, "s": 0, "tz": 7.0, "lat": 21.0285, "lon": 105.8542},
        {"name": "Hanoi_15Nov_1200", "y": 2026, "m": 11, "d": 15, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 21.0285, "lon": 105.8542},
        {"name": "Hanoi_SummerSolstice_1200", "y": 2026, "m": 6, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 21.0285, "lon": 105.8542},
        # 14-16: Da Nang
        {"name": "DaNang_15Nov_0900", "y": 2026, "m": 11, "d": 15, "h": 9, "min": 0, "s": 0, "tz": 7.0, "lat": 16.0544, "lon": 108.2022},
        {"name": "DaNang_15Nov_1200", "y": 2026, "m": 11, "d": 15, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 16.0544, "lon": 108.2022},
        {"name": "DaNang_SummerSolstice_1200", "y": 2026, "m": 6, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 16.0544, "lon": 108.2022},
        # 17-20: Sydney
        {"name": "Sydney_15Nov_0900", "y": 2026, "m": 11, "d": 15, "h": 9, "min": 0, "s": 0, "tz": 10.0, "lat": -33.8688, "lon": 151.2093},
        {"name": "Sydney_15Nov_1200", "y": 2026, "m": 11, "d": 15, "h": 12, "min": 0, "s": 0, "tz": 10.0, "lat": -33.8688, "lon": 151.2093},
        {"name": "Sydney_SummerSolstice_1200", "y": 2026, "m": 12, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 10.0, "lat": -33.8688, "lon": 151.2093},
        {"name": "Sydney_WinterSolstice_1200", "y": 2026, "m": 6, "d": 21, "h": 12, "min": 0, "s": 0, "tz": 10.0, "lat": -33.8688, "lon": 151.2093},
        # 21-23: Leap Day 29/02/2024
        {"name": "LeapDay_HCMC_0800", "y": 2024, "m": 2, "d": 29, "h": 8, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "LeapDay_HCMC_1200", "y": 2024, "m": 2, "d": 29, "h": 12, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        {"name": "LeapDay_HCMC_1600", "y": 2024, "m": 2, "d": 29, "h": 16, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        # 24: Near zenith HCMC
        {"name": "Zenith_HCMC_18Apr_1152", "y": 2026, "m": 4, "d": 18, "h": 11, "min": 52, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721},
        # 25: Midnight
        {"name": "Midnight_HCMC_0000", "y": 2026, "m": 11, "d": 15, "h": 0, "min": 0, "s": 0, "tz": 7.0, "lat": 10.7831, "lon": 106.6721}
    ]

    export_list = []
    for tc in test_cases:
        noaa = calculate_solar_position(tc["y"], tc["m"], tc["d"], tc["h"], tc["min"], tc["s"], tc["tz"], tc["lat"], tc["lon"], True)
        spencer = calculate_solar_position_spencer(tc["y"], tc["m"], tc["d"], tc["h"], tc["min"], tc["s"], tc["tz"], tc["lat"], tc["lon"], True)

        export_list.append({
            "name": tc["name"],
            "year": tc["y"],
            "month": tc["m"],
            "day": tc["d"],
            "hour": tc["h"],
            "minute": tc["min"],
            "second": tc["s"],
            "tz": tc["tz"],
            "lat": tc["lat"],
            "lon": tc["lon"],
            "noaa_az": noaa.azimuth_deg,
            "noaa_el": noaa.elevation_deg,
            "noaa_zenith": noaa.zenith_deg,
            "noaa_sunrise": noaa.sunrise_min,
            "noaa_sunset": noaa.sunset_min,
            "spencer_az": spencer.azimuth_deg,
            "spencer_el": spencer.elevation_deg,
            "spencer_zenith": spencer.zenith_deg,
            "spencer_sunrise": spencer.sunrise_min,
            "spencer_sunset": spencer.sunset_min,
        })

    out_file = "python_sim/test_vectors_phase1.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(export_list, f, indent=2)

    print(f"Exported {len(export_list)} test vectors to {out_file}")

if __name__ == "__main__":
    df_grid = run_grid_benchmark()
    df_noaa_tbl, df_spencer_tbl, df_loc_tbl = generate_error_tables(df_grid)
    df_cmp_tbl = test_point_comparison()
    df_cases_tbl = test_edge_cases()
    df_drift_tbl = test_four_year_drift()
    export_test_vectors()
    print("\n[PHASE 1 PYTHON BENCHMARK COMPLETE] ALL DATA GENERATED SUCCESSFULLY!")
