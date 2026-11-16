import urllib.request
import json
import time
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

local_fota_url = "http://192.168.1.14:8080/firmware.bin"

ota_payload = {
    "url": local_fota_url,
    "target_version": "v2.1.9",
    "trigger": True,
    "status": "TRIGGERED",
    "progress": 0,
    "error": ""
}

print(f"Setting /solar/ota on Firebase to LAN URL: {local_fota_url}...")
req = urllib.request.Request(
    f"{base_url}/solar/ota.json",
    data=json.dumps(ota_payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PUT'
)
with urllib.request.urlopen(req, timeout=10) as resp:
    print("✓ Trigger written to Firebase!")

print("\nMonitoring LAN FOTA progress (checking every 3s)...")
for i in range(30):
    time.sleep(3)
    try:
        req = urllib.request.Request(f"{base_url}/solar/ota.json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            ota_info = json.loads(resp.read().decode())
        
        req2 = urllib.request.Request(f"{base_url}/solar/tracking.json")
        with urllib.request.urlopen(req2, timeout=5) as resp2:
            trk_info = json.loads(resp2.read().decode())

        status = ota_info.get("status")
        progress = ota_info.get("progress")
        current_ver = trk_info.get("firmware_version")
        uptime = trk_info.get("uptime_s")
        dt = datetime.now(tz).strftime('%H:%M:%S')

        print(f"[{dt}] OTA Status: {status} ({progress}%) | Tracker Version: {current_ver} (uptime: {uptime}s)")

        if current_ver == "2.1.9" and uptime < 120:
            print("\n🎉🎉🎉 LAN FOTA UPGRADE TO v2.1.9 COMPLETED SUCCESSFULLY! 🎉🎉🎉")
            break
        if status == "FAILED":
            print(f"\n❌ FOTA FAILED: {ota_info.get('error')}")
            break
    except Exception as e:
        print(f"Polling warning: {e}")

