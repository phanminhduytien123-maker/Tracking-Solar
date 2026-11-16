#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import zipfile
import shutil

src_template = r"D:\DOANTOTNGHIEP\scratch\ORIGINAL_UNTOUCHED_TEMPLATE_BACKUP.docx"
dst_template = r"D:\DOANTOTNGHIEP\scratch\TEMPLATE_FIXED_NUMBERING.docx"

zin = zipfile.ZipFile(src_template, 'r')
zout = zipfile.ZipFile(dst_template, 'w', compression=zipfile.ZIP_DEFLATED)

for item in zin.infolist():
    buffer = zin.read(item.filename)
    if item.filename == 'word/numbering.xml':
        text = buffer.decode('utf-8')
        count = text.count('<w:suff w:val="nothing"/>')
        text = text.replace('<w:suff w:val="nothing"/>', '<w:suff w:val="space"/>')
        buffer = text.encode('utf-8')
        print(f"Replaced {count} instances of nothing -> space in word/numbering.xml")
    zout.writestr(item, buffer)

zin.close()
zout.close()
print("Saved cleanly to TEMPLATE_FIXED_NUMBERING.docx")
