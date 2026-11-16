import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

# Let's inspect history on 14/11/2026 (yesterday)
t_14_start = int(datetime(2026, 11, 14, 5, 0, 0, tzinfo=tz).timestamp())
t_14_end = int(datetime(2026, 11, 14, 22, 0, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_14_start}"&endAt="{t_14_end}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    data_14 = json.loads(resp.read().decode())

print(f"Total history records yesterday (14/11): {len(data_14) if data_14 else 0}")
if data_14:
    keys = sorted(data_14.keys(), key=lambda x: int(x))
    first_dt = datetime.fromtimestamp(int(keys[0]), tz).strftime('%H:%M:%S')
    last_dt = datetime.fromtimestamp(int(keys[-1]), tz).strftime('%H:%M:%S')
    print(f"Yesterday 14/11 ran from {first_dt} to {last_dt}")
    
    # Check for gaps > 2 minutes
    prev_t = int(keys[0])
    gaps = []
    for k in keys[1:]:
        curr_t = int(k)
        diff = curr_t - prev_t
        if diff > 180: # > 3 minutes gap
            dt1 = datetime.fromtimestamp(prev_t, tz).strftime('%H:%M:%S')
            dt2 = datetime.fromtimestamp(curr_t, tz).strftime('%H:%M:%S')
            gaps.append((dt1, dt2, diff))
        prev_t = curr_t
    print(f"Yesterday had {len(gaps)} gaps > 3 min:")
    for g in gaps[:10]:
        print(f"   Gap from {g[0]} to {g[1]} ({g[2]}s)")

# Let's inspect history today 15/11/2026
t_15_start = int(datetime(2026, 11, 15, 4, 0, 0, tzinfo=tz).timestamp())
t_15_end = int(datetime(2026, 11, 15, 11, 30, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_15_start}"&endAt="{t_15_end}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    data_15 = json.loads(resp.read().decode())

print(f"\nTotal history records today (15/11): {len(data_15) if data_15 else 0}")
if data_15:
    keys = sorted(data_15.keys(), key=lambda x: int(x))
    first_dt = datetime.fromtimestamp(int(keys[0]), tz).strftime('%H:%M:%S')
    last_dt = datetime.fromtimestamp(int(keys[-1]), tz).strftime('%H:%M:%S')
    print(f"Today 15/11 ran from {first_dt} to {last_dt}")
    
    prev_t = int(keys[0])
    gaps = []
    for k in keys[1:]:
        curr_t = int(k)
        diff = curr_t - prev_t
        if diff > 180:
            dt1 = datetime.fromtimestamp(prev_t, tz).strftime('%H:%M:%S')
            dt2 = datetime.fromtimestamp(curr_t, tz).strftime('%H:%M:%S')
            gaps.append((dt1, dt2, diff))
        prev_t = curr_t
    print(f"Today had {len(gaps)} gaps > 3 min:")
    for g in gaps:
        print(f"   Gap from {g[0]} to {g[1]} ({g[2]}s)")

