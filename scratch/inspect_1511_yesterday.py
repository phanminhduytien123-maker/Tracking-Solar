import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

t_1500 = int(datetime(2026, 11, 14, 15, 0, 0, tzinfo=tz).timestamp())
t_1520 = int(datetime(2026, 11, 14, 15, 20, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_1500}"&endAt="{t_1520}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read().decode())

print(f"Records around 15:11 yesterday: {len(data) if data else 0}")
if data:
    for k in sorted(data.keys(), key=lambda x: int(x)):
        dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
        rec = data[k]
        print(f'{dt} | fsm={rec.get("fsm_state")} | p_trk={rec.get("p_trk")} | v_trk={rec.get("v_trk")}')

