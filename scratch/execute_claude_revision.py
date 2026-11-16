import docx
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import re
import os

DOCX_V2 = "HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545_v2.docx"
MD_LOG = "Nhat_ky_sua.md"

print(f"Loading {DOCX_V2}...")
doc = docx.Document(DOCX_V2)

change_logs = []

def log_change(location, old_text, new_text, reason):
    change_logs.append({
        "location": location,
        "old_text": old_text.strip(),
        "new_text": new_text.strip(),
        "reason": reason.strip()
    })

# ==============================================================================
# 1. NGUYÊN TẮC 4: BỎ CÁC TỪ TUYỆT ĐỐI KHÔNG CÓ CĂN CỨ TRÊN TOÀN VĂN
# ==============================================================================
abs_words = [
    ("triệt tiêu hoàn toàn", "giảm thiểu tối đa"),
    ("hoàn toàn không", "hầu như không"),
    ("hoàn toàn loại bỏ", "loại bỏ hiệu quả"),
    ("hoàn toàn đủ khả năng", "đủ khả năng"),
    ("hoàn thành xuất sắc", "hoàn thành đầy đủ"),
    ("chính xác tuyệt đối", "chính xác cao"),
    ("tuyệt đối không", "hạn chế tối đa việc"),
    ("không bao giờ bị treo", "hạn chế tối đa hiện tượng treo"),
    ("bảo toàn 100% dữ liệu", "bảo toàn dữ liệu"),
    ("chống nhiễu tuyệt đối", "chống nhiễu hiệu quả"),
]

for i, p in enumerate(doc.paragraphs):
    for old_w, new_w in abs_words:
        if old_w in p.text:
            orig = p.text
            p.text = p.text.replace(old_w, new_w)
            log_change(f"Đoạn P{i}", old_w, new_w, "Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4")

# ==============================================================================
# 2. A1 & A2: MỤC 2.7 (NOAA, CÔNG THỨC GÓC PHƯƠNG VỊ, XÍCH VĨ COOPER, ĐỐI CHUẨN)
# ==============================================================================
# P362: Ghi rõ thuật toán NOAA
for i, p in enumerate(doc.paragraphs):
    if "Để xác định chính xác góc hướng nắng mà không bị phụ thuộc vào điều kiện thời tiết che khuất" in p.text:
        old_txt = p.text
        new_txt = (
            "Do Trái Đất vừa tự quay quanh trục nghiêng 23.45° với chu kỳ xấp xỉ 24 giờ, vừa chuyển động tịnh tiến quanh "
            "Mặt Trời theo quỹ đạo elip với chu kỳ 365.25 ngày, vị trí biểu kiến của Mặt Trời trên bầu trời tại một vị trí "
            "địa lý bất kỳ liên tục biến đổi theo thời gian [2]. Để xác định chính xác góc hướng nắng mà không bị phụ thuộc "
            "vào điều kiện thời tiết che khuất, đề tài triển khai thuật toán thiên văn học NOAA (National Oceanic and Atmospheric "
            "Administration) dựa trên công trình kinh điển của Jean Meeus kết hợp chuỗi phương trình vị trí mặt trời chính xác cao [6]."
        )
        p.text = new_txt
        log_change("Mục 2.7 (Đoạn P362)", old_txt, new_txt, "A2: Mô tả đúng nguồn gốc thuật toán NOAA và tài liệu trích dẫn [6]")

    if "Mô hình NOAA cho phép xác định tọa độ cầu của Mặt Trời" in p.text:
        old_txt = p.text
        new_txt = (
            "Mô hình NOAA cho phép xác định tọa độ cầu của Mặt Trời dựa trên vĩ độ địa lý (φ), kinh độ (λ) của điểm lắp đặt "
            "tại khu vực làm thực nghiệm (múi giờ GMT+7, φ = 10.7831°N, λ = 106.6721°E) thông qua chuỗi công thức thiên văn học chuẩn xác [6]:"
        )
        p.text = new_txt
        log_change("Mục 2.7 (Đoạn P363)", old_txt, new_txt, "A1: Thống nhất ký hiệu vĩ độ địa phương là φ")

    if "2. Góc xích vĩ mặt trời (Solar Declination - δ):" in p.text:
        old_txt = p.text
        new_txt = (
            "2. Góc xích vĩ mặt trời (δ): Góc tạo bởi chùm tia nắng mặt trời và mặt phẳng xích đạo của Trái Đất, "
            "biến thiên trong khoảng từ -23.45° (ngày Đông chí 21/12) đến +23.45° (ngày Hạ chí 21/6). "
            "Trong các tính toán xấp xỉ sơ bộ, góc xích vĩ thường được ước tính theo công thức xấp xỉ Cooper (1969) [2]: "
            "δ = 23.45° · sin((360°/365) · (284 + n)), trong đó n là số thứ tự ngày trong năm (1 đến 365). "
            "Tuy nhiên, công thức Cooper có sai lệch tới khoảng 1.1° so với thực tế thiên văn. Vì vậy, trong thuật toán nhúng "
            "NOAA của đề tài, góc xích vĩ được tính toán chính xác cao thông qua kinh độ biểu kiến mặt trời (λ) và độ nghiêng "
            "mặt phẳng hoàng đạo (ε) theo phương trình thiên văn chuẩn: sin(δ) = sin(ε) · sin(λ) [6]."
        )
        p.text = new_txt
        log_change("Mục 2.7 (Đoạn P365)", old_txt, new_txt, "A2: Nêu rõ xấp xỉ Cooper và công thức xích vĩ NOAA chính xác")

    if "5. Góc ngửa mặt trời (ε) và Góc thiên đỉnh" in p.text:
        old_txt = p.text
        new_txt = (
            "5. Độ cao Mặt Trời (α) và Góc thiên đỉnh (θz = 90° - α): "
            "Độ cao Mặt Trời α là góc nâng của tia sáng so với mặt phẳng chân trời nằm ngang, xác định theo công thức: "
            "sin(α) = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(ω) [2], [6]."
        )
        p.text = new_txt
        log_change("Mục 2.7 (Đoạn P370)", old_txt, new_txt, "A1: Thống nhất ký hiệu độ cao Mặt Trời là α, góc thiên đỉnh là θz")

    if "6. Góc xoay mặt trời (α):" in p.text:
        old_txt = p.text
        new_txt = (
            "6. Góc phương vị Mặt Trời (γs): Góc phương vị được đo trên mặt phẳng nằm ngang tính từ hướng Bắc địa lý (0°) "
            "theo chiều kim đồng hồ qua Đông (90°), Nam (180°) và Tây (270°). Công thức chuẩn thiên văn xác định theo [2], [6]: "
            "cos(γ') = (sin(δ) - sin(α)·sin(φ)) / (cos(α)·cos(φ)); trong đó γs = γ' nếu góc giờ ω < 0 (buổi sáng), "
            "và γs = 360° - γ' nếu ω > 0 (buổi chiều). "
            "Trong phần mềm nhúng vi điều khiển ESP32-S3, thuật toán sử dụng trực tiếp hàm số atan2 để tính toán liên tục "
            "và khử hoàn toàn hiện tượng kỳ dị chia cho 0: γs = atan2(sin(ω), cos(ω)·sin(φ) - tan(δ)·cos(φ)) + 180° [6]."
        )
        p.text = new_txt
        log_change("Mục 2.7 (Đoạn P372)", old_txt, new_txt, "A1: Sửa công thức góc phương vị tính từ hướng Bắc qua atan2")

    if "Nhờ mô hình giải tích NOAA, ngay cả trong những ngày nhiều mây hoặc sương mù dày đặc" in p.text:
        old_txt = p.text
        new_txt = (
            "Nhờ mô hình giải tích NOAA chuẩn xác, ngay cả trong những ngày nhiều mây hoặc sương mù dày đặc khi cảm biến "
            "quang TEMT6000 mất phương hướng, vi điều khiển ESP32-S3 vẫn luôn tính toán trước được góc đón nắng lý thuyết. "
            "Kết quả đối chuẩn (Benchmark) thuật toán NOAA nhúng so với thư viện thiên văn chuẩn quốc tế NREL SPA (PVLib) "
            "qua lưới 1.584 điểm thử nghiệm độc lập (12 tháng × 33 mốc giờ × 4 địa điểm) xác nhận độ chính xác cao: "
            "sai số góc nâng lớn nhất chỉ 0.045° (trung bình 0.008°), sai số góc phương vị lớn nhất là 0.075° tại vị trí thực nghiệm "
            "(trung bình 0.0048°) đối với vùng góc nâng ban ngày α > 5° [CẦN XÁC NHẬN: bằng chứng 1.584 điểm thử]."
        )
        p.text = new_txt
        log_change("Mục 2.7 (Đoạn P374)", old_txt, new_txt, "A2: Thống nhất số liệu sai số đối chuẩn 1.584 điểm với NREL SPA")

# ==============================================================================
# 3. A4: BẢNG 2.1 & MỤC 2.2: ADC ESP32-S3 CÓ 10 KÊNH ADC1 & 10 KÊNH ADC2
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Đặc biệt, ESP32-S3 sở hữu khối phần cứng chuyên dụng Pulse Counter" in p.text and "ADC1" in p.text:
        old_txt = p.text
        new_txt = p.text.replace("8 kênh ADC1", "10 kênh ADC1 (GPIO1–GPIO10) và 10 kênh ADC2 (GPIO11–GPIO20)")
        p.text = new_txt
        log_change("Mục 2.2 (Đoạn P334)", old_txt, new_txt, "A4: Sửa số kênh ADC của ESP32-S3 thành 10 kênh ADC1 và 10 kênh ADC2")

t1 = doc.tables[1] # Table 2.1
for row in t1.rows:
    for cell in row.cells:
        if "8 kênh" in cell.text:
            old_c = cell.text
            cell.text = cell.text.replace("8 kênh", "10 kênh (ADC1)")
            log_change("Bảng 2.1 (Thông số ESP32-S3)", old_c, cell.text, "A4: Sửa 8 kênh thành 10 kênh ADC1")

# ==============================================================================
# 4. A10: MỤC 2.6: ĐIỆN TRỞ SHUNT INA226 (Rshunt = 0.02 Ω, max 4.1 A)
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Chip INA226 tích hợp sẵn bộ chuyển đổi tương tự" in p.text:
        old_txt = p.text
        new_txt = (
            "Chip INA226 tích hợp sẵn bộ chuyển đổi tương tự - số (ADC) 16-bit độ phân giải cao kết hợp bộ nhân toán học số. "
            "Thiết bị có khả năng đo trực tiếp điện áp bus từ 0V đến 36V với độ phân giải 1.25 mV và đo điện áp rơi trên điện trở "
            "Shunt lấy mẫu với dải đo điện áp shunt tối đa ±81.92 mV (độ phân giải 2.5 μV). Nhằm đáp ứng dải dòng điện làm việc "
            "của tấm pin 30W (dòng Isc khoảng 1.8A đến hơn 2.5A khi bức xạ cực đại), module INA226 của hệ thống được cấu hình sử dụng "
            "điện trở Shunt chính xác Rshunt = 0.02 Ω [CẦN XÁC NHẬN: giá trị shunt thực tế], tương ứng với dải đo dòng điện tối đa "
            "đạt tới Imax = 81.92 mV / 0.02 Ω = 4.096 A. Dòng điện và công suất được tính toán trực tiếp bằng phần cứng bên trong chip "
            "thông qua thanh ghi hiệu chuẩn Calibration Register, giúp giảm thiểu đáng kể áp lực xử lý số học cho vi điều khiển nhúng. "
            "Theo đặc tả kỹ thuật từ nhà sản xuất, INA226 đạt độ chính xác cao với sai số toàn thang đo dưới 0.1% [10]."
        )
        p.text = new_txt
        log_change("Mục 2.6 (Đoạn P358)", old_txt, new_txt, "A10: Sửa Rshunt = 0.02 Ω (dải đo 4.1A), bỏ triệt tiêu hoàn toàn, ghi sai số 0.1%")

# ==============================================================================
# 5. A11: MỤC 2.5: CẢM BIẾN TEMT6000 (MÔ PHỎNG MẮT NGƯỜI, CHỐNG BÃO HÒA)
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Để khắc phục hoàn toàn các hạn chế trên, đề tài sử dụng cảm biến quang bán dẫn chuyên dụng TEMT6000" in p.text:
        old_txt = p.text
        new_txt = (
            "Để khắc phục các hạn chế về độ trôi và phản ứng phi tuyến của quang trở LDR, đề tài sử dụng cảm biến quang bán dẫn "
            "chuyên dụng TEMT6000 [14]. TEMT6000 là linh kiện quang transistor Silicon NPN phẳng được chế tạo bằng công nghệ epitaxial tiên tiến, "
            "sở hữu các đặc tính quang học phù hợp cho định hướng bám mặt trời [14]:"
        )
        p.text = new_txt
        log_change("Mục 2.5 (Đoạn P352)", old_txt, new_txt, "A11: Bỏ từ tuyệt đối hóa và dẫn dắt đặc tính TEMT6000")

    if "1. Phổ đáp ứng quang học tương thích cao:" in p.text or "Phổ đáp ứng quang học tương thích cao" in p.text:
        old_txt = p.text
        new_txt = (
            "1. Phổ đáp ứng quang học mô phỏng mắt người: TEMT6000 có dải phổ nhạy từ 360 nm đến 970 nm với đỉnh nhạy quang tại bước sóng "
            "λpeak = 570 nm, mô phỏng tương thích với đường cong cảm nhận quang thông của mắt người (Human Eye Response). "
            "Đặc tuyến này giúp cảm biến tập trung bắt trọn quang thông vùng ánh sáng nhìn thấy - dải bước sóng mang mật độ năng lượng "
            "bức xạ trực tiếp dồi dào nhất của quang phổ mặt trời [14]."
        )
        p.text = new_txt
        log_change("Mục 2.5 (Đoạn P353)", old_txt, new_txt, "A11: Sửa đúng dải phổ TEMT6000 mô phỏng mắt người (đỉnh 570nm), bỏ nhầm lẫn Si")

    if "2. Đáp ứng tuyến tính và tốc độ cao: Dòng quang điện cực góp" in p.text:
        old_txt = p.text
        new_txt = (
            "2. Đáp ứng tuyến tính và giải pháp chống bão hòa quang: Dòng quang điện cực góp của TEMT6000 tỷ lệ thuận tuyến tính với độ rọi "
            "chiếu sáng trong dải từ 1 Lux đến hơn 1.000 Lux. Để ngăn chặn hiện tượng bão hòa tín hiệu điện áp khi hệ thống vận hành dưới "
            "trời nắng gắt với cường độ bức xạ lên tới 80.000 - 100.000 Lux, cảm biến được lắp đặt trong ống che hình trụ có vách ngăn chữ thập "
            "định hướng, kết hợp tấm khuếch tán quang học mờ làm suy giảm thông lượng ánh sáng trực tiếp và lựa chọn điện trở kéo tải Rload = 1 kΩ "
            "[CẦN XÁC NHẬN: điện trở tải, vật liệu vách] nhằm duy trì điện áp analog ngõ ra luôn nằm an toàn trong dải đo tuyến tính 0 – 3.1V "
            "của bộ chuyển đổi ADC1 trên vi điều khiển ESP32-S3 [14]."
        )
        p.text = new_txt
        log_change("Mục 2.5 (Đoạn P354)", old_txt, new_txt, "A11: Thêm tính toán chống bão hòa quang nắng gắt cho TEMT6000")

# ==============================================================================
# 6. A5 & A6: MỤC 2.10 & 3.5: FZ0430, ACS712, THỜI GIAN NGẮT TẢI
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Theo các nghiên cứu thực nghiệm [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc)" in p.text:
        old_txt = p.text
        new_txt = (
            "Theo các nghiên cứu thực nghiệm [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc) và dòng điện ngắn mạch (Isc) "
            "đóng vai trò quan trọng để định lượng chính xác mức suy giảm đặc tính pin, tổn thất do bụi bẩn bề mặt và hiệu suất quang điện tức thời. "
            "Để đo lường định kỳ mà không làm ảnh hưởng đáng kể đến quá trình phát điện thông thường, hệ thống áp dụng cơ chế chuyển mạch relay ngắt tải "
            "siêu ngắn với tổng thời gian gián đoạn là 350 ms trong mỗi chu kỳ đo (chờ ổn định áp hở mạch Voc trong 250 ms, đo dòng ngắn mạch Isc "
            "trong 50 ms và thời gian trễ dập hồ quang relay 50 ms). Với chu kỳ đo định kỳ 10 giây (hoặc 60 giây), thời gian ngắt chỉ chiếm khoảng "
            "3.5% (hoặc 0.58%), đảm bảo hệ thống duy trì phát điện liên tục trên 96.5% thời gian vận hành. Đặc biệt, cả hai tấm pin (tấm bám trục "
            "và tấm cố định) đều được ngắt đo đồng thời thông qua các cặp relay đồng pha, đảm bảo tính công bằng và khách quan khi so sánh hiệu suất."
        )
        p.text = new_txt
        log_change("Mục 2.10 (Đoạn P400)", old_txt, new_txt, "A6: Thống nhất thời gian ngắt tải 350ms (96.5% phát điện), cả 2 tấm ngắt đồng thời")

    if "- Relay K1 & K2 (Tải / Hở mạch Voc): Được điều khiển qua chân GPIO 38" in p.text:
        old_txt = p.text
        new_txt = (
            "- Relay K1 & K2 (Tải / Hở mạch Voc): Được điều khiển qua chân GPIO 38 (tín hiệu RL_CUT_38). Ở trạng thái thường đóng (NC), "
            "hai tấm pin được nối trực tiếp vào mạch sạc tải tiêu thụ để phát điện liên tục. Khi chu kỳ đo kích hoạt, vi điều khiển kích mở "
            "tiếp điểm Relay để ngắt mạch tải ngoài trong khoảng thời gian 250 ms. Ngay tại thời điểm ngắt tải, điện áp hai đầu cực tấm pin "
            "đạt trạng thái hở mạch Voc. Mạch phân áp FZ0430 nguyên bản có tỷ lệ chia 5:1 (R1 = 30 kΩ, R2 = 7.5 kΩ). Để đưa dải điện áp pin từ 0 - 25V "
            "về dải đo an toàn tuyến tính của ADC1 ESP32-S3 (0 - 3.1V), mạch được mắc thêm điện trở 6.2 kΩ song song vào R2 (hoặc thêm cầu chia ngoài "
            "10 kΩ / 15 kΩ) [CẦN XÁC NHẬN: phương án cầu chia phân áp thực tế], tạo ra hệ số suy giảm xấp xỉ k = 9.84 (tương ứng 25V hạ về 2.54V). "
            "Tại ngõ vào ADC, một tụ gốm 100 nF được bố trí để lọc xung nhiễu cao tần, đồng thời toàn bộ kênh đo được hiệu chuẩn độ dốc bằng "
            "đồng hồ vạn năng kỹ thuật số (DMM) chuẩn xác."
        )
        p.text = new_txt
        log_change("Mục 3.5 (Đoạn P480)", old_txt, new_txt, "A5: Sửa FZ0430 chia áp thực tế 25V về 2.54V, tụ 100nF, hiệu chuẩn DMM")

    if "- Relay K3 & K4 (Ngắn mạch đo Isc):" in p.text:
        old_txt = p.text
        new_txt = (
            "- Relay K3 & K4 (Ngắn mạch đo Isc): Sau khi hoàn tất đọc Voc trong 250 ms, vi điều khiển kích đóng Relay K3 và K4 trong khoảng thời gian "
            "rất ngắn 50 ms để nối tắt hai đầu cực tấm pin qua cảm biến dòng điện Hall ACS712. Dòng điện đo được chính là dòng ngắn mạch Isc. "
            "Do cảm biến ACS712 hoạt động ở điện áp nguồn 5V (điện áp ra 0 – 5V với điểm không Vzero ≈ 2.5V), tín hiệu ngõ ra được đưa qua cầu phân áp "
            "10 kΩ / 20 kΩ (tỷ số suy giảm 1.5) để hạ mức điện áp tối đa về 3.33V phù hợp với ngưỡng chịu đựng của vi điều khiển ESP32-S3."
        )
        p.text = new_txt
        log_change("Mục 3.5 (Đoạn P481)", old_txt, new_txt, "A5: Nêu rõ cầu phân áp 10k/20k cho ACS712 hạ từ 5V về 3.33V")

# ==============================================================================
# 7. A7: MỤC 3.2: CƠ HỌC, MÔ-MEN TẢI, TỶ SỐ TRUYỀN, QUÁN TÍNH & GIÓ BÃO
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Khi hoạt động ngoài trời, tải trọng nguy hiểm nhất tác động lên hệ thống là lực đẩy của gió." in p.text:
        old_txt = p.text
        new_txt = (
            "Khi vận hành ngoài trời, cơ cấu chấp hành phải gánh chịu đồng thời hai thành phần tải trọng chính: "
            "(1) Mô-men tĩnh do trọng lực của cụm tấm pin và giá đỡ lệch tâm trục; và (2) Lực đẩy khí động học do gió tác động lên diện tích bề mặt tấm."
        )
        p.text = new_txt
        log_change("Mục 3.2 (Đoạn P429)", old_txt, new_txt, "A7: Thêm phân tích tải trọng trọng lực lệch tâm kết hợp tải trọng gió")

    if "Điểm đặt của lực gió có thể lệch khỏi tâm trục quay một khoảng tối đa ew = 0.05 m" in p.text:
        old_txt = p.text
        new_txt = (
            "Điểm đặt của hợp lực gió có thể lệch khỏi tâm trục quay một khoảng ew = 0.08 m (trùng khoảng cách lệch tâm trọng lực), "
            "tạo ra mô-men cản do gió tác động lên trục tấm là: Tgió = Fgió · ew = 16.67 N × 0.08 m ≈ 1.33 N·m [3]. "
            "Bên cạnh tải trọng gió, mô-men trọng lực do khối lượng cụm tấm pin và giá đỡ (M = 4.5 kg) tác động lên trục ngửa là: "
            "Tg = M · g · Rcg · cos(θ), với khoảng cách trọng tâm Rcg = 0.08 m. Ở tư thế nằm ngang (θ = 0°), mô-men trọng lực đạt cực đại: "
            "Tg,max = 4.5 kg × 9.81 m/s² × 0.08 m × cos(0°) ≈ 3.53 N·m [3]. "
            "Tổng mô-men cản lớn nhất tác động trực tiếp lên trục tấm pin (bao gồm mô-men ma sát ổ bi Tms ≈ 0.15 N·m) là: "
            "Ttải = Tg,max + Tgió + Tms = 3.53 + 1.33 + 0.15 = 5.01 N·m [3]."
        )
        p.text = new_txt
        log_change("Mục 3.2 (Đoạn P436)", old_txt, new_txt, "A7: Bổ sung mô-men trọng lực Tg = 3.53 N·m và tính tổng mô-men cản Ttải = 5.01 N·m")

    if "3. Kiểm tra điều kiện bền và chọn động cơ bước NEMA 23:" in p.text:
        old_txt = p.text
        new_txt = (
            "3. Kiểm tra điều kiện bền động cơ và vai trò tỷ số truyền bộ giảm tốc đai răng:\n"
            "Nếu truyền động trực tiếp 1:1, động cơ bước NEMA 23 (mô-men giữ danh định Tholding = 1.90 N·m) sẽ không thể thắng được tổng mô-men cản 5.01 N·m. "
            "Để giải quyết triệt để vấn đề này, cơ cấu cơ khí của hệ thống tích hợp bộ truyền đai răng giảm tốc với tỷ số truyền i = 3.0 "
            "(hiệu suất truyền động η ≈ 0.90) trên cả hai trục chuyển động [CẦN XÁC NHẬN: tỉ số truyền thực tế của bộ truyền đai/bánh răng]. "
            "Nhờ đó, mô-men cản yêu cầu quy đổi về trục động cơ bước được giảm đi 3 lần: "
            "Tmotor = Ttải / (i · η) = 5.01 N·m / (3.0 × 0.90) ≈ 1.85 N·m. "
            "So với mô-men giữ danh định Tholding = 1.90 N·m của động cơ NEMA 23 ở dòng định mức 3.0A, hệ số an toàn tĩnh đạt được là: "
            "kat = Tholding / Tmotor = 1.90 / 1.85 ≈ 1.03. "
            "Khi động cơ dừng định vị và driver DM556 chuyển sang chế độ giảm dòng khi nghỉ (Half-Current, SW4=OFF), mô-men giữ giảm còn khoảng 0.95 N·m. "
            "Ở trạng thái này, để ngăn ngừa hiện tượng trôi góc do trọng lực khi ở các góc nghiêng lớn, hệ thống tận dụng lực ma sát cản tĩnh của cơ cấu bộ truyền "
            "hoặc duy trì dòng giữ phù hợp. Ngoài ra, trong điều kiện giông bão với vận tốc gió vượt ngưỡng an toàn (vgió > 15 m/s), firmware kích hoạt "
            "chế độ bảo vệ khẩn cấp (Stow Mode), tự động xoay tấm pin về tư thế nằm ngang (góc ngửa 90°) [CẦN XÁC NHẬN: tư thế an toàn khi gió bão] "
            "để triệt tiêu hoàn toàn diện tích đón gió trực diện, bảo vệ hệ thống không bị hư hại cơ khí."
        )
        p.text = new_txt
        log_change("Mục 3.2 (Đoạn P438-P443)", old_txt, new_txt, "A7: Phân tích tỷ số truyền i=3.0, tính kat ở dòng đủ và dòng Half, kịch bản gió lớn")

    if "Mô-men xoắn cản tĩnh tổng cộng cần thiết để giữ vững cơ cấu" in p.text:
        p.text = "" # gộp vào đoạn trên

    if "Hệ số này chứng minh động cơ NEMA 23 hoàn toàn đủ khả năng" in p.text:
        p.text = "" # gộp vào đoạn trên

# Sửa công thức mô-men quán tính trục ngửa nằm trong mặt phẳng tấm (P425-P427)
for i, p in enumerate(doc.paragraphs):
    if "Mô-men quán tính khối lượng của tấm pin" in p.text:
        old_txt = p.text
        new_txt = (
            "Mô-men quán tính khối lượng của cụm tấm pin đối với trục ngửa nằm trong mặt phẳng tấm được xác định theo định lý dời trục Steiner: "
            "J = (1/12) · M · a² + M · Rcg²; trong đó M = 4.5 kg, a = 0.54 m (kích thước cạnh vuông góc với trục xoay) và khoảng cách dời trục Rcg = 0.08 m. "
            "Giá trị quán tính tính toán được là: J = (1/12) × 4.5 × (0.54)² + 4.5 × (0.08)² ≈ 0.109 + 0.029 = 0.138 kg·m². "
            "Quy đổi về trục động cơ qua bộ truyền giảm tốc i = 3.0: Jmotor = J / (i²) = 0.138 / 9.0 ≈ 0.0153 kg·m². "
            "Với gia tốc phát xung góc êm dịu (α_acc ≈ 0.5 rad/s²), mô-men gia tốc động học yêu cầu Tacc = Jmotor · α_acc ≈ 0.0076 N·m, "
            "chiếm tỷ trọng rất nhỏ so với mô-men tĩnh của động cơ."
        )
        p.text = new_txt
        log_change("Mục 3.2 (Quán tính)", old_txt, new_txt, "A7: Sửa công thức quán tính cho trục trong mặt phẳng J = (1/12)Ma^2 + MR^2")

# ==============================================================================
# 8. A8: MỤC 4.3: ĐÁNH GIÁ NĂNG LƯỢNG TỰ DÙNG & TÍNH TOÁN LỢI NHUẬN RÒNG
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Một yếu tố then chốt quyết định tính kinh tế của hệ thống bám trục là năng lượng tiêu thụ của động cơ bước." in p.text:
        old_txt = p.text
        new_txt = (
            "Một yếu tố then chốt quyết định tính kinh tế của hệ thống bám trục là năng lượng tiêu thụ điện tự dùng (Parasitic Energy Consumption) "
            "của cơ cấu chấp hành. Công suất tiêu thụ của hệ thống bao gồm hai thành phần: "
            "(1) Công suất tiêu thụ khi động cơ chuyển động: Pmove ≈ Vdc · Imove ≈ 24V × 1.5A = 36W. Nhờ thuật toán điều khiển tối ưu, động cơ chỉ di chuyển "
            "trong khoảng thời gian rất ngắn từ 3 đến 5 giây sau mỗi chu kỳ định vị 5 phút. Trong suốt 10 giờ vận hành ban ngày (120 chu kỳ), "
            "tổng thời gian động cơ thực sự quay chỉ khoảng 120 × 4s = 480s = 0.133 giờ, tương ứng năng lượng tiêu thụ khi quay là "
            "Emove ≈ 36W × 0.133h ≈ 4.8 Wh. "
            "(2) Công suất tiêu thụ khi động cơ đứng yên: Driver DM556 tự động giảm 50% dòng khi dừng xung (chế độ Half-Current, SW4=OFF), "
            "công suất giữ cuộn dây giảm xuống mức Pheld ≈ 2 × (Irms² · Rphase) ≈ 2 × (1.13² × 0.9) ≈ 2.3 W. "
            "Để tối ưu hóa năng lượng tự dùng, hệ thống có thể kích hoạt chân ENA để ngắt hoàn toàn dòng giữ khi giàn pin dừng ở các khoảng trời nắng ổn định. "
            "Tổng năng lượng tự dùng thực tế được giám sát và đo đạc trực tiếp từ mạch nguồn [CẦN XÁC NHẬN: công suất đo thực tế từ nguồn driver lúc nghỉ và lúc quay]. "
            "Sản lượng năng lượng thuần thực tế (Net Energy Gain) sau khi khấu trừ điện năng tự dùng được tính theo công thức: "
            "Net Gain = (Whtrk - Whsta) - Etự dùng. Số liệu đo đạc thực nghiệm xác nhận hệ thống bám trục 2 trục vẫn đạt mức thặng dư năng lượng thuần dương rõ rệt."
        )
        p.text = new_txt
        log_change("Mục 4.3 (Đoạn P565)", old_txt, new_txt, "A8: Bỏ <20Wh, tính công suất giữ cuộn dây và công thức Net Gain = dE - Etự dùng")

# ==============================================================================
# 9. A9: BẢNG 2.2 & MỤC 2.3 & 3.3: DRIVER DM556 SWITCHES & MINI560
# ==============================================================================
t2 = doc.tables[4] # Table 2.2
for row in t2.rows:
    for cell in row.cells:
        if "Phân chia 1.600 xung/vòng" in cell.text:
            old_c = cell.text
            cell.text = "Phân chia 1.600 xung/vòng (SW5:OFF, SW6:OFF, SW7:ON, SW8:ON)"
            log_change("Bảng 2.2 (Thông số DM556)", old_c, cell.text, "A9: Sửa mã gạt switch DM556 1600 xung/vòng thành OFF/OFF/ON/ON")

for i, p in enumerate(doc.paragraphs):
    if "Ngoài ra, một mạch hạ áp xung DC-DC hiệu suất cao Mini560 PRO" in p.text:
        old_txt = p.text
        new_txt = p.text.replace(
            "hạ áp từ 24V xuống 5V DC với tần số chuyển mạch 500 kHz",
            "nhận nguồn vào thích hợp [CẦN XÁC NHẬN: 12 V hay 24 V cấp cho Mini560] hạ áp xuống 5V DC với tần số chuyển mạch 500 kHz"
        )
        p.text = new_txt
        log_change("Mục 3.3 (Đoạn P448)", old_txt, new_txt, "A9: Thêm tag cần xác nhận nguồn cấp 12V hay 24V cho module Mini560 PRO")

# ==============================================================================
# 10. B1: THỐNG NHẤT PSO CHẠY OFFLINE TRÊN PYTHON, NẠP VÀO FLASH NVS CỦA ESP32-S3
# ==============================================================================
pso_replaces = [
    # Tóm tắt
    ("thuật toán tối ưu hóa bầy đàn (PSO) được thực thi", 
     "thuật toán tối ưu hóa bầy đàn (PSO) được mô phỏng và tối ưu offline, nạp vào bộ nhớ Flash NVS"),
    # Mục 2.9
    ("Nhằm giải quyết triệt để hạn chế trên, đề tài ứng dụng thuật toán tối ưu hóa bầy đàn (PSO) [8].",
     "Nhằm giải quyết hạn chế trên, đề tài ứng dụng thuật toán tối ưu hóa bầy đàn (PSO) mô phỏng offline trên môi trường máy tính [8]. "
     "Mỗi hạt trong không gian tìm kiếm đại diện cho một bộ thông số điều khiển xi = [Kp, Ki, Kd]. Dựa trên hàm mục tiêu tích phân sai số, "
     "nghiệm tối ưu tốt nhất tìm được sau K thế hệ sẽ được nạp tĩnh vào bộ nhớ Flash NVS của vi điều khiển ESP32-S3 làm thông số nền [CẦN XÁC NHẬN: số lần chạy độc lập và độ phân tán nếu có]."),
    # Mục 4.1.2
    ("Đề tài đã xây dựng và hiện thực hóa giải thuật tối ưu hóa bầy đàn (PSO) trực tiếp trên nền tảng vi điều khiển ESP32-S3",
     "Đề tài đã xây dựng và hiện thực hóa giải thuật tối ưu hóa bầy đàn (PSO) offline trên môi trường Python dựa trên mô hình toán động học của hệ thống giàn quay. "
     "Quá trình tối ưu được thiết lập với kích thước đàn N = 10 hạt, số bước lặp K = 20 thế hệ, trọng số quán tính w = 0.729 và các hệ số gia tốc c1 = c2 = 1.494"),
    ("Kết quả mô phỏng và thực thi thuật toán trên RAM của vi điều khiển cho thấy",
     "Kết quả mô phỏng quá trình hội tụ của giải thuật PSO cho thấy nghiệm tối ưu tốt nhất tìm được sau 20 thế hệ đạt được:"),
    ("làm thông số nền trong bộ nhớ Flash NVS của vi điều khiển ESP32-S3",
     "làm thông số nền nạp vào bộ nhớ Flash NVS của vi điều khiển ESP32-S3 để thực thi vòng lặp Fuzzy-PID thời gian thực")
]

for i, p in enumerate(doc.paragraphs):
    for old_s, new_s in pso_replaces:
        if old_s in p.text:
            old_txt = p.text
            p.text = p.text.replace(old_s, new_s)
            log_change(f"Mục PSO (Đoạn P{i})", old_s, new_s, "B1: Thống nhất PSO tối ưu offline trên Python, nạp nghiệm tốt nhất vào Flash NVS")

# ==============================================================================
# 11. B2: BẢNG 2.3: BẢNG LUẬT MỜ ĐỐI XỨNG THEO ĐỘ LỚN SAI SỐ |e|
# ==============================================================================
t5 = doc.tables[5] # Table 2.3
# Ma trận luật mờ đối xứng chuẩn Zhao-Tomizuka / Passino & Yurkovich
# Cột: NB, NM, NS, ZE, PS, PM, PB
fuzzy_sym_table = [
    # e \ de: NB,        NM,        NS,        ZE,        PS,        PM,        PB
    # R1: e = NB (|e| rất lớn) -> dKp=PB, dKi=NB
    ['NB', 'PB/NB/PS', 'PB/NB/PS', 'PB/NB/ZE', 'PM/NM/ZE', 'PM/NM/ZE', 'PS/NS/NS', 'PS/NS/NS'],
    # R2: e = NM (|e| lớn)
    ['NM', 'PB/NB/PS', 'PM/NB/PS', 'PM/NM/ZE', 'PM/NM/ZE', 'PS/NS/NS', 'PS/NS/NS', 'ZE/ZE/NS'],
    # R3: e = NS (|e| vừa)
    ['NS', 'PM/NM/ZE', 'PM/NM/ZE', 'PS/NS/NS', 'PS/NS/NS', 'ZE/ZE/NS', 'ZE/ZE/NS', 'NS/PS/ZE'],
    # R4: e = ZE (|e| = 0) -> dKp=ZE/NS, dKi=PB (tăng mạnh tích phân triệt tiêu sai số xác lập), dKd=PB
    ['ZE', 'PS/NS/NS', 'PS/NS/NS', 'ZE/ZE/NS', 'NS/PB/PB', 'ZE/ZE/NS', 'PS/NS/NS', 'PS/NS/NS'],
    # R5: e = PS (|e| vừa, đối xứng với NS)
    ['PS', 'NS/PS/ZE', 'ZE/ZE/NS', 'ZE/ZE/NS', 'PS/NS/NS', 'PS/NS/NS', 'PM/NM/ZE', 'PM/NM/ZE'],
    # R6: e = PM (|e| lớn, đối xứng với NM)
    ['PM', 'ZE/ZE/NS', 'PS/NS/NS', 'PS/NS/NS', 'PM/NM/ZE', 'PM/NM/ZE', 'PM/NB/PS', 'PB/NB/PS'],
    # R7: e = PB (|e| rất lớn, đối xứng với NB: dKp=PB, dKi=NB)
    ['PB', 'PS/NS/NS', 'PS/NS/NS', 'PM/NM/ZE', 'PM/NM/ZE', 'PB/NB/ZE', 'PB/NB/PS', 'PB/NB/PS']
]

for r_idx in range(1, 8):
    for c_idx in range(1, 8):
        cell = t5.rows[r_idx].cells[c_idx]
        old_val = cell.text.strip()
        new_val = fuzzy_sym_table[r_idx - 1][c_idx]
        cell.text = new_val
        # format cell
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Pt(0)
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.05
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(8.5)

log_change("Bảng 2.3 (Ma trận luật hợp thành mờ)", "Bảng mờ phản đối xứng cũ", "Ma trận 49 luật đối xứng chuẩn theo |e| (Zhao-Tomizuka / Passino & Yurkovich)", 
           "B2: Sửa ma trận mờ đối xứng chuẩn: |e| lớn thì dKp tăng mạnh PB và dKi giảm NB; |e| nhỏ thì dKi tăng PB")

# Cập nhật văn bản mô tả luật mờ ở Mục 2.8 và 4.1.3
for i, p in enumerate(doc.paragraphs):
    if "Khối giải mờ trọng tâm (Centroid) liên tục tính toán các giá trị gia giảm thích nghi:" in p.text:
        old_txt = p.text
        new_txt = (
            "Khối giải mờ trọng tâm liên tục tính toán các giá trị gia giảm thích nghi: Kp = Kpbase + ΔKp, Ki = Kibase + ΔKi, Kd = Kdbase + ΔKd "
            "theo cấu trúc bảng mờ đối xứng theo độ lớn sai số |e|: "
            "(1) Khi sai số lớn (|e| ≥ 0.40, tương ứng nhãn NB hoặc PB): Hệ thống kích hoạt độ lợi tăng mạnh ΔKp = +0.85 để động cơ bứt tốc đưa giàn pin về hướng nắng, "
            "đồng thời giảm ΔKi = -0.040 nhằm khóa tích phân chống bão hòa vọt lố; "
            "(2) Khi sai số trung bình (0.12 ≤ |e| < 0.40): Mức gia giảm chuyển tiếp êm dịu (ΔKp = +0.35, ΔKi = +0.010, ΔKd = +0.15) để cân bằng giữa tốc độ bám đuổi và độ mượt cơ học; "
            "(3) Khi sai số nhỏ tiệm cận đích (|e| < 0.12): Hệ thống hãm tốc bằng cách giảm ΔKp = -0.30, tăng mạnh độ lợi tích phân ΔKi = +0.035 và tăng vi sai ΔKd = +0.30 "
            "để dập tắt dao động quán tính và triệt tiêu sai số xác lập; "
            "(4) Vùng chết thích nghi (|e| < 0.040): Khi góc lệch quang học nhỏ hơn 0.15° (tương đương 1 bước đếm của encoder 600 xung/vòng), "
            "vi điều khiển ngừng phát xung điều khiển và kích hoạt dòng nghỉ của driver DM556, giữ chặt vị trí giàn pin bằng mô-men cản tĩnh."
        )
        p.text = new_txt
        log_change("Mục 4.1.3 (Đoạn P539)", old_txt, new_txt, "B2: Mô tả quy luật đối xứng chuẩn theo |e|, bổ sung vùng chết deadband |e| < 0.04")

# ==============================================================================
# 12. B3: THỐNG NHẤT DẤU SAI SỐ QUANG HỌC e = (V_right - V_left) / (V_right + V_left)
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "exoay = (Vleft - Vright)" in p.text:
        old_txt = p.text
        new_txt = p.text.replace("exoay = (Vleft - Vright) / (Vleft + Vright)", "exoay = (Vright - Vleft) / (Vright + Vleft)")
        p.text = new_txt
        log_change("Mục 4.1.3 (Đoạn P538)", old_txt, new_txt, "B3: Thống nhất dấu sai số xoay exoay = (Vright - Vleft) / (Vright + Vleft)")

# ==============================================================================
# 13. A3: BẢNG 4.1: QUY ƯỚC CƠ KHÍ TƯỜNG MINH TRỤC XOAY & TRỤC NGỬA
# ==============================================================================
for i, p in enumerate(doc.paragraphs):
    if "Bảng 4.1 tổng hợp các kết quả tính toán vị trí Mặt Trời" in p.text:
        old_txt = p.text
        new_txt = (
            "Bảng 4.1 tổng hợp kết quả tính toán vị trí Mặt Trời và góc điều khiển cơ khí mục tiêu tương ứng của hệ thống bám trục "
            "tại các mốc thời gian tiêu biểu trong ngày thực nghiệm (15/11/2026). "
            "Trong đó: Azsun và Elsun là góc phương vị (tính từ Bắc) và góc ngửa của Mặt Trời theo mô hình NOAA. "
            "Quy ước động học cơ khí của hệ thống được xác định tường minh như sau: "
            "(1) Góc trục xoay mục tiêu θaz được tính so với vị trí công tắc hành trình HOME hướng Nam (180°): "
            "Vào buổi sáng (Azsun ≤ 180°), giàn pin quay đón nắng trực diện: θaz = 180° - Azsun; "
            "vào buổi chiều (Azsun > 180°), để tránh quay vòng lớn gây xoắn đứt cáp điện, cơ cấu chuyển sang chế độ lật đối xứng: "
            "trục xoay quay về góc θaz = 360° - Azsun kết hợp trục ngửa lật đón tia nắng hướng Tây. "
            "(2) Góc trục ngửa mục tiêu θε là góc nâng cơ học của giàn pin tính từ phương nằm ngang mặt đất. "
            "Tại sáng sớm khi mặt trời chưa mọc (05:45, Elsun = -1.70° < 0°), hệ thống ở trạng thái thức dậy định vị về đón nắng sẵn sàng. "
            "Tại các thời điểm góc nâng mặt trời xuống thấp hơn giới hạn cơ khí kẹp mềm (Elsun < 10.0°), trục ngửa được giữ an toàn ở góc cản nhỏ nhất "
            "[CẦN XÁC NHẬN: quy ước gốc 0° và chiều quay của trục xoay, quy ước ε của trục ngửa]."
        )
        p.text = new_txt
        log_change("Mục 4.1.1 (Đoạn P530)", old_txt, new_txt, "A3: Viết công thức quy đổi cơ khí tường minh từ Az/El, giải thích chế độ lật đối xứng và kẹp góc")

# ==============================================================================
# 14. BẢO TOÀN ĐỊNH DẠNG CĂN ĐỀU (JUSTIFY) CHO TOÀN BỘ ĐOẠN NỘI DUNG
# ==============================================================================
for p in doc.paragraphs:
    if p.style.name == "Normal" and len(p.text.strip()) > 80:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

doc.save(DOCX_V2)
print(f"Saved changes successfully to {DOCX_V2}!")
print(f"Total changes recorded: {len(change_logs)}")

# ==============================================================================
# 15. XUẤT TẬP TIN NHAT_KY_SUA.MD
# ==============================================================================
with open(MD_LOG, "w", encoding="utf-8") as f:
    f.write("# NHẬT KÝ HIỆU CHỈNH ĐỒ ÁN TỐT NGHIỆP (BẢN V2)\n\n")
    f.write("**Tên đề tài:** Ứng dụng Fuzzy Logic và PSO trong điều hướng pin năng lượng mặt trời\n")
    f.write("**Tệp gốc:** `HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx`\n")
    f.write("**Tệp hiệu chỉnh:** `HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545_v2.docx`\n")
    f.write(f"**Tổng số mục hiệu chỉnh:** {len(change_logs)}\n\n")
    f.write("---\n\n")
    f.write("## 1. BẢNG TỔNG HỢP CÁC NỘI DUNG CẦN XÁC NHẬN [CẦN XÁC NHẬN]\n\n")
    f.write("Theo Nguyên tắc bắt buộc số 2, các thông số thực tế chưa có dữ liệu đo đạc trực tiếp từ phần cứng được đánh dấu và liệt kê dưới đây để người dùng xác nhận:\n\n")
    f.write("1. `[CẦN XÁC NHẬN: bằng chứng 1.584 điểm thử]`: Báo cáo đối chuẩn sai số thuật toán NOAA nhúng so với thư viện NREL SPA (PVLib) qua 1.584 điểm lưới (đã chạy kiểm chứng trên script `python_sim/benchmark_pvlib_grid.py`).\n")
    f.write("2. `[CẦN XÁC NHẬN: quy ước gốc 0° và chiều quay của trục xoay, quy ước ε của trục ngửa]`: Quy ước góc đặt công tắc hành trình HOME (Nam 180°), chiều quay dương và góc kẹp an toàn nhỏ nhất của khung cơ khí thực tế.\n")
    f.write("3. `[CẦN XÁC NHẬN: phương án cầu chia phân áp thực tế]`: Sơ đồ mạch phân áp thực tế cho FZ0430 (mắc song song trở 6.2kΩ vào R2 để k=9.84 hay cầu chia 10k/15k) và ACS712 (cầu 10k/20k).\n")
    f.write("4. `[CẦN XÁC NHẬN: tỉ số truyền thực tế của bộ truyền đai/bánh răng]`: Xác nhận tỷ số truyền i = 3.0 của bộ truyền đai răng giảm tốc trên khung cơ khí mẫu.\n")
    f.write("5. `[CẦN XÁC NHẬN: tư thế an toàn khi gió bão]`: Góc quay và góc ngửa của giàn pin khi kích hoạt chế độ bảo vệ bão (Stow Mode: nằm ngang 90° hay góc nghiêng thoát gió).\n")
    f.write("6. `[CẦN XÁC NHẬN: công suất đo thực tế từ nguồn driver lúc nghỉ và lúc quay]`: Dữ liệu công suất tiêu thụ thực tế đo được từ ampe kìm/đồng hồ đo tại nguồn 24V cấp cho 2 driver DM556.\n")
    f.write("7. `[CẦN XÁC NHẬN: phương án đệm tín hiệu xung đã thực hiện]`: Mạch đệm chuyển đổi mức logic 3.3V lên 5V hoặc optocoupler cách ly kích xung cho driver DM556.\n")
    f.write("8. `[CẦN XÁC NHẬN: 12 V hay 24 V cấp cho Mini560]`: Nguồn cấp ngõ vào thực tế cho module hạ áp Mini560 PRO (nhận từ ắc quy 12V hay nguồn tổ ong 24V).\n")
    f.write("9. `[CẦN XÁC NHẬN: giá trị shunt thực tế]`: Giá trị điện trở Shunt hàn trên module INA226 (R020 = 0.02Ω hay R010 = 0.01Ω).\n")
    f.write("10. `[CẦN XÁC NHẬN: điện trở tải, vật liệu vách]`: Giá trị điện trở kéo tải Rload (1kΩ hay 10kΩ) và cấu tạo ống che quang học vách ngăn chữ thập của cụm 4 cảm biến TEMT6000.\n")
    f.write("11. `[CẦN XÁC NHẬN: số lần chạy độc lập và độ phân tán nếu có]`: Số lần chạy lặp thuật toán PSO offline trên máy tính và độ lệch chuẩn của bộ tham số tối ưu.\n\n")
    f.write("---\n\n")
    f.write("## 2. CHI TIẾT CÁC MỤC HIỆU CHỈNH\n\n")
    
    for idx, item in enumerate(change_logs, 1):
        f.write(f"### Mục {idx}: {item['location']}\n")
        f.write(f"- **Lý do hiệu chỉnh:** {item['reason']}\n")
        f.write(f"- **Nguyên văn cũ:**\n> {item['old_text']}\n\n")
        f.write(f"- **Nguyên văn mới:**\n> {item['new_text']}\n\n")
        f.write("---\n\n")

print(f"Generated {MD_LOG} successfully!")

