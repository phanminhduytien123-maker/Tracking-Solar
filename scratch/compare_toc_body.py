# -*- coding: utf-8 -*-
import docx

doc = docx.Document('THUYẾT MINH backup.docx')

# Extract TOC items for chapters & sections
toc_items = []
for i in range(160, 203):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if not txt:
        continue
    parts = txt.rsplit('\t', 1)
    t = parts[0].strip()
    pg = parts[1].strip() if len(parts) > 1 else ''
    sname = p.style.name
    if sname in ['toc 2', 'toc 3']:
        toc_items.append((i, sname, t, pg))

# Extract body headings
body_headings = []
for i in range(270, len(doc.paragraphs)):
    p = doc.paragraphs[i]
    sname = p.style.name
    txt = p.text.strip()
    if not txt:
        continue
    if sname in ['Heading 2', 'Heading 3']:
        body_headings.append((i, sname, txt))

print(f"TOC items: {len(toc_items)} | Body headings: {len(body_headings)}")

# Compare pair by pair
discrepancies = []
for idx in range(max(len(toc_items), len(body_headings))):
    toc_entry = toc_items[idx] if idx < len(toc_items) else None
    body_entry = body_headings[idx] if idx < len(body_headings) else None
    
    t_text = toc_entry[2] if toc_entry else "<None>"
    b_text = body_entry[2] if body_entry else "<None>"
    
    # Strip numbering from toc_entry to compare title
    # e.g. "CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI" -> "GIỚI THIỆU ĐỀ TÀI"
    # "1.1. Tổng quan về hệ thống" -> "Tổng quan về hệ thống"
    t_clean = t_text
    if ":" in t_clean and "CHƯƠNG" in t_clean:
        t_clean = t_clean.split(":", 1)[1].strip()
    elif t_clean and t_clean[0].isdigit() and "." in t_clean[:5]:
        t_clean = t_clean.split(".", 2)[-1].strip()

    b_clean = b_text.strip()

    is_exact = (t_clean.lower() == b_clean.lower())
    print(f"[{'PASS' if is_exact else 'DIFF'}] TOC: '{t_text}'")
    print(f"       Clean TOC:  '{t_clean}'")
    print(f"       Body Text:  '{b_clean}'")
    if not is_exact:
        discrepancies.append((t_text, b_clean))

print(f"\nTotal discrepancies found: {len(discrepancies)}")
for d in discrepancies:
    print(f"  TOC: '{d[0]}' vs BODY: '{d[1]}'")
