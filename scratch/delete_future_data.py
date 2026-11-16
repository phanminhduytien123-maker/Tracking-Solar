#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script xoa cac ban ghi du lieu tuong lai (synthetic future records) tren Firebase /solar/history:
- Khoang thoi gian: tu 12:30:00 (1794547800) den 19:00:00 (1794571200) ngay 13/11/2026.
- Chi xoa cac ban ghi synthetic (ts % 60 == 0) thuoc recs_13_aft.
- Giu nguyen 100% cac ban ghi thuc te tu ESP1 (11:55 -> hien tai, co giay le nhu :19, :20, :21, :25...).
- Giu nguyen 100% ban ghi bu mat dien buoi sang (07:00 -> 11:54).
"""

import urllib.request
import json
import ssl
import time
from datetime import datetime, timezone, timedelta

BASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"
ctx = ssl._create_unverified_context()
tz = timezone(timedelta(hours=7))

def main():
    print("=" * 70)
    print("   XOA DU LIEU TUONG LAI / KHOANG GIO CHIEU NGAY 13/11/2026")
    print("=" * 70)

    # 1. Lay danh sach shallow keys
    print("\n[1] Lay danh sach khoa tu /solar/history.json?shallow=true...")
    req = urllib.request.Request(f"{BASE_URL}/solar/history.json?shallow=true")
    with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
        keys = json.loads(resp.read().decode())

    keys_int = sorted([int(k) for k in keys if k.isdigit()])

    # Khoang can xoa: synthetic tu 12:30:00 ngay 13/11 den 23:59:59 ngay 13/11
    t_start = int(datetime(2026, 11, 13, 12, 30, 0, tzinfo=tz).timestamp())
    t_end = int(datetime(2026, 11, 13, 23, 59, 59, tzinfo=tz).timestamp())

    keys_to_delete = [
        k for k in keys_int
        if t_start <= k <= t_end and k % 60 == 0
    ]

    real_keys_preserved = [
        k for k in keys_int
        if t_start <= k <= t_end and k % 60 != 0
    ]

    print(f"[*] Tim thay tong cong {len(keys_to_delete)} ban ghi synthetic can xoa!")
    print(f"[*] So ban ghi thuc te ESP1 duoc giu nguyen tuyet doi: {len(real_keys_preserved)}")

    if not keys_to_delete:
        print("[!] Khong co ban ghi nao can xoa.")
        return

    first_del = datetime.fromtimestamp(keys_to_delete[0], tz).strftime('%H:%M:%S')
    last_del = datetime.fromtimestamp(keys_to_delete[-1], tz).strftime('%H:%M:%S')
    print(f"    -> Tu: {first_del} ({keys_to_delete[0]}) den: {last_del} ({keys_to_delete[-1]})")

    # 2. Xoa theo batch bang PATCH {key: null}
    batch_size = 100
    deleted_count = 0
    print("\n[2] Dang xoa tren Firebase RTDB theo batches...")

    for i in range(0, len(keys_to_delete), batch_size):
        batch = keys_to_delete[i:i + batch_size]
        payload = {str(k): None for k in batch}
        data_bytes = json.dumps(payload).encode("utf-8")
        patch_req = urllib.request.Request(
            f"{BASE_URL}/solar/history.json",
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="PATCH"
        )
        try:
            with urllib.request.urlopen(patch_req, context=ctx, timeout=20) as resp:
                if resp.status == 200:
                    deleted_count += len(batch)
                    print(f"    -> Da xoa batch {min(i + batch_size, len(keys_to_delete))}/{len(keys_to_delete)}: OK")
        except Exception as e:
            print(f"    [!] Loi khi xoa batch: {e}")
            time.sleep(1)

    print(f"\n[✓] Da xoa thanh cong {deleted_count}/{len(keys_to_delete)} ban ghi tuong lai!")

    # 3. Kiem tra lai Firebase
    print("\n[3] Kiem tra lai danh sach ban ghi con lai tren Firebase ngay 13/11...")
    req_verify = urllib.request.Request(f"{BASE_URL}/solar/history.json?shallow=true")
    with urllib.request.urlopen(req_verify, context=ctx, timeout=20) as resp:
        verify_keys = json.loads(resp.read().decode())
    
    verify_int = sorted([int(k) for k in verify_keys if k.isdigit()])
    t_05 = int(datetime(2026, 11, 13, 5, 0, 0, tzinfo=tz).timestamp())
    today_remaining = [k for k in verify_int if t_05 <= k <= t_end]
    after_1300_remaining = [k for k in today_remaining if k >= int(datetime(2026, 11, 13, 13, 0, 0, tzinfo=tz).timestamp())]

    print(f"    -> Tong so ban ghi ngay 13/11 con lai: {len(today_remaining)}")
    print(f"    -> So ban ghi sau 13:00 con lai: {len(after_1300_remaining)} (tat ca deu la ban ghi thuc ESP1)")
    for k in after_1300_remaining:
        dt = datetime.fromtimestamp(k, tz).strftime('%H:%M:%S')
        print(f"       ESP1 live: {dt} ({k})")

    print("\n" + "=" * 70)
    print("   HOAN TAT XOA DU LIEU TUONG LAI!")
    print("=" * 70)

if __name__ == "__main__":
    main()
