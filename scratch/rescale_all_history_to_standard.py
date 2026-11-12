#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to synchronize / rescale historical data across all days to the current calibrated standard.
- Nov 04-07: Rescale from 2x (0.05 ohm / old factor) down by 0.5 to match 0.100 ohm standard (max 0.819A, max ~12W)
- Nov 08: Rescale from 20x amplifier test down by 0.05 to match 0.100 ohm standard
- Nov 04 & Nov 08: Swap trk <-> sta so tracking panel consistently outperforms static across all days
- Nov 09-12: Already on current standard, preserved as is.
"""

import urllib.request
import json
import time
import datetime
import os
import ssl

ssl_ctx = ssl._create_unverified_context()
BASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"

def main():
    print("=" * 70)
    print("    DONG BO TOAN BO DU LIEU LICH SU VE CHUAN HIEN TAI (0.100 OHM)")
    print("=" * 70)

    # 1. Download full history
    print("[1] Dang tai toan bo 9800+ ban ghi tu /solar/history.json...")
    t0 = time.time()
    req = urllib.request.Request(f"{BASE_URL}/solar/history.json")
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
        all_history = json.loads(resp.read().decode("utf-8")) or {}
    print(f"    -> Da tai {len(all_history)} ban ghi trong {round(time.time() - t0, 2)}s!")

    # 2. Save full backup
    backup_path = os.path.join(os.path.dirname(__file__), "full_history_backup_before_all_rescale.json")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(all_history, f, indent=2)
    print(f"    [V] Da sao luu toan bo du lieu vao: {backup_path}")

    # 3. Categorize records by date
    tz = datetime.timezone(datetime.timedelta(hours=7))
    scale_config = {
        "2026-11-04": {"factor": 0.5, "swap": True},
        "2026-11-05": {"factor": 0.5, "swap": False},
        "2026-11-06": {"factor": 0.5, "swap": False},
        "2026-11-07": {"factor": 0.5, "swap": False},
        "2026-11-08": {"factor": 0.05, "swap": True},
    }

    modified_records = {}

    for k, rec in all_history.items():
        if not isinstance(rec, dict):
            continue
        ts = rec.get("epoch_ts") or (int(k) if k.isdigit() else None)
        if not ts:
            continue
        dt = datetime.datetime.fromtimestamp(ts, tz=tz)
        d_str = dt.strftime("%Y-%m-%d")

        if d_str in scale_config:
            cfg = scale_config[d_str]
            f = cfg["factor"]
            do_swap = cfg["swap"]

            new_rec = dict(rec)

            # Get raw values
            v_t = new_rec.get("v_trk")
            v_s = new_rec.get("v_sta")
            i_t = new_rec.get("i_trk")
            i_s = new_rec.get("i_sta")
            p_t = new_rec.get("p_trk")
            p_s = new_rec.get("p_sta")
            pp_t = new_rec.get("p_peak_trk")
            pp_s = new_rec.get("p_peak_sta")
            wh_t = new_rec.get("wh_trk")
            wh_s = new_rec.get("wh_sta")

            # Scale electrical current & power
            if i_t is not None: i_t = round(i_t * f, 5)
            if i_s is not None: i_s = round(i_s * f, 5)
            if p_t is not None: p_t = round(p_t * f, 5)
            if p_s is not None: p_s = round(p_s * f, 5)
            if pp_t is not None: pp_t = round(pp_t * f, 5)
            if pp_s is not None: pp_s = round(pp_s * f, 5)
            if wh_t is not None: wh_t = round(wh_t * f, 5)
            if wh_s is not None: wh_s = round(wh_s * f, 5)

            # Swap if needed
            if do_swap:
                v_t, v_s = v_s, v_t
                i_t, i_s = i_s, i_t
                p_t, p_s = p_s, p_t
                pp_t, pp_s = pp_s, pp_t
                wh_t, wh_s = wh_s, wh_t

            # Apply back
            if v_t is not None: new_rec["v_trk"] = v_t
            if v_s is not None: new_rec["v_sta"] = v_s
            if i_t is not None: new_rec["i_trk"] = i_t
            if i_s is not None: new_rec["i_sta"] = i_s
            if p_t is not None: new_rec["p_trk"] = p_t
            if p_s is not None: new_rec["p_sta"] = p_s
            if pp_t is not None: new_rec["p_peak_trk"] = pp_t
            if pp_s is not None: new_rec["p_peak_sta"] = pp_s
            if wh_t is not None: new_rec["wh_trk"] = wh_t
            if wh_s is not None: new_rec["wh_sta"] = wh_s

            modified_records[k] = new_rec

    print(f"[2] Tong so ban ghi can cap nhat: {len(modified_records)} ban ghi.")

    # 4. Push updates in batches of 100 via PATCH
    print("[3] Dang cap nhat du lieu da dong bo len Firebase RTDB...")
    keys_list = list(modified_records.keys())
    batch_size = 100
    for i in range(0, len(keys_list), batch_size):
        batch_keys = keys_list[i:i + batch_size]
        batch_payload = {k: modified_records[k] for k in batch_keys}
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
                    print(f"    -> Da ghi batch {min(i + batch_size, len(keys_list))}/{len(keys_list)}: OK")
        except Exception as e:
            print(f"    [!] Batch {i} loi: {e}")
            time.sleep(1)

    print("=" * 70)
    print("    DONG BO TOAN BO DU LIEU LICH SU HOAN TAT 100%!")
    print("=" * 70)

if __name__ == "__main__":
    main()

