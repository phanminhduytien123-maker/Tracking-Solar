# -*- coding: utf-8 -*-
"""
audit_layout_details.py - Audit font, size, line spacing, indent on all body paragraphs
"""

import docx
from docx.shared import Pt, Inches

doc = docx.Document('THUYẾT MINH backup.docx')

body_start = 270 # P270 is right before Chapter 1
body_end = len(doc.paragraphs)

total_body_paras = 0
normal_body_paras = 0

font_distribution = {}
size_distribution = {}
line_spacing_distribution = {}
indent_distribution = {}

non_standard_paras = []

for i in range(body_start, body_end):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if not txt:
        continue
    
    total_body_paras += 1
    sname = p.style.name
    
    # We focus on Normal / body text paragraphs (excluding Headings, Bang, Hinh)
    if sname in ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Bang', 'Hinh', 'Caption']:
        continue
        
    normal_body_paras += 1
    
    # Check runs or paragraph format
    pf = p.paragraph_format
    ls = pf.line_spacing
    fli = pf.first_line_indent.pt if pf.first_line_indent is not None else None
    
    # Check font in runs or style
    fonts = set()
    sizes = set()
    for r in p.runs:
        if r.text.strip():
            f_name = r.font.name or p.style.font.name or "Normal Default"
            f_size = r.font.size.pt if r.font.size else (p.style.font.size.pt if p.style.font.size else "Default")
            fonts.add(f_name)
            sizes.add(f_size)
            
    f_str = ", ".join(str(f) for f in fonts) if fonts else "Style Default"
    s_str = ", ".join(str(s) for s in sizes) if sizes else "Style Default"
    
    font_distribution[f_str] = font_distribution.get(f_str, 0) + 1
    size_distribution[s_str] = size_distribution.get(s_str, 0) + 1
    line_spacing_distribution[str(ls)] = line_spacing_distribution.get(str(ls), 0) + 1
    indent_distribution[str(fli)] = indent_distribution.get(str(fli), 0) + 1
    
    # Check if anomalous
    is_anomaly = False
    if f_str not in ["Times New Roman", "Style Default"]:
        is_anomaly = True
    if s_str not in ["13.0", "Style Default"]:
        is_anomaly = True
    if ls not in [1.5, None]:
        is_anomaly = True
    if is_anomaly:
        non_standard_paras.append((i, sname, f_str, s_str, ls, fli, txt[:50]))

print(f"Total body paragraphs (including headings/captions): {total_body_paras}")
print(f"Normal body content paragraphs: {normal_body_paras}")
print("\nFont Distribution:")
for k, v in font_distribution.items():
    print(f"  {k}: {v} paragraphs")

print("\nFont Size Distribution:")
for k, v in size_distribution.items():
    print(f"  {k}: {v} paragraphs")

print("\nLine Spacing Distribution:")
for k, v in line_spacing_distribution.items():
    print(f"  {k}: {v} paragraphs")

print("\nFirst Line Indent Distribution:")
for k, v in indent_distribution.items():
    print(f"  {k}: {v} paragraphs")

if non_standard_paras:
    print(f"\nNon-standard paragraphs ({len(non_standard_paras)}):")
    for item in non_standard_paras[:20]:
        print(f"  P{item[0]} [{item[1]}]: Font={item[2]}, Size={item[3]}, LS={item[4]}, Indent={item[5]} | '{item[6]}'")
else:
    print("\n[ALL PASS] 100% of body paragraphs adhere to academic standard!")
