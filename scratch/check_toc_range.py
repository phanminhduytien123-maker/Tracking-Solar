# -*- coding: utf-8 -*-
import docx

doc = docx.Document('THUYẾT MINH backup.docx')

print(f"Total paragraphs: {len(doc.paragraphs)}")

for i in range(158, 220):
    p = doc.paragraphs[i]
    txt = repr(p.text)
    print(f"P{i} [{p.style.name}]: {txt}")
