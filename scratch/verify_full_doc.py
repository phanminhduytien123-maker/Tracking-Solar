import docx

doc = docx.Document('THUYẾT MINH backup.docx')

print(f"Total paragraphs: {len(doc.paragraphs)}")
print(f"Total tables: {len(doc.tables)}")

# Inspect all headings in the updated doc
print("\n=== ALL HEADINGS IN UPDATED DOC ===")
for i, p in enumerate(doc.paragraphs):
    if p.style.name in ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Title'] or p.text.strip().startswith('CHƯƠNG'):
        print(f"P{i:03d} [{p.style.name}]: {p.text.strip()[:80]}")

print("\n=== ALL TABLES IN UPDATED DOC ===")
for i, tbl in enumerate(doc.tables):
    rows = len(tbl.rows)
    cols = len(tbl.columns)
    sample = tbl.rows[0].cells[0].text.strip().replace('\n', ' ') if tbl.rows else ''
    print(f"Table {i:02d}: {rows}x{cols} -> '{sample[:50]}'")

