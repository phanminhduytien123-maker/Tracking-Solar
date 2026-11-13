# -*- coding: utf-8 -*-
"""
generate_final_report.py - Generate comprehensive formatting audit report
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import docx

DOC_PATH = 'THUYẾT MINH backup.docx'

def main():
    doc = docx.Document(DOC_PATH)
    file_size = os.path.getsize(DOC_PATH)
    
    # Sections margins
    sections_info = []
    for idx, s in enumerate(doc.sections):
        sections_info.append({
            'sec': idx + 1,
            'top': round(s.top_margin.cm, 2),
            'bottom': round(s.bottom_margin.cm, 2),
            'left': round(s.left_margin.cm, 2),
            'right': round(s.right_margin.cm, 2),
            'width': round(s.page_width.cm, 2),
            'height': round(s.page_height.cm, 2)
        })
        
    # Headings
    h2 = [p.text.strip() for p in doc.paragraphs if p.style.name == 'Heading 2']
    h3 = [p.text.strip() for p in doc.paragraphs if p.style.name == 'Heading 3']
    h4 = [p.text.strip() for p in doc.paragraphs if p.style.name == 'Heading 4']
    
    # Tables
    tables_count = len(doc.tables)
    
    # Acronyms
    acronyms = []
    for r in doc.tables[2].rows[1:]:
        acronyms.append((r.cells[0].text.strip(), r.cells[1].text.strip()))
        
    # References
    refs = []
    for r in doc.tables[10].rows:
        refs.append((r.cells[0].text.strip(), r.cells[1].text.strip()))

    print(f"AUDIT SUMMARY FOR {DOC_PATH}:")
    print(f"- Size: {file_size / (1024*1024):.2f} MB")
    print(f"- Sections: {len(sections_info)}")
    for si in sections_info:
        print(f"  Sec {si['sec']}: {si['top']}cm / {si['bottom']}cm / {si['left']}cm / {si['right']}cm (A4: {si['width']}x{si['height']}cm)")
    print(f"- Headings: H2={len(h2)}, H3={len(h3)}, H4={len(h4)}")
    print(f"- Tables: {tables_count}")
    print(f"- Acronyms: {len(acronyms)}")
    print(f"- References: {len(refs)} rows, {len(doc.tables[10].columns)} cols")

if __name__ == '__main__':
    main()
