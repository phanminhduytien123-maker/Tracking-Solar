import docx

doc = docx.Document('THUYẾT MINH backup.docx')
body = doc._body._element

# Find ref_heading (TÀI LIỆU THAM KHẢO) and ref_tbl
ref_heading = None
ref_tbl = None

for child in list(body):
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p = docx.text.paragraph.Paragraph(child, doc)
        if 'TÀI LIỆU THAM KHẢO' in p.text:
            ref_heading = child
    elif tag == 'tbl' and ref_heading is not None and ref_tbl is None:
        ref_tbl = child

print('Found ref_heading:', ref_heading is not None)
print('Found ref_tbl:', ref_tbl is not None)

