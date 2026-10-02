# HƯỚNG DẪN SỬ DỤNG WEB DASHBOARD GIÁM SÁT HỆ THỐNG ĐIỀU HƯỚNG PIN MẶT TRỜI THÔNG MINH
**Đồ Án Tốt Nghiệp: Hệ thống điều hướng pin mặt trời 2 trục ứng dụng Fuzzy Logic và PSO**  
*Khoa Điện – Điện tử, Trường Đại học Tôn Đức Thắng (TDTU)*

---

## 1. Hướng Dẫn Khởi Động Nhanh (Quick Start)

### Cách 1: Chạy bằng 1-Click (Khuyên Dùng)
- Nhấp đúp vào file [`Chay_Dashboard.bat`](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/Chay_Dashboard.bat) tại thư mục gốc.
- Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:3000`.

### Cách 2: Khởi động qua Terminal / Command Prompt
```bash
cd "d:\ĐỒ ÁN TỐT NGHIỆP\dashboard"
npm run dev
```

---

## 2. Các Tính Năng & Khối Chức Năng Trên Giao Diện

### 🌟 Phong cách thiết kế (Dark Minimalist Monochromatic Theme)
- Phối màu theo sắc độ xám thép, đen sâu và trắng kỹ thuật (`#090a0c`, `#111216`, `#14161c`, `#ededed`) lấy cảm hứng từ giao diện trạm trung tâm điều khiển công nghiệp (*Diana Central Station*).
- Sử dụng icon nét đơn đơn sắc (Uncolored Lucide Icons), phông chữ kỹ thuật `JetBrains Mono` cho các số liệu đo lường tức thời, tối ưu độ tương phản và loại bỏ hoàn toàn các màu sắc lòe loẹt gây rối mắt.

---

### 1. Header & Trạng Thái Hệ Thống
- **Tiêu đề dự án:** `SMART DUAL-AXIS ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR DASHBOARD (Fuzzy-PID & PSO)`.
- **Badge trạng thái kết nối:** 
  - `ESP32 (SIMULATED)` khi đang chạy bộ giả lập quỹ đạo mặt trời thời gian thực.
  - `ESP32-S3 ONLINE` khi kết nối trực tiếp với ESP32 qua WebSocket kèm thông số Ping/Latency (ms).
- **Badge chế độ vận hành:** `AUTO (FUZZY-PID)` / `MANUAL CONTROL` / `CALIBRATION` / `PARK (NIGHT)`.
- **Đồng hồ RTC/NTP:** Hiển thị giờ:phút:giây và ngày tháng thời gian thực.
- **Thanh cảnh báo sự cố:** Tự động kích hoạt khi có chạm công tắc hành trình (`LS_MIN`/`LS_MAX`), mất tín hiệu cảm biến hoặc nút dừng khẩn cấp (`E-STOP`).

---

### 2. Khối KPI & Dữ Liệu Tức Thời (So Sánh 2 Tấm Pin)
Được đo độc lập bằng 2 cảm biến dòng/áp kỹ thuật số INA219 (giao tiếp I2C):
1. **Tấm pin Tracking (Fuzzy-PID + PSO):**
   - Điện áp ($V_{trk}$), Dòng điện ($I_{trk}$), Công suất tức thời ($P_{trk}$ tính bằng Watt).
   - Năng lượng tích lũy trong ngày (Wh và kWh).
2. **Tấm pin Static (Cố định nghiêng 15° Nam):**
   - Điện áp ($V_{sta}$), Dòng điện ($I_{sta}$), Công suất tức thời ($P_{sta}$).
   - Năng lượng tích lũy trong ngày (Wh và kWh).
3. **Thẻ Hiệu Suất Cải Thiện (% Gain):**
   - Tự động tính toán mức chênh lệch: $\text{\% Gain} = \frac{P_{trk} - P_{sta}}{P_{sta}} \times 100\%$.
   - Hiển thị $\Delta P$ (Watt) và $\Delta E$ (Wh) năng lượng thu hoạch vượt trội.

---

### 3. Khối Cơ Cấu Chấp Hành & Cảm Biến Quang
- **Động cơ bước 2 trục NEMA 23:**
  - **Trục ngang (Azimuth):** Góc hiện tại (°), góc mục tiêu (°), sai số góc $e$, số xung Encoder (Closed-loop), trạng thái công tắc hành trình Min/Max.
  - **Trục đứng (Elevation):** Góc hiện tại (°), góc mục tiêu (°), sai số góc $e$, số xung Encoder, trạng thái công tắc hành trình Min/Max.
- **Cụm 4 cảm biến quang TEMT6000:**
  - Bố trí trực quan dạng la bàn 4 hướng (Trên / Dưới / Trái / Phải).
  - Hiển thị giá trị quang thông (Lux) và giá trị số ADC 12-bit ($0 - 4095$).
  - **Tâm điểm lệch quang (Sun Centroid Target):** Điểm tròn phát sáng di chuyển trực quan theo hướng lệch của mặt trời so với bề mặt tấm pin.

---

### 4. Khối Giám Sát Thuật Toán (Fuzzy-PID & PSO)
- **Fuzzy-PID Controller:**
  - Hiển thị sai số góc $e(t)$ và tốc độ thay đổi sai số $\Delta e(t)$.
  - 3 thanh đo biểu diễn các hệ số tự thích nghi thời gian thực: $K_p, K_i, K_d$.
  - Hiển thị luật mờ đang kích hoạt (Active Fuzzy Rule).
- **PSO (Particle Swarm Optimization):**
  - Giá trị Fitness tối ưu toàn cục ($G_{best}$).
  - Số vòng lặp bầy đàn ($k / k_{max}$).
  - Tọa độ góc tối ưu toàn cục $(\theta_{AZ}^*, \theta_{EL}^*)$.
  - Nút **"Tối ưu lại"** để kích hoạt chu trình tìm kiếm PSO.

---

### 5. Khối Đồ Thị Thời Gian Thực (Chart.js)
1. **Đồ thị 1 (Real-time Line Chart):**
   - So sánh đường cong công suất tức thời $P_{trk}$ vs $P_{sta}$ xuyên suốt trong ngày (từ 06:00 đến 18:00).
2. **Đồ thị 2 (Bar Chart 30 Ngày):**
   - Biểu đồ cột so sánh sản lượng thu hoạch năng lượng (kWh) của 30 ngày thử nghiệm.
   - Hỗ trợ bộ lọc xem nhanh 7 Ngày / 14 Ngày / 30 Ngày.

---

### 6. Bảng Điều Khiển Thủ Công (Manual Control Modal)
- Nút bấm Jog 4 hướng:
  - Azimuth: Trái ($-AZ$) / Phải ($+AZ$).
  - Elevation: Lên ($+EL$) / Xuống ($-EL$).
  - Tùy chỉnh bước xoay: $0.5^\circ, 1.0^\circ, 5.0^\circ, 10.0^\circ$.
- Nút đổi chế độ: `Tự Động (Fuzzy-PID)` / `Thủ Công (Jog)` / `Park Mode (Về góc an toàn ban đêm)` / `Cân chỉnh (Home)`.
- Nút **E-STOP (Dừng khẩn cấp)** có khóa an toàn.

---

### 7. Tích Hợp ESP32-S3 (Live Hardware)
- Nhấp vào biểu tượng **Cài đặt (Bánh răng)** ở góc trên bên phải để:
  1. Chuyển đổi giữa chế độ **Giả lập (Mock Data)** và **Phần cứng ESP32-S3 thật**.
  2. Cấu hình địa chỉ WebSocket (`ws://192.168.4.1/ws` hoặc IP LAN) và REST API.
  3. Xem luồng gói tin **JSON Telemetry** thô thời gian thực.
  4. Sao chép trực tiếp mã nguồn mẫu C++ cho ESP32 (Arduino IDE / ESP-IDF) phát WebSocket server và đọc dữ liệu INA219.

---

## 3. Cấu Trúc Mã Nguồn (Source Tree)

```text
d:\ĐỒ ÁN TỐT NGHIỆP\
├── Chay_Dashboard.bat                     # File chạy nhanh 1-click
├── README_HUONG_DAN.md                    # Tài liệu hướng dẫn sử dụng
└── dashboard/                             # Mã nguồn Web Application
    ├── index.html                         # Entry HTML
    ├── package.json                       # Dependencies (React, Chart.js, Lucide)
    ├── vite.config.js                     # Vite build configuration
    └── src/
        ├── App.jsx                        # Root Controller & State Hub
        ├── index.css                      # Minimalist Dark Theme Design Tokens
        ├── main.jsx                       # React Bootstrap Entry
        ├── services/
        │   ├── mockDataService.js         # Bộ mô phỏng toán học Solar + Fuzzy + PSO
        │   └── esp32Service.js            # Trình quản lý WebSocket & REST API
        └── components/
            ├── Header.jsx                 # Thanh tiêu đề, RTC, Badges & Alarms
            ├── KpiCards.jsx               # So sánh INA219 Tracking vs Static + % Gain
            ├── ActuatorsAndSensors.jsx    # Góc trục NEMA 23 & 4 Cảm biến TEMT6000
            ├── AlgorithmMonitor.jsx       # Giám sát Fuzzy-PID & PSO Convergence
            ├── ChartsSection.jsx          # Đồ thị Real-time Line & 30-Day Bar
            ├── ManualControlModal.jsx     # Bảng điều khiển Jog & đổi chế độ
            └── SettingsModal.jsx          # Cài đặt ESP32 & Trình xem JSON
```
