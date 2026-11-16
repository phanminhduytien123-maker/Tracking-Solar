import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))

base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

print("=== 1. Checking /solar/telemetry.json ===")
try:
    req = urllib.request.Request(f"{base_url}/solar/telemetry.json")
    with urllib.request.urlopen(req, timeout=10) as resp:
        telemetry = json.loads(resp.read().decode())
    print(json.dumps(telemetry, indent=2))
except Exception as e:
    print(f"Error fetching telemetry: {e}")

print("\n=== 2. Checking /solar.json shallow ===")
try:
    req = urllib.request.Request(f"{base_url}/solar.json?shallow=true")
    with urllib.request.urlopen(req, timeout=10) as resp:
        keys = json.loads(resp.read().decode())
    print("Keys in /solar:", keys)
except Exception as e:
    print(f"Error fetching /solar keys: {e}")

print("\n=== 3. Checking latest records in /solar/history.json ===")
try:
    # Query last 20 records
    req = urllib.request.Request(f'{base_url}/solar/history.json?orderBy="$key"&limitToLast=20')
    with urllib.request.urlopen(req, timeout=10) as resp:
        history = json.loads(resp.read().decode())
    
    sorted_keys = sorted(history.keys(), key=lambda x: int(x))
    print(f"Found {len(sorted_keys)} history records in limitToLast=20:")
    for k in sorted_keys:
        dt = datetime.fromtimestamp(int(k), tz).strftime('%Y-%m-%d %H:%M:%S')
        rec = history[k]
        print(f"Key: {k} ({dt}) -> {rec}")
except Exception as e:
    print(f"Error fetching history: {e}")

print("\n=== 4. Checking today's records (14/11/2026) around 14:00 - 19:30 ===")
try:
    t_1400 = int(datetime(2026, 11, 14, 14, 0, 0, tzinfo=tz).timestamp())
    t_1930 = int(datetime(2026, 11, 14, 19, 30, 0, tzinfo=tz).timestamp())
    req = urllib.request.Request(f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_1400}"&endAt="{t_1930}"')
    with urllib.request.urlopen(req, timeout=10) as resp:
        today_data = json.loads(resp.read().decode())
    print(f"Records between 14:00 and 19:30 today: {len(today_data) if today_data else 0}")
    if today_data:
        sorted_today = sorted(today_data.keys(), key=lambda x: int(x))
        print("First record:", datetime.fromtimestamp(int(sorted_today[0]), tz).strftime('%H:%M:%S'), today_data[sorted_today[0]])
        print("Last record:", datetime.fromtimestamp(int(sorted_today[-1]), tz).strftime('%H:%M:%S'), today_data[sorted_today[-1]])
except Exception as e:
    print(f"Error fetching today range: {e}")

