# HƯỚNG DẪN TEST PHẦN CỨNG & ĐỒNG BỘ WEB DASHBOARD (BENCH TEST)
**Đồ Án Tốt Nghiệp: Hệ Thống Giám Sát & Điều Khiển Giàn Pin Mặt Trời 2 Trục (ESP32-S3 N16R8)**

---

## 📌 TỔNG QUAN TÌNH TRẠNG HỆ THỐNG
* **Firmware:** Đã tích hợp đầy đủ Driver Động cơ bước NEMA 23, Encoder 3806, CTHT Home, RTC DS3231, 4 cảm biến TEMT6000 và **tự động đẩy Telemetry lên Firebase Realtime Database**.
* **Mạng WiFi:** Đã cấu hình SSID: `Tyny` | Mật khẩu: `11860868`.
* **Database Firebase:** `final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app`.
* **Trục 1 (Azimuth - Trục dưới):** Công tắc hành trình (GPIO 18) đã hoạt động chuẩn xác và chống nhiễu 100%.

---

## ⚡ MỤC 1: QUY TẮC ĐẤU NGUỒN AN TOÀN KHI TEST BÀN (VỪA CẮM USB VỪA CẤP NGUỒN BUCK)

> [!CAUTION]
> **Hiện tượng:** Khi chỉ cắm USB máy tính, chân 5V của ESP32 đo chỉ được ~3.3V - 3.7V vì trên bo mạch ESP32-S3 có diode bảo vệ chặn dòng ngược ra ngoài. Điện áp này **không đủ để nuôi Encoder quang 3806 (cần 5.0V chuẩn)**, dẫn đến việc Encoder không phát xung.
> 
> **Tuyệt đối KHÔNG cắm dây 5V của mạch Buck vào chân 5V của ESP32 khi đang cắm cáp USB vào máy tính!** Sự chênh lệch áp giữa mạch Buck và cổng USB máy tính có thể làm dòng điện xông ngược làm hỏng cổng USB máy tính.

### ✅ Sơ đồ đấu nguồn an toàn tuyệt đối 100%:
```
[Nguồn tổ ong 24V] 
       │
       ├───> Cấp 24V vào V+ / GND của 2 Driver DM556
       │
       └───> Cấp 24V vào IN+ / IN- của Mạch hạ áp Buck (chỉnh chiết áp ra đúng 5.0V)
                   │
                   ├── [OUT + 5.0V] ───> CHỈ cấp cho Dây ĐỎ (VCC) của 2 Encoder 3806
                   │                     (KHÔNG cắm vào chân 5V của ESP32)
                   │
                   └── [OUT - GND ] ───┬───> Dây ĐEN (GND) của 2 Encoder 3806
                                       └───> Chân GND của bo mạch ESP32-S3 (BẮT BUỘC)

[Cáp USB Type-C] ───> Cắm trực tiếp từ Máy tính vào cổng UART của ESP32-S3
                     (Tự nuôi chip ESP32 và truyền dữ liệu Serial Monitor an toàn)
```

---

## 🛠️ MỤC 2: KIỂM TRA CÔNG TẮC HÀNH TRÌNH TRỤC TRÊN (CTHT 2 - GPIO 21)

### 1. Vị trí chân GPIO 21 trên mạch ESP32-S3 (Hàng J3 bên phải):
* Đếm từ dưới đáy lên (phía 2 cổng USB Type-C):
  * Chân 1 (dưới cùng): `GND`
  * Chân 2: `GND`
  * Chân 3: `GPIO 19`
  * Chân 4: `GPIO 20`
  * **Chân 5: GPIO 21** *(Chính là chân này! Tránh cắm nhầm vào chân 19 hoặc 20).*

### 2. Kiểm tra chân trên Microswitch:
* Nối 1 dây vào chân **COM** $\rightarrow$ cắm vào **GND**.
* Nối 1 dây vào chân **NO** (Normally Open) $\rightarrow$ cắm vào **GPIO 21**.
* *(Không cắm vào chân NC hoặc cặp NO-NC).*

### 3. Thao tác test chẩn đoán nhanh:
1. Mở Serial Monitor (115200 baud), gõ phím **`T`** rồi nhấn Enter.
2. Lấy tay đè giữ công tắc trên, gõ tiếp phím **`T`**:
   * Nếu `Doc:` đổi từ `1` thành `0` $\rightarrow$ Đấu nối chuẩn.
   * Nếu `Doc:` vẫn giữ nguyên là `1` $\rightarrow$ Lấy 1 sợi dây test cắm trực tiếp từ **GPIO 21** chạm vào chân **GND** bên cạnh. Nếu màn hình hiện `[CTHT 2 TRIGGERED]` thì khẳng định ESP32 tốt, chỉ cần kiểm tra lại dây hoặc công tắc cơ khí.

---

## 🧭 MỤC 3: KIỂM TRA 2 BỘ ENCODER 3806 (600 PPR)

### 1. Sơ đồ màu dây chuẩn của Encoder 3806:
* **Dây Đỏ:** Nguồn VCC $\rightarrow$ Nối vào **5V OUT của mạch Buck**.
* **Dây Đen:** Mass GND $\rightarrow$ Nối vào **GND chung**.
* **Dây Trắng:** Pha A.
* **Dây Xanh Lá:** Pha B.
* **Dây Bạc (Shield):** Lưới chống nhiễu $\rightarrow$ Nối vào GND chung.

### 2. Bẫy chân cắm GPIO trên ESP32-S3 (Hàng J1 bên trái):
* **Encoder 1 (Trục 1 - Azimuth):**
  * Pha A (Trắng): **GPIO 14** $\rightarrow$ **Nằm ở Chân số 20 (Sát đáy, ngay cạnh chân 5V và GND)**! *(Cảnh báo: Chân số 14 đếm từ trên xuống là GPIO 46, không phải GPIO 14).*
  * Pha B (Xanh lá): **GPIO 15** $\rightarrow$ Nằm ở Chân số 8 (đếm từ trên xuống).
* **Encoder 2 (Trục 2 - Elevation):**
  * Pha A (Trắng): **GPIO 16** $\rightarrow$ Chân số 9.
  * Pha B (Xanh lá): **GPIO 17** $\rightarrow$ Chân số 10.

### 3. Cách test:
* Gõ phím **`T`** trên Serial Monitor.
* Dùng tay xoay nhẹ trục Encoder: Hai pha `A` và `B` sẽ liên tục đổi trạng thái (`0,0` $\rightarrow$ `0,1` $\rightarrow$ `1,1` $\rightarrow$ `1,0`) và số đếm `Cnt` sẽ nhảy ngay!

---

## 💻 MỤC 4: DANH SÁCH LỆNH PHÍM TẮT TRÊN SERIAL MONITOR (115200 BAUD)

| Phím bấm | Chức năng chi tiết |
| :---: | :--- |
| **`T`** | **Diagnostic:** Kiểm tra mức logic tức thời của tất cả các chân (CTHT, Encoder A/B, RTC, TEMT6000). |
| **`L`** | **Đọc cảm biến quang Live:** Hiển thị ADC của 4 mắt TEMT6000 (Top, Bot, Left, Right). |
| **`C`** | **Đồng hồ RTC DS3231:** Quét bus I2C và in ngày giờ, nhiệt độ hiện tại. |
| **`1`** | Chuyển sang điều khiển **Trục 1 (Azimuth - Xoay Ngang)**. |
| **`2`** | Chuyển sang điều khiển **Trục 2 (Elevation - Độ Ngửa)**. |
| **`A` / `D`** | Quay bước (400 bước) về hướng Home / Ra xa Home. |
| **`Q` / `E`** | Quay liên tục về hướng Home (chạm tự dừng) / Ra xa Home. |
| **`H`** | **Dual Auto Homing:** Cả 2 trục cùng tự động chạm công tắc Home rồi lùi về vị trí mặc định. |
| **`O`** | **Bật / Tắt chế độ bám sáng tự động (Optical Tracking):** Soi đèn pin vào giàn pin sẽ tự quay bám theo đèn! |
| **`M`** | Lưu vị trí hiện tại làm mốc mặc định (ghi nhớ vĩnh viễn vào bộ nhớ Flash NVS). |
| **`0` (số 0)**| Đặt góc hiện tại về `0.0°`. |
| **`Space` / `X`** | **DỪNG KHẨN CẤP TOÀN BỘ HỆ THỐNG.** |

---

## 🌐 MỤC 5: KHỞI ĐỘNG VÀ GIÁM SÁT TRÊN WEB DASHBOARD

1. **Khởi động Web:** Nhấp đúp vào file [`Chay_Dashboard.bat`](file:///d:/ĐỒ%20ÁN%20TỐT%20NGHIỆP/Chay_Dashboard.bat) tại thư mục gốc của dự án.
2. Trình duyệt tự mở tại: `http://localhost:3000`.
3. Khi ESP32 kết nối WiFi `Tyny`:
   * Badge trạng thái trên Web sẽ chuyển sang màu xanh: **`ESP32-S3 ONLINE`**.
   * Cụm 4 cảm biến quang TEMT6000 trên Web sẽ nhảy số liên tục theo cường độ ánh sáng chiếu vào.
   * Góc xoay và xung Encoder hiển thị đồng bộ thời gian thực.

---

## 🚀 MỤC 6: LỆNH NẠP CODE QUA TERMINAL
```powershell
& "C:\Users\ADMIN\.platformio\penv\Scripts\pio.exe" run -e esp32_devkit_test -t upload
```
