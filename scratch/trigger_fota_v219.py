import urllib.request
import uuid
import os
import json
import time
from datetime import datetime, timezone, timedelta

tz = timezone(timedelta(hours=7))
base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

bin_path = r'C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin'
file_size = os.path.getsize(bin_path)
print(f"Reading {bin_path} ({file_size:,} bytes)...")

with open(bin_path, 'rb') as f:
    bin_data = f.read()

boundary = uuid.uuid4().hex
headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}

part1 = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="reqtype"\r\n\r\n'
    f'fileupload\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="fileToUpload"; filename="firmware_v219.bin"\r\n'
    f'Content-Type: application/octet-stream\r\n\r\n'
).encode('utf-8')

part2 = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = part1 + bin_data + part2

print("Uploading firmware_v219.bin to Catbox CDN...")
req = urllib.request.Request('https://catbox.moe/user/api.php', data=body, headers=headers)
with urllib.request.urlopen(req, timeout=90) as resp:
    fota_url = resp.read().decode('utf-8').strip()

print(f"✓ Uploaded successfully! Cloud URL: {fota_url}")

ota_payload = {
    "url": fota_url,
    "target_version": "v2.1.9",
    "trigger": True,
    "status": "TRIGGERED",
    "progress": 0,
    "error": ""
}

print("Setting /solar/ota on Firebase to TRIGGER update...")
req = urllib.request.Request(
    f"{base_url}/solar/ota.json",
    data=json.dumps(ota_payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PUT'
)
with urllib.request.urlopen(req, timeout=10) as resp:
    print("✓ Trigger written to Firebase!")

print("\nMonitoring FOTA progress (checking every 3s)...")
for i in range(40):
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
            print("\n🎉🎉🎉 FOTA UPGRADE TO v2.1.9 COMPLETED SUCCESSFULLY! 🎉🎉🎉")
            break
        if status == "FAILED":
            print(f"\n❌ FOTA FAILED: {ota_info.get('error')}")
            break
    except Exception as e:
        print(f"Polling warning: {e}")

