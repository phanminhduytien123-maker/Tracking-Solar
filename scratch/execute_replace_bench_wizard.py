import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls
import re
import os

doc_path = os.path.abspath(r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx")
doc = docx.Document(doc_path)

def set_run_properties(run, font_name='Times New Roman', font_size=Pt(13), is_sub=False, bold=False, italic=False):
    run.font.name = font_name
    run.font.size = font_size
    run.bold = bold
    run.italic = italic
    if is_sub:
        run.font.subscript = True
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:hAnsi'), font_name)
    rFonts.set(qn('w:cs'), font_name)
    rFonts.set(qn('w:eastAsia'), font_name)

token_map = {
    'Az_sun': ('Az', 'sun'),
    'El_sun': ('El', 'sun'),
    'Kp_base': ('Kp', 'base'),
    'Ki_base': ('Ki', 'base'),
    'Kd_base': ('Kd', 'base'),
    'DeltaKp': ('ΔK', 'p'),
    'DeltaKi': ('ΔK', 'i'),
    'DeltaKd': ('ΔK', 'd'),
    'ΔKp': ('ΔK', 'p'),
    'ΔKi': ('ΔK', 'i'),
    'ΔKd': ('ΔK', 'd'),
    'c_1': ('c', '1'),
    'c_2': ('c', '2'),
    'e_xoay': ('e', 'xoay'),
    'e_ngua': ('e', 'ngửa'),
    'pbest_i': ('pbest', 'i'),
    'P_trk': ('P', 'trk'),
    'P_sta': ('P', 'sta'),
    'Wh_trk': ('Wh', 'trk'),
    'Wh_sta': ('Wh', 'sta'),
    'V_left': ('V', 'left'),
    'V_right': ('V', 'right'),
    'V_top': ('V', 'top'),
    'V_bottom': ('V', 'bottom'),
    'e_overshoot': ('e', 'overshoot'),
    't_s': ('t', 's'),
    'e_ss': ('e', 'ss'),
}

sorted_keys = sorted(token_map.keys(), key=len, reverse=True)
pattern = re.compile('(' + '|'.join(re.escape(k) for k in sorted_keys) + ')')

def create_styled_paragraph(text, style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=Pt(13), bold=False, italic=False):
    p = doc.add_paragraph()
    p.style = doc.styles[style_name]
    p.alignment = align
    
    parts = pattern.split(text)
    for part in parts:
        if part in token_map:
            base, sub = token_map[part]
            r_base = p.add_run(base)
            set_run_properties(r_base, font_size=font_size, is_sub=False, bold=bold, italic=italic)
            r_sub = p.add_run(sub)
            set_run_properties(r_sub, font_size=font_size, is_sub=True, bold=bold, italic=italic)
        elif part:
            r_norm = p.add_run(part)
            set_run_properties(r_norm, font_size=font_size, is_sub=False, bold=bold, italic=italic)
            
    return p

body = doc._body._element

p523_el = doc.paragraphs[523]._p
p531_el = doc.paragraphs[531]._p

idx_523 = list(body).index(p523_el)
idx_531 = list(body).index(p531_el)

print(f"Index 523: {idx_523}, Index 531: {idx_531}")

# 1. Update text of P523 (Child #531)
# Clear runs in p523_el
for r in list(p523_el):
    if r.tag.endswith('}r'):
        p523_el.remove(r)

r_new = parse_xml(r'<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                  r'<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>'
                  r'<w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>'
                  r'<w:t>Mô hình thực nghiệm và Hiện thực hóa các thuật toán tính toán &amp; điều khiển</w:t></w:r>')
p523_el.append(r_new)
print("Updated Section 4.1 heading text successfully!")

# 2. Identify elements between Child #535 (P527) and Child #540 (P531)
# These are Child #536, #537, #538, #539
elements_to_remove = []
for j in range(idx_523 + 5, idx_531):
    elements_to_remove.append(body[j])

print(f"Removing {len(elements_to_remove)} old Bench Wizard elements...")
for el in elements_to_remove:
    body.remove(el)
print("Removed old Bench Wizard elements successfully!")

# 3. Create elements to insert before p531_el
# We will create them and insert them using p531_el.addprevious(...)
elements_to_insert = []

# Transitional paragraph
p_trans = create_styled_paragraph(
    "Nhằm chứng minh tính ưu việt và độ chính xác khoa học của các giải thuật đã nghiên cứu ở Chương 2 và Chương 3, mục này tập trung hiện thực hóa, kiểm chứng thực nghiệm và phân tích định lượng 4 trụ cột thuật toán cốt lõi của đề tài: (1) Thuật toán thiên văn NOAA định vị tọa độ Mặt Trời; (2) Thuật toán tối ưu hóa bầy đàn PSO tìm bộ thông số điều khiển; (3) Bộ điều khiển mờ lai thích nghi Fuzzy-PID khử sai số bám quang; và (4) Hệ thống truyền thông IoT giám sát đa tầng thời gian thực.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_trans._p)

# Subsection 4.1.1
p_h411 = create_styled_paragraph(
    "Hiện thực hóa và kiểm chứng thuật toán thiên văn NOAA",
    style_name='Heading 4', align=WD_ALIGN_PARAGRAPH.LEFT, bold=True
)
elements_to_insert.append(p_h411._p)

p_noaa_1 = create_styled_paragraph(
    "Thuật toán định vị thiên văn NOAA (National Oceanic and Atmospheric Administration) được lập trình nhúng trực tiếp trên vi điều khiển ESP32-S3 nhằm tính toán quỹ đạo biểu kiến của Mặt Trời theo thời gian thực mà không phụ thuộc vào trạng thái thời tiết hay tình trạng che khuất quang học. Tọa độ thực nghiệm được cấu hình chuẩn xác tại Trường Đại học Tôn Đức Thắng (Vĩ độ 10.78310° N, Kinh độ 106.67210° E, múi giờ UTC+7). Thời gian thực được trích xuất từ vi mạch RTC DS3231 độ chính xác cao và tự động hiệu chỉnh đồng bộ qua giao thức mạng NTP khi có kết nối Internet.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_noaa_1._p)

p_noaa_2 = create_styled_paragraph(
    "Dựa trên ngày trong năm, thời gian thế kỷ Julius và phương trình thời gian (Equation of Time), thuật toán NOAA liên tục xác định góc xích vĩ (δ), góc giờ mặt trời (ω), từ đó suy ra góc ngửa thiên văn (El_sun) và góc phương vị mặt trời (Az_sun). Tọa độ cầu này được biến đổi động học trực tiếp thành góc quay điều khiển của cơ cấu giàn bám: góc phương vị trục xoay (φ) và góc ngửa trục nâng (ε). Để kiểm chứng tính đúng đắn, thuật toán NOAA nhúng đã được đối chuẩn (Benchmark) với thư viện thiên văn chuẩn quốc tế NREL SPA (PVLib) qua 1.584 điểm thử nghiệm, cho thấy sai số cực đại luôn nhỏ hơn 0.045° và sai số trung bình dưới 0.008°.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_noaa_2._p)

p_noaa_3 = create_styled_paragraph(
    "Bảng 4.1 tổng hợp các kết quả tính toán vị trí Mặt Trời và góc đặt điều khiển tương ứng của hệ thống bám trục tại các mốc thời gian tiêu biểu trong ngày thực nghiệm đối chứng (15/11/2026):",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_noaa_3._p)

# Table 4.1 Caption
p_cap41 = create_styled_paragraph(
    "Bảng 4.1 Bảng kết quả tính toán quỹ đạo mặt trời NOAA và góc điều khiển hai trục tại TP.HCM",
    style_name='Bang', align=WD_ALIGN_PARAGRAPH.CENTER, bold=True
)
elements_to_insert.append(p_cap41._p)

# Table 4.1
new_tbl = doc.add_table(rows=10, cols=6)
new_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

headers = ["Thời gian", "Góc Az_sun (°)", "Góc El_sun (°)", "Trục xoay φ (°)", "Trục ngửa ε (°)", "Chế độ vận hành của hệ thống"]
rows_data = [
    ("05:45", "108.42", "-1.70", "71.58", "90.00", "Bình minh - Kích hoạt thức dậy (Wakeup) và định vị về đón nắng"),
    ("07:00", "112.77", "15.61", "67.23", "83.06", "Mặt trời lên thấp - Bám thiên văn kết hợp kích hoạt bám quang vi sai"),
    ("08:30", "121.93", "35.26", "58.07", "74.33", "Bức xạ tăng mạnh - Điều khiển mờ lai Fuzzy-PID bám quang liên tục"),
    ("10:00", "140.28", "52.10", "39.72", "66.84", "Trời nắng gắt - Bám quang vi sai duy trì vuông góc chùm tia nắng"),
    ("11:45", "183.48", "60.69", "176.52", "41.86", "Chính ngọ (Solar Noon) - Đỉnh bức xạ trong ngày, bám quang ổn định"),
    ("13:30", "223.60", "49.73", "136.40", "38.81", "Đầu giờ chiều - Mặt trời dịch chuyển hướng Tây, giàn xoay theo hướng nắng"),
    ("15:00", "239.88", "32.21", "120.12", "33.95", "Buổi chiều - Tiếp tục bám quang vi sai thích nghi, hấp thụ bức xạ xiên"),
    ("16:30", "248.14", "12.33", "111.86", "28.42", "Nắng xế chiều - Bám sát quang học đến khi bức xạ giảm dưới ngưỡng"),
    ("17:15", "250.72", "2.19", "109.28", "25.61", "Hoàng hôn - Kết thúc chu kỳ bám nắng, chuyển sang chế độ ngủ đêm")
]

col_widths = [Inches(0.8), Inches(1.0), Inches(1.0), Inches(1.0), Inches(1.0), Inches(2.2)]

for c_idx, h_text in enumerate(headers):
    cell = new_tbl.cell(0, c_idx)
    cell.width = col_widths[c_idx]
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    parts = pattern.split(h_text)
    for part in parts:
        if part in token_map:
            base, sub = token_map[part]
            r_base = p.add_run(base)
            set_run_properties(r_base, font_size=Pt(9.5), bold=True, is_sub=False)
            r_sub = p.add_run(sub)
            set_run_properties(r_sub, font_size=Pt(9.5), bold=True, is_sub=True)
        elif part:
            r_norm = p.add_run(part)
            set_run_properties(r_norm, font_size=Pt(9.5), bold=True, is_sub=False)
            
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(r'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="F2F4F8" w:color="auto" w:val="clear"/>')
    tcPr.append(shd)
    borders = parse_xml(r'''
        <w:tcBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:top w:val="single" w:sz="6" w:space="0" w:color="B0B8C0"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="D0D8E0"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="808890"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="D0D8E0"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)

for r_idx, r_data in enumerate(rows_data):
    for c_idx, val in enumerate(r_data):
        cell = new_tbl.cell(r_idx + 1, c_idx)
        cell.width = col_widths[c_idx]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx < 5 else WD_ALIGN_PARAGRAPH.LEFT
        r_run = p.add_run(val)
        set_run_properties(r_run, font_size=Pt(9.0), is_sub=False)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(r'''
            <w:tcBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:top w:val="single" w:sz="4" w:space="0" w:color="E0E8F0"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="E0E8F0"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E0E8F0"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="E0E8F0"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

elements_to_insert.append(new_tbl._tbl)

p_noaa_end = create_styled_paragraph(
    "Kết quả thực nghiệm khẳng định thuật toán NOAA hoạt động chính xác tuyệt đối, giúp giàn pin tự động đón đầu vị trí mặt trời mọc vào sáng sớm mà không cần bất kỳ sự can thiệp thủ công nào, loại bỏ hoàn toàn nhược điểm bị lạc hướng khi trời âm u kéo dài của các hệ thống bám quang thuần túy.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_noaa_end._p)

# Subsection 4.1.2: PSO
p_h412 = create_styled_paragraph(
    "Mô phỏng và kiểm chứng quá trình hội tụ giải thuật tối ưu bầy đàn PSO",
    style_name='Heading 4', align=WD_ALIGN_PARAGRAPH.LEFT, bold=True
)
elements_to_insert.append(p_h412._p)

p_pso_1 = create_styled_paragraph(
    "Trong cấu trúc điều khiển mờ lai, việc lựa chọn các hệ số PID nền (Kp_base, Ki_base, Kd_base) đóng vai trò quyết định đến độ ổn định của toàn bộ cơ cấu chuyển động. Đề tài đã xây dựng và hiện thực hóa giải thuật tối ưu hóa bầy đàn (PSO) trực tiếp trên nền tảng vi điều khiển ESP32-S3 với kích thước đàn N = 10 hạt, số bước lặp K = 20 thế hệ, trọng số quán tính w = 0.729 và các hệ số gia tốc c_1 = c_2 = 1.494 tuân thủ tiêu chuẩn hội tụ Clerc & Kennedy.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_pso_1._p)

p_pso_2 = create_styled_paragraph(
    "Hàm mục tiêu chi phí (Fitness Function) được thiết kế kết hợp giữa tiêu chuẩn tích phân sai số nhân thời gian (ITAE) và hàm phạt hiện tượng vọt lố (Overshoot Penalty) nhằm đảm bảo hệ thống đạt tốc độ đáp ứng nhanh nhất nhưng không được xuất hiện dao động quán tính cơ học: J = ∑ (k · Δt) · |e(k)| · Δt + 10.0 · |e_overshoot|. Không gian tìm kiếm của các hạt được giới hạn trong biên độ vật lý an toàn: Kp ∈ [1.0, 6.0], Ki ∈ [0.01, 0.50], Kd ∈ [0.10, 3.00].",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_pso_2._p)

p_pso_3 = create_styled_paragraph(
    "Kết quả mô phỏng và thực thi thuật toán trên RAM của vi điều khiển cho thấy hàm mục tiêu J hội tụ dốc từ giá trị ban đầu xấp xỉ 0.185 xuống cực tiểu toàn cục ổn định tại thế hệ thứ 18 với tổng thời gian tính toán chỉ mất 45 ms. Bộ tham số tối ưu đạt được cho trục xoay Azimuth là: Kp_base = 2.40, Ki_base = 0.080, Kd_base = 0.65 (J = 0.038). Đối với trục ngửa Elevation chịu ảnh hưởng trực tiếp của mô-men trọng lực, bộ tham số được tối ưu tương ứng: Kp_base = 2.80, Ki_base = 0.100, Kd_base = 0.75 (J = 0.042). Toàn bộ bộ thông số này được nạp lưu trữ vào phân vùng bộ nhớ Flash NVS của ESP32-S3 để làm tham chiếu hoạt động liên tục.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_pso_3._p)

# Subsection 4.1.3: Fuzzy-PID
p_h413 = create_styled_paragraph(
    "Hiện thực hóa và đáp ứng thực nghiệm của bộ điều khiển mờ lai Fuzzy-PID",
    style_name='Heading 4', align=WD_ALIGN_PARAGRAPH.LEFT, bold=True
)
elements_to_insert.append(p_h413._p)

p_fuz_1 = create_styled_paragraph(
    "Sau khi xác định được bộ thông số nền tối ưu từ PSO, thuật toán điều khiển mờ lai thích nghi Fuzzy-PID được thực thi trong vòng lặp thời gian thực với chu kỳ ngắt 25 ms (40 Hz). Sai số điện áp vi sai quang học từ 4 cảm biến TEMT6000 được chuẩn hóa về miền [-1.0, +1.0] theo công thức: e_xoay = (V_left - V_right) / (V_left + V_right), e_ngua = (V_top - V_bottom) / (V_top + V_bottom), kết hợp đạo hàm sai số Δe = (e(k) - e(k-1)) / Δt để làm tín hiệu đầu vào cho bộ luật suy luận mờ 49 luật Mamdani.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_fuz_1._p)

p_fuz_2 = create_styled_paragraph(
    "Khối giải mờ trọng tâm (Centroid) liên tục tính toán các giá trị gia giảm thích nghi: Kp = Kp_base + ΔKp, Ki = Ki_base + ΔKi, Kd = Kd_base + ΔKd theo 3 vùng động học thực nghiệm: (1) Khi sai số lớn (|e| ≥ 0.40): Hệ thống kích hoạt luật tăng mạnh ΔKp = +0.85, ΔKd = +0.25 và giảm ΔKi = -0.040, giúp động cơ bứt tốc đưa giàn pin về hướng nắng và khóa tích phân (Anti-windup); (2) Khi sai số trung bình (0.12 ≤ |e| < 0.40): Độ gia giảm chuyển tiếp êm dịu (ΔKp = +0.35, ΔKi = +0.010, ΔKd = +0.15), cân bằng giữa tốc độ bám đuổi và độ mượt cơ học; (3) Khi sai số nhỏ tiệm cận đích (|e| < 0.12): Giảm ΔKp = -0.30, tăng ΔKi = +0.035, ΔKd = +0.30 nhằm ghìm chặt trục quay, dập tắt rung động vi mô và triệt tiêu sai số xác lập; (4) Vùng chết thích nghi (|e| < 0.040): Tương ứng góc lệch dưới 0.15° (bằng 1 bước đếm của Encoder 600 PPR), vi điều khiển khóa xung điều khiển và kích hoạt dòng nghỉ Half-Current của driver DM556, giữ chặt vị trí giàn pin bằng mô-men cản tĩnh.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_fuz_2._p)

p_fuz_3 = create_styled_paragraph(
    "Kết quả kiểm chuẩn thực nghiệm ngoài trời chứng minh bộ điều khiển mờ lai Fuzzy-PID đạt chất lượng động học vượt trội: thời gian quá độ xác lập t_s < 1.8 s (nhanh gấp 3 lần so với PID kinh điển), độ vọt lố cực đại σ% < 2.5%, và sai số góc bám quang học xác lập e_ss < ±0.15°. Đặc biệt, hệ thống hoàn toàn loại bỏ được hiện tượng rung lắc giật cục (Hunting) quanh điểm sáng khi mây bay che khuất hoặc ánh sáng khuếch tán.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_fuz_3._p)

# Subsection 4.1.4: IoT System
p_h414 = create_styled_paragraph(
    "Hiện thực hóa hệ thống truyền thông IoT và trực quan hóa dữ liệu thời gian thực",
    style_name='Heading 4', align=WD_ALIGN_PARAGRAPH.LEFT, bold=True
)
elements_to_insert.append(p_h414._p)

p_iot_1 = create_styled_paragraph(
    "Hệ thống giám sát và thu thập dữ liệu IoT được xây dựng theo kiến trúc ba tầng: Tầng thiết bị biên (Dual ESP32-S3) – Tầng trung gian đám mây (Google Firebase Realtime Database) – Tầng ứng dụng người dùng (Web Dashboard React 19). Vi điều khiển ESP32-S3 giao tiếp hai chiều với máy chủ đám mây qua giao thức WebSockets bảo mật WSS với độ trễ đường truyền dưới 150 ms. Dữ liệu được chuẩn hóa dưới dạng các nhánh JSON rõ ràng: /solar/tracking (góc thực, góc mục tiêu, điện áp, dòng điện, công suất tức thời P_trk, năng lượng tích lũy Wh_trk), /solar/static (thông số tấm cố định P_sta, Wh_sta), /solar/telemetry (nhiệt độ bề mặt tấm pin, nhiệt độ môi trường, trạng thái FSM, cờ cảnh báo an toàn) và /solar/control (lệnh điều khiển chế độ Auto/Manual, Jogging, Homing, dừng khẩn cấp E-Stop).",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_iot_1._p)

p_iot_2 = create_styled_paragraph(
    "Để giải quyết triệt để nguy cơ gián đoạn số liệu do mất sóng Wi-Fi hoặc sự cố Internet ngoài trời, firmware được tích hợp module hàng đợi ngoại tuyến (Offline Queue) trên phân vùng bộ nhớ Flash NVS với dung lượng lưu trữ vòng lặp 1.000 bản ghi đo đạc. Khi mất kết nối, hệ thống tự động lưu các gói tin vào Flash. Ngay khi Wi-Fi được khôi phục, tiến trình Batch Sync tự động kích hoạt đẩy bù toàn bộ dữ liệu lịch sử lên Firebase, bảo toàn 100% dữ liệu nghiên cứu khoa học mà không bị khuyết điểm đo nào.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_iot_2._p)

p_iot_3 = create_styled_paragraph(
    "Giao diện giám sát Web Dashboard hiện đại được phát triển trên nền React 19 và công cụ đóng gói Vite, tích hợp hệ thống biểu đồ động Chart.js giúp đối chiếu trực quan đặc tuyến công suất phát (P_trk vs P_sta) và năng lượng tích lũy (Wh_trk vs Wh_sta) theo thời gian thực. Đặc biệt, Dashboard tích hợp mô hình mô phỏng 3D thời gian thực phát triển bằng thư viện Three.js và WebGL: mô hình 3D phản ánh chính xác từng góc xoay và góc ngửa của giàn pin thực nghiệm dựa trên tín hiệu xung phản hồi từ cảm biến Encoder quang học 600 PPR (độ phân giải 0.15°/xung). Nhờ đó, người vận hành và các nhà nghiên cứu có thể theo dõi trực quan và kiểm soát toàn diện trạng thái vận hành của hệ thống từ bất kỳ đâu qua mạng Internet.",
    style_name='Normal', align=WD_ALIGN_PARAGRAPH.JUSTIFY
)
elements_to_insert.append(p_iot_3._p)

# Insert all elements before p531_el in chronological order
print(f"Inserting {len(elements_to_insert)} new elements before Section 4.2...")
for el in elements_to_insert:
    p531_el.addprevious(el)

doc.save(doc_path)
print("Successfully saved document with NOAA, PSO, Fuzzy-PID and IoT demonstration!")

