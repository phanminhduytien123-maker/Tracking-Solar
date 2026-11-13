# -*- coding: utf-8 -*-
"""
Perfect Thesis Builder:
Matches Đồ án tham khảo.pdf and the user's uploaded images:
1. MỤC LỤC:
   - Front matter shows ONLY:
     * LỜI CẢM ƠN
     * MỤC LỤC
     * DANH MỤC HÌNH ẢNH
     * DANH MỤC BẢNG BIỂU
     * DANH MỤC TỪ VIẾT TẮT
   - Excludes intermediate frontmatter (Công trình hoàn thành, Lịch trình, Tóm tắt, Abstract)
   - Every single entry has dot leaders (..........) to the right-aligned page number.
   - Times New Roman 13pt, Regular, line spacing 1.3.

2. DANH MỤC HÌNH ẢNH:
   - Title: DANH MỤC HÌNH ẢNH (Centered, Bold, 16pt, starts on fresh page)
   - Entries: Times New Roman 13pt, Regular (NO bold, NO caps)
   - Clean sentence case: 'Hình X.Y <Tên hình ngắn gọn>' (NO colon ':')
   - Dot leaders (..........) to right-aligned page numbers
   - Comfortable line spacing matching reference PDF page 15.

3. DANH MỤC BẢNG BIỂU:
   - Title: DANH MỤC BẢNG BIỂU (Centered, Bold, 16pt, starts on fresh page)
   - Entries: Times New Roman 13pt, Regular (NO bold, NO caps)
   - Clean sentence case: 'Bảng X.Y <Tên bảng ngắn gọn>' (NO colon ':')
   - Dot leaders (..........) to right-aligned page numbers
   - Comfortable line spacing matching reference PDF page 17.

4. DANH MỤC TỪ VIẾT TẮT:
   - Title: DANH MỤC TỪ VIẾT TẮT (Centered, Bold, 16pt, starts on fresh page)
   - 15 standard technical acronyms in a clean, styled table.

5. CHAPTERS 1 to 5:
   - Heading 2 with page_break_before = True.
   - High-res KiCad schematics and 3D PCB renders.
   - 100W normalized experimental comparison charts.
   - 10 full academic references.
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
from build_clean_thesis import (
    format_cell_text, set_cell_margins_and_borders, add_styled_table,
    add_heading_2, add_heading_3, add_heading_4, add_body_p, add_figure,
    ACRONYMS_DATA, SRC_PATH
)
from content_chapter2 import CH2_ESP32_DATA, CH2_ADDITIONAL_SECTIONS
from content_chapter3 import CH3_DATA
from content_chapter4 import CH4_DATA, CH5_DATA, REFERENCES_DATA

SRC_TEMPLATE = r"D:\DOANTOTNGHIEP\scratch\ORIGINAL_UNTOUCHED_TEMPLATE_BACKUP.docx"
DST_MAIN = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
DST_BACKUP = r"D:\DOANTOTNGHIEP\THUYẾT MINH backup.docx"
PDF_MAIN = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.pdf"

FIGURE_CAPTIONS = {
    "2.1": "Hình 2.1 Tấm pin năng lượng mặt trời đơn tinh thể thực tế",
    "2.2": "Hình 2.2 Cấu tạo đa tầng của tấm pin năng lượng mặt trời",
    "2.3": "Hình 2.3 Ứng dụng thực tế của pin năng lượng mặt trời",
    "3.1": "Hình 3.1 Sơ đồ nguyên lý mạch in điều khiển trung tâm",
    "3.2": "Hình 3.2 Sơ đồ nguyên lý mạch cảm biến quang vi sai",
    "3.3": "Hình 3.3 Phối cảnh 3D mạch in điều khiển trung tâm",
    "3.4": "Hình 3.4 Bố trí linh kiện và cọc đấu dây trên mạch in",
    "4.1": "Hình 4.1 Đồ thị so sánh công suất tức thời giữa giàn 2 trục và tấm cố định",
    "4.2": "Hình 4.2 Đồ thị so sánh sản lượng năng lượng tích lũy giữa hai mô hình"
}

TABLE_CAPTIONS = {
    "2.1": "Bảng 2.1 Thông số kỹ thuật vi điều khiển ESP32-S3 WROOM N16R8",
    "2.2": "Bảng 2.2 Thông số kỹ thuật động cơ bước NEMA 23 và Driver DM556",
    "2.3": "Bảng 2.3 Ma trận 49 luật hợp thành mờ hiệu chỉnh ΔKp, ΔKi, ΔKd",
    "3.1": "Bảng 3.1 Phân công nhiệm vụ và ánh xạ chân phần cứng vi điều khiển",
    "3.2": "Bảng 3.2 Trạng thái đóng ngắt của cụm 6 Relay trong các chế độ",
    "4.1": "Bảng 4.1 Danh mục 16 bước kiểm chuẩn tự động Bench Wizard (B0 - B15)",
    "4.2": "Bảng 4.2 Số liệu thực nghiệm đối chứng giữa giàn bám 2 trục và tấm cố định"
}

def build_docx(target_path):
    print(f"1. Copying {SRC_TEMPLATE} -> {target_path}...")
    shutil.copyfile(SRC_TEMPLATE, target_path)
    doc = docx.Document(target_path)
    body = doc._body._element

    # 2. Add TitleNoTOC style (cloned from Title, without outline level)
    title_style = doc.styles['Title']
    title_xml = title_style._element.xml
    new_style_xml = title_xml.replace('w:styleId="Title"', 'w:styleId="TitleNoTOC"')
    new_style_xml = new_style_xml.replace('<w:name w:val="Title"/>', '<w:name w:val="TitleNoTOC"/>')
    new_style_elem = parse_xml(new_style_xml)
    for pPr in new_style_elem.xpath('.//w:pPr'):
        for ol in pPr.xpath('./w:outlineLvl'):
            pPr.remove(ol)
    doc.styles._element.append(new_style_elem)

    # 3. Apply TitleNoTOC to the 4 intermediate frontmatter headings
    exclude_keywords = [
        'CÔNG TRÌNH ĐƯỢC HOÀN THÀNH',
        'LỊCH TRÌNH LÀM ĐỒ ÁN',
        'ỨNG DỤNG FUZZY LOGIC VÀ PSO TRONG ĐIỀU HƯỚNG PIN',
        'APPLICATION OF FUZZY LOGIC AND PSO IN SOLAR PANEL'
    ]
    for i, p in enumerate(doc.paragraphs[:160]):
        txt = p.text.strip().upper()
        if p.style.name == 'Title' and any(kw in txt for kw in exclude_keywords):
            p.style = 'TitleNoTOC'
            pPr = p._p.get_or_add_pPr()
            for ol in pPr.xpath('./w:outlineLvl'):
                pPr.remove(ol)

    # 4. Modify style 'toc 1': Times New Roman, 13pt (26 half-pt), Regular (no bold, no caps), dot leader tab
    s_toc1 = doc.styles['toc 1']
    rPr1 = s_toc1._element.get_or_add_rPr()
    for b in rPr1.xpath('./w:b'):
        rPr1.remove(b)
    for caps in rPr1.xpath('./w:caps'):
        rPr1.remove(caps)
    for sz in rPr1.xpath('./w:sz'):
        rPr1.remove(sz)
    rPr1.append(parse_xml(r'<w:sz %s w:val="26"/>' % nsdecls('w')))
    for rf in rPr1.xpath('./w:rFonts'):
        rPr1.remove(rf)
    rPr1.append(parse_xml(r'<w:rFonts %s w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>' % nsdecls('w')))

    # 4. Modify style 'toc 1': Times New Roman, 13pt (26 half-pt), Regular (no bold, no italic, no caps), dot leader tab
    s_toc1 = doc.styles['toc 1']
    rPr1 = s_toc1._element.get_or_add_rPr()
    for b in rPr1.xpath('./w:b'):
        rPr1.remove(b)
    for i_tag in rPr1.xpath('./w:i'):
        rPr1.remove(i_tag)
    for caps in rPr1.xpath('./w:caps'):
        rPr1.remove(caps)
    for sz in rPr1.xpath('./w:sz'):
        rPr1.remove(sz)
    rPr1.append(parse_xml(r'<w:sz %s w:val="26"/>' % nsdecls('w')))

    pPr1 = s_toc1._element.get_or_add_pPr()
    for tabs in pPr1.xpath('./w:tabs'):
        pPr1.remove(tabs)
    pPr1.append(parse_xml(r'<w:tabs %s><w:tab w:val="right" w:leader="dot" w:pos="9072"/></w:tabs>' % nsdecls('w')))
    for sp in pPr1.xpath('./w:spacing'):
        pPr1.remove(sp)
    pPr1.append(parse_xml(r'<w:spacing %s w:line="300" w:lineRule="auto" w:after="60"/>' % nsdecls('w')))

    # Modify style 'toc 2' and 'toc 3' (no bold, no italic, no caps)
    for name in ['toc 2', 'toc 3']:
        s = doc.styles[name]
        rPr = s._element.get_or_add_rPr()
        for b in rPr.xpath('./w:b'):
            rPr.remove(b)
        for i_tag in rPr.xpath('./w:i'):
            rPr.remove(i_tag)
        for caps in rPr.xpath('./w:caps'):
            rPr.remove(caps)
        for sz in rPr.xpath('./w:sz'):
            rPr.remove(sz)
        rPr.append(parse_xml(r'<w:sz %s w:val="26"/>' % nsdecls('w')))
        pPr = s._element.get_or_add_pPr()
        for tabs in pPr.xpath('./w:tabs'):
            pPr.remove(tabs)
        pPr.append(parse_xml(r'<w:tabs %s><w:tab w:val="right" w:leader="dot" w:pos="9072"/></w:tabs>' % nsdecls('w')))
        for sp in pPr.xpath('./w:spacing'):
            pPr.remove(sp)
        pPr.append(parse_xml(r'<w:spacing %s w:line="280" w:lineRule="auto" w:after="40"/>' % nsdecls('w')))

    # 5. Modify style 'table of figures': Times New Roman, 13pt, Regular (no bold, no italic, no caps), dot leader tab
    s_tof = doc.styles['table of figures']
    rPr_tof = s_tof._element.get_or_add_rPr()
    for b in rPr_tof.xpath('./w:b'):
        rPr_tof.remove(b)
    for i_tag in rPr_tof.xpath('./w:i'):
        rPr_tof.remove(i_tag)
    for caps in rPr_tof.xpath('./w:caps'):
        rPr_tof.remove(caps)
    for sz in rPr_tof.xpath('./w:sz'):
        rPr_tof.remove(sz)
    rPr_tof.append(parse_xml(r'<w:sz %s w:val="26"/>' % nsdecls('w')))
    for rf in rPr_tof.xpath('./w:rFonts'):
        rPr_tof.remove(rf)
    rPr_tof.append(parse_xml(r'<w:rFonts %s w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>' % nsdecls('w')))

    pPr_tof = s_tof._element.get_or_add_pPr()
    for tabs in pPr_tof.xpath('./w:tabs'):
        pPr_tof.remove(tabs)
    pPr_tof.append(parse_xml(r'<w:tabs %s><w:tab w:val="right" w:leader="dot" w:pos="9072"/></w:tabs>' % nsdecls('w')))
    for sp in pPr_tof.xpath('./w:spacing'):
        pPr_tof.remove(sp)
    pPr_tof.append(parse_xml(r'<w:spacing %s w:line="300" w:lineRule="auto" w:after="60"/>' % nsdecls('w')))

    # Ensure style 'Hình' and 'Bang' have bold=True, italic=False
    for name in ['Hình', 'Bang']:
        try:
            s = doc.styles[name]
            rPr = s._element.get_or_add_rPr()
            for i_tag in rPr.xpath('./w:i'):
                rPr.remove(i_tag)
            for b_tag in rPr.xpath('./w:b'):
                rPr.remove(b_tag)
            rPr.append(parse_xml(r'<w:b %s/>' % nsdecls('w')))
        except Exception:
            pass

    # 6. Remove `\* Upper` from P216 (DANH MỤC HÌNH ẢNH field)
    p216 = doc.paragraphs[216]
    for instr in p216._p.xpath('.//w:instrText'):
        if 'Upper' in instr.text:
            instr.getparent().remove(instr)

    # 7. Set page_break_before on major frontmatter headings
    for i, p in enumerate(doc.paragraphs[:300]):
        txt = p.text.strip().upper()
        if txt in ['DANH MỤC HÌNH ẢNH', 'DANH MỤC BẢNG BIỂU', 'DANH MỤC TỪ VIẾT TẮT']:
            p.paragraph_format.page_break_before = True

    # 8. Update Table 2 (Danh mục từ viết tắt)
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

    # 9. Update Chapter 2 Images with clean, concise captions (no colon)
    p332 = doc.paragraphs[332]
    p333 = doc.paragraphs[333]
    if os.path.exists("tampin.png"):
        p332.text = ""
        p332.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p332.paragraph_format.first_line_indent = Pt(0)
        p332.paragraph_format.keep_with_next = True
        p332.add_run().add_picture("tampin.png", width=Inches(3.2))
    p333.text = FIGURE_CAPTIONS["2.1"]
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
        p339.paragraph_format.keep_with_next = True
        p339.add_run().add_picture("Cấu tạo PV Panel.png", width=Inches(5.0))
    p340.text = FIGURE_CAPTIONS["2.2"]
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
        p349.paragraph_format.keep_with_next = True
        p349.add_run().add_picture("Ung_ung_thuc_te.jpg", width=Inches(5.0))
    p350.text = FIGURE_CAPTIONS["2.3"]
    for r in p350.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = False
        r.font.bold = True

    # Fix empty Hình/Bang styles
    for p in doc.paragraphs[330:355]:
        if p.style.name in ['Hình', 'Bang'] and not p.text.strip():
            p.style = 'Normal'

    # 10. Detach References
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

    # 11. Remove old content from P356
    target_remove_start = doc.paragraphs[356]._p
    children = list(body)
    start_idx = children.index(target_remove_start)
    sectPr_elem = body.xpath('./w:sectPr')[0]
    sectPr_idx = children.index(sectPr_elem)
    for i in range(start_idx, sectPr_idx):
        body.remove(children[i])

    # 12. Append Chapter 2 completion
    add_body_p(doc, CH2_ESP32_DATA["paragraphs"][2])
    add_styled_table(doc, TABLE_CAPTIONS["2.1"], CH2_ESP32_DATA["table_headers"], CH2_ESP32_DATA["table_rows"])
    for sec in CH2_ADDITIONAL_SECTIONS:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)
        if "table_caption" in sec:
            tbl_key = "2.2" if "2.2" in sec["table_caption"] else "2.3"
            add_styled_table(doc, TABLE_CAPTIONS[tbl_key], sec["table_headers"], sec["table_rows"])

    # 13. Append Chapter 3
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
                fig_num = None
                for k in ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"]:
                    if k in fig["caption"]:
                        fig_num = k
                        break
                caption_text = FIGURE_CAPTIONS.get(fig_num, fig["caption"])
                width_in = fig.get("width", fig.get("width_in", 5.0))
                add_figure(doc, fig["path"], caption_text, width_in=width_in)
        if "table_caption" in sec:
            tbl_key = "3.1" if "3.1" in sec["table_caption"] else "3.2"
            add_styled_table(doc, TABLE_CAPTIONS[tbl_key], sec["table_headers"], sec["table_rows"])

    # 14. Append Chapter 4
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
                fig_num = "4.1" if "4.1" in fig["caption"] else "4.2"
                if fig_num == "4.1":
                    fig_path = r"scratch\chart_power_comparison.png"
                else:
                    fig_path = r"scratch\chart_energy_wh_accumulation.png"
                add_figure(doc, fig_path, FIGURE_CAPTIONS[fig_num], width_in=fig.get("width_in", 5.8))
        if "table_caption" in sec:
            tbl_key = "4.1" if "4.1" in sec["table_caption"] else "4.2"
            add_styled_table(doc, TABLE_CAPTIONS[tbl_key], sec["table_headers"], sec["table_rows"])

    # 15. Append Chapter 5
    add_heading_2(doc, CH5_DATA["chapter_title"])
    for sec in CH5_DATA["sections"]:
        if sec["level"] == 3:
            add_heading_3(doc, sec["title"])
        elif sec["level"] == 4:
            add_heading_4(doc, sec["title"])
        for p_txt in sec["paragraphs"]:
            add_body_p(doc, p_txt)

    # 16. Re-attach References
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

def strip_toc_formatting(docx_path):
    doc = docx.Document(docx_path)
    count = 0
    for p in doc.paragraphs:
        if p.style.name in ['toc 1', 'toc 2', 'toc 3', 'table of figures']:
            for r in p._p.xpath('.//w:r'):
                for tag in r.xpath('./w:rPr/w:b | ./w:rPr/w:i'):
                    tag.getparent().remove(tag)
                    count += 1
    doc.save(docx_path)
    print(f"Stripped {count} direct bold/italic tags from all TOC/TOF runs across all hyperlinks!")

def update_fields_via_word_com(docx_path, pdf_path=None):
    import win32com.client
    print(f"Running Word COM on {docx_path} to update fields...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = False

    try:
        doc = word.Documents.Open(os.path.abspath(docx_path))
        print(f"TOC count: {doc.TablesOfContents.Count}, TOF count: {doc.TablesOfFigures.Count}")
        for i in range(1, doc.TablesOfContents.Count + 1):
            toc = doc.TablesOfContents.Item(i)
            toc.TabLeader = 1
            toc.Update()
            print(f"TOC #{i} updated.")
            
        for i in range(1, doc.TablesOfFigures.Count + 1):
            tof = doc.TablesOfFigures.Item(i)
            tof.TabLeader = 1
            tof.Update()
            print(f"TOF #{i} updated.")
            
        doc.Fields.Update()
        doc.Save()
        doc.Close(SaveChanges=True)
    finally:
        word.Quit()

    # Post-process: strip direct bold and italic from TOC and TOF generated runs
    strip_toc_formatting(docx_path)

    # Re-open in Word COM strictly to export PDF with the clean formatting
    if pdf_path:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False
        try:
            doc = word.Documents.Open(os.path.abspath(docx_path))
            doc.ExportAsFixedFormat(os.path.abspath(pdf_path), 17)
            print(f"Exported to {pdf_path}")
            doc.Close(SaveChanges=False)
        finally:
            word.Quit()
        print("Word COM finished successfully.")

def main():
    print("=== STEP 1: BUILDING OFFICIAL THUYẾT MINH DOCX & PDF ===")
    build_docx(DST_MAIN)
    update_fields_via_word_com(DST_MAIN, PDF_MAIN)
    
    print("=== STEP 2: SYNCHRONIZING TO THUYẾT MINH BACKUP ===")
    shutil.copyfile(DST_MAIN, DST_BACKUP)
    print("Successfully synchronized to THUYẾT MINH backup.docx!")

if __name__ == "__main__":
    main()

