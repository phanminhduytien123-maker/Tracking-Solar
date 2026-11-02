/**
 * @file solar_types.h
 * @brief ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU, ENUMS, STRUCTS TOÀN HỆ THỐNG SOLAR TRACKER
 * @details Không phụ thuộc vào ESP-IDF hay Arduino, tương thích C++17 thuần cho cả PC và Vi điều khiển.
 */

#ifndef SOLAR_TYPES_H
#define SOLAR_TYPES_H

#include <stdint.h>
#include <stdbool.h>

namespace solar {

/**
 * @brief Định danh 2 trục chuyển động
 */
enum class AxisId : uint8_t {
    AZIMUTH = 0,
    ELEVATION = 1,
    COUNT = 2
};

/**
 * @brief Các chế độ điều khiển vòng trong (dùng để so sánh baseline theo yêu cầu)
 */
enum class ControlMode : uint8_t {
    PID = 0,             ///< PID cổ điển với hệ số cố định
    FUZZY_PID = 1,       ///< Fuzzy tự chỉnh tham số PID thời gian thực
    PSO_FUZZY_PID = 2    ///< Tối ưu hóa bầy đàn PSO tìm bộ hệ số cơ sở cho Fuzzy-PID
};

/**
 * @brief Máy trạng thái hữu hạn của toàn hệ thống Solar Tracker
 */
enum class TrackerState : uint8_t {
    BOOT = 0,            ///< Khởi động, kiểm tra ngoại vi, đọc NVS
    HOMING_EL = 1,       ///< Về gốc trục Elevation trước (chạm công tắc hạn vị trên J=90°)
    HOMING_AZ = 2,       ///< Về gốc trục Azimuth sau (chạm công tắc HOME phi=0°)
    IDLE = 3,            ///< Chờ hết chu kỳ vòng ngoài T_outer
    SENSE = 4,           ///< Đọc DS3231, TEMT6000 oversampling, INA226
    DECIDE = 5,          ///< Tính góc mặt trời NOAA, hợp nhất cảm biến, kiểm tra ngưỡng theta_th
    PSO_OPT = 6,         ///< Chạy PSO trên mô hình RAM (nếu cấu hình PSO_FUZZY_PID)
    MOVE = 7,            ///< Kích hoạt vòng trong Fuzzy-PID phát xung xoay động cơ
    SETTLE = 8,          ///< Đợi cơ khí ổn định sau khi ngắt xung (damping đai)
    LOG_TELEMETRY = 9,   ///< Đóng gói TelemetryPacket đẩy sang TelemetrySink
    PARK = 10,           ///< Quay về vị trí đỗ an toàn (el=90°, az=home)
    PREP_SLEEP = 11,     ///< Lưu trạng thái NVS, gpio_hold, hẹn giờ DS3231 INT
    DEEP_SLEEP = 12,     ///< Ngủ sâu ESP32 (DM556 giữ half-current 24V)
    DAWN_POLL = 13,      ///< Thức dậy định kỳ thăm dò cường độ sáng lúc bình minh
    FAULT = 14           ///< Trạng thái lỗi dừng khẩn cấp
};

/**
 * @brief Nguồn góc mục tiêu (TrackSource)
 */
enum class TrackSource : uint8_t {
    EPHEMERIS_ONLY = 0,  ///< Chỉ dùng thiên văn NOAA thuần (theta_ref = theta_ff)
    SENSOR_ONLY = 1,     ///< Chỉ dùng cảm biến TEMT6000 (cho thí nghiệm đối chứng)
    HYBRID = 2           ///< Kết hợp Feedforward thiên văn + Feedback quang TEMT6000 (Mặc định)
};

/**
 * @brief Nguồn gốc giá trị tọa độ địa lý đang áp dụng
 */
#ifdef DEFAULT
#undef DEFAULT
#endif
enum class SiteSource : uint8_t {
    FIREBASE = 0,        ///< Đọc hợp lệ từ Firebase Realtime Database
    NVS = 1,             ///< Đọc từ bộ nhớ Flash NVS lưu lần trước
    DEFAULT = 2          ///< Đọc từ hằng số mặc định trong solar_config.h
};

/**
 * @brief Hợp đồng dữ liệu cấu hình tọa độ lắp đặt (SiteConfig)
 * @details Thuần C++17, độc lập mạng, nhận qua ICommandSource hoặc NVS.
 */
struct SiteConfig {
    double lat_deg;              ///< Vĩ độ A (độ, Dương = Bắc, Âm = Nam, 5 chữ số thập phân)
    double lon_deg;              ///< Kinh độ B (độ, Dương = Đông, Âm = Tây, 5 chữ số thập phân)
    uint32_t rev;                ///< Số thứ tự phiên bản, tăng mỗi lần sửa trên web
    uint64_t updated_at;         ///< Thời điểm sửa (ms Unix timestamp)
    char updated_by[32];         ///< Định danh người sửa ("admin", "operator", ...)
    bool valid;                  ///< Cờ hợp lệ sau kiểm tra (firmware tính)
    bool warning_outside_vn;     ///< Cảnh báo tọa độ nằm ngoài lãnh thổ Việt Nam
    bool warning_inverted;       ///< Cảnh báo có dấu hiệu bị đảo kinh/vĩ độ
    SiteSource source;           ///< Nguồn gốc của tọa độ hiện tại
    bool confirmed;              ///< Cờ xác nhận tọa độ thực địa bởi người dùng/admin
    char confirmed_by[32];       ///< Định danh người bấm xác nhận tọa độ
    uint64_t confirmed_at;       ///< Thời điểm bấm xác nhận tọa độ (ms Unix timestamp)
};

/**
 * @brief Cờ lỗi và cảnh báo hệ thống (Bitmask 32-bit)
 */
enum class FaultFlag : uint32_t {
    NONE                     = 0,
    STEP_LOSS_AZ             = (1 << 0),   ///< Lệch xung phát và xung encoder trục Azimuth vượt ngưỡng
    STEP_LOSS_EL             = (1 << 1),   ///< Lệch xung phát và xung encoder trục Elevation vượt ngưỡng
    LIMIT_SWITCH_AZ_UNEXP    = (1 << 2),   ///< Chạm công tắc hành trình Azimuth ngoài chu trình Homing
    LIMIT_SWITCH_EL_UNEXP    = (1 << 3),   ///< Chạm công tắc hành trình Elevation ngoài chu trình Homing
    SOFT_LIMIT_AZ_EXCEEDED   = (1 << 4),   ///< Mục tiêu hoặc vị trí thực vượt giới hạn mềm Azimuth
    SOFT_LIMIT_EL_EXCEEDED   = (1 << 5),   ///< Mục tiêu hoặc vị trí thực vượt giới hạn mềm Elevation
    MOVE_TIMEOUT_AZ          = (1 << 6),   ///< Quá thời gian quay trục Azimuth
    MOVE_TIMEOUT_EL          = (1 << 7),   ///< Quá thời gian quay trục Elevation
    ESTOP_TRIGGERED          = (1 << 8),   ///< Nút dừng khẩn cấp E-Stop được kích hoạt
    LOW_BATTERY              = (1 << 9),   ///< Điện áp ắc quy dưới ngưỡng bảo vệ
    RTC_INVALID              = (1 << 10),  ///< DS3231 mất nguồn / thời gian không hợp lệ (RTC_LOST)
    RTC_LOST                 = (1 << 10),  ///< Bí danh chuẩn: DS3231 OSF=1 hoặc giờ không đáng tin
    PSO_TIMEOUT              = (1 << 11),  ///< PSO online vượt quá ngân sách thời gian trên ESP32
    ADC_SATURATION           = (1 << 12),  ///< TEMT6000 bị bão hòa ADC
    ENCODER_GLITCH           = (1 << 13),  ///< Tín hiệu Encoder bị nhiễu nhảy bước bất thường
    HOMING_FAILED            = (1 << 14),  ///< Không tìm thấy công tắc hành trình trong cự ly quy định
    DIR_POLARITY_UNCERTAIN   = (1 << 15),  ///< Cực tính DIR chưa được xác nhận kiểm thử
    SEVERE_DATA_INVALID      = (1 << 16),  ///< Lỗi nghiêm trọng: Đánh dấu hủy mẫu ngày thí nghiệm (cả 2 tấm)
    RTC_JUMP                 = (1 << 17),  ///< Phát hiện RTC nhảy giờ bất thường giữa 2 lần đọc
    RTC_NO_BATTERY_SUSPECT   = (1 << 18),  ///< Cờ OSF bật nhiều lần, nghi ngờ mất/hết pin CR2032
    SITE_CONFIG_INVALID      = (1 << 19),  ///< Tọa độ SiteConfig không hợp lệ sau khi validate
    SITE_FROM_NVS            = (1 << 20),  ///< Đang sử dụng tọa độ dự phòng từ NVS Flash
    SITE_FROM_DEFAULT        = (1 << 21),  ///< Đang sử dụng tọa độ mặc định từ solar_config.h
    SITE_CHANGE_REJECTED     = (1 << 22),  ///< Lệnh đổi tọa độ bị từ chối (do EXPERIMENT_LOCK hoặc đang MOVE)
    SITE_CHANGED_IN_EXPERIMENT = (1 << 23),///< Cố tình đổi tọa độ giữa đợt đo: Loại ngày khỏi thống kê!
    AZ_CLAMP                 = (1 << 24),  ///< Góc phi_ff bị kẹp vào giới hạn mềm cáp xoay [0, I]
    EL_LOW_CLAMP             = (1 << 25),  ///< Góc eps_ff bị kẹp cận dưới L=25° chống va chạm trục Z
    ZENITH_CLAMP             = (1 << 26),  ///< Góc eps_ff bị kẹp cận trên J=90° (hoặc vùng kỳ dị thiên đỉnh)
    CALIB_DRIFT              = (1 << 27)   ///< Phát hiện lệch hiệu chuẩn quang e_s lệch 1 phía liên tục
};

inline FaultFlag operator|(FaultFlag a, FaultFlag b) {
    return static_cast<FaultFlag>(static_cast<uint32_t>(a) | static_cast<uint32_t>(b));
}

inline FaultFlag operator&(FaultFlag a, FaultFlag b) {
    return static_cast<FaultFlag>(static_cast<uint32_t>(a) & static_cast<uint32_t>(b));
}

inline bool hasFault(FaultFlag mask, FaultFlag check) {
    return (static_cast<uint32_t>(mask) & static_cast<uint32_t>(check)) != 0;
}

/**
 * @brief Tọa độ mặt trời tính toán từ mô hình thiên văn NOAA
 */
struct SolarPosition {
    double azimuth_deg;       ///< Phương vị mặt trời (0° = Bắc, 90° = Đông, 180° = Nam, 270° = Tây)
    double elevation_deg;     ///< Góc cao mặt trời (0° = Chân trời, 90° = Thiên đỉnh)
    double zenith_deg;        ///< Góc thiên đỉnh = 90° - elevation_deg
    bool is_daylight;        ///< True nếu elevation_deg > ngưỡng bám tối thiểu
    uint16_t sunrise_min;    ///< Phút trong ngày mặt trời mọc (tính từ 00:00)
    uint16_t sunset_min;     ///< Phút trong ngày mặt trời lặn (tính từ 00:00)
    uint16_t tracking_start_min; ///< Phút trong ngày mặt trời đạt ngưỡng bám (el_sun >= threshold)
    uint16_t tracking_end_min;   ///< Phút trong ngày mặt trời hạ dưới ngưỡng bám (el_sun < threshold)
    bool atmospheric_refract_applied; ///< Đã bù khúc xạ khí quyển hay chưa
};

/**
 * @brief Mục tiêu điều khiển từng trục
 */
struct AxisTarget {
    float feedforward_deg;   ///< Góc feedforward thuần từ NOAA (phi_ff hoặc epsilon_ff)
    float sensor_corr_deg;   ///< Góc hiệu chỉnh tinh từ cảm biến TEMT6000 (đã qua sat ±Z2)
    float final_ref_deg;     ///< Góc mục tiêu cuối cùng = feedforward + sensor_corr (sau khi clamp)
    bool is_clamped;         ///< Cờ báo có bị kẹp bởi giới hạn mềm hay không
    const char* clamp_reason;///< Lý do kẹp: "ZENITH", "HORIZON_MIN", "CABLE_LIMIT", "NONE"
};

/**
 * @brief Trạng thái cơ điện từng trục
 */
struct AxisState {
    float actual_angle_deg;  ///< Góc thực tế đo từ encoder (hoặc mô hình góc thực của tấm)
    float error_deg;         ///< Sai số e = target - actual
    int32_t commanded_pulses;///< Tổng số xung đã phát bởi RMT/MCPWM
    int32_t encoder_counts;  ///< Tổng số xung đếm được bởi PCNT (chế độ 4x)
    int32_t pulse_count_diff;///< Độ lệch xung phát và xung encoder
    bool is_moving;          ///< Đang phát xung quay
    bool is_homed;           ///< Đã xác lập mốc HOME thành công
};

/**
 * @brief Dữ liệu 4 cảm biến quang TEMT6000
 */
struct TemtReadings {
    uint16_t raw_adc[4];         ///< Giá trị ADC raw 12-bit [0:Top, 1:Bottom, 2:Left, 3:Right]
    float compensated[4];        ///< Giá trị sau khi nhân hệ số gain V [Top, Bottom, Left, Right]
    float total_intensity;       ///< Tổng cường độ sáng tổng hợp (Lux hoặc ADC sum)
    float e_s_az;                ///< Tỷ số sai lệch quang trục Azimuth = (L - R) / (L + R)
    float e_s_el;                ///< Tỷ số sai lệch quang trục Elevation = (T - B) / (T + B)
    float w_s;                   ///< Trọng số tin cậy của cảm biến quang [0.0 .. 1.0]
    bool is_saturated;           ///< Cờ báo bất kỳ cảm biến nào vượt ngưỡng W
};

/**
 * @brief Dữ liệu từ cảm biến công suất INA226
 */
struct InaReadings {
    float bus_voltage_v;     ///< Điện áp tấm pin (V)
    float shunt_current_a;   ///< Dòng điện phát ra (A)
    float power_w;           ///< Công suất tức thời (W)
    float energy_wh;         ///< Năng lượng tích lũy trong ngày (Wh)
};

/**
 * @brief Thông số biên dạng chuyển động hình thang (Trapezoidal Motion Profile)
 */
struct MotionProfile {
    int32_t total_pulses;     ///< Tổng số xung cần phát
    float total_time_sec;     ///< Tổng thời gian di chuyển (giây)
    float accel_time_sec;     ///< Thời gian tăng tốc (giây)
    float cruise_time_sec;    ///< Thời gian chạy đều (giây)
    float peak_freq_hz;       ///< Tần số xung đỉnh đạt được (Hz)
    bool is_triangular;       ///< Cờ báo biên dạng hình tam giác (không đạt f_max)
};

/**
 * @brief Bộ hệ số PID
 */
struct PidGains {
    float kp;
    float ki;
    float kd;
};

/**
 * @brief Lượng hiệu chỉnh từ Fuzzy logic
 */
struct FuzzyAdjustment {
    float d_kp;
    float d_ki;
    float d_kd;
};

/**
 * @brief Struct TelemetryPacket phục vụ ghi Log và gửi ra TelemetrySink (Yêu cầu Phase 0, 7, 8, 9)
 * @details Chứa dữ liệu thô, góc tính toán, thông số RTC, công suất và trạng thái toàn diện của 1 chu kỳ bám.
 */
struct TelemetryPacket {
    uint32_t timestamp_epoch;            ///< Thời gian UTC (giây từ epoch)
    uint16_t year;
    uint8_t month, day, hour, minute, second;

    TrackerState state;                  ///< Trạng thái máy hữu hạn
    ControlMode control_mode;            ///< Chế độ điều khiển hiện hành
    TrackSource track_source;            ///< Nguồn tạo góc mục tiêu: EPHEMERIS_ONLY | SENSOR_ONLY | HYBRID

    // Dữ liệu vị trí lắp đặt (SiteConfig telemetry)
    double lat_deg;                      ///< Vĩ độ A đang dùng (độ, 5 số thập phân)
    double lon_deg;                      ///< Kinh độ B đang dùng (độ, 5 số thập phân)
    uint32_t site_rev;                   ///< Số thứ tự phiên bản SiteConfig
    SiteSource site_source;              ///< Nguồn tọa độ: FIREBASE | NVS | DEFAULT

    // Trạng thái đồng hồ thời gian thực RTC DS3231
    bool rtc_osf;                        ///< Cờ Oscillator Stop Flag (1: từng mất nguồn/pin, giờ không đáng tin)
    float rtc_temp_c;                    ///< Nhiệt độ cảm biến tích hợp trong chip DS3231 (°C)
    float ntp_minus_rtc_s;               ///< Độ lệch giữa NTP và RTC DS3231 (giây, để đánh giá độ trôi)

    // Dữ liệu thiên văn & góc mặt trời
    SolarPosition solar_pos;             ///< Struct thiên văn chuẩn
    float el_sun_raw_deg;                ///< Góc nâng mặt trời el_sun CHƯA bù khúc xạ khí quyển (độ)
    float el_sun_refracted_deg;          ///< Góc nâng mặt trời el_sun ĐÃ bù khúc xạ khí quyển (độ)
    float az_sun_deg;                    ///< Phương vị mặt trời az_sun (độ, tính từ Bắc theo chiều KĐH)

    // Góc Feedforward (θ_ff) và Mục tiêu cuối cùng (θ_ref) cho hai trục
    float theta_ff_az_deg;               ///< phi_ff (Động cơ 1 - Góc quay)
    float theta_ff_el_deg;               ///< epsilon_ff (Động cơ 2 - Độ ngửa)
    float theta_ref_az_deg;              ///< phi_ref = phi_ff + sat(w_s * Z * e_s, ±Z2)
    float theta_ref_el_deg;              ///< epsilon_ref = epsilon_ff + sat(w_s * Z * e_s, ±Z2)

    AxisTarget target_az;                ///< Chi tiết mục tiêu trục Azimuth (Động cơ 1 - Góc quay)
    AxisTarget target_el;                ///< Chi tiết mục tiêu trục Elevation (Động cơ 2 - Độ ngửa)

    // Góc lệch thực giữa pháp tuyến tấm và tia nắng (Chỉ số đánh giá bám cosΘ)
    // cosΘ = sin ε · sin el_sun + cos ε · cos el_sun · cos(az_tấm − az_sun)
    float cos_theta_target;              ///< cosΘ tính toán theo góc mục tiêu mong muốn
    float cos_theta_actual_est;          ///< cosΘ ước lượng theo góc thực tế đọc từ Encoder 3806
    float theta_misalignment_deg;        ///< Góc lệch thực Θ mong muốn (độ)
    float theta_actual_misalignment_deg; ///< Góc lệch thực Θ thực tế ước lượng (độ)

    // Trạng thái cơ điện 2 trục
    AxisState state_az;                  ///< Trạng thái Động cơ 1 (Góc quay)
    AxisState state_el;                  ///< Trạng thái Động cơ 2 (Độ ngửa)

    // Tham số điều khiển thực tế
    PidGains base_gains_az;
    PidGains base_gains_el;
    FuzzyAdjustment fuzzy_adj_az;
    FuzzyAdjustment fuzzy_adj_el;

    // Cảm biến quang TEMT6000 & sai số quang học
    TemtReadings temt;
    float optical_es_az;                 ///< e_s trục Azimuth = (L - R) / (L + R)
    float optical_es_el;                 ///< e_s trục Elevation = (T - B) / (T + B)
    float optical_ws;                    ///< Trọng số tin cậy w_s [0.0 .. 1.0]

    // Cờ giới hạn mềm (Clamps)
    bool az_clamp;                       ///< Bị kẹp bởi hành trình cáp [0, I]
    bool el_low_clamp;                   ///< Bị kẹp cận dưới L=25° chống va chạm trục Z
    bool zenith_clamp;                   ///< Bị kẹp cận trên hoặc vùng kỳ dị thiên đỉnh

    // Công suất 2 tấm (Tấm xoay Tracker & Tấm cố định Static)
    InaReadings ina_tracker;             ///< Đo tấm xoay theo vết
    InaReadings ina_static;              ///< Đo tấm cố định đặt cạnh nhau

    // Thông số hiệu năng chuyển động
    float move_duration_az_sec;          ///< Thời gian quay trục Az (giây)
    float move_duration_el_sec;          ///< Thời gian quay trục El (giây)
    float final_rms_error_deg;           ///< Sai số RMS còn lại sau khi dừng

    // Cờ trạng thái & Lỗi
    FaultFlag fault_flags;               ///< Bitmask lỗi toàn diện
    bool is_pso_converged;               ///< PSO có hội tụ không
    bool is_day_invalid;                 ///< Ngày có lỗi nặng (RTC_LOST, JUMP, SITE_CHANGED_IN_EXP...), loại cả 2 tấm
};

/**
 * @brief Lệnh điều khiển gửi từ CommandSource vào hệ thống
 */
struct CommandPacket {
    enum class Type : uint8_t {
        NONE = 0,
        SET_MODE,           ///< Đổi chế độ điều khiển: PID | FUZZY_PID | PSO_FUZZY_PID
        SET_THRESHOLD,      ///< Đổi ngưỡng kích hoạt quay theta_th
        SET_OUTER_PERIOD,   ///< Đổi chu kỳ vòng ngoài T_outer
        FORCE_STATE,        ///< Cưỡng bức chuyển trạng thái (vd: PARK, HOMING)
        MANUAL_JOG,         ///< Jog cơ khí từng trục (dùng cho hiệu chuẩn bench)
        TRIGGER_ESTOP,      ///< Kích hoạt hoặc giải phóng E-Stop phần mềm
        CLEAR_FAULTS,       ///< Xóa cờ lỗi sau khi khắc phục sự cố
        SET_SITE_CONFIG     ///< Cập nhật SiteConfig từ Firebase
    } type;

    union {
        struct {
            ControlMode mode;
        } set_mode;

        struct {
            float theta_th_deg;
            float deadband_deg;
        } set_threshold;

        struct {
            uint32_t period_sec;
        } set_period;

        struct {
            TrackerState target_state;
        } force_state;

        struct {
            AxisId axis;
            int32_t pulse_count;
            float speed_hz;
        } manual_jog;

        struct {
            bool active;
        } estop;

        struct {
            SiteConfig site;
        } set_site;
    } params;
};

} // namespace solar

#endif // SOLAR_TYPES_H
