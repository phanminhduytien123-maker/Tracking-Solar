import docx

doc = docx.Document('THUYẾT MINH backup.docx')
t16 = doc.tables[16]
for idx, r in enumerate(t16.rows):
    cells = [c.text.strip().replace('\n', ' ') for c in r.cells]
    print(f'Row {idx}: {cells}')

