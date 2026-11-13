# -*- coding: utf-8 -*-
"""
audit_table10_references.py - Detailed audit of Table 10 (References)
"""

import docx
from docx.shared import Pt, Inches

doc = docx.Document('THUYẾT MINH backup.docx')

print("=== AUDIT OF TABLE 10 (REFERENCES) ===")

ref_tbl = None
ref_tbl_idx = None

# Look for the references table (the one containing [1], [2], etc.)
for idx, tbl in enumerate(doc.tables):
    for r in tbl.rows:
        row_txt = " ".join(c.text for c in r.cells)
        if "[1]" in row_txt and "Pin mặt trời" in row_txt:
            ref_tbl = tbl
            ref_tbl_idx = idx
            break
    if ref_tbl:
        break

if not ref_tbl:
    print("[FAIL] References table not found!")
    exit(1)

print(f"References Table found at doc.tables[{ref_tbl_idx}]")
print(f"Total Rows: {len(ref_tbl.rows)}")
print(f"Total Columns: {len(ref_tbl.columns)}")

if len(ref_tbl.columns) == 2:
    print("[PASS] Table has proper 2-column format!")
else:
    print(f"[FAIL] Table columns = {len(ref_tbl.columns)}, expected 2!")

print("\nAuditing individual citations:")
expected_citations = [
    ("[1]", "Đặng Đình Thống (2005). Pin mặt trời và ứng dụng. Nhà xuất bản Khoa học và Kỹ thuật, Hà Nội."),
    ("[2]", "Kalogirou, S. A. (2014). Solar Energy Engineering: Processes and Systems (2nd ed.). Academic Press, Elsevier."),
    ("[3]", "Al-Rousan, N., Isa, N. A. M., & Desa, M. K. M. (2018). Advances in solar photovoltaic tracking systems: A review. Renewable and Sustainable Energy Reviews, 82, 2548-2569. https://doi.org/10.1016/j.rser.2017.09.077"),
    ("[4]", "Hoàng Quốc Bảo. Tìm hiểu cấu tạo tấm pin năng lượng mặt trời. Website Công ty TNHH TM DV Hoàng Quốc Bảo. https://www.hoangquocbao.com/tin-tuc/cau-tao-tam-pin-nang-luong-mat-troi/"),
    ("[5]", "Ponce-Jara, M., Castro, M., Pelaez-Samaniego, M. R., & Espinoza-Abad, J. L. (2022). Performance Comparison between Fixed and Dual-Axis Sun-Tracking Photovoltaic Panels with an IoT Monitoring System in the Coastal Region of Ecuador. Sustainability, 14(3), 1696. https://doi.org/10.3390/su14031696"),
    ("[6]", "Reda, I., & Andreas, A. (2004). Solar position algorithm for solar radiation applications. Solar Energy, 76(5), 577-589. https://doi.org/10.1016/j.solener.2003.12.003"),
    ("[7]", "Passino, K. M., & Yurkovich, S. (1998). Fuzzy Control. Addison-Wesley, Menlo Park, CA."),
    ("[8]", "Kennedy, J., & Eberhart, R. (1995). Particle swarm optimization. Proceedings of ICNN'95 - International Conference on Neural Networks, Perth, WA, Australia, 4, 1942-1948. https://doi.org/10.1109/ICNN.1995.488968"),
    ("[9]", "Espressif Systems (2023). ESP32-S3 Series Datasheet & Technical Reference Manual. Espressif Systems Co., Ltd. https://www.espressif.com/en/products/socs/esp32-s3"),
    ("[10]", "Texas Instruments (2015). INA226 High-Precision, Low-Side/High-Side Measurement, Bidirectional Current and Power Monitor with I2C Interface. Texas Instruments Inc.")
]

all_match = True
for r_idx, r in enumerate(ref_tbl.rows):
    col1 = r.cells[0].text.strip()
    col2 = r.cells[1].text.strip()
    exp_num, exp_txt = expected_citations[r_idx]
    
    num_match = (col1 == exp_num)
    txt_match = (col2 == exp_txt)
    
    # Check formatting of runs
    cell1_p = r.cells[0].paragraphs[0]
    cell2_p = r.cells[1].paragraphs[0]
    
    c1_font = cell1_p.runs[0].font.name if cell1_p.runs else None
    c1_bold = cell1_p.runs[0].font.bold if cell1_p.runs else None
    c2_font = cell2_p.runs[0].font.name if cell2_p.runs else None
    c2_size = cell2_p.runs[0].font.size.pt if (cell2_p.runs and cell2_p.runs[0].font.size) else None

    print(f"Row {r_idx+1:02d}: Num='{col1}' ({'[OK]' if num_match else '[FAIL]'}) | Font={c1_font}/{c2_font} Size={c2_size} Bold={c1_bold}")
    print(f"        Col2 text: '{col2[:80]}...'")
    if not (num_match and txt_match):
        all_match = False

if len(ref_tbl.rows) == 10 and all_match:
    print("\n[PASS] Table 10 has all 10 citations verified with 100% exact text and proper 2-column format!")
else:
    print(f"\n[NOTE] Row count={len(ref_tbl.rows)}, all_match={all_match}")
