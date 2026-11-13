import docx

doc = docx.Document('THUYẾT MINH backup.docx')

for i in range(323, 364):
    p = doc.paragraphs[i]
    if p.text.strip():
        print(f'P{i:03d} [{p.style.name}]: {p.text.strip()[:100]}')

