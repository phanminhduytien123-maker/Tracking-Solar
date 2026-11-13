# -*- coding: utf-8 -*-
"""
Content for Chapter 3: THIẾT KẾ VÀ TÍNH TOÁN HỆ THỐNG (Updated with Swarm recommendations)
"""

CH3_DATA = {
    "chapter_title": "THIẾT KẾ VÀ TÍNH TOÁN HỆ THỐNG",
    "sections": [
        {
            "level": 3,
            "title": "Thiết kế tổng thể và Sơ đồ khối hệ thống",
            "paragraphs": [
                "Để xây dựng một hệ thống pin năng lượng mặt trời tự động điều hướng 2 trục vận hành tin cậy, bền bỉ ngoài môi trường tự nhiên và đáp ứng mục tiêu thu thập số liệu nghiên cứu đối chứng khoa học, đề tài đề xuất kiến trúc phần cứng - phần mềm tích hợp đa tầng phân tán [3]. Hệ thống được cấu thành từ 6 khối chức năng cốt lõi liên kết chặt chẽ với nhau:",
                "1. Khối nguồn cấp cách ly kép (Dual Isolated Power Supply): Sử dụng hai nguồn cấp điện tách biệt hoàn toàn về mặt vật lý nhằm triệt tiêu hiện tượng sụt áp động và xung nhiễu điện từ (EMI) do động cơ công suất lớn gây ra đối với khối vi xử lý và cảm biến đo lường nhạy cảm.",
                "2. Khối điều khiển trung tâm (Dual-MCU Core): Trang bị hai vi điều khiển ESP32-S3 WROOM N16R8 hoạt động song song. Vi điều khiển thứ nhất (ESP32-S3 #1 - Master Tracker) đảm nhiệm toàn bộ thuật toán điều khiển hướng sáng lai (Fuzzy-PID/PSO kết hợp mô hình thiên văn NOAA), phát xung S-curve điều khiển động cơ, đọc phản hồi Encoder và quản lý truyền thông IoT. Vi điều khiển thứ hai (ESP32-S3 #2 - Measurement Node) chuyên trách quản lý chu trình chuyển mạch Relay và thu thập dữ liệu hở mạch Voc, ngắn mạch Isc và nhiệt độ mặt pin.",
                "3. Khối cảm biến thu thập dữ liệu: Bao gồm mạch cảm biến quang vi sai 4 hướng TEMT6000, cặp cảm biến góc quay tương đối Rotary Encoder quang học 3806, mạch đo dòng áp công suất kỹ thuật số INA226, module đồng hồ thời gian thực RTC DS3231 và 2 cảm biến nhiệt độ tiếp xúc DS18B20.",
                "4. Khối cơ cấu chấp hành (Actuators): Cặp động cơ bước 2 pha NEMA 23 kết hợp với 2 driver vi bước kỹ thuật số DSP DM556 truyền động cho hai trục cơ khí độc lập (Trục phương vị Azimuth và Trục độ ngửa Elevation). Cơ cấu được trang bị 2 công tắc hành trình (Limit Switches) tại điểm gốc Homing.",
                "5. Khối chuyển mạch đo kiểm và quản lý phụ tải: Cụm 6 kênh Relay công suất điều khiển chuyển mạch tự động, 2 cảm biến dòng Hall ACS712, 2 mạch cầu phân áp FZ0430 và tải xả điện ban đêm.",
                "6. Khối giám sát và tương tác người dùng IoT: Nền tảng máy chủ trung gian đám mây Google Firebase Realtime Database kết nối với ứng dụng Web Dashboard thời gian thực, tích hợp mô hình Song sinh số 3D Digital Twin xây dựng trên nền tảng Three.js."
            ],
            "table_caption": "Bảng 3.1: Bảng phân công nhiệm vụ và ánh xạ chân phần cứng hai vi điều khiển ESP32-S3",
            "table_headers": ["Vi điều khiển", "Ngoại vi / Chức năng", "Chân GPIO ESP32-S3", "Phương thức kết nối / Ghi chú"],
            "table_rows": [
                ["ESP32-S3 #1 (Master Tracker)", "Trục Azimuth (PUL / DIR)", "GPIO 10 / GPIO 11", "Phát xung S-Curve qua FastAccelStepper"],
                ["ESP32-S3 #1 (Master Tracker)", "Trục Azimuth (ENC A / ENC B)", "GPIO 6 / GPIO 7", "Giải mã Quadrature x4 qua khối phần cứng PCNT"],
                ["ESP32-S3 #1 (Master Tracker)", "Trục Azimuth (HOME SW)", "GPIO 18", "Công tắc hành trình giới hạn gốc (Active-LOW)"],
                ["ESP32-S3 #1 (Master Tracker)", "Trục Elevation (PUL / DIR)", "GPIO 12 / GPIO 13", "Phát xung S-Curve qua FastAccelStepper"],
                ["ESP32-S3 #1 (Master Tracker)", "Trục Elevation (ENC A / ENC B)", "GPIO 16 / GPIO 17", "Giải mã Quadrature x4 qua khối phần cứng PCNT"],
                ["ESP32-S3 #1 (Master Tracker)", "Trục Elevation (HOME SW)", "GPIO 21", "Công tắc hành trình giới hạn gốc (Active-LOW)"],
                ["ESP32-S3 #1 (Master Tracker)", "I2C Bus (RTC DS3231 + INA226)", "GPIO 8 (SDA) / GPIO 9 (SCL)", "Giao tiếp I2C 400kHz, có timeout chống treo"],
                ["ESP32-S3 #1 (Master Tracker)", "Ngắt 1Hz từ RTC DS3231", "GPIO 47 (SQW/INT)", "Ngắt cứng sườn xuống đánh thức chu trình đo"],
                ["ESP32-S3 #1 (Master Tracker)", "Cảm biến quang TEMT6000 4 hướng", "GPIO 1, 2, 3, 4 (ADC1)", "Top=1, Bot=2, Left=3, Right=4 (Tránh xung đột Wi-Fi)"],
                ["ESP32-S3 #1 (Master Tracker)", "Relay K6 (Cắt nguồn đêm ESP2)", "GPIO 5 (ESP1_CUT_ESP2)", "Ngắt nguồn LM2596 #2 vào ban đêm để tiết kiệm điện"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Relay K1/K2 (Cắt tải đo Voc)", "GPIO 38 (RL_CUT_38)", "Ngắt tiếp điểm tải để đo điện áp hở mạch Voc"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Relay K3 (Nối tắt đo Isc Trk)", "GPIO 41 (RL_B_ISC)", "Nối tắt tạm thời tấm Tracking qua ACS712"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Relay K4 (Nối tắt đo Isc Sta)", "GPIO 39 (RL_D_ISC)", "Nối tắt tạm thời tấm Static qua ACS712"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Relay K5 (Tải xả đèn đêm 12V)", "GPIO 42 (RL_E_LAMP)", "Đóng nối tải đèn sợi đốt 12V xả ắc quy ban đêm"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Đo áp Voc (Tấm Tracker / Static)", "GPIO 4, GPIO 5 (ADC1)", "Mạch cầu phân áp FZ0430 tỉ lệ 5:1"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Đo dòng Isc (Tấm Tracker / Static)", "GPIO 6, GPIO 7 (ADC1)", "Cảm biến dòng Hall tuyến tính ACS712-05B"],
                ["ESP32-S3 #2 (Voc/Isc Node)", "Nhiệt độ DS18B20 Trk / Sta", "GPIO 15, GPIO 16", "2 kênh 1-Wire độc lập, điện trở kéo lên 4.7 kΩ"]
            ]
        },
        {
            "level": 3,
            "title": "Tính toán cơ khí và động lực học giàn quay 2 trục",
            "paragraphs": [
                "Cơ cấu cơ khí của hệ thống được thiết kế dạng giàn khung hai bậc tự do độc lập: trục quay phương vị (Azimuth Axis) chuyển động trong mặt phẳng ngang từ Đông sang Tây (dải góc 0° đến 270°), và trục ngửa (Elevation Axis) chuyển động trong mặt phẳng thẳng đứng từ vị trí ngửa 25° lên đến 90° (vuông góc hướng thiên đỉnh) [3].",
                "1. Xác định tải trọng tĩnh và mô-men quán tính:",
                "Khung giàn được gia công từ các thanh nhôm định hình định lượng 2020 kết hợp các tấm gá bằng thép hợp kim cắt laser có độ cứng vững cao. Khối lượng phân bố chi tiết bao gồm:",
                "- Tấm pin mặt trời Silicon: m_pv = 1.85 kg.",
                "- Khung nhôm đỡ tấm pin và giá gá cảm biến: m_frame = 1.40 kg.",
                "- Cụm trục xoay, ổ bi đỡ và khớp nối trục: m_mech = 1.25 kg.",
                "Tổng khối lượng của cơ cấu động đặt lên trục quay: M_tong = m_pv + m_frame + m_mech = 4.50 kg.",
                "Mô-men quán tính của giàn pin đối với trục quay chính được tính theo công thức gần đúng cho thanh và tấm phẳng chữ nhật [3]:",
                "   J = (1/12) × M_tong × (a² + b²) + M_tong × R²_cg",
                "với kích thước tấm pin a = 0.54 m, b = 0.42 m, và khoảng cách từ trọng tâm đến trục xoay R_cg = 0.08 m:",
                "   J ≈ (1/12) × 4.50 × (0.54² + 0.42²) + 4.50 × (0.08²) ≈ 0.204 kg·m².",
                "2. Tính toán mô-men cản do gió (Wind Load Torque):",
                "Khi hoạt động ngoài trời, tải trọng nguy hiểm nhất tác động lên hệ thống là lực đẩy của gió. Áp lực động của gió tác dụng vuông góc lên bề mặt tấm pin được xác định theo tiêu chuẩn khí động học [3]:",
                "   P_gio = 0.5 × ρ_kk × v²_gio × C_d",
                "trong đó: mật độ không khí ρ_kk = 1.225 kg/m³; hệ số cản khí động học của tấm phẳng C_d ≈ 1.20; giả định vận tốc gió thiết kế cấp 5 tại khu vực TP.HCM là v_gio = 10 m/s:",
                "   P_gio = 0.5 × 1.225 × (10²) × 1.20 = 73.5 N/m².",
                "Diện tích chắn gió của bề mặt tấm pin: A_pv = 0.54 m × 0.42 m = 0.2268 m².",
                "Lực cản tổng cộng do gió tác động lên tấm pin: F_gio = P_gio × A_pv = 73.5 × 0.2268 ≈ 16.67 N.",
                "Điểm đặt của lực gió có thể lệch khỏi tâm trục quay một khoảng tối đa e_w = 0.05 m, tạo ra mô-men cản do gió:",
                "   T_gio = F_gio × e_w = 16.67 × 0.05 ≈ 0.834 N·m.",
                "3. Kiểm tra điều kiện bền và chọn động cơ bước NEMA 23:",
                "Mô-men xoắn cản tĩnh tổng cộng cần thiết để giữ vững cơ cấu và thắng lực ma sát ổ trục (T_ms ≈ 0.15 N·m) là:",
                "   T_can = T_gio + T_ms = 0.834 + 0.15 = 0.984 N·m.",
                "Động cơ bước NEMA 23 được lựa chọn có mô-men xoắn giữ danh định T_holding = 1.90 N·m. Hệ số an toàn mô-men của hệ thống đạt được là:",
                "   k_at = T_holding / T_can = 1.90 / 0.984 ≈ 1.93 (Thỏa mãn điều kiện an toàn k_at ≥ 1.5).",
                "Hệ số này chứng minh động cơ NEMA 23 hoàn toàn đủ khả năng giữ vững vị trí góc ngửa của tấm pin ngay cả trong điều kiện gió thổi giật mạnh mà không xảy ra hiện tượng lệch góc hay trượt bước cơ khí."
            ]
        },
        {
            "level": 3,
            "title": "Tính toán và thiết kế hệ thống nguồn cấp cách ly",
            "paragraphs": [
                "Một trong những nguyên nhân hàng đầu gây ra lỗi treo hệ thống vi xử lý (MCU Freeze / Hang) hoặc làm méo dạng tín hiệu đo analog trong các dự án cơ điện tử bám mặt trời thực tế là việc sử dụng chung nguồn cấp giữa khối động cơ công suất lớn và mạch điều khiển nhạy cảm. Khi hai động cơ bước NEMA 23 cùng khởi động hoặc đổi chiều đột ngột, dòng xung kích (Inrush Current) có thể vọt lên trên 6A, gây sụt áp trên đường bus nguồn chính và tạo ra các gai điện áp phản kháng (Inductive Voltage Spikes) từ cuộn cảm động cơ quay ngược về phá hỏng cổng GPIO hoặc làm sai lệch điện áp tham chiếu ADC [3].",
                "Để giải quyết triệt để vấn đề này, đề tài xây dựng kiến trúc nguồn cấp phân lập cách ly kép (Dual Isolated Power Architecture) gồm hai nhánh hoàn toàn độc lập:",
                "1. Nhánh nguồn công suất động lực (Power Supply Branch):",
                "Sử dụng bộ nguồn tổ ong chuyển mạch AC-DC công nghiệp (Input: 220V AC, Output: 12V DC - 10A danh định, công suất 120W). Nguồn 12V này được nối trực tiếp vào cọc ốc nguồn của 2 driver vi bước DM556. Ngoài ra, một mạch hạ áp xung DC-DC hiệu suất cao Mini560 PRO (hạ áp từ 12V xuống 5V DC với tần số chuyển mạch 500 kHz) được đấu nối riêng trên nhánh này để cấp nguồn 5V nuôi bộ phát quang của 2 Encoder 3806. Nhờ đó, toàn bộ dòng điện lớn và nhiễu sóng hài công suất được giữ kín trong phân hệ động lực.",
                "2. Nhánh nguồn điều khiển và đo lường tự chủ (Autonomous Control & Sensing Branch):",
                "Nhánh này sử dụng nguồn điện một chiều độc lập từ bình ắc quy 12V DC (dung lượng 12V - 7Ah hoặc 12Ah), đảm bảo hệ thống vi điều khiển luôn có nguồn nuôi tự chủ liên tục suốt 24/7 ngay cả khi mất điện lưới:",
                "- Mạch hạ áp LM2596 #1 (có tích hợp đồng hồ LED báo điện áp): Hạ áp từ 12V bình acquy xuống 5.0V chuẩn, cấp nguồn nuôi sạch cho vi điều khiển ESP32-S3 #1 (Master Tracker), cảm biến INA226, RTC DS3231 và bo cảm biến quang TEMT6000.",
                "- Mạch hạ áp LM2596 #2 (có tích hợp đồng hồ LED báo điện áp): Cấp nguồn 5.0V nuôi vi điều khiển ESP32-S3 #2 (Node Voc/Isc) và nuôi cuộn hút của cụm 6 Relay thông qua tiếp điểm Relay K6 (kích hoạt từ GPIO 5 của ESP1). Vào ban đêm, ESP1 tự động ngắt nguồn cấp cho ESP2 để đưa toàn bộ khối đo kiểm vào chế độ ngủ không tải, tiết kiệm triệt để dung lượng bình ắc quy.",
                "- Tiếp điểm Relay K5: Đóng nối trực tiếp nguồn 12V từ ắc quy sang bóng đèn sợi đốt 12V để kích hoạt chu trình xả tải năng lượng ban đêm khi cần kiểm tra dung lượng xả sâu của hệ thống lưu trữ.",
                "Hai nhánh nguồn chỉ liên kết với nhau qua các bộ cách ly quang học (Optocouplers) bên trong driver DM556 và dây nối đất tín hiệu (Signal GND) được quy hoạch đấu nối theo cấu trúc sao (Star Topology Grounding) trên bo mạch PCB, triệt tiêu hoàn toàn các vòng lặp mass (Ground Loops)."
            ]
        },
        {
            "level": 3,
            "title": "Thiết kế sơ đồ nguyên lý và mạch in điều khiển trung tâm",
            "paragraphs": [
                "Trong các nghiên cứu trước đây (như đồ án tham khảo [D1]), các module điện tử thường được nối với nhau bằng các bó dây cắm đực - cái rời rạc trên breadboard hoặc hàn nối tự do. Cách thức này bộc lộ những nhược điểm chí mạng khi triển khai dài hạn ngoài trời: mối nối cơ học dễ bị oxy hóa bởi độ ẩm không khí, dây tín hiệu dài đóng vai trò như các ăng-ten thu nhận sóng nhiễu điện từ, và độ rung lắc cơ khí dễ làm tuột chân tiếp xúc dẫn đến mất tín hiệu điều khiển.",
                "Để đảm bảo tính chuyên nghiệp, độ bền công nghiệp và độ tin cậy tuyệt đối, toàn bộ hệ thống phần cứng điều khiển và đo lường của đề tài đã được thiết kế hoàn chỉnh thành mạch in điều khiển trung tâm (PCB All-In-One) trên phần mềm thiết kế chuyên dụng KiCad EDA 8.0.",
                "1. Kiến trúc phân bổ linh kiện trên mạch in điều khiển trung tâm:",
                "Mạch in có kích thước chuẩn công nghiệp 2 lớp (2-layer FR4, độ dày đồng 1 oz), tích hợp toàn bộ các linh kiện cốt lõi:",
                "- Hai hàng rào cắm cái (Female Pin Headers) 22-pin dành riêng để cắm trực tiếp 2 vi điều khiển ESP32-S3 DevKitC-1, cho phép dễ dàng tháo lắp nâng cấp hoặc thay thế khi cần.",
                "- Cụm cọc đấu dây bắt vít chất lượng cao (Screw Terminal Blocks 5.08mm) được bố trí khoa học dọc theo các mép biên của mạch in để kết nối ra các thiết bị ngoại vi ngoài vỏ tủ: cọc tín hiệu PUL/DIR động cơ, cọc xung Encoder A/B, cọc công tắc hành trình, cọc nguồn 12V tổ ong và 12V ắc quy.",
                "- Vị trí hàn chân cắm sẵn cho cụm module Relay 6 kênh, 2 module INA226 (được cấu hình địa chỉ I2C khác nhau qua chân cầu chì A0: INA1 = 0x40, INA2 = 0x41), 2 module cảm biến dòng ACS712, 2 module chia áp FZ0430, module RTC DS3231 và 3 khối hạ áp DC-DC (2 LM2596 và 1 Mini560 PRO).",
                "2. Mạch in phụ cảm biến quang 4 hướng (Optical Sensor Board):",
                "Một mạch in phụ riêng biệt (kích thước nhỏ gọn 45 mm × 45 mm) được thiết kế để đặt 4 cảm biến quang TEMT6000 ở 4 cạnh vuông góc. Mặt trên của mạch in phụ có rãnh hàn để cố định vách ngăn chữ thập tạo bóng đổ bằng mica đen mờ, đảm bảo độ nhạy góc hướng nắng đồng đều ở cả 4 góc phần tư.",
                "3. Giải pháp thiết kế mạch in chống nhiễu và toàn vẹn tín hiệu (Signal Integrity & EMC):",
                "Toàn bộ bề mặt lớp dưới (Bottom Layer) và các vùng trống lớp trên (Top Layer) được phủ một mặt phẳng đồng nối đất liên tục (Solid Ground Plane). Các đường mạch tín hiệu analog độ nhạy cao (ADC1 cảm biến quang và điện áp Shunt INA226) được đi dây ngắn nhất có thể, tránh xa các đường dẫn xung bước tần số cao của driver động cơ. Hàng trăm lỗ thông tầng nối mass (Ground Stitching Vias) được phân bố dày đặc với khoảng cách dưới 5 mm bao quanh các vùng chuyển mạch để triệt tiêu bức xạ điện từ cao tần.",
                "Quy trình kiểm tra luật thiết kế (DRC - Design Rule Check) trên KiCad đã được chạy tự động qua kịch bản kiểm thử độc lập, xác nhận mạch in đạt 0 lỗi hở mạch (Unconnected nets = 0), 0 lỗi vi phạm khoảng cách cách điện (Clearance violations = 0) và đáp ứng hoàn hảo các tiêu chuẩn chế tạo công nghiệp IPC-2221.",
                "Ghi chú: Toàn bộ hồ sơ thiết kế mạch in PCB (Schematic, Layout, Gerber, Pick-and-Place, Drill) đã được nhóm hoàn thiện ở mức sẵn sàng gia công công nghiệp 100%. Tuy nhiên, trong khuôn khổ thời gian thực nghiệm cấp bách của đề tài, nhóm quyết định không gửi in gia công nhà máy mà sử dụng mô hình kết nối trạm đấu dây công nghiệp kiên cố theo đúng sơ đồ ánh xạ chân chuẩn xác này để ưu tiên thời gian cho chiến dịch thu thập số liệu đối chứng liên tục 30 ngày đêm ngoài trời."
            ],
            "figures": [
                {
                    "path": "scratch/schematic_page_1.png",
                    "caption": "Hình 3.1: Sơ đồ nguyên lý mạch in điều khiển trung tâm trên KiCad",
                    "width": 5.2
                },
                {
                    "path": "scratch/sensor_schematic_page_1.png",
                    "caption": "Hình 3.2: Sơ đồ nguyên lý mạch cảm biến quang vi sai 4 hướng",
                    "width": 4.6
                },
                {
                    "path": "hardware/solar_tracker_mainboard/pcb_render_iso.png",
                    "caption": "Hình 3.3: Phối cảnh 3D mạch in điều khiển trung tâm",
                    "width": 4.8
                },
                {
                    "path": "hardware/solar_tracker_mainboard/pcb_render_top.png",
                    "caption": "Hình 3.4: Bố trí linh kiện và cọc đấu dây trên mạch in",
                    "width": 4.8
                }
            ]
        },
        {
            "level": 3,
            "title": "Thiết kế hệ thống đo kiểm Voc, Isc và nhiệt độ tấm pin",
            "paragraphs": [
                "Bám sát quy chuẩn đo đạc thực nghiệm khoa học quốc tế của tạp chí MDPI Sustainability (Ponce-Jara et al., 2022) [5], hệ thống xây dựng một phân hệ đo kiểm chuyên biệt độc lập với chu trình bám trục nhằm ghi nhận đặc tính quang điện thực tế của cả hai tấm pin (tấm bám trục 2 trục và tấm pin cố định).",
                "1. Sơ đồ mạch chuyển mạch rơ-le và nguyên lý đo tuần tự:",
                "Khối chuyển mạch bao gồm cụm 6 Relay được điều khiển đóng ngắt theo máy trạng thái thời gian thực (State Machine) bởi vi điều khiển ESP32-S3 #2, được cấu hình chức năng như sau:",
                "- Relay K1 & K2 (Tải / Hở mạch Voc): Được điều khiển qua chân GPIO 38 (tín hiệu RL_CUT_38). Ở trạng thái đóng bình thường (Normally Closed), hai tấm pin được nối trực tiếp vào mạch sạc tải tiêu thụ để phát điện liên tục. Khi chu kỳ đo kích hoạt, vi điều khiển kích mở tiếp điểm Relay để ngắt hoàn toàn mạch tải ngoài trong khoảng thời gian siêu ngắn 250ms. Ngay tại thời điểm mạch hở, điện áp hai đầu cực tấm pin chính là điện áp hở mạch Voc, được đưa qua mạch cầu chia áp FZ0430 (tỉ lệ suy giảm 5:1, gồm điện trở chính xác R1 = 30 kΩ và R2 = 7.5 kΩ) để đưa điện áp từ dải 0 - 25V về dải 0 - 3.3V đọc bởi bộ chuyển đổi ADC1 12-bit.",
                "- Relay K3 & K4 (Ngắn mạch đo Isc): Sau khi hoàn tất phép đo Voc, vi điều khiển duy trì ngắt tải và kích hoạt đóng tiếp điểm Relay K3 qua chân GPIO 41 (cho tấm Tracking) và Relay K4 qua chân GPIO 39 (cho tấm Static) trong một xung cực ngắn chính xác 50ms. Tiếp điểm này nối tắt trực tiếp hai cực của tấm pin đi xuyên qua lõi dây dẫn của cảm biến dòng Hall tuyến tính ACS712-05B (độ nhạy 185 mV/A, dải đo ±5A). Điện áp analog xuất ra từ chân VOUT của ACS712 được ADC1 lấy mẫu trung bình 32 lần để xác định chính xác dòng điện ngắn mạch Isc.",
                "- Ngay sau khi đọc xong Isc, vi điều khiển lập tức nhả Relay K3, K4 và đóng lại Relay K1, K2 sau 50ms chống hồ quang tiếp điểm. Toàn bộ chu trình đo chỉ diễn ra trong tổng thời gian dưới 350ms, chiếm chưa đầy 3.5% chu kỳ đo (10 giây/lần), do đó giữ nguyên hơn 99.5% thời gian phát điện liên tục cho hệ thống.",
                "2. Thu thập nhiệt độ bề mặt tấm pin bằng cảm biến số DS18B20:",
                "Nhiệt độ là tác nhân vật lý hàng đầu làm suy giảm điện áp Voc và hiệu suất chuyển đổi quang năng của pin mặt trời [1], [5]. Để giám sát yếu tố này, hai đầu dò cảm biến nhiệt độ kỹ thuật số bọc inox chống nước DS18B20 được gắn chặt tiếp xúc trực tiếp vào chính giữa mặt lưng của tấm pin Tracking (qua chân GPIO 15) và tấm pin Static (qua chân GPIO 16) bằng keo dẫn nhiệt chuyên dụng Silicone Heatsink. Cảm biến giao tiếp với ESP32-S3 #2 qua chuẩn 1-Wire độc lập cho từng kênh, cho độ phân giải nhiệt độ 12-bit (bước nhảy 0.0625°C) và độ chính xác ±0.5°C trong dải nhiệt độ từ -10°C đến +85°C.",
                "Dữ liệu Voc, Isc và nhiệt độ mặt lưng sau đó được ESP32-S3 #2 đóng gói dạng chuỗi JSON và truyền sang vi điều khiển ESP32-S3 #1 qua giao tiếp nối tiếp UART hoặc đồng bộ trực tiếp lên node `/solar/telemetry/voc_isc` trên Firebase RTDB."
            ],
            "table_caption": "Bảng 3.2: Trạng thái đóng ngắt của cụm 6 Relay trong các pha vận hành của hệ thống",
            "table_headers": ["Pha hoạt động", "Relay K1/K2 (Tải Voc)", "Relay K3 (Trk Isc)", "Relay K4 (Sta Isc)", "Relay K5 (Night Lamp)", "Relay K6 (Sleep Power)"],
            "table_rows": [
                ["Phát điện bình thường", "ĐÓNG (Nối tải)", "NGẮT (Hở mạch)", "NGẮT (Hở mạch)", "NGẮT (Tắt đèn)", "ĐÓNG (Nuôi ESP2)"],
                ["Đo điện áp Voc (250ms)", "NGẮT (Hở mạch)", "NGẮT (Hở mạch)", "NGẮT (Hở mạch)", "NGẮT (Tắt đèn)", "ĐÓNG (Nuôi ESP2)"],
                ["Đo dòng ngắn mạch Isc (50ms)", "NGẮT (Hở mạch)", "ĐÓNG (Nối tắt)", "ĐÓNG (Nối tắt)", "NGẮT (Tắt đèn)", "ĐÓNG (Nuôi ESP2)"],
                ["Xả tải ban đêm (Night Discharge)", "NGẮT", "NGẮT", "NGẮT", "ĐÓNG (Bật đèn 12V)", "ĐÓNG (Nuôi ESP2)"],
                ["Chế độ ngủ đêm tiết kiệm điện", "NGẮT", "NGẮT", "NGẮT", "NGẮT", "NGẮT (Cắt nguồn ESP2)"]
            ]
        },
        {
            "level": 3,
            "title": "Xây dựng thuật toán điều khiển và phần mềm nhúng vi điều khiển",
            "paragraphs": [
                "Phần mềm nhúng của vi điều khiển ESP32-S3 #1 được viết trên nền tảng PlatformIO IDE sử dụng ngôn ngữ C++ hướng đối tượng. Firmware được thiết kế theo kiến trúc máy trạng thái hữu hạn phi chặn (Non-blocking Finite State Machine - FSM) điều phối hoàn toàn qua hàm thời gian hệ thống `millis()`, tuyệt đối không sử dụng hàm tạm dừng `delay()` nhằm đảm bảo đáp ứng thời gian thực tức thì cho mọi vòng lặp điều khiển [3].",
                "1. Điều khiển chuyển động phát xung S-Curve mượt mà qua thư viện FastAccelStepper:",
                "Để triệt tiêu lực giật cơ học (Jerk) và bảo vệ cơ cấu ổ bi của giàn quay, firmware tích hợp thư viện cấp thấp FastAccelStepper. Khác với biên dạng gia tốc hình thang thông thường (vốn có sự thay đổi gia tốc đột ngột tại điểm bắt đầu và kết thúc làm rung khung giàn), FastAccelStepper tạo ra biên dạng vận tốc hình cong chữ S (S-Curve Profile) thông qua việc điều khiển gia tốc biến thiên liên tục. Các xung bước được tạo trực tiếp bằng bộ định thời phần cứng chuyên dụng RMT/MCPWM của ESP32-S3 với tần số lên tới hàng chục kHz, giúp động cơ NEMA 23 tăng tốc và giảm tốc cực kỳ êm ái, loại bỏ hoàn toàn tiếng ồn rít cơ khí và hiện tượng rung giật.",
                "2. Thuật toán lai ghép bám mặt trời hai chế độ (Hybrid Dual-Mode Tracking):",
                "Hệ thống vận hành linh hoạt dựa trên sự kết hợp giữa thuật toán thiên văn học NOAA và thuật toán bám quang vi sai thích nghi Fuzzy-PID:",
                "- Chế độ bám thiên văn lý thuyết (Astronomical Mode): Dựa trên đồng hồ thời gian thực RTC DS3231 và tọa độ địa lý TP.HCM, firmware tính toán góc phương vị mục tiêu (Target Azimuth) và góc ngửa mục tiêu (Target Elevation) sau mỗi chu kỳ 5 phút. Khi phát hiện cường độ ánh sáng môi trường xuống dưới ngưỡng khả dụng (ví dụ trời nhiều mây đen, giông bão hoặc chập tối), hệ thống tự động chuyển sang chế độ thiên văn, điều khiển giàn pin xoay theo vị trí tính toán của mô hình NOAA. Phương trình tính toán giải mã góc phương vị từ hướng Bắc thật (0°) được giải quyết triệt để vấn đề nhập nhằng cung phần tư thông qua hàm toán học atan2(y_az, x_az) [6]. Nhờ đó, tấm pin không bị hiện tượng bám đuổi theo các quầng sáng tán xạ giả giữa các đám mây.",
                "- Chế độ bám quang vi sai thích nghi (Optical Differential Tracking): Khi cường độ ánh sáng mặt trời vượt qua ngưỡng sáng hoạt động (G_lux > 150 Lux) và độ chênh lệch giữa các cảm biến TEMT6000 rõ rệt, hệ thống kích hoạt bộ điều khiển mờ lai Fuzzy-PID. Sai số điện áp quang vi sai được chuẩn hóa khử phụ thuộc cường độ sáng tuyệt đối theo công thức e_az = (V_right - V_left) / (V_right + V_left) và e_el = (V_top - V_bottom) / (V_top + V_bottom). Tín hiệu sai số được đưa qua bộ luật mờ 49 luật (hoặc cấu trúc 3 vùng Sugeno phản ứng nhanh trên vi điều khiển) để tinh chỉnh độ lợi PID thích nghi. Giải thuật bầy đàn PSO đã tối ưu hóa bộ trọng số, giúp hệ thống nhanh chóng đưa tấm pin đạt tới trạng thái cân bằng vuông góc tuyệt đối với sai số bám quang học dưới ±0.5°.",
                "3. Cơ chế định vị gốc (Homing) và Giới hạn mềm an toàn (Soft Limits):",
                "Khi mới khởi động nguồn, hệ thống tự động thực hiện quy trình Homing hai giai đoạn (chạy nhanh 1.500Hz tìm cữ, lùi 1.000 xung và tiếp cận chậm 200Hz để xác định gốc với độ lặp lại dưới 1 xung). Từ vị trí gốc, một vùng bảo vệ phần mềm (Soft Limits) được kích hoạt liên tục trong firmware: Trục Azimuth chỉ được phép quay trong dải an toàn từ 0.0° đến 270.0° (ngăn ngừa xoắn đứt cáp động cơ), và Trục Elevation từ 25.0° đến 90.0° (chống va đập cơ khí với giàn đỡ chân đế). Bất kỳ lệnh điều khiển thủ công hay lỗi cảm biến nào yêu cầu góc quay vượt ngoài dải này đều bị firmware từ chối ngay lập tức."
            ]
        },
        {
            "level": 3,
            "title": "Thiết kế giao diện giám sát IoT Web Dashboard và mô hình Digital Twin",
            "paragraphs": [
                "Hệ thống IoT được xây dựng theo mô hình kiến trúc ba tầng: Thiết bị biên (ESP32-S3) - Đám mây trung gian (Google Firebase) - Ứng dụng người dùng (Web Dashboard) [3].",
                "1. Kết nối truyền thông đám mây Google Firebase Realtime Database:",
                "Toàn bộ dữ liệu đo đạc thời gian thực từ hai vi điều khiển được gửi lên máy chủ Google Firebase Realtime Database qua giao thức bảo mật WebSockets / HTTPS REST API. Cấu trúc cây dữ liệu được chuẩn hóa rõ ràng:",
                "- `/solar/tracking`: Lưu trữ các thông số động của giàn pin 2 trục (Góc phương vị thực tế, góc ngửa thực tế, góc mục tiêu, điện áp, dòng điện, công suất, năng lượng tích lũy Wh).",
                "- `/solar/static`: Lưu trữ các thông số điện của tấm pin lắp cố định đối chứng.",
                "- `/solar/telemetry`: Lưu trữ trạng thái ngoại vi, nhiệt độ chip, nhiệt độ môi trường, trạng thái máy trạng thái FSM, mã lỗi cảnh báo và dữ liệu Voc, Isc.",
                "- `/solar/control`: Tiếp nhận các lệnh điều khiển từ xa từ người quản trị (Chuyển chế độ Auto/Manual, Jogging góc quay, kích hoạt Homing, nút dừng khẩn cấp E-Stop).",
                "2. Giao diện Web Dashboard trực quan tích hợp mô hình Song sinh số 3D (Three.js Digital Twin):",
                "Giao diện giám sát được phát triển bằng ngôn ngữ JavaScript hiện đại trên nền thư viện React 19 và công cụ đóng gói Vite. Dashboard sở hữu các tính năng ưu việt:",
                "- Mô hình Song sinh số 3D (3D Digital Twin): Ứng dụng thư viện đồ họa không gian ba chiều Three.js và WebGL để dựng lại mô hình kỹ thuật số chính xác của giàn pin mặt trời hai trục. Khi động cơ xoay góc thực tế ngoài công trường, dữ liệu góc từ Encoder gửi lên Firebase sẽ ngay lập tức làm xoay mô hình 3D trên màn hình trình duyệt theo thời gian thực, cho phép người vận hành quan sát trực quan tư thế của giàn pin từ bất kỳ đâu qua mạng Internet.",
                "- Hệ thống biểu đồ động (Chart.js): Vẽ song song các đường đặc tuyến công suất (P_trk vs P_sta), năng lượng tích lũy (Wh_trk vs Wh_sta), điện áp và dòng điện của hai tấm pin. Người dùng có thể đối chiếu trực tiếp phần trăm năng lượng gia tăng (Gain %) của giàn bám trục so với giàn cố định.",
                "- Tab quản lý và truy xuất dữ liệu lịch sử: Cho phép xem lại lịch sử đo đạc 30 ngày, lọc dữ liệu theo ngày tháng và xuất toàn bộ cơ sở dữ liệu ra định dạng tệp chuẩn CSV hoặc JSON để phục vụ phân tích khoa học chuyên sâu.",
                "3. Kiến trúc bảo mật đa tầng (Defense-in-Depth) và Hàng đợi ngoại tuyến (OfflineQueue):",
                "Hệ thống triển khai cơ chế an toàn thông tin nghiêm ngặt: Quy tắc Firebase Security Rules phân quyền chặt chẽ (Người dùng công cộng chỉ có quyền xem Read-Only; vi điều khiển ESP32-S3 bắt buộc phải xác thực mã Token định danh JWT; chỉ tài khoản Quản trị viên Admin đăng nhập mới có quyền ghi lệnh can thiệp cơ cấu quay).",
                "Đặc biệt, firmware tích hợp module hàng đợi ngoại tuyến `OfflineQueue`: khi đường truyền Wi-Fi bị đứt quãng hoặc mất kết nối Internet, toàn bộ các bản ghi đo đạc định kỳ sẽ tự động được ghi lưu vào một vùng nhớ Flash NVS cục bộ trên ESP32-S3 theo cơ chế xoay vòng. Ngay khi Wi-Fi được khôi phục, hệ thống tự động kích hoạt tiến trình đẩy bù dữ liệu (Batch Sync) lên Firebase mà không làm mất mát bất kỳ điểm đo khoa học nào."
            ]
        }
    ]
}

print("content_chapter3.py updated successfully.")
