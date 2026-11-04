/**
 * @file solar_config.h
 * @brief TẬP TRUNG TOÀN BỘ HẰNG SỐ VÀ THAM SỐ CẤU HÌNH HỆ THỐNG SOLAR TRACKER 2 TRỤC
 * @details Mọi tham số từ A đến Z, Z2 và các chu kỳ, ngưỡng điều khiển đều được định nghĩa tại đây.
 *          KHÔNG HARD-CODE BẤT KỲ CON SỐ NÀO TRONG SOURCE CODE LOGIC.
 */

#ifndef SOLAR_CONFIG_H
#define SOLAR_CONFIG_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// =============================================================================
// SECTION 1: HẰNG SỐ ĐỊA LÝ, THỜI GIAN & RTC DS3231 (GEOGRAPHIC, TIME & RTC)
// =============================================================================

/** [A] Vĩ độ nơi lắp đặt hệ thống (Độ thập phân, Dương = Bắc, Âm = Nam).
 *  Giá trị mặc định: 10.78816° N (TP. Hồ Chí Minh).
 *  Thứ tự ưu tiên: 1. Firebase SiteConfig -> 2. NVS Flash -> 3. Giá trị mặc định này. */
#define CFG_A_LATITUDE_DEG                  (10.78816)

/** [B] Kinh độ nơi lắp đặt hệ thống (Độ thập phân, Dương = Đông, Âm = Tây).
 *  Giá trị mặc định: 106.66617° E (TP. Hồ Chí Minh).
 *  Thứ tự ưu tiên: 1. Firebase SiteConfig -> 2. NVS Flash -> 3. Giá trị mặc định này. */
#define CFG_B_LONGITUDE_DEG                 (106.66617)

/** Múi giờ địa phương cố định UTC+7 (Việt Nam không có giờ mùa hè DST).
 *  Quy ước bất biến: RTC DS3231 LƯU THEO MỘT QUY ƯỚC DUY NHẤT LÀ GIỜ ĐỊA PHƯƠNG UTC+7. */
#define CFG_TZ_OFFSET_MIN                   (420)
#define CFG_TIMEZONE_OFFSET_HOURS           (7.0f)

/** Cấu hình nguồn pin dự phòng RTC DS3231:
 *  - RTC_BACKUP_BATTERY = true: Module DS3231 có lắp pin cúc áo CR2032 (3V).
 *  - CẢNH BÁO PHẦN CỨNG BẮT BUỘC: VCC cấp 3.3V trực tiếp từ hệ thống, KHÔNG dùng 5V cho I2C.
 *  - Module ZS-042 thương mại có mạch sạc diode + trở từ VCC vào pin: BẮT BUỘC tháo diode/trở
 *    hoặc ngắt mạch sạc khi dùng pin CR2032 không sạc để chống phù/cháy pin.
 *  - Phải kiểm tra cờ OSF (Oscillator Stop Flag) sau mỗi lần khởi động. */
#define CFG_RTC_BACKUP_BATTERY              (true)

/** Cờ khóa cấu hình thí nghiệm (EXPERIMENT_LOCK):
 *  - true: Đang trong đợt đo 30 ngày chính thức. Mọi lệnh đổi tọa độ từ Firebase bị TỪ CHỐI,
 *          ghi log cờ SITE_CHANGE_REJECTED.
 *  - false: Cho phép cập nhật SiteConfig mới từ Firebase ở các trạng thái an toàn (BOOT, PARK, DAWN_POLL). */
#define CFG_EXPERIMENT_LOCK                 (false)

/** Nguồn tạo góc mục tiêu (TRACK_SOURCE):
 *  - 0 (EPHEMERIS_ONLY): theta_ref = theta_ff thuần thiên văn NOAA.
 *  - 1 (SENSOR_ONLY): Hoàn toàn dùng cảm biến quang TEMT6000 (cho thí nghiệm đối chứng).
 *  - 2 (HYBRID): theta_ref = theta_ff + sat(w_s * Z * e_s, +/- Z2). (MẶC ĐỊNH ĐỢT ĐO 30 NGÀY). */
#define CFG_TRACK_SOURCE_EPHEMERIS_ONLY     (0)
#define CFG_TRACK_SOURCE_SENSOR_ONLY        (1)
#define CFG_TRACK_SOURCE_HYBRID             (2)
#define CFG_TRACK_SOURCE_DEFAULT            (CFG_TRACK_SOURCE_HYBRID)

/** Tự động cập nhật bù lệch lắp đặt H (AUTO_UPDATE_H):
 *  - Mặc định BẮT BUỘC TẮT (false) suốt đợt đo 30 ngày để đảm bảo tính nhất quán điều kiện thí nghiệm.
 *  - Hệ thống chỉ tính trung bình trượt e_s lúc trời quang và cảnh báo cờ CALIB_DRIFT. */
#define CFG_AUTO_UPDATE_H                   (false)

/** Bù khúc xạ khí quyển (USE_REFRACTION):
 *  - true (mặc định): Bù khúc xạ khí quyển cho el_sun nhỏ lúc sáng sớm / chiều tà.
 *  - Luôn ghi đồng thời cả el_sun chưa bù và đã bù vào struct telemetry. */
#define CFG_USE_REFRACTION                  (true)

/** QUY ƯỚC TÊN HIỂN THỊ CHUẨN HAI TRỤC ĐỘNG CƠ:
 *  - Động cơ 1 (Azimuth / phi): "Góc quay" (Góc phương vị tính từ mốc HOME công tắc hành trình).
 *  - Động cơ 2 (Elevation / epsilon): "Độ ngửa" (Góc nâng giàn pin tính từ mặt đất 0° -> đỉnh 90°). */
#define CFG_LABEL_MOTOR_1                   "Góc quay"
#define CFG_LABEL_MOTOR_2                   "Độ ngửa"



// =============================================================================
// SECTION 2: CƠ KHÍ & XUNG ĐỘNG CƠ / ENCODER (KINEMATICS & PULSES)
// =============================================================================

/** [C] Tỷ số truyền trục Azimuth (ĐÃ CHỐT = 3.0). Động cơ quay 3 vòng -> Khung quay 1 vòng. */
#define CFG_C_GEAR_RATIO_AZ                 (3.0f)

/** [D] Tỷ số truyền trục Elevation (ĐÃ CHỐT = 3.0). Động cơ quay 3 vòng -> Khung quay 1 vòng. */
#define CFG_D_GEAR_RATIO_EL                 (3.0f)

/** [E] Số xung phát/vòng động cơ thiết lập trên driver DM556 (SW5 - SW8).
 *  Ví dụ: 1600 pulse/rev (vi bước 1/8 bước của NEMA23 1.8° = 200 bước/vòng).
 *  CẦN NGƯỜI DÙNG CUNG CẤP GIÁ TRỊ THỰC TẾ. */
#define CFG_E_PULSES_PER_REV_MOTOR          (1600.0f)

/** [F] Số xung/vòng (PPR) của Encoder Omron/Autonics 3806 gắn 1:1 trục động cơ.
 *  ESP32 PCNT đếm chế độ 4x (4 cạnh A/B), nên số count/vòng motor = 4 * F.
 *  Ví dụ: Encoder 400 PPR -> 1600 count/vòng. CẦN NGƯỜI DÙNG CUNG CẤP PPR THỰC TẾ. */
#define CFG_F_ENCODER_PPR                   (400.0f)

/** Cực tính DIR trục Azimuth (+1 hoặc -1).
 *  +1: DIR mức HIGH làm tăng góc phi (Bắc -> Đông -> Nam -> Tây).
 *  -1: DIR mức LOW làm tăng góc phi. CẦN TEST BENCH XÁC NHẬN TRƯỚC HOMING. */
#define CFG_DIR_POL_AZ                      (1)

/** Cực tính DIR trục Elevation (+1 hoặc -1).
 *  +1: DIR mức HIGH làm tăng góc epsilon (nâng lên về phía 90° - Zenith/Nằm ngang).
 *  -1: DIR mức LOW làm tăng góc epsilon.
 *  CỰC KỲ QUAN TRỌNG: Phải xác nhận chính xác trước khi Homing el để tránh đâm kẹt cơ khí! */
#define CFG_DIR_POL_EL                      (1)


// =============================================================================
// SECTION 3: HÌNH HỌC LẮP ĐẶT & GIỚI HẠN GÓC (GEOMETRY & LIMITS)
// =============================================================================

/** [G] az_home_sw: Phương vị thực tế của công tắc hành trình Azimuth (Độ, tính từ Bắc = 0° theo chiều KĐH).
 *  Công tắc HOME đặt chéo về phía Bắc của hướng mọc xa nhất.
 *  Placeholder: 45.0° (Đông Bắc). CẦN ĐO THỰC TẾ TRÊN KHUNG BẰNG LA BÀN/KINH VĨ. */
#define CFG_G_AZ_HOME_SW_DEG                (180.0f)

/** [H] az_offset: Độ lệch lắp đặt của khung so với trục chuẩn địa lý (Độ).
 *  Hiệu chuẩn bằng bóng nắng trưa (khi solar noon: Az_sun = 180°).
 *  Placeholder: 0.0°. CẦN HIỆU CHUẨN THỰC ĐỊA. */
#define CFG_H_AZ_OFFSET_DEG                 (0.0f)

/** [I] Giới hạn mềm góc quay phi trục Azimuth lớn nhất (Độ).
 *  Tránh vặn xoắn, đứt cáp điện từ pin xuống chân đế.
 *  Placeholder: 270.0° (cho phép quay góc phi từ 0° đến 270°). */
#define CFG_I_AZ_MAX_SOFT_LIMIT_DEG         (270.0f)

/** Giới hạn mềm cận dưới trục Azimuth (Độ, sau khi rời công tắc HOME vài độ để tránh cọ switch). */
#define CFG_AZ_MIN_SOFT_LIMIT_DEG           (2.0f)

/** [J] epsilon tại công tắc hành trình el (Độ).
 *  Vị trí chạm công tắc hành trình (HOME) của trục el.
 *  Được TUNE chính xác bằng công tắc hành trình kết hợp số xung Encoder và thước đo góc/IMU.
 *  Placeholder: 90.0° (hoặc góc ngửa cơ khí thực tế tại vị trí gắn công tắc). */
#define CFG_J_EL_HOME_SW_DEG                (90.0f)

/** [K] epsilon_stow: Góc đậu nghỉ ban đêm (Độ).
 *  Placeholder: 90.0° (đậu tại hoặc gần mốc công tắc để đón ít gió nhất). */
#define CFG_K_EL_STOW_DEG                   (90.0f)

/** [L] epsilon_min_soft: Giới hạn mềm đầu HẠ THẤP NHẤT của trục Elevation (Độ).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO CƠ KHÍ THỰC TẾ].
 *  DÙNG CHUNG DUY NHẤT CHO CẢ BA BỘ ĐIỀU KHIỂN: PID / FUZZY-PID / PSO (KHÔNG HARD-CODE Ở FILE KHÁC).
 *  RẤT QUAN TRỌNG: Tấm KHÔNG THỂ dựng đứng vuông góc mặt đất (epsilon = 0°) vì sẽ VA CHẠM VÀO TRỤC Z (Phần khung)!
 *  Cần đo cơ khí góc cấn khung thực tế trên giàn thật và đặt L lớn hơn góc cấn đó ít nhất 3° - 5° để an toàn.
 *  Giá trị tạm tính hiện tại: 25.0° */
#define CFG_L_EL_MIN_SOFT_LIMIT_DEG         (10.0f)

/** Góc ngửa tối đa cho phép của trục Elevation tính từ mốc HOME (Độ).
 *  Dùng để kiểm soát hành trình an toàn của tấm qua bộ đếm xung Encoder. */
#define CFG_EL_MAX_STROKE_FROM_HOME_DEG     (70.0f)

/** Ngưỡng góc nâng mặt trời tối thiểu để bắt đầu bám (Độ).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO CƠ KHÍ THỰC TẾ].
 *  DÙNG CHUNG DUY NHẤT CHO CẢ BA BỘ ĐIỀU KHIỂN: PID / FUZZY-PID / PSO (KHÔNG HARD-CODE Ở FILE KHÁC).
 *  Dưới góc này, bức xạ yếu (AM > 5.76), năng lượng thu được không bù nổi năng lượng quay động cơ.
 *  Giá trị tạm tính hiện tại: 10.0° */
#define CFG_EL_SUN_TRACKING_THRESHOLD_DEG   (10.0f)

/** Thời gian đánh thức DS3231 trước khi mặt trời đạt ngưỡng bám (Phút).
 *  Hệ thống thức dậy trước khi bám để kiểm tra kết nối, cảm biến và căn chỉnh tấm về hướng đón nắng sáng. */
#define CFG_WAKEUP_LEAD_TIME_MIN            (20)

/** Thông số lắp đặt tấm cố định đối chứng (Static Panel) lưu bằng 2 field riêng biệt:
 *  - fixed_az_deg = 180° (Hướng chính Nam).
 *  - fixed_tilt_beta_deg = 15° (Góc nghiêng beta so với mặt đất).
 *  Góc ngửa epsilon = 90° - beta = 75° được TÍNH RA khi hiển thị/tính toán, KHÔNG lưu thành field thứ 3. */
#define CFG_FIXED_AZ_DEG                    (180.0f)
#define CFG_FIXED_TILT_BETA_DEG             (15.0f)
#define CFG_STATIC_PANEL_AZIMUTH_DEG        (CFG_FIXED_AZ_DEG)
#define CFG_STATIC_PANEL_TILT_DEG           (CFG_FIXED_TILT_BETA_DEG)
#define CFG_FIXED_EPSILON_DEG(beta)         (90.0f - (beta))


// =============================================================================
// SECTION 4: ĐỘNG HỌC & MÔ HÌNH CƠ ĐIỆN TẢI (DYNAMICS & STEPPER CONSTRAINTS)
// =============================================================================

/** [M] Quán tính tải trục Azimuth quy về trục động cơ (kg.m^2).
 *  J_motor_az = J_load_az / (C^2) + J_rotor. Placeholder: 0.0005 kg.m^2. */
#define CFG_M_INERTIA_AZ_EQUIV_KG_M2        (0.0005f)

/** [N] Quán tính tải trục Elevation quy về trục động cơ (kg.m^2).
 *  J_motor_el = J_load_el / (D^2) + J_rotor. Placeholder: 0.0004 kg.m^2. */
#define CFG_N_INERTIA_EL_EQUIV_KG_M2        (0.0004f)

/** [O] Hệ số ma sát nhớt B_v (N.m.s/rad) + ma sát khô Coulomb T_c (N.m) quy về trục động cơ. */
#define CFG_O_FRICTION_COULOMB_NM           (0.08f)
#define CFG_O_FRICTION_VISCOUS_NMS_RAD      (0.001f)

/** [P] Độ cứng đàn hồi của dây đai k_belt (N.m/rad). */
#define CFG_P_BELT_STIFFNESS_NM_RAD         (450.0f)

/** [Q] Độ rơ cơ khí (Backlash) của bộ truyền đai (Độ góc trục tấm). */
#define CFG_Q_BACKLASH_DEG                  (0.15f)

/** [R] Mô-men cản do gió danh định tác động lên tấm (N.m tại trục tấm). */
#define CFG_R_WIND_TORQUE_LOAD_NM           (1.5f)

/** [S] Mô-men giữ danh định của NEMA23 ở chế độ Half-Current (DM556 SW4=OFF) (N.m).
 *  Placeholder: 0.9 N.m (động cơ NEMA23 1.8 N.m danh định, 50% dòng khi đứng yên). */
#define CFG_S_MOTOR_HOLD_TORQUE_HALF_NM     (0.9f)

/** [T] Tần số phát xung tối đa không gây mất bước (Pulses/second = Hz).
 *  Placeholder: 4000 Hz. */
#define CFG_T_MAX_PULSE_FREQ_HZ             (4000.0f)

/** Tần số phát xung khởi động tối thiểu (Base Frequency, Hz) để động cơ không bị rung giật. */
#define CFG_T_MIN_PULSE_FREQ_HZ             (200.0f)

/** [U] Gia tốc phát xung tối đa không gây mất bước (Pulses/second^2).
 *  Placeholder: 6000 Hz/s. */
#define CFG_U_MAX_PULSE_ACCEL_HZ_PER_S      (6000.0f)

/** Tần số phát xung khi thực hiện Homing (Hz). Chạy chậm để định vị chính xác và an toàn. */
#define CFG_HOMING_FAST_FREQ_HZ             (1200.0f)
#define CFG_HOMING_SLOW_FREQ_HZ             (300.0f)
#define CFG_HOMING_BACKOFF_DEG              (5.0f)


// =============================================================================
// SECTION 5: CẢM BIẾN QUANG TEMT6000 & ADC (OPTICAL SENSORS & FUSION)
// =============================================================================

/** [V] Mảng hệ số bù gain giữa 4 cảm biến TEMT6000 (Top, Bottom, Left, Right).
 *  Đo đạc dưới ánh sáng đồng nhất để chuẩn hóa về cùng thang đo. */
#define CFG_V_GAIN_LDR_TOP                  (1.00f)
#define CFG_V_GAIN_LDR_BOTTOM               (1.00f)
#define CFG_V_GAIN_LDR_LEFT                 (1.00f)
#define CFG_V_GAIN_LDR_RIGHT                (1.00f)

/** [W] Ngưỡng bão hòa của ADC (ESP32-S3 12-bit ADC: 0..4095).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ].
 *  Nếu giá trị raw vượt quá ngưỡng này, coi như cảm biến bị bão hòa. */
#define CFG_W_ADC_SATURATION_THRESHOLD      (3950)

/** [X] T_dark: Ngưỡng tổng cường độ sáng tối (ADC sum), xác định trời đã tối / mây mù nặng.
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]. */
#define CFG_X_T_DARK_THRESHOLD              (400.0f)

/** [Y] T_bright: Ngưỡng tổng cường độ sáng đủ để kích hoạt bám chủ động (Hysteresis: Y > X).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]. */
#define CFG_Y_T_BRIGHT_THRESHOLD            (900.0f)

/** [Z] k_s: Hệ số chuyển đổi từ tỷ số quang sai lệch normalized e_s sang góc lệch (Độ).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ].
 *  Delta_theta_optical = k_s * e_s. Cần hiệu chuẩn thực nghiệm trên bench quang. */
#define CFG_Z_OPTICAL_CONV_FACTOR_DEG       (12.0f)

/** [Z2] Delta_s_max: Biên độ hiệu chỉnh góc tối đa cho phép từ TEMT6000 (Độ).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ].
 *  Để bảo vệ chống lại hiện tượng mây lừa (albedo) hoặc vật cản che một phần.
 *  Phải lớn hơn sai số lắp đặt cơ khí của G và H. Placeholder: 6.0°. */
#define CFG_Z2_MAX_OPTICAL_CORRECTION_DEG   (6.0f)

/** Vùng chết sai số quang học normalized (|e_s| < deadband thì coi như đã cân bằng tâm sáng).
 *  TRẠNG THÁI: [TẠM, CHỜ ĐO THỰC TẾ]. */
#define CFG_OPTICAL_DEADBAND                (0.04f)

/** Số mẫu Oversampling đọc ADC cảm biến TEMT6000. */
#define CFG_ADC_OVERSAMPLE_COUNT            (64)


// =============================================================================
// SECTION 6: CHU KỲ VÒNG ĐIỀU KHIỂN & NGƯỠNG ĐIỀU HÀNH (TIMINGS & THRESHOLDS)
// =============================================================================

/** Chu kỳ vòng ngoài T_outer (Giây). Chọn cố định dùng chung cho mọi cấu hình (1..5 phút).
 *  Đề xuất: 120 giây (2 phút). */
#define CFG_T_OUTER_PERIOD_SEC              (120)

/** Chu kỳ vòng trong T_inner (Mili-giây). Chỉ chạy khi động cơ đang quay điều chỉnh góc.
 *  Đề xuất: 20 ms (50 Hz). */
#define CFG_T_INNER_PERIOD_MS               (20)

/** Ngưỡng góc lệch kích hoạt quay theta_th (Độ). Dùng chung cho mọi cấu hình so sánh.
 *  Nếu |theta_target - theta_actual| > CFG_THETA_THRESHOLD_DEG thì mới khởi động động cơ quay. */
#define CFG_THETA_THRESHOLD_DEG             (2.5f)

/** Vùng chết dừng điều khiển (Deadband, Độ).
 *  Khi góc sai số lọt vào [-0.3°, +0.3°], coi như đã đạt mục tiêu và dừng động cơ. */
#define CFG_THETA_DEADBAND_DEG              (0.3f)

/** Thời gian quay tối đa cho phép trong 1 chu kỳ bám (Giây). Vượt quá thì ngắt khẩn cấp vì kẹt cơ. */
#define CFG_MAX_MOVE_TIMEOUT_SEC            (45)

/** Ngưỡng sai số bước cho phép giữa xung phát RMT và xung đếm Encoder (Encoder counts).
 *  Vượt quá ngưỡng này -> Báo lỗi MẤT BƯỚC (STEP_LOSS). */
#define CFG_MAX_STEP_LOSS_TOLERANCE_COUNTS  (64)

/** Cửa sổ ngủ đêm cứng (Không thức dậy vì cảm biến): 19:00 -> 03:00. */
#define CFG_NIGHT_SLEEP_START_HOUR          (19)
#define CFG_NIGHT_SLEEP_START_MINUTE        (0)
#define CFG_NIGHT_SLEEP_END_HOUR            (3)
#define CFG_NIGHT_SLEEP_END_MINUTE          (0)

/** Chu kỳ thăm dò lúc hừng đông (Dawn poll interval, Phút). */
#define CFG_DAWN_POLL_INTERVAL_MIN          (15)

/** Số phút liên tục tổng sáng < CFG_X_T_DARK_THRESHOLD để xác nhận đi ngủ. */
#define CFG_NIGHT_CONFIRM_MINUTES           (10)


// =============================================================================
// SECTION 7: CẤU HÌNH THUẬT TOÁN PSO & FUZZY-PID
// =============================================================================

/** Số lượng hạt trong bầy PSO. */
#define CFG_PSO_SWARM_SIZE                  (10)

/** Số vòng lặp tối đa của PSO. */
#define CFG_PSO_MAX_ITERATIONS              (25)

/** Trọng số quán tính w, hệ số tự học c1, hệ số xã hội c2 của PSO. */
#define CFG_PSO_W_INERTIA                   (0.729f)
#define CFG_PSO_C1_COGNITIVE                (1.494f)
#define CFG_PSO_C2_SOCIAL                   (1.494f)

/** Giới hạn thời gian tối đa chạy PSO online trên ESP32 core 1 (Mili-giây). */
#define CFG_PSO_ONLINE_TIMEOUT_MS           (800)

/** Bước thời gian tích phân mô phỏng trong RAM của PSO (Giây). */
#define CFG_PSO_SIM_DT_SEC                  (0.01f)

/** Thời gian mô phỏng kiểm tra fitness của 1 hạt (Giây). */
#define CFG_PSO_SIM_DURATION_SEC            (2.5f)

/** Trọng số hàm mục tiêu Fitness: J = w_itae * ITAE + w_os * Overshoot + w_ts * Ts + w_loss * StepLossPenalty */
#define CFG_FITNESS_W_ITAE                  (1.0f)
#define CFG_FITNESS_W_OVERSHOOT             (20.0f)
#define CFG_FITNESS_W_SETTLING_TIME         (2.0f)
#define CFG_FITNESS_PENALTY_STEP_LOSS       (5000.0f)
#define CFG_FITNESS_PENALTY_INSTABILITY     (10000.0f)

/** Cờ bật homing lại sau khi thức dậy buổi sáng (0: tin tưởng vị trí STOW, 1: homing lại). */
#define CFG_HOME_ON_WAKE_ENABLED            (1)

#ifdef __cplusplus
}
#endif

#endif // SOLAR_CONFIG_H
