import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

t_0930 = int(datetime(2026, 11, 15, 9, 30, 0, tzinfo=tz).timestamp())
t_1035 = int(datetime(2026, 11, 15, 10, 35, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_0930}"&endAt="{t_1035}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

sorted_keys = sorted(data.keys(), key=lambda x: int(x))
print(f"Total history records between 09:30 and 10:35: {len(sorted_keys)}")
for k in sorted_keys:
    dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
    v = data[k]
    print(f"{dt} (ts={k}) | fsm={v.get('fsm_state')} | v_trk={v.get('v_trk')} | i_trk={v.get('i_trk')} | p_trk={v.get('p_trk')} | rtc_temp={v.get('rtc_temp')} | flags={v.get('flags')}")

