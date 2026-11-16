import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import xml.etree.ElementTree as ET

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)
W_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

print('=== 1. MODIFYING NUMBERING.XML ABSTRACTNUM 4 ===')
num_elm = doc.part.numbering_part.element

for abs_num in num_elm.iter(W_NS + 'abstractNum'):
    if abs_num.get(W_NS + 'abstractNumId') == '4':
        print('Found abstractNumId 4!')
        for lvl in abs_num.iter(W_NS + 'lvl'):
            ilvl = lvl.get(W_NS + 'ilvl')
            lt = lvl.find(W_NS + 'lvlText')
            suff = lvl.find(W_NS + 'suff')
            pPr = lvl.find(W_NS + 'pPr')
            if pPr is None:
                pPr = OxmlElement('w:pPr')
                lvl.append(pPr)
            ind = pPr.find(W_NS + 'ind')
            if ind is None:
                ind = OxmlElement('w:ind')
                pPr.append(ind)
            
            # Set left=0, hanging=0 for all heading levels
            ind.set(W_NS + 'left', '0')
            ind.set(W_NS + 'hanging', '0')
            
            if ilvl == '0':
                # Chapter: CHƯƠNG %1:
                if suff is not None:
                    suff.set(W_NS + 'val', 'space')
                print('  Configured Level 0 (Chapter)')
            elif ilvl == '1':
                # Section: %1.%2 (no trailing dot)
                if lt is not None:
                    lt.set(W_NS + 'val', '%1.%2')
                if suff is None:
                    suff = OxmlElement('w:suff')
                    lvl.append(suff)
                suff.set(W_NS + 'val', 'space')
                print('  Configured Level 1 (%1.%2, left=0)')
            elif ilvl == '2':
                # Subsection: %1.%2.%3 (no trailing dot)
                if lt is not None:
                    lt.set(W_NS + 'val', '%1.%2.%3')
                if suff is None:
                    suff = OxmlElement('w:suff')
                    lvl.append(suff)
                suff.set(W_NS + 'val', 'space')
                print('  Configured Level 2 (%1.%2.%3, left=0)')

print('=== 2. MODIFYING STYLES.XML FOR HEADING 3 AND HEADING 4 ===')
styles_elm = doc.styles.element

for s in styles_elm.iter(W_NS + 'style'):
    sId = s.get(W_NS + 'styleId')
    if sId == 'Heading3':
        print('Updating Heading3 style...')
        pPr = s.find(W_NS + 'pPr')
        if pPr is not None:
            # Change jc to left
            jc = pPr.find(W_NS + 'jc')
            if jc is not None:
                jc.set(W_NS + 'val', 'left')
            else:
                pPr.append(parse_xml(f'<w:jc {nsdecls("w")} w:val="left"/>'))
            # Remove any ind from style pPr
            ind = pPr.find(W_NS + 'ind')
            if ind is not None:
                pPr.remove(ind)
        rPr = s.find(W_NS + 'rPr')
        if rPr is not None:
            # Ensure bold, no italic, black, 13pt
            if rPr.find(W_NS + 'b') is None:
                rPr.append(OxmlElement('w:b'))
            i_elem = rPr.find(W_NS + 'i')
            if i_elem is not None:
                rPr.remove(i_elem)
            iCs_elem = rPr.find(W_NS + 'iCs')
            if iCs_elem is not None:
                rPr.remove(iCs_elem)
    elif sId == 'Heading4':
        print('Updating Heading4 style...')
        pPr = s.find(W_NS + 'pPr')
        if pPr is not None:
            jc = pPr.find(W_NS + 'jc')
            if jc is not None:
                jc.set(W_NS + 'val', 'left')
            else:
                pPr.append(parse_xml(f'<w:jc {nsdecls("w")} w:val="left"/>'))
            ind = pPr.find(W_NS + 'ind')
            if ind is not None:
                pPr.remove(ind)
        rPr = s.find(W_NS + 'rPr')
        if rPr is not None:
            # Bold, NO italic
            if rPr.find(W_NS + 'b') is None:
                rPr.append(OxmlElement('w:b'))
            i_elem = rPr.find(W_NS + 'i')
            if i_elem is not None:
                rPr.remove(i_elem)
            iCs_elem = rPr.find(W_NS + 'iCs')
            if iCs_elem is not None:
                rPr.remove(iCs_elem)

print('=== 3. CLEANING LOCAL INDENTATION OVERRIDES ON ALL HEADING PARAGRAPHS ===')
cleaned_count = 0
for p in doc.paragraphs:
    if p.style.name in ['Heading 2', 'Heading 3', 'Heading 4']:
        pPr = p._p.find(W_NS + 'pPr')
        if pPr is not None:
            ind = pPr.find(W_NS + 'ind')
            if ind is not None:
                pPr.remove(ind)
                cleaned_count += 1
print(f'Cleaned {cleaned_count} local indentation overrides from heading paragraphs.')

doc.save(doc_path)
print('Saved updated document successfully!')
