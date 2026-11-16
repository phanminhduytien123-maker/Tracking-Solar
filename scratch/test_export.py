import sys, os, docx, shutil
sys.path.append(r'd:\DOANTOTNGHIEP\scratch')
from build_perfect_thesis import update_fields_via_word_com

docx_path = r'D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
pdf_path = r'D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.pdf'
backup_path = r'D:\DOANTOTNGHIEP\THUYẾT MINH backup.docx'

print('Updating fields & exporting PDF...')
update_fields_via_word_com(docx_path, pdf_path)

# Synchronize backup
shutil.copyfile(docx_path, backup_path)
print('Backup synchronized.')

# Verify P0 and drawings in docx
doc = docx.Document(docx_path)
print('P0:', repr(doc.paragraphs[0].text))
for i, p in enumerate(doc.paragraphs):
    if 'Trong lĩnh vực tự động hóa' in p.text or 'Hình 2.3' in p.text:
        drawings = len(p._p.xpath('.//w:drawing'))
        print(f'P{i}: drawings={drawings}, text={repr(p.text[:60])}')

