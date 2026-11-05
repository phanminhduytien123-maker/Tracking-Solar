#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OTA LAN Upload Script for ESP32 Solar Tracker
Uploads compiled firmware.bin over local Wi-Fi network using espota.py on port 3232.
"""

import os
import sys
import subprocess
import time

FIRMWARE_BIN = r"C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin"
ESPOTA_PY = os.path.expanduser(r"~\.platformio\packages\framework-arduinoespressif32\tools\espota.py")
DEFAULT_HOST = "192.168.1.9"
MDNS_HOST = "esp32-solar-tracker.local"
OTA_PORT = "3232"
OTA_AUTH = "solar2026"

def main():
    print("=" * 60)
    print("      ESP32 SOLAR TRACKER - NẠP CODE QUA MẠNG NỘI BỘ (LAN OTA)")
    print("=" * 60)

    if not os.path.exists(FIRMWARE_BIN):
        print(f"[!] Khong tim thay file binary: {FIRMWARE_BIN}")
        print("    Dang tu dong bien dich firmware moi nhat voi PlatformIO...")
        res = subprocess.run([
            os.path.expanduser(r"~\.platformio\penv\Scripts\platformio.exe"),
            "run", "-e", "esp32_devkit_test"
        ])
        if res.returncode != 0:
            print("[X] Bien dich that bai! Huy thao tac nap.")
            sys.exit(1)

    bin_size = os.path.getsize(FIRMWARE_BIN)
    print(f"[+] File nhị phân: {FIRMWARE_BIN}")
    print(f"[+] Dung lượng: {bin_size:,} bytes ({bin_size / (1024*1024):.2f} MB)")

    # Kiem tra dia chi dich
    target_ip = DEFAULT_HOST
    if len(sys.argv) > 1:
        target_ip = sys.argv[1]

    print(f"[+] Dia chi IP dich: {target_ip} (Port {OTA_PORT})")
    print(f"[+] Mat khau OTA: {OTA_AUTH}")
    print("\n>>> Dang ket noi va truyen firmware toi ESP32...")

    # Chay espota.py
    cmd = [
        sys.executable,
        ESPOTA_PY,
        "-i", target_ip,
        "-p", OTA_PORT,
        "-a", OTA_AUTH,
        "-f", FIRMWARE_BIN,
        "-d"
    ]

    try:
        proc = subprocess.run(cmd)
        if proc.returncode == 0:
            print("\n[V] NAP OTA LAN THANH CONG 100%! ESP32 dang khoi dong lai.")
        else:
            print(f"\n[X] Nap OTA that bai (Exit code {proc.returncode}).")
            print(f"    Goi y: Thu ping {target_ip} xem ESP32 da bat nguon va ket noi WiFi chua.")
    except Exception as e:
        print(f"\n[!] Loi khi thuc thi espota.py: {e}")

if __name__ == "__main__":
    main()

