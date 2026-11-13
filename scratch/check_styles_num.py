# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET

DOC_PATH = 'THUYẾT MINH backup.docx'

with zipfile.ZipFile(DOC_PATH, 'r') as zf:
    styles_xml = zf.read('word/styles.xml')
    numbering_xml = zf.read('word/numbering.xml') if 'word/numbering.xml' in zf.namelist() else None

tree = ET.fromstring(styles_xml)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

for style in tree.findall('.//w:style', ns):
    s_id = style.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styleId')
    name = style.find('.//w:name', ns)
    name_val = name.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if name is not None else ''
    
    numPr = style.find('.//w:numPr', ns)
    if 'Heading' in name_val or 'heading' in s_id.lower():
        has_num = numPr is not None
        num_info = ""
        if has_num:
            ilvl = numPr.find('.//w:ilvl', ns)
            numId = numPr.find('.//w:numId', ns)
            num_info = f"ilvl={ilvl.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if ilvl is not None else '?'}, numId={numId.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if numId is not None else '?'}"
        print(f"Style: '{s_id}' (Name: '{name_val}') | has_numPr: {has_num} ({num_info})")

if numbering_xml:
    print("\nNumbering XML found! Length:", len(numbering_xml))
    num_tree = ET.fromstring(numbering_xml)
    for num in num_tree.findall('.//w:num', ns):
        nid = num.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}numId')
        abid = num.find('.//w:abstractNumId', ns)
        ab_val = abid.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if abid is not None else ''
        print(f"  numId={nid} -> abstractNumId={ab_val}")

    for ab in num_tree.findall('.//w:abstractNum', ns):
        ab_id = ab.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}abstractNumId')
        print(f"\nAbstractNum id={ab_id}:")
        for lvl in ab.findall('.//w:lvl', ns):
            ilvl = lvl.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ilvl')
            lvlText = lvl.find('.//w:lvlText', ns)
            lt_val = lvlText.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if lvlText is not None else ''
            print(f"    ilvl={ilvl} lvlText='{lt_val}'")
