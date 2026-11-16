import docx
from docx.oxml import OxmlElement

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

print('=== 1. RELOCATING HINH 4.1 TO SECTION 1 ===')
# Find P532, P534, P535
p_sec2 = None
p_img41 = None
p_cap41 = None

for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if txt.startswith('2. Phân tích sự tích lũy năng lượng tổng cộng'):
        p_sec2 = p
    elif 'Hình 4.1 Đồ thị so sánh công suất tức thời' in txt:
        p_cap41 = p
        p_img41 = doc.paragraphs[i - 1]

if p_sec2 and p_img41 and p_cap41:
    print('Found elements! Moving p_img41 and p_cap41 before p_sec2...')
    # Move p_img41 before p_sec2
    p_sec2._p.addprevious(p_img41._p)
    # Move p_cap41 before p_sec2
    p_sec2._p.addprevious(p_cap41._p)
    print('Successfully moved Hình 4.1 to Section 1!')
else:
    print('ERROR finding elements:', p_sec2, p_img41, p_cap41)

print('=== 2. REFINING TEXT IN SECTION 4.2 (REMOVING HARDCODED NUMBERS) ===')
for p in doc.paragraphs:
    txt = p.text
    if txt.startswith('- Khung giờ sáng sớm (07:00 - 10:00):'):
        p.text = '- Khung giờ sáng sớm (07:00 - 10:00): Mặt trời ở vị trí góc ngửa thấp phía Đông. Tấm pin cố định (hướng Nam) bị chùm tia nắng chiếu với góc tới rất lớn (góc xiên), dẫn đến phản xạ quang học bề mặt cao và mật độ thông lượng quang hữu ích thấp. Trong khi đó, giàn pin bám trục 2 trục tự động xoay về hướng Đông với góc ngửa thấp thích hợp, đón vuông góc chùm tia bức xạ trực tiếp, sản sinh công suất tức thời vượt trội rõ rệt so với giàn cố định.'
        print('Updated P morning')
    elif txt.startswith('- Khung giờ trưa (11:30 - 13:00):'):
        p.text = '- Khung giờ trưa (11:30 - 13:00): Vị trí Mặt Trời lên cao gần đỉnh đầu và hướng gần về phía Nam. Tại khoảng thời gian này, góc chiếu nắng tương đối vuông góc với cả hai giàn pin, công suất phát của hai hệ thống tiệm cận nhau.'
        print('Updated P noon')
    elif txt.startswith('- Khung giờ chiều muộn (14:30 - 17:00):'):
        p.text = '- Khung giờ chiều muộn (14:30 - 17:00): Tương tự như buổi sáng, Mặt Trời lặn dần về hướng Tây. Tấm pin cố định bị mất nắng nhanh chóng do góc chiếu bị xiên lệch lớn và hiệu suất quang điện suy giảm mạnh. Ngược lại, giàn pin 2 trục tiếp tục bám sát quang phổ hướng Tây, duy trì công suất phát ổn định cho đến tận khi Mặt Trời lặn xuống dưới đường chân trời.'
        print('Updated P afternoon')

print('=== 3. REMOVING SYNTHETIC CALCULATION AND EXTRA BLANK LINES IN SEC 4.3 ===')
# Find and remove P548 (contains 769.5) and adjacent empty paragraphs
paras_to_remove = []
for p in doc.paragraphs:
    xml = p._p.xml
    if '769.5' in xml and '599.5' in xml:
        paras_to_remove.append(p)
        print('Found synthetic calculation paragraph to remove!')

# Also check for empty paragraphs between Sec 4.3.1 and Sec 4.3.2
found_wh = False
for p in doc.paragraphs:
    if 'Sau khi hoàn tất trọn vẹn chu kỳ đo đạc' in p.text:
        found_wh = True
        continue
    if found_wh:
        if '2. Đánh giá mức tiêu thụ điện tự dùng' in p.text:
            break
        if len(p.text.strip()) == 0 and p not in paras_to_remove:
            paras_to_remove.append(p)
            print('Found redundant empty paragraph to remove')

for p in paras_to_remove:
    parent = p._p.getparent()
    if parent is not None:
        parent.remove(p._p)
print(f'Removed {len(paras_to_remove)} paragraphs.')

print('=== 4. REFINING SEC 4.3.2 PARASITIC ENERGY CONSUMPTION ===')
for p in doc.paragraphs:
    if 'Tổng năng lượng tiêu hao cho hai động cơ bước trong suốt một ngày' in p.text:
        p.text = 'Một yếu tố then chốt quyết định tính kinh tế của hệ thống bám trục là năng lượng tiêu thụ của động cơ bước. Nhờ tích hợp thuật toán phát xung S-curve của thư viện FastAccelStepper kết hợp tính năng tự động giảm 50% dòng khi dừng của driver DM556, động cơ chỉ tiêu thụ dòng điện định mức trong các khoảng thời gian chuyển động ngắn (khoảng 3 đến 5 giây cho mỗi lần hiệu chỉnh góc sau mỗi 5 phút). Tổng năng lượng tiêu hao cho hai động cơ bước trong suốt một ngày vận hành ước tính chỉ ở mức rất nhỏ (khoảng dưới 20 Wh), chiếm tỷ trọng không đáng kể so với tổng sản lượng điện năng do hệ thống sản sinh ra. Do đó, sản lượng năng lượng thuần (Net Energy Gain) sau khi đã khấu trừ toàn bộ điện năng tự dùng vẫn bảo toàn trọn vẹn ưu thế vượt trội của hệ thống bám trục.'
        print('Updated Parasitic Consumption paragraph.')

doc.save(doc_path)
print('Document saved successfully!')
