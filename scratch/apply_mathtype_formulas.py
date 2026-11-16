# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
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

def format_equation_p(p, latex_str):
    omml_xml = latex_to_omml_xml(latex_str)
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.space_before = Pt(5)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    p._p.append(parse_xml(omml_xml))

def insert_equation_after(p, latex_str, doc):
    new_p = doc.add_paragraph()
    format_equation_p(new_p, latex_str)
    p._p.addnext(new_p._p)
    return new_p

def apply_all_formulas(docx_path):
    print(f"Opening {docx_path} to convert formulas to MathType/OMML equations...")
    doc = docx.Document(docx_path)
    
    # 1. Section 2.7 - NOAA Formulas
    for i, p in enumerate(doc.paragraphs):
        # 1a. Declination angle
        if "23.45° × sin(360°/365 × (284 + n))" in p.text:
            print(f"Converting P{i} -> Solar Declination equation")
            format_equation_p(p, r'\delta = 23.45^\circ \cdot \sin\left(\frac{360^\circ}{365} \cdot (284 + n)\right) \quad [2]')
            
        # 1b. Solar Elevation angle
        elif "sin(ε) = sin(φ) × sin(δ) + cos(φ) × cos(δ) × cos(ω)" in p.text:
            print(f"Converting P{i} -> Solar Elevation equation")
            format_equation_p(p, r'\sin(\alpha) = \sin(\varphi)\sin(\delta) + \cos(\varphi)\cos(\delta)\cos(\omega) \quad [2], [6]')
            
        # 1c. Solar Azimuth angle
        elif "cos(α) = (sin(ε) × sin(φ) - sin(δ)) / (cos(ε) × cos(φ))" in p.text:
            print(f"Converting P{i} -> Solar Azimuth equation")
            format_equation_p(p, r'\cos(\psi) = \frac{\sin(\alpha)\sin(\varphi) - \sin(\delta)}{\cos(\alpha)\cos(\varphi)} \quad [2], [6]')

    # 2. Section 2.8 - PID & Fuzzy-PID Formulas
    # Insert PID formula after P introducing PID
    for i, p in enumerate(doc.paragraphs):
        if "Để khắc phục triệt để mâu thuẫn này, đề tài ứng dụng lý thuyết logic mờ" in p.text:
            # The paragraph before it discusses PID
            prev_p = doc.paragraphs[i-1]
            if "bộ điều khiển tỉ lệ - tích phân - vi phân (PID) được sử dụng phổ biến" in prev_p.text:
                print(f"Inserting standard PID equation after P{i-1}")
                insert_equation_after(prev_p, r'u(t) = K_p \cdot e(t) + K_i \int_0^t e(\tau) \, d\tau + K_d \cdot \frac{de(t)}{dt} \quad [1], [7]', doc)
                break
                
    for i, p in enumerate(doc.paragraphs):
        if "Kp = Kp_base + ΔKp;" in p.text:
            print(f"Converting P{i} -> Fuzzy-PID adaptation equation")
            format_equation_p(p, r'K_p = K_{p\_base} + \Delta K_p, \quad K_i = K_{i\_base} + \Delta K_i, \quad K_d = K_{d\_base} + \Delta K_d \quad [7]')
            break

    # 3. Section 2.9 - PSO Formulas
    for i, p in enumerate(doc.paragraphs):
        if "v_i(k+1) = w × v_i(k) +" in p.text:
            print(f"Converting P{i} -> PSO velocity update equation")
            format_equation_p(p, r'v_i(k+1) = w \cdot v_i(k) + c_1 r_1 (p_{best, i} - x_i(k)) + c_2 r_2 (g_{best} - x_i(k)) \quad [8]')
            
        elif "x_i(k+1) = x_i(k) + v_i(k+1)" in p.text:
            print(f"Converting P{i} -> PSO position update equation")
            format_equation_p(p, r'x_i(k+1) = x_i(k) + v_i(k+1) \quad [8]')
            
        elif "J = ∫ [ t × |e(t)| + w_u × u²(t) ] dt" in p.text:
            print(f"Converting P{i} -> PSO objective fitness equation")
            format_equation_p(p, r'J = \int_0^T \left( t \cdot |e(t)| + w_u \cdot u^2(t) \right) dt \quad [7], [8]')

    # 4. Section 2.10 - Voc, Isc, Pmax & FF
    for i, p in enumerate(doc.paragraphs):
        if "tỷ lệ thuận gần như tuyến tính tuyệt đối với mật độ thông lượng bức xạ mặt trời" in p.text:
            print(f"Inserting Pmax and Fill Factor equations after P{i}")
            # Insert Pmax equation
            insert_equation_after(p, r'P_{max} = V_{mp} \cdot I_{mp} = FF \cdot V_{oc} \cdot I_{sc} \quad [1], [5]', doc)
            break

    # 5. Section 3.2 - Cơ khí và khí động học
    for i, p in enumerate(doc.paragraphs):
        if "J = (1/12) × M_tong × (a² + b²) + M_tong × R²_cg" in p.text:
            print(f"Converting P{i} -> Moment of Inertia formula")
            format_equation_p(p, r'J = \frac{1}{12} M_{tong} (a^2 + b^2) + M_{tong} R_{cg}^2 \quad [3]')
            
        elif "J ≈ (1/12) × 4.50 × (0.54² + 0.42²)" in p.text:
            print(f"Converting P{i} -> Numerical Inertia formula")
            format_equation_p(p, r'J \approx \frac{1}{12} \cdot 4.50 \cdot (0.54^2 + 0.42^2) + 4.50 \cdot (0.08^2) \approx 0.204 \text{ kg}\cdot\text{m}^2 \quad [3]')
            
        elif "P_gio = 0.5 × ρ_kk × v²_gio × C_d" in p.text:
            print(f"Converting P{i} -> Wind pressure formula")
            format_equation_p(p, r'P_{gio} = \frac{1}{2} \cdot \rho_{kk} \cdot v_{gio}^2 \cdot C_d \quad [3]')
            
        elif "P_gio = 0.5 × 1.225 × (10²) × 1.20 = 73.5 N/m²" in p.text:
            print(f"Converting P{i} -> Numerical wind pressure formula")
            format_equation_p(p, r'P_{gio} = 0.5 \cdot 1.225 \cdot (10.0)^2 \cdot 1.20 = 73.5 \text{ N/m}^2 \quad [3]')
            
        elif "Lực cản tổng cộng do gió tác động lên tấm pin: F_gio = P_gio × A_pv" in p.text:
            print(f"Converting P{i} -> Wind drag force formula")
            p.text = "Lực cản tổng cộng do áp lực gió tác động vuông góc lên bề mặt tấm pin được xác định theo [3]:"
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Pt(36)
            insert_equation_after(p, r'F_{gio} = P_{gio} \cdot A_{pv} = 73.5 \cdot 0.2268 \approx 16.67 \text{ N} \quad [3]', doc)
            
        elif "T_gio = F_gio × e_w = 16.67 × 0.05 ≈ 0.834 N·m" in p.text:
            print(f"Converting P{i} -> Wind torque formula")
            format_equation_p(p, r'T_{gio} = F_{gio} \cdot e_w = 16.67 \cdot 0.05 \approx 0.834 \text{ N}\cdot\text{m} \quad [3]')
            
        elif "T_can = T_gio + T_ms = 0.834 + 0.15 = 0.984 N·m" in p.text:
            print(f"Converting P{i} -> Total resisting torque formula")
            format_equation_p(p, r'T_{can} = T_{gio} + T_{ms} = 0.834 + 0.150 = 0.984 \text{ N}\cdot\text{m} \quad [3]')
            
        elif "k_at = T_holding / T_can = 1.90 / 0.984 ≈ 1.93" in p.text:
            print(f"Converting P{i} -> Motor safety factor formula")
            format_equation_p(p, r'k_{at} = \frac{T_{holding}}{T_{can}} = \frac{1.90}{0.984} \approx 1.93 \ge 1.50 \quad [3]')

    # 6. Section 4.3 - Experimental Energy Gain
    for i, p in enumerate(doc.paragraphs):
        if "Gain (%) = [(Wh_track - Wh_static) / Wh_static] × 100%" in p.text:
            print(f"Converting P{i} -> Energy gain formula")
            format_equation_p(p, r'\eta_{gain} = \frac{W_{h\_track} - W_{h\_static}}{W_{h\_static}} \cdot 100\% \quad [3], [5]')
            
        elif "Gain (%) = [(769.5 - 599.5) / 599.5] × 100% = + 28.36%" in p.text:
            print(f"Converting P{i} -> Numerical energy gain formula")
            format_equation_p(p, r'\eta_{gain} = \frac{769.5 - 599.5}{599.5} \cdot 100\% = +28.36\% \quad [5]')

    # Save
    print(f"Saving updated document with MathType/OMML equations to {docx_path}...")
    doc.save(docx_path)
    print("Document successfully updated.")

def update_and_export_pdf(docx_path, pdf_path):
    print("Launching Word COM to update fields and export PDF...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = False
    
    try:
        doc = word.Documents.Open(os.path.abspath(docx_path))
        print("Updating Tables of Contents...")
        for i in range(1, doc.TablesOfContents.Count + 1):
            toc = doc.TablesOfContents.Item(i)
            toc.TabLeader = 1
            toc.Update()
            
        print("Updating Tables of Figures...")
        for i in range(1, doc.TablesOfFigures.Count + 1):
            tof = doc.TablesOfFigures.Item(i)
            tof.TabLeader = 1
            tof.Update()
            
        doc.Fields.Update()
        doc.Save()
        
        print(f"Exporting PDF to {pdf_path}...")
        doc.ExportAsFixedFormat(os.path.abspath(pdf_path), 17)
        print("PDF export complete.")
        doc.Close(SaveChanges=False)
    finally:
        word.Quit()
        
    # Synchronize backup
    import shutil
    shutil.copyfile(docx_path, BACKUP_PATH)
    print(f"Synchronized to {BACKUP_PATH} successfully.")

if __name__ == "__main__":
    apply_all_formulas(DOCX_PATH)
    update_and_export_pdf(DOCX_PATH, PDF_PATH)

