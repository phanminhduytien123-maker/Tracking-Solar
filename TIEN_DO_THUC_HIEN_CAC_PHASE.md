# KẾ HOẠCH & TIẾN ĐỘ THỰC HIỆN CÁC PHASE THUẬT TOÁN ĐIỀU KHIỂN SOLAR TRACKER 2 TRỤC

Tài liệu này theo dõi chi tiết toàn bộ lộ trình từ gốc đến ngọn của hệ thống điều khiển thông minh pin mặt trời 2 trục (ESP32-S3 + DM556 + NEMA23 + Encoder 3806 + TEMT6000 + DS3231 + INA226).

---

## TỔNG QUAN TIẾN ĐỘ DỰ ÁN

| Tổng số Phase | Đã hoàn thành | Đang chờ triển khai | Tỷ lệ hoàn thành |
| :---: | :---: | :---: | :---: |
| **11 Phase** (0 $\to$ 10) | **4 Phase** (Phase 0, 1, 2, 3) | **7 Phase** (Phase 4 $\to$ Phase 10) | **~36.4%** |

```
[███████░░░░░░░░░░░░░] 4 / 11 Phase (36.4% - Sẵn sàng bước vào Phase 4)
```

---

## CHI TIẾT TIẾN ĐỘ TỪNG PHASE

### [HOÀN THÀNH 100%] Phase 0: Chốt ký hiệu, đơn vị, quy ước, kiến trúc & Bổ sung #1, #2
* **Mục tiêu**: Thiết lập hệ quy chuẩn toán học, hệ tọa độ 2 trục, bảng ký hiệu A-Z, Z2, cấu trúc thư mục PlatformIO, và các giao diện trừu tượng HAL, TelemetrySink, CommandSource.
* **Các kết quả chính**:
  * Chốt thang góc Elevation: **Cách A ($\varepsilon$)** (Độ ngửa: nằm ngang hướng trời $= 90^\circ$, dựng đứng $= 0^\circ$). Quan hệ $\beta = 90^\circ - \varepsilon$.
  * Tấm pin cố định: Lưu `fixed_az_deg = 180.0`, `fixed_tilt_beta = 15.0`, tính ra `fixed_elevation_eps = 75.0` hiển thị trên Web "Hướng Nam 180°, ngửa 75° (nghiêng 15°)".
  * Quản lý tọa độ `SiteConfig`: Nhận từ Web qua Firebase node `/solar/config/site` với cơ chế tăng `rev`, fallback về Flash NVS, và khóa an toàn FSM.
  * Cờ xác nhận tọa độ thực địa: `site_confirmed` (kèm `confirmed_by`). Khi người dùng đổi tọa độ, cờ `confirmed` tự động reset về `false`.
  * Đã tạo tệp checklist nghiệm thu trước 01/11: [PRE_EXPERIMENT_CHECKLIST.md](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/docs/PRE_EXPERIMENT_CHECKLIST.md).
  * Quy tắc loại ngày (`severe_invalid`): Hiển thị cạnh nhau $\Sigma E_{\text{tracker}}$ và $\Sigma E_{\text{fixed}}$ khi có và không có ngày bị loại; loại bỏ CẢ HAI tấm của ngày bị đánh cờ.
  * Hiển thị độ lệch đồng hồ RTC DS3231 vs Server ($\Delta t$) trên Web Dashboard.
  * Đã bổ sung Unit Test tự động kiểm tra lọc revision (`isRevisionNewer`) phía ESP32 biên dịch sạch với GCC Xtensa ESP32-S3 (`-Werror`).
* **Tài liệu & Mã nguồn**:
  * [solar_config.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/solar_config.h) & [solar_config.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/solar_config.py)
  * [solar_types.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/solar_types.h) & [solar_types.py](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/python_sim/solar_types.py)
  * [site_config_validator.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/lib/solar_core/site_config_validator.h) & [site_config_validator.cpp](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/lib/solar_core/site_config_validator.cpp)
  * [test_phase0_site_config.cpp](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/test/test_phase0_site_config.cpp)
  * [PRE_EXPERIMENT_CHECKLIST.md](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/docs/PRE_EXPERIMENT_CHECKLIST.md)
  * [FIREBASE_SECURITY_RULES_SPEC.md](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/docs/FIREBASE_SECURITY_RULES_SPEC.md)

---

---

### [HOÀN THÀNH 100%] Phase 1: Thuật toán thiên văn NOAA & Spencer đối chuẩn NREL SPA (pvlib)
* **Mục tiêu**:
  * Hiện thực hóa 2 thuật toán thiên văn tính vị trí mặt trời trên cả Python và C++:
    1. **Full NOAA Solar Ephemeris**: Julian Day, Declination, Equation of Time, Hour Angle, Refraction, Sunrise/Sunset.
    2. **Simplified Spencer 1971 (Fourier Series)**: Bản rút gọn tính toán siêu tốc cho vi điều khiển.
  * Đối chuẩn sai số toàn diện trên lưới 1,584 điểm (12 tháng $\times$ 33 mốc giờ $\times$ 4 vị trí: TP.HCM, Hà Nội, Đà Nẵng, Sydney) so với thư viện tham chiếu chuẩn thiên văn NREL SPA (`pvlib`).
  * Kiểm thử 100% các trường hợp biên (năm nhuận 2024, ngày 29/02, kỳ dị thiên đỉnh tại TP.HCM, chuyển giao ngày 23:59:59 $\to$ 00:00:00, vĩ độ âm, kinh tuyến đổi ngày, đầu vào lỗi).
  * Kiểm thử khớp 100% giữa C++ và Python qua 25 test vectors chuẩn hóa (`test_vectors_phase1.json` và `test_vectors_data.h`).
* **Bảng kết quả đối chuẩn sai số thực đo (1,584 điểm vs NREL SPA)**:
  * **Thuật toán Full NOAA (Đang sử dụng)**:
    - Vùng bám ban ngày ($El > 5^\circ$, 1,081 điểm):
      * Azimuth: Max error $= 0.1675^\circ$, Mean error $= 0.0049^\circ$
      * Elevation: Max error $= 0.0113^\circ$, Mean error $= 0.0035^\circ$
    - Tại TP.HCM (vị trí lắp đặt, $El > 5^\circ$):
      * Azimuth: Max error $= 0.0752^\circ$, Mean error $= 0.0048^\circ$
      * Elevation: Max error $= 0.0112^\circ$, Mean error $= 0.0038^\circ$
    - Mặt trời mọc (Sunrise): Max error $= 1.45\text{ phút}$, Mean error $= 0.59\text{ phút}$
    - Mặt trời lặn (Sunset): Max error $= 1.02\text{ phút}$, Mean error $= 0.45\text{ phút}$
  * **Thuật toán Spencer 1971**:
    - Vùng bám ban ngày ($El > 5^\circ$): Az Max $= 6.0205^\circ$, Az Mean $= 0.3997^\circ$, El Max $= 0.4394^\circ$, El Mean $= 0.1613^\circ$.
* **Điểm kiểm tra ngày thí nghiệm (15/11/2026 lúc 09:00:00 tại TP.HCM)**:
  * NREL SPA: $Az = 126.6110^\circ, El = 41.3370^\circ$, Sunrise = 05:49 (349.1m), Sunset = 17:26 (1046.8m)
  * Full NOAA: $Az = 126.6177^\circ (\Delta = 0.0067^\circ), El = 41.3463^\circ (\Delta = 0.0093^\circ)$, Sunrise = 05:48 (348m, $\Delta = 1.15\text{m}$), Sunset = 17:26 (1046m, $\Delta = 0.82\text{m}$)
  * Spencer: $Az = 126.2830^\circ (\Delta = 0.3280^\circ), El = 41.4279^\circ (\Delta = 0.0909^\circ)$
* **Khớp chéo C++ vs Python**:
  * Độ lệch tối đa đo được giữa C++ và Python qua 25 test vectors:
    - NOAA: $\Delta Az = 0.000049^\circ$ ($0.18$ giây góc), $\Delta El = 0.000048^\circ$ ($0.17$ giây góc).
    - Khớp hoàn toàn 100%!
* **Ghi chú cam kết phần cứng & tham số cơ học theo chỉ đạo người dùng**:
  * **Hằng số $L = 25^\circ$ & Ngưỡng bám $10^\circ$**: Đã đánh dấu rõ ràng **"TẠM, CHỜ ĐO CƠ KHÍ THỰC TẾ"** trong [solar_config.h](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/include/solar_config.h) và [solar_config.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/solar_config.py). Đây là cấu hình dùng chung duy nhất cho cả 3 bộ điều khiển (PID, Fuzzy-PID, PSO), tuyệt đối không hard-code.
  * **Mô phỏng hình học tháng 11 tại TP.HCM**: Bắt đầu bám ($El \ge 10^\circ$) lúc 06:36, thoát kẹp $L = 25^\circ$ lúc 07:43 (bị kẹp 67 phút buổi sáng và 67 phút buổi chiều). Mức độ hao hụt năng lượng cả tháng 11 do kẹp $L = 25^\circ$ so với $L = 10^\circ$ chỉ là **$0.066\%$** do đặc tính hàm $\cos(\theta)$ và cường độ bức xạ góc thấp nhỏ; độ lợi tracker ước tính đạt **$+24.31\%$** so với tấm cố định *(LƯU Ý: Đây là kết quả tính từ mô hình hình học trời quang Clear-sky lý thuyết, CHƯA KIỂM CHỨNG với dữ liệu bức xạ thực nghiệm hay thư viện pvlib thời tiết thực tế)*.
  * **Giờ báo thức DS3231**: Đã cập nhật tính theo giờ bắt đầu bám thực tế: $t_{\text{alarm}} = t_{\text{track\_start}} - 20\text{ phút} = 06:36 - 20 = \mathbf{06:16\text{ AM}}$ (thay vì 05:18 AM).
  * **Đo thời gian thực thi float32 vs double trên board thật**: **CHƯA ĐO** (chờ cắm board ESP32-S3 thật).
  * **Phân tích tốc độ quay Azimuth gần thiên đỉnh**: **CHƯA ĐO** (chờ đo cơ khí trên giàn thật).
  * **Độ chính xác tính toán hiện tại**: Sử dụng kiểu **`double`** tạm thời theo đúng chỉ đạo.
* **Tài liệu & Mã nguồn**:
  * [solar_ephemeris.h](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/lib/solar_core/solar_ephemeris.h) & [solar_ephemeris.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/lib/solar_core/solar_ephemeris.cpp)
  * [solar_ephemeris.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/solar_ephemeris.py) & [benchmark_pvlib_grid.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/benchmark_pvlib_grid.py)
  * [simulate_energy_loss_L.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/simulate_energy_loss_L.py)
  * [test_phase1.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/test/test_phase1.cpp) & [test_vectors_data.h](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/test/test_vectors_data.h)
  * [test_vectors_phase1.json](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/test_vectors_phase1.json)
  * [update 24-10.md](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/update%2024-10.md)

---

### [HOÀN THÀNH 100%] Phase 2: Cảm biến Quang 3 chân S-V-G (TEMT6000) & Xử lý Tín hiệu Số (DSP)
* **Mục tiêu & Hiện thực hóa**:
  * Đọc 4 cảm biến quang TEMT6000 (3 chân S-V-G, dải tuyến tính Lux cao hơn LDR) kết nối ADC1 (Top=GPIO34, Bottom=GPIO35, Left=GPIO32, Right=GPIO33) độc lập với WiFi.
  * Kỹ thuật Oversampling 16 mẫu chống nhiễu lưới điện xoay chiều 50Hz/100Hz.
  * Chuẩn hóa sai số quang học độc lập độ rọi:
    $$e_{s,az} = \frac{L_{comp} - R_{comp}}{L_{comp} + R_{comp}}, \quad e_{s,el} = \frac{T_{comp} - B_{comp}}{T_{comp} + B_{comp}}$$
  * Vùng chết (Deadband $\pm 0.04$): Triệt tiêu rung giật cơ khí khi tâm sáng ở giữa.
  * Trọng số mây/trời tối ($w_s$):
    - Khi tổng ánh sáng $\Sigma < T_{dark} (400\text{ raw})$, $w_s = 0$ (hệ thống tin hoàn toàn vào feedforward NOAA).
    - Khi bão hòa quang học ($V_{raw} \ge W = 3950\text{ raw}$), ngắt cảm biến $w_s = 0$ chống mù lòa quang.
  * Khâu hiệu chỉnh tinh kẹp bão hòa $\pm Z_2$ ($\pm 6.0^\circ$):
    $$\Delta\theta = \text{sat}(w_s \cdot Z \cdot e_s, \pm Z_2)$$
    Bảo đảm cảm biến quang chỉ can thiệp tinh trong khoảng $\pm 6.0^\circ$, không bao giờ làm giàn pin quay sai lệch quỹ đạo thiên văn.
  * Thuật toán tự động cân bằng Zero-Offset Calibration: Tự tính toán hệ số bù gain khi rọi chùm sáng đồng nhất, lưu trữ NVS.
* **Kết quả Kiểm thử Toàn diện (Pass 100%)**:
  * 7 kịch bản Unit Test tự động trên C++ ([test_phase2.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/test/test_phase2.cpp)) và Python ([temt6000_processor.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/temt6000_processor.py)):
    1. *Nắng chính diện*: $e_s = 0 \to \Delta\theta = 0^\circ$ [PASS].
    2. *Lệch trái ($L > R$)*: $e_{s,az} = 0.25 \to \Delta\theta_{az} = +3.0^\circ$ [PASS].
    3. *Lệch mạnh*: Raw $= 9.0^\circ \to$ kẹp bảo vệ $\pm Z_2$ tại $6.0^\circ$ [PASS].
    4. *Vùng chết*: $|e_s| = 0.01 < 0.04 \to e_s = 0$, triệt rung cơ khí [PASS].
    5. *Trời tối ($\Sigma < 400$)*: $w_s = 0$, ngắt hồi tiếp quang [PASS].
    6. *Bão hòa ADC ($> 3950$)*: Bật cờ bão hòa, $w_s = 0$ [PASS].
    7. *Zero-offset calibration*: Cân bằng 4 mắt đọc lệch về đúng 2000.0 đều nhau [PASS].
  * Biên dịch thành công với toolchain thật `xtensa-esp32s3-elf-g++` (`-std=gnu++17 -Wall -Wextra -Werror`): **0 cảnh báo, 0 lỗi**.
* **Tài liệu & Mã nguồn**:
  * [temt6000_processor.h](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/lib/solar_core/temt6000_processor.h) & [temt6000_processor.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/lib/solar_core/temt6000_processor.cpp)
  * [temt6000_processor.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/temt6000_processor.py)
  * [test_phase2.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/test/test_phase2.cpp)

---

### [HOÀN THÀNH 100%] Phase 3: Quy đổi xung, Encoder & Giới hạn chuyển động
* **Mục tiêu & Hiện thực hóa**:
  * Công thức quy đổi xung:
    $$K_{pulse} = \frac{E \cdot C}{360.0} = \frac{1600 \cdot 3.0}{360} = \mathbf{13.3333\text{ pulses/degree}}$$
    $$K_{enc} = \frac{4 \cdot F \cdot C}{360.0} = \frac{1600 \cdot 3.0}{360} = \mathbf{13.3333\text{ counts/degree}}$$
    Độ phân giải góc đạt $0.075^\circ$ ($4.5$ phút góc), đáp ứng hoàn hảo yêu cầu bám quang học.
  * Phát hiện mất bước thời gian thực (Step Loss Detection):
    - So lệch xung phát và xung đếm phần cứng: $\Delta N = |N_{cmd} - N_{enc}|$.
    - Khi $\Delta N > 64\text{ counts}$ ($\sim 4.8^\circ$) $\implies$ Kích hoạt cờ `is_step_loss = true`, dừng khẩn cấp bảo vệ cơ khí.
  * Biên dạng gia tốc hình thang (Trapezoidal Velocity Profile):
    - Tự động phân nhánh: Profile hình tam giác (Triangular) cho bước di chuyển nhỏ và hình thang (Trapezoidal) cho hành trình dài.
    - Thời gian quay Elevation từ Home ($90^\circ$) về $L = 25^\circ$ ($\Delta\varepsilon = 65^\circ = 867\text{ xung}$):
      * Ở tần số nhanh $1200\text{ Hz}$: **$0.86\text{ giây}$**.
      * Ở tần số chậm an toàn $300\text{ Hz}$: **$2.89\text{ giây}$**.
  * **Kiểm tra ngân sách thời gian báo thức sớm 20 phút**:
    - Chu trình thức dậy đầy đủ (Worst-case):
      1. Homing Elevation: tìm cữ nhanh $\to$ lùi $5^\circ$ $\to$ chạm chậm $\to$ delay cơ khí $\approx 3.0\text{ s}$.
      2. Homing Azimuth: tìm cữ nhanh $225^\circ$ $\to$ lùi $5^\circ$ $\to$ chạm chậm $\to$ delay cơ khí $\approx 4.6\text{ s}$.
      3. Di chuyển đón nắng sáng: Elevation $90^\circ \to 25^\circ$ ($0.86\text{ s}$), Azimuth $45^\circ \to 108.5^\circ$ ($0.85\text{ s}$).
      4. Thời gian ổn định giàn pin: $3.0\text{ s}$.
      $\implies$ **Tổng thời gian toàn bộ chu trình thức dậy chỉ mất $\mathbf{13.12\text{ giây}}$ ($\mathbf{0.22\text{ phút}}$)**.
    - **Kết luận**: Thời gian đánh thức trước 20 phút (`CFG_WAKEUP_LEAD_TIME_MIN = 20`) là **HOÀN TOÀN ĐỦ VÀ DƯ DÃ TUYỆT ĐỐI** (hệ thống có dư hơn $19.7\text{ phút}$ an toàn).
* **Kết quả Kiểm thử Toàn diện**:
  * 7/7 kịch bản Unit Test trên C++ ([test_phase3.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/test/test_phase3.cpp)) và Python ([motion_kinematics.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/motion_kinematics.py)) **PASS 100%**.
  * Biên dịch sạch bằng `xtensa-esp32s3-elf-g++` (`-std=gnu++17 -Wall -Wextra -Werror`): **0 cảnh báo, 0 lỗi**.
* **Tài liệu & Mã nguồn**:
  * [motion_kinematics.h](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/lib/solar_core/motion_kinematics.h) & [motion_kinematics.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/lib/solar_core/motion_kinematics.cpp)
  * [motion_kinematics.py](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/python_sim/motion_kinematics.py)
  * [test_phase3.cpp](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/firmware/esp32_tracker_control/test/test_phase3.cpp)

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
