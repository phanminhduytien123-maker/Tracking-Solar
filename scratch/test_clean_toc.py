import os
import docx
import win32com.client as win32
import fitz

src = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
test_docx = r'd:\DOANTOTNGHIEP\scratch\test_clean_toc.docx'
test_pdf = r'd:\DOANTOTNGHIEP\scratch\test_clean_toc.pdf'

doc = docx.Document(src)

# Strip w:b and w:i from all runs under toc 1, toc 2, toc 3, table of figures
count = 0
for p in doc.paragraphs:
    if p.style.name in ['toc 1', 'toc 2', 'toc 3', 'table of figures']:
        for r in p._p.xpath('.//w:r'):
            for tag in r.xpath('./w:rPr/w:b | ./w:rPr/w:i'):
                tag.getparent().remove(tag)
                count += 1

print(f"Stripped {count} b/i tags from all TOC/TOF runs across all hyperlinks!")

doc.save(test_docx)

# Export to PDF via Word COM (no field update, just export fixed format)
word = win32.DispatchEx("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
try:
    doc_com = word.Documents.Open(os.path.abspath(test_docx))
    doc_com.ExportAsFixedFormat(os.path.abspath(test_pdf), 17)
    doc_com.Close(False)
finally:
    word.Quit()

# Check PDF font flags with PyMuPDF
doc_pdf = fitz.open(test_pdf)
for pno in [10, 11, 12, 13]: # pages 11, 12, 13, 14
    page = doc_pdf[pno]
    blocks = page.get_text('dict')['blocks']
    print(f"\n=== PDF Page {pno+1} ===")
    for b in blocks:
        if 'lines' in b:
            for l in b['lines']:
                for s in l['spans']:
                    flags = s['flags']
                    it = bool(flags & 2)
                    b_flag = bool(flags & 16)
                    t = s['text'].strip()
                    if t and any(k in t for k in ['Hình', 'Bảng', '1.1', '2.1', '5.1', 'MỤC LỤC']):
                        print(f"[{s['font']} {round(s['size'],1)}pt it={it} b={b_flag}] {t[:55]}")

