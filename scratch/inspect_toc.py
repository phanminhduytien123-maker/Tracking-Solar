import docx

doc = docx.Document('THUYẾT MINH backup.docx')

for i in range(158, 255):
    p = doc.paragraphs[i]
    txt = p.text.strip()
    if txt:
        print(f"P{i:03d} [{p.style.name}]: {txt[:70]}")

