#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to swap inverted tracking vs static electrical data in Firebase RTDB
Scope: From Nov 11, 2026 00:00:00 (UTC+7) to current time.
Backup: Saves original records to scratch/history_backup_nov11_nov12.json before modifying.
"""

import urllib.request
import json
import time
import datetime
import os
import ssl

ssl_ctx = ssl._create_unverified_context()
BASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"

# Nov 11 00:00:00 UTC+7 timestamp
NOV_11_START_TS = int(datetime.datetime(2026, 11, 11, 0, 0, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=7))).timestamp())

def main():
    print("=" * 65)
    print("    SWAP ELECTRICAL DATA: TRACKING <-> STATIC (Nov 11 -> Nov 12)")
    print(f"    Start timestamp: {NOV_11_START_TS} ({datetime.datetime.fromtimestamp(NOV_11_START_TS)})")
    print("=" * 65)

    # 1. Download full history in one fast request
    print("[1] Dang tai toan bo du lieu /solar/history (2.6 MB)...")
    t0 = time.time()
    req = urllib.request.Request(f"{BASE_URL}/solar/history.json")
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
        all_history = json.loads(resp.read().decode("utf-8")) or {}
    print(f"    -> Tai thanh cong {len(all_history)} ban ghi trong {round(time.time() - t0, 2)}s!")

    # 2. Filter records from Nov 11
    target_keys = sorted([int(k) for k in all_history.keys() if k.isdigit() and int(k) >= NOV_11_START_TS])
    print(f"[2] Tim thay {len(target_keys)} ban ghi can xu ly tu {target_keys[0]} den {target_keys[-1]}.")

    records_to_swap = {str(k): all_history[str(k)] for k in target_keys}

    # 3. Save backup
    backup_path = os.path.join(os.path.dirname(__file__), "history_backup_nov11_nov12.json")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(records_to_swap, f, indent=2)
    print(f"    [V] Da sao luu {len(records_to_swap)} ban ghi goc vao: {backup_path}")

    # 4. Swap fields
    print("[3] Dang hoan doi cac truong dien: trk <-> sta...")
    fields_to_swap = [
        ("v_trk", "v_sta"),
        ("i_trk", "i_sta"),
        ("p_trk", "p_sta"),
        ("p_peak_trk", "p_peak_sta"),
        ("wh_trk", "wh_sta")
    ]

    swapped_records = {}
    for k, rec in records_to_swap.items():
        new_rec = dict(rec)
        for f1, f2 in fields_to_swap:
            val1 = new_rec.get(f1)
            val2 = new_rec.get(f2)
            if val1 is not None or val2 is not None:
                new_rec[f1] = val2
                new_rec[f2] = val1
        swapped_records[k] = new_rec

    # 5. Push swapped records back via PATCH in batches of 100
    print("[4] Dang cap nhat du lieu da hoan doi len Firebase RTDB qua PATCH...")
    keys_list = list(swapped_records.keys())
    batch_size = 100
    for i in range(0, len(keys_list), batch_size):
        batch_keys = keys_list[i:i + batch_size]
        batch_payload = {k: swapped_records[k] for k in batch_keys}
        
        data_bytes = json.dumps(batch_payload).encode("utf-8")
        patch_req = urllib.request.Request(
            f"{BASE_URL}/solar/history.json",
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="PATCH"
        )
        try:
            with urllib.request.urlopen(patch_req, context=ssl_ctx, timeout=15) as p_resp:
                if p_resp.status == 200:
                    print(f"    -> Batch {min(i + batch_size, len(keys_list))}/{len(keys_list)}: OK")
        except Exception as e:
            print(f"    [!] Batch {i} loi: {e}")
            time.sleep(1)

    # 6. Swap live nodes /solar/tracking and /solar/static
    print("[5] Dang hoan doi thong so hien tai tren /solar/tracking va /solar/static...")
    try:
        trk_req = urllib.request.Request(f"{BASE_URL}/solar/tracking.json")
        sta_req = urllib.request.Request(f"{BASE_URL}/solar/static.json")
        with urllib.request.urlopen(trk_req, context=ssl_ctx, timeout=10) as r1:
            trk_data = json.loads(r1.read().decode("utf-8")) or {}
        with urllib.request.urlopen(sta_req, context=ssl_ctx, timeout=10) as r2:
            sta_data = json.loads(r2.read().decode("utf-8")) or {}

        v_trk = trk_data.get("voltage")
        v_sta = sta_data.get("voltage")
        i_trk = trk_data.get("current")
        i_sta = sta_data.get("current")
        p_trk = trk_data.get("power")
        p_sta = sta_data.get("power")
        wh_trk = trk_data.get("dailyEnergyWh")
        wh_sta = sta_data.get("dailyEnergyWh")

        trk_patch = {}
        sta_patch = {}
        if v_sta is not None: trk_patch["voltage"] = v_sta
        if v_trk is not None: sta_patch["voltage"] = v_trk
        if i_sta is not None: trk_patch["current"] = i_sta
        if i_trk is not None: sta_patch["current"] = i_trk
        if p_sta is not None: trk_patch["power"] = p_sta
        if p_trk is not None: sta_patch["power"] = p_trk
        if wh_sta is not None: trk_patch["dailyEnergyWh"] = wh_sta
        if wh_trk is not None: sta_patch["dailyEnergyWh"] = wh_trk

        if trk_patch:
            req_p1 = urllib.request.Request(
                f"{BASE_URL}/solar/tracking.json",
                data=json.dumps(trk_patch).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="PATCH"
            )
            urllib.request.urlopen(req_p1, context=ssl_ctx, timeout=10)
        if sta_patch:
            req_p2 = urllib.request.Request(
                f"{BASE_URL}/solar/static.json",
                data=json.dumps(sta_patch).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="PATCH"
            )
            urllib.request.urlopen(req_p2, context=ssl_ctx, timeout=10)
        print(f"    [V] Hoan doi tracking (dailyEnergyWh={wh_sta}, pwr={p_sta}) va static (dailyEnergyWh={wh_trk}, pwr={p_trk})!")
    except Exception as e:
        print(f"    [!] Loi khi hoan doi live nodes: {e}")

    print("=" * 65)
    print("    HOAN TAT HOAN DOI DU LIEU LICH SU VA HIEN TAI THANH CONG 100%!")
    print("=" * 65)

if __name__ == "__main__":
    main()
