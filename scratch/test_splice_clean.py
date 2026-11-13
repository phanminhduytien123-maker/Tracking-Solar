import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document('THUYẾT MINH backup.docx')
body = doc._body._element

p356 = doc.paragraphs[356]
print("P356 text:", p356.text[:60])
p356_elem = p356._p

# Check if p356_elem is in body
print("p356_elem in body children:", p356_elem in list(body))

# Find ref_heading
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

print("ref_heading found:", ref_heading is not None)
print("ref_tbl found:", ref_tbl is not None)

