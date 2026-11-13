# -*- coding: utf-8 -*-
"""
verify_page_numbers_com.py - Use Word COM to find the exact page number of every heading, figure, and table!
"""

import os
import win32com.client

doc_abs_path = os.path.abspath('THUYẾT MINH backup.docx')

word = win32com.client.DispatchEx('Word.Application')
word.Visible = False
word.DisplayAlerts = 0

doc = word.Documents.Open(doc_abs_path, ReadOnly=True)

print("=== VERIFYING ACTUAL PAGE NUMBERS VIA WORD COM ===")

# 1. Check all Headings and their actual pages
headings_pages = []
for p in doc.Paragraphs:
    sname = p.Style.NameLocal
    if sname in ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4']:
        txt = p.Range.Text.strip().replace('\r', '').replace('\x07', '')
        pg = p.Range.Information(3) # wdActiveEndPageNumber
        headings_pages.append((sname, txt, pg))

print(f"\nFound {len(headings_pages)} headings:")
for sname, txt, pg in headings_pages:
    print(f"  [{sname}] Page {pg:02d}: {txt[:60]}")

# 2. Check all Figures and their actual pages
figures_pages = []
for p in doc.Paragraphs:
    sname = p.Style.NameLocal
    txt = p.Range.Text.strip().replace('\r', '').replace('\x07', '')
    if sname in ['Hình', 'Hinh'] or txt.startswith('Hình') or txt.startswith('HÌNH'):
        if 'Hình' in txt or 'HÌNH' in txt:
            pg = p.Range.Information(3)
            figures_pages.append((txt, pg))

print(f"\nFound {len(figures_pages)} figure captions:")
for txt, pg in figures_pages:
    print(f"  Page {pg:02d}: {txt[:70]}")

# 3. Check all Tables and their actual pages
tables_pages = []
for p in doc.Paragraphs:
    sname = p.Style.NameLocal
    txt = p.Range.Text.strip().replace('\r', '').replace('\x07', '')
    if sname in ['Bang', 'Bảng'] or txt.startswith('Bảng') or txt.startswith('BẢNG'):
        if 'Bảng' in txt or 'BẢNG' in txt:
            pg = p.Range.Information(3)
            tables_pages.append((txt, pg))

print(f"\nFound {len(tables_pages)} table captions:")
for txt, pg in tables_pages:
    print(f"  Page {pg:02d}: {txt[:70]}")

doc.Close(False)
word.Quit()
