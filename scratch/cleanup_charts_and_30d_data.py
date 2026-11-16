# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
import win32com.client
import fitz

DOCX_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
PDF_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.pdf"
BACKUP_PATH = r"D:\DOANTOTNGHIEP\THUYẾT MINH backup.docx"

IMG_POWER = r"D:\DOANTOTNGHIEP\scratch\placeholder_chart_power.png"
IMG_ENERGY = r"D:\DOANTOTNGHIEP\scratch\placeholder_chart_energy.png"

def cleanup_charts_and_data():
    print(f"Opening {DOCX_PATH}...")
    doc = docx.Document(DOCX_PATH)
    
    # 1. Update P526
    for p in doc.paragraphs:
        if "Chiến dịch đo đạc thực nghiệm được tiến hành liên tục ngoài trời, thu thập trọn vẹn 1.424" in p.text:
            print("Updating P526 introductory text...")
            p.text = (
                "Chiến dịch đo đạc thực nghiệm đối chứng được thiết lập để vận hành liên tục ngoài trời "
                "tại khu vực TP.HCM nhằm so sánh khách quan hiệu năng phát điện giữa giàn pin bám mặt trời "
                "thông minh hai trục và giàn pin cố định đối chứng trong các điều kiện thời tiết thực tế."
            )
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Pt(36)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
            break
            
    # 2. Update P528
    for p in doc.paragraphs:
        if "Đồ thị Hình 4.1 thể hiện rõ nét sự khác biệt về công suất phát điện" in p.text:
            print("Updating P528 power chart introduction...")
            p.text = (
                "Đồ thị Hình 4.1 thể hiện sự khác biệt về công suất phát điện tức thời P(t) giữa hai giàn pin, "
                "được ghi nhận tự động từ mạch đo công suất kỹ thuật số INA226 và hiển thị trực quan theo thời gian thực "
                "trên giao diện Web Dashboard của hệ thống:"
            )
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Pt(36)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
            break
            
    # 3. Replace Hình 4.1 image
    for i, p in enumerate(doc.paragraphs):
        if p.style.name == 'Hình' and "Hình 4.1" in p.text:
            prev_p = doc.paragraphs[i-1]
            print(f"Replacing Hình 4.1 image at P{i-1} with clean dashboard placeholder...")
            prev_p.text = ""
            prev_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            prev_p.paragraph_format.first_line_indent = Pt(0)
            prev_p.paragraph_format.space_before = Pt(6)
            prev_p.paragraph_format.space_after = Pt(4)
            prev_p.add_run().add_picture(IMG_POWER, width=Inches(5.4))
            break
            
    # 4. Update P533
    for p in doc.paragraphs:
        if "Đặc tuyến năng lượng tích lũy theo thời gian trên Hình 4.2 cho thấy" in p.text:
            print("Updating P533 cumulative energy introduction...")
            p.text = (
                "Đặc tuyến năng lượng tích lũy theo thời gian trên Hình 4.2 thể hiện tổng điện năng (Wh) thu nhận được "
                "trong ngày giữa hai mô hình, được cập nhật và tích lũy tự động từ cơ sở dữ liệu thời gian thực Firebase:"
            )
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Pt(36)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
            break

    # 5. Replace Hình 4.2 image
    for i, p in enumerate(doc.paragraphs):
        if p.style.name == 'Hình' and "Hình 4.2" in p.text:
            prev_p = doc.paragraphs[i-1]
            print(f"Replacing Hình 4.2 image at P{i-1} with clean dashboard placeholder...")
            prev_p.text = ""
            prev_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            prev_p.paragraph_format.first_line_indent = Pt(0)
            prev_p.paragraph_format.space_before = Pt(6)
            prev_p.paragraph_format.space_after = Pt(4)
            prev_p.add_run().add_picture(IMG_ENERGY, width=Inches(5.4))
            break

    # 6. Clear Table 9 (Bảng 4.2) data rows to clean placeholders '—'
    tbl42 = doc.tables[9]
    print(f"Formatting Table 4.2 (rows={len(tbl42.rows)}, cols={len(tbl42.columns)})...")
    for row_idx in range(1, len(tbl42.rows)):
        row = tbl42.rows[row_idx]
        for col_idx in range(1, len(row.cells)):
            cell = row.cells[col_idx]
            cell.text = "—"
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.05
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(100, 116, 139) # clean slate gray for placeholders
                
    # 7. Add note under Table 4.2
    for i, p in enumerate(doc.paragraphs):
        if p.style.name == 'Bang' and "Bảng 4.2" in p.text:
            # Paragraph right after table
            next_p = doc.paragraphs[i+1]
            print(f"Adding measurement progress note under Bảng 4.2 at P{i+1}...")
            next_p.text = (
                "*(Ghi chú: Chu kỳ đo đạc thực nghiệm đối chứng 30 ngày hiện đang được hệ thống IoT tiếp tục tự động ghi nhận; "
                "bảng số liệu hoàn chỉnh sẽ được trích xuất trực tiếp từ ứng dụng Web Dashboard sau khi kết thúc đợt thử nghiệm).*"
            )
            next_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            next_p.paragraph_format.first_line_indent = Pt(0)
            next_p.paragraph_format.space_before = Pt(4)
            next_p.paragraph_format.space_after = Pt(12)
            for r in next_p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
                r.font.italic = True
                r.font.color.rgb = RGBColor(100, 116, 139)
            break

    # 8. Clean up Section 4.3 calculations
    # Find paragraph "Từ bảng số liệu tổng kết toàn bộ chiến dịch thực nghiệm 1.424 điểm đo:"
    # and subsequent paragraphs with 769.5, 599.5, and the calculation equation
    p_to_remove = []
    for i, p in enumerate(doc.paragraphs):
        if "Từ bảng số liệu tổng kết toàn bộ chiến dịch thực nghiệm 1.424 điểm đo" in p.text:
            print(f"Updating Section 4.3 calculation text at P{i}...")
            p.text = (
                "Sau khi hoàn tất trọn vẹn chu kỳ đo đạc thực nghiệm đối chứng 30 ngày ngoài trời, "
                "tổng sản lượng điện năng thu được từ giàn pin bám trục (Wh_track) và tấm pin cố định (Wh_static) "
                "sẽ được trích xuất trực tiếp từ tab Quản lý dữ liệu lịch sử của Web Dashboard và thay thế vào công thức "
                "chuẩn trên để định lượng chính xác tỷ lệ gia tăng sản lượng năng lượng thực tế của hệ thống."
            )
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Pt(36)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
                
            # Clear paragraphs following it that had fake numbers
            for j in range(i+1, i+6):
                pj = doc.paragraphs[j]
                if any(k in pj.text for k in ["769.5", "599.5", "Tỷ lệ gia tăng năng lượng hữu ích tổng cộng", "34.62%"]):
                    print(f"Clearing paragraph P{j}: {repr(pj.text[:60])}")
                    pj.text = ""
                    pj.paragraph_format.space_before = Pt(0)
                    pj.paragraph_format.space_after = Pt(0)
                    # remove any omml in it
                    for omml in pj._p.xpath('.//m:oMath | .//m:oMathPara'):
                        omml.getparent().remove(omml)
            break

    # 9. Update Chapter 5 conclusion point 4
    for p in doc.paragraphs:
        if "4. Về hiệu quả thực nghiệm: Kết quả đo đạc thực tế minh bạch qua 1.424 điểm đo khoa học" in p.text:
            print("Updating Chapter 5 experimental conclusion...")
            p.text = (
                "\t4. Về hiệu quả thực nghiệm: Mô hình cơ khí hai trục và cụm cảm biến đo lường đã bước đầu vận hành "
                "ổn định ngoài trời, hệ thống truyền thông dữ liệu đám mây hoạt động thông suốt, sẵn sàng cho việc hoàn tất "
                "chu kỳ đo đạc đối chứng dài hạn 30 ngày nhằm cung cấp bộ số liệu khoa học đầy đủ và khách quan nhất."
            )
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
            break

    # Save
    print(f"Saving updated document to {DOCX_PATH}...")
    doc.save(DOCX_PATH)
    print("Docx updated successfully.")

def update_and_export():
    print("Launching Word COM to update fields and export PDF...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = False
    
    try:
        doc = word.Documents.Open(os.path.abspath(DOCX_PATH))
        for i in range(1, doc.TablesOfContents.Count + 1):
            doc.TablesOfContents.Item(i).Update()
        for i in range(1, doc.TablesOfFigures.Count + 1):
            doc.TablesOfFigures.Item(i).Update()
        doc.Fields.Update()
        doc.Save()
        
        print(f"Exporting PDF to {PDF_PATH}...")
        doc.ExportAsFixedFormat(os.path.abspath(PDF_PATH), 17)
        print("PDF export complete.")
        doc.Close(SaveChanges=False)
    finally:
        word.Quit()
        
    import shutil
    shutil.copyfile(DOCX_PATH, BACKUP_PATH)
    print(f"Synchronized backup to {BACKUP_PATH}.")

if __name__ == "__main__":
    cleanup_charts_and_data()
    update_and_export()
