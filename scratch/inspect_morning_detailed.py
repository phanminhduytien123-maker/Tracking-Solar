import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
t_0500 = int(datetime(2026, 11, 15, 5, 0, 0, tzinfo=tz).timestamp())
t_0700 = int(datetime(2026, 11, 15, 7, 0, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_0500}"&endAt="{t_0700}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read().decode())

print(f"Total records between 05:00 and 07:00: {len(data)}")
for k in sorted(data.keys(), key=lambda x: int(x)):
    dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
    rec = data[k]
    print(f'{dt} | fsm={rec.get("fsm_state")} | v_trk={rec.get("v_trk")} | i_trk={rec.get("i_trk")}')

