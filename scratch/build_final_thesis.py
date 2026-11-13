# -*- coding: utf-8 -*-
"""
Production Master Builder for THUYẾT MINH:
1. Copies master template HK1_2627_DATN_...docx
2. Adds TitleNoTOC style (identical to Title but without outlineLvl)
3. Applies TitleNoTOC to:
   - CÔNG TRÌNH ĐƯỢC HOÀN THÀNH...
   - LỊCH TRÌNH LÀM ĐỒ ÁN TỐT NGHIỆP
   - ỨNG DỤNG FUZZY LOGIC VÀ PSO... (Tóm tắt tiếng Việt)
   - APPLICATION OF FUZZY LOGIC AND PSO... (Abstract tiếng Anh)
4. Configures dot leader tab stops on styles: toc 1, toc 2, toc 3, table of figures
5. Sets page_break_before on DANH MỤC HÌNH ẢNH, DANH MỤC BẢNG BIỂU, DANH MỤC TỪ VIẾT TẮT
6. Updates Acronyms Table (Table 2) with 15 standard abbreviations
7. Updates Chapter 2 Figures (2.1, 2.2, 2.3)
8. Fixes empty Hình/Bang paragraphs to Normal
9. Detaches References heading and table
10. Removes old conveyor/apple content from P356 to end
11. Appends full Chapter 2 completion, Chapter 3, Chapter 4, Chapter 5 (with page_break_before on Heading 2)
12. Re-attaches References with 10 full academic citations
13. Saves to THUYẾT MINH backup.docx and THUYẾT MINH_hoanchinh.docx
14. Runs Word COM in hidden mode with DisplayAlerts=False to update all TOC, TOF, and TOT fields with TabLeader=1, then exports to PDF
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

sys.path.append(r'd:\DOANTOTNGHIEP\scratch')
from content_chapter2 import CH2_ESP32_DATA, CH2_ADDITIONAL_SECTIONS
from content_chapter3 import CH3_DATA
from content_chapter4 import CH4_DATA, CH5_DATA, REFERENCES_DATA

SRC_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
DST_BACKUP = r"D:\DOANTOTNGHIEP\THUYẾT MINH backup.docx"
DST_HOANCHINH = r"D:\DOANTOTNGHIEP\THUYẾT MINH_hoanchinh.docx"
PDF_PATH = r"D:\DOANTOTNGHIEP\THUYẾT MINH_hoanchinh.pdf"

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
    p.paragraph_format.page_break_before = True
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

def build_docx(target_path):
    print(f"Copying {SRC_PATH} -> {target_path}...")
    shutil.copyfile(SRC_PATH, target_path)
    doc = docx.Document(target_path)
    body = doc._body._element

    # 1. Setup TitleNoTOC style
    title_style = doc.styles['Title']
    title_xml = title_style._element.xml
    new_style_xml = title_xml.replace('w:styleId="Title"', 'w:styleId="TitleNoTOC"')
    new_style_xml = new_style_xml.replace('<w:name w:val="Title"/>', '<w:name w:val="TitleNoTOC"/>')
    new_style_elem = parse_xml(new_style_xml)
    for pPr in new_style_elem.xpath('.//w:pPr'):
        for ol in pPr.xpath('./w:outlineLvl'):
            pPr.remove(ol)
    doc.styles._element.append(new_style_elem)
    print("Added TitleNoTOC style without outline level.")

    # 2. Exclude intermediate frontmatter items from TOC
    exclude_keywords = [
        'CÔNG TRÌNH ĐƯỢC HOÀN THÀNH',
        'LỊCH TRÌNH LÀM ĐỒ ÁN',
        'ỨNG DỤNG FUZZY LOGIC VÀ PSO TRONG ĐIỀU HƯỚNG PIN',
        'APPLICATION OF FUZZY LOGIC AND PSO IN SOLAR PANEL'
    ]
    for i, p in enumerate(doc.paragraphs[:160]):
        txt = p.text.strip()
        if any(kw in txt.upper() for kw in exclude_keywords):
            p.style = 'TitleNoTOC'
            pPr = p._p.get_or_add_pPr()
            for ol in pPr.xpath('./w:outlineLvl'):
                pPr.remove(ol)

    # 3. Configure dot leader tabs for toc 1, toc 2, toc 3, and table of figures
    for name in ['toc 1', 'toc 2', 'toc 3', 'table of figures']:
        try:
            s = doc.styles[name]
            pPr = s._element.get_or_add_pPr()
            for tabs in pPr.xpath('./w:tabs'):
                pPr.remove(tabs)
            new_tabs = parse_xml(r'''
                <w:tabs %(ns)s>
                    <w:tab w:val="right" w:leader="dot" w:pos="9072"/>
                </w:tabs>
            ''' % {'ns': nsdecls('w')})
            pPr.append(new_tabs)
        except Exception as e:
            print(f"Error updating style {name}: {e}")

    # 4. Set page_break_before on major frontmatter headings
    for i, p in enumerate(doc.paragraphs[:300]):
        txt = p.text.strip().upper()
        if txt in ['DANH MỤC HÌNH ẢNH', 'DANH MỤC BẢNG BIỂU', 'DANH MỤC TỪ VIẾT TẮT']:
            p.paragraph_format.page_break_before = True

    # 5. Update Table 2 (Danh mục từ viết tắt)
    tbl2 = doc.tables[2]
    needed_rows = len(ACRONYMS_DATA)
    while len(tbl2.rows) < needed_rows:
        tbl2.add_row()
    while len(tbl2.rows) > needed_rows:
        tbl2._tbl.remove(tbl2.rows[-1]._tr)
    for idx, (abbr, meaning) in enumerate(ACRONYMS_DATA):
        format_cell_text(tbl2.rows[idx].cells[0], abbr, bold=True, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        format_cell_text(tbl2.rows[idx].cells[1], meaning, bold=False, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.LEFT)
        set_cell_margins_and_borders(tbl2.rows[idx].cells[0])
        set_cell_margins_and_borders(tbl2.rows[idx].cells[1])

    # 6. Update Chapter 2 Images
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
        r.font.italic = True
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
        r.font.italic = True
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
        r.font.italic = True
        r.font.bold = True

    # Fix empty Hình/Bang styles
    for p in doc.paragraphs[330:355]:
        if p.style.name in ['Hình', 'Bang'] and not p.text.strip():
            p.style = 'Normal'

    # 7. Detach References
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

    # 8. Remove old children from P356
    target_remove_start = doc.paragraphs[356]._p
    children = list(body)
    start_idx = children.index(target_remove_start)
    sectPr_elem = body.xpath('./w:sectPr')[0]
    sectPr_idx = children.index(sectPr_elem)
    for i in range(start_idx, sectPr_idx):
        body.remove(children[i])

    # 9. Append Chapter 2 completion
    add_body_p(doc, CH2_ESP32_DATA["paragraphs"][2])
    add_styled_table(doc, CH2_ESP32_DATA["table_caption"], CH2_ESP32_DATA["table_headers"], CH2_ESP32_DATA["table_rows"])
    for sec in CH2_ADDITIONAL_SECTIONS:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 10. Append Chapter 3
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

    # 11. Append Chapter 4
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
                fig_path = fig["path"]
                if "chart_power_comparison" in fig_path:
                    fig_path = r"scratch\chart_power_comparison.png"
                elif "chart_energy_wh_accumulation" in fig_path:
                    fig_path = r"scratch\chart_energy_wh_accumulation.png"
                add_figure(doc, fig_path, fig["caption"], width_in=fig.get("width_in", 5.8))
        if "table_caption" in sec:
            add_styled_table(doc, sec["table_caption"], sec["table_headers"], sec["table_rows"])

    # 12. Append Chapter 5
    add_heading_2(doc, CH5_DATA["chapter_title"])
    for sec in CH5_DATA["sections"]:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)

    # 13. Re-attach References
    p_ref = docx.text.paragraph.Paragraph(ref_heading_elem, doc)
    p_ref.paragraph_format.page_break_before = True
    body.append(ref_heading_elem)

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
    print(f"Saving to {target_path}...")
    doc.save(target_path)
    print("Done building docx.")

def update_fields_via_word_com(docx_path, pdf_path=None):
    import win32com.client
    print(f"Running Word COM on {docx_path}...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = False

    try:
        doc = word.Documents.Open(os.path.abspath(docx_path))
        for i in range(1, doc.TablesOfContents.Count + 1):
            toc = doc.TablesOfContents.Item(i)
            toc.TabLeader = 1  # wdTabLeaderDots
            toc.Update()
        for i in range(1, doc.TablesOfFigures.Count + 1):
            tof = doc.TablesOfFigures.Item(i)
            tof.TabLeader = 1  # wdTabLeaderDots
            tof.Update()
        doc.Fields.Update()
        doc.Save()
        if pdf_path:
            doc.ExportAsFixedFormat(os.path.abspath(pdf_path), 17)
            print(f"Exported to {pdf_path}")
        doc.Close(SaveChanges=True)
    finally:
        word.Quit()
        print("Word COM finished successfully.")

def main():
    print("=== BUILDING THUYẾT MINH HOÀN CHỈNH ===")
    build_docx(DST_HOANCHINH)
    update_fields_via_word_com(DST_HOANCHINH, PDF_PATH)
    
    print("=== SYNCHRONIZING TO THUYẾT MINH BACKUP ===")
    shutil.copyfile(DST_HOANCHINH, DST_BACKUP)
    print("Successfully synchronized to THUYẾT MINH backup.docx!")

if __name__ == "__main__":
    main()

