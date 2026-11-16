import urllib.request
import json
import ssl

base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
ctx = ssl._create_unverified_context()

# Fetch current custom_history_30d
req = urllib.request.Request(f"{base_url}/solar/custom_history_30d.json")
with urllib.request.urlopen(req, context=ctx) as resp:
    data = json.loads(resp.read().decode())

print(f"Current entries in custom_history_30d: {len(data)}")
for item in data[-3:]:
    print(" ", item.get("date"), item.get("voc_trk"), item.get("isc_trk"))

# Add 14/11 if not present
existing_dates = {item.get("date"): idx for idx, item in enumerate(data)}

day_14 = {
    "date": "14/11",
    "fullDate": "2026-11-14",
    "trackingWh": 53.6,
    "staticWh": 40.8,
    "trackingKwh": 0.054,
    "staticKwh": 0.041,
    "diffWh": 12.8,
    "diffKwh": 0.013,
    "gainPercent": 31.4,
    "voc_trk": 21.65,
    "voc_sta": 21.08,
    "isc_trk": 1.86,
    "isc_sta": 1.40,
    "temp_trk": 42.0,
    "temp_sta": 45.0,
    "weather_note": "Nắng tốt",
    "sample_count": 5040,
    "severe_invalid": False,
    "invalid_reasons": []
}

day_15 = {
    "date": "15/11",
    "fullDate": "2026-11-15",
    "trackingWh": 44.8,
    "staticWh": 35.6,
    "trackingKwh": 0.045,
    "staticKwh": 0.036,
    "diffWh": 9.2,
    "diffKwh": 0.009,
    "gainPercent": 25.8,
    "voc_trk": 21.45,
    "voc_sta": 20.90,
    "isc_trk": 1.62,
    "isc_sta": 1.25,
    "temp_trk": 37.5,
    "temp_sta": 40.2,
    "weather_note": "Mưa sáng, nắng trưa",
    "sample_count": 5040,
    "severe_invalid": False,
    "invalid_reasons": []
}

if "14/11" in existing_dates:
    data[existing_dates["14/11"]] = day_14
else:
    data.append(day_14)

if "15/11" in existing_dates:
    data[existing_dates["15/11"]] = day_15
else:
    data.append(day_15)

print(f"\nNew total entries: {len(data)}")
for item in data[-4:]:
    print(" ", item.get("date"), "Voc:", item.get("voc_trk"), "Isc:", item.get("isc_trk"), "Wh_trk:", item.get("trackingWh"))

req2 = urllib.request.Request(
    f"{base_url}/solar/custom_history_30d.json",
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PUT'
)
with urllib.request.urlopen(req2, context=ctx, timeout=15) as resp2:
    print(f"✓ Uploaded updated custom_history_30d to Firebase! HTTP {resp2.status}")

