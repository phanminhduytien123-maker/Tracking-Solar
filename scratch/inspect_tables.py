import docx

doc = docx.Document('THUYẾT MINH backup.docx')
print(f'Total tables: {len(doc.tables)}')
for idx, tbl in enumerate(doc.tables):
    rows = len(tbl.rows)
    cols = len(tbl.columns)
    sample_text = ' | '.join(cell.text.strip().replace('\n', ' ') for cell in tbl.rows[0].cells[:4])
    print(f'Table {idx:02d}: {rows}x{cols} -> "{sample_text[:80]}"')

