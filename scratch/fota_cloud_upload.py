#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1-Click Automated Cloud FOTA Pipeline for ESP32 Solar Tracker
1. Automatically compiles firmware if needed.
2. Creates/updates GitHub Release on phanminhduytien123-maker/Tracking-Solar.
3. Uploads firmware.bin as a public release asset.
4. Triggers ESP32 update via Firebase RTDB /system/ota.
5. Monitors live download & flashing progress directly in the terminal!
"""

import sys
import os
import json
import time
import ssl
import subprocess
import urllib.request
import urllib.error

# Configurations
REPO_OWNER = "phanminhduytien123-maker"
REPO_NAME = "Tracking-Solar"
DEFAULT_TAG = "v2.1.0"
FIRMWARE_BIN = r"C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin"
FIREBASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"
OTA_NODE = f"{FIREBASE_URL}/solar/ota.json"

ssl_ctx = ssl._create_unverified_context()

def get_github_token():
    """Retrieve GitHub credentials automatically from Windows Credential Manager."""
    try:
        res = subprocess.check_output(
            ["git", "credential", "fill"],
            input=b"protocol=https\nhost=github.com\n",
            stderr=subprocess.DEVNULL
        ).decode("utf-8")
        creds = dict(line.split("=", 1) for line in res.strip().split("\n") if "=" in line)
        token = creds.get("password")
        if token:
            return token
    except Exception as e:
        print(f"[!] Khong the tu dong lay GitHub Token qua Git: {e}")
    return None

def push_git_changes():
    """Push local commits to GitHub before releasing."""
    print(">>> 1/5: Dong bo commit moi nhat len GitHub...")
    try:
        subprocess.run(["git", "push", "origin", "Backup_4_11"], check=True)
        print("    [V] Git push thanh cong.")
    except Exception as e:
        print(f"    [!] Canh bao git push: {e} (Tiep tuc)")

def build_firmware_if_needed():
    """Check binary or build with PlatformIO."""
    print(">>> 2/5: Kiem tra file binary firmware.bin...")
    if not os.path.exists(FIRMWARE_BIN):
        print("    [+] Dang bien dich firmware moi voi PlatformIO...")
        res = subprocess.run([
            os.path.expanduser(r"~\.platformio\penv\Scripts\platformio.exe"),
            "run", "-e", "esp32_devkit_test"
        ])
        if res.returncode != 0:
            print("[X] Bien dich that bai! Huy thao tac.")
            sys.exit(1)
    
    size = os.path.getsize(FIRMWARE_BIN)
    print(f"    [V] File firmware san sang: {size:,} bytes ({size / (1024*1024):.2f} MB)")
    return size

def get_or_create_release(token, tag_name):
    """Find existing release or create a new one on GitHub."""
    print(f">>> 3/5: Tao/Cap nhat GitHub Release ({tag_name})...")
    api_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases"
    headers = {
        "Authorization": f"token {token}",
        "User-Agent": "FOTA-1Click-Tool",
        "Accept": "application/vnd.github.v3+json"
    }

    # Check if release with this tag exists
    tag_url = f"{api_url}/tags/{tag_name}"
    req = urllib.request.Request(tag_url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ssl_ctx) as resp:
            rel = json.loads(resp.read().decode("utf-8"))
            print(f"    [*] Release {tag_name} da ton tai (ID: {rel['id']}).")
            return rel
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"[!] Loi kiem tra release: {e}")

    # Create new release
    payload = {
        "tag_name": tag_name,
        "target_commitish": "Backup_4_11",
        "name": f"Firmware Release {tag_name}",
        "body": f"Ban cap nhat tu dong FOTA cho Solar Tracker vao {time.strftime('%Y-%m-%d %H:%M:%S')}.",
        "draft": False,
        "prerelease": False
    }
    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
        rel = json.loads(resp.read().decode("utf-8"))
        print(f"    [V] Da tao Release moi thanh cong! (ID: {rel['id']})")
        return rel

def upload_release_asset(token, release, file_path):
    """Upload firmware.bin to the GitHub Release."""
    print(">>> 4/5: Day file firmware.bin len GitHub Releases CDN...")
    headers = {
        "Authorization": f"token {token}",
        "User-Agent": "FOTA-1Click-Tool",
        "Accept": "application/vnd.github.v3+json"
    }

    # If asset firmware.bin already exists, delete it first to overwrite
    assets = release.get("assets", [])
    for a in assets:
        if a["name"] == "firmware.bin":
            del_url = a["url"]
            print(f"    [*] Xoa ban firmware.bin cu tren Release (ID: {a['id']})...")
            del_req = urllib.request.Request(del_url, headers=headers, method="DELETE")
            try:
                with urllib.request.urlopen(del_req, context=ssl_ctx):
                    pass
            except Exception as e:
                print(f"    [!] Loi xoa asset cu: {e}")

    upload_url_raw = release["upload_url"] # e.g. https://uploads.github.com/repos/.../releases/{id}/assets{?name,label}
    upload_url = upload_url_raw.split("{")[0] + "?name=firmware.bin"

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    upload_req = urllib.request.Request(
        upload_url,
        data=file_bytes,
        headers={
            **headers,
            "Content-Type": "application/octet-stream",
            "Content-Length": str(len(file_bytes))
        },
        method="POST"
    )

    with urllib.request.urlopen(upload_req, context=ssl_ctx) as resp:
        asset_info = json.loads(resp.read().decode("utf-8"))
        download_url = asset_info["browser_download_url"]
        print(f"    [V] Upload thanh cong 100%!")
        print(f"    [+] Direct Download Link: {download_url}")
        return download_url

def trigger_esp32_via_firebase(download_url, version):
    """Send FOTA trigger to Firebase RTDB."""
    print(">>> 5/5: Gui lenh FOTA len Firebase cho ESP32...")
    payload = {
        "trigger": True,
        "url": download_url,
        "target_version": version,
        "status": "PENDING",
        "progress": 0,
        "error": "",
        "timestamp": int(time.time() * 1000)
    }

    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OTA_NODE,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "FOTA-Tool/2.1"},
        method="PUT"
    )

    with urllib.request.urlopen(req, context=ssl_ctx, timeout=10) as resp:
        if resp.status == 200:
            print("    [V] Da ghi lenh FOTA len Firebase (/system/ota) thanh cong!")
            return True
    return False

def monitor_esp32_progress(timeout_sec=120):
    """Poll Firebase RTDB to display real-time download and flashing progress."""
    print("\n" + "=" * 65)
    print("    THEO DÕI TIẾN ĐỘ ESP32 NẠP TỪ XA QUA CLOUD (REAL-TIME)")
    print("=" * 65)
    start_t = time.time()
    last_pct = -1
    last_status = ""

    while time.time() - start_t < timeout_sec:
        try:
            req = urllib.request.Request(OTA_NODE, headers={"User-Agent": "FOTA-Tool/2.1"})
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8")) or {}
                    status = data.get("status", "UNKNOWN")
                    progress = data.get("progress", 0)
                    err = data.get("error", "")

                    if status != last_status or progress != last_pct:
                        last_status = status
                        last_pct = progress

                        if status == "PENDING":
                            print(f"[*] ESP32: Đang chờ tiếp nhận lệnh (kiểm tra mỗi 5s)...")
                        elif status == "DOWNLOADING":
                            filled = progress // 5
                            bar = "█" * filled + "░" * (20 - filled)
                            print(f"[*] ESP32: Tải & ghi Flash [{bar}] {progress}%")
                        elif status == "SUCCESS":
                            print(f"\n" + "=" * 65)
                            print(f"[✓] THÀNH CÔNG RỰC RỠ! ESP32 ĐÃ NẠP XONG 100% VÀ ĐANG REBOOT.")
                            print("=" * 65)
                            return True
                        elif status == "FAILED":
                            print(f"\n[✗] NẠP THẤT BẠI: {err}")
                            return False
                        elif status == "NO_UPDATES":
                            print(f"\n[*] ESP32 thông báo không có bản cập nhật mới.")
                            return False
        except Exception:
            pass

        time.sleep(1.2)

    print("\n[!] Hết thời gian chờ (Timeout). ESP32 có thể đang khởi động lại hoặc mất kết nối.")
    return False

def main():
    print("=" * 65)
    print("    1-CLICK CLOUD FOTA - TỰ ĐỘNG PHÁT HÀNH & NẠP CODE QUA CLOUD")
    print("=" * 65)

    token = get_github_token()
    if not token:
        print("[X] Khong tim thay GitHub token tren may! Vui long dang nhap Git.")
        sys.exit(1)

    tag_ver = DEFAULT_TAG
    if len(sys.argv) > 1:
        tag_ver = sys.argv[1]

    # 1. Push git commits
    push_git_changes()

    # 2. Build check
    build_firmware_if_needed()

    # 3. GitHub Release
    release = get_or_create_release(token, tag_ver)

    # 4. Upload binary asset to GitHub
    download_url = upload_release_asset(token, release, FIRMWARE_BIN)

    # 5. Trigger ESP32 via Firebase
    if trigger_esp32_via_firebase(download_url, tag_ver):
        # 6. Stream live progress
        monitor_esp32_progress()

if __name__ == "__main__":
    main()
