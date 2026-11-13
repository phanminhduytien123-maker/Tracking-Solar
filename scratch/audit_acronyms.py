# -*- coding: utf-8 -*-
"""
audit_acronyms.py - Verify Acronyms table against document body
"""

import docx

doc = docx.Document('THUYẾT MINH backup.docx')

# Find Acronyms table (Table 2)
acronym_tbl = doc.tables[2]
print(f"Acronyms Table: {len(acronym_tbl.rows)} rows x {len(acronym_tbl.columns)} cols")

acronyms_in_table = []
for r_idx, r in enumerate(acronym_tbl.rows):
    if r_idx == 0:
        print(f"Header: {[c.text.strip() for c in r.cells]}")
        continue
    short = r.cells[0].text.strip()
    full = r.cells[1].text.strip()
    acronyms_in_table.append((short, full))

print(f"Total Acronyms defined in Table: {len(acronyms_in_table)}")

# Get all text from document body
body_text = ""
for p in doc.paragraphs[270:]:
    body_text += p.text + " "

for tbl in doc.tables[3:]:
    for r in tbl.rows:
        for c in r.cells:
            body_text += c.text + " "

print("\nVerifying presence of each acronym in the document body:")
all_found = True
for short, full in acronyms_in_table:
    count = body_text.count(short)
    found = count > 0
    print(f"  {short:<6}: count = {count:<3} | {'[PASS]' if found else '[FAIL]'} ({full})")
    if not found:
        all_found = False

if all_found:
    print(f"\n[PASS] All {len(acronyms_in_table)} acronyms are actively used and substantiated in the document body!")
else:
    print("\n[WARNING] Some acronyms were not found in the body!")
