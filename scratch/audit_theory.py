# -*- coding: utf-8 -*-
"""
audit_theory.py: Audit script for Chapter 2 and Chapter 3 of THUYẾT MINH backup.docx
Cross-checks:
1. ESP32-S3 architecture, PCNT x4, I2C, ADC1
2. NEMA 23 + DM556 microstepping (1600 pulses/rev) & 50% idle current reduction
3. Encoder 3806 400 PPR resolution (0.225 deg)
4. TEMT6000 optical differential circuit & formulas
5. NOAA solar ephemeris equations vs python_sim/solar_ephemeris.py
6. 49 Mamdani fuzzy rules and PSO ITAE formulation
7. MDPI Sustainability Voc/Isc measurement method
8. KiCad All-In-One Mainboard schematics, isolated power, 6-relay switching table
"""

import docx
import re
import math

doc = docx.Document("THUYẾT MINH backup.docx")

print("=== DOCX LOADED ===")
print("Paragraphs:", len(doc.paragraphs))
print("Tables:", len(doc.tables))

# 1. Fuzzy rules matrix decomposition
t_fuzzy = doc.tables[5]
headers = [c.text.strip() for c in t_fuzzy.rows[0].cells]
rule_rows = []
for r in t_fuzzy.rows[1:]:
    cells = [c.text.strip() for c in r.cells]
    rule_rows.append((cells[0], cells[1:]))

print("\n--- 49 Mamdani Rules Analysis ---")
labels = ['NB', 'NM', 'NS', 'ZE', 'PS', 'PM', 'PB']
for var_idx, var_name in enumerate(['Delta Kp', 'Delta Ki', 'Delta Kd']):
    print(f"\nMatrix for {var_name}:")
    print("e \\ de " + " ".join(f"{h:>4}" for h in headers[1:]))
    for row_lbl, row_vals in rule_rows:
        row_str = " ".join(f"{v.split('/')[var_idx]:>4}" for v in row_vals)
        print(f"{row_lbl:>6} " + row_str)

# 2. Check Table 3.1 MCU Pinout
t_pinout = doc.tables[6]
print("\n--- Table 3.1 Pinout Review ---")
for r in t_pinout.rows:
    vals = [c.text.strip().replace('\n', ' ') for c in r.cells]
    print(" | ".join(vals))

# 3. Check Table 3.2 Relay Switching
t_relay = doc.tables[7]
print("\n--- Table 3.2 6-Relay Switching Review ---")
for r in t_relay.rows:
    vals = [c.text.strip().replace('\n', ' ') for c in r.cells]
    print(" | ".join(vals))

# 4. Check Table 2.1 ESP32-S3 specs
t_esp = doc.tables[3]
print("\n--- Table 2.1 ESP32-S3 Specs Review ---")
for r in t_esp.rows:
    vals = [c.text.strip().replace('\n', ' ') for c in r.cells]
    print(" | ".join(vals))

# 5. Check Table 2.2 NEMA 23 & DM556
t_motor = doc.tables[4]
print("\n--- Table 2.2 NEMA 23 & DM556 Review ---")
for r in t_motor.rows:
    vals = [c.text.strip().replace('\n', ' ') for c in r.cells]
    print(" | ".join(vals))
