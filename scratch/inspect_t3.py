import docx

doc = docx.Document('THUYẾT MINH backup.docx')
t3 = doc.tables[3]
for idx, r in enumerate(t3.rows):
    cells = [c.text.strip().replace('\n', ' ') for c in r.cells]
    print(f'Row {idx}: {cells}')

