import urllib.request
import json
import ssl
import time
import sys

sys.stdout.reconfigure(line_buffering=True)
ctx = ssl._create_unverified_context()

FIREBASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"
TRACKING_URL = f"{FIREBASE_URL}/solar/tracking.json"
OTA_URL = f"{FIREBASE_URL}/solar/ota.json"
FOTA_BINARY_URL = "https://raw.githubusercontent.com/phanminhduytien123-maker/Tracking-Solar/refs/heads/Backup_4_11/firmware/esp32_devkit_test/firmware.bin"

def wait_for_reset_and_fota(timeout_sec=300):
    print("=" * 65)
    print("    AUTO FOTA LISTENER - ĐANG CHỜ ESP32 #1 RESET ĐỂ NẠP TỰ ĐỘNG")
    print("=" * 65)
    print("[*] Link Firmware CDN sẵn sàng: Fastly CDN (1.05s / 1.43 MB)")
    print("[*] Đang lắng nghe nhịp tim của ESP32 #1...")
    print(">>> HÃY BẤM NÚT RESET (EN) TRÊN BO MẠCH ESP32 #1 ĐỂ BẮT ĐẦU! <<<")

    start_wait = time.time()
    last_known_st = 1794207967670 # Mốc thời gian dừng lúc 14:05:58

    while time.time() - start_wait < timeout_sec:
        try:
            req = urllib.request.Request(TRACKING_URL)
            with urllib.request.urlopen(req, context=ctx, timeout=4) as r:
                data = json.loads(r.read().decode('utf-8')) or {}
                st = data.get('server_time', 0)
                uptime = data.get('uptime_s', 99999)
                ver = data.get('firmware_version', '')

                # ESP32 vừa reboot nếu server_time > last_known_st và uptime < 60s
                if st > last_known_st and uptime < 60:
                    print(f"\n[!] PHÁT HIỆN ESP32 #1 ĐÃ KHỞI ĐỘNG LẠI THÀNH CÔNG!")
                    print(f"    - Server Time: {st}")
                    print(f"    - Uptime: {uptime} giây")
                    print(f"    - Version: {ver}")
                    print("\n>>> ĐANG KÍCH HOẠT FOTA TỰ ĐỘNG NGAY LẬP TỨC...")

                    payload = {
                        "trigger": True,
                        "url": FOTA_BINARY_URL,
                        "target_version": "v2.1.2",
                        "status": "PENDING",
                        "progress": 0,
                        "error": "",
                        "timestamp": int(time.time() * 1000)
                    }
                    data_bytes = json.dumps(payload).encode("utf-8")
                    ota_req = urllib.request.Request(OTA_URL, data=data_bytes, headers={"Content-Type": "application/json"}, method="PUT")
                    with urllib.request.urlopen(ota_req, context=ctx, timeout=5) as ota_resp:
                        if ota_resp.status == 200:
                            print("[✓] Đã gửi lệnh FOTA lên Firebase!")
                    
                    # Giám sát tiến độ nạp
                    return monitor_progress()
        except Exception as e:
            pass

        time.sleep(1.5)

    print("\n[!] Hết thời gian chờ (Timeout 5 phút). Chưa phát hiện ESP32 #1 khởi động lại.")
    return False

def monitor_progress(timeout_sec=120):
    print("\n" + "=" * 65)
    print("    THEO DÕI TIẾN TRÌNH FOTA (REAL-TIME)")
    print("=" * 65)
    t0 = time.time()
    last_status = ""
    last_pct = -1

    while time.time() - t0 < timeout_sec:
        try:
            req = urllib.request.Request(OTA_URL)
            with urllib.request.urlopen(req, context=ctx, timeout=4) as r:
                data = json.loads(r.read().decode('utf-8')) or {}
                status = data.get("status", "UNKNOWN")
                progress = data.get("progress", 0)
                err = data.get("error", "")

                if status != last_status or progress != last_pct:
                    last_status = status
                    last_pct = progress

                    if status == "PENDING":
                        print("[*] ESP32: Đã nhận lệnh, chuẩn bị tải binary...")
                    elif status == "DOWNLOADING":
                        filled = progress // 5
                        bar = "█" * filled + "░" * (20 - filled)
                        print(f"[*] ESP32: Tải & ghi Flash [{bar}] {progress}%")
                    elif status == "SUCCESS":
                        print("\n" + "=" * 65)
                        print("[✓] FOTA THÀNH CÔNG RỰC RỠ 100%! ESP32 ĐANG KHỞI ĐỘNG VÀO BẢN v2.1.2!")
                        print("=" * 65)
                        return True
                    elif status == "FAILED":
                        print(f"\n[✗] FOTA Thất bại: {err}")
                        return False
        except Exception:
            pass
        time.sleep(1.2)

    print("\n[!] Hết thời gian chờ FOTA.")
    return False

if __name__ == '__main__':
    wait_for_reset_and_fota()

