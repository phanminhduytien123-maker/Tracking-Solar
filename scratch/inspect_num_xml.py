import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('THUYẾT MINH backup.docx', 'r') as z:
    with z.open('word/numbering.xml') as f:
        tree = ET.parse(f)
        root = tree.getroot()
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        for abstractNum in root.findall('w:abstractNum', ns):
            num_id = abstractNum.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}abstractNumId')
            print(f'=== abstractNumId: {num_id} ===')
            for lvl in abstractNum.findall('w:lvl', ns):
                ilvl = lvl.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ilvl')
                lvlText = lvl.find('w:lvlText', ns)
                val = lvlText.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if lvlText is not None else ''
                pStyle = lvl.find('w:pStyle', ns)
                style_val = pStyle.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if pStyle is not None else ''
                print(f'  lvl {ilvl}: text="{val}", style="{style_val}"')

