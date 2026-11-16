import fitz

doc = fitz.open(r'D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.pdf')
print('Total pages:', len(doc))

# Check Page 0 (Page 1 in Word)
p0_text = doc[0].get_text()
for line in p0_text.splitlines()[:5]:
    if 'LIÊN ĐOÀN' in line:
        print('Cover header line:', repr(line))

# Search for 'Hình 2.3' and images on pages 20 to 25
for page_num in range(len(doc)):
    text = doc[page_num].get_text()
    if 'Hình 2.3' in text or 'Trong lĩnh vực tự động hóa' in text:
        images = doc[page_num].get_images()
        print(f'Page {page_num + 1}: images={len(images)}')
        for line in text.splitlines():
            if any(k in line for k in ['Hình 2.3', 'Trong lĩnh vực', 'Ngoài ra, nguồn']):
                print(f'   Line: {repr(line)}')

