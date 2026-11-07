import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

try:
    req = urllib.request.urlopen(f'{base_url}/solar/tracking.json')
    d = json.loads(req.read().decode('utf-8'))
    age = time.time() - d.get('data_ts', 0)
    print("=== LIVE ESP32 TELEMETRY POST-OTA ===")
    print(f"RTC Time        : {d.get('rtcTime')}")
    print(f"Data Age        : {age:.1f}s ago")
    print(f"Online          : {d.get('online')}")
    print(f"State / Status  : {d.get('state')} / {d.get('status')}")
    print(f"Display State   : {d.get('displayState')}")
    print(f"Phi (Azimuth)   : {d.get('phi')} deg (Target: {d.get('targetPhi')} deg)")
    print(f"Eps (Elevation) : {d.get('epsilon')} deg (Target: {d.get('targetEpsilon')} deg)")
    print(f"Hold Remain Sec : {d.get('holdRemainSec')}s")
    print(f"Power / Current : {d.get('power')}W / {d.get('current')}A")
    print("=====================================")
except Exception as e:
    print("Error:", e)
