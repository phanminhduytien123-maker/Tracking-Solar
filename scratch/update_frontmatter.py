# -*- coding: utf-8 -*-
"""
Script to update front matter:
1. MỤC LỤC (Table of Contents)
2. DANH MỤC HÌNH ẢNH (List of Figures)
3. DANH MỤC BẢNG BIỂU (List of Tables)
4. DANH MỤC TỪ VIẾT TẮT (Acronyms Table)
"""

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from build_full_document import format_cell_text, set_cell_margins_and_borders

DOC_PATH = 'THUYẾT MINH backup.docx'

NEW_TOC_ITEMS = [
    ("toc 1", "LỜI CẢM ƠN\tii"),
    ("toc 1", "LỊCH TRÌNH LÀM ĐỒ ÁN TỐT NGHIỆP\tvi"),
    ("toc 1", "TÓM TẮT ĐỒ ÁN (TIẾNG VIỆT)\tvii"),
    ("toc 1", "ABSTRACT (TIẾNG ANH)\tix"),
    ("toc 1", "MỤC LỤC\tx"),
    ("toc 1", "DANH MỤC HÌNH ẢNH\txii"),
    ("toc 1", "DANH MỤC BẢNG BIỂU\txiii"),
    ("toc 1", "DANH MỤC TỪ VIẾT TẮT\txiv"),
    ("toc 2", "CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI\t1"),
    ("toc 3", "1.1. Tổng quan về hệ thống\t1"),
    ("toc 3", "1.2. Lí do chọn đề tài\t1"),
    ("toc 3", "1.3. Mục tiêu đề tài\t2"),
    ("toc 3", "1.4. Phạm vi nghiên cứu của đề tài\t3"),
    ("toc 3", "1.5. Dự kiến kết quả:\t4"),
    ("toc 2", "CHƯƠNG 2: CƠ SỞ LÝ THUYẾT\t6"),
    ("toc 3", "2.1. Pin năng lượng mặt trời\t6"),
    ("toc 3", "2.2. Vi điều khiển ESP32-S3 WROOM N16R8\t8"),
    ("toc 3", "2.3. Động cơ bước NEMA 23 và Driver điều khiển DM556\t9"),
    ("toc 3", "2.4. Cảm biến góc quay Rotary Encoder quang học 3806\t11"),
    ("toc 3", "2.5. Cảm biến ánh sáng quang học TEMT6000\t12"),
    ("toc 3", "2.6. Mạch đo công suất chuyên dụng INA226 và RTC DS3231\t13"),
    ("toc 3", "2.7. Bức xạ mặt trời và Mô hình chuyển động thiên văn NOAA\t14"),
    ("toc 3", "2.8. Cơ sở lý thuyết Điều khiển mờ và Bộ điều khiển lai Fuzzy-PID\t16"),
    ("toc 3", "2.9. Giải thuật Tối ưu hóa bầy đàn (PSO)\t18"),
    ("toc 3", "2.10. Cơ sở phương pháp đo điện áp hở mạch (Voc) và dòng ngắn mạch (Isc)\t19"),
    ("toc 2", "CHƯƠNG 3: THIẾT KẾ VÀ TÍNH TOÁN HỆ THỐNG\t21"),
    ("toc 3", "3.1. Thiết kế tổng thể và Sơ đồ khối hệ thống\t21"),
    ("toc 3", "3.2. Tính toán cơ khí và động lực học giàn quay 2 trục\t23"),
    ("toc 3", "3.3. Tính toán và thiết kế hệ thống nguồn cấp cách ly\t25"),
    ("toc 3", "3.4. Thiết kế sơ đồ nguyên lý và bo mạch in PCB All-In-One\t26"),
    ("toc 3", "3.5. Thiết kế hệ thống đo kiểm Voc, Isc và nhiệt độ tấm pin\t30"),
    ("toc 3", "3.6. Xây dựng thuật toán điều khiển và phần mềm nhúng vi điều khiển\t32"),
    ("toc 3", "3.7. Thiết kế giao diện giám sát IoT Web Dashboard và mô hình Digital Twin\t34"),
    ("toc 2", "CHƯƠNG 4: THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ\t37"),
    ("toc 3", "4.1. Mô hình thực nghiệm và Quy trình kiểm chuẩn Bench Wizard (B0 - B15)\t37"),
    ("toc 3", "4.2. Kết quả đo đạc thực nghiệm đối chứng năng lượng\t39"),
    ("toc 3", "4.3. Đánh giá hiệu suất thu năng lượng và tính toán tỷ lệ gia tăng sản lượng\t43"),
    ("toc 2", "CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN\t45"),
    ("toc 3", "5.1. Kết luận chung\t45"),
    ("toc 3", "5.2. Ưu điểm nổi bật của hệ thống\t46"),
    ("toc 3", "5.3. Những hạn chế cần khắc phục\t46"),
    ("toc 3", "5.4. Hướng phát triển trong tương lai\t47"),
    ("toc 1", "TÀI LIỆU THAM KHẢO\t48")
]

NEW_FIGURE_ITEMS = [
    ("toc 1", "HÌNH 2.1: TẤM PIN NĂNG LƯỢNG MẶT TRỜI ĐƠN TINH THỂ THỰC TẾ\t6"),
    ("toc 1", "HÌNH 2.2: CẤU TẠO ĐA TẦNG CỦA MỘT TẤM PIN NĂNG LƯỢNG MẶT TRỜI [4]\t7"),
    ("toc 1", "HÌNH 2.3: CÁC ỨNG DỤNG THỰC TẾ PHONG PHÚ CỦA PIN MẶT TRỜI [1]\t8"),
    ("toc 1", "HÌNH 3.1: SƠ ĐỒ NGUYÊN LÝ BO MẠCH MẸ ALL-IN-ONE MAINBOARD TRÊN KICAD\t27"),
    ("toc 1", "HÌNH 3.2: SƠ ĐỒ NGUYÊN LÝ BO MẠCH CẢM BIẾN QUANG VI SAI 4 HƯỚNG TEMT6000\t27"),
    ("toc 1", "HÌNH 3.3: PHỐI CẢNH 3D RENDER BO MẠCH MẸ TÍCH HỢP ALL-IN-ONE NHÌN NGHIÊNG\t28"),
    ("toc 1", "HÌNH 3.4: BỐ TRÍ TỔNG THỂ LINH KIỆN VÀ CỌC ĐẤU DÂY TRÊN BO MẠCH MẸ\t28"),
    ("toc 1", "HÌNH 3.5: CHI TIẾT KHỐI CHUYỂN MẠCH 6 RELAY VÀ HÀNG CỌC CÔNG SUẤT\t29"),
    ("toc 1", "HÌNH 3.6: CHI TIẾT KHU VỰC KẾT NỐI CẢM BIẾN QUANG VI SAI VÀ ĐO LƯỜNG\t29"),
    ("toc 1", "HÌNH 4.1: ĐỒ THỊ SO SÁNH CÔNG SUẤT TỨC THỜI GIỮA GIÀN 2 TRỤC VÀ TẤM CỐ ĐỊNH\t40"),
    ("toc 1", "HÌNH 4.2: ĐỒ THỊ SO SÁNH NĂNG LƯỢNG TÍCH LŨY THEO THỜI GIAN TRONG NGÀY\t41")
]

NEW_TABLE_ITEMS = [
    ("table of figures", "Bảng 2.1: Thông số kỹ thuật chi tiết của vi điều khiển ESP32-S3 WROOM N16R8 [9]\t9"),
    ("table of figures", "Bảng 2.2: Thông số kỹ thuật động cơ bước NEMA 23 và Driver điều khiển DM556\t10"),
    ("table of figures", "Bảng 2.3: Ma trận 49 luật hợp thành mờ hiệu chỉnh tham số ΔKp, ΔKi, ΔKd\t17"),
    ("table of figures", "Bảng 3.1: Bảng phân công nhiệm vụ và ánh xạ chân phần cứng hai vi điều khiển ESP32-S3\t22"),
    ("table of figures", "Bảng 3.2: Trạng thái đóng ngắt của cụm 6 Relay trong các pha vận hành của hệ thống\t31"),
    ("table of figures", "Bảng 4.1: Danh mục 16 bước kiểm chuẩn tự động Bench Wizard (B0 - B15) trên bàn thử nghiệm\t38"),
    ("table of figures", "Bảng 4.2: Trích xuất số liệu thực nghiệm đối chứng chi tiết giữa Giàn bám 2 trục và Tấm cố định\t42")
]

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

def main():
    print(f"Loading {DOC_PATH}...")
    doc = docx.Document(DOC_PATH)
    body = doc._body._element

    # Find the positions of:
    # 1. "MỤC LỤC" title
    # 2. "DANH MỤC HÌNH ẢNH" title
    # 3. "DANH MỤC BẢNG BIỂU" title
    # 4. "DANH MỤC TỪ VIẾT TẮT" title

    p_indices = {}
    for i, p in enumerate(doc.paragraphs[:300]):
        txt = p.text.strip()
        if txt == "MỤC LỤC":
            p_indices["toc"] = i
        elif txt == "DANH MỤC HÌNH ẢNH":
            p_indices["figs"] = i
        elif txt == "DANH MỤC BẢNG BIỂU":
            p_indices["tbls"] = i
        elif txt == "DANH MỤC TỪ VIẾT TẮT":
            p_indices["acronyms"] = i

    print("Found header indices:", p_indices)

    # 1. Update TOC items (from p_indices['toc'] + 1 up to p_indices['figs'] - 1)
    toc_start = p_indices["toc"] + 1
    toc_end = p_indices["figs"]
    # Collect paragraph elements to replace
    print(f"TOC spans from P{toc_start} to P{toc_end - 1} ({toc_end - toc_start} paragraphs)")

    # 2. Update Figure items (from p_indices['figs'] + 1 up to p_indices['tbls'] - 1)
    figs_start = p_indices["figs"] + 1
    figs_end = p_indices["tbls"]
    print(f"Figures span from P{figs_start} to P{figs_end - 1} ({figs_end - figs_start} paragraphs)")

    # 3. Update Table items (from p_indices['tbls'] + 1 up to p_indices['acronyms'] - 1)
    tbls_start = p_indices["tbls"] + 1
    tbls_end = p_indices["acronyms"]
    print(f"Tables span from P{tbls_start} to P{tbls_end - 1} ({tbls_end - tbls_start} paragraphs)")

    # Instead of deleting and shifting paragraph indices which can be tricky,
    # let's write helper functions that update the paragraph texts in-place!
    # If there are more old paragraphs than new, clear the extra ones (set text="").
    # If there are more new than old, insert them.

    # 1. Update TOC
    cur_idx = toc_start
    for style_name, text in NEW_TOC_ITEMS:
        if cur_idx < toc_end:
            p = doc.paragraphs[cur_idx]
            p.text = text
            p.style = style_name
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(12)
            cur_idx += 1
        else:
            # Need to insert paragraph before figs_start element
            break

    # Clear any remaining old TOC paragraphs before figs_start
    while cur_idx < toc_end:
        doc.paragraphs[cur_idx].text = ""
        cur_idx += 1

    # 2. Update Figures list
    cur_idx = figs_start
    for style_name, text in NEW_FIGURE_ITEMS:
        if cur_idx < figs_end:
            p = doc.paragraphs[cur_idx]
            p.text = text
            p.style = style_name
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
            cur_idx += 1
        else:
            break

    while cur_idx < figs_end:
        doc.paragraphs[cur_idx].text = ""
        cur_idx += 1

    # 3. Update Tables list
    cur_idx = tbls_start
    for style_name, text in NEW_TABLE_ITEMS:
        if cur_idx < tbls_end:
            p = doc.paragraphs[cur_idx]
            p.text = text
            p.style = style_name
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
            cur_idx += 1
        else:
            break

    while cur_idx < tbls_end:
        doc.paragraphs[cur_idx].text = ""
        cur_idx += 1

    # 4. Insert Acronyms Table right below DANH MỤC TỪ VIẾT TẮT
    print("Inserting Acronyms Table...")
    acronym_p = doc.paragraphs[p_indices["acronyms"]]
    # Next paragraph after acronym_p
    next_p = doc.paragraphs[p_indices["acronyms"] + 1]

    # Create table
    tbl = doc.add_table(rows=len(ACRONYMS_DATA) + 1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = True

    # Header
    hdr = tbl.rows[0].cells
    format_cell_text(hdr[0], "Ký hiệu viết tắt", bold=True, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.CENTER)
    format_cell_text(hdr[1], "Thuật ngữ đầy đủ (Tiếng Anh & Tiếng Việt)", bold=True, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.LEFT)
    shd0 = parse_xml(r'<w:shd %(ns)s w:fill="EBF2FA"/>' % {'ns': nsdecls('w')})
    shd1 = parse_xml(r'<w:shd %(ns)s w:fill="EBF2FA"/>' % {'ns': nsdecls('w')})
    hdr[0]._tc.get_or_add_tcPr().append(shd0)
    hdr[1]._tc.get_or_add_tcPr().append(shd1)
    set_cell_margins_and_borders(hdr[0])
    set_cell_margins_and_borders(hdr[1])

    # Rows
    for r_idx, (acronym, meaning) in enumerate(ACRONYMS_DATA):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_col = "FDFDFD" if r_idx % 2 == 0 else "F7FAFD"
        format_cell_text(row_cells[0], acronym, bold=True, size_pt=10, align=WD_ALIGN_PARAGRAPH.CENTER)
        format_cell_text(row_cells[1], meaning, bold=False, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT)
        s0 = parse_xml(r'<w:shd %(ns)s w:fill="%(color)s"/>' % {'ns': nsdecls('w'), 'color': bg_col})
        s1 = parse_xml(r'<w:shd %(ns)s w:fill="%(color)s"/>' % {'ns': nsdecls('w'), 'color': bg_col})
        row_cells[0]._tc.get_or_add_tcPr().append(s0)
        row_cells[1]._tc.get_or_add_tcPr().append(s1)
        set_cell_margins_and_borders(row_cells[0])
        set_cell_margins_and_borders(row_cells[1])

    # Move tbl element right after acronym_p in body
    tbl_elem = tbl._tbl
    # Detach tbl_elem from end of body
    body.remove(tbl_elem)
    # Insert right after acronym_p
    acronym_p._p.addnext(tbl_elem)
    print("Acronym Table placed successfully right after DANH MỤC TỪ VIẾT TẮT.")

    # Save
    print(f"Saving updated document to {DOC_PATH}...")
    doc.save(DOC_PATH)
    print("Front matter updated and saved successfully!")

if __name__ == '__main__':
    main()

