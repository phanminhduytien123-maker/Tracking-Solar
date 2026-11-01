# KẾ HOẠCH & TIẾN ĐỘ THỰC HIỆN CÁC PHASE THUẬT TOÁN ĐIỀU KHIỂN SOLAR TRACKER 2 TRỤC

Tài liệu này theo dõi chi tiết toàn bộ lộ trình từ gốc đến ngọn của hệ thống điều khiển thông minh pin mặt trời 2 trục (ESP32-S3 + DM556 + NEMA23 + Encoder 3806 + TEMT6000 + DS3231 + INA226).

---

## TỔNG QUAN TIẾN ĐỘ DỰ ÁN

| Tổng số Phase | Đã hoàn thành | Đang chờ triển khai | Tỷ lệ hoàn thành |
| :---: | :---: | :---: | :---: |
| **11 Phase** (0 $\to$ 10) | **5 Phase** (Phase 0, 1, 2, 5, 6 bench test) | **6 Phase** (Cơ khí khung, Homing switch, Closed-loop PCNT) | **~50%** |

```
[██████████░░░░░░░░░░] 5 / 11 Phase (45.5% - Đã Test Bench Thành Công)
```

---

## CHI TIẾT TIẾN ĐỘ TỪNG PHASE

### [HOÀN THÀNH 100%] Phase 0: Chốt ký hiệu, đơn vị, quy ước, kiến trúc
* **Mục tiêu**: Thiết lập hệ quy chuẩn toán học, hệ tọa độ 2 trục, bảng ký hiệu A-Z, Z2, cấu trúc thư mục PlatformIO, và các giao diện trừu tượng HAL, TelemetrySink, CommandSource.
* **Các kết quả chính**:
  * Chốt hệ tọa độ thiên văn ($az_{sun}, el_{sun}$) và góc tấm ($\phi, \varepsilon$).
  * Đính chính cơ khí cốt tử: Tấm không thể dựng thẳng đứng $\varepsilon = 0^\circ$ vì va chạm trục Z $\implies$ Bổ sung cận an toàn $L = 25.0^\circ$.
  * Định nghĩa cơ chế mốc HOME trục Elevation ($J = 90.0^\circ$) tune bằng công tắc hành trình kết hợp số xung Encoder.
  * Tách biệt 100% logic thuần C++17 khỏi phần cứng vi điều khiển và mạng.
* **Tài liệu & Mã nguồn**:
  * [solar_config.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/solar_config.h) & [solar_config.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/solar_config.py)
  * [solar_types.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/solar_types.h) & [solar_types.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/solar_types.py)
  * [solar_interfaces.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/solar_interfaces.h) (`ITelemetrySink`, `ICommandSource`)
  * [hal_interfaces.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/hal_interfaces.h) (Giao diện trừu tượng phần cứng)
  * [platformio.ini](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/platformio.ini) (Cấu hình môi trường ESP-IDF và Native)
  * [DANH_SACH_HANG_SO_VA_THAM_SO_CAN_DO.md](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/DANH_SACH_HANG_SO_VA_THAM_SO_CAN_DO.md)

---

### [HOÀN THÀNH 100%] Phase 1: Hình học mặt trời $\to$ Góc mục tiêu 2 trục
* **Mục tiêu**: Cài đặt thuật toán thiên văn NOAA (Julian Day, EoT, Declination, Hour Angle, Azimuth, Elevation, Bù khúc xạ, Sunrise/Sunset), chuyển đổi góc tấm pin $\phi_{ff}, \varepsilon_{ff}$, kẹp an toàn giới hạn mềm và tính giờ báo thức $t_{wake}$.
* **Các kết quả chính**:
  * Thuật toán NOAA C++ và Python khớp nhau $100\%$ (sai số $< 0.01^\circ$).
  * Phân tích hành trình Azimuth cả năm tại TP.HCM: Hướng mọc dao động $65.9^\circ \to 113.7^\circ$, hướng lặn dao động $246.3^\circ \to 294.0^\circ$. Đặt công tắc HOME $G = 45.0^\circ$ là tối ưu tuyệt đối, hành trình lớn nhất trong ngày $= 228.1^\circ < I = 270.0^\circ$ (bảo vệ cáp an toàn).
  * Xử lý vùng kỳ dị gần thiên đỉnh ($el_{sun} \ge 88.0^\circ$): Tự động phát hiện và khóa trục Azimuth để tránh động cơ quay cuồng vô ích khi tấm nằm ngang.
  * Tính giờ báo thức DS3231 tự động: $t_{wake} = \max(03:00, \text{Sunrise} - 30\text{ phút})$.
  * Kiểm thử biên dịch C++ bằng trình biên dịch Xtensa ESP32-S3 với `-Werror` đạt 0 cảnh báo, 0 lỗi.
* **Tài liệu & Mã nguồn**:
  * [solar_ephemeris.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/lib/solar_core/solar_ephemeris.h) & [solar_ephemeris.cpp](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/lib/solar_core/solar_ephemeris.cpp)
  * [solar_geometry.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/lib/solar_core/solar_geometry.h) & [solar_geometry.cpp](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/lib/solar_core/solar_geometry.cpp)
  * [solar_ephemeris.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/solar_ephemeris.py) & [solar_geometry.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/solar_geometry.py)
  * [test_phase1.cpp](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/test/test_phase1.cpp) & [test_solar_validation.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/test_solar_validation.py)

---

### [ĐÃ TEST BENCH THỰC TẾ 100%] Phase 2: Cảm biến Quang 3 chân S-V-G & Thuật toán Chuẩn hóa
* **Mục tiêu & Kết quả thực nghiệm**:
  * Đọc 4 cảm biến quang trở (ADC1 Pins: Top=34, Bottom=35, Left=32, Right=33).
  * Kỹ thuật Oversampling 16 mẫu chống nhiễu bóng đèn 50Hz/100Hz.
  * Chuẩn hóa sai số quang học: $e_{s,az} = (L-R)/(L+R)$ và $e_{s,el} = (T-B)/(T+B)$.
  * Xác định vùng chết (Deadband $\pm 0.04$) giúp động cơ dừng êm khi rọi đèn vào giữa.
  * Tự động cân bằng Zero Offset (Calibrate) qua phím tắt Serial `C`.
  * Đẩy dữ liệu thời gian thực lên Web Render [https://tracking-solar.onrender.com/](https://tracking-solar.onrender.com/) hiển thị ma trận LDR và tâm sáng Sun Centroid.

---

### [CHƯA BẮT ĐẦU] Phase 3: Quy đổi xung, Encoder & Giới hạn chuyển động
* **Mục tiêu**:
  * Công thức tính $K_{pulse} = E \cdot C / 360^\circ$ và $K_{enc} = 4 \cdot F \cdot C / 360^\circ$.
  * Phát hiện mất bước thời gian thực (so lệch xung phát RMT và xung đếm PCNT Hardware).
  * Quy trình Homing 2 pha (chạm nhanh $\to$ lùi ra $\to$ chạm chậm) đảm bảo lặp lại mốc 0.
  * Giới hạn mềm và tính thời gian quay tối đa chống kẹt cơ.

---

### [CHƯA BẮT ĐẦU] Phase 4: Mô hình động học cơ điện (Mô phỏng & PSO)
* **Mục tiêu**:
  * Mô hình hóa động cơ bước NEMA23, đường cong mô-men - tốc độ.
  * Mô hình dây đai đàn hồi độ cứng $P$, độ rơ cơ khí $Q$, quán tính quy đổi $M, N$, ma sát $O$, tải gió $R$.
  * Đánh giá khả năng giữ tấm chống trôi gió ở chế độ half-current ($S \cdot C > R$).
  * Rời rạc hóa bước tích phân cố định ổn định số phục vụ mô phỏng trong RAM của ESP32.

---

### [ĐÃ TEST BENCH THỰC TẾ 100%] Phase 5: Fuzzy-PID vòng trong điều khiển động cơ
* **Mục tiêu & Kết quả thực nghiệm**:
  * Cài đặt bộ suy luận mờ thích nghi Sugeno/Zhao-Tomizuka tự chỉnh $\Delta K_p, \Delta K_i, \Delta K_d$.
  * Vòng lặp điều khiển vòng trong 25ms (40Hz) phát xung vi bước cho 2 động cơ NEMA 23 + DM556.
  * **Hành vi thực nghiệm**: 
    - Giơ đèn Flash sang Trái $\to$ ĐC 1 quay Trái đuổi theo đèn; rọi sang Phải $\to$ ĐC 1 quay Phải.
    - Giơ đèn Flash lên Trên $\to$ ĐC 2 nâng Lên; rọi xuống Dưới $\to$ ĐC 2 hạ Xuống.
    - Rọi ở giữa $\to$ lọt vùng chết $|e| \le 0.04 \implies$ dừng êm ái, triệt tiêu hiện tượng giật rung.
  * Hỗ trợ phím tắt Serial đảo chiều tức thời `i` (Azimuth) và `k` (Elevation).

---

### [ĐÃ TEST BENCH THỰC TẾ 100%] Phase 6: Tối ưu hóa bầy đàn (PSO) Online trên RAM
* **Mục tiêu & Kết quả thực nghiệm**:
  * Thuật toán PSO tối ưu hóa vector tham số $[K_p, K_i, K_d]_{\text{base}}$ trực tiếp trong RAM của ESP32.
  * Kích thước bầy: 10 hạt, 20 vòng lặp, chạy trong $\sim 45\text{ ms}$, đạt hàm chi phí $J \approx 0.038$.
  * Trạng thái bầy đàn được cập nhật đồng bộ lên Web Render: `CONVERGED`, hiển thị đầy đủ Cost $J$ và bộ tham số thích nghi.

---

### [CHƯA BẮT ĐẦU] Phase 7: Máy trạng thái hữu hạn hệ thống (Finite State Machine)
* **Mục tiêu**:
  * Chu trình chuyển trạng thái: `BOOT` $\to$ `HOMING` (El trước, Az sau) $\to$ `IDLE` $\to$ `SENSE` $\to$ `DECIDE` $\to$ `PSO` $\to$ `MOVE` $\to$ `SETTLE` $\to$ `LOG` $\to$ `IDLE`.
  * Chu trình ban đêm: `PARK` (El về $90^\circ$, Az về HOME) $\to$ `PREP_SLEEP` (NVS + RTC RAM, gpio_hold) $\to$ `DEEP_SLEEP` $\to$ `DAWN_POLL`.
  * Cửa sổ ngủ đêm cứng 19:00 $\to$ 03:00 (chỉ thức vì RTC ngắt hoặc E-Stop, cảm biến không có quyền đánh thức).
  * Xử lý RTC mất nguồn, watchdog phần cứng, chống mòn bộ nhớ Flash NVS.

---

### [CHƯA BẮT ĐẦU] Phase 8: Xử lý lỗi toàn diện & Quy tắc ngày lỗi
* **Mục tiêu**:
  * Bảng ánh xạ lỗi $\to$ hành động an toàn: Mất bước, chạm switch ngoài ý muốn, vượt giới hạn mềm, quá thời gian quay, E-Stop, ắc quy yếu, RTC lệch, ADC bất thường, encoder glitch.
  * **Quy tắc ngày lỗi nghiêm trọng**: Tự động đánh dấu cờ `SEVERE_DATA_INVALID` để loại CẢ HAI tấm (tấm xoay và tấm cố định) khỏi thống kê năng lượng 30 ngày, đảm bảo tính khách quan khoa học.

---

### [CHƯA BẮT ĐẦU] Phase 9: Cấu trúc Telemetry & Logging
* **Mục tiêu**:
  * Hoàn thiện struct `TelemetryPacket` chứa toàn bộ dữ liệu thô và đã xử lý của từng chu kỳ bám.
  * Đóng gói và đẩy sang `ITelemetrySink` (không làm code mạng).
  * Nhận và giải mã lệnh điều khiển từ `ICommandSource`.

---

### [CHƯA BẮT ĐẦU] Phase 10: Kiểm thử toàn diện & Nghiệm thu
* **Mục tiêu**:
  * Unit test toàn bộ các hàm thuần trên PC (`pio test -e native`).
  * Mô phỏng ngày đầy đủ 24 giờ với mô hình cơ điện Phase 4: trời quang, mây ngắt quãng, gió giật, mất bước, TEMT bão hòa, RTC lệch.
  * So sánh định lượng 3 cấu hình: PID thuần vs Fuzzy-PID vs PSO-Fuzzy-PID (sai số RMS, vọt lố, thời gian quay, năng lượng tiêu thụ).
  * Kịch bản thí nghiệm bench thực tế: đo độ lặp lại công tắc, kiểm tra cực tính DIR, đo góc $J, L$, thử tải gió bằng quạt ở half-current.
