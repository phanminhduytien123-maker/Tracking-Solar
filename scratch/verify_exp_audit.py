import json
import math
from datetime import datetime

with open('scratch/history_backup_nov11_nov12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

items = []
for k, v in data.items():
    ts = int(v.get('epoch_ts', k))
    dt = datetime.fromtimestamp(ts)
    items.append({
        'dt': dt,
        'ts': ts,
        'p_trk': float(v.get('p_trk', 0.0)),
        'p_sta': float(v.get('p_sta', 0.0)),
        'v_trk': float(v.get('v_trk', 0.0)),
        'v_sta': float(v.get('v_sta', 0.0)),
        'i_trk': float(v.get('i_trk', 0.0)),
        'i_sta': float(v.get('i_sta', 0.0)),
        'wh_trk': float(v.get('wh_trk', 0.0)),
        'wh_sta': float(v.get('wh_sta', 0.0)),
        'temp': float(v.get('rtc_temp', 30.0))
    })

items.sort(key=lambda x: x['ts'])
print(f"Total points loaded: {len(items)}")

day1 = [x for x in items if x['dt'].day == 11 and 6 <= x['dt'].hour <= 18]
print(f"Day 1 (Nov 11, 06:00 - 18:00) points: {len(day1)}")

print("\n--- SAMPLE HOURLY POINTS FROM RAW history_backup_nov11_nov12.json ---")
for target_h, target_m in [(7,30), (8,30), (9,30), (10,30), (11,30), (12,30), (13,30), (14,30), (15,30), (16,30), (17,0)]:
    closest = min(day1, key=lambda x: abs((x['dt'].hour * 60 + x['dt'].minute) - (target_h * 60 + target_m)))
    print(f"{closest['dt'].strftime('%H:%M:%S')} -> P_trk: {closest['p_trk']:.2f} W, P_sta: {closest['p_sta']:.2f} W, Wh_trk: {closest['wh_trk']:.2f}, Wh_sta: {closest['wh_sta']:.2f}, V_trk: {closest['v_trk']:.2f} V, I_trk: {closest['i_trk']:.2f} A, Temp: {closest['temp']:.1f} C")

import docx

print("\n=== COMPARING CHART DATA (generate_charts.py) VS TABLE 4.2 IN DOCX ===")
print(f"Chart day1 points: {len(day1)}")
p_trk_max = max(x['p_trk'] for x in day1)
p_sta_max = max(x['p_sta'] for x in day1)
wh_trk_max = max(x['wh_trk'] for x in day1)
wh_sta_max = max(x['wh_sta'] for x in day1)
print(f"Chart P_trk max: {p_trk_max:.2f} W, Chart P_sta max: {p_sta_max:.2f} W")
print(f"Chart Wh_trk max: {wh_trk_max:.2f} Wh, Chart Wh_sta max: {wh_sta_max:.2f} Wh")
print(f"Chart Wh_trk at end: {day1[-1]['wh_trk']:.4f} Wh, Chart Wh_sta at end: {day1[-1]['wh_sta']:.4f} Wh")

doc = docx.Document('THUYẾT MINH backup.docx')
t9 = doc.tables[9]
print("\nTable 4.2 in Word document:")
for r in t9.rows[1:]:
    cells = [c.text.strip() for c in r.cells]
    print(f"Time {cells[0]}: P_trk={cells[1]}W, P_sta={cells[2]}W, Wh_trk={cells[3]}Wh, Wh_sta={cells[4]}Wh, Gain={cells[8]}")

print("\n=== MATHEMATICAL VERIFICATION OF GAIN % ===")

# 1. Overall gain from P567-P570: Wh_trk = 769.5, Wh_sta = 599.5
wh_trk_total = 769.5
wh_sta_total = 599.5
calc_gain_total = ((wh_trk_total - wh_sta_total) / wh_sta_total) * 100.0
print(f"Overall Gain from 769.5 Wh vs 599.5 Wh:")
print(f"  Calculated: {calc_gain_total:.4f}%")
print(f"  Document claim (P570): + 28.36%")
print(f"  Document claim (P580, Table 4.2 row 11): + 28.4%")
print(f"  Matches: {abs(calc_gain_total - 28.35696) < 0.01}")

# 2. What about the numbers in P555: Wh_trk = 682.4 Wh, Wh_sta = 518.2 Wh?
wh_trk_p555 = 682.4
wh_sta_p555 = 518.2
gain_p555 = ((wh_trk_p555 - wh_sta_p555) / wh_sta_p555) * 100.0
print(f"\nGain from P555 values (682.4 Wh vs 518.2 Wh):")
print(f"  Calculated: {gain_p555:.4f}%")
print(f"  Notice: 682.4 / 518.2 gives +31.69%!")

# 3. Peak clear sky claim: +34.62%
print(f"\nClear sky peak claim (P571, P580): +34.62% (or '28.4% đến 34.6%')")
# Where does 34.62% come from?
# If Gain = 34.62%, then Wh_trk = 1.3462 * Wh_sta.
# Earlier we saw full_history_backup_before_all_rescale.json matched '34.62'!
# Let's inspect where '34.62' appeared in full_history_backup_before_all_rescale.json or code!

# 4. Table 4.2 Gain column verification for each row
print("\n--- Table 4.2 Row-by-Row Gain Verification ---")
# Headers: ['Thời gian', 'P_trk (W)', 'P_sta (W)', 'Wh_trk', 'Wh_sta', 'Voc_trk (V)', 'Isc_trk (A)', 'Nhiệt độ (°C)', 'Hiệu quả Gain (%)']
for r_idx, r in enumerate(t9.rows[1:], 1):
    c = [cell.text.strip() for cell in r.cells]
    t_str = c[0]
    p_t = float(c[1])
    p_s = float(c[2])
    wh_t = float(c[3])
    wh_s = float(c[4])
    reported_gain = c[8]
    
    # Calculate power gain
    p_gain = ((p_t - p_s) / p_s) * 100.0
    # Calculate energy gain
    wh_gain = ((wh_t - wh_s) / wh_s) * 100.0
    
    print(f"Row {r_idx:2d} ({t_str}): P_trk={p_t:5.2f}, P_sta={p_s:5.2f} -> P_gain={p_gain:+6.2f}% | Wh_trk={wh_t:5.1f}, Wh_sta={wh_s:5.1f} -> Wh_gain={wh_gain:+6.2f}% | Reported: {reported_gain}")

# 5. Morning gain claim: +75% or 50% đến 75%
print("\nMorning gain claim verification:")
print("P551 claims: 'công suất phát chỉ đạt từ 15W đến 35W... sản sinh công suất tức thời vượt trội lên tới 55W đến 80W (cao hơn từ 50% đến 75% so với giàn cố định)'")
print(f"Row 1 (07:30): P_trk=38.45W, P_sta=21.10W -> P_gain = {((38.45-21.10)/21.10)*100:.2f}%, Wh_gain = {((28.5-16.2)/16.2)*100:.2f}% (Reported: + 75.9%)")
print(f"Row 2 (08:30): P_trk=62.18W, P_sta=38.40W -> P_gain = {((62.18-38.40)/38.40)*100:.2f}%, Wh_gain = {((79.2-46.1)/46.1)*100:.2f}% (Reported: + 71.8%)")


print("\n=== DETAILED STEP-BY-STEP COMPARISON: BENCH WIZARD B0 - B15 ===")
with open('firmware/esp32_devkit_test/src/bench_wizard.cpp', 'r', encoding='utf-8') as f:
    cpp_content = f.read()

import re

# Extract names from bench_wizard.cpp
n_start = cpp_content.find("names[TOTAL_BENCH_STEPS]")
n_end = cpp_content.find("};", n_start)
names_block = cpp_content[n_start:n_end]
fw_names = re.findall(r'"([^"]+)"', names_block)

# Extract descs from bench_wizard.cpp
d_start = cpp_content.find("descs[TOTAL_BENCH_STEPS]")
d_end = cpp_content.find("};", d_start)
descs_block = cpp_content[d_start:d_end]
fw_descs = re.findall(r'"([^"]+)"', descs_block)

# Extract from BENCH_AND_OPERATION_MANUAL.md
with open('BENCH_AND_OPERATION_MANUAL.md', 'r', encoding='utf-8') as f:
    man_content = f.read()

# Let's match markdown table rows
# | **B0** | Driver DM556 Pulses & SW | **BẮT BUỘC** | `E_PULSES_PER_REV_AZ` | Phát 1000 xung kiểm tra... |
man_steps = {}
for line in man_content.splitlines():
    m = re.match(r'\|\s*\*\*B(\d+)\*\*\s*\|\s*([^\|]+)\|\s*([^\|]+)\|\s*([^\|]+)\|\s*([^\|]+)\|', line)
    if m:
        step_num = int(m.group(1))
        man_steps[step_num] = {
            'name': m.group(2).strip(),
            'gating': m.group(3).strip(),
            'param': m.group(4).strip(),
            'method': m.group(5).strip()
        }

t8 = doc.tables[8]
print(f"{'Step':<5} | {'Docx Table 4.1 Item':<35} | {'Firmware Step Name':<32} | {'Status'}")
print("-" * 105)
for i in range(16):
    doc_row = [c.text.strip().replace('\n', ' ') for c in t8.rows[i+1].cells]
    doc_item = doc_row[1]
    fw_name = fw_names[i] if i < len(fw_names) else "N/A"
    
    # Check match
    is_match = False
    # Loose check
    if (i == 1 and "chiều quay" in doc_item.lower()) or \
       (i == 7 and "độ rơ" in doc_item.lower()) or \
       (i == 8 and "s-curve" in doc_item.lower()):
        match_status = "PARTIAL / REORDERED"
    else:
        match_status = "MISMATCH / OUT OF ORDER"
    
    print(f"B{i:<4} | {doc_item:<35} | {fw_name:<32} | {match_status}")
    print(f"      Docx Method: {doc_row[2]}")
    print(f"      Docx Criteria: {doc_row[3]}")
    if i in man_steps:
        print(f"      Manual Desc: {man_steps[i]['method']}")
    print()
