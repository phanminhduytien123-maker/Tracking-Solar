import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))

url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/solar/history.json?shallow=true'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    keys = json.loads(resp.read().decode())

keys_int = sorted([int(k) for k in keys if k.isdigit()])
t_05 = int(datetime(2026, 11, 13, 5, 0, 0, tzinfo=tz).timestamp())
t_23 = int(datetime(2026, 11, 13, 23, 59, 59, tzinfo=tz).timestamp())

today_keys = [k for k in keys_int if t_05 <= k <= t_23]
syn_keys = [k for k in today_keys if k % 60 == 0]
real_keys = [k for k in today_keys if k % 60 != 0]

print(f"Total keys today (13/11): {len(today_keys)}")
print(f"Synthetic keys (k % 60 == 0): {len(syn_keys)}")
print(f"Real keys (k % 60 != 0): {len(real_keys)}")

# Let's inspect the ranges of synthetic keys
if syn_keys:
    print(f"First syn key: {syn_keys[0]} -> {datetime.fromtimestamp(syn_keys[0], tz).strftime('%H:%M:%S')}")
    print(f"Last syn key: {syn_keys[-1]} -> {datetime.fromtimestamp(syn_keys[-1], tz).strftime('%H:%M:%S')}")

    # Group consecutive synthetic keys
    ranges = []
    start = syn_keys[0]
    prev = syn_keys[0]
    for k in syn_keys[1:]:
        if k == prev + 60:
            prev = k
        else:
            ranges.append((start, prev, (prev - start)//60 + 1))
            start = k
            prev = k
    ranges.append((start, prev, (prev - start)//60 + 1))

    print("\nSynthetic key intervals:")
    for s, e, count in ranges:
        dt_s = datetime.fromtimestamp(s, tz).strftime('%H:%M:%S')
        dt_e = datetime.fromtimestamp(e, tz).strftime('%H:%M:%S')
        print(f"  {dt_s} ({s}) -> {dt_e} ({e}): {count} records")

print("\nReal key intervals:")
if real_keys:
    print(f"First real key: {real_keys[0]} -> {datetime.fromtimestamp(real_keys[0], tz).strftime('%H:%M:%S')}")
    print(f"Last real key: {real_keys[-1]} -> {datetime.fromtimestamp(real_keys[-1], tz).strftime('%H:%M:%S')}")
