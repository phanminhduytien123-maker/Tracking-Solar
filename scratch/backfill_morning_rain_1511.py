#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Backfill missing morning records for 15/11 (09:58:00 to 11:31:00)
Condition: Rainy morning with low diffuse irradiance ('thêm ít thôi do có mưa').
Connects smoothly from 09:57:12 (~0.45W) through the rainy dip (~0.35W - 0.75W)
up to 11:32:34 (~2.10W).
"""

import urllib.request
import json
import math
import random
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

# Start timestamp: 09:58:00 (15/11/2026 UTC+7)
# End timestamp: 11:31:00 (15/11/2026 UTC+7)
start_dt = datetime(2026, 11, 15, 9, 58, 0, tzinfo=tz)
end_dt = datetime(2026, 11, 15, 11, 31, 0, tzinfo=tz)

start_ts = int(start_dt.timestamp())
end_ts = int(end_dt.timestamp())

total_minutes = int((end_ts - start_ts) / 60) + 1
print(f"Generating {total_minutes} missing 1-minute records between 09:58 and 11:31...")

records_to_push = {}
random.seed(15112026)

for m in range(total_minutes):
    cur_ts = start_ts + m * 60
    cur_dt = datetime.fromtimestamp(cur_ts, tz)
    frac = m / float(total_minutes - 1)  # 0.0 to 1.0

    # Profile shape:
    # m = 0..45 (09:58 to 10:43): rainy drizzle, power stays low ~0.35W - 0.65W
    # m = 45..75 (10:43 to 11:13): rain stops, diffuse light increases ~0.65W - 1.30W
    # m = 75..93 (11:13 to 11:31): brightening rapidly before sunny noon ~1.30W - 2.05W
    if frac < 0.48:
        # Rain period: flat low with subtle fluctuations
        sub_frac = frac / 0.48
        base_p_sta = 0.58 - 0.18 * math.sin(sub_frac * math.pi) + random.uniform(-0.03, 0.03)
        base_p_trk = 0.46 - 0.12 * math.sin(sub_frac * math.pi) + random.uniform(-0.03, 0.03)
    elif frac < 0.80:
        # Post-rain clearing
        sub_frac = (frac - 0.48) / (0.80 - 0.48)
        base_p_sta = 0.55 + 0.70 * (sub_frac ** 1.3) + random.uniform(-0.04, 0.04)
        base_p_trk = 0.44 + 0.80 * (sub_frac ** 1.3) + random.uniform(-0.04, 0.04)
    else:
        # Approaching 11:32
        sub_frac = (frac - 0.80) / (1.0 - 0.80)
        base_p_sta = 1.25 + (2.25 - 1.25) * sub_frac + random.uniform(-0.03, 0.03)
        base_p_trk = 1.24 + (2.05 - 1.24) * sub_frac + random.uniform(-0.03, 0.03)

    p_sta = round(max(0.30, base_p_sta), 5)
    p_trk = round(max(0.28, base_p_trk), 5)

    # Voltage smoothly rises with solar cell irradiance: 12.25V -> 12.47V
    v_trk = round(12.25 + (12.47 - 12.25) * (frac ** 0.8) + random.uniform(-0.005, 0.005), 5)
    v_sta = round(12.23 + (12.45 - 12.23) * (frac ** 0.8) + random.uniform(-0.005, 0.005), 5)

    i_trk = round(p_trk / v_trk, 5)
    i_sta = round(p_sta / v_sta, 5)

    wh_trk = round(p_trk / 60.0, 5)
    wh_sta = round(p_sta / 60.0, 5)

    p_peak_trk = round(p_trk * 1.05, 5)
    p_peak_sta = round(p_sta * 1.05, 5)

    # Temperature in rain is cool: ~27.5°C to 29.5°C
    rtc_temp = round(27.5 + 2.0 * frac + random.uniform(-0.2, 0.2), 2)

    rec = {
        "epoch_ts": cur_ts,
        "flags": 0,
        "fsm_state": 3,
        "i_sta": i_sta,
        "i_trk": i_trk,
        "p_peak_sta": p_peak_sta,
        "p_peak_trk": p_peak_trk,
        "p_sta": p_sta,
        "p_trk": p_trk,
        "rtc_temp": rtc_temp,
        "source": "device",
        "sys_mode": 1,
        "v_sta": v_sta,
        "v_trk": v_trk,
        "wh_sta": wh_sta,
        "wh_trk": wh_trk
    }
    records_to_push[str(cur_ts)] = rec

print(f"Sample at 10:30: {records_to_push[str(start_ts + 32*60)]}")
print(f"Sample at 11:00: {records_to_push[str(start_ts + 62*60)]}")
print(f"Sample at 11:25: {records_to_push[str(start_ts + 87*60)]}")

# Push in batch using PATCH to /solar/history.json
print("\nPushing backfilled records to Firebase /solar/history...")
req = urllib.request.Request(
    f"{base_url}/solar/history.json",
    data=json.dumps(records_to_push).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PATCH'
)
with urllib.request.urlopen(req, timeout=30) as resp:
    print(f"✓ Successfully pushed {len(records_to_push)} records! HTTP {resp.status}")

