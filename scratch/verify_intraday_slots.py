import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))

# Fetch all records for today
t_05 = int(datetime(2026, 11, 13, 5, 0, 0, tzinfo=tz).timestamp())
t_23 = int(datetime(2026, 11, 13, 23, 59, 59, tzinfo=tz).timestamp())

url = f'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/solar/history.json?orderBy="$key"&startAt="{t_05}"&endAt="{t_23}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

slots = {}
for k, rec in data.items():
    ts = rec.get("epoch_ts") or int(k)
    dt = datetime.fromtimestamp(ts, tz)
    h = dt.hour
    m = dt.minute
    if 5 <= h <= 19:
        slot_str = f"{h:02d}:{('00' if m < 30 else '30')}"
        p_trk = float(rec.get("p_trk", 0))
        p_sta = float(rec.get("p_sta", 0))
        if p_trk > 50: p_trk /= 37.0
        if p_sta > 50: p_sta /= 37.0
        slots[slot_str] = {
            "pTracking": round(p_trk, 1),
            "pStatic": round(p_sta, 1)
        }

print("Intraday slots for 13/11:")
profile = []
h = 5.0
while h <= 19.0:
    slot_str = f"{int(h):02d}:{('00' if h % 1 == 0 else '30')}"
    if slot_str in slots:
        val = slots[slot_str]
        print(f"  {slot_str} -> P_trk: {val['pTracking']:4.1f} W | P_sta: {val['pStatic']:4.1f} W")
    else:
        print(f"  {slot_str} -> (No data / 0.0 W) [Future]")
    h += 0.5
