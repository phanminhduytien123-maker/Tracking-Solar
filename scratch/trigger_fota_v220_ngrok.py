import urllib.request
import json
import time
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

# Direct high-speed tunnel URL
fota_url = "https://unaddressed-unruffled-kerrie.ngrok-free.dev/firmware.bin"

ota_payload = {
    "url": fota_url,
    "target_version": "v2.2.0",
    "trigger": True,
    "status": "TRIGGERED",
    "progress": 0,
    "error": ""
}

print(f"Setting /solar/ota on Firebase to FOTA URL: {fota_url}...")
req = urllib.request.Request(
    f"{base_url}/solar/ota.json",
    data=json.dumps(ota_payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PUT'
)
with urllib.request.urlopen(req, timeout=10) as resp:
    print("✓ Trigger written to Firebase successfully!")

print("\nMonitoring FOTA progress (checking every 2-3s)...")
success = False
for i in range(45):
    time.sleep(2.5)
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

        if current_ver == "2.2.0" and uptime < 180:
            print("\n" + "="*60)
            print("🎉🎉🎉 FOTA UPGRADE TO v2.2.0 COMPLETED SUCCESSFULLY! 🎉🎉🎉")
            print(f"Firmware Version: {current_ver} | Uptime: {uptime}s | State: {trk_info.get('state')}")
            print("="*60)
            success = True
            break
        if status == "FAILED":
            print(f"\n❌ FOTA FAILED: {ota_info.get('error')}")
            break
    except Exception as e:
        print(f"Polling warning: {e}")

if not success and current_ver != "2.2.0":
    print("\n⚠️ FOTA script ended. Current status will be re-verified.")

