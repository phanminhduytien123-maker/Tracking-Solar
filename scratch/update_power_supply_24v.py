import docx
import re
import shutil

DOCX_PATH = "HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
MD_PATH = "docs/THIET_KE_PHAN_CUNG_PCB.md"

print(f"Opening {DOCX_PATH}...")
doc = docx.Document(DOCX_PATH)

# 1. Update P448
found_p448 = False
for i, p in enumerate(doc.paragraphs):
    if "Sử dụng bộ nguồn tổ ong chuyển mạch AC-DC công nghiệp" in p.text:
        print(f"Found P448 at index {i}")
        new_text = (
            "Sử dụng bộ nguồn tổ ong chuyển mạch AC-DC công nghiệp (Input: 220V AC, Output: 24V DC - 10A danh định, "
            "công suất 240W). Nguồn 24V này được nối trực tiếp vào cọc ốc nguồn của 2 driver vi bước DM556. "
            "Mức điện áp 24V DC nằm trong dải làm việc tối ưu của driver DM556 (20V - 50V DC), giúp động cơ bước NEMA 23 "
            "đạt mô-men xoắn cao và hoạt động mượt mà, triệt tiêu hoàn toàn hiện tượng sụt tốc hoặc trượt bước khi hệ thống "
            "chịu tải gió ngoài trời. Ngoài ra, một mạch hạ áp xung DC-DC hiệu suất cao Mini560 PRO (hạ áp từ 24V xuống 5V DC "
            "với tần số chuyển mạch 500 kHz) được đấu nối riêng trên nhánh này để cấp nguồn 5V nuôi bộ phát quang của 2 Encoder 3806. "
            "Nhờ đó, toàn bộ dòng điện lớn và nhiễu sóng hài công suất được giữ kín trong phân hệ động lực."
        )
        p.text = new_text
        found_p448 = True
        break

# 2. Update P461
found_p461 = False
for i, p in enumerate(doc.paragraphs):
    if "cọc nguồn 12V tổ ong và 12V ắc quy" in p.text:
        print(f"Found P461 at index {i}")
        p.text = p.text.replace("cọc nguồn 12V tổ ong và 12V ắc quy", "cọc nguồn 24V tổ ong và 12V ắc quy")
        found_p461 = True
        break

# 3. Update P578
found_p578 = False
for i, p in enumerate(doc.paragraphs):
    if "Tách biệt hoàn toàn giữa nguồn động lực 12V và nguồn điều khiển 12V ắc quy" in p.text:
        print(f"Found P578 at index {i}")
        p.text = p.text.replace(
            "Tách biệt hoàn toàn giữa nguồn động lực 12V và nguồn điều khiển 12V ắc quy",
            "Tách biệt hoàn toàn giữa nguồn động lực 24V (nguồn tổ ong) và nguồn điều khiển 12V (ắc quy)"
        )
        found_p578 = True
        break

# 4. Update Table 4 (Driver & Motor Voltage)
t4 = doc.tables[4]
print("Updating Table 4 Row 1 cells...")
t4.rows[1].cells[1].text = "12V - 36V DC (Đề tài dùng 24V DC)"
t4.rows[1].cells[2].text = "20V - 50V DC (Đề tài dùng 24V DC)"

# Re-apply justification to body paragraphs if needed
from docx.enum.text import WD_ALIGN_PARAGRAPH
for p in doc.paragraphs:
    if p.style.name == "Normal" and len(p.text.strip()) > 80:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

doc.save(DOCX_PATH)
print(f"Saved {DOCX_PATH} successfully! P448={found_p448}, P461={found_p461}, P578={found_p578}")

# 5. Update docs/THIET_KE_PHAN_CUNG_PCB.md
with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

md_content = md_content.replace('NGUỒN TỔ ONG 12V (CHUYÊN CÔNG SUẤT ĐỘNG CƠ)', 'NGUỒN TỔ ONG 24V (CHUYÊN CÔNG SUẤT ĐỘNG CƠ)')
md_content = md_content.replace('Cọc ốc 12V Nguồn Tổ Ong', 'Cọc ốc 24V Nguồn Tổ Ong')
md_content = md_content.replace('Mini560 PRO (12V -> 5V)', 'Mini560 PRO (24V -> 5V)')
md_content = md_content.replace('Hạ áp 12V tổ ong $\\to$ 5V', 'Hạ áp 24V tổ ong $\\to$ 5V')
md_content = md_content.replace('Đường nguồn 12V Nguồn Tổ Ong', 'Đường nguồn 24V Nguồn Tổ Ong')

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md_content)
print(f"Updated {MD_PATH} successfully!")

