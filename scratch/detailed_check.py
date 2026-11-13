# -*- coding: utf-8 -*-
"""
detailed_check.py - In-depth check of TOC, Figures, Tables, Acronyms, References
"""

import docx
from docx.oxml import parse_xml
import re

DOC_PATH = 'THUYẾT MINH backup.docx'

doc = docx.Document(DOC_PATH)

print("--- LOCATING FRONTMATTER SECTIONS ---")
toc_paras = []
fig_paras = []
tbl_paras = []
acronym_tbl = None

in_toc = False
in_figs = False
in_tbls = False

for i, p in enumerate(doc.paragraphs[:300]):
    txt = p.text.strip()
    if txt == "MỤC LỤC":
        in_toc = True
        in_figs = False
        in_tbls = False
        print(f"MỤC LỤC found at P{i}")
        continue
    elif txt == "DANH MỤC HÌNH ẢNH":
        in_toc = False
        in_figs = True
        in_tbls = False
        print(f"DANH MỤC HÌNH ẢNH found at P{i}")
        continue
    elif txt == "DANH MỤC BẢNG BIỂU":
        in_toc = False
        in_figs = False
        in_tbls = True
        print(f"DANH MỤC BẢNG BIỂU found at P{i}")
        continue
    elif txt == "DANH MỤC TỪ VIẾT TẮT":
        in_toc = False
        in_figs = False
        in_tbls = False
        print(f"DANH MỤC TỪ VIẾT TẮT found at P{i}")
        continue
    elif "CHƯƠNG 1:" in txt or (p.style.name == 'Heading 2' and "GIỚI THIỆU" in txt):
        in_toc = False
        in_figs = False
        in_tbls = False

    if in_toc and txt:
        toc_paras.append((i, p.style.name, txt))
    elif in_figs and txt:
        fig_paras.append((i, p.style.name, txt))
    elif in_tbls and txt:
        tbl_paras.append((i, p.style.name, txt))

print(f"\nTOC items count: {len(toc_paras)}")
for idx, (p_idx, sname, t) in enumerate(toc_paras):
    print(f"  TOC[{idx+1}] (P{p_idx}, {sname}): {t}")

print(f"\nFigure list items count: {len(fig_paras)}")
for idx, (p_idx, sname, t) in enumerate(fig_paras):
    print(f"  FIG[{idx+1}] (P{p_idx}, {sname}): {t}")

print(f"\nTable list items count: {len(tbl_paras)}")
for idx, (p_idx, sname, t) in enumerate(tbl_paras):
    print(f"  TBL[{idx+1}] (P{p_idx}, {sname}): {t}")

# Check tables in document
print(f"\nTotal tables in doc: {len(doc.tables)}")
for idx, tbl in enumerate(doc.tables):
    rows = len(tbl.rows)
    cols = len(tbl.columns)
    first_cell = tbl.rows[0].cells[0].text.strip().replace('\n', ' ') if tbl.rows else ''
    last_cell = tbl.rows[0].cells[-1].text.strip().replace('\n', ' ') if tbl.rows else ''
    print(f"Table {idx}: {rows} rows x {cols} cols | First: '{first_cell[:30]}' | Last: '{last_cell[:30]}'")

# Inspect acronyms table (likely Table 0 or 1)
print("\n--- ACRONYMS TABLE ---")
# Let's find which table is acronyms
for idx, tbl in enumerate(doc.tables):
    txt0 = tbl.rows[0].cells[0].text.strip()
    if "Ký hiệu" in txt0 or "Từ viết tắt" in txt0 or "Viết tắt" in txt0 or "PV" in txt0:
        print(f"Table {idx} looks like Acronyms Table:")
        for r_idx, r in enumerate(tbl.rows):
            print(f"  Row {r_idx}: {[c.text.strip() for c in r.cells]}")

# Inspect Reference Table
print("\n--- REFERENCES TABLE ---")
ref_tbl = doc.tables[-1]
print(f"Last Table (idx={len(doc.tables)-1}): {len(ref_tbl.rows)} rows x {len(ref_tbl.columns)} cols")
for r_idx, r in enumerate(ref_tbl.rows):
    print(f"  Row {r_idx+1}: Col1='{r.cells[0].text.strip()}' | Col2='{r.cells[1].text.strip()}'")

