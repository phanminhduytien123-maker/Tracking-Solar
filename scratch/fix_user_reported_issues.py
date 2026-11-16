import docx

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

# 1. Fix P0: 'ỔNG' -> 'TỔNG'
p0 = doc.paragraphs[0]
print("Old P0 text:", repr(p0.text))
if p0.text.startswith("ỔNG"):
    # update the run directly
    for r in p0.runs:
        if "ỔNG" in r.text:
            r.text = r.text.replace("ỔNG", "TỔNG")
    print("New P0 text:", repr(p0.text))

# 2. Fix P329: remove drawing from P329
for i, p in enumerate(doc.paragraphs):
    if "Trong lĩnh vực tự động hóa, điều khiển thông minh và thu thập số liệu" in p.text:
        print(f"Found target paragraph at P{i}:")
        drawings = p._p.xpath('.//w:drawing')
        print(f"  Drawings in P{i}: {len(drawings)}")
        # Remove any w:drawing element inside this paragraph
        for d in drawings:
            # find parent run or element and remove drawing
            d.getparent().remove(d)
        print(f"  Drawings after removal: {len(p._p.xpath('.//w:drawing'))}")
        # Also clean empty runs that held the drawing
        for r in list(p.runs):
            if not r.text and not r._r.xpath('.//*[not(self::w:rPr)]'):
                p._p.remove(r._r)

# Verify P329, P330, P331
print("\n--- Verifying paragraphs around Hình 2.3 ---")
for i, p in enumerate(doc.paragraphs):
    if any(k in p.text for k in ["Trong lĩnh vực tự động hóa", "Hình 2.3", "Ngoài ra, nguồn quang điện"]):
        drawings = len(p._p.xpath('.//w:drawing'))
        print(f"P{i}: drawings={drawings}, text={repr(p.text[:60])}")

doc.save(doc_path)
print("\nSaved HK1_2627_DATN_...docx successfully.")

