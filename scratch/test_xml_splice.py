import docx

doc = docx.Document('THUYẾT MINH backup.docx')

# Let's see the elements in body
body = doc._body._element
print(f'Total children in body: {len(body)}')

# Identify elements
p_indices = {}
tbl_indices = {}
for i, child in enumerate(body):
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p_obj = docx.text.paragraph.Paragraph(child, doc)
        txt = p_obj.text.strip()
        if p_obj.style.name.startswith('Heading') or any(k in txt.upper() for k in ['CHƯƠNG', 'BĂNG TẢI', 'ROBOT', 'VGG16', 'TÀI LIỆU THAM KHẢO']):
            print(f'Child {i:03d} [p]: ({p_obj.style.name}) {txt[:70]}')
    elif tag == 'tbl':
        tbl_obj = docx.table.Table(child, doc)
        sample = tbl_obj.rows[0].cells[0].text.strip().replace('\n', ' ') if tbl_obj.rows else ''
        print(f'Child {i:03d} [tbl]: {len(tbl_obj.rows)} rows -> "{sample[:50]}"')
    elif tag == 'sectPr':
        print(f'Child {i:03d} [sectPr]')

