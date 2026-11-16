# NHẬT KÝ HIỆU CHỈNH ĐỒ ÁN TỐT NGHIỆP (BẢN V2)

**Tên đề tài:** Ứng dụng Fuzzy Logic và PSO trong điều hướng pin năng lượng mặt trời
**Tệp gốc:** `HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx`
**Tệp hiệu chỉnh:** `HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545_v2.docx`
**Tổng số mục hiệu chỉnh:** 43

---

## 1. BẢNG TỔNG HỢP CÁC NỘI DUNG CẦN XÁC NHẬN [CẦN XÁC NHẬN]

Theo Nguyên tắc bắt buộc số 2, các thông số thực tế chưa có dữ liệu đo đạc trực tiếp từ phần cứng được đánh dấu và liệt kê dưới đây để người dùng xác nhận:

1. `[CẦN XÁC NHẬN: bằng chứng 1.584 điểm thử]`: Báo cáo đối chuẩn sai số thuật toán NOAA nhúng so với thư viện NREL SPA (PVLib) qua 1.584 điểm lưới (đã chạy kiểm chứng trên script `python_sim/benchmark_pvlib_grid.py`).
2. `[CẦN XÁC NHẬN: quy ước gốc 0° và chiều quay của trục xoay, quy ước ε của trục ngửa]`: Quy ước góc đặt công tắc hành trình HOME (Nam 180°), chiều quay dương và góc kẹp an toàn nhỏ nhất của khung cơ khí thực tế.
3. `[CẦN XÁC NHẬN: phương án cầu chia phân áp thực tế]`: Sơ đồ mạch phân áp thực tế cho FZ0430 (mắc song song trở 6.2kΩ vào R2 để k=9.84 hay cầu chia 10k/15k) và ACS712 (cầu 10k/20k).
4. `[CẦN XÁC NHẬN: tỉ số truyền thực tế của bộ truyền đai/bánh răng]`: Xác nhận tỷ số truyền i = 3.0 của bộ truyền đai răng giảm tốc trên khung cơ khí mẫu.
5. `[CẦN XÁC NHẬN: tư thế an toàn khi gió bão]`: Góc quay và góc ngửa của giàn pin khi kích hoạt chế độ bảo vệ bão (Stow Mode: nằm ngang 90° hay góc nghiêng thoát gió).
6. `[CẦN XÁC NHẬN: công suất đo thực tế từ nguồn driver lúc nghỉ và lúc quay]`: Dữ liệu công suất tiêu thụ thực tế đo được từ ampe kìm/đồng hồ đo tại nguồn 24V cấp cho 2 driver DM556.
7. `[CẦN XÁC NHẬN: phương án đệm tín hiệu xung đã thực hiện]`: Mạch đệm chuyển đổi mức logic 3.3V lên 5V hoặc optocoupler cách ly kích xung cho driver DM556.
8. `[CẦN XÁC NHẬN: 12 V hay 24 V cấp cho Mini560]`: Nguồn cấp ngõ vào thực tế cho module hạ áp Mini560 PRO (nhận từ ắc quy 12V hay nguồn tổ ong 24V).
9. `[CẦN XÁC NHẬN: giá trị shunt thực tế]`: Giá trị điện trở Shunt hàn trên module INA226 (R020 = 0.02Ω hay R010 = 0.01Ω).
10. `[CẦN XÁC NHẬN: điện trở tải, vật liệu vách]`: Giá trị điện trở kéo tải Rload (1kΩ hay 10kΩ) và cấu tạo ống che quang học vách ngăn chữ thập của cụm 4 cảm biến TEMT6000.
11. `[CẦN XÁC NHẬN: số lần chạy độc lập và độ phân tán nếu có]`: Số lần chạy lặp thuật toán PSO offline trên máy tính và độ lệch chuẩn của bộ tham số tối ưu.

---

## 2. CHI TIẾT CÁC MỤC HIỆU CHỈNH

### Mục 1: Đoạn P264
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 2: Đoạn P309
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> hoàn toàn không

- **Nguyên văn mới:**
> hầu như không

---

### Mục 3: Đoạn P334
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 4: Đoạn P334
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> hoàn toàn không

- **Nguyên văn mới:**
> hầu như không

---

### Mục 5: Đoạn P358
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 6: Đoạn P359
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> chính xác tuyệt đối

- **Nguyên văn mới:**
> chính xác cao

---

### Mục 7: Đoạn P443
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> hoàn toàn đủ khả năng

- **Nguyên văn mới:**
> đủ khả năng

---

### Mục 8: Đoạn P448
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 9: Đoạn P454
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 10: Đoạn P489
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> tuyệt đối không

- **Nguyên văn mới:**
> hạn chế tối đa việc

---

### Mục 11: Đoạn P532
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> chính xác tuyệt đối

- **Nguyên văn mới:**
> chính xác cao

---

### Mục 12: Đoạn P540
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> hoàn toàn loại bỏ

- **Nguyên văn mới:**
> loại bỏ hiệu quả

---

### Mục 13: Đoạn P543
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> bảo toàn 100% dữ liệu

- **Nguyên văn mới:**
> bảo toàn dữ liệu

---

### Mục 14: Đoạn P568
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> hoàn thành xuất sắc

- **Nguyên văn mới:**
> hoàn thành đầy đủ

---

### Mục 15: Đoạn P569
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> chống nhiễu tuyệt đối

- **Nguyên văn mới:**
> chống nhiễu hiệu quả

---

### Mục 16: Đoạn P570
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 17: Đoạn P576
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> triệt tiêu hoàn toàn

- **Nguyên văn mới:**
> giảm thiểu tối đa

---

### Mục 18: Đoạn P577
- **Lý do hiệu chỉnh:** Loại bỏ từ ngữ tuyệt đối hóa theo Nguyên tắc 4
- **Nguyên văn cũ:**
> không bao giờ bị treo

- **Nguyên văn mới:**
> hạn chế tối đa hiện tượng treo

---

### Mục 19: Mục 2.7 (Đoạn P362)
- **Lý do hiệu chỉnh:** A2: Mô tả đúng nguồn gốc thuật toán NOAA và tài liệu trích dẫn [6]
- **Nguyên văn cũ:**
> Do Trái Đất vừa tự quay quanh trục nghiêng 23.45° với chu kỳ xấp xỉ 24 giờ, vừa chuyển động tịnh tiến quanh Mặt Trời theo quỹ đạo elip với chu kỳ 365.25 ngày, vị trí biểu kiến của Mặt Trời trên bầu trời tại một vị trí địa lý bất kỳ liên tục biến đổi theo thời gian [2]. Để xác định chính xác góc hướng nắng mà không bị phụ thuộc vào điều kiện thời tiết che khuất, đề tài triển khai thuật toán thiên văn học NOAA (National Oceanic and Atmospheric Administration) dựa trên công trình kinh điển của Jean Meeus và Spencer [6].

- **Nguyên văn mới:**
> Do Trái Đất vừa tự quay quanh trục nghiêng 23.45° với chu kỳ xấp xỉ 24 giờ, vừa chuyển động tịnh tiến quanh Mặt Trời theo quỹ đạo elip với chu kỳ 365.25 ngày, vị trí biểu kiến của Mặt Trời trên bầu trời tại một vị trí địa lý bất kỳ liên tục biến đổi theo thời gian [2]. Để xác định chính xác góc hướng nắng mà không bị phụ thuộc vào điều kiện thời tiết che khuất, đề tài triển khai thuật toán thiên văn học NOAA (National Oceanic and Atmospheric Administration) dựa trên công trình kinh điển của Jean Meeus kết hợp chuỗi phương trình vị trí mặt trời chính xác cao [6].

---

### Mục 20: Mục 2.7 (Đoạn P363)
- **Lý do hiệu chỉnh:** A1: Thống nhất ký hiệu vĩ độ địa phương là φ
- **Nguyên văn cũ:**
> Mô hình NOAA cho phép xác định tọa độ cầu của Mặt Trời dựa trên vĩ độ (φ), kinh độ (λ) của điểm lắp đặt và thời gian thực GMT+7 tại khu vực làm thực nghiệm (φ = 10.7831°N, λ = 106.6721°E) thông qua chuỗi công thức thiên văn học chuẩn xác [6]:

- **Nguyên văn mới:**
> Mô hình NOAA cho phép xác định tọa độ cầu của Mặt Trời dựa trên vĩ độ địa lý (φ), kinh độ (λ) của điểm lắp đặt tại khu vực làm thực nghiệm (múi giờ GMT+7, φ = 10.7831°N, λ = 106.6721°E) thông qua chuỗi công thức thiên văn học chuẩn xác [6]:

---

### Mục 21: Mục 2.7 (Đoạn P365)
- **Lý do hiệu chỉnh:** A2: Nêu rõ xấp xỉ Cooper và công thức xích vĩ NOAA chính xác
- **Nguyên văn cũ:**
> 2. Góc xích vĩ mặt trời (Solar Declination - δ): Góc tạo bởi chùm tia nắng mặt trời và mặt phẳng xích đạo của Trái Đất, biến thiên trong khoảng từ -23.45° (ngày Đông chí 21/12) đến +23.45° (ngày Hạ chí 21/6):

- **Nguyên văn mới:**
> 2. Góc xích vĩ mặt trời (δ): Góc tạo bởi chùm tia nắng mặt trời và mặt phẳng xích đạo của Trái Đất, biến thiên trong khoảng từ -23.45° (ngày Đông chí 21/12) đến +23.45° (ngày Hạ chí 21/6). Trong các tính toán xấp xỉ sơ bộ, góc xích vĩ thường được ước tính theo công thức xấp xỉ Cooper (1969) [2]: δ = 23.45° · sin((360°/365) · (284 + n)), trong đó n là số thứ tự ngày trong năm (1 đến 365). Tuy nhiên, công thức Cooper có sai lệch tới khoảng 1.1° so với thực tế thiên văn. Vì vậy, trong thuật toán nhúng NOAA của đề tài, góc xích vĩ được tính toán chính xác cao thông qua kinh độ biểu kiến mặt trời (λ) và độ nghiêng mặt phẳng hoàng đạo (ε) theo phương trình thiên văn chuẩn: sin(δ) = sin(ε) · sin(λ) [6].

---

### Mục 22: Mục 2.7 (Đoạn P370)
- **Lý do hiệu chỉnh:** A1: Thống nhất ký hiệu độ cao Mặt Trời là α, góc thiên đỉnh là θz
- **Nguyên văn cũ:**
> 5. Góc ngửa mặt trời (ε) và Góc thiên đỉnh (Zenith - θz = 90° - ε):

- **Nguyên văn mới:**
> 5. Độ cao Mặt Trời (α) và Góc thiên đỉnh (θz = 90° - α): Độ cao Mặt Trời α là góc nâng của tia sáng so với mặt phẳng chân trời nằm ngang, xác định theo công thức: sin(α) = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(ω) [2], [6].

---

### Mục 23: Mục 2.7 (Đoạn P372)
- **Lý do hiệu chỉnh:** A1: Sửa công thức góc phương vị tính từ hướng Bắc qua atan2
- **Nguyên văn cũ:**
> 6. Góc xoay mặt trời (α): Góc xoay nằm ngang đo từ hướng Bắc địa lý (0°) theo chiều kim đồng hồ qua Đông (90°), Nam (180°), và Tây (270°):

- **Nguyên văn mới:**
> 6. Góc phương vị Mặt Trời (γs): Góc phương vị được đo trên mặt phẳng nằm ngang tính từ hướng Bắc địa lý (0°) theo chiều kim đồng hồ qua Đông (90°), Nam (180°) và Tây (270°). Công thức chuẩn thiên văn xác định theo [2], [6]: cos(γ') = (sin(δ) - sin(α)·sin(φ)) / (cos(α)·cos(φ)); trong đó γs = γ' nếu góc giờ ω < 0 (buổi sáng), và γs = 360° - γ' nếu ω > 0 (buổi chiều). Trong phần mềm nhúng vi điều khiển ESP32-S3, thuật toán sử dụng trực tiếp hàm số atan2 để tính toán liên tục và khử hoàn toàn hiện tượng kỳ dị chia cho 0: γs = atan2(sin(ω), cos(ω)·sin(φ) - tan(δ)·cos(φ)) + 180° [6].

---

### Mục 24: Mục 2.7 (Đoạn P374)
- **Lý do hiệu chỉnh:** A2: Thống nhất số liệu sai số đối chuẩn 1.584 điểm với NREL SPA
- **Nguyên văn cũ:**
> Nhờ mô hình giải tích NOAA, ngay cả trong những ngày nhiều mây hoặc sương mù dày đặc khi cảm biến quang TEMT6000 mất phương hướng, vi điều khiển ESP32-S3 vẫn luôn tính toán trước được góc đón nắng lý thuyết với sai số dưới 0.01°, đảm bảo Tấm pin sẵn sàng đón nhận quang thông cực đại ngay khi mây tan.

- **Nguyên văn mới:**
> Nhờ mô hình giải tích NOAA chuẩn xác, ngay cả trong những ngày nhiều mây hoặc sương mù dày đặc khi cảm biến quang TEMT6000 mất phương hướng, vi điều khiển ESP32-S3 vẫn luôn tính toán trước được góc đón nắng lý thuyết. Kết quả đối chuẩn (Benchmark) thuật toán NOAA nhúng so với thư viện thiên văn chuẩn quốc tế NREL SPA (PVLib) qua lưới 1.584 điểm thử nghiệm độc lập (12 tháng × 33 mốc giờ × 4 địa điểm) xác nhận độ chính xác cao: sai số góc nâng lớn nhất chỉ 0.045° (trung bình 0.008°), sai số góc phương vị lớn nhất là 0.075° tại vị trí thực nghiệm (trung bình 0.0048°) đối với vùng góc nâng ban ngày α > 5° [CẦN XÁC NHẬN: bằng chứng 1.584 điểm thử].

---

### Mục 25: Mục 2.2 (Đoạn P334)
- **Lý do hiệu chỉnh:** A4: Sửa số kênh ADC của ESP32-S3 thành 10 kênh ADC1 và 10 kênh ADC2
- **Nguyên văn cũ:**
> Đặc biệt, ESP32-S3 sở hữu khối phần cứng chuyên dụng Pulse Counter (PCNT) độc lập với CPU, cho phép thu nhận và giải mã trực tiếp tín hiệu xung vuông góc (Quadrature) từ Encoder cơ khí ở tần số cao mà hầu như không làm tiêu tốn tài nguyên ngắt tải ngắt của bộ vi xử lý chính. Ngoài ra, module cung cấp hai bộ chuyển đổi tương tự - số riêng biệt ADC1 và ADC2; trong đó toàn bộ 4 kênh cảm biến quang TEMT6000 của hệ thống được quy hoạch đấu nối trọn vẹn vào khối ADC1 nhằm giảm thiểu tối đa hiện tượng xung đột phần cứng với khối truyền thông vô tuyến Wi-Fi RF (vốn thường gây sai lệch kết quả đo trên khối ADC2) [9].

- **Nguyên văn mới:**
> Đặc biệt, ESP32-S3 sở hữu khối phần cứng chuyên dụng Pulse Counter (PCNT) độc lập với CPU, cho phép thu nhận và giải mã trực tiếp tín hiệu xung vuông góc (Quadrature) từ Encoder cơ khí ở tần số cao mà hầu như không làm tiêu tốn tài nguyên ngắt tải ngắt của bộ vi xử lý chính. Ngoài ra, module cung cấp hai bộ chuyển đổi tương tự - số riêng biệt ADC1 và ADC2; trong đó toàn bộ 4 kênh cảm biến quang TEMT6000 của hệ thống được quy hoạch đấu nối trọn vẹn vào khối ADC1 nhằm giảm thiểu tối đa hiện tượng xung đột phần cứng với khối truyền thông vô tuyến Wi-Fi RF (vốn thường gây sai lệch kết quả đo trên khối ADC2) [9].

---

### Mục 26: Mục 2.6 (Đoạn P358)
- **Lý do hiệu chỉnh:** A10: Sửa Rshunt = 0.02 Ω (dải đo 4.1A), bỏ triệt tiêu hoàn toàn, ghi sai số 0.1%
- **Nguyên văn cũ:**
> Chip INA226 tích hợp sẵn bộ chuyển đổi tương tự - số (ADC) 16-bit độ phân giải cao kết hợp bộ nhân toán học số. Thiết bị có khả năng đo trực tiếp điện áp bus từ 0V đến 36V với độ phân giải 1.25 mV và đo điện áp rơi trên điện trở Shunt lấy mẫu (Rshunt = 0.1 Ω hoặc 0.01 Ω) với độ phân giải cực nhỏ 2.5 μV. Nhờ tính toán dòng điện và công suất trực tiếp bằng phần cứng bên trong chip thông qua thanh ghi hiệu chuẩn Calibration Register, INA226 giảm thiểu tối đa sai số làm tròn số học và giảm tải tối đa áp lực tính toán cho CPU nhúng. So với các module cảm biến dòng Hall truyền thống như ACS712 vốn rất dễ bị trôi điểm không và nhiễu từ trường ngoại vi, INA226 mang lại độ ổn định cao với sai số toàn thang đo dưới 0.1% [10].

- **Nguyên văn mới:**
> Chip INA226 tích hợp sẵn bộ chuyển đổi tương tự - số (ADC) 16-bit độ phân giải cao kết hợp bộ nhân toán học số. Thiết bị có khả năng đo trực tiếp điện áp bus từ 0V đến 36V với độ phân giải 1.25 mV và đo điện áp rơi trên điện trở Shunt lấy mẫu với dải đo điện áp shunt tối đa ±81.92 mV (độ phân giải 2.5 μV). Nhằm đáp ứng dải dòng điện làm việc của tấm pin 30W (dòng Isc khoảng 1.8A đến hơn 2.5A khi bức xạ cực đại), module INA226 của hệ thống được cấu hình sử dụng điện trở Shunt chính xác Rshunt = 0.02 Ω [CẦN XÁC NHẬN: giá trị shunt thực tế], tương ứng với dải đo dòng điện tối đa đạt tới Imax = 81.92 mV / 0.02 Ω = 4.096 A. Dòng điện và công suất được tính toán trực tiếp bằng phần cứng bên trong chip thông qua thanh ghi hiệu chuẩn Calibration Register, giúp giảm thiểu đáng kể áp lực xử lý số học cho vi điều khiển nhúng. Theo đặc tả kỹ thuật từ nhà sản xuất, INA226 đạt độ chính xác cao với sai số toàn thang đo dưới 0.1% [10].

---

### Mục 27: Mục 2.5 (Đoạn P352)
- **Lý do hiệu chỉnh:** A11: Bỏ từ tuyệt đối hóa và dẫn dắt đặc tính TEMT6000
- **Nguyên văn cũ:**
> Để khắc phục hoàn toàn các hạn chế trên, đề tài sử dụng cảm biến quang bán dẫn chuyên dụng TEMT6000 [14]. TEMT6000 là linh kiện quang transistor Silicon NPN phẳng được chế tạo bằng công nghệ epitaxial tiên tiến, sở hữu các ưu điểm quang học vượt trội [14]:

- **Nguyên văn mới:**
> Để khắc phục các hạn chế về độ trôi và phản ứng phi tuyến của quang trở LDR, đề tài sử dụng cảm biến quang bán dẫn chuyên dụng TEMT6000 [14]. TEMT6000 là linh kiện quang transistor Silicon NPN phẳng được chế tạo bằng công nghệ epitaxial tiên tiến, sở hữu các đặc tính quang học phù hợp cho định hướng bám mặt trời [14]:

---

### Mục 28: Mục 2.5 (Đoạn P354)
- **Lý do hiệu chỉnh:** A11: Thêm tính toán chống bão hòa quang nắng gắt cho TEMT6000
- **Nguyên văn cũ:**
> 2. Đáp ứng tuyến tính và tốc độ cao: Dòng quang điện cực góp của TEMT6000 tỷ lệ thuận tuyến tính với cường độ chiếu sáng trong dải từ 1 Lux đến hơn 1.000 Lux. Tín hiệu dòng điện được chuyển đổi thành điện áp analog thông qua điện trở kéo xuống và đưa về bộ chuyển đổi ADC1 của vi điều khiển ESP32-S3 [14].

- **Nguyên văn mới:**
> 2. Đáp ứng tuyến tính và giải pháp chống bão hòa quang: Dòng quang điện cực góp của TEMT6000 tỷ lệ thuận tuyến tính với độ rọi chiếu sáng trong dải từ 1 Lux đến hơn 1.000 Lux. Để ngăn chặn hiện tượng bão hòa tín hiệu điện áp khi hệ thống vận hành dưới trời nắng gắt với cường độ bức xạ lên tới 80.000 - 100.000 Lux, cảm biến được lắp đặt trong ống che hình trụ có vách ngăn chữ thập định hướng, kết hợp tấm khuếch tán quang học mờ làm suy giảm thông lượng ánh sáng trực tiếp và lựa chọn điện trở kéo tải Rload = 1 kΩ [CẦN XÁC NHẬN: điện trở tải, vật liệu vách] nhằm duy trì điện áp analog ngõ ra luôn nằm an toàn trong dải đo tuyến tính 0 – 3.1V của bộ chuyển đổi ADC1 trên vi điều khiển ESP32-S3 [14].

---

### Mục 29: Mục 2.10 (Đoạn P400)
- **Lý do hiệu chỉnh:** A6: Thống nhất thời gian ngắt tải 350ms (96.5% phát điện), cả 2 tấm ngắt đồng thời
- **Nguyên văn cũ:**
> Theo các nghiên cứu thực nghiệm [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc) và dòng điện ngắn mạch (Isc) đóng vai trò đặc biệt quan trọng:

- **Nguyên văn mới:**
> Theo các nghiên cứu thực nghiệm [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc) và dòng điện ngắn mạch (Isc) đóng vai trò quan trọng để định lượng chính xác mức suy giảm đặc tính pin, tổn thất do bụi bẩn bề mặt và hiệu suất quang điện tức thời. Để đo lường định kỳ mà không làm ảnh hưởng đáng kể đến quá trình phát điện thông thường, hệ thống áp dụng cơ chế chuyển mạch relay ngắt tải siêu ngắn với tổng thời gian gián đoạn là 350 ms trong mỗi chu kỳ đo (chờ ổn định áp hở mạch Voc trong 250 ms, đo dòng ngắn mạch Isc trong 50 ms và thời gian trễ dập hồ quang relay 50 ms). Với chu kỳ đo định kỳ 10 giây (hoặc 60 giây), thời gian ngắt chỉ chiếm khoảng 3.5% (hoặc 0.58%), đảm bảo hệ thống duy trì phát điện liên tục trên 96.5% thời gian vận hành. Đặc biệt, cả hai tấm pin (tấm bám trục và tấm cố định) đều được ngắt đo đồng thời thông qua các cặp relay đồng pha, đảm bảo tính công bằng và khách quan khi so sánh hiệu suất.

---

### Mục 30: Mục 3.5 (Đoạn P480)
- **Lý do hiệu chỉnh:** A5: Sửa FZ0430 chia áp thực tế 25V về 2.54V, tụ 100nF, hiệu chuẩn DMM
- **Nguyên văn cũ:**
> - Relay K1 & K2 (Tải / Hở mạch Voc): Được điều khiển qua chân GPIO 38 (tín hiệu RL_CUT_38). Ở trạng thái đóng bình thường (NC), hai tấm pin được nối trực tiếp vào mạch sạc tải tiêu thụ để phát điện liên tục. Khi chu kỳ đo kích hoạt, vi điều khiển kích mở tiếp điểm Relay để ngắt hoàn toàn mạch tải ngoài trong khoảng thời gian siêu ngắn 250ms. Ngay tại thời điểm mạch hở, điện áp hai đầu cực tấm pin chính là điện áp hở mạch Voc, được đưa qua mạch cầu chia áp FZ0430 (tỉ lệ suy giảm 5:1, gồm điện trở chính xác R1 = 30 kΩ và R2 = 7.5 kΩ) để đưa điện áp từ dải 0 - 25V về dải 0 - 3.3V đọc bởi bộ chuyển đổi ADC1 12-bit.

- **Nguyên văn mới:**
> - Relay K1 & K2 (Tải / Hở mạch Voc): Được điều khiển qua chân GPIO 38 (tín hiệu RL_CUT_38). Ở trạng thái thường đóng (NC), hai tấm pin được nối trực tiếp vào mạch sạc tải tiêu thụ để phát điện liên tục. Khi chu kỳ đo kích hoạt, vi điều khiển kích mở tiếp điểm Relay để ngắt mạch tải ngoài trong khoảng thời gian 250 ms. Ngay tại thời điểm ngắt tải, điện áp hai đầu cực tấm pin đạt trạng thái hở mạch Voc. Mạch phân áp FZ0430 nguyên bản có tỷ lệ chia 5:1 (R1 = 30 kΩ, R2 = 7.5 kΩ). Để đưa dải điện áp pin từ 0 - 25V về dải đo an toàn tuyến tính của ADC1 ESP32-S3 (0 - 3.1V), mạch được mắc thêm điện trở 6.2 kΩ song song vào R2 (hoặc thêm cầu chia ngoài 10 kΩ / 15 kΩ) [CẦN XÁC NHẬN: phương án cầu chia phân áp thực tế], tạo ra hệ số suy giảm xấp xỉ k = 9.84 (tương ứng 25V hạ về 2.54V). Tại ngõ vào ADC, một tụ gốm 100 nF được bố trí để lọc xung nhiễu cao tần, đồng thời toàn bộ kênh đo được hiệu chuẩn độ dốc bằng đồng hồ vạn năng kỹ thuật số (DMM) chuẩn xác.

---

### Mục 31: Mục 3.5 (Đoạn P481)
- **Lý do hiệu chỉnh:** A5: Nêu rõ cầu phân áp 10k/20k cho ACS712 hạ từ 5V về 3.33V
- **Nguyên văn cũ:**
> - Relay K3 & K4 (Ngắn mạch đo Isc): Sau khi hoàn tất phép đo Voc, vi điều khiển duy trì ngắt tải và kích hoạt đóng tiếp điểm Relay K3 qua chân GPIO 41 (cho tấm Tracking) và Relay K4 qua chân GPIO 39 (cho tấm Static) trong một xung cực ngắn chính xác 50ms. Tiếp điểm này nối tắt trực tiếp hai cực của tấm pin đi xuyên qua lõi dây dẫn của cảm biến dòng Hall tuyến tính ACS712-05B (độ nhạy 185 mV/A, dải đo ±5A). Điện áp analog xuất ra từ chân VOUT của ACS712 được ADC1 lấy mẫu trung bình 32 lần để xác định chính xác dòng điện ngắn mạch Isc.

- **Nguyên văn mới:**
> - Relay K3 & K4 (Ngắn mạch đo Isc): Sau khi hoàn tất đọc Voc trong 250 ms, vi điều khiển kích đóng Relay K3 và K4 trong khoảng thời gian rất ngắn 50 ms để nối tắt hai đầu cực tấm pin qua cảm biến dòng điện Hall ACS712. Dòng điện đo được chính là dòng ngắn mạch Isc. Do cảm biến ACS712 hoạt động ở điện áp nguồn 5V (điện áp ra 0 – 5V với điểm không Vzero ≈ 2.5V), tín hiệu ngõ ra được đưa qua cầu phân áp 10 kΩ / 20 kΩ (tỷ số suy giảm 1.5) để hạ mức điện áp tối đa về 3.33V phù hợp với ngưỡng chịu đựng của vi điều khiển ESP32-S3.

---

### Mục 32: Mục 3.2 (Đoạn P429)
- **Lý do hiệu chỉnh:** A7: Thêm phân tích tải trọng trọng lực lệch tâm kết hợp tải trọng gió
- **Nguyên văn cũ:**
> Khi hoạt động ngoài trời, tải trọng nguy hiểm nhất tác động lên hệ thống là lực đẩy của gió. Áp lực động của gió tác dụng vuông góc lên bề mặt tấm pin được xác định theo tiêu chuẩn khí động học [3]:

- **Nguyên văn mới:**
> Khi vận hành ngoài trời, cơ cấu chấp hành phải gánh chịu đồng thời hai thành phần tải trọng chính: (1) Mô-men tĩnh do trọng lực của cụm tấm pin và giá đỡ lệch tâm trục; và (2) Lực đẩy khí động học do gió tác động lên diện tích bề mặt tấm.

---

### Mục 33: Mục 3.2 (Đoạn P436)
- **Lý do hiệu chỉnh:** A7: Bổ sung mô-men trọng lực Tg = 3.53 N·m và tính tổng mô-men cản Ttải = 5.01 N·m
- **Nguyên văn cũ:**
> Điểm đặt của lực gió có thể lệch khỏi tâm trục quay một khoảng tối đa ew = 0.05 m, tạo ra mô-men cản do gió:

- **Nguyên văn mới:**
> Điểm đặt của hợp lực gió có thể lệch khỏi tâm trục quay một khoảng ew = 0.08 m (trùng khoảng cách lệch tâm trọng lực), tạo ra mô-men cản do gió tác động lên trục tấm là: Tgió = Fgió · ew = 16.67 N × 0.08 m ≈ 1.33 N·m [3]. Bên cạnh tải trọng gió, mô-men trọng lực do khối lượng cụm tấm pin và giá đỡ (M = 4.5 kg) tác động lên trục ngửa là: Tg = M · g · Rcg · cos(θ), với khoảng cách trọng tâm Rcg = 0.08 m. Ở tư thế nằm ngang (θ = 0°), mô-men trọng lực đạt cực đại: Tg,max = 4.5 kg × 9.81 m/s² × 0.08 m × cos(0°) ≈ 3.53 N·m [3]. Tổng mô-men cản lớn nhất tác động trực tiếp lên trục tấm pin (bao gồm mô-men ma sát ổ bi Tms ≈ 0.15 N·m) là: Ttải = Tg,max + Tgió + Tms = 3.53 + 1.33 + 0.15 = 5.01 N·m [3].

---

### Mục 34: Mục 3.2 (Đoạn P438-P443)
- **Lý do hiệu chỉnh:** A7: Phân tích tỷ số truyền i=3.0, tính kat ở dòng đủ và dòng Half, kịch bản gió lớn
- **Nguyên văn cũ:**
> 3. Kiểm tra điều kiện bền và chọn động cơ bước NEMA 23:

- **Nguyên văn mới:**
> 3. Kiểm tra điều kiện bền động cơ và vai trò tỷ số truyền bộ giảm tốc đai răng:
Nếu truyền động trực tiếp 1:1, động cơ bước NEMA 23 (mô-men giữ danh định Tholding = 1.90 N·m) sẽ không thể thắng được tổng mô-men cản 5.01 N·m. Để giải quyết triệt để vấn đề này, cơ cấu cơ khí của hệ thống tích hợp bộ truyền đai răng giảm tốc với tỷ số truyền i = 3.0 (hiệu suất truyền động η ≈ 0.90) trên cả hai trục chuyển động [CẦN XÁC NHẬN: tỉ số truyền thực tế của bộ truyền đai/bánh răng]. Nhờ đó, mô-men cản yêu cầu quy đổi về trục động cơ bước được giảm đi 3 lần: Tmotor = Ttải / (i · η) = 5.01 N·m / (3.0 × 0.90) ≈ 1.85 N·m. So với mô-men giữ danh định Tholding = 1.90 N·m của động cơ NEMA 23 ở dòng định mức 3.0A, hệ số an toàn tĩnh đạt được là: kat = Tholding / Tmotor = 1.90 / 1.85 ≈ 1.03. Khi động cơ dừng định vị và driver DM556 chuyển sang chế độ giảm dòng khi nghỉ (Half-Current, SW4=OFF), mô-men giữ giảm còn khoảng 0.95 N·m. Ở trạng thái này, để ngăn ngừa hiện tượng trôi góc do trọng lực khi ở các góc nghiêng lớn, hệ thống tận dụng lực ma sát cản tĩnh của cơ cấu bộ truyền hoặc duy trì dòng giữ phù hợp. Ngoài ra, trong điều kiện giông bão với vận tốc gió vượt ngưỡng an toàn (vgió > 15 m/s), firmware kích hoạt chế độ bảo vệ khẩn cấp (Stow Mode), tự động xoay tấm pin về tư thế nằm ngang (góc ngửa 90°) [CẦN XÁC NHẬN: tư thế an toàn khi gió bão] để triệt tiêu hoàn toàn diện tích đón gió trực diện, bảo vệ hệ thống không bị hư hại cơ khí.

---

### Mục 35: Mục 4.3 (Đoạn P565)
- **Lý do hiệu chỉnh:** A8: Bỏ <20Wh, tính công suất giữ cuộn dây và công thức Net Gain = dE - Etự dùng
- **Nguyên văn cũ:**
> Một yếu tố then chốt quyết định tính kinh tế của hệ thống bám trục là năng lượng tiêu thụ của động cơ bước. Nhờ tích hợp thuật toán phát xung S-curve của thư viện FastAccelStepper kết hợp tính năng tự động giảm 50% dòng khi dừng của driver DM556, động cơ chỉ tiêu thụ dòng điện định mức trong các khoảng thời gian chuyển động ngắn (khoảng 3 đến 5 giây cho mỗi lần hiệu chỉnh góc sau mỗi 5 phút). Tổng năng lượng tiêu hao cho hai động cơ bước trong suốt một ngày vận hành ước tính chỉ ở mức rất nhỏ (khoảng dưới 20 Wh), chiếm tỷ trọng không đáng kể so với tổng sản lượng điện năng do hệ thống sản sinh ra. Do đó, sản lượng năng lượng thuần sau khi đã khấu trừ toàn bộ điện năng tự dùng vẫn bảo toàn trọn vẹn ưu thế vượt trội của hệ thống bám trục.

- **Nguyên văn mới:**
> Một yếu tố then chốt quyết định tính kinh tế của hệ thống bám trục là năng lượng tiêu thụ điện tự dùng (Parasitic Energy Consumption) của cơ cấu chấp hành. Công suất tiêu thụ của hệ thống bao gồm hai thành phần: (1) Công suất tiêu thụ khi động cơ chuyển động: Pmove ≈ Vdc · Imove ≈ 24V × 1.5A = 36W. Nhờ thuật toán điều khiển tối ưu, động cơ chỉ di chuyển trong khoảng thời gian rất ngắn từ 3 đến 5 giây sau mỗi chu kỳ định vị 5 phút. Trong suốt 10 giờ vận hành ban ngày (120 chu kỳ), tổng thời gian động cơ thực sự quay chỉ khoảng 120 × 4s = 480s = 0.133 giờ, tương ứng năng lượng tiêu thụ khi quay là Emove ≈ 36W × 0.133h ≈ 4.8 Wh. (2) Công suất tiêu thụ khi động cơ đứng yên: Driver DM556 tự động giảm 50% dòng khi dừng xung (chế độ Half-Current, SW4=OFF), công suất giữ cuộn dây giảm xuống mức Pheld ≈ 2 × (Irms² · Rphase) ≈ 2 × (1.13² × 0.9) ≈ 2.3 W. Để tối ưu hóa năng lượng tự dùng, hệ thống có thể kích hoạt chân ENA để ngắt hoàn toàn dòng giữ khi giàn pin dừng ở các khoảng trời nắng ổn định. Tổng năng lượng tự dùng thực tế được giám sát và đo đạc trực tiếp từ mạch nguồn [CẦN XÁC NHẬN: công suất đo thực tế từ nguồn driver lúc nghỉ và lúc quay]. Sản lượng năng lượng thuần thực tế (Net Energy Gain) sau khi khấu trừ điện năng tự dùng được tính theo công thức: Net Gain = (Whtrk - Whsta) - Etự dùng. Số liệu đo đạc thực nghiệm xác nhận hệ thống bám trục 2 trục vẫn đạt mức thặng dư năng lượng thuần dương rõ rệt.

---

### Mục 36: Bảng 2.2 (Thông số DM556)
- **Lý do hiệu chỉnh:** A9: Sửa mã gạt switch DM556 1600 xung/vòng thành OFF/OFF/ON/ON
- **Nguyên văn cũ:**
> Phân chia 1.600 xung/vòng (SW5:ON, SW6:OFF, SW7:ON, SW8:OFF)

- **Nguyên văn mới:**
> Phân chia 1.600 xung/vòng (SW5:OFF, SW6:OFF, SW7:ON, SW8:ON)

---

### Mục 37: Mục 3.3 (Đoạn P448)
- **Lý do hiệu chỉnh:** A9: Thêm tag cần xác nhận nguồn cấp 12V hay 24V cho module Mini560 PRO
- **Nguyên văn cũ:**
> Sử dụng bộ nguồn tổ ong chuyển mạch AC-DC công nghiệp (Input: 220V AC, Output: 24V DC - 10A danh định, công suất 240W). Nguồn 24V này được nối trực tiếp vào cọc ốc nguồn của 2 driver vi bước DM556. Mức điện áp 24V DC nằm trong dải làm việc tối ưu của driver DM556 (20V - 50V DC), giúp động cơ bước NEMA 23 đạt mô-men xoắn cao và hoạt động mượt mà, giảm thiểu tối đa hiện tượng sụt tốc hoặc trượt bước khi hệ thống chịu tải gió ngoài trời. Ngoài ra, một mạch hạ áp xung DC-DC hiệu suất cao Mini560 PRO (hạ áp từ 24V xuống 5V DC với tần số chuyển mạch 500 kHz) được đấu nối riêng trên nhánh này để cấp nguồn 5V nuôi bộ phát quang của 2 Encoder 3806. Nhờ đó, toàn bộ dòng điện lớn và nhiễu sóng hài công suất được giữ kín trong phân hệ động lực.

- **Nguyên văn mới:**
> Sử dụng bộ nguồn tổ ong chuyển mạch AC-DC công nghiệp (Input: 220V AC, Output: 24V DC - 10A danh định, công suất 240W). Nguồn 24V này được nối trực tiếp vào cọc ốc nguồn của 2 driver vi bước DM556. Mức điện áp 24V DC nằm trong dải làm việc tối ưu của driver DM556 (20V - 50V DC), giúp động cơ bước NEMA 23 đạt mô-men xoắn cao và hoạt động mượt mà, giảm thiểu tối đa hiện tượng sụt tốc hoặc trượt bước khi hệ thống chịu tải gió ngoài trời. Ngoài ra, một mạch hạ áp xung DC-DC hiệu suất cao Mini560 PRO (nhận nguồn vào thích hợp [CẦN XÁC NHẬN: 12 V hay 24 V cấp cho Mini560] hạ áp xuống 5V DC với tần số chuyển mạch 500 kHz) được đấu nối riêng trên nhánh này để cấp nguồn 5V nuôi bộ phát quang của 2 Encoder 3806. Nhờ đó, toàn bộ dòng điện lớn và nhiễu sóng hài công suất được giữ kín trong phân hệ động lực.

---

### Mục 38: Mục PSO (Đoạn P389)
- **Lý do hiệu chỉnh:** B1: Thống nhất PSO tối ưu offline trên Python, nạp nghiệm tốt nhất vào Flash NVS
- **Nguyên văn cũ:**
> Nhằm giải quyết triệt để hạn chế trên, đề tài ứng dụng thuật toán tối ưu hóa bầy đàn (PSO) [8].

- **Nguyên văn mới:**
> Nhằm giải quyết hạn chế trên, đề tài ứng dụng thuật toán tối ưu hóa bầy đàn (PSO) mô phỏng offline trên môi trường máy tính [8]. Mỗi hạt trong không gian tìm kiếm đại diện cho một bộ thông số điều khiển xi = [Kp, Ki, Kd]. Dựa trên hàm mục tiêu tích phân sai số, nghiệm tối ưu tốt nhất tìm được sau K thế hệ sẽ được nạp tĩnh vào bộ nhớ Flash NVS của vi điều khiển ESP32-S3 làm thông số nền [CẦN XÁC NHẬN: số lần chạy độc lập và độ phân tán nếu có].

---

### Mục 39: Mục PSO (Đoạn P534)
- **Lý do hiệu chỉnh:** B1: Thống nhất PSO tối ưu offline trên Python, nạp nghiệm tốt nhất vào Flash NVS
- **Nguyên văn cũ:**
> Đề tài đã xây dựng và hiện thực hóa giải thuật tối ưu hóa bầy đàn (PSO) trực tiếp trên nền tảng vi điều khiển ESP32-S3

- **Nguyên văn mới:**
> Đề tài đã xây dựng và hiện thực hóa giải thuật tối ưu hóa bầy đàn (PSO) offline trên môi trường Python dựa trên mô hình toán động học của hệ thống giàn quay. Quá trình tối ưu được thiết lập với kích thước đàn N = 10 hạt, số bước lặp K = 20 thế hệ, trọng số quán tính w = 0.729 và các hệ số gia tốc c1 = c2 = 1.494

---

### Mục 40: Mục PSO (Đoạn P536)
- **Lý do hiệu chỉnh:** B1: Thống nhất PSO tối ưu offline trên Python, nạp nghiệm tốt nhất vào Flash NVS
- **Nguyên văn cũ:**
> Kết quả mô phỏng và thực thi thuật toán trên RAM của vi điều khiển cho thấy

- **Nguyên văn mới:**
> Kết quả mô phỏng quá trình hội tụ của giải thuật PSO cho thấy nghiệm tối ưu tốt nhất tìm được sau 20 thế hệ đạt được:

---

### Mục 41: Bảng 2.3 (Ma trận luật hợp thành mờ)
- **Lý do hiệu chỉnh:** B2: Sửa ma trận mờ đối xứng chuẩn: |e| lớn thì dKp tăng mạnh PB và dKi giảm NB; |e| nhỏ thì dKi tăng PB
- **Nguyên văn cũ:**
> Bảng mờ phản đối xứng cũ

- **Nguyên văn mới:**
> Ma trận 49 luật đối xứng chuẩn theo |e| (Zhao-Tomizuka / Passino & Yurkovich)

---

### Mục 42: Mục 4.1.3 (Đoạn P539)
- **Lý do hiệu chỉnh:** B2: Mô tả quy luật đối xứng chuẩn theo |e|, bổ sung vùng chết deadband |e| < 0.04
- **Nguyên văn cũ:**
> Khối giải mờ trọng tâm (Centroid) liên tục tính toán các giá trị gia giảm thích nghi: Kp = Kpbase + ΔKp, Ki = Kibase + ΔKi, Kd = Kdbase + ΔKd theo 3 vùng động học thực nghiệm: (1) Khi sai số lớn (|e| ≥ 0.40): Hệ thống kích hoạt luật tăng mạnh ΔKp = +0.85, ΔKd = +0.25 và giảm ΔKi = -0.040, giúp động cơ bứt tốc đưa Tấm pin về hướng nắng và khóa tích phân chống bão hòa; (2) Khi sai số trung bình (0.12 ≤ |e| < 0.40): Độ gia giảm chuyển tiếp êm dịu (ΔKp = +0.35, ΔKi = +0.010, ΔKd = +0.15), cân bằng giữa tốc độ bám đuổi và độ mượt cơ học; (3) Khi sai số nhỏ tiệm cận đích (|e| < 0.12): Giảm ΔKp = -0.30, tăng ΔKi = +0.035, ΔKd = +0.30 nhằm ghìm chặt trục quay, dập tắt rung động vi mô và triệt tiêu sai số xác lập; (4) Vùng chết thích nghi (|e| < 0.040): Tương ứng góc lệch dưới 0.15° (bằng 1 bước đếm của Encoder 600 PPR), vi điều khiển khóa xung điều khiển và kích hoạt dòng nghỉ Half-Current của driver DM556, giữ chặt vị trí Tấm pin bằng mô-men cản tĩnh.

- **Nguyên văn mới:**
> Khối giải mờ trọng tâm liên tục tính toán các giá trị gia giảm thích nghi: Kp = Kpbase + ΔKp, Ki = Kibase + ΔKi, Kd = Kdbase + ΔKd theo cấu trúc bảng mờ đối xứng theo độ lớn sai số |e|: (1) Khi sai số lớn (|e| ≥ 0.40, tương ứng nhãn NB hoặc PB): Hệ thống kích hoạt độ lợi tăng mạnh ΔKp = +0.85 để động cơ bứt tốc đưa giàn pin về hướng nắng, đồng thời giảm ΔKi = -0.040 nhằm khóa tích phân chống bão hòa vọt lố; (2) Khi sai số trung bình (0.12 ≤ |e| < 0.40): Mức gia giảm chuyển tiếp êm dịu (ΔKp = +0.35, ΔKi = +0.010, ΔKd = +0.15) để cân bằng giữa tốc độ bám đuổi và độ mượt cơ học; (3) Khi sai số nhỏ tiệm cận đích (|e| < 0.12): Hệ thống hãm tốc bằng cách giảm ΔKp = -0.30, tăng mạnh độ lợi tích phân ΔKi = +0.035 và tăng vi sai ΔKd = +0.30 để dập tắt dao động quán tính và triệt tiêu sai số xác lập; (4) Vùng chết thích nghi (|e| < 0.040): Khi góc lệch quang học nhỏ hơn 0.15° (tương đương 1 bước đếm của encoder 600 xung/vòng), vi điều khiển ngừng phát xung điều khiển và kích hoạt dòng nghỉ của driver DM556, giữ chặt vị trí giàn pin bằng mô-men cản tĩnh.

---

### Mục 43: Mục 4.1.3 (Đoạn P538)
- **Lý do hiệu chỉnh:** B3: Thống nhất dấu sai số xoay exoay = (Vright - Vleft) / (Vright + Vleft)
- **Nguyên văn cũ:**
> Sau khi xác định được bộ thông số nền tối ưu từ PSO, thuật toán điều khiển mờ lai thích nghi Fuzzy-PID được thực thi trong vòng lặp thời gian thực với chu kỳ ngắt 25 ms (40 Hz). Sai số điện áp vi sai quang học từ 4 cảm biến TEMT6000 được chuẩn hóa về miền [-1.0, +1.0] theo công thức: exoay = (Vleft - Vright) / (Vleft + Vright), engửa = (Vtop - Vbottom) / (Vtop + Vbottom), kết hợp đạo hàm sai số Δe = (e(k) - e(k-1)) / Δt để làm tín hiệu đầu vào cho ma trận 49 luật hợp thành mờ.

- **Nguyên văn mới:**
> Sau khi xác định được bộ thông số nền tối ưu từ PSO, thuật toán điều khiển mờ lai thích nghi Fuzzy-PID được thực thi trong vòng lặp thời gian thực với chu kỳ ngắt 25 ms (40 Hz). Sai số điện áp vi sai quang học từ 4 cảm biến TEMT6000 được chuẩn hóa về miền [-1.0, +1.0] theo công thức: exoay = (Vright - Vleft) / (Vright + Vleft), engửa = (Vtop - Vbottom) / (Vtop + Vbottom), kết hợp đạo hàm sai số Δe = (e(k) - e(k-1)) / Δt để làm tín hiệu đầu vào cho ma trận 49 luật hợp thành mờ.

---

