# -*- coding: utf-8 -*-
"""
Content for completing Chapter 2: Cơ sở lý thuyết
"""

CH2_ESP32_DATA = {
    "title": "Vi điều khiển ESP32-S3 WROOM N16R8",
    "paragraphs": [
        "ESP32-S3 WROOM N16R8 là module vi điều khiển (MCU) hiệu năng cao thế hệ mới của hãng Espressif Systems. Cốt lõi của module là vi xử lý Xtensa® 32-bit LX7 lõi kép, hoạt động ở xung nhịp xung kích lên đến 240 MHz [9]. Hậu tố \"N16R8\" biểu thị cấu hình bộ nhớ cao cấp nhất trong dòng mạch này, bao gồm 16MB bộ nhớ Flash SPI tốc độ cao (lưu trữ mã nguồn firmware và các bảng thông số định vị thiên văn) cùng 8MB bộ nhớ Octal PSRAM mở rộng [9]. Bộ nhớ dung lượng lớn này là điều kiện tiên quyết giúp hệ thống thực thi mượt mà các thuật toán toán học phức tạp như giải thuật tối ưu hóa bầy đàn (PSO) và tính toán tọa độ mặt trời NOAA theo thời gian thực mà không gặp phải rủi ro tràn bộ nhớ (Stack Overflow).",
        "Bên cạnh năng lực xử lý số học mạnh mẽ, ESP32-S3 được tích hợp sẵn các tập lệnh vector hỗ trợ tăng tốc xử lý tín hiệu số (DSP), cùng khối thu phát vô tuyến Wi-Fi 2.4 GHz chuẩn IEEE 802.11 b/g/n và Bluetooth 5.0 (BLE). Trong kiến trúc hệ thống của đề tài, kết nối Wi-Fi đảm bảo đường truyền truyền thông ổn định với độ trễ thấp để đồng bộ dữ liệu đo đạc lên máy chủ Google Firebase Realtime Database.",
        "Đặc biệt, ESP32-S3 sở hữu khối phần cứng chuyên dụng Pulse Counter (PCNT) độc lập với CPU, cho phép thu nhận và giải mã trực tiếp tín hiệu xung vuông góc (Quadrature) từ Encoder cơ khí ở tần số cao mà hoàn toàn không làm tiêu tốn tài nguyên ngắt (Interrupt overhead) của bộ vi xử lý chính. Ngoài ra, module cung cấp hai bộ chuyển đổi tương tự - số riêng biệt ADC1 và ADC2; trong đó toàn bộ 4 kênh cảm biến quang TEMT6000 của hệ thống được quy hoạch đấu nối trọn vẹn vào khối ADC1 nhằm triệt tiêu hoàn toàn hiện tượng xung đột phần cứng với khối truyền thông vô tuyến Wi-Fi RF (vốn thường gây sai lệch kết quả đo trên khối ADC2) [9]."
    ],
    "table_caption": "Bảng 2.1: Thông số kỹ thuật chi tiết của vi điều khiển ESP32-S3 WROOM N16R8 [9]",
    "table_headers": ["Thông số kỹ thuật", "Giá trị / Quy chuẩn"],
    "table_rows": [
        ["Kiến trúc vi xử lý", "Xtensa® Dual-Core 32-bit LX7, xung nhịp lên đến 240 MHz"],
        ["Bộ nhớ trong (Internal)", "512 KB SRAM, 384 KB ROM, 16 KB SRAM trong RTC"],
        ["Bộ nhớ mở rộng (External)", "16 MB Quad SPI Flash (N16) + 8 MB Octal PSRAM (R8)"],
        ["Kết nối không dây", "Wi-Fi 802.11 b/g/n (2.4 GHz, lên đến 150 Mbps) & Bluetooth 5 (BLE)"],
        ["Ngoại vi đếm xung (PCNT)", "4 đơn vị phần cứng độc lập, hỗ trợ giải mã tín hiệu Quadrature x4"],
        ["Khối biến đổi ADC", "2 bộ ADC 12-bit (ADC1: 8 kênh, ADC2: 10 kênh)"],
        ["Giao tiếp công nghiệp", "I2C, SPI, UART, PWM, USB-OTG / JTAG bản địa"],
        ["Điện áp hoạt động & Dòng nghỉ", "3.0V - 3.6V (Chuẩn 3.3V); Chế độ Light-sleep: ~240 μA, Deep-sleep: ~8 μA"]
    ]
}

CH2_ADDITIONAL_SECTIONS = [
    {
        "level": 3,
        "title": "Động cơ bước NEMA 23 và Driver điều khiển DM556",
        "paragraphs": [
            "Trong các hệ thống pin năng lượng mặt trời xoay hai trục ngoài trời, cơ cấu chấp hành phải đối mặt trực tiếp với các điều kiện khắc nghiệt của môi trường tự nhiên, đặc biệt là tải trọng gió thay đổi liên tục gây rung lắc và áp lực xoắn cơ học lên khung đỡ [3]. Do đó, việc lựa chọn động cơ đòi hỏi vừa phải có độ chính xác định vị góc cao, vừa phải sở hữu mô-men xoắn giữ (Holding Torque) lớn nhằm cố định vững chắc góc nghiêng của giàn pin sau khi đã hoàn tất quá trình hướng sáng mà không bị trượt bước.",
            "Đề tài lựa chọn dòng động cơ bước lai 2 pha NEMA 23 (Model 57BYGH), sở hữu góc bước cơ bản 1.8° (tương đương 200 bước nguyên/vòng). Động cơ sử dụng rotor nam châm vĩnh cửu đa cực kết hợp stator quấn dây phân tán, cho phép sản sinh mô-men giữ danh định lên tới 1.9 N·m tại dòng định mức 3.0A. Khác với động cơ servo đắt tiền hoặc động cơ DC giảm tốc vốn dễ bị trôi vị trí do độ rơ bánh răng sau thời gian dài sử dụng, động cơ bước kết hợp với bước xung điều khiển giúp hệ thống giữ vững góc nghiêng tuyệt đối trước các cơn gió giật mà không cần lắp đặt thêm hệ thống phanh hãm cơ khí phức tạp.",
            "Để điều khiển tối ưu động cơ NEMA 23, hệ thống tích hợp driver điều khiển vi bước công nghiệp DM556. Driver DM556 ứng dụng bộ xử lý tín hiệu số DSP 32-bit tiên tiến cùng công nghệ điều khiển dòng điện hình sin thuần túy, mang lại các tính năng kỹ thuật vượt trội [3]:",
            "1. Phân chia vi bước siêu mịn (Microstepping): Hỗ trợ tới 16 chế độ phân chia bước xung từ 400 xung/vòng lên tới 25.600 xung/vòng (thông qua cụm công tắc gạt SW5-SW8). Trong đề tài, driver được cấu hình ở mức 1.600 xung/vòng (vi bước 1/8), giúp động cơ vận hành cực kỳ êm ái, triệt tiêu gần như hoàn toàn hiện tượng cộng hưởng cơ học và rung giật ở dải vận tốc thấp.",
            "2. Công nghệ tự động giảm dòng khi nghỉ (Semi-Flow / Idle Current Reduction): Khi vi điều khiển ngừng phát xung bước trong khoảng thời gian quá 200ms (công tắc SW4 gạt chế độ Half-Current), driver tự động hạ dòng điện qua cuộn dây động cơ xuống 50% so với giá trị định mức. Tính năng này giúp giảm nhiệt lượng tỏa ra trên thân động cơ bước tới 60%, kéo dài tuổi thọ cách điện của cuộn dây và tiết kiệm đáng kể năng lượng tự dùng của toàn hệ thống trong các khoảng thời gian dừng chờ định vị.",
            "3. Cơ chế bảo vệ toàn diện: Tích hợp mạch bảo vệ chống quá áp, thấp áp, quá dòng và ngắn mạch cuộn dây, đồng thời cách ly quang (Optocoupler) toàn bộ các chân tín hiệu điều khiển (PUL, DIR, ENA) giúp bảo vệ an toàn tuyệt đối cho vi điều khiển ESP32-S3 trước các xung điện áp phản kháng cảm ứng từ động cơ."
        ],
        "table_caption": "Bảng 2.2: Thông số kỹ thuật động cơ bước NEMA 23 và Driver điều khiển DM556",
        "table_headers": ["Đặc tính kỹ thuật", "Động cơ NEMA 23 (57BYGH)", "Driver DM556"],
        "table_rows": [
            ["Điện áp hoạt động", "12V - 36V DC (Đề tài dùng 12V)", "20V - 50V DC (Đề tài dùng 12V DC)"],
            ["Dòng điện định mức", "3.0 A / pha", "1.4 A - 5.6 A (Cấu hình SW1-SW3 ở mức 3.2A)"],
            ["Góc bước / Vi bước", "1.8° ± 5% (200 bước/vòng)", "Phân chia 1.600 xung/vòng (SW5:ON, SW6:OFF, SW7:ON, SW8:OFF)"],
            ["Mô-men xoắn giữ (Holding)", "1.9 N·m (19 kg·cm)", "-"],
            ["Trở kháng / Cảm kháng pha", "0.9 Ω / 2.5 mH", "-"],
            ["Tần số xung tối đa", "-", "200 kHz (Cách ly quang cao tốc)"],
            ["Chế độ giảm dòng khi nghỉ", "-", "Tự động giảm 50% dòng sau 200ms dừng xung (SW4: OFF)"]
        ]
    },
    {
        "level": 3,
        "title": "Cảm biến góc quay Rotary Encoder quang học 3806",
        "paragraphs": [
            "Mặc dù động cơ bước có khả năng định vị theo số lượng xung phát ra, nhưng trong môi trường hoạt động thực tế ngoài trời, các yếu tố ngoại cảnh như gió bão bất ngờ, ma sát cơ khí tăng cao do bụi bẩn hoặc hiện tượng kẹt trục có thể khiến động cơ bị trượt bước (Missed Steps). Nếu chỉ điều khiển theo vòng hở (Open-loop Control), sai số tích lũy qua thời gian sẽ ngày càng lớn, khiến tấm pin bị lệch khỏi quỹ đạo mặt trời mà hệ thống không hề hay biết. Để giải quyết triệt để vấn đề này, hệ thống tích hợp cảm biến góc quay tương đối Rotary Encoder quang học model 3806 (HN3806-AB-400G) trên cả hai trục chuyển động để tạo thành cấu trúc điều khiển phản hồi vòng kín (Closed-loop Feedback) [3].",
            "Cảm biến encoder quang học 3806 hoạt động dựa trên nguyên lý quang điện tử: một đĩa mã hóa bằng thủy tinh hoặc kim loại có khắc 400 vạch xuyên quang quay đồng trục với cơ cấu chấp hành, nằm giữa nguồn phát diode hồng ngoại và mảng phototransistor thu quang. Khi đĩa quay, chùm tia sáng liên tục bị đóng ngắt, tạo ra hai chuỗi xung vuông lệch pha nhau chính xác 90° điện tử, thường được gọi là kênh Phase A và Phase B (Quadrature Signals).",
            "Nhờ độ lệch pha 90° giữa hai kênh, trạng thái chuyển tiếp mức logic của Phase A so với Phase B cho phép xác định chính xác chiều quay của trục động cơ: khi Phase A dẫn trước Phase B, cơ cấu đang quay theo chiều thuận; ngược lại khi Phase B dẫn trước Phase A, cơ cấu đang quay theo chiều nghịch. Tín hiệu từ hai pha được đưa trực tiếp vào khối phần cứng Pulse Counter (PCNT) của vi điều khiển ESP32-S3. Bằng cách kích hoạt chế độ giải mã bắt cả sườn lên và sườn xuống của cả hai kênh A và B (chế độ đếm Quadrature x4), độ phân giải xung thực tế tăng gấp 4 lần, đạt 1.600 trạng thái xung trên mỗi vòng quay cơ học (400 PPR × 4 = 1.600 counts/rev). Điều này đem lại độ phân giải góc đo cực kỳ mịn, đạt 360° / 1.600 = 0.225° trên mỗi bước đếm, cho phép vi điều khiển phát hiện và bù đắp ngay lập tức mọi hiện tượng trượt bước hoặc sai lệch cơ khí."
        ]
    },
    {
        "level": 3,
        "title": "Cảm biến ánh sáng quang học TEMT6000",
        "paragraphs": [
            "Cảm biến ánh sáng đóng vai trò là mắt thần của hệ thống trong phương pháp định vị bám quang chủ động. Trong các mô hình bám mặt trời truyền thống, người ta thường sử dụng quang trở LDR (Light Dependent Resistor) bằng vật liệu Cadmium Sulfide (CdS). Tuy nhiên, quang trở LDR bộc lộ rất nhiều nhược điểm nghiêm trọng: độ trễ đáp ứng lớn (hàng chục đến hàng trăm mili-giây), đặc tính phi tuyến tính cao, độ nhạy suy giảm nhanh chóng theo nhiệt độ môi trường và đặc biệt là dải quang phổ đáp ứng không đồng nhất với phổ hấp thụ của tấm pin mặt trời Silicon [3].",
            "Để khắc phục hoàn toàn các hạn chế trên, đề tài sử dụng cảm biến quang bán dẫn chuyên dụng TEMT6000 của hãng Vishay Semiconductors. TEMT6000 là linh kiện quang transistor Silicon NPN phẳng được chế tạo bằng công nghệ epitaxial tiên tiến, sở hữu các ưu điểm quang học vượt trội:",
            "1. Độ nhạy quang phổ tương đồng mắt người: Dải bước sóng đáp ứng quang học của TEMT6000 trải dài từ 360 nm đến 970 nm, đạt độ nhạy đỉnh tại bước sóng 570 nm. Đặc tính này tương thích hoàn hảo với dải quang phổ bức xạ mạnh nhất của ánh sáng mặt trời chiếu xuống mặt đất qua tầng khí quyển (chuẩn AM1.5G), giúp cảm biến loại bỏ các nhiễu bức xạ hồng ngoại nhiệt tán xạ từ môi trường xung quanh.",
            "2. Đáp ứng tuyến tính và tốc độ cao: Dòng quang điện cực góp (Collector Light Current) của TEMT6000 tỷ lệ thuận tuyến tính với cường độ chiếu sáng (Illuminance) trong dải từ 1 Lux đến hơn 1.000 Lux. Tín hiệu dòng điện được chuyển đổi thành điện áp analog thông qua điện trở kéo xuống và đưa về bộ chuyển đổi ADC1 của vi điều khiển ESP32-S3.",
            "Trong hệ thống, 4 cảm biến TEMT6000 được bố trí ở 4 góc đối xứng (Top, Bottom, Left, Right) trên một bo mạch phụ chuyên dụng, ngăn cách nhau bởi một vách ngăn chữ thập hình kim tự tháp. Khi giàn pin nằm vuông góc tuyệt đối với chùm tia nắng, cả 4 cảm biến nhận lượng quang thông đồng đều như nhau, dẫn đến sai số vi sai giữa các cặp đối diện bằng 0. Khi mặt trời di chuyển, vách ngăn cơ học sẽ tạo bóng đổ lên một trong các cảm biến, tạo ra sự chênh lệch điện áp analog rõ rệt giữa hai bên, cung cấp tín hiệu sai số đầu vào cho thuật toán điều khiển thích nghi."
        ]
    },
    {
        "level": 3,
        "title": "Mạch đo công suất chuyên dụng INA226 và Đồng hồ thời gian thực RTC DS3231",
        "paragraphs": [
            "Để thực hiện khảo sát đối chứng năng lượng minh bạch, chính xác giữa giàn pin bám mặt trời hai trục và tấm pin cố định, việc thu thập các thông số điện áp, dòng điện và công suất đòi hỏi độ chính xác cao và tốc độ lấy mẫu ổn định. Đề tài trang bị hai mạch đo lường kỹ thuật số chuyên dụng INA226 hoạt động độc lập qua giao tiếp I2C cho từng tấm pin [10].",
            "Chip INA226 của hãng Texas Instruments tích hợp sẵn bộ chuyển đổi tương tự - số (ADC) 16-bit độ phân giải cao kết hợp bộ nhân toán học số (Multiplication Engine). Thiết bị có khả năng đo trực tiếp điện áp bus từ 0V đến 36V với độ phân giải 1.25 mV và đo điện áp rơi trên điện trở Shunt lấy mẫu (R_shunt = 0.1 Ω hoặc 0.01 Ω) với độ phân giải cực nhỏ 2.5 μV. Nhờ tính toán dòng điện và công suất trực tiếp bằng phần cứng bên trong chip thông qua thanh ghi hiệu chuẩn Calibration Register, INA226 triệt tiêu hoàn toàn sai số làm tròn số học và giảm tải tối đa áp lực tính toán cho CPU nhúng. So với các module cảm biến dòng Hall truyền thống như ACS712 vốn rất dễ bị trôi điểm không (Zero drift) và nhiễu từ trường ngoại vi, INA226 mang lại độ ổn định cao với sai số toàn thang đo dưới 0.1% [10].",
            "Bên cạnh phép đo công suất, việc xác định chính xác thời gian thực đóng vai trò sống còn trong việc tính toán tọa độ mặt trời thiên văn. Đề tài tích hợp module đồng hồ thời gian thực RTC DS3231 độ chính xác cực cao của Maxim Integrated. DS3231 tích hợp sẵn bên trong một bộ dao động thạch anh bù nhiệt độ (TCXO - Temperature-Compensated Crystal Oscillator) và cảm biến nhiệt độ môi trường. Cơ chế bù nhiệt tự động hiệu chỉnh tần số dao động của thạch anh theo nhiệt độ thực tế, duy trì sai số thời gian dưới ±2 phút mỗi năm trong toàn bộ dải nhiệt độ công nghiệp từ -40°C đến +85°C. Module được cấp nguồn nuôi liên tục bởi viên pin cúc áo Lithium CR2032 (3V), đảm bảo hệ thống lưu giữ chính xác tuyệt đối thời gian năm, tháng, ngày, giờ, phút, giây ngay cả khi toàn bộ nguồn điện lưới bị mất. Đặc biệt, chân SQW/INT của DS3231 được lập trình phát xung ngắt vuông chu kỳ 1 Hz nối trực tiếp vào chân GPIO 47 của ESP32-S3, tạo ra nguồn xung nhịp đồng bộ chính xác từng giây để kích hoạt chu trình đọc cảm biến và tính toán góc hướng sáng."
        ]
    },
    {
        "level": 3,
        "title": "Bức xạ mặt trời và Mô hình chuyển động thiên văn NOAA",
        "paragraphs": [
            "Bức xạ mặt trời là nguồn năng lượng điện từ phát ra từ bề mặt quang cầu của Mặt Trời với nhiệt độ xấp xỉ 5.778 K [2]. Khi truyền qua khoảng cách xấp xỉ 149.6 triệu km đến tầng khí quyển ngoài cùng của Trái Đất, cường độ bức xạ trung bình đạt một giá trị tương đối không đổi gọi là Hằng số Mặt Trời (Solar Constant), xấp xỉ G_sc = 1.367 W/m² [2]. Tuy nhiên, khi đi xuyên qua bầu khí quyển xuống bề mặt đất, chùm tia nắng bị hấp thụ và tán xạ bởi các phân tử không khí, hơi nước, bụi bẩn và các đám mây, khiến mật độ công suất bức xạ trực tiếp suy giảm xuống mức xấp xỉ 1.000 W/m² trong điều kiện trời nắng tiêu chuẩn (Air Mass AM1.5G) [1].",
            "Do Trái Đất vừa tự quay quanh trục nghiêng 23.45° với chu kỳ xấp xỉ 24 giờ, vừa chuyển động tịnh tiến quanh Mặt Trời theo quỹ đạo elip với chu kỳ 365.25 ngày, vị trí biểu kiến của Mặt Trời trên bầu trời tại một vị trí địa lý bất kỳ liên tục biến đổi theo thời gian [2]. Để xác định chính xác góc hướng nắng mà không bị phụ thuộc vào điều kiện thời tiết che khuất, đề tài triển khai thuật toán thiên văn học NOAA (National Oceanic and Atmospheric Administration) dựa trên công trình kinh điển của Jean Meeus và Spencer [6].",
            "Mô hình NOAA cho phép xác định tọa độ cầu của Mặt Trời dựa trên vĩ độ (φ), kinh độ (λ) của điểm lắp đặt và thời gian thực GMT+7 tại TP.HCM (φ = 10.7831°N, λ = 106.6721°E) thông qua chuỗi công thức thiên văn học chuẩn xác [6]:",
            "1. Ngày Julius (Julian Day - JD): Quy đổi thời gian lịch thực sang thang đo thời gian thiên văn liên tục.",
            "2. Góc xích vĩ mặt trời (Solar Declination - δ): Góc tạo bởi chùm tia nắng mặt trời và mặt phẳng xích đạo của Trái Đất, biến thiên trong khoảng từ -23.45° (ngày Đông chí 21/12) đến +23.45° (ngày Hạ chí 21/6):",
            "   δ = 23.45° × sin(360°/365 × (284 + n)) [2]",
            "   trong đó n là số thứ tự của ngày trong năm (1 đến 365).",
            "3. Phương trình thời gian (Equation of Time - EOT): Hiệu chỉnh độ sai lệch giữa giờ đồng hồ chuẩn và giờ mặt trời biểu kiến do độ lệch tâm quỹ đạo và độ nghiêng trục Trái Đất gây ra [2].",
            "4. Góc giờ mặt trời (Hour Angle - ω): Góc quay biểu kiến của Mặt Trời quanh trục Trái Đất, tính từ kinh tuyến địa phương (ω = 15° × (Giờ_mặt_trời - 12)) [2].",
            "5. Góc nâng mặt trời (Elevation - ε) và Góc thiên đỉnh (Zenith - θ_z = 90° - ε):",
            "   sin(ε) = sin(φ) × sin(δ) + cos(φ) × cos(δ) × cos(ω) [6]",
            "6. Góc phương vị mặt trời (Azimuth - α): Góc phương vị nằm ngang đo từ hướng Bắc địa lý (0°) theo chiều kim đồng hồ qua Đông (90°), Nam (180°), và Tây (270°):",
            "   cos(α) = (sin(ε) × sin(φ) - sin(δ)) / (cos(ε) × cos(φ)) [6]",
            "Nhờ mô hình giải tích NOAA, ngay cả trong những ngày nhiều mây hoặc sương mù dày đặc khi cảm biến quang TEMT6000 mất phương hướng, vi điều khiển ESP32-S3 vẫn luôn tính toán trước được góc đón nắng lý thuyết với sai số dưới 0.01°, đảm bảo giàn pin sẵn sàng đón nhận quang thông cực đại ngay khi mây tan."
        ]
    },
    {
        "level": 3,
        "title": "Cơ sở lý thuyết Điều khiển mờ (Fuzzy Logic) và Bộ điều khiển lai Fuzzy-PID",
        "paragraphs": [
            "Trong lý thuyết điều khiển tự động cổ điển, bộ điều khiển tỉ lệ - tích phân - vi phân (PID) được sử dụng phổ biến nhờ cấu trúc đơn giản và khả năng triệt tiêu sai số xác lập [7]. Tuy nhiên, đối với bài toán định hướng pin mặt trời ngoài trời, hệ thống mang tính chất phi tuyến sâu sắc: cường độ bức xạ thay đổi đột ngột khi mây che, đặc tính ma sát cơ khí thay đổi theo nhiệt độ và tác động ngẫu nhiên của các cơn gió giật. Một bộ điều khiển PID với bộ ba thông số Kp, Ki, Kd cố định sẽ bộc lộ nhược điểm cố hữu: nếu chọn hệ số khuếch đại lớn để đáp ứng nhanh thì hệ thống sẽ bị vọt lố và dao động cơ khí liên tục quanh điểm cực đại (gây hao mòn ổ bi và tiêu hao điện năng vô ích); ngược lại nếu chọn hệ số nhỏ để đảm bảo độ êm dịu thì thời gian đáp ứng sẽ rất chậm khi góc chiếu nắng thay đổi nhanh [7].",
            "Để khắc phục triệt để mâu thuẫn này, đề tài ứng dụng lý thuyết logic mờ (Fuzzy Logic) do Lotfi A. Zadeh khởi xướng nhằm xây dựng bộ điều khiển thích nghi thông minh lai Fuzzy-PID [7]. Cấu trúc bộ điều khiển mờ bao gồm bốn thành phần chính: Khối mờ hóa (Fuzzification), Cơ sở luật mờ chuyên gia (Fuzzy Rule Base), Động cơ suy luận mờ (Fuzzy Inference Engine), và Khối giải mờ (Defuzzification).",
            "Bộ điều khiển Fuzzy-PID tiếp nhận hai biến đầu vào là sai số góc lệch quang học e(t) và tốc độ biến thiên sai số Δe(t) = de(t)/dt. Các biến đầu vào được phân chia thành 7 tập mờ ngôn ngữ: Âm Lớn (NB - Negative Big), Âm Vừa (NM - Negative Medium), Âm Nhỏ (NS - Negative Small), Không (ZE - Zero), Dương Nhỏ (PS - Positive Small), Dương Vừa (PM - Positive Medium), và Dương Lớn (PB - Positive Big). Các hàm liên thuộc (Membership Functions) được thiết kế dạng hình tam giác và hình thang đối xứng nhằm tối ưu hóa tốc độ tính toán số học trên vi điều khiển nhúng.",
            "Dựa trên kinh nghiệm chuyên gia về động học hệ thống cơ điện tử, một ma trận 49 luật hợp thành mờ dạng Mamdani (If - Then) được thiết lập nhằm hiệu chỉnh thích nghi ba độ lợi ΔKp, ΔKi, ΔKd theo thời gian thực:",
            "- Khi sai số |e(t)| lớn: Cần tăng mạnh ΔKp và giảm ΔKi, ΔKd để cơ cấu quay tăng tốc nhanh chóng về hướng có nắng, rút ngắn thời gian đáp ứng ban đầu.",
            "- Khi sai số |e(t)| nhỏ: Cần giảm ΔKp và tăng nhẹ ΔKi, ΔKd để hãm quán tính cơ học, triệt tiêu hiện tượng vọt lố và đưa sai số góc tiệm cận về 0 mà không sinh ra dao động rung lắc quanh điểm sáng.",
            "Tín hiệu đầu ra sau suy luận mờ được đưa qua khối giải mờ bằng phương pháp trọng tâm diện tích (Centroid / Center of Gravity Method) [7] để thu được các giá trị điều chỉnh thực thể:",
            "   Kp = Kp_base + ΔKp;  Ki = Ki_base + ΔKi;  Kd = Kd_base + ΔKd",
            "Bộ thông số thích nghi này được nạp trực tiếp vào thuật toán điều khiển xung vận tốc của driver DM556, tạo nên một cơ cấu chuyển động vô cùng êm dịu, chính xác và thích nghi tối ưu với mọi điều kiện biến động thời tiết."
        ],
        "table_caption": "Bảng 2.3: Ma trận 49 luật hợp thành mờ hiệu chỉnh tham số ΔKp, ΔKi, ΔKd",
        "table_headers": ["e \\ Δe", "NB", "NM", "NS", "ZE", "PS", "PM", "PB"],
        "table_rows": [
            ["NB", "PB/NB/PS", "PB/NB/NS", "PM/NM/NB", "PM/NM/NB", "PS/NS/NB", "ZE/ZE/NM", "ZE/ZE/PS"],
            ["NM", "PB/NB/PS", "PB/NB/NS", "PM/NM/NB", "PS/NS/NM", "PS/NS/NM", "ZE/ZE/NS", "NS/ZE/PS"],
            ["NS", "PM/NB/ZE", "PM/NM/NS", "PS/NS/NM", "PS/NS/NM", "ZE/ZE/NS", "NS/PS/NS", "NM/PS/ZE"],
            ["ZE", "PM/NM/ZE", "PS/NS/NS", "PS/NS/NS", "ZE/ZE/NS", "NS/PS/NS", "NM/PM/NS", "NM/PM/ZE"],
            ["PS", "PS/NM/ZE", "ZE/ZE/NS", "ZE/ZE/NS", "NS/PS/NM", "NS/PS/NM", "NM/PM/NS", "NB/PB/ZE"],
            ["PM", "ZE/ZE/PS", "NS/PS/NS", "NS/PS/NM", "NM/PM/NM", "NM/PM/NM", "NB/PB/NS", "NB/PB/PS"],
            ["PB", "ZE/ZE/PS", "NM/PS/ZE", "NM/PM/NB", "NB/PB/NB", "NB/PB/NB", "NB/PB/NS", "NB/PB/PS"]
        ]
    },
    {
        "level": 3,
        "title": "Giải thuật Tối ưu hóa bầy đàn (Particle Swarm Optimization - PSO)",
        "paragraphs": [
            "Mặc dù bộ điều khiển mờ Fuzzy-PID có khả năng thích nghi cao, việc xác định các giá trị thông số nền Kp_base, Ki_base, Kd_base cùng biên độ co giãn của các tập mờ thường dựa vào phương pháp thử - sai (Trial and Error) hoặc kinh nghiệm trực quan của người thiết kế. Cách tiếp cận thủ công này tốn rất nhiều thời gian và khó có thể đạt tới trạng thái tối ưu toàn cục (Global Optimum). Nhằm giải quyết triệt để hạn chế trên, đề tài ứng dụng thuật toán tối ưu hóa bầy đàn (Particle Swarm Optimization - PSO) được phát triển bởi Kennedy và Eberhart năm 1995 [8].",
            "Thuật toán PSO mô phỏng tập tính sinh học của bầy chim hoặc đàn cá trong quá trình tìm kiếm nguồn thức ăn trong không gian đa chiều. Mỗi phần tử trong bầy được gọi là một \"hạt\" (Particle), đại diện cho một nghiệm tiềm năng (một bộ thông số điều khiển x_i = [Kp, Ki, Kd, Ke, Kde]). Mỗi hạt bay qua không gian tìm kiếm với một vận tốc v_i được điều chỉnh động dựa trên kinh nghiệm lịch sử của chính nó (vị trí tốt nhất cá nhân - Personal Best pbest_i) và kinh nghiệm chia sẻ của toàn bộ đàn (vị trí tốt nhất toàn cục - Global Best gbest) [8].",
            "Tại mỗi bước lặp k, vận tốc và vị trí của từng hạt được cập nhật theo cặp phương trình toán học kinh điển [8]:",
            "   v_i(k+1) = w × v_i(k) + c_1 × r_1 × (pbest_i - x_i(k)) + c_2 × r_2 × (gbest - x_i(k))",
            "   x_i(k+1) = x_i(k) + v_i(k+1)",
            "trong đó: w là trọng số quán tính (Inertia Weight) điều tiết khả năng khám phá vùng không gian mới; c_1 và c_2 lần lượt là hệ số học tập nhận thức (Cognitive parameter) và hệ số học tập xã hội (Social parameter); r_1 và r_2 là các biến ngẫu nhiên phân bố đều trong khoảng [0, 1].",
            "Để đánh giá chất lượng của từng bộ thông số, thuật toán PSO sử dụng hàm mục tiêu tích phân sai số tuyệt đối theo thời gian (ITAE - Integral of Time-weighted Absolute Error) kết hợp hàm phạt năng lượng tiêu thụ [8]:",
            "   J = ∫ [ t × |e(t)| + w_u × u²(t) ] dt",
            "Nhờ hàm mục tiêu ITAE, các dao động kéo dài về sau bị trừng phạt rất nặng, buộc bầy hạt phải hội tụ về bộ thông số vừa đảm bảo giàn pin bám điểm sáng nhanh nhất, vừa dập tắt hoàn toàn các dao động cơ học vọt lố. Toàn bộ quá trình tối ưu hóa được chạy mô phỏng đối chuẩn trên môi trường Python trước khi nạp bộ tham số tối ưu vào bộ nhớ Flash NVS của vi điều khiển ESP32-S3."
        ]
    },
    {
        "level": 3,
        "title": "Cơ sở phương pháp đo điện áp hở mạch (Voc) và dòng ngắn mạch (Isc)",
        "paragraphs": [
            "Trong công tác nghiên cứu và đánh giá khoa học hiệu quả hoạt động của pin năng lượng mặt trời, chỉ đo công suất tức thời P(t) = V(t) × I(t) khi đang nối tải là chưa đủ để phản ánh toàn diện tình trạng vật lý và hiệu suất chuyển đổi quang năng của tấm pin [5]. Khi tấm pin đang mang tải, điểm làm việc thực tế phụ thuộc lớn vào đặc tính của tải tiêu thụ chứ không nhất thiết nằm tại điểm công suất cực đại (Maximum Power Point - MPP).",
            "Tham khảo công trình nghiên cứu thực nghiệm chuẩn mực của nhóm tác giả Marcos Ponce-Jara và cộng sự công bố trên tạp chí khoa học quốc tế Sustainability (MDPI, 2022) [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc - Open-Circuit Voltage) và dòng điện ngắn mạch (Isc - Short-Circuit Current) đóng vai trò đặc biệt quan trọng:",
            "1. Điện áp hở mạch (Voc): Là mức điện áp lớn nhất mà tấm pin sinh ra khi hai cực đầu ra được ngắt hoàn toàn khỏi tải (dòng điện bằng 0). Voc phản ánh thế năng tiếp giáp p-n nội tại của vật liệu bán dẫn silicon. Giá trị Voc phụ thuộc rất nhạy cảm vào nhiệt độ bề mặt tấm pin: khi nhiệt độ tăng, Voc suy giảm với hệ số nhiệt xấp xỉ -0.35%/°C đến -0.45%/°C [1], [5]. Do đó, việc đo Voc kết hợp với cảm biến nhiệt độ Dallas DS18B20 cho phép đánh giá mức độ suy thoái hiệu suất do hiện tượng quá nhiệt gây ra.",
            "2. Dòng điện ngắn mạch (Isc): Là dòng điện cực đại xuất hiện khi nối tắt trực tiếp hai cực của tấm pin (điện áp rơi bằng 0). Theo vật lý chất bán dẫn, Isc tỷ lệ thuận gần như tuyến tính tuyệt đối với mật độ thông lượng bức xạ mặt trời (Solar Irradiance, W/m²) rọi trực tiếp lên bề mặt tấm pin [1], [5]. Vì vậy, việc đo Isc cho phép định lượng chính xác độ gia tăng quang thông mà giàn pin bám trục 2 trục thu nhận được so với tấm pin lắp đặt cố định mà không bị sai lệch bởi trạng thái nạp của bộ acquy hay trở kháng tải ngoài.",
            "Để đo được Voc và Isc mà không làm gián đoạn quá trình phát điện thông thường, hệ thống xây dựng cơ chế chuyển mạch tự động sử dụng cụm Relay đóng ngắt thông minh điều khiển bởi vi điều khiển ESP32-S3 thứ hai (Node Voc/Isc). Chu kỳ đo được thiết lập định kỳ (ví dụ 10 giây hoặc 60 giây một lần): vi điều khiển ngắt tiếp điểm tải trong khoảng thời gian siêu ngắn 50ms để đọc Voc qua mạch cầu phân áp FZ0430, sau đó kích hoạt tiếp điểm ngắn mạch trong 50ms để đọc Isc qua cảm biến dòng Hall ACS712, rồi ngay lập tức tái lập lại mạch tải bình thường. Giải pháp này đảm bảo tuân thủ nghiêm ngặt chuẩn đo lường của các công trình quốc tế [5] đồng thời giữ nguyên 99.8% thời gian phát điện liên tục cho hệ thống."
        ]
    }
]

print("content_chapter2.py loaded successfully.")

