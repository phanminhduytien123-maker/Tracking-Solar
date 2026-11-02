# DANH SÁCH HẰNG SỐ VÀ THAM SỐ CẦN ĐO ĐẠC / XÁC NHẬN (THỰC ĐỊA & PHẦN CỨNG)

Tài liệu này lưu trữ toàn bộ các hằng số chưa biết hoặc đang dùng giá trị tạm tính (placeholder) trong file cấu hình [solar_config.h](file:///d:/%C4%90%E1%BB%92%20%C3%81N%20T%E1%BB%90T%20NGHI%E1%BB%86P/firmware/esp32_tracker_control/include/solar_config.h). Mọi thay đổi thực tế sẽ được cập nhật đồng thời vào file config của C++ và Python.

---

## 1. THÔNG TIN PHẦN CỨNG VI ĐIỀU KHIỂN & ĐIỀU KHIỂN ĐỘNG CƠ

| Ký hiệu / Biến | Tên tham số trong code | Giá trị hiện tại (Placeholder) | Đơn vị | Phương pháp đo / Xác nhận thực tế | Mức độ ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **MCU_MODEL** | Cấu hình PlatformIO board | `esp32-s3-devkitc-1` | - | Đọc ký hiệu khắc trên chip (VD: ESP32-S3-WROOM-1 N8R2, N16R8) | **CAO** | Cần người dùng cung cấp |
| **FLASH_SIZE** | Dung lượng Flash | `8MB / 16MB` | MB | Kiểm tra qua esptool / thông số board | **TRUNG BÌNH** | Cần người dùng cung cấp |
| **PSRAM_SIZE** | Dung lượng PSRAM | `2MB / 8MB / 0MB` | MB | Kiểm tra xem module có tích hợp PSRAM không (ảnh hưởng RAM chạy PSO) | **CAO** | Cần người dùng cung cấp |
| **E** | `CFG_E_PULSES_PER_REV_MOTOR` | `1600.0` | xung/vòng | Đọc vị trí gạt công tắc SW5-SW8 trên vỏ driver DM556 | **TUYỆT ĐỐI** | Cần người dùng cung cấp |
| **F** | `CFG_F_ENCODER_PPR` | `400.0` | PPR | Đọc tem nhãn trên thân Encoder 3806 (PCNT đếm x4 = $4 \times F$) | **TUYỆT ĐỐI** | Cần người dùng cung cấp |
| **DIR_POL_AZ** | `CFG_DIR_POL_AZ` | `+1` | $\pm 1$ | Kích DIR HIGH xem trục Azimuth quay tăng góc (chiều KĐH) hay giảm | **TUYỆT ĐỐI** | Cần test bench |
| **DIR_POL_EL** | `CFG_DIR_POL_EL` | `+1` | $\pm 1$ | Kích DIR HIGH xem trục Elevation nâng lên trời hay hạ xuống | **CỰC KỲ NGUY HIỂM** | Cần test bench trước homing |

---

## 2. THÔNG SỐ CƠ KHÍ & ĐỊA LÝ LẮP ĐẶT

| Ký hiệu / Biến | Tên tham số trong code | Giá trị hiện tại (Placeholder) | Đơn vị | Phương pháp đo / Xác nhận thực tế | Mức độ ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **A** | `CFG_A_LATITUDE_DEG` | `10.78310` | $^\circ$ (Bắc) | Dùng GPS điện thoại / Google Maps tại vị trí đặt giàn | **CAO** | **ĐÃ XÁC NHẬN (Web sync)** |
| **B** | `CFG_B_LONGITUDE_DEG` | `106.67210` | $^\circ$ (Đông) | Dùng GPS điện thoại / Google Maps tại vị trí đặt giàn | **CAO** | **ĐÃ XÁC NHẬN (Web sync)** |
| **RTC_BATTERY** | `CFG_RTC_BACKUP_BATTERY` | `CR2032 (3V)` | - | Pin cúc áo, VCC 3.3V, tháo mạch trở/diode sạc trên ZS-042 | **TUYỆT ĐỐI** | **ĐÃ XÁC NHẬN (CR2032)** |
| **NAMING** | `MOTOR_1 / MOTOR_2` | `Góc quay / Độ ngửa` | - | ĐC 1 (Azimuth) = Góc quay, ĐC 2 (Elevation) = Độ ngửa | **ĐÃ CHỐT** | **ĐÃ XÁC NHẬN** |
| **G** | `CFG_G_AZ_HOME_SW_DEG` | `45.0` | $^\circ$ | Đo phương vị từ hướng Bắc thật đến vị trí công tắc HOME bằng la bàn | **RẤT CAO** | Cần đo thực địa |
| **H** | `CFG_H_AZ_OFFSET_DEG` | `0.0` | $^\circ$ | Hiệu chuẩn bóng nắng trưa (khi $az_{sun} = 180^\circ$, sai số bóng cọc) | **TRUNG BÌNH** | Sẽ hiệu chuẩn ở Phase 2 |
| **I** | `CFG_I_AZ_MAX_SOFT_LIMIT_DEG` | `270.0` | $^\circ$ | Quay thử trục Azimuth xem góc lớn nhất cáp điện còn chùng an toàn | **CAO** | Cần kiểm tra cáp |
| **J** | `CFG_J_EL_HOME_SW_DEG` | `90.0` | $^\circ$ | Dùng thước đo góc điện tử / IMU đo mặt tấm khi chạm công tắc El | **TUYỆT ĐỐI** | Cần đo góc công tắc |
| **L** | `CFG_L_EL_MIN_SOFT_LIMIT_DEG` | `25.0` | $^\circ$ | Hạ tấm bằng tay xem góc cấn vào trụ Z là bao nhiêu, lấy cộng thêm $3^\circ - 5^\circ$. Dùng chung cho PID/Fuzzy-PID/PSO | **TUYỆT ĐỐI** | **TẠM, CHỜ ĐO CƠ KHÍ THỰC TẾ** |
| **EL_TRACK_TH** | `CFG_EL_SUN_TRACKING_THRESHOLD_DEG` | `10.0` | $^\circ$ | Ngưỡng góc nâng mặt trời tối thiểu kích hoạt bám. Dưới góc này bức xạ yếu (AM > 5.76). Dùng chung cho PID/Fuzzy-PID/PSO | **CAO** | **TẠM, CHỜ ĐO CƠ KHÍ & BỨC XẠ** |
| **WAKEUP_LEAD** | `CFG_WAKEUP_LEAD_TIME_MIN` | `20` | phút | Thời gian đánh thức DS3231 trước khi mặt trời đạt ngưỡng bám (t_track_start - lead_min) | **TRUNG BÌNH** | Đã cấu hình linh hoạt |
| **EL_STROKE**| `CFG_EL_MAX_STROKE_FROM_HOME_DEG` | `70.0` | $^\circ$ | Hành trình góc tối đa tấm ngửa/hạ tính từ mốc công tắc HOME | **CAO** | Suy ra từ $J - L$ |
| **DEFAULT_M1** | `CFG_AZ_DEFAULT_PARK_DEG` | `90.0` (600 counts) | $^\circ$ | Vị trí mặc định Trục 1 (Azimuth) đo từ công tắc Home | **TUYỆT ĐỐI** | **ĐÃ XÁC NHẬN (600 xung)** |
| **DEFAULT_M2** | `CFG_EL_DEFAULT_PARK_DEG` | `-58.35` (-389 counts) | $^\circ$ | Vị trí mặc định Trục 2 (Elevation) đo từ công tắc Home | **TUYỆT ĐỐI** | **ĐÃ XÁC NHẬN (-389 xung)** |
| **STATIC_AZ**| `CFG_STATIC_PANEL_AZIMUTH_DEG` | `180.0` | $^\circ$ | Góc phương vị tấm cố định (chính Nam). Ghi thành hằng số báo cáo và mô phỏng pvlib | **ĐÃ CHỐT** | Cố định 180° |
| **STATIC_TILT**| `CFG_STATIC_PANEL_TILT_DEG` | `15.0` | $^\circ$ | Góc nghiêng tấm cố định (15°). Ghi thành hằng số báo cáo và mô phỏng pvlib | **ĐÃ CHỐT** | Cố định 15° |

---

## 3. THAM SỐ MÔ HÌNH ĐỘNG HỌC & ĐIỀU KHIỂN (PHỤC VỤ MÔ PHỎNG & PSO)

| Ký hiệu / Biến | Tên tham số trong code | Giá trị hiện tại (Placeholder) | Đơn vị | Phương pháp đo / Xác nhận thực tế | Mức độ ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **M** | `CFG_M_INERTIA_AZ_EQUIV_KG_M2` | `0.0005` | $\text{kg}\cdot\text{m}^2$ | Tính quán tính khung + tấm quy đổi: $J_L / C^2 + J_{rotor}$ | Trung bình | Tạm tính |
| **N** | `CFG_N_INERTIA_EL_EQUIV_KG_M2` | `0.0004` | $\text{kg}\cdot\text{m}^2$ | Tương tự M, quy đổi qua $D^2 = 9$ | Trung bình | Tạm tính |
| **O** | `CFG_O_FRICTION_COULOMB_NM` | `0.08` | $\text{N}\cdot\text{m}$ | Dùng cần lực đo mô-men ma sát tĩnh trục động cơ | Trung bình | Tạm tính |
| **P** | `CFG_P_BELT_STIFFNESS_NM_RAD` | `450.0` | $\text{N}\cdot\text{m}/\text{rad}$| Kéo lực đầu tấm và đo góc xê dịch đàn hồi của đai | Trung bình | Tạm tính |
| **Q** | `CFG_Q_BACKLASH_DEG` | `0.15` | $^\circ$ | Đảo chiều vi bước và đo góc chết trên mặt tấm | Trung bình | Tạm tính |
| **R** | `CFG_R_WIND_TORQUE_LOAD_NM` | `1.5` | $\text{N}\cdot\text{m}$ | Ước lượng khí động học từ diện tích đón gió | Cao | Tạm tính |
| **S** | `CFG_S_MOTOR_HOLD_TORQUE_HALF_NM`| `0.9` | $\text{N}\cdot\text{m}$ | Tra cứu datasheet NEMA23 ở chế độ half-current (SW4=OFF) | Rất cao | Tra datasheet |
| **T** | `CFG_T_MAX_PULSE_FREQ_HZ` | `4000.0` | Hz | Tăng tần số phát xung đến khi encoder phát hiện mất bước | Rất cao | Đo bench ở Phase 3 |
| **U** | `CFG_U_MAX_PULSE_ACCEL_HZ_PER_S` | `6000.0` | $\text{Hz}/\text{s}$ | Tăng gia tốc đến khi encoder phát hiện mất bước | Rất cao | Đo bench ở Phase 3 |

---

## 4. THAM SỐ CẢM BIẾN QUANG TEMT6000

| Ký hiệu / Biến | Tên tham số trong code | Giá trị hiện tại (Placeholder) | Đơn vị | Phương pháp đo / Xác nhận thực tế | Mức độ ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **V** | `CFG_V_GAIN_LDR_...` | `[1.0, 1.0, 1.0, 1.0]` | - | Rọi đèn đồng nhất vào 4 mắt đọc, đo ADC và tính tỷ lệ bù gain | Cao | Đo bench ở Phase 2 |
| **W** | `CFG_W_ADC_SATURATION_THRESHOLD` | `3950` | ADC counts | Rọi đèn pin công suất lớn vào cảm biến để tìm điểm bão hòa ADC 12-bit | Rất cao | **TẠM, CHỜ ĐO THỰC TẾ** |
| **X** | `CFG_X_T_DARK_THRESHOLD` | `400.0` | ADC counts | Đo tổng 4 kênh lúc chạng vạng tối để xác định ngưỡng chuyển đêm | Cao | **TẠM, CHỜ ĐO THỰC TẾ** |
| **Y** | `CFG_Y_T_BRIGHT_THRESHOLD` | `900.0` | ADC counts | Đo tổng 4 kênh lúc sáng sớm có nắng để xác định ngưỡng tin cậy 100% | Cao | **TẠM, CHỜ ĐO THỰC TẾ** |
| **Z** | `CFG_Z_OPTICAL_CONV_FACTOR_DEG`| `12.0` | $^\circ$ | Lệch góc $\pm 2^\circ, \pm 5^\circ$ và vẽ đường quan hệ $(L-R)/(L+R)$ | Cao | **TẠM, CHỜ ĐO THỰC TẾ** |
| **Z2** | `CFG_Z2_MAX_OPTICAL_CORRECTION_DEG`| `6.0` | $^\circ$ | Giới hạn kẹp hiệu chỉnh quang học tối đa $\pm Z_2$ để chống mây lừa | Rất cao | **TẠM, CHỜ ĐO THỰC TẾ** |
| **Deadband** | `CFG_OPTICAL_DEADBAND` | `0.04` | - | Đo độ rung lắc sai số khi tâm sáng ở giữa | Cao | **TẠM, CHỜ ĐO THỰC TẾ** |
