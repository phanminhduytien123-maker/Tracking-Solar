import docx

doc = docx.Document('HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545_v2.docx')

print("Checking paragraphs around key sections...")

def check_text(p_range, desc):
    print(f"\n--- {desc} ---")
    for i in p_range:
        if i < len(doc.paragraphs):
            t = doc.paragraphs[i].text.strip()
            if t:
                print(f"P{i}: {t[:100]}...")

check_text(range(360, 376), "NOAA Section 2.7")
check_text(range(428, 445), "Mechanics Section 3.2")
check_text(range(478, 485), "Voc/Isc Section 3.5")
check_text(range(494, 502), "Control Section 3.6")
check_text(range(529, 544), "Algorithm Validation Section 4.1")
check_text(range(560, 568), "Energy Evaluation Section 4.3")

