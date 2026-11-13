import docx

doc = docx.Document('THUYẾT MINH backup.docx')

# Find the acronym table
for i, tbl in enumerate(doc.tables):
    txt = tbl.rows[0].cells[0].text.strip()
    if 'PC' in txt or 'Viết tắt' in txt or 'TỪ VIẾT TẮT' in txt:
        print(f"Acronym Table index: {i}")
        for r in tbl.rows:
            print(f"  {r.cells[0].text.strip()} -> {r.cells[1].text.strip()}")

