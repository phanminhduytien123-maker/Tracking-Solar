# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
import latex2mathml.converter
import lxml.etree as ET
import win32com.client
import fitz

DOCX_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
PDF_PATH = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.pdf"
BACKUP_PATH = r"D:\DOANTOTNGHIEP\THUYẾT MINH backup.docx"

XSLT_PATH = r"C:\Program Files\Microsoft Office\Office16\MML2OMML.XSL"
xslt = ET.parse(XSLT_PATH)
transform = ET.XSLT(xslt)

def latex_to_omml_xml(latex_str):
    mml = latex2mathml.converter.convert(latex_str)
    dom = ET.fromstring(mml)
    omml = transform(dom)
    return ET.tostring(omml, encoding='utf-8').decode('utf-8')

def create_equation_p(doc, latex_str):
    p = doc.add_paragraph()
    omml_xml = latex_to_omml_xml(latex_str)
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    p._p.append(parse_xml(omml_xml))
    return p

def fix_optical_formula():
    print(f"Opening {DOCX_PATH}...")
    doc = docx.Document(DOCX_PATH)
    
    # 1. Fix P493: atan2(y_az, x_az) -> atan2(y, x)
    for i, p in enumerate(doc.paragraphs):
        if "atan2(y_az, x_az)" in p.text:
            print(f"Fixing atan2 in P{i}...")
            p.text = p.text.replace("atan2(y_az, x_az)", "atan2(y, x)")
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Pt(36)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.line_spacing = 1.3
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
            break
            
    # 2. Fix P494: optical differential error formulas
    target_idx = None
    for i, p in enumerate(doc.paragraphs):
        if "Chế độ bám quang vi sai thích nghi" in p.text and "e_az" in p.text:
            target_idx = i
            break
            
    if target_idx is None:
        raise ValueError("Could not find optical tracking paragraph")
        
    p_target = doc.paragraphs[target_idx]
    print(f"Found target paragraph at P{target_idx}...")
    
    # Text part 1: Introduction
    intro_text = (
        "- Chế độ bám quang vi sai thích nghi (Optical Differential Tracking): Khi cường độ ánh sáng mặt trời "
        "vượt qua ngưỡng sáng hoạt động (G_lux > 150 Lux) và độ chênh lệch giữa các cảm biến quang TEMT6000 rõ rệt, "
        "hệ thống kích hoạt bộ điều khiển mờ lai Fuzzy-PID. Nhằm khử hoàn toàn sự phụ thuộc vào cường độ ánh sáng tuyệt đối "
        "của môi trường và chuẩn hóa miền giá trị sai số về khoảng [-1, +1], sai số điện áp quang vi sai trên hai trục "
        "(Trục xoay và Trục ngửa) được tính toán theo công thức chuẩn mực [3], [5]:"
    )
    p_target.text = intro_text
    p_target.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_target.paragraph_format.first_line_indent = Pt(36)
    p_target.paragraph_format.space_after = Pt(4)
    p_target.paragraph_format.line_spacing = 1.3
    for r in p_target.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(13)
        
    # Equation 1: Trục xoay
    p_eq1 = create_equation_p(doc, r'e_{xoay} = \frac{V_{right} - V_{left}}{V_{right} + V_{left}} \quad [3], [5]')
    
    # Equation 2: Trục ngửa
    p_eq2 = create_equation_p(doc, r'e_{ngua} = \frac{V_{top} - V_{bottom}}{V_{top} + V_{bottom}} \quad [3], [5]')
    
    # Text part 2: Explanation
    p_explain = doc.add_paragraph(
        "trong đó V_right, V_left, V_top, V_bottom lần lượt là tín hiệu điện áp analog thu được từ 4 cảm biến quang "
        "TEMT6000 bố trí đối xứng qua vách ngăn chữ thập. Tín hiệu sai số chuẩn hóa e_xoay và e_ngua được đưa qua bộ luật mờ "
        "49 luật để tinh chỉnh độ lợi thích nghi cho từng trục. Giải thuật bầy đàn PSO đã tối ưu hóa bộ trọng số, giúp hệ thống "
        "nhanh chóng đưa tấm pin đạt tới trạng thái cân bằng vuông góc tuyệt đối với sai số bám quang học dưới ±0.5°."
    )
    p_explain.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_explain.paragraph_format.first_line_indent = Pt(36)
    p_explain.paragraph_format.space_after = Pt(6)
    p_explain.paragraph_format.line_spacing = 1.3
    for r in p_explain.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(13)
        
    # Insert in order after p_target
    p_target._p.addnext(p_explain._p)
    p_target._p.addnext(p_eq2._p)
    p_target._p.addnext(p_eq1._p)
    
    print(f"Saving {DOCX_PATH}...")
    doc.save(DOCX_PATH)
    print("Docx updated successfully.")

def update_fields_and_export():
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
        print("PDF export finished.")
        doc.Close(SaveChanges=False)
    finally:
        word.Quit()
        
    import shutil
    shutil.copyfile(DOCX_PATH, BACKUP_PATH)
    print(f"Synchronized backup to {BACKUP_PATH}.")

if __name__ == "__main__":
    fix_optical_formula()
    update_fields_and_export()
