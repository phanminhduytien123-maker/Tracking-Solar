import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))

t_1220 = int(datetime(2026, 11, 13, 12, 20, 0, tzinfo=tz).timestamp())
t_1305 = int(datetime(2026, 11, 13, 13, 5, 0, tzinfo=tz).timestamp())

url = f'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/solar/history.json?orderBy="$key"&startAt="{t_1220}"&endAt="{t_1305}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

print(f"Fetched {len(data)} records")
real = {k: v for k, v in data.items() if int(k) % 60 != 0}
print(f"Real records: {len(real)}")
for k in sorted(real.keys(), key=lambda x: int(x))[::3]:
    dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
    v = real[k]
    print(f"{dt} | P_trk: {v.get('p_trk')} W | P_sta: {v.get('p_sta')} W | V_trk: {v.get('v_trk')} V | V_sta: {v.get('v_sta')} V")
