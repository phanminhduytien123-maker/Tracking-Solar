import docx

doc = docx.Document(r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx')

print("=== DANH MỤC HÌNH ẢNH ===")
for i in range(210, 230):
    p = doc.paragraphs[i]
    if 'Hình' in p.text:
        print(f"P{i} ({p.style.name}): {repr(p.text)}")
        for r in p.runs:
            rPr = r._r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            rPr_xml = rPr.xml if rPr is not None else "None"
            print(f"   run: text={repr(r.text)}, bold={r.bold}, italic={r.italic}, rPr={rPr_xml}")

print("\n=== DANH MỤC BẢNG BIỂU ===")
for i in range(230, 250):
    p = doc.paragraphs[i]
    if 'Bảng' in p.text:
        print(f"P{i} ({p.style.name}): {repr(p.text)}")
        for r in p.runs:
            rPr = r._r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            rPr_xml = rPr.xml if rPr is not None else "None"
            print(f"   run: text={repr(r.text)}, bold={r.bold}, italic={r.italic}, rPr={rPr_xml}")

