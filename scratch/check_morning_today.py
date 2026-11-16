import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

print("=== 1. Checking /solar/tracking.json ===")
try:
    req = urllib.request.Request(f"{base_url}/solar/tracking.json")
    with urllib.request.urlopen(req, timeout=10) as resp:
        trk = json.loads(resp.read().decode())
    print("ESP1 (tracking):")
    for k in sorted(trk.keys()):
        print(f"  {k}: {trk[k]}")
except Exception as e:
    print(f"Error fetching tracking: {e}")

print("\n=== 2. Checking /solar/voc_isc_node.json ===")
try:
    req = urllib.request.Request(f"{base_url}/solar/voc_isc_node.json")
    with urllib.request.urlopen(req, timeout=10) as resp:
        voc = json.loads(resp.read().decode())
    print("ESP2 (voc_isc_node):")
    for k in sorted(voc.keys()):
        print(f"  {k}: {voc[k]}")
except Exception as e:
    print(f"Error fetching voc_isc_node: {e}")

print("\n=== 3. Checking today's records (15/11/2026) in /solar/history ===")
try:
    t_0400 = int(datetime(2026, 11, 15, 4, 0, 0, tzinfo=tz).timestamp())
    t_1100 = int(datetime(2026, 11, 15, 11, 0, 0, tzinfo=tz).timestamp())
    req = urllib.request.Request(f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_0400}"&endAt="{t_1100}"')
    with urllib.request.urlopen(req, timeout=15) as resp:
        history = json.loads(resp.read().decode())
    print(f"Found {len(history) if history else 0} history records today:")
    if history:
        sorted_keys = sorted(history.keys(), key=lambda x: int(x))
        print("First record:", datetime.fromtimestamp(int(sorted_keys[0]), tz).strftime('%H:%M:%S'), history[sorted_keys[0]])
        print("Last record:", datetime.fromtimestamp(int(sorted_keys[-1]), tz).strftime('%H:%M:%S'), history[sorted_keys[-1]])
        print("\nSampling records across the morning:")
        for k in sorted_keys[::15]:
            dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
            rec = history[k]
            print(f"  {dt} | p_trk={rec.get('p_trk')} | p_sta={rec.get('p_sta')} | fsm={rec.get('fsm_state')}")
except Exception as e:
    print(f"Error fetching history: {e}")

