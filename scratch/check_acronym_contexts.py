# -*- coding: utf-8 -*-
import docx
import re

doc = docx.Document('THUYẾT MINH backup.docx')

body_text = ""
for p in doc.paragraphs[270:]:
    body_text += p.text + " "

for tbl in doc.tables[3:]:
    for r in tbl.rows:
        for c in r.cells:
            body_text += c.text + " "

for word in ["PV", "FLC", "MPPT", "FOTA", "OTA"]:
    matches = re.findall(rf"\b{word}\b", body_text, re.IGNORECASE)
    exact_matches = re.findall(rf"\b{word}\b", body_text)
    print(f"Word: {word} -> regex exact: {len(exact_matches)}, case-insensitive: {len(matches)}")
    if matches:
        # print first 2 occurrences
        for m in re.finditer(rf"\b{word}\b", body_text, re.IGNORECASE):
            start = max(0, m.start() - 30)
            end = min(len(body_text), m.end() + 30)
            print(f"   Context: ...{body_text[start:end]}...")
            break
