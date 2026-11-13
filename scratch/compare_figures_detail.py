# -*- coding: utf-8 -*-
import docx

doc = docx.Document('THUYẾT MINH backup.docx')

# List of figures
fig_items = []
for i in range(216, 227):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if not txt:
        continue
    parts = txt.rsplit('\t', 1)
    fig_items.append((i, parts[0].strip(), parts[1].strip() if len(parts) > 1 else ''))

# Body figures
body_figures = []
for i in range(270, len(doc.paragraphs)):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if p.style.name in ['Hinh', 'Hình', 'Caption'] or txt.startswith('Hình'):
        body_figures.append((i, txt))

print(f"List of figures count: {len(fig_items)} | Body figures count: {len(body_figures)}")

for idx in range(max(len(fig_items), len(body_figures))):
    fi = fig_items[idx] if idx < len(fig_items) else None
    bf = body_figures[idx] if idx < len(body_figures) else None
    
    f_text = fi[1] if fi else "<None>"
    b_text = bf[1] if bf else "<None>"
    
    # compare normalized
    is_match = (f_text.lower() == b_text.lower())
    print(f"\nItem {idx+1}:")
    print(f"  Frontmatter LOF: '{f_text}'")
    print(f"  Body Caption:    '{b_text}'")
    print(f"  Match? {is_match}")
