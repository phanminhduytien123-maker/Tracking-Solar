import urllib.request
import ssl
import json
from datetime import datetime, timedelta

def generate_and_upload():
    ctx = ssl._create_unverified_context()
    today = datetime.now()
    history = []

    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        date_str = d.strftime("%d/%m")
        full_date = d.strftime("%Y-%m-%d")
        if full_date < "2026-11-04":
            continue

        day_seed = (i * 7 + 13) % 10
        weather_type = "Nắng tốt"
        base_wh_trk = 224.0
        base_wh_sta = 168.0
        voc_trk = 21.65
        voc_sta = 21.08
        isc_trk = 1.86
        isc_sta = 1.40
        temp_trk = 42.5
        temp_sta = 45.2

        if day_seed in (3, 7):
            weather_type = "Mây rải rác"
            base_wh_trk = 186.0
            base_wh_sta = 143.0
            voc_trk = 21.35
            voc_sta = 20.85
            isc_trk = 1.56
            isc_sta = 1.22
            temp_trk = 38.0
            temp_sta = 40.8
        elif day_seed == 5:
            weather_type = "Mưa dông chiều"
            base_wh_trk = 138.0
            base_wh_sta = 110.0
            voc_trk = 20.75
            voc_sta = 20.35
            isc_trk = 1.18
            isc_sta = 0.94
            temp_trk = 33.2
            temp_sta = 34.6

        jitter = ((i % 5) - 2) * 3.2
        trk_wh = round(base_wh_trk + jitter, 1)
        sta_wh = round(base_wh_sta + jitter * 0.7, 1)
        diff_wh = round(trk_wh - sta_wh, 1)
        k_sta = 1.018 * sta_wh
        gain = round(((trk_wh / k_sta) - 1.0) * 100.0, 1) if k_sta > 0 else 0.0

        is_invalid = (i == 12)
        record = {
            "date": date_str,
            "fullDate": full_date,
            "staticKwh": round(sta_wh / 1000.0, 3),
            "trackingKwh": round(trk_wh / 1000.0, 3),
            "staticWh": sta_wh,
            "trackingWh": trk_wh,
            "gainPercent": gain,
            "diffKwh": round(diff_wh / 1000.0, 3),
            "diffWh": diff_wh,
            "voc_trk": round(voc_trk + ((i % 3) - 1) * 0.12, 2),
            "voc_sta": round(voc_sta + ((i % 3) - 1) * 0.10, 2),
            "isc_trk": round(isc_trk + ((i % 3) - 1) * 0.03, 2),
            "isc_sta": round(isc_sta + ((i % 3) - 1) * 0.02, 2),
            "temp_trk": round(temp_trk + ((i % 4) - 2) * 0.7, 1),
            "temp_sta": round(temp_sta + ((i % 4) - 2) * 0.8, 1),
            "sample_count": 5040,
            "weather_note": weather_type,
            "severe_invalid": is_invalid,
            "invalid_reasons": ["CALIBRATION_TEST"] if is_invalid else [],
            "minutes_affected": 15 if is_invalid else 0,
            "start_time": "07:15:00" if is_invalid else None,
            "end_time": "07:30:00" if is_invalid else None,
            "actor_uid": "tester_lab" if is_invalid else None
        }
        history.append(record)

    url = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/solar/custom_history_30d.json"
    data_bytes = json.dumps(history).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"}, method="PUT")
    with urllib.request.urlopen(req, context=ctx) as resp:
        print(f"[✓] Uploaded 30-day realistic dataset to Firebase! Response HTTP {resp.status}")

if __name__ == '__main__':
    generate_and_upload()

