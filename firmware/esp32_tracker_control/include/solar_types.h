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
 * @brief Cờ lỗi hệ thống (Bitmask 32-bit)
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
    RTC_INVALID              = (1 << 10),  ///< DS3231 mất nguồn / thời gian không hợp lệ
    PSO_TIMEOUT              = (1 << 11),  ///< PSO online vượt quá ngân sách thời gian trên ESP32
    ADC_SATURATION           = (1 << 12),  ///< TEMT6000 bị bão hòa ADC
    ENCODER_GLITCH           = (1 << 13),  ///< Tín hiệu Encoder bị nhiễu nhảy bước bất thường
    HOMING_FAILED            = (1 << 14),  ///< Không tìm thấy công tắc hành trình trong cự ly quy định
    DIR_POLARITY_UNCERTAIN   = (1 << 15),  ///< Cực tính DIR chưa được xác nhận kiểm thử
    SEVERE_DATA_INVALID      = (1 << 16)   ///< Lỗi nghiêm trọng: Đánh dấu hủy mẫu ngày thí nghiệm (cả 2 tấm)
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
    float azimuth_deg;       ///< Phương vị mặt trời (0° = Bắc, 90° = Đông, 180° = Nam, 270° = Tây)
    float elevation_deg;     ///< Góc cao mặt trời (0° = Chân trời, 90° = Thiên đỉnh)
    float zenith_deg;        ///< Góc thiên đỉnh = 90° - elevation_deg
    bool is_daylight;        ///< True nếu elevation_deg > ngưỡng bám tối thiểu
    uint16_t sunrise_min;    ///< Phút trong ngày mặt trời mọc (tính từ 00:00)
    uint16_t sunset_min;     ///< Phút trong ngày mặt trời lặn (tính từ 00:00)
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
 * @brief Struct TelemetryPacket phục vụ ghi Log và gửi ra TelemetrySink (Yêu cầu Phase 9)
 * @details Chứa dữ liệu thô, góc tính toán, công suất và trạng thái toàn diện của 1 chu kỳ bám.
 */
struct TelemetryPacket {
    uint32_t timestamp_epoch;            ///< Thời gian UTC (giây từ epoch)
    uint16_t year;
    uint8_t month, day, hour, minute, second;

    TrackerState state;                  ///< Trạng thái máy hữu hạn
    ControlMode control_mode;            ///< Chế độ điều khiển hiện hành

    // Dữ liệu thiên văn & mục tiêu
    SolarPosition solar_pos;
    AxisTarget target_az;
    AxisTarget target_el;

    // Trạng thái cơ điện 2 trục
    AxisState state_az;
    AxisState state_el;

    // Tham số điều khiển thực tế
    PidGains base_gains_az;
    PidGains base_gains_el;
    FuzzyAdjustment fuzzy_adj_az;
    FuzzyAdjustment fuzzy_adj_el;

    // Cảm biến quang TEMT6000
    TemtReadings temt;

    // Công suất 2 tấm (Tấm xoay Tracker & Tấm cố định Static)
    InaReadings ina_tracker;             ///< Đo tấm xoay theo vết
    InaReadings ina_static;              ///< Đo tấm cố định đặt cạnh nhau

    // Thông số hiệu năng chuyển động
    float move_duration_az_sec;          ///< Thời gian quay trục Az (giây)
    float move_duration_el_sec;          ///< Thời gian quay trục El (giây)
    float final_rms_error_deg;           ///< Sai số RMS còn lại sau khi dừng

    // Cờ trạng thái & Lỗi
    FaultFlag fault_flags;               ///< Bitmask lỗi
    bool is_pso_converged;               ///< PSO có hội tụ không
    bool is_day_invalid;                 ///< Ngày có lỗi nặng, loại cả 2 tấm khỏi thống kê 30 ngày
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
        CLEAR_FAULTS        ///< Xóa cờ lỗi sau khi khắc phục sự cố
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
    } params;
};

} // namespace solar

#endif // SOLAR_TYPES_H
