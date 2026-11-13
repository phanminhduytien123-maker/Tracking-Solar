# -*- coding: utf-8 -*-
"""
master_format_audit.py - Complete Master Audit of THUYẾT MINH backup.docx
Produces verified statistics and checklist for the final audit report.
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import docx
import win32com.client
from docx.shared import Pt, Cm

DOC_PATH = 'THUYẾT MINH backup.docx'

def audit_all():
    results = {}
    
    # 1. XML Integrity
    zf = zipfile.ZipFile(DOC_PATH, 'r')
    corrupt = zf.testzip()
    xml_parts = [f for f in zf.namelist() if f.endswith('.xml') or f.endswith('.rels')]
    all_xml_parsed = True
    for part in xml_parts:
        try:
            ET.fromstring(zf.read(part))
        except:
            all_xml_parsed = False
    zf.close()
    
    results['zip_valid'] = (corrupt is None)
    results['xml_parts_count'] = len(xml_parts)
    results['all_xml_parsed'] = all_xml_parsed
    
    # 2. Word COM
    word = win32com.client.DispatchEx('Word.Application')
    word.Visible = False
    word.DisplayAlerts = 0
    wdoc = word.Documents.Open(os.path.abspath(DOC_PATH), ReadOnly=True)
    
    results['word_pages'] = wdoc.ComputeStatistics(2)
    results['word_words'] = wdoc.ComputeStatistics(0)
    results['word_paragraphs'] = wdoc.Paragraphs.Count
    results['word_tables'] = wdoc.Tables.Count
    results['word_shapes'] = wdoc.InlineShapes.Count
    results['word_sections'] = wdoc.Sections.Count
    
    sections_margins = []
    for s_idx in range(1, wdoc.Sections.Count + 1):
        sec = wdoc.Sections(s_idx)
        ps = sec.PageSetup
        sections_margins.append({
            'section': s_idx,
            'top_cm': round(ps.TopMargin / 28.3465, 2),
            'bottom_cm': round(ps.BottomMargin / 28.3465, 2),
            'left_cm': round(ps.LeftMargin / 28.3465, 2),
            'right_cm': round(ps.RightMargin / 28.3465, 2),
            'page_w_cm': round(ps.PageWidth / 28.3465, 2),
            'page_h_cm': round(ps.PageHeight / 28.3465, 2)
        })
    results['sections_margins'] = sections_margins
    wdoc.Close(False)
    word.Quit()
    
    # 3. Python-docx structure
    doc = docx.Document(DOC_PATH)
    
    # Headings
    h2 = [(i, p.text.strip()) for i, p in enumerate(doc.paragraphs) if p.style.name == 'Heading 2']
    h3 = [(i, p.text.strip()) for i, p in enumerate(doc.paragraphs) if p.style.name == 'Heading 3']
    h4 = [(i, p.text.strip()) for i, p in enumerate(doc.paragraphs) if p.style.name == 'Heading 4']
    
    results['h2_count'] = len(h2)
    results['h3_count'] = len(h3)
    results['h4_count'] = len(h4)
    results['h2_list'] = h2
    results['h3_list'] = h3
    results['h4_list'] = h4
    
    # Tables
    results['total_docx_tables'] = len(doc.tables)
    
    # Acronyms Table (doc.tables[2])
    acronym_rows = []
    for r_idx, r in enumerate(doc.tables[2].rows):
        if r_idx == 0:
            continue
        acronym_rows.append((r.cells[0].text.strip(), r.cells[1].text.strip()))
    results['acronyms'] = acronym_rows
    
    # References Table (doc.tables[10])
    ref_rows = []
    for r in doc.tables[10].rows:
        ref_rows.append((r.cells[0].text.strip(), r.cells[1].text.strip()))
    results['references'] = ref_rows
    
    # Figures captions in body
    body_figs = []
    for i in range(270, len(doc.paragraphs)):
        p = doc.paragraphs[i]
        txt = p.text.strip()
        if (p.style.name in ['Hinh', 'Hình', 'Caption'] or txt.startswith('Hình')) and txt:
            body_figs.append((i, txt))
    results['body_figures'] = body_figs
    
    # Tables captions in body
    body_tbls = []
    for i in range(270, len(doc.paragraphs)):
        p = doc.paragraphs[i]
        txt = p.text.strip()
        if (p.style.name in ['Bang', 'Bảng', 'Caption'] or txt.startswith('Bảng')) and txt:
            body_tbls.append((i, txt))
    results['body_tables'] = body_tbls

    # Print summary
    print("\n" + "="*70)
    print("MASTER AUDIT EXECUTION SUMMARY")
    print("="*70)
    print(f"File: {DOC_PATH}")
    print(f"File Size: {os.path.getsize(DOC_PATH):,} bytes")
    print(f"Zip Integrity: {'PASS' if results['zip_valid'] else 'FAIL'}")
    print(f"XML Parts Count: {results['xml_parts_count']} (All parsed: {results['all_xml_parsed']})")
    print(f"Word COM Load: PASS (Pages: {results['word_pages']}, Words: {results['word_words']})")
    print(f"Sections Margins:")
    for sm in results['sections_margins']:
        print(f"  Sec {sm['section']}: Top {sm['top_cm']}cm, Bottom {sm['bottom_cm']}cm, Left {sm['left_cm']}cm, Right {sm['right_cm']}cm (A4: {sm['page_w_cm']}x{sm['page_h_cm']}cm)")
    print(f"Headings: {results['h2_count']} Chapters (H2), {results['h3_count']} Sections (H3), {results['h4_count']} Subsections (H4)")
    print(f"Body Figures: {len(results['body_figures'])} captions")
    for f in results['body_figures']:
        print(f"  {f[1]}")
    print(f"Body Tables: {len(results['body_tables'])} captions")
    for t in results['body_tables']:
        print(f"  {t[1]}")
    print(f"Acronyms Table: {len(results['acronyms'])} entries")
    print(f"References Table: {len(results['references'])} citations, 2 columns")
    for r in results['references']:
        print(f"  {r[0]} {r[1][:60]}...")
    print("="*70)

if __name__ == '__main__':
    audit_all()
