# DANH SÁCH KIỂM TRA TRƯỚC KHI BẮT ĐẦU ĐO THỰC NGHIỆM (01/11)
# PRE-EXPERIMENT CHECKLIST

> **Mục đích**: Tài liệu nghiệm thu điều kiện phần cứng, phần mềm, đồng hồ thời gian thực RTC, an toàn dữ liệu và môi trường đo kiểm trước ngày bắt đầu chiến dịch thu thập số liệu đối chứng năng lượng (Solar Tracker vs. Tấm Cố Định).  
> **Quy tắc cốt lõi**: Mọi thông số cần được đo thực tế, ghi lại số đo cụ thể kèm chữ ký xác nhận của nhóm sinh viên thực hiện. Không vận hành thí nghiệm nếu còn bất kỳ ô kiểm nào chưa đạt.

---

## BẢNG THÔNG TIN CHUNG

| Thông tin | Chi tiết ghi nhận |
| :--- | :--- |
| **Ngày kiểm tra** | `____ / ____ / 2026` |
| **Địa điểm triển khai** | Tòa nhà/Sân thượng: `____________________________________` |
| **Người kiểm tra** | Phan Minh Duy Tiến & Võ Hồng Phát |
| **Phiên bản Firmware** | `Git Commit / Version: ________________` |
| **Phiên bản Dashboard**| `Build / Release: _____________________` |

---

## 1. CẤU HÌNH PHẦN MỀM & KHÓA THÍ NGHIỆM (EXPERIMENT LOCK)

*Đảm bảo các cấu hình cơ bản không bị can thiệp ngoài ý muốn trong suốt quá trình đo so sánh.*

| Trạng thái | Hạng mục kiểm tra | Giá trị quy định | Giá trị ghi nhận thực tế | Ghi chú & Đánh giá |
| :---: | :--- | :---: | :---: | :--- |
| [ ] | **Khóa chế độ thí nghiệm** (`CFG_EXPERIMENT_LOCK`) | `true` | `___________` | Khóa thay đổi tọa độ, cấm Jog tự do, cấm calibrate lại |
| [ ] | **Tự động cập nhật độ cao LDR** (`CFG_AUTO_UPDATE_H`) | `false` | `___________` | Giữ nguyên độ cao hình học $H$ cố định đã đo |
| [ ] | **Nguồn bám nhật động** (`CFG_TRACK_SOURCE`) | `HYBRID (2)` | `___________` | Bám theo Feedforward (thiên văn) kết hợp TEMT6000 tinh chỉnh |
| [ ] | **Góc tấm cố định (Tham chiếu)** | $\phi=180^\circ$, $\beta=15^\circ$ ($\varepsilon=75^\circ$) | $\phi = \_\_\_\_^\circ$, $\beta = \_\_\_\_^\circ$ | Hướng chính Nam $180^\circ$, độ ngửa $\varepsilon = 90^\circ - \beta = 75^\circ$ |
| [ ] | **Sử dụng khúc xạ khí quyển** (`CFG_USE_REFRACTION`) | `true` | `___________` | Hiệu chỉnh độ cao biểu kiến khi mặt trời gần chân trời |

---

## 2. TỌA ĐỘ VỊ TRÍ LẮP ĐẶT & NGUỒN DỮ LIỆU (SITE CONFIG)

*Tọa độ địa lý ảnh hưởng trực tiếp đến thuật toán Feedforward. Nguồn tọa độ tuyệt đối không được ở trạng thái Mặc định.*

| Trạng thái | Hạng mục kiểm tra | Giá trị quy định / Yêu cầu | Giá trị ghi nhận thực tế | Ghi chú & Đánh giá |
| :---: | :--- | :---: | :---: | :--- |
| [ ] | **Vĩ độ thực địa** (Latitude $A$) | $10.00000^\circ \dots 11.50000^\circ$ N | `__________ . _____` °N | Đo bằng GPS điện thoại / Google Maps vệ tinh |
| [ ] | **Kinh độ thực địa** (Longitude $B$) | $106.00000^\circ \dots 107.50000^\circ$ E | `__________ . _____` °E | Đo cùng vị trí lắp đặt tấm pin |
| [ ] | **Nguồn tọa độ đang sử dụng** (`site_source`) | `FIREBASE (1)` hoặc `NVS (2)` | `___________` | **NGHIÊM CẤM** dùng `DEFAULT (0)` trong thí nghiệm |
| [ ] | **Số hiệu sửa đổi tọa độ** (`site_rev`) | $\ge 1$ | `___________` | Tăng dần mỗi lần cập nhật |
| [ ] | **Xác nhận tọa độ từ Web** (`site_confirmed`) | `true` | `___________` | Người vận hành đã kiểm tra và bấm xác nhận trên Web |
| [ ] | **Cảnh báo tọa độ ngoài VN** (`warning_outside_vn`) | `false` | `___________` | Vĩ độ 8.0–24.0, Kinh độ 102.0–110.0 |
| [ ] | **Cảnh báo đảo Lat/Lon** (`warning_inverted`) | `false` | `___________` | Đảm bảo không nhập nhầm Lat vào Lon |

---

## 3. ĐỒNG HỒ THỜI GIAN THỰC (RTC DS3231) & PIN DỰ PHÒNG

*Đồng hồ RTC chính xác là điều kiện tiên quyết của góc bám Feedforward thiên văn.*

| Trạng thái | Hạng mục kiểm tra | Giá trị quy định / Yêu cầu | Giá trị ghi nhận thực tế | Ghi chú & Đánh giá |
| :---: | :--- | :---: | :---: | :--- |
| [ ] | **Loại pin cúc áo lắp trên DS3231** | `CR2032` (Pin sơ cấp 3.0V) | `___________` | Không dùng pin sạc LIR2032 chưa rõ nguồn gốc |
| [ ] | **Xử lý mạch sạc trên module DS3231** | Đã ngắt Diode/Trở sạc R22 | Đã cắt mạch: `[Có / Chưa]` | **BẮT BUỘC**: Cắt trở R22/diode để tránh phồng nổ pin CR2032 |
| [ ] | **Điện áp pin đo tại cực cell** ($V_{bat}$) | $\ge 3.0\text{V}$ | `___________` V | Dưới 2.8V phải thay pin mới ngay |
| [ ] | **Cờ báo mất nguồn thạch anh** (`OSF`) | `0` (Cleared) | `___________` | Nếu `OSF = 1`, phải đồng bộ lại giờ và xóa cờ |
| [ ] | **Đồng bộ thời gian chuẩn NTP** | Đã sync qua Internet | Giờ NTP: `__:__:__` | Lưu ý: Giờ RTC lưu local UTC+7 |
| [ ] | **Độ lệch thời gian** ($\Delta t = \text{RTC} - \text{NTP}$) | $|\Delta t| < 2.0\text{ s}$ | $\Delta t = \_\_\_\_\_\_\_\_$ s | Ghi lại độ lệch trước khi bắt đầu đo |
| [ ] | **Tín hiệu ngắt báo thức SQW/INT** | Kéo lên 3.3V qua trở $10\text{k}\Omega$ | Trạng thái: `[OK / Lỗi]` | Đảm bảo ngắt đánh thức ESP32 hoạt động đúng |

---

## 4. THÔNG SỐ CƠ KHÍ, QUANG HỌC & CỰC TÍNH ĐỘNG CƠ

*Các kích thước vật lý của cơ cấu chấp hành và cảm biến quang TEMT6000.*

| Trạng thái | Tham số | Ký hiệu | Giá trị quy định / Thiết kế | Giá trị đo thực tế (mm / deg) | Người đo & Ngày đo |
| :---: | :--- | :---: | :---: | :---: | :---: |
| [ ] | Khoảng cách tâm trục Azimuth - Elevation | $G$ | Thiết kế khung | `__________` mm | `___________________` |
| [ ] | Chiều cao vách ngăn chữ thập LDR | $H$ | Chuẩn $20.0 \dots 35.0\text{ mm}$ | `__________` mm | `___________________` |
| [ ] | Cạnh ngoài bao che LDR (khoảng cách) | $J$ | Chuẩn cơ khí | `__________` mm | `___________________` |
| [ ] | Chiều dài cánh tay đòn Elevation | $L$ | Thiết kế cơ khí | `__________` mm | `___________________` |
| [ ] | Khoảng cách tâm trục khớp nối | $E$ | Thiết kế cơ khí | `__________` mm | `___________________` |
| [ ] | Hành trình ty đẩy / vít me hữu ích | $F$ | Hành trình max | `__________` mm | `___________________` |
| [ ] | Cực tính chiều quay Azimuth | `DIR_POL_AZ` | `HIGH = Tăng φ (Đông sang Tây)` | `[ ĐÚNG / ĐẢO ]` | Kiểm tra Jog tay trên web |
| [ ] | Cực tính chiều quay Elevation | `DIR_POL_EL` | `HIGH = Tăng ε (Ngửa lên trời)` | `[ ĐÚNG / ĐẢO ]` | Kiểm tra Jog tay trên web |
| [ ] | Cấu hình Microstepping Driver DM556 | DIP Switch | `SW1..SW8` đã gạt đúng | Az: `________` / El: `________` | Ghi lại số xung/vòng (ví dụ: 1600 xung) |
| [ ] | Góc giới hạn phần mềm Azimuth | $[\phi_{min}, \phi_{max}]$ | $[60.0^\circ, 300.0^\circ]$ | $[ \_\_\_\_^\circ, \_\_\_\_^\circ ]$ | Soft limits chống vặn dây cáp |
| [ ] | Góc giới hạn phần mềm Elevation | $[\varepsilon_{min}, \varepsilon_{max}]$ | $[10.0^\circ, 85.0^\circ]$ | $[ \_\_\_\_^\circ, \_\_\_\_^\circ ]$ | Soft limits chống kẹt cơ cấu |

---

## 5. THAM SỐ ĐIỀU KHIỂN ĐỒNG NHẤT GIỮA CÁC CẤU HÌNH

*Khi so sánh giữa các thuật toán (hoặc đối chứng cố định), các tham số động học và vùng chết phải hoàn toàn nhất quán.*

| Trạng thái | Tham số | Giá trị tiêu chuẩn | Giá trị cài đặt thực tế | Ghi chú |
| :---: | :--- | :---: | :---: | :--- |
| [ ] | Ngưỡng sai số kích hoạt quay ($\theta_{th}$) | $2.0^\circ$ (hoặc $1.5^\circ$) | `___________` ° | Cùng một giá trị cho mọi kịch bản so sánh |
| [ ] | Chu kỳ vòng lặp ngoài tính toán ($T_{outer}$) | $30\text{ s}$ (hoặc $60\text{ s}$) | `___________` s | Chu kỳ đánh giá sai số bám mặt trời |
| [ ] | Vùng chết cảm biến quang ($Z_2$) | $2.5^\circ$ | `___________` ° | Biên bão hòa góc hiệu chỉnh TEMT6000 |
| [ ] | Độ trễ chống rung lắc (Hysteresis) | $0.5^\circ$ | `___________` ° | Tránh động cơ giật liên tục do mây bay qua |

---

## 6. AN TOÀN DỮ LIỆU & BẢO MẬT FIREBASE

*Bảo vệ cơ sở dữ liệu trên cloud và ngăn chặn mất mát dữ liệu đo đạc quý giá.*

| Trạng thái | Hạng mục kiểm tra | Yêu cầu kỹ thuật | Kết quả xác nhận | Ghi chú & Đánh giá |
| :---: | :--- | :---: | :---: | :--- |
| [ ] | **Phân quyền Firebase Security Rules** | Admin mới được ghi config/control | `[ ĐÃ KHÓA / CHƯA ]` | Không để `.read: true, .write: true` mở tự do |
| [ ] | **Nút "Xóa sạch dữ liệu Firebase" trên Web** | Ẩn hoàn toàn hoặc khóa mật khẩu | `[ ĐÃ KHÓA / CHƯA ]` | Tuyệt đối không để bấm nhầm làm mất dữ liệu đo |
| [ ] | **Thẻ nhớ MicroSD tại trạm đo ESP32** | Dung lượng $\ge 16\text{GB}$, định dạng FAT32 | `[ SẴN SÀNG / CHƯA ]` | Logger ghi file CSV độc lập phòng mất mạng WiFi |
| [ ] | **Kiểm tra ghi tệp log định kỳ** | File `LOG_YYYYMMDD.csv` tạo tự động | `[ ĐÃ TEST / CHƯA ]` | Kiểm tra rút thẻ cắm máy tính đọc thử file log |

---

## 7. HIỆU CHUẨN CHÉO HAI TẤM PIN (CROSS-CALIBRATION)

*Trước khi đo thu năng lượng so sánh, hai tấm pin phải được đặt cùng một góc để đo đối chứng độ suy hao/lệch công suất ban đầu.*

| Trạng thái | Nội dung thực hiện | Tiêu chí nghiệm thu | Kết quả ghi nhận | Ghi chú |
| :---: | :--- | :---: | :---: | :--- |
| [ ] | **Bố trí vị trí 2 tấm pin** | Cả 2 tấm đặt cố định cùng hướng Nam $180^\circ$, ngửa $75^\circ$ ($\beta=15^\circ$) | `[ ĐÃ ĐẶT ]` | Không che bóng lẫn nhau |
| [ ] | **Thời gian đo hiệu chuẩn chéo** | Tối thiểu 2 đến 3 ngày nắng liên tục | Từ ngày: `__/__` đến `__/__` | Ghi log liên tục từ 06:00 đến 18:00 |
| [ ] | **Tổng năng lượng tấm Tracker** ($E_{pv1}$) | Tích phân năng lượng ngày $Wh$ | $E_{pv1} = \_\_\_\_\_\_\_\_$ Wh | Đo bằng INA226 kênh 1 |
| [ ] | **Tổng năng lượng tấm Cố định** ($E_{pv2}$) | Tích phân năng lượng ngày $Wh$ | $E_{pv2} = \_\_\_\_\_\_\_\_$ Wh | Đo bằng INA226 kênh 2 |
| [ ] | **Hệ số hiệu chỉnh chéo** ($k$) | $k = \dfrac{E_{pv2}}{E_{pv1}}$ (hoặc tỷ số dòng ngắn mạch $I_{sc}$) | $k = \_\_\_\_\_\_\_\_$ | Kỳ vọng $k \in [0.95, 1.05]$ |
| [ ] | **Áp dụng hệ số** $k$ vào công thức | $E_{\text{net}} = E_{\text{tracker}} \cdot k - E_{\text{fixed}} - E_{\text{parasitic}}$ | `[ ĐÃ CẤU HÌNH ]` | Nhập hệ số $k$ vào bảng tính phân tích số liệu |

---

## KÝ TÊN XÁC NHẬN NGHIỆM THU ĐỦ ĐIỀU KIỆN ĐO THỰC NGHIỆM

*Chỉ ký nghiệm thu khi 100% các mục trên đã được kiểm tra, điền số liệu đầy đủ và không có bất thường.*

| Đại diện Nhóm thực hiện 1 | Đại diện Nhóm thực hiện 2 | Giảng viên hướng dẫn / Người giám sát |
| :---: | :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>**Phan Minh Duy Tiến** | &nbsp;<br>&nbsp;<br>&nbsp;<br>**Võ Hồng Phát** | &nbsp;<br>&nbsp;<br>&nbsp;<br>____________________________________ |
| Ngày: _____ / _____ / 2026 | Ngày: _____ / _____ / 2026 | Ngày: _____ / _____ / 2026 |
