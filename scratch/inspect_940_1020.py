import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
t_0940 = int(datetime(2026, 11, 15, 9, 40, 0, tzinfo=tz).timestamp())
t_1020 = int(datetime(2026, 11, 15, 10, 20, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_0940}"&endAt="{t_1020}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read().decode())

print(f"Total records between 09:40 and 10:20: {len(data)}")
for k in sorted(data.keys(), key=lambda x: int(x)):
    dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
    rec = data[k]
    print(f'{dt} | fsm={rec.get("fsm_state")} | v_trk={rec.get("v_trk")} | i_trk={rec.get("i_trk")} | p_trk={rec.get("p_trk")}')

