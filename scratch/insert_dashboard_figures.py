import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

img1_path = r'd:\DOANTOTNGHIEP\scratch\dashboard_telemetry_chart.png'
img2_path = r'd:\DOANTOTNGHIEP\scratch\digital_twin_3d.png'

# Find target paragraph P513 (3. Kiến trúc bảo mật đa tầng)
target_p = None
p510 = None
p511 = None

for p in doc.paragraphs:
    txt = p.text.strip()
    if txt.startswith('3. Kiến trúc bảo mật đa tầng'):
        target_p = p
    elif txt.startswith('- Mô hình Song sinh số 3D'):
        p510 = p
    elif txt.startswith('- Hệ thống biểu đồ động'):
        p511 = p

if not target_p:
    print("Error: Could not find target paragraph!")
    exit(1)

print("Found target paragraph:", target_p.text[:50])

# Update references in P510 and P511
if p510 and '(Hình 3.6)' not in p510.text:
    p510.text = p510.text.rstrip('.') + ' (Hình 3.6).'
    print("Updated P510 with (Hình 3.6)")

if p511 and '(Hình 3.5)' not in p511.text:
    p511.text = p511.text.rstrip('.') + ' (Hình 3.5).'
    print("Updated P511 with (Hình 3.5)")

# Create Paragraph for Image 3.5
p_img1 = doc.add_paragraph()
r1 = p_img1.add_run()
r1.add_picture(img1_path, width=Inches(5.2))
p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_img1.paragraph_format.space_before = Pt(6)
p_img1.paragraph_format.space_after = Pt(2)

# Create Paragraph for Caption 3.5
p_cap1 = doc.add_paragraph("Hình 3.5 Giao diện giám sát dữ liệu đo đạc thời gian thực và biểu đồ trên Web Dashboard", style="Hình")
p_cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_cap1.paragraph_format.space_before = Pt(2)
p_cap1.paragraph_format.space_after = Pt(8)

# Create Paragraph for Image 3.6
p_img2 = doc.add_paragraph()
r2 = p_img2.add_run()
r2.add_picture(img2_path, width=Inches(5.2))
p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_img2.paragraph_format.space_before = Pt(6)
p_img2.paragraph_format.space_after = Pt(2)

# Create Paragraph for Caption 3.6
p_cap2 = doc.add_paragraph("Hình 3.6 Mô hình Song sinh số 3D (Three.js Digital Twin) mô phỏng không gian thực nghiệm giàn pin", style="Hình")
p_cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_cap2.paragraph_format.space_before = Pt(2)
p_cap2.paragraph_format.space_after = Pt(8)

# Move elements before target_p
target_p._p.addprevious(p_img1._p)
target_p._p.addprevious(p_cap1._p)
target_p._p.addprevious(p_img2._p)
target_p._p.addprevious(p_cap2._p)

doc.save(doc_path)
print("Saved document with Hình 3.5 and Hình 3.6 successfully!")
