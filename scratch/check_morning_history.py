import urllib.request
import json

base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

try:
    req = urllib.request.urlopen(f'{base_url}/solar/history.json?shallow=true')
    keys = json.loads(req.read().decode('utf-8'))
    print(f"Total keys: {len(keys)}")
    sorted_keys = sorted(keys.keys())
    print("Latest 20 keys:", sorted_keys[-20:])
    for k in sorted_keys[-15:]:
        r = urllib.request.urlopen(f'{base_url}/solar/history/{k}.json')
        item = json.loads(r.read().decode('utf-8'))
        print(k, "->", item)
except Exception as e:
    print('Error:', e)
