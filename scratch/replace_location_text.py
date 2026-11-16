import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

DOCX_PATH = "HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"

print(f"Opening {DOCX_PATH}...")
doc = docx.Document(DOCX_PATH)

replacements = [
    # P363
    ("thời gian thực GMT+7 tại TP.HCM (φ = 10.7831°N, λ = 106.6721°E)",
     "thời gian thực GMT+7 tại khu vực làm thực nghiệm (φ = 10.7831°N, λ = 106.6721°E)"),
    # P431
    ("vận tốc gió thiết kế cấp 5 tại khu vực TP.HCM là vgió = 10 m/s:",
     "vận tốc gió thiết kế cấp 5 tại khu vực làm thực nghiệm là vgió = 10 m/s:"),
    # P494
    ("tọa độ địa lý TP.HCM, firmware tính toán góc xoay",
     "tọa độ địa lý tại khu vực làm thực nghiệm, firmware tính toán góc xoay"),
    # P523
    ("tại sân thượng cơ sở đào tạo ở Quận 7, Thành phố Hồ Chí Minh (tọa độ địa lý: 10.7831° Vĩ Bắc, 106.6721° Kinh Đông) [3].",
     "ngoài trời tại khu vực làm thực nghiệm (tọa độ địa lý: 10.7831° Vĩ Bắc, 106.6721° Kinh Đông) [3]."),
    # P526
    ("đã được chuẩn hóa cho khu vực Thành phố Hồ Chí Minh nhằm tối đa hóa",
     "đã được chuẩn hóa cho khu vực làm thực nghiệm nhằm tối đa hóa"),
    # P529
    ("Tọa độ thực nghiệm được cấu hình chuẩn xác tại Trường Đại học Tôn Đức Thắng (Vĩ độ 10.78310° N, Kinh độ 106.67210° E, múi giờ UTC+7).",
     "Tọa độ thực nghiệm được cấu hình chuẩn xác tại khu vực làm thực nghiệm (Vĩ độ 10.78310° N, Kinh độ 106.67210° E, múi giờ UTC+7)."),
    # P532
    ("Bảng 4.1 Bảng kết quả tính toán quỹ đạo mặt trời NOAA và góc điều khiển hai trục tại TP.HCM",
     "Bảng 4.1 Bảng kết quả tính toán quỹ đạo mặt trời NOAA và góc điều khiển hai trục tại khu vực làm thực nghiệm"),
    # P547
    ("liên tục ngoài trời tại khu vực TP.HCM nhằm so sánh khách quan",
     "liên tục ngoài trời tại khu vực làm thực nghiệm nhằm so sánh khách quan"),
]

modified_count = 0
for i, p in enumerate(doc.paragraphs):
    for old_str, new_str in replacements:
        if old_str in p.text:
            if len(p.runs) == 1:
                p.runs[0].text = p.runs[0].text.replace(old_str, new_str)
            else:
                for r in p.runs:
                    if old_str in r.text:
                        r.text = r.text.replace(old_str, new_str)
                        break
                else:
                    p.text = p.text.replace(old_str, new_str)
            modified_count += 1
            print(f"Updated P{i}: {p.text[:90]}...")

# Ensure justification for normal body paragraphs
for p in doc.paragraphs:
    if p.style.name == "Normal" and len(p.text.strip()) > 80:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

doc.save(DOCX_PATH)
print(f"Successfully saved {DOCX_PATH}. Total updated paragraphs: {modified_count}")

