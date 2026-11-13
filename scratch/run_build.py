# -*- coding: utf-8 -*-
"""
Full execution script for updating THUYẾT MINH backup.docx
"""

import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from content_chapter2 import CH2_ESP32_DATA, CH2_ADDITIONAL_SECTIONS
from content_chapter3 import CH3_DATA
from content_chapter4 import CH4_DATA, CH5_DATA, REFERENCES_DATA

DOC_PATH = 'THUYẾT MINH backup.docx'

def format_cell_text(cell, text, bold=False, italic=False, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = text
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size_pt)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = RGBColor(0, 0, 0)

def set_cell_margins_and_borders(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(r'''
        <w:tcMar %(ns)s>
            <w:top w:w="%(top)d" w:type="dxa"/>
            <w:bottom w:w="%(bottom)d" w:type="dxa"/>
            <w:left w:w="%(left)d" w:type="dxa"/>
            <w:right w:w="%(right)d" w:type="dxa"/>
        </w:tcMar>
    ''' % {'ns': nsdecls('w'), 'top': top, 'bottom': bottom, 'left': left, 'right': right})
    tcPr.append(tcMar)
    tcBorders = parse_xml(r'''
        <w:tcBorders %(ns)s>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        </w:tcBorders>
    ''' % {'ns': nsdecls('w')})
    tcPr.append(tcBorders)

def add_styled_table(doc, caption_text, headers, rows_data):
    cp = doc.add_paragraph(caption_text, style='Bang')
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(8)
    cp.paragraph_format.space_after = Pt(4)
    cp.paragraph_format.first_line_indent = Pt(0)
    for run in cp.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(11)
        run.font.bold = True
    
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = True

    # Header Row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        format_cell_text(hdr_cells[i], title, bold=True, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        shd = parse_xml(r'<w:shd %(ns)s w:fill="EBF2FA"/>' % {'ns': nsdecls('w')})
        hdr_cells[i]._tc.get_or_add_tcPr().append(shd)
        set_cell_margins_and_borders(hdr_cells[i])

    # Data Rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "FDFDFD" if r_idx % 2 == 0 else "F7FAFD"
        for c_idx, val in enumerate(row_values):
            align = WD_ALIGN_PARAGRAPH.LEFT if c_idx == 0 or len(val) > 15 else WD_ALIGN_PARAGRAPH.CENTER
            format_cell_text(row_cells[c_idx], val, bold=False, size_pt=10, align=align)
            shd = parse_xml(r'<w:shd %(ns)s w:fill="%(color)s"/>' % {'ns': nsdecls('w'), 'color': bg_color})
            row_cells[c_idx]._tc.get_or_add_tcPr().append(shd)
            set_cell_margins_and_borders(row_cells[c_idx])

    sp = doc.add_paragraph(style='Normal')
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)
    sp.paragraph_format.first_line_indent = Pt(0)
    return tbl

def add_heading_2(doc, text):
    p = doc.add_paragraph(text, style='Heading 2')
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph(text, style='Heading 3')
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_heading_4(doc, text):
    p = doc.add_paragraph(text, style='Heading 4')
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.italic = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_body_p(doc, text):
    p = doc.add_paragraph(text, style='Normal')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(20)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_figure(doc, img_path, caption_text, width_in=5.8):
    if not os.path.exists(img_path):
        print(f"Warning: Image not found: {img_path}")
        return
    ip = doc.add_paragraph(style='Normal')
    ip.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ip.paragraph_format.space_before = Pt(6)
    ip.paragraph_format.space_after = Pt(2)
    ip.paragraph_format.first_line_indent = Pt(0)
    run = ip.add_run()
    run.add_picture(img_path, width=Inches(width_in))

    cp = doc.add_paragraph(caption_text, style='Hình')
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(2)
    cp.paragraph_format.space_after = Pt(8)
    cp.paragraph_format.first_line_indent = Pt(0)
    for r in cp.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.italic = True
        r.font.bold = True
        r.font.color.rgb = RGBColor(0, 0, 0)

def main():
    print(f"Loading {DOC_PATH}...")
    doc = docx.Document(DOC_PATH)
    body = doc._body._element

    # 1. Update Chapter 2 Images in-place
    print("Updating images in Chapter 2...")
    # P332 + P333 -> Figure 2.1
    p332 = doc.paragraphs[332]
    p333 = doc.paragraphs[333]
    if os.path.exists("tampin.png"):
        p332.text = ""
        p332.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p332.paragraph_format.first_line_indent = Pt(0)
        p332.add_run().add_picture("tampin.png", width=Inches(3.2))
        print("Inserted tampin.png for Figure 2.1")
    p333.text = "Hình 2.1: Tấm pin năng lượng mặt trời đơn tinh thể (Monocrystalline) thực tế của đề tài"
    for r in p333.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = True
        r.font.bold = True

    # P339 + P340 -> Figure 2.2
    p339 = doc.paragraphs[339]
    p340 = doc.paragraphs[340]
    if os.path.exists("Cấu tạo PV Panel.png"):
        p339.text = ""
        p339.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p339.paragraph_format.first_line_indent = Pt(0)
        p339.add_run().add_picture("Cấu tạo PV Panel.png", width=Inches(5.5))
        print("Inserted Cấu tạo PV Panel.png for Figure 2.2")
    p340.text = "Hình 2.2: Cấu tạo đa tầng của một tấm pin năng lượng mặt trời tiêu chuẩn [4]"
    for r in p340.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = True
        r.font.bold = True

    # P349 + P350 -> Figure 2.3
    p349 = doc.paragraphs[349]
    p350 = doc.paragraphs[350]
    if os.path.exists("Ung_ung_thuc_te.jpg"):
        p349.text = ""
        p349.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p349.paragraph_format.first_line_indent = Pt(0)
        p349.add_run().add_picture("Ung_ung_thuc_te.jpg", width=Inches(5.2))
        print("Inserted Ung_ung_thuc_te.jpg for Figure 2.3")
    p350.text = "Hình 2.3: Các ứng dụng thực tế phong phú của pin năng lượng mặt trời trong đời sống và kỹ thuật [1]"
    for r in p350.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = True
        r.font.bold = True

    # 2. Identify and detach Reference Heading and Reference Table
    print("Finding references elements...")
    ref_heading_elem = None
    ref_tbl_elem = None
    for child in list(body):
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            p_obj = docx.text.paragraph.Paragraph(child, doc)
            if 'TÀI LIỆU THAM KHẢO' in p_obj.text:
                ref_heading_elem = child
        elif tag == 'tbl' and ref_heading_elem is not None and ref_tbl_elem is None:
            ref_tbl_elem = child

    assert ref_heading_elem is not None, "Error: TÀI LIỆU THAM KHẢO heading not found!"
    assert ref_tbl_elem is not None, "Error: Reference table not found!"

    # Detach them from body temporarily
    body.remove(ref_heading_elem)
    body.remove(ref_tbl_elem)
    print("Detached reference heading and table.")

    # 3. Find start of erroneous content in Chapter 2
    # P356 starts with "Việc lựa chọn vi điều khiển ESP32-S3 WROOM N16R8 cho đề tài phân loại"
    target_remove_start = doc.paragraphs[356]._p

    # Remove all children from target_remove_start to the end (before sectPr)
    children = list(body)
    start_idx = children.index(target_remove_start)
    sectPr_elem = body.xpath('./w:sectPr')[0]
    sectPr_idx = children.index(sectPr_elem)

    print(f"Removing old children from index {start_idx} to {sectPr_idx - 1} (total {sectPr_idx - start_idx} elements)...")
    for i in range(start_idx, sectPr_idx):
        body.remove(children[i])
    print("Old erroneous content removed successfully.")

    # 4. Complete Chapter 2
    print("Appending completion of Chapter 2...")
    # Add paragraph 3 of ESP32-S3
    add_body_p(doc, CH2_ESP32_DATA["paragraphs"][2])
    # Add Table 2.1
    add_styled_table(
        doc,
        CH2_ESP32_DATA["table_caption"],
        CH2_ESP32_DATA["table_headers"],
        CH2_ESP32_DATA["table_rows"]
    )

    # Add sections 2.3 to 2.10
    for sec in CH2_ADDITIONAL_SECTIONS:
        print(f"  Adding 2.{sec['title']}...")
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 5. Append Chapter 3
    print("Appending Chapter 3: THIẾT KẾ VÀ TÍNH TOÁN HỆ THỐNG...")
    add_heading_2(doc, CH3_DATA["chapter_title"])
    for sec in CH3_DATA["sections"]:
        print(f"  Adding 3.{sec['title']}...")
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "figures" in sec:
            for fig in sec["figures"]:
                add_figure(doc, fig["path"], fig["caption"], fig["width"])
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 6. Append Chapter 4
    print("Appending Chapter 4: THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ...")
    add_heading_2(doc, CH4_DATA["chapter_title"])
    for sec in CH4_DATA["sections"]:
        print(f"  Adding 4.{sec['title']}...")
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "figures" in sec:
            for fig in sec["figures"]:
                add_figure(doc, fig["path"], fig["caption"], fig["width"])
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 7. Append Chapter 5
    print("Appending Chapter 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN...")
    add_heading_2(doc, CH5_DATA["chapter_title"])
    for sec in CH5_DATA["sections"]:
        print(f"  Adding 5.{sec['title']}...")
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)

    # 8. Re-attach Reference Heading and Reference Table
    print("Re-attaching References section...")
    sectPr_cur = body.xpath('./w:sectPr')[0]
    sectPr_cur.addprevious(ref_heading_elem)
    sectPr_cur.addprevious(ref_tbl_elem)

    # 9. Update Table 16 with all 10 references
    print("Updating reference table with [1] - [10]...")
    ref_tbl_obj = docx.table.Table(ref_tbl_elem, doc)
    while len(ref_tbl_obj.rows) < len(REFERENCES_DATA):
        ref_tbl_obj.add_row()
    
    for idx, (c1, c2) in enumerate(REFERENCES_DATA):
        row_cells = ref_tbl_obj.rows[idx].cells
        format_cell_text(row_cells[0], c1, bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
        format_cell_text(row_cells[1], c2, bold=False, size_pt=10, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        set_cell_margins_and_borders(row_cells[0])
        set_cell_margins_and_borders(row_cells[1])

    # 10. Save and verify
    print(f"Saving updated document to {DOC_PATH}...")
    doc.save(DOC_PATH)
    print("Document saved successfully!")

    # Verify
    verify_doc = docx.Document(DOC_PATH)
    print(f"Verification: Total paragraphs = {len(verify_doc.paragraphs)}, Total tables = {len(verify_doc.tables)}")

if __name__ == '__main__':
    main()
