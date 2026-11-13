# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET

DOC_PATH = 'THUYẾT MINH backup.docx'

with zipfile.ZipFile(DOC_PATH, 'r') as zf:
    styles_xml = zf.read('word/styles.xml')

tree = ET.fromstring(styles_xml)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

normal = None
for s in tree.findall('.//w:style', ns):
    if s.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styleId') == 'Normal':
        normal = s
        break

if normal is not None:
    print(ET.tostring(normal, encoding='utf-8').decode('utf-8'))
