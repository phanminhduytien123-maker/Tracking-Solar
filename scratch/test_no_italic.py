import os
import sys
import docx
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import win32com.client as win32

# Test on a temporary copy
src = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
test_docx = r'd:\DOANTOTNGHIEP\scratch\test_no_italic.docx'
test_pdf = r'd:\DOANTOTNGHIEP\scratch\test_no_italic.pdf'

doc = docx.Document(src)

# Check and strip w:i and w:b from all TOC and TOF styles
for name in ['toc 1', 'toc 2', 'toc 3', 'table of figures']:
    try:
        s = doc.styles[name]
        rPr = s._element.get_or_add_rPr()
        for i_tag in rPr.xpath('./w:i'):
            rPr.remove(i_tag)
        for b_tag in rPr.xpath('./w:b'):
            rPr.remove(b_tag)
        for caps in rPr.xpath('./w:caps'):
            rPr.remove(caps)
    except Exception as e:
        print(f"Error on style {name}: {e}")

# Check and strip w:i and w:b from all runs in paragraphs of style toc 1, toc 2, toc 3, table of figures
count = 0
for p in doc.paragraphs:
    if p.style.name in ['toc 1', 'toc 2', 'toc 3', 'table of figures']:
        for r in p.runs:
            rPr = r._r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            if rPr is not None:
                for tag in rPr.xpath('./w:b | ./w:i'):
                    rPr.remove(tag)
                    count += 1
                # Also ensure explicit no-italic
                r.font.italic = False
                r.font.bold = False

print(f"Stripped {count} bold/italic tags from TOC/TOF runs")

# Also in body captions: ensure style 'Hình' and 'Bang' have no italic
for name in ['Hình', 'Bang']:
    try:
        s = doc.styles[name]
        rPr = s._element.get_or_add_rPr()
        for i_tag in rPr.xpath('./w:i'):
            rPr.remove(i_tag)
        # ensure font bold = True on the style itself
        for b_tag in rPr.xpath('./w:b'):
            rPr.remove(b_tag)
        rPr.append(parse_xml(r'<w:b %s/>' % nsdecls('w')))
    except Exception as e:
        print(f"Error on style {name}: {e}")

# For all body paragraphs with style 'Hình' or 'Bang', strip italic
for p in doc.paragraphs:
    if p.style.name in ['Hình', 'Bang']:
        for r in p.runs:
            r.font.italic = False
            rPr = r._r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            if rPr is not None:
                for tag in rPr.xpath('./w:i'):
                    rPr.remove(tag)

doc.save(test_docx)
print("Saved test_docx")

# Now run Word COM to export PDF without updating fields (or test both)
word = win32.DispatchEx("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
try:
    doc_com = word.Documents.Open(os.path.abspath(test_docx))
    doc_com.ExportAsFixedFormat(os.path.abspath(test_pdf), 17) # 17 = wdExportFormatPDF
    doc_com.Close(False)
finally:
    word.Quit()

print("Exported test_pdf successfully")

