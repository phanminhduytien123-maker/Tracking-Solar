# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import win32com.client
import fitz

DOCX_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
PDF_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.pdf"
BACKUP_PATH = r"D:\DOANTOTNGHIEP\THUYẾT MINH backup.docx"

ACRONYMS = [
    ("ADC", "Analog-to-Digital Converter (Bộ chuyển đổi tương tự sang số)"),
    ("DC", "Direct Current (Dòng điện một chiều)"),
    ("DM556", "Driver điều khiển động cơ bước công suất chuyên dụng"),
    ("EMC", "Electromagnetic Compatibility (Tương thích điện từ)"),
    ("ESP32-S3", "Vi điều khiển 32-bit lõi kép Xtensa LX7 tích hợp Wi-Fi/BLE"),
    ("FLC", "Fuzzy Logic Controller (Bộ điều khiển logic mờ)"),
    ("FOTA", "Firmware Over-The-Air (Nâng cấp phần mềm từ xa qua mạng)"),
    ("FSM", "Finite State Machine (Máy trạng thái hữu hạn)"),
    ("I2C", "Inter-Integrated Circuit (Giao thức truyền thông nối tiếp 2 dây)"),
    ("INA226", "Mạch tích hợp đo điện áp và dòng điện độ chính xác cao"),
    ("IoT", "Internet of Things (Internet vạn vật)"),
    ("Isc", "Short-Circuit Current (Dòng điện ngắn mạch của pin mặt trời)"),
    ("LDR", "Light Dependent Resistor (Quang điện trở / Cảm biến quang)"),
    ("MCU", "Microcontroller Unit (Bộ vi điều khiển)"),
    ("MPPT", "Maximum Power Point Tracking (Bám điểm công suất cực đại)"),
    ("NEMA 23", "Động cơ bước tiêu chuẩn công nghiệp frame size 23"),
    ("NOAA", "National Oceanic and Atmospheric Administration (Cơ quan Khí quyển và Đại dương Hoa Kỳ)"),
    ("PCB", "Printed Circuit Board (Mạch in)"),
    ("PCNT", "Pulse Counter (Bộ đếm xung phần cứng tích hợp trên ESP32)"),
    ("PID", "Proportional - Integral - Derivative (Bộ điều khiển Tỉ lệ - Tích phân - Vi phân)"),
    ("Pmax", "Maximum Power (Công suất cực đại của tấm pin)"),
    ("PSO", "Particle Swarm Optimization (Thuật toán tối ưu hóa bầy đàn)"),
    ("PV", "Photovoltaic (Quang điện / Pin năng lượng mặt trời)"),
    ("RTC", "Real-Time Clock (Đồng hồ thời gian thực DS3231)"),
    ("RTDB", "Realtime Database (Cơ sở dữ liệu thời gian thực Google Firebase)"),
    ("UART", "Universal Asynchronous Receiver-Transmitter (Truyền thông nối tiếp bất đồng bộ)"),
    ("Voc", "Open-Circuit Voltage (Điện áp hở mạch của pin mặt trời)"),
]

def add_acronyms_table(docx_path):
    print(f"Opening {docx_path}...")
    doc = docx.Document(docx_path)
    
    # 1. Find the target Title paragraph "DANH MỤC TỪ VIẾT TẮT"
    target_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.style.name == "Title" and "DANH MỤC TỪ VIẾT TẮT" in p.text.upper():
            target_idx = i
            break
            
    if target_idx is None:
        for i, p in enumerate(doc.paragraphs):
            if not p.style.name.startswith("toc") and "DANH MỤC TỪ VIẾT TẮT" in p.text.upper():
                target_idx = i
                break
                
    if target_idx is None:
        raise ValueError("Could not find paragraph 'DANH MỤC TỪ VIẾT TẮT'")
        
    p_title = doc.paragraphs[target_idx]
    print(f"Found title at P{target_idx}: {repr(p_title.text)} (style: {p_title.style.name})")
    p_title.paragraph_format.space_after = Pt(12)
    p_title.paragraph_format.space_before = Pt(0)
    
    # Check if a table already exists right after this title and remove it
    next_elem = p_title._p.getnext()
    if next_elem is not None and next_elem.tag.endswith('tbl'):
        print("Removing existing table right after title...")
        next_elem.getparent().remove(next_elem)
        
    # 2. Create the 2-column table
    tbl = doc.add_table(rows=len(ACRONYMS), cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Table properties: 100% width, NO borders (hide bảng hoàn toàn)
    tblPr = tbl._tbl.tblPr
    tblBorders = parse_xml(r'''
        <w:tblBorders %s>
            <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
    ''' % nsdecls('w'))
    tblPr.append(tblBorders)
    
    # Table cell margins: flush left with page margins
    tblCellMar = parse_xml(r'''
        <w:tblCellMar %s>
            <w:top w:w="20" w:type="dxa"/>
            <w:bottom w:w="20" w:type="dxa"/>
            <w:left w:w="0" w:type="dxa"/>
            <w:right w:w="60" w:type="dxa"/>
        </w:tblCellMar>
    ''' % nsdecls('w'))
    tblPr.append(tblCellMar)
    
    col_w_0 = 1656  # 1.15 in (~2.9 cm)
    col_w_1 = 7128  # 4.95 in (~12.6 cm) - Total 8784 dxa = 15.5 cm
    
    for row_idx, (abbr, full_name) in enumerate(ACRONYMS):
        row = tbl.rows[row_idx]
        
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(r'<w:cantSplit %s/>' % nsdecls('w')))
        
        # Col 0: Abbreviation
        c0 = row.cells[0]
        c0.width = Inches(1.15)
        c0_tcPr = c0._tc.get_or_add_tcPr()
        c0_tcW = parse_xml(r'<w:tcW %s w:w="%d" w:type="dxa"/>' % (nsdecls('w'), col_w_0))
        c0_tcPr.append(c0_tcW)
        c0_borders = parse_xml(r'''
            <w:tcBorders %s>
                <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            </w:tcBorders>
        ''' % nsdecls('w'))
        c0_tcPr.append(c0_borders)
        
        p0 = c0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p0.paragraph_format.first_line_indent = Pt(0)
        p0.paragraph_format.space_before = Pt(1)
        p0.paragraph_format.space_after = Pt(1)
        p0.paragraph_format.line_spacing = 1.05
        
        run0 = p0.add_run(abbr)
        run0.font.name = "Times New Roman"
        run0.font.size = Pt(12)
        run0.font.bold = True
        run0.font.color.rgb = RGBColor(0, 0, 0)
        
        # Col 1: Full name and definition
        c1 = row.cells[1]
        c1.width = Inches(4.95)
        c1_tcPr = c1._tc.get_or_add_tcPr()
        c1_tcW = parse_xml(r'<w:tcW %s w:w="%d" w:type="dxa"/>' % (nsdecls('w'), col_w_1))
        c1_tcPr.append(c1_tcW)
        c1_borders = parse_xml(r'''
            <w:tcBorders %s>
                <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            </w:tcBorders>
        ''' % nsdecls('w'))
        c1_tcPr.append(c1_borders)
        
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p1.paragraph_format.first_line_indent = Pt(0)
        p1.paragraph_format.space_before = Pt(1)
        p1.paragraph_format.space_after = Pt(1)
        p1.paragraph_format.line_spacing = 1.05
        
        run1 = p1.add_run(full_name)
        run1.font.name = "Times New Roman"
        run1.font.size = Pt(12)
        run1.font.bold = False
        run1.font.italic = False
        run1.font.color.rgb = RGBColor(0, 0, 0)
        
    # 3. Position the table right after p_title in the document flow
    p_title._p.addnext(tbl._tbl)
    
    # Save document in-place
    print(f"Saving updated docx to {docx_path}...")
    doc.save(docx_path)
    print("Docx updated successfully with borderless acronyms table.")

def update_fields_and_export_pdf(docx_path, pdf_path):
    print("Launching Word COM to update fields and export PDF...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = False
    
    try:
        doc = word.Documents.Open(os.path.abspath(docx_path))
        print(f"Updating TOCs (count={doc.TablesOfContents.Count})...")
        for i in range(1, doc.TablesOfContents.Count + 1):
            toc = doc.TablesOfContents.Item(i)
            toc.TabLeader = 1
            toc.Update()
            
        print(f"Updating TOFs (count={doc.TablesOfFigures.Count})...")
        for i in range(1, doc.TablesOfFigures.Count + 1):
            tof = doc.TablesOfFigures.Item(i)
            tof.TabLeader = 1
            tof.Update()
            
        doc.Fields.Update()
        doc.Save()
        
        print(f"Exporting PDF to {pdf_path}...")
        doc.ExportAsFixedFormat(os.path.abspath(pdf_path), 17)
        print("PDF export completed.")
        doc.Close(SaveChanges=False)
    finally:
        word.Quit()
        
    # Synchronize backup
    import shutil
    shutil.copyfile(docx_path, BACKUP_PATH)
    print(f"Synchronized to {BACKUP_PATH} successfully.")

if __name__ == "__main__":
    add_acronyms_table(DOCX_PATH)
    update_fields_and_export_pdf(DOCX_PATH, PDF_PATH)
