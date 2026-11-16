import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

justified_count = 0
center_count = 0
left_count = 0

for i, p in enumerate(doc.paragraphs):
    t = p.text.strip()
    if not t:
        continue
    
    xml = p._p.xml
    is_math = 'oMath' in xml
    is_pic = 'w:drawing' in xml or 'w:pict' in xml
    is_heading = p.style.name.startswith('Heading') or p.style.name in ['Title', 'Subtitle', 'TitleNoTOC', 'Chng1']
    is_fig_caption = p.style.name in ['Hình', 'Hnh'] or t.startswith('Hình ')
    is_tbl_caption = p.style.name in ['Bang'] or t.startswith('Bảng ')
    is_footnote = t.startswith('*(Ghi chú')
    
    # 1. Formulas / Equations -> MUST BE CENTERED
    if is_math:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        center_count += 1
        continue
        
    # 2. Pictures -> MUST BE CENTERED
    if is_pic:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        center_count += 1
        continue
        
    # 3. Figure captions -> MUST BE CENTERED
    if is_fig_caption:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        center_count += 1
        continue
        
    # 4. Table captions -> MUST BE CENTERED
    if is_tbl_caption:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        center_count += 1
        continue
        
    # 5. Headings:
    if is_heading:
        if p.style.name in ['Heading 2', 'Chng1', 'Title', 'Heading 1']:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            center_count += 1
        elif p.style.name in ['Heading 3', 'Heading 4']:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            left_count += 1
        continue
        
    # 6. Table footnote
    if is_footnote:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        center_count += 1
        continue
        
    # 7. Body text in Abstract (152-155) or Chapters 1-5 (i >= 256)
    if (152 <= i <= 155) or (i >= 256):
        if p.alignment != WD_ALIGN_PARAGRAPH.JUSTIFY:
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            justified_count += 1

print(f"Summary of alignment updates:")
print(f"  - Justified paragraphs (căn đều 2 bên): {justified_count}")
print(f"  - Centered paragraphs (công thức, hình, bảng, chương): {center_count}")
print(f"  - Left-aligned headings (đề mục 1.1, 2.1, 2.1.1): {left_count}")

doc.save(doc_path)
print("Saved document successfully!")

