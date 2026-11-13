# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET

DOC_PATH = 'THUYẾT MINH backup.docx'

with zipfile.ZipFile(DOC_PATH, 'r') as zf:
    styles_xml = zf.read('word/styles.xml')

tree = ET.fromstring(styles_xml)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

docDefaults = tree.find('.//w:docDefaults', ns)
if docDefaults is not None:
    print(ET.tostring(docDefaults, encoding='utf-8').decode('utf-8'))
