# -*- coding: utf-8 -*-
"""
audit_formatting.py - Comprehensive Format and Academic Standard Auditor
for THUYẾT MINH backup.docx
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor, Cm
import zipfile
import xml.etree.ElementTree as ET

DOC_PATH = 'THUYẾT MINH backup.docx'

def check_xml_integrity(file_path):
    print("=== (5) CHECKING XML INTEGRITY & FILE CORRUPTION ===")
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            corrupt = zf.testzip()
            if corrupt:
                print(f"[FAIL] Zip corruption detected in member: {corrupt}")
                return False
            print("[PASS] Zip archive is completely valid (testzip passed).")
            
            # List xml files and check parseability
            xml_files = [f for f in zf.namelist() if f.endswith('.xml') or f.endswith('.rels')]
            print(f"[PASS] Found {len(xml_files)} XML/RELS parts inside docx package.")
            for xf in xml_files:
                data = zf.read(xf)
                try:
                    ET.fromstring(data)
                except Exception as e:
                    print(f"[FAIL] XML Parsing error in {xf}: {e}")
                    return False
            print("[PASS] All XML and RELS parts parsed successfully. Zero corruption.")
            return True
    except Exception as e:
        print(f"[FAIL] Exception checking zip: {e}")
        return False

def check_margins_and_layout(doc):
    print("\n=== (1) CHECKING ACADEMIC LAYOUT & MARGINS ===")
    # Target margins: Top 3.5cm, Bottom 3.0cm, Left 3.5cm, Right 2.0cm
    # In cm: Top=3.5, Bottom=3.0, Left=3.5, Right=2.0
    for idx, section in enumerate(doc.sections):
        top_cm = section.top_margin.cm if section.top_margin else None
        bottom_cm = section.bottom_margin.cm if section.bottom_margin else None
        left_cm = section.left_margin.cm if section.left_margin else None
        right_cm = section.right_margin.cm if section.right_margin else None
        page_w_cm = section.page_width.cm if section.page_width else None
        page_h_cm = section.page_height.cm if section.page_height else None

        print(f"Section {idx+1}:")
        print(f"  Page Size: {page_w_cm:.2f} x {page_h_cm:.2f} cm")
        print(f"  Margins: Top={top_cm:.2f}cm, Bottom={bottom_cm:.2f}cm, Left={left_cm:.2f}cm, Right={right_cm:.2f}cm")
        
        # Verify tolerance within 0.05 cm
        top_ok = abs(top_cm - 3.5) < 0.05 if top_cm else False
        bottom_ok = abs(bottom_cm - 3.0) < 0.05 if bottom_cm else False
        left_ok = abs(left_cm - 3.5) < 0.05 if left_cm else False
        right_ok = abs(right_cm - 2.0) < 0.05 if right_cm else False
        
        if top_ok and bottom_ok and left_ok and right_ok:
            print(f"  [PASS] Section {idx+1} margins match exact academic requirements!")
        else:
            print(f"  [NOTE/CHECK] Section {idx+1} margins differ from 3.5/3.0/3.5/2.0: Top({top_ok}) Bottom({bottom_ok}) Left({left_ok}) Right({right_ok})")

    # Inspect font, line spacing, first line indent across paragraphs
    print("\nAuditing paragraph formatting across document body...")
    body_paragraphs = []
    font_issues = []
    spacing_issues = []
    indent_issues = []

    # Let's see style definitions
    styles = doc.styles
    normal_style = styles['Normal']
    print(f"Normal style font: {normal_style.font.name}, size: {normal_style.font.size}")
    if normal_style.paragraph_format:
        print(f"Normal line spacing: {normal_style.paragraph_format.line_spacing}, first_line_indent: {normal_style.paragraph_format.first_line_indent}")

    total_p = len(doc.paragraphs)
    print(f"Total paragraphs: {total_p}")

def check_headings(doc):
    print("\n=== (2) CHECKING HEADINGS HIERARCHY ===")
    # Heading 2 for Chapters, Heading 3 for Sections, Heading 4 for Subsections
    h2_list = []
    h3_list = []
    h4_list = []

    for i, p in enumerate(doc.paragraphs):
        sname = p.style.name if p.style else ''
        txt = p.text.strip()
        if not txt:
            continue
        if sname == 'Heading 2':
            h2_list.append((i, txt))
        elif sname == 'Heading 3':
            h3_list.append((i, txt))
        elif sname == 'Heading 4':
            h4_list.append((i, txt))

    print(f"Heading 2 count: {len(h2_list)}")
    for idx, (p_idx, txt) in enumerate(h2_list):
        print(f"  H2 [{idx+1}] (P{p_idx}): {txt}")

    print(f"\nHeading 3 count: {len(h3_list)}")
    for idx, (p_idx, txt) in enumerate(h3_list):
        print(f"  H3 [{idx+1}] (P{p_idx}): {txt}")

    print(f"\nHeading 4 count: {len(h4_list)}")
    for idx, (p_idx, txt) in enumerate(h4_list):
        print(f"  H4 [{idx+1}] (P{p_idx}): {txt}")

def check_frontmatter_and_matching(doc):
    print("\n=== (3) VERIFYING TOC, FIGURES, TABLES, ACRONYMS VS BODY ===")
    # We will locate TOC, List of Figures, List of Tables, Acronyms table
    # And compare with the body content
    pass

if __name__ == '__main__':
    doc = docx.Document(DOC_PATH)
    check_xml_integrity(DOC_PATH)
    check_margins_and_layout(doc)
    check_headings(doc)
