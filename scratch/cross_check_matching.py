# -*- coding: utf-8 -*-
"""
cross_check_matching.py
Check:
1. TOC items vs Body Headings (Chapters and Sections)
2. List of Figures vs Body Figure Captions & images
3. List of Tables vs Body Table Captions & tables
4. Acronyms table content and format
5. Table 10 (References) details
6. Paragraph font, size, line spacing, first line indent distribution
"""

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Inches

doc = docx.Document('THUYẾT MINH backup.docx')

print("="*60)
print("1. CHECKING TOC VS BODY HEADINGS")
print("="*60)

# Extract TOC items
toc_items = []
for i in range(160, 203):
    txt = doc.paragraphs[i].text.strip()
    if txt:
        parts = txt.rsplit('\t', 1)
        title = parts[0].strip()
        page = parts[1].strip() if len(parts) > 1 else ''
        toc_items.append((i, doc.paragraphs[i].style.name, title, page))

print(f"Total TOC items: {len(toc_items)}")

# Extract Body Headings
# Body starts at Chapter 1 (P273)
body_headings = []
for i in range(270, len(doc.paragraphs)):
    p = doc.paragraphs[i]
    sname = p.style.name
    txt = p.text.strip()
    if sname in ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4'] and txt:
        body_headings.append((i, sname, txt))

print(f"Total Body Headings: {len(body_headings)}")
for i, sname, txt in body_headings:
    print(f"  P{i} [{sname}]: {txt}")

print("\n--- MATCHING TOC WITH BODY HEADINGS ---")
# Chapters in TOC:
toc_chapters = [item for item in toc_items if item[1] == 'toc 2']
body_chapters = [h for h in body_headings if h[1] == 'Heading 2']

print(f"TOC Chapters: {len(toc_chapters)} | Body Chapters: {len(body_chapters)}")
for tc, bc in zip(toc_chapters, body_chapters):
    print(f"  TOC: '{tc[2]}' (pg {tc[3]}) <==> BODY: '{bc[2]}'")

# Sections in TOC:
toc_sections = [item for item in toc_items if item[1] == 'toc 3']
body_sections = [h for h in body_headings if h[1] == 'Heading 3']

print(f"\nTOC Sections: {len(toc_sections)} | Body Sections: {len(body_sections)}")
for idx, (ts, bs) in enumerate(zip(toc_sections, body_sections)):
    # normalize check
    match = ts[2].strip().lower() == bs[2].strip().lower()
    print(f"  {'[OK]' if match else '[MISMATCH]'} TOC: '{ts[2]}' <==> BODY: '{bs[2]}'")

print("\n" + "="*60)
print("2. CHECKING LIST OF FIGURES VS BODY FIGURE CAPTIONS")
print("="*60)

fig_items = []
for i in range(216, 227):
    txt = doc.paragraphs[i].text.strip()
    if txt:
        parts = txt.rsplit('\t', 1)
        title = parts[0].strip()
        page = parts[1].strip() if len(parts) > 1 else ''
        fig_items.append((i, title, page))

print(f"Total items in List of Figures: {len(fig_items)}")
for item in fig_items:
    print(f"  List of Figures: '{item[1]}' (pg {item[2]})")

# Find figure captions in body
# Search for paragraphs with "Hình" or "HÌNH" or style 'Hinh' / 'Caption'
body_figures = []
for i in range(270, len(doc.paragraphs)):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if p.style.name in ['Hinh', 'Caption', 'Bang'] or txt.upper().startswith('HÌNH') or txt.startswith('Hình'):
        if 'HÌNH' in txt.upper() and ('2.' in txt or '3.' in txt or '4.' in txt or '1.' in txt or '5.' in txt):
            body_figures.append((i, p.style.name, txt))

print(f"\nBody Figure Captions found: {len(body_figures)}")
for bf in body_figures:
    print(f"  P{bf[0]} [{bf[1]}]: '{bf[2]}'")

print("\n--- MATCHING LIST OF FIGURES VS BODY FIGURE CAPTIONS ---")
for idx, fi in enumerate(fig_items):
    matched = None
    for bf in body_figures:
        if fi[1].lower() in bf[2].lower() or bf[2].lower() in fi[1].lower():
            matched = bf
            break
    if matched:
        print(f"  [OK] Fig {idx+1}: '{fi[1]}' <==> P{matched[0]}: '{matched[2]}'")
    else:
        print(f"  [FAIL/UNMATCHED] Fig {idx+1}: '{fi[1]}'")

print("\n" + "="*60)
print("3. CHECKING LIST OF TABLES VS BODY TABLE CAPTIONS")
print("="*60)

tbl_items = []
for i in range(240, 247):
    txt = doc.paragraphs[i].text.strip()
    if txt:
        parts = txt.rsplit('\t', 1)
        title = parts[0].strip()
        page = parts[1].strip() if len(parts) > 1 else ''
        tbl_items.append((i, title, page))

print(f"Total items in List of Tables: {len(tbl_items)}")
for item in tbl_items:
    print(f"  List of Tables: '{item[1]}' (pg {item[2]})")

# Find table captions in body
body_tables_captions = []
for i in range(270, len(doc.paragraphs)):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if p.style.name in ['Bang', 'Caption'] or txt.startswith('Bảng'):
        if 'Bảng' in txt and ('.' in txt):
            body_tables_captions.append((i, p.style.name, txt))

print(f"\nBody Table Captions found: {len(body_tables_captions)}")
for bt in body_tables_captions:
    print(f"  P{bt[0]} [{bt[1]}]: '{bt[2]}'")

print("\n--- MATCHING LIST OF TABLES VS BODY TABLE CAPTIONS ---")
for idx, ti in enumerate(tbl_items):
    matched = None
    for bt in body_tables_captions:
        if ti[1].lower() in bt[2].lower() or bt[2].lower() in ti[1].lower():
            matched = bt
            break
    if matched:
        print(f"  [OK] Table {idx+1}: '{ti[1]}' <==> P{matched[0]}: '{matched[2]}'")
    else:
        print(f"  [FAIL/UNMATCHED] Table {idx+1}: '{ti[1]}'")

