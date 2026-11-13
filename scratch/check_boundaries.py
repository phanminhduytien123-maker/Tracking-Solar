import docx

doc = docx.Document('THUYẾT MINH backup.docx')

print(f'Total paragraphs: {len(doc.paragraphs)}')
for i in range(350, 370):
    p = doc.paragraphs[i]
    print(f'P{i:03d} [{p.style.name}]: {p.text}')

print('--- Near Tài liệu tham khảo ---')
for i in range(len(doc.paragraphs) - 20, len(doc.paragraphs)):
    p = doc.paragraphs[i]
    print(f'P{i:03d} [{p.style.name}]: {p.text}')

