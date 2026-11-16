import urllib.request
import json
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

print("=== Check /solar/voc_isc_node ===")
req = urllib.request.Request(f"{base_url}/solar/voc_isc_node.json")
with urllib.request.urlopen(req) as resp:
    voc = json.loads(resp.read().decode())
print("ESP32 #2 (voc_isc_node):")
print(f"  updated_at: {voc.get('updated_at')} -> {datetime.fromtimestamp(voc.get('updated_at')/1000, tz) if voc.get('updated_at') else None}")
print(f"  cycles_count: {voc.get('cycles_count')}")
print(f"  ip: {voc.get('ip')}")
print(f"  is_sleeping: {voc.get('is_sleeping')}")
print(f"  raw_isc_sta_mv: {voc.get('raw_isc_sta_mv')}")

print("\n=== Check /solar/tracking ===")
req = urllib.request.Request(f"{base_url}/solar/tracking.json")
with urllib.request.urlopen(req) as resp:
    trk = json.loads(resp.read().decode())
print("ESP32 #1 (tracking):")
print(f"  lastUpdate: {trk.get('lastUpdate')} -> {datetime.fromtimestamp(trk.get('lastUpdate')/1000, tz) if trk.get('lastUpdate') else None}")
print(f"  rtcTime: {trk.get('rtcTime')}")
print(f"  state: {trk.get('state')}")
print(f"  displayState: {trk.get('displayState')}")
print(f"  voltage: {trk.get('voltage')}")
print(f"  uptime_s: {trk.get('uptime_s')}")

