import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

nodes = ['tracking', 'control', 'config', 'voc_isc_node', 'ota', 'static']

for node in nodes:
    print(f"\n================ Node: /solar/{node} ================")
    try:
        req = urllib.request.Request(f"{base_url}/solar/{node}.json")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error reading /solar/{node}: {e}")

