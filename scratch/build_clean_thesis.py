# -*- coding: utf-8 -*-
"""
Clean Thesis Builder:
1. Copies original HK1 docx to target.
2. Updates Table 2 (Acronyms).
3. Updates Chapter 2 Figures 2.1, 2.2, 2.3.
4. Detaches References.
5. Removes old conveyor/apple content (P356 to end).
6. Appends Chapter 2 (2.2 completion, 2.3-2.10), Chapter 3, Chapter 4, Chapter 5.
   All Chapter headings (Heading 2) have page_break_before = True.
7. Re-attaches References with 10 citations.
8. Uses Word COM to update all native TOC, TOF, and TOT fields.
"""

import os
import shutil
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

# Add scratch to path to import content
sys.path.append(r'd:\DOANTOTNGHIEP\scratch')

from content_chapter2 import CH2_ESP32_DATA, CH2_ADDITIONAL_SECTIONS
from content_chapter3 import CH3_DATA
from content_chapter4 import CH4_DATA, CH5_DATA, REFERENCES_DATA

SRC_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
DST_PATH = r"D:\DOANTOTNGHIEP\THUYẾT MINH_hoanchinh.docx"

ACRONYMS_DATA = [
    ["PV", "Photovoltaic (Quang điện / Pin năng lượng mặt trời)"],
    ["FLC", "Fuzzy Logic Controller (Bộ điều khiển logic mờ)"],
    ["PSO", "Particle Swarm Optimization (Thuật toán tối ưu hóa bầy đàn)"],
    ["PID", "Proportional - Integral - Derivative (Bộ điều khiển Tỉ lệ - Tích phân - Vi phân)"],
    ["NOAA", "National Oceanic and Atmospheric Administration (Cơ quan Khí quyển và Đại dương Quốc gia Hoa Kỳ)"],
    ["RTC", "Real-Time Clock (Đồng hồ thời gian thực)"],
    ["PCNT", "Pulse Counter (Bộ đếm xung phần cứng của ESP32-S3)"],
    ["ADC", "Analog-to-Digital Converter (Bộ chuyển đổi tương tự - số)"],
    ["MPPT", "Maximum Power Point Tracking (Bám điểm công suất cực đại)"],
    ["IoT", "Internet of Things (Internet vạn vật)"],
    ["FSM", "Finite State Machine (Máy trạng thái hữu hạn)"],
    ["FOTA", "Firmware Over-The-Air (Nâng cấp phần mềm không dây qua mạng)"],
    ["Voc", "Open-Circuit Voltage (Điện áp hở mạch)"],
    ["Isc", "Short-Circuit Current (Dòng điện ngắn mạch)"],
    ["RTDB", "Realtime Database (Cơ sở dữ liệu thời gian thực của Google Firebase)"]
]

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
    cp.paragraph_format.keep_with_next = True
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
    p.paragraph_format.page_break_before = True  # Always start chapters on a new page!
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
        run.font.italic = False
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
    ip.paragraph_format.keep_with_next = True
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
        r.font.italic = False
        r.font.bold = True
        r.font.color.rgb = RGBColor(0, 0, 0)

def main():
    print(f"1. Copying {SRC_PATH} -> {DST_PATH}...")
    shutil.copyfile(SRC_PATH, DST_PATH)
    
    print(f"2. Loading {DST_PATH}...")
    doc = docx.Document(DST_PATH)
    body = doc._body._element

    # 3. Update Table 2 (Danh mục từ viết tắt)
    print("3. Updating Acronyms Table (Table 2)...")
    tbl2 = doc.tables[2]
    # Adjust number of rows
    needed_rows = len(ACRONYMS_DATA)
    current_rows = len(tbl2.rows)
    while len(tbl2.rows) < needed_rows:
        tbl2.add_row()
    while len(tbl2.rows) > needed_rows:
        # remove extra rows
        row_elem = tbl2.rows[-1]._tr
        tbl2._tbl.remove(row_elem)
    for idx, (abbr, meaning) in enumerate(ACRONYMS_DATA):
        format_cell_text(tbl2.rows[idx].cells[0], abbr, bold=True, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        format_cell_text(tbl2.rows[idx].cells[1], meaning, bold=False, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.LEFT)
        set_cell_margins_and_borders(tbl2.rows[idx].cells[0])
        set_cell_margins_and_borders(tbl2.rows[idx].cells[1])
    print("Acronyms Table updated.")

    # 4. Update Chapter 2 Images in-place
    print("4. Updating images in Chapter 2...")
    p332 = doc.paragraphs[332]
    p333 = doc.paragraphs[333]
    if os.path.exists("tampin.png"):
        p332.text = ""
        p332.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p332.paragraph_format.first_line_indent = Pt(0)
        p332.add_run().add_picture("tampin.png", width=Inches(3.2))
    p333.text = "Hình 2.1: Tấm pin năng lượng mặt trời đơn tinh thể (Monocrystalline) thực tế của đề tài"
    for r in p333.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = False
        r.font.bold = True

    p339 = doc.paragraphs[339]
    p340 = doc.paragraphs[340]
    if os.path.exists("Cấu tạo PV Panel.png"):
        p339.text = ""
        p339.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p339.paragraph_format.first_line_indent = Pt(0)
        p339.add_run().add_picture("Cấu tạo PV Panel.png", width=Inches(5.5))
    p340.text = "Hình 2.2: Cấu tạo đa tầng của một tấm pin năng lượng mặt trời tiêu chuẩn [4]"
    for r in p340.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = False
        r.font.bold = True

    p349 = doc.paragraphs[349]
    p350 = doc.paragraphs[350]
    if os.path.exists("Ung_ung_thuc_te.jpg"):
        p349.text = ""
        p349.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p349.paragraph_format.first_line_indent = Pt(0)
        p349.add_run().add_picture("Ung_ung_thuc_te.jpg", width=Inches(5.2))
    p350.text = "Hình 2.3: Các ứng dụng thực tế phong phú của pin năng lượng mặt trời trong đời sống và kỹ thuật [1]"
    for r in p350.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = False
        r.font.bold = True

    # Fix empty Hình/Bang styles before detaching
    for p in doc.paragraphs[330:355]:
        if p.style.name in ['Hình', 'Bang'] and not p.text.strip():
            p.style = 'Normal'

    # 5. Detach References Heading and Table
    print("5. Detaching References elements...")
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

    body.remove(ref_heading_elem)
    body.remove(ref_tbl_elem)

    # 6. Remove old content starting at P356
    print("6. Removing old content starting at P356...")
    target_remove_start = doc.paragraphs[356]._p
    children = list(body)
    start_idx = children.index(target_remove_start)
    sectPr_elem = body.xpath('./w:sectPr')[0]
    sectPr_idx = children.index(sectPr_elem)

    for i in range(start_idx, sectPr_idx):
        body.remove(children[i])
    print(f"Removed {sectPr_idx - start_idx} old elements.")

    # 7. Append Chapter 2 completion
    print("7. Appending Chapter 2 completion...")
    add_body_p(doc, CH2_ESP32_DATA["paragraphs"][2])
    add_styled_table(
        doc,
        CH2_ESP32_DATA["table_caption"],
        CH2_ESP32_DATA["table_headers"],
        CH2_ESP32_DATA["table_rows"]
    )

    for sec in CH2_ADDITIONAL_SECTIONS:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 8. Append Chapter 3
    print("8. Appending Chapter 3...")
    add_heading_2(doc, CH3_DATA["chapter_title"])
    for sec in CH3_DATA["sections"]:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "figures" in sec:
            for fig in sec["figures"]:
                add_figure(doc, fig["path"], fig["caption"], width_in=fig.get("width_in", 5.8))
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 9. Append Chapter 4
    print("9. Appending Chapter 4...")
    add_heading_2(doc, CH4_DATA["chapter_title"])
    for sec in CH4_DATA["sections"]:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "figures" in sec:
            for fig in sec["figures"]:
                # Use high-res normalized charts
                fig_path = fig["path"]
                if "chart_power_comparison" in fig_path:
                    fig_path = r"scratch\chart_power_comparison.png"
                elif "chart_energy_wh_accumulation" in fig_path:
                    fig_path = r"scratch\chart_energy_wh_accumulation.png"
                add_figure(doc, fig_path, fig["caption"], width_in=fig.get("width_in", 5.8))
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 10. Append Chapter 5
    print("10. Appending Chapter 5...")
    add_heading_2(doc, CH5_DATA["chapter_title"])
    for sec in CH5_DATA["sections"]:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)

    # 11. Re-attach References
    print("11. Re-attaching References...")
    p_ref = docx.text.paragraph.Paragraph(ref_heading_elem, doc)
    p_ref.paragraph_format.page_break_before = True
    body.append(ref_heading_elem)

    # Populate 10 references in ref_tbl
    tbl_ref = docx.table.Table(ref_tbl_elem, doc)
    needed_refs = len(REFERENCES_DATA)
    while len(tbl_ref.rows) < needed_refs:
        tbl_ref.add_row()
    while len(tbl_ref.rows) > needed_refs:
        tbl_ref._tbl.remove(tbl_ref.rows[-1]._tr)
    for idx, (num, citation) in enumerate(REFERENCES_DATA):
        format_cell_text(tbl_ref.rows[idx].cells[0], num, bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
        format_cell_text(tbl_ref.rows[idx].cells[1], citation, bold=False, size_pt=10, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        set_cell_margins_and_borders(tbl_ref.rows[idx].cells[0])
        set_cell_margins_and_borders(tbl_ref.rows[idx].cells[1])
    body.append(ref_tbl_elem)

    # Save
    print(f"12. Saving to {DST_PATH}...")
    doc.save(DST_PATH)
    print("Document successfully assembled and saved!")

if __name__ == "__main__":
    main()
