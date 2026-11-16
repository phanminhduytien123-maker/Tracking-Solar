import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))

t_1300 = int(datetime(2026, 11, 13, 13, 0, 0, tzinfo=tz).timestamp())
t_2300 = int(datetime(2026, 11, 13, 23, 0, 0, tzinfo=tz).timestamp())

url = f'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/solar/history.json?orderBy="$key"&startAt="{t_1300}"&endAt="{t_2300}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

print(f"Total records after 13:00: {len(data)}")
real = {k: v for k, v in data.items() if int(k) % 60 != 0}
syn = {k: v for k, v in data.items() if int(k) % 60 == 0}
print(f"Real records after 13:00: {len(real)}")
print(f"Synthetic records after 13:00: {len(syn)}")
for k in sorted(real.keys(), key=lambda x: int(x)):
    dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
    v = real[k]
    print(f"Real: {dt} ({k}) -> P_trk={v.get('p_trk')}W, P_sta={v.get('p_sta')}W")
