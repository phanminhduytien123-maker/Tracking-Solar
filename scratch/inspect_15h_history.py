import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

t_start = int(datetime(2026, 11, 14, 14, 30, 0, tzinfo=tz).timestamp())
t_end = int(datetime(2026, 11, 14, 16, 0, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_start}"&endAt="{t_end}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

sorted_keys = sorted(data.keys(), key=lambda x: int(x))
print(f"Total history records between 14:30 and 16:00: {len(sorted_keys)}")
for k in sorted_keys:
    dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
    v = data[k]
    print(f"{dt} (ts={k}) | fsm={v.get('fsm_state')} | v_trk={v.get('v_trk')} | i_trk={v.get('i_trk')} | p_trk={v.get('p_trk')} | rtc_temp={v.get('rtc_temp')} | flags={v.get('flags')}")

