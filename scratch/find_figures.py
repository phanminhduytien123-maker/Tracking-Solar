# -*- coding: utf-8 -*-
import docx

doc = docx.Document('THUYẾT MINH backup.docx')

print("--- ALL PARAGRAPHS CONTAINING 'HÌNH' OR 'Hình' ---")
for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if 'hình' in txt.lower() and ('2.' in txt or '3.' in txt or '4.' in txt or '1.' in txt):
        print(f"P{i} [{p.style.name}]: '{txt}'")

print("\n--- ALL INLINE SHAPES (IMAGES) IN DOCUMENT ---")
for i, p in enumerate(doc.paragraphs):
    # Check if paragraph has drawing or blip
    xml = p._p.xml
    if 'w:drawing' in xml or 'a:blip' in xml or 'w:pict' in xml:
        print(f"P{i} has image/drawing! Following text: '{p.text[:50]}'")
        if i + 1 < len(doc.paragraphs):
            print(f"   Next P{i+1}: '{doc.paragraphs[i+1].text[:80]}'")

