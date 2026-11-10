import urllib.request
import json
import time
import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8')
base = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

url = base + '/solar/history.json?orderBy="$key"&limitToLast=20'
try:
    req = urllib.request.urlopen(url, timeout=15)
    data = json.loads(req.read().decode('utf-8'))
    print('Last history records count:', len(data) if data else 0)
    if data:
        for k in sorted(data.keys()):
            rec = data[k]
            ts = rec.get('epoch_ts', int(k) if k.isdigit() else 0)
            dt_str = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S') if ts > 0 else 'N/A'
            print(f"[{k}] {dt_str} | wh_trk: {rec.get('wh_trk')} | p_trk: {rec.get('p_trk')} | v_trk: {rec.get('v_trk')} | i_trk: {rec.get('i_trk')}")
except Exception as e:
    print('Error:', e)

