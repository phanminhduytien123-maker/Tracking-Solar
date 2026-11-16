import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

t_1915 = int(datetime(2026, 11, 14, 19, 15, 0, tzinfo=tz).timestamp())
t_1925 = int(datetime(2026, 11, 14, 19, 25, 0, tzinfo=tz).timestamp())

url = f'{base_url}/solar/history.json?orderBy="$key"&startAt="{t_1915}"&endAt="{t_1925}"'
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read().decode())

print(f"Records around 19:18 yesterday: {len(data) if data else 0}")
if data:
    for k in sorted(data.keys(), key=lambda x: int(x)):
        dt = datetime.fromtimestamp(int(k), tz).strftime('%H:%M:%S')
        rec = data[k]
        print(f'{dt} | {rec}')

