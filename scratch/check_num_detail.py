# -*- coding: utf-8 -*-
import docx

doc = docx.Document('THUYẾT MINH backup.docx')

for idx in [273, 274, 277, 323, 324, 425, 426, 538, 539, 574, 575]:
    p = doc.paragraphs[idx]
    xml = p._p.xml
    has_num = 'w:numPr' in xml
    num_val = ''
    if has_num:
        import xml.etree.ElementTree as ET
        tree = ET.fromstring(xml)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        numPr = tree.find('.//w:numPr', ns)
        if numPr is not None:
            ilvl = numPr.find('.//w:ilvl', ns)
            numId = numPr.find('.//w:numId', ns)
            num_val = f"ilvl={ilvl.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if ilvl is not None else '?'}, numId={numId.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if numId is not None else '?'}"
    print(f"P{idx} [{p.style.name}]: '{p.text}' | has_numPr: {has_num} ({num_val})")
