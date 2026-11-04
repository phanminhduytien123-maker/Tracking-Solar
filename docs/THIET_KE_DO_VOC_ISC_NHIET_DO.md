# TÀI LIỆU THIẾT KẾ HỆ THỐNG ĐO VOC, ISC VÀ NHIỆT ĐỘ (SOLAR TRACKER 2 TRỤC)

> **Dự án**: Nghiên cứu & Thiết kế Hệ thống Pin Năng lượng Mặt trời Tự bám đa trục (Dual-Axis Solar Tracker)  
> **Tài liệu tham khảo**: Bài báo MDPI Sustainability (2022) (*Figure 9: Switching circuit and voltage–current measurement*) và Luận văn tốt nghiệp (Đoàn Ngọc Tài & Nguyễn Lê Quốc Hổ).  
> **Đối tượng đo**: So sánh giữa **Tấm pin Tracker** (chủ động bám nắng) và **Tấm pin Cố định (Static)**.

---

## 1. MỤC TIÊU & NGUYÊN LÝ HOẠT ĐỘNG

### 1.1 Mục tiêu
1. Đo điện áp hở mạch ($V_{oc}$ - Open Circuit Voltage) của cả 2 tấm pin.
2. Đo dòng điện ngắn mạch ($I_{sc}$ - Short Circuit Current) của cả 2 tấm pin.
3. Đo nhiệt độ bề mặt tấm pin ($T_{trk}, T_{sta}$) sử dụng 2 cảm biến nhiệt số DS18B20 độc lập.
4. Chu kỳ đo: **10 giây một lần** (hoặc cấu hình tùy chọn).
5. Không làm gián đoạn thuật toán tracking, không làm mất bước động cơ bước NEMA 23, không chặn CPU (`non-blocking millis state machine`).
6. Dữ liệu được đồng bộ lên Firebase Realtime Database và hiển thị trực quan trên Web Dashboard (phân tích so sánh 30 ngày).

---

## 2. SƠ ĐỒ CHÂN (PIN MAP ESP32-S3 WROOM-1U)

### 2.1 Các chân di dời để giải phóng ADC1
Để đo đồng thời $V_{oc}$ và $I_{sc}$ của 2 tấm pin (tổng cộng 4 kênh Analog), bắt buộc phải sử dụng **ADC1** vì ADC2 của ESP32-S3 bị xung đột phần cứng với Wi-Fi (gây sai lệch số đo hoặc rớt mạng khi Wi-Fi truyền nhận).

- **Encoder 1 Pha A**: `GPIO 38` (cũ là GPIO 6)
- **Encoder 1 Pha B**: `GPIO 39` (cũ là GPIO 7)
- **Driver DM556 #1 Xung PUL+**: `GPIO 40` (cũ là GPIO 10)

### 2.2 Các chân cảm biến mới bổ sung
| Chân ESP32 | Tên chức năng | Thiết bị ngoại vi kết nối | Kênh ADC / Giao tiếp |
| :--- | :--- | :--- | :--- |
| **GPIO 5** | `VOC_TRK_PIN` | Module FZ0430 #1 (Chân Signal S) - Tấm Tracker | ADC1_CH4 |
| **GPIO 6** | `ISC_TRK_PIN` | Module ACS712 #1 (Chân OUT) - Tấm Tracker | ADC1_CH5 (qua cầu chia 10k/20k) |
| **GPIO 7** | `VOC_STA_PIN` | Module FZ0430 #2 (Chân Signal S) - Tấm Cố định | ADC1_CH6 |
| **GPIO 10** | `ISC_STA_PIN` | Module ACS712 #2 (Chân OUT) - Tấm Cố định | ADC1_CH9 (qua cầu chia 10k/20k) |
| **GPIO 14** | `RELAY_A_PIN` | Relay A (Cắt tải INA226) - Kích chung 2 relay | Digital Output |
| **GPIO 41** | `RELAY_B_PIN` | Relay B (Ngắn mạch đo Isc) - Kích chung 2 relay | Digital Output |
| **GPIO 42** | `ONEWIRE_PIN` | Bus 1-Wire (2x DS18B20 nhiệt độ) | 1-Wire Digital (Pull-up 4.7kΩ lên 3.3V) |

### 2.3 Các chân giữ nguyên 100%
- `GPIO 8` (SDA), `GPIO 9` (SCL): I2C cho DS3231 RTC và 2x INA226 (0x40/0x44 và 0x41).
- `GPIO 47`: DS3231 SQW ngắt báo thức (Wakeup).
- `GPIO 1, 2, 3, 4`: Cảm biến quang trở TEMT6000 (TOP, BOT, LFT, RGT).
- `GPIO 11, 12, 13, 16, 17, 18, 21`: Điều khiển động cơ M1 DIR, M2 PUL/DIR, Encoder 2, Switch Home 1 & 2.
- `GPIO 46`: Status LED.
- Tránh tuyệt đối: `GPIO 0, 35, 36, 37, 45`.

---

## 3. NGUYÊN LÝ ĐẤU NỐI PHẦN CỨNG (FIGURE 9 MDPI)

### 3.1 Mạch Relay chuyển mạch đo cho mỗi tấm pin
Mỗi tấm pin trang bị 2 Relay (Relay A và Relay B):
- **Cực dương Panel (P+)**: Nối vào chân chung **COM của Relay A**.
- **Chân thường đóng (NC) của Relay A**: Nối tới cực IN+ của cảm biến công suất **INA226** rồi đi ra tải tiêu thụ (Tải ắc quy / biến trở tải).
- **Chân thường mở (NO) của Relay A**: Nối qua chân dòng của cảm biến **ACS712**, sau đó nối vào chân **NO của Relay B**.
- **Chân COM của Relay B**: Nối về cực âm của tấm pin **Panel (P−)**.
- **Module chia áp FZ0430**: Mắc song song trực tiếp 2 cực tấm pin (trước Relay A), luôn luôn nối với P+ và P−.

### 3.2 Bảng trạng thái hoạt động
| Relay A | Relay B | Trạng thái hệ thống | Mục đích đo |
| :---: | :---: | :--- | :--- |
| **OFF** | **OFF** | **Bình thường (Normal)**: Tấm pin cấp điện cho tải qua tiếp điểm NC của Relay A. ACS712 ngắt hoàn toàn. | INA226 đo điện áp, dòng điện, công suất và năng lượng thực tế cấp cho tải. |
| **ON** | **OFF** | **Hở mạch (Open Circuit)**: Relay A bật, ngắt tải. Dòng qua tấm pin = 0A. | FZ0430 đo điện áp hở mạch **$V_{oc}$**. ACS712 đo điện áp offset điểm 0A ($V_{offset}$). |
| **ON** | **ON** | **Ngắn mạch (Short Circuit)**: Cực P+ thông qua Relay A (NO) -> ACS712 -> Relay B (NO) -> P−. | ACS712 đo dòng ngắn mạch **$I_{sc}$**. |
| **OFF** | **ON** | *Không sử dụng* (Phần mềm cấm tuyệt đối). | Không có đường ngắn mạch. |

### 3.3 Cơ chế an toàn (Fail-Safe & Interlock)
1. **Mất điện nguồn**: Cả 2 relay tự động nhả về trạng thái OFF $\rightarrow$ hệ thống tự động duy trì cấp điện cho tải bình thường qua tiếp điểm NC.
2. **Khởi động an toàn**: Khi ESP32 vừa boot hoặc reset, chân GPIO 14 và GPIO 41 được kéo mức logic TẮT ngay lập tức trước khi chạy bất kỳ ngoại vi nào.
3. **Interlock phần mềm**:
   - Chỉ được phép bật Relay B khi Relay A đã bật ổn định ($\ge 300\text{ ms}$).
   - Luôn nhả Relay B trước (cắt ngắn mạch) $\rightarrow$ chờ $50\text{ ms}$ $\rightarrow$ mới nhả Relay A (đóng lại tải).
4. **Giới hạn thời gian ngắn mạch**: Relay B chỉ đóng trong vòng **$\le 350\text{ ms}$**, đủ để lấy 100 mẫu ADC lọc nhiễu rồi ngắt ngay, tuyệt đối không gây phát nhiệt quá mức cho tấm pin hay tiếp điểm relay.
5. **Watchdog khẩn cấp**: Nếu bất kỳ chu kỳ đo nào bị kẹt quá $3.0\text{ giây}$, hàm watchdog ngắt cưỡng bức cả 2 relay về OFF.

---

## 4. TÍNH TOÁN & HIỆU CHUẨN CẢM BIẾN

### 4.1 Cảm biến điện áp FZ0430
- Mạch FZ0430 tiêu chuẩn: $R_1 = 30\text{ k}\Omega$, $R_2 = 7.5\text{ k}\Omega$ (tỉ lệ chia $1/5$).
- Để an toàn cho ADC ESP32-S3 (dải đo chuẩn $\le 3.1\text{V}$ ở độ suy hao 12dB) khi tấm pin 12V có thể đạt $V_{oc} \approx 22\text{V} - 24\text{V}$:
  - Mắc thêm điện trở $R_{ext} = 6.2\text{ k}\Omega$ song song giữa chân **S** và **GND**.
  - Điện trở tương đương nhánh dưới:
    $$R_{low} = \frac{7.5 \times 6.2}{7.5 + 6.2} \approx 3.394\text{ k}\Omega$$
  - Tỉ số phân áp:
    $$k_{ratio} = \frac{3.394}{30 + 3.394} \approx 0.1016$$
  - Điện áp ngõ ra khi $V_{panel} = 22\text{V}$: $V_{pin} = 22 \times 0.1016 \approx 2.235\text{V}$ (rất an toàn).
  - Công thức tính:
    $$V_{oc} = \frac{V_{ADC\_mV}}{1000.0 \times k_{ratio}} \times \text{CALIB\_FACTOR}$$

### 4.2 Cảm biến dòng ACS712-05B
- Nguồn cấp ACS712: 5V DC.
- Độ nhạy danh định: $185\text{ mV/A}$. Điểm tĩnh $0\text{A} \approx 2.5\text{V}$.
- Ngõ ra nối qua cầu phân áp $10\text{ k}\Omega / 20\text{ k}\Omega$ xuống ESP32 (tỉ số $2/3$, hệ số bù ngược $\times 1.5$):
  $$V_{acs\_raw} = V_{adc\_pin} \times 1.5$$
- Khử trôi điểm 0 (Auto Zero-Calibration): Tại Bước 1 ($V_{oc}$), dòng điện bằng $0\text{A}$, ESP32 đọc và lưu $V_{offset}$ tức thời của ACS712.
- Tại Bước 2 (Ngắn mạch):
  $$I_{sc} = \frac{(V_{acs} - V_{offset})}{\text{Độ nhạy (185 mV/A)}}$$

### 4.3 Cảm biến nhiệt độ DS18B20
- Đọc bất đồng bộ (`setWaitForConversion(false)`), không dừng trễ 750ms trên CPU.
- Quét và nhận diện tự động bằng ROM Address 64-bit lúc khởi động.
- Kiểm tra lỗi đứt dây (`-127°C`) và lỗi reset chưa đọc kịp (`85°C`).

---

## 5. MÔ TẢ TIẾN TRÌNH STATE MACHINE (CHỦ KỲ 10 GIÂY)

```
Thời gian: 0s                                    0.3s                           0.6s      0.65s             0.95s
Trạng thái: [WAIT IDLE] -> [BẬT RELAY A] ---------> [ĐỌC VOC & OFFSET] --------> [ĐỌC ISC] -> [TẮT B] ----> [TẮT A] ----> [KẾT THÚC]
Relay A:    OFF            ON                       ON                            ON           ON            OFF          OFF
Relay B:    OFF            OFF                      BẬT RELAY B                   ON           OFF           OFF          OFF
Window:     false          true                     true                          true         true          true         false
```

- Trong khoảng thời gian `Window == true` (~0.95s):
  - Biến cờ `measuring_window = true` được truyền sang module INA226.
  - Toàn bộ các mẫu công suất đọc tức thời của INA226 trong khoảng này sẽ **không cộng dồn vào năng lượng tích phân $Wh$**, đảm bảo dữ liệu sản lượng phát điện không bị tụt sai lệch do chu kỳ đo $V_{oc}/I_{sc}$.

---

## 6. GIAO DIỆN & DỮ LIỆU ĐỒNG BỘ
- Gửi lên Firebase Realtime Database tại đường dẫn `/solar/data/` hoặc `/solar/voc_isc/`:
  - `voc_trk`, `isc_trk`, `voc_sta`, `isc_sta`
  - `temp_trk`, `temp_sta`
  - `measuring_window`, `voc_isc_skipped`, `voc_isc_err`
- Lệnh Serial hỗ trợ kiểm tra và hiệu chuẩn nhanh:
  - `voccalib`: In liên tục bảng giá trị ADC raw (mV), $V_{oc}$, $I_{sc}$, offset, nhiệt độ của 2 tấm pin để đối chiếu trực tiếp với đồng hồ vạn năng VOM.

