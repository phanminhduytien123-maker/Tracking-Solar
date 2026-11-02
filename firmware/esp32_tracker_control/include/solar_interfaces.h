/**
 * @file solar_interfaces.h
 * @brief ĐỊNH NGHĨA HAI GIAO DIỆN TRỪU TƯỢNG: TelemetrySink VÀ CommandSource
 * @details Tách biệt hoàn toàn thuật toán điều khiển với các giao thức mạng (Firebase, Render, Serial, SD card...).
 *          Hệ thống điều khiển chỉ tương tác với 2 interface này.
 */

#ifndef SOLAR_INTERFACES_H
#define SOLAR_INTERFACES_H

#include "solar_types.h"

namespace solar {

/**
 * @brief Giao diện trừu tượng nhận dữ liệu Telemetry từ hệ thống điều khiển
 * @details Bất kỳ module truyền thông nào (Firebase Client, MQTT, UART logger, SD card writer)
 *          chỉ cần kế thừa ITelemetrySink và hiện thực hàm pushTelemetry().
 */
class ITelemetrySink {
public:
    virtual ~ITelemetrySink() = default;

    /**
     * @brief Đẩy một gói Telemetry hoàn chỉnh ra ngoài
     * @param packet Struct chứa toàn bộ dữ liệu thô, góc bám, công suất và cờ lỗi của chu kỳ bám
     * @return true nếu gửi/ghi thành công, false nếu buffer đầy hoặc lỗi kênh truyền
     */
    virtual bool pushTelemetry(const TelemetryPacket& packet) = 0;

    /**
     * @brief Kiểm tra kênh truyền đã sẵn sàng nhận dữ liệu hay chưa
     */
    virtual bool isReady() const = 0;
};

/**
 * @brief Giao diện trừu tượng cung cấp lệnh điều khiển từ bên ngoài vào hệ thống
 * @details Bất kỳ nguồn lệnh nào (Firebase Stream, Web Dashboard, Serial CLI, Nút bấm)
 *          chỉ cần kế thừa ICommandSource và hiện thực hàm pollCommand().
 */
class ICommandSource {
public:
    virtual ~ICommandSource() = default;

    /**
     * @brief Lấy lệnh điều khiển kế tiếp từ hàng đợi (Non-blocking)
     * @param[out] outCmd Struct chứa lệnh và tham số kèm theo
     * @return true nếu có lệnh mới cần xử lý, false nếu hàng đợi trống
     */
    virtual bool pollCommand(CommandPacket& outCmd) = 0;

    /**
     * @brief Thăm dò cấu hình tọa độ SiteConfig mới từ Firebase (Non-blocking)
     * @param[out] outSite Struct cấu hình tọa độ nhận được
     * @return true nếu có bản cập nhật SiteConfig mới từ Firebase, false nếu không có
     */
    virtual bool pollSiteConfig(SiteConfig& outSite) {
        (void)outSite;
        return false;
    }

    /**
     * @brief Kiểm tra xem có lệnh dừng khẩn cấp (E-Stop) hay không
     */
    virtual bool isEstopTriggered() const = 0;
};

} // namespace solar

#endif // SOLAR_INTERFACES_H
