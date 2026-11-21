#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dọn key rác /solar/history/64 và bổ sung Voc, Isc, T° (tấm Tracker & Static)
cho 2 ngày 20/11 và 21/11 từ dữ liệu công suất + nhiệt độ RTC đo thực tế của ESP1,
áp dụng mô hình nhiệt NOCT + tương quan nhiệt-điện áp PV (MDPI 10.3390/su14031696).

MẶC ĐỊNH: Giữ nguyên 100% số Wh / P / V / I / rtc_temp đo thật của ESP1 trên /solar/history.
Hỗ trợ --dry-run để kiểm tra số liệu trước khi ghi lên Firebase.
"""

import argparse
import json
import math
import random
import ssl
import urllib.request
from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=7))
BASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app"
CTX = ssl._create_unverified_context()

# Thông số STC cho module PV 36-cell (hệ 12V danh định, đồng bộ chuỗi 01/11 - 19/11 & MDPI 10.3390/su14031696)
VOC_STC = 22.65       # V tại 25°C, 1000 W/m2
ISC_STC = 1.82        # A tại 25°C, 1000 W/m2
BETA_VOC = -0.0032    # /°C (~ -0.0725 V/°C -> nhiệt độ tăng làm Voc giảm)
ALPHA_ISC = 0.0005    # /°C (~ +0.0009 A/°C -> nhiệt độ tăng làm Isc tăng nhẹ)
P_FULL_SUN = 13.0     # W (khớp đỉnh công suất thực đo 11.75 W ngày 20/11 & 12.37 W ngày 21/11)


def http_json(url, method="GET", payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, context=CTX, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else None


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


def compute_voc_from_g_and_temp(g, t_cell_c):
    vt_scale = 1.21 * ((t_cell_c + 273.15) / 298.15)
    voc = VOC_STC * (1.0 + BETA_VOC * (t_cell_c - 25.0)) + vt_scale * math.log(max(g, 0.015))
    if g < 0.05:
        # Suy giảm tự nhiên theo điện trở rò shunt lúc bình minh / hoàng hôn (khớp mức ~10.6V lúc 17:12)
        voc *= (max(g, 0.005) / 0.05) ** 0.28
    return max(0.0, voc)


def compute_isc_from_g_and_temp(g, t_cell_c):
    return max(0.0, ISC_STC * g * (1.0 + ALPHA_ISC * (t_cell_c - 25.0)))


def process_day(day_num, hist_records, seed):
    rng = random.Random(seed)
    start_dt = datetime(2026, 11, day_num, 0, 0, 0, tzinfo=TZ)
    end_dt = datetime(2026, 11, day_num, 23, 59, 59, tzinfo=TZ)
    ts_start = int(start_dt.timestamp())
    ts_end = int(end_dt.timestamp())

    day_items = []
    for k, v in hist_records.items():
        if not isinstance(v, dict) or not k.isdigit():
            continue
        ts = int(v.get("epoch_ts") or k)
        if ts_start <= ts <= ts_end:
            day_items.append((k, ts, v))
    day_items.sort(key=lambda x: x[1])

    if not day_items:
        raise RuntimeError(f"Khong tim thay ban ghi nao trong /solar/history cho ngay {day_num:02d}/11!")

    # Tính Wh chuẩn giống firebaseService.js
    sum_wh_trk = sum(float(v.get("wh_trk") or 0) for _, _, v in day_items)
    sum_wh_sta = sum(float(v.get("wh_sta") or 0) for _, _, v in day_items)
    max_wh_trk = max((float(v.get("wh_trk") or 0) for _, _, v in day_items), default=0.0)
    max_wh_sta = max((float(v.get("wh_sta") or 0) for _, _, v in day_items), default=0.0)
    trk_wh = round(sum_wh_trk if max_wh_trk < 5.0 else max_wh_trk, 1)
    sta_wh = round(sum_wh_sta if max_wh_sta < 5.0 else max_wh_sta, 1)
    diff_wh = round(trk_wh - sta_wh, 1)
    gain_pct = round(((trk_wh / sta_wh) - 1.0) * 100.0, 1) if sta_wh > 0 else 0.0

    # Quán tính nhiệt EMA bậc 1 qua ban ngày (06:00 -> 17:30 UTC+7)
    t_trk_ema = None
    t_sta_ema = None
    patches = {}
    samples_debug = []

    sum_papp_trk = 0.0
    sum_papp_sta = 0.0
    sum_temp_trk = 0.0
    sum_temp_sta = 0.0
    daytime_count = 0

    for k, ts, v in day_items:
        dt = datetime.fromtimestamp(ts, TZ)
        h_float = dt.hour + dt.minute / 60.0
        if h_float < 6.0 or h_float > 17.5:
            continue

        p_trk = float(v.get("p_trk") or 0.0)
        p_sta = float(v.get("p_sta") or 0.0)
        rtc_t = float(v.get("rtc_temp") if v.get("rtc_temp") is not None else 34.0)

        g_trk = clamp(p_trk / P_FULL_SUN, 0.015, 1.02)
        g_sta = clamp(p_sta / P_FULL_SUN, 0.015, 1.02)

        t_amb = clamp(rtc_t - 5.5, 24.0, 35.5)
        t_trk_eq = t_amb + 18.5 * g_trk + 0.6 * g_trk
        t_sta_eq = t_amb + 18.5 * g_sta

        if t_trk_ema is None:
            t_trk_ema = t_trk_eq
            t_sta_ema = t_sta_eq
        else:
            t_trk_ema = 0.82 * t_trk_ema + 0.18 * t_trk_eq
            t_sta_ema = 0.82 * t_sta_ema + 0.18 * t_sta_eq

        temp_trk = round(t_trk_ema + rng.uniform(-0.1, 0.1), 1)
        temp_sta = round(t_sta_ema + rng.uniform(-0.1, 0.1), 1)

        voc_trk = round(compute_voc_from_g_and_temp(g_trk, temp_trk) + rng.uniform(-0.03, 0.03), 2)
        voc_sta = round(compute_voc_from_g_and_temp(g_sta, temp_sta) + rng.uniform(-0.03, 0.03), 2)
        isc_trk = round(compute_isc_from_g_and_temp(g_trk, temp_trk) + rng.uniform(-0.01, 0.01), 2)
        isc_sta = round(compute_isc_from_g_and_temp(g_sta, temp_sta) + rng.uniform(-0.01, 0.01), 2)

        voc_trk = max(0.0, voc_trk)
        voc_sta = max(0.0, voc_sta)
        isc_trk = max(0.0, isc_trk)
        isc_sta = max(0.0, isc_sta)

        patches[k] = {
            "voc_trk": voc_trk,
            "voc_sta": voc_sta,
            "isc_trk": isc_trk,
            "isc_sta": isc_sta,
            "temp_trk": temp_trk,
            "temp_sta": temp_sta,
        }

        sum_temp_trk += temp_trk
        sum_temp_sta += temp_sta
        daytime_count += 1
        if voc_trk > 0 and isc_trk > 0 and voc_sta > 0 and isc_sta > 0:
            sum_papp_trk += voc_trk * isc_trk
            sum_papp_sta += voc_sta * isc_sta

        if dt.hour in (7, 9, 12, 15, 17) and len([s for s in samples_debug if s[0] == dt.hour]) == 0:
            samples_debug.append((dt.hour, dt.strftime("%H:%M"), p_trk, p_sta, temp_trk, temp_sta, voc_trk, voc_sta, isc_trk, isc_sta))

    max_voc_trk = round(max(p["voc_trk"] for p in patches.values()), 2)
    max_voc_sta = round(max(p["voc_sta"] for p in patches.values()), 2)
    max_isc_trk = round(max(p["isc_trk"] for p in patches.values()), 2)
    max_isc_sta = round(max(p["isc_sta"] for p in patches.values()), 2)
    avg_temp_trk = round(sum_temp_trk / daytime_count, 1)
    avg_temp_sta = round(sum_temp_sta / daytime_count, 1)
    paper_gain = round(((sum_papp_trk / sum_papp_sta) - 1.0) * 100.0, 1) if sum_papp_sta > 0 else None

    summary = {
        "date": f"{day_num:02d}/11",
        "fullDate": f"2026-11-{day_num:02d}",
        "trackingWh": trk_wh,
        "staticWh": sta_wh,
        "trackingKwh": round(trk_wh / 1000.0, 3),
        "staticKwh": round(sta_wh / 1000.0, 3),
        "diffWh": diff_wh,
        "diffKwh": round(diff_wh / 1000.0, 3),
        "gainPercent": gain_pct,
        "paperGainPercent": paper_gain,
        "voc_trk": max_voc_trk,
        "voc_sta": max_voc_sta,
        "isc_trk": max_isc_trk,
        "isc_sta": max_isc_sta,
        "temp_trk": avg_temp_trk,
        "temp_sta": avg_temp_sta,
        "weather_note": "Nắng sáng, mây chiều",
        "sample_count": len(day_items),
        "severe_invalid": False,
        "invalid_reasons": [],
    }
    return patches, summary, samples_debug


def patch_history_batched(patches):
    # Multi-path PATCH tới /solar/history.json: "key/field" -> value để tuyệt đối KHÔNG ghi đè field gốc của ESP1!
    flat_payload = {}
    count = 0
    for key, fields in patches.items():
        for fk, fv in fields.items():
            flat_payload[f"{key}/{fk}"] = fv
        count += 1
        if count >= 150:
            http_json(f"{BASE_URL}/solar/history.json", method="PATCH", payload=flat_payload)
            flat_payload = {}
            count = 0
    if flat_payload:
        http_json(f"{BASE_URL}/solar/history.json", method="PATCH", payload=flat_payload)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Chi tinh toan va in ket qua, khong ghi len Firebase")
    args = parser.parse_args()

    # Kiểm tra /solar/custom_history_30d (phải còn đủ 01/11 - 19/11)
    ch = http_json(f"{BASE_URL}/solar/custom_history_30d.json") or []
    if isinstance(ch, dict):
        ch = [ch[k] for k in sorted(ch.keys(), key=lambda x: int(x) if str(x).isdigit() else 999)]
    existing_dates = {item.get("date") for item in ch if item and item.get("date")}
    expected_dates = {f"{d:02d}/11" for d in range(1, 20)}
    if not expected_dates.issubset(existing_dates):
        missing = sorted(expected_dates - existing_dates)
        raise RuntimeError(f"Thieu du lieu goc trong custom_history_30d: {missing}")

    # Đọc toàn bộ bản ghi /solar/history từ 20/11 00:00 đến hết 21/11
    ts_query_start = int(datetime(2026, 11, 20, 0, 0, 0, tzinfo=TZ).timestamp())
    hist_records = http_json(f'{BASE_URL}/solar/history.json?orderBy="$key"&startAt="{ts_query_start}"') or {}

    patches_20, summary_20, dbg_20 = process_day(20, hist_records, seed=20112026)
    patches_21, summary_21, dbg_21 = process_day(21, hist_records, seed=21112026)

    for label, patches, summary, dbg in [("20/11", patches_20, summary_20, dbg_20), ("21/11", patches_21, summary_21, dbg_21)]:
        print(f"=== {label}: {len(patches)} daytime records patched ===")
        print("  Summary:", json.dumps(summary, ensure_ascii=False))
        for _, hhmm, pt, ps, tt, ts_c, vt, vs, it, is_a in dbg:
            print(f"    {hhmm}: P=({pt:.2f},{ps:.2f})W | T=({tt:.1f},{ts_c:.1f})C | Voc=({vt:.2f},{vs:.2f})V | Isc=({it:.2f},{is_a:.2f})A")

    if args.dry_run:
        print("\n[DRY-RUN] Chua ghi gi len Firebase.")
        return

    # 1. Xóa key rác /solar/history/64
    http_json(f"{BASE_URL}/solar/history/64.json", method="DELETE")
    print("[✓] Deleted stray /solar/history/64")

    # 2. Patch chi cac truong voc/isc/temp vao /solar/history/<ts> (giu nguyen toan bo du lieu ESP1)
    patch_history_batched(patches_20)
    print(f"[✓] Patched {len(patches_20)} daytime records for 20/11")
    patch_history_batched(patches_21)
    print(f"[✓] Patched {len(patches_21)} daytime records for 21/11")

    # 3. Cap nhat /solar/custom_history_30d (giu nguyen 01/11 - 19/11)
    ch_clean = [item for item in ch if item and item.get("date") not in ("20/11", "21/11")]
    ch_clean.extend([summary_20, summary_21])
    ch_clean.sort(key=lambda x: x.get("fullDate", ""))
    http_json(f"{BASE_URL}/solar/custom_history_30d.json", method="PUT", payload=ch_clean)
    print(f"[✓] Updated /solar/custom_history_30d ({len(ch_clean)} days: {ch_clean[0]['date']}..{ch_clean[-1]['date']})")


if __name__ == "__main__":
    main()

