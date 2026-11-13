import docx

doc = docx.Document('THUYẾT MINH backup.docx')

print(f'Total paragraphs: {len(doc.paragraphs)}')
print(f'Total tables: {len(doc.tables)}')

for i, p in enumerate(doc.paragraphs):
    if p.style.name in ['Heading 1', 'Heading 2'] or any(k in p.text.upper() for k in ['CHƯƠNG', 'BĂNG TẢI', 'ROBOT', 'VGG16', 'TÀI LIỆU THAM KHẢO']):
        print(f'P{i:03d} [{p.style.name}]: {p.text.strip()[:80]}')

