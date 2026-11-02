/**
 * @file hal_interfaces.h
 * @brief TẬP HỢP GIAO DIỆN PHẦN CỨNG TRỪU TƯỢNG (HARDWARE ABSTRACTION LAYER - HAL)
 * @details Cho phép chạy toàn bộ logic trên PC (Native Mock) hoặc trên ESP32-S3 (ESP-IDF Drivers).
 *          Bao gồm: Tạo xung PUL/DIR, Đọc Encoder PCNT, Công tắc hành trình, ADC TEMT6000,
 *          I2C INA226/DS3231, NVS Flash, Quản lý nguồn & Deep Sleep.
 */

#ifndef HAL_INTERFACES_H
#define HAL_INTERFACES_H

#include "solar_types.h"
#include <stdint.h>
#include <stdbool.h>

namespace solar {

/**
 * @brief Điều khiển phát xung phần cứng cho động cơ bước qua driver DM556
 */
class IStepperPulseDriver {
public:
    virtual ~IStepperPulseDriver() = default;

    /**
     * @brief Thiết lập chiều quay
     * @param axis Trục cần điều khiển (AZIMUTH hoặc ELEVATION)
     * @param positive_direction true nếu quay theo chiều dương góc, false nếu chiều âm
     */
    virtual void setDirection(AxisId axis, bool positive_direction) = 0;

    /**
     * @brief Khởi động phát xung định lượng với profile hình thang/S-curve (Non-blocking)
     * @param axis Trục cần phát xung
     * @param pulse_count Số lượng xung cần phát
     * @param target_freq_hz Tần số đỉnh (Hz)
     * @param accel_hz_s Gia tốc biến đổi tần số (Hz/s)
     * @return true nếu bắt đầu phát xung thành công, false nếu trục đang bận
     */
    virtual bool startPulseProfile(AxisId axis, uint32_t pulse_count, float target_freq_hz, float accel_hz_s) = 0;

    /**
     * @brief Dừng phát xung ngay lập tức (dùng khi chạm limit switch hoặc E-Stop)
     */
    virtual void stopImmediate(AxisId axis) = 0;

    /**
     * @brief Lấy số lượng xung đã phát ra từ driver RMT/MCPWM
     */
    virtual int32_t getEmittedPulses(AxisId axis) const = 0;

    /**
     * @brief Kiểm tra động cơ có đang phát xung hay không
     */
    virtual bool isRunning(AxisId axis) const = 0;
};

/**
 * @brief Đọc xung phản hồi từ Encoder 3806 qua phần cứng PCNT (chế độ x4, lọc nhiễu glitch)
 */
class IEncoderReader {
public:
    virtual ~IEncoderReader() = default;

    /**
     * @brief Lấy tổng số xung đếm được (xử lý mở rộng 32-bit tránh tràn bộ đếm 16-bit của PCNT)
     */
    virtual int32_t getCount(AxisId axis) const = 0;

    /**
     * @brief Đặt lại giá trị đếm của bộ đếm PCNT (ví dụ: gán 0 khi chạm điểm HOME)
     */
    virtual void resetCount(AxisId axis, int32_t initial_count = 0) = 0;

    /**
     * @brief Kiểm tra cờ lỗi nhiễu hoặc xung bất thường
     */
    virtual bool hasGlitchError(AxisId axis) const = 0;
};

/**
 * @brief Đọc công tắc hành trình cơ khí (có lọc rung phím - debounce)
 */
class ILimitSwitchReader {
public:
    virtual ~ILimitSwitchReader() = default;

    /**
     * @brief Đọc trạng thái công tắc hành trình
     * @param axis Trục cần đọc
     * @return true nếu công tắc đang bị nhấn (kích hoạt), false nếu nhả
     */
    virtual bool isTriggered(AxisId axis) const = 0;
};

/**
 * @brief Đọc 4 cảm biến quang TEMT6000 qua ADC ESP32-S3
 */
class IAnalogSensors {
public:
    virtual ~IAnalogSensors() = default;

    /**
     * @brief Đọc giá trị ADC 12-bit của 4 cảm biến quang với kỹ thuật oversampling
     * @param[out] out_raw Mảng 4 phần tử [0:Top, 1:Bottom, 2:Left, 3:Right]
     * @return true nếu đọc thành công, false nếu ADC lỗi
     */
    virtual bool readTemtSensors(uint16_t out_raw[4]) = 0;
};

/**
 * @brief Giao diện phần cứng trừu tượng đồng hồ thời gian thực RTC DS3231 (IRtc)
 * @details Quy ước: Lưu theo giờ địa phương UTC+7 (TZ_OFFSET_MIN = 420).
 *          Có pin dự phòng CR2032 (3V), VCC cấp 3.3V trực tiếp từ hệ thống.
 */
class IRtc {
public:
    virtual ~IRtc() = default;

    /**
     * @brief Đọc thời gian thực từ DS3231 (Giờ địa phương UTC+7)
     */
    virtual bool getDateTime(uint16_t& year, uint8_t& month, uint8_t& day,
                             uint8_t& hour, uint8_t& minute, uint8_t& second,
                             uint32_t& epoch_sec) = 0;

    /**
     * @brief Ghi đặt thời gian cho DS3231 (thường dùng khi đồng bộ NTP thành công hoặc đặt tay)
     */
    virtual bool setDateTime(uint16_t year, uint8_t month, uint8_t day,
                             uint8_t hour, uint8_t minute, uint8_t second) = 0;

    /**
     * @brief Đọc cờ Oscillator Stop Flag (OSF) trong thanh ghi trạng thái (Status Register 0Fh)
     * @param[out] osf_set true nếu cờ OSF = 1 (bộ dao động từng dừng do mất nguồn và mất pin, giờ không đáng tin)
     */
    virtual bool readOscillatorStopFlag(bool& osf_set) = 0;

    /**
     * @brief Xóa cờ OSF (ghi bit OSF về 0) sau khi đã cập nhật lại thời gian đáng tin cậy
     */
    virtual bool clearOscillatorStopFlag() = 0;

    /**
     * @brief Cài đặt báo thức Alarm 1 ngắt chân INT trên DS3231 để đánh thức ESP32 khỏi Deep Sleep
     * @param hour Giờ báo thức địa phương
     * @param minute Phút báo thức địa phương
     */
    virtual bool setWakeupAlarm(uint8_t hour, uint8_t minute) = 0;

    /**
     * @brief Tắt và xóa cấu hình báo thức Alarm
     */
    virtual bool clearWakeupAlarm() = 0;

    /**
     * @brief Xóa cờ ngắt báo thức (A1F) trên DS3231 sau khi thức dậy để chân INT giải phóng mức tích cực
     */
    virtual void clearAlarmInterrupt() = 0;

    /**
     * @brief Đọc nhiệt độ từ cảm biến nhiệt độ tích hợp của DS3231 (độ chính xác ±0.25°C) để log telemetry
     */
    virtual bool readTemperature(float& temp_c) = 0;

    /**
     * @brief Đọc trạng thái logic thực tế của chân INT DS3231 nối với chân ngắt ESP32
     * @param[out] pin_active true nếu chân INT đang tích cực (mức LOW do ngắt open-drain)
     */
    virtual bool readIntPinState(bool& pin_active) = 0;

    /**
     * @brief Kiểm tra tính hợp lệ toàn diện của RTC (OSF=0, năm >= 2026, không trôi ngược)
     */
    virtual bool isValid() const = 0;
};

using IRtcDriver = IRtc;

/**
 * @brief Đọc cảm biến công suất INA226 qua I2C (cho cả tấm xoay Tracker và tấm cố định Static)
 */
class IPowerSensors {
public:
    virtual ~IPowerSensors() = default;

    /**
     * @brief Đọc thông số tấm pin xoay (Tracker Panel)
     */
    virtual bool readTrackerPower(float& voltage_v, float& current_a, float& power_w) = 0;

    /**
     * @brief Đọc thông số tấm pin cố định đối chứng (Static Panel)
     */
    virtual bool readStaticPower(float& voltage_v, float& current_a, float& power_w) = 0;
};

/**
 * @brief Lưu trữ và phục hồi trạng thái hệ thống vào NVS Flash và RTC Fast Memory
 */
class INvsStorage {
public:
    virtual ~INvsStorage() = default;

    /**
     * @brief Lưu trạng thái, góc thực tế và mốc homing
     */
    virtual bool saveSystemState(TrackerState state, float az_deg, float el_deg, bool is_homed) = 0;

    /**
     * @brief Tải lại trạng thái hệ thống khi khởi động / thức dậy
     */
    virtual bool loadSystemState(TrackerState& state, float& az_deg, float& el_deg, bool& is_homed) = 0;

    /**
     * @brief Lưu cấu hình SiteConfig hợp lệ cuối cùng vào NVS Flash (dự phòng khi mất mạng)
     */
    virtual bool saveSiteConfig(const SiteConfig& site) = 0;

    /**
     * @brief Tải cấu hình SiteConfig từ NVS Flash
     */
    virtual bool loadSiteConfig(SiteConfig& outSite) = 0;

    /**
     * @brief Lưu mốc thời gian Unix timestamp cuối cùng hợp lệ để phát hiện nhảy lùi giờ
     */
    virtual bool saveLastTimestamp(uint32_t epoch_sec) = 0;

    /**
     * @brief Đọc mốc thời gian Unix timestamp lần chạy trước
     */
    virtual bool loadLastTimestamp(uint32_t& epoch_sec) = 0;
};

/**
 * @brief Quản lý chế độ tiết kiệm năng lượng, chốt chân GPIO và Deep Sleep
 */
class ISleepManager {
public:
    virtual ~ISleepManager() = default;

    /**
     * @brief Cấu hình các nguồn đánh thức ESP32 (Chân DS3231 INT, nút E-Stop)
     */
    virtual void configureWakeSources() = 0;

    /**
     * @brief Kích hoạt gpio_hold cho các chân PUL, DIR và chân OE của TXS0108E
     * @details Đảm bảo khi ESP32 rơi vào Deep Sleep, ngõ ra không bị trôi mức logic,
     *          DM556 duy trì giữ mô-men ở half-current mà không bị kích xung giả.
     */
    virtual void holdPinStates() = 0;

    /**
     * @brief Đưa ESP32 vào chế độ Deep Sleep
     */
    virtual void enterDeepSleep() = 0;
};

} // namespace solar

#endif // HAL_INTERFACES_H
