import docx
from docx.shared import Pt, Inches
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

print('=== 1. OPTIMIZING IMAGE 4.1 AND 4.2 EXTENTS ===')
# Scale images slightly to width 4.8 in, height 1.68 in
cx_target = 4389120  # 4.8 inches in EMUs
cy_target = 1536192  # 1.68 inches in EMUs

for idx, p in enumerate(doc.paragraphs):
    xml = p._p.xml
    if 'w:drawing' in xml:
        # Check if this is image 4.1 or 4.2
        next_txt = doc.paragraphs[idx + 1].text if idx + 1 < len(doc.paragraphs) else ''
        if 'Hình 4.1' in next_txt or 'Hình 4.2' in next_txt:
            print(f'Resizing drawing for {next_txt[:30]}')
            for elem in p._p.iter():
                if elem.tag.endswith('extent'):
                    elem.set('cx', str(cx_target))
                    elem.set('cy', str(cy_target))
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)

print('=== 2. OPTIMIZING TABLE 4.2 (TABLE 9) ===')
tbl = doc.tables[9]
col_widths = [1150, 950, 950, 900, 900, 950, 900, 950, 1150]

# Set table cantSplit on all rows and tblHeader on row 0
for r_idx, row in enumerate(tbl.rows):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    if r_idx == 0:
        trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    
    # row heights: set compact
    for c_idx, cell in enumerate(row.cells):
        tcPr = cell._tc.get_or_add_tcPr()
        # set width
        w = col_widths[c_idx]
        tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="{w}" w:type="dxa"/>'))
        # cell margins
        tcPr.append(parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>'))
        # format paragraphs in cell
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.0
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(9.5 if r_idx > 0 else 9.5)

print('=== 3. TIGHTEN SPACING AROUND CAPTIONS & FOOTNOTE ===')
for p in doc.paragraphs:
    txt = p.text.strip()
    if txt.startswith('Hình 4.1') or txt.startswith('Hình 4.2'):
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
    elif txt.startswith('Bảng 4.2'):
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
    elif txt.startswith('*(Ghi chú: Chu kỳ đo đạc'):
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(6)

doc.save(doc_path)
print('Optimized docx saved successfully!')
