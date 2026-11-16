import docx
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOCX_PATH = "HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"

print(f"Opening {DOCX_PATH}...")
doc = docx.Document(DOCX_PATH)

# Helper to set cell padding (margins)
def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

# Helper to set shading
def set_cell_shading(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

# 1. Format Table 8 (Bảng 4.1)
t8 = doc.tables[8]
t8.alignment = WD_TABLE_ALIGNMENT.CENTER

# Set explicit column widths (total = 15.5 cm)
col_widths = [Cm(2.0), Cm(2.2), Cm(2.2), Cm(2.2), Cm(2.2), Cm(4.7)]

# Header content with subscripts
headers_data = [
    [("Thời gian", False)],
    [("Góc Az", False), ("sun", True), (" (°)", False)],
    [("Góc El", False), ("sun", True), (" (°)", False)],
    [("Trục xoay φ (°)", False)],
    [("Trục ngửa ε (°)", False)],
    [("Chế độ vận hành của hệ thống", False)]
]

# Set Header Row
for c_i, cell in enumerate(t8.rows[0].cells):
    cell.width = col_widths[c_i]
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_shading(cell, "F0F4F8")
    set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
    p = cell.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.left_indent = Pt(0)
    p.paragraph_format.right_indent = Pt(0)
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    for text_part, is_sub in headers_data[c_i]:
        r = p.add_run(text_part)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0, 32, 96)
        if is_sub:
            r.font.subscript = True

# Refined descriptions for Column 5
col5_descriptions = [
    "Bình minh - Kích hoạt khởi động và định vị đón nắng",
    "Mặt trời lên thấp - Bám thiên văn kết hợp kích hoạt bám quang vi sai",
    "Bức xạ tăng mạnh - Điều khiển mờ lai Fuzzy-PID bám quang liên tục",
    "Trời nắng gắt - Bám quang vi sai duy trì vuông góc chùm tia nắng",
    "Chính ngọ - Đỉnh bức xạ trong ngày, bám quang ổn định",
    "Đầu giờ chiều - Mặt trời dịch chuyển hướng Tây, giàn xoay theo hướng nắng",
    "Buổi chiều - Tiếp tục bám quang vi sai thích nghi, hấp thụ bức xạ xiên",
    "Nắng xế chiều - Bám sát quang học đến khi bức xạ giảm dưới ngưỡng",
    "Hoàng hôn - Kết thúc chu kỳ bám nắng, chuyển sang chế độ ngủ đêm"
]

# Update data rows
for r_i in range(1, len(t8.rows)):
    row = t8.rows[r_i]
    # Update col 5 description
    row.cells[5].paragraphs[0].text = col5_descriptions[r_i - 1]
    
    for c_i, cell in enumerate(row.cells):
        cell.width = col_widths[c_i]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        
        # Alternating row background for professional look
        if r_i % 2 == 1:
            set_cell_shading(cell, "FFFFFF")
        else:
            set_cell_shading(cell, "F9FAFC")
            
        p = cell.paragraphs[0]
        p.paragraph_format.first_line_indent = Pt(0)
        p.paragraph_format.left_indent = Pt(0)
        p.paragraph_format.right_indent = Pt(0)
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        
        # Alignments: col 0..4 CENTER, col 5 LEFT
        if c_i < 5:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(10.5)

print("Formatted Table 8 (Bảng 4.1) successfully!")

# 2. Format Table 9 (Bảng 4.2)
t9 = doc.tables[9]
t9.alignment = WD_TABLE_ALIGNMENT.CENTER
for r_i, row in enumerate(t9.rows):
    for c_i, cell in enumerate(row.cells):
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell, top=80, bottom=80, left=80, right=80)
        if r_i == 0:
            set_cell_shading(cell, "F0F4F8")
        elif r_i % 2 == 1:
            set_cell_shading(cell, "FFFFFF")
        else:
            set_cell_shading(cell, "F9FAFC")
            
        p = cell.paragraphs[0]
        p.paragraph_format.first_line_indent = Pt(0)
        p.paragraph_format.left_indent = Pt(0)
        p.paragraph_format.right_indent = Pt(0)
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.1
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Times New Roman"
            if r_i == 0:
                r.font.size = Pt(9.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 32, 96)
            else:
                r.font.size = Pt(9.5)

print("Formatted Table 9 (Bảng 4.2) successfully!")

# 3. Clean up non-zero first_line_indent on ALL other tables
for t_idx, table in enumerate(doc.tables):
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.first_line_indent = Pt(0)
                p.paragraph_format.left_indent = Pt(0)
                p.paragraph_format.right_indent = Pt(0)

print("Cleaned up first_line_indent across ALL tables in docx!")

doc.save(DOCX_PATH)
print(f"Saved {DOCX_PATH} successfully!")

