# QUY CHUẨN BẢO MẬT FIREBASE REALTIME DATABASE & KẾ HOẠCH KHÓA RULES
# FIREBASE SECURITY RULES SPECIFICATION

> **Trạng thái hiện tại**: CHƯA áp dụng lên Firebase Live (giữ mở chế độ `.read: true, .write: true` để debug và kiểm thử giao tiếp phần cứng không bị gián đoạn).  
> **Mốc thời gian khóa Rules**: **28/10/2026** (trước ngày chạy thử toàn hệ thống và chiến dịch thực nghiệm 01/11/2026).

---

## 1. NGUYÊN TẮC PHÂN QUYỀN MỚI

1. **Khách vãng lai (Unauthenticated / Public)**:
   - **CHỈ ĐỌC (Read-Only) ở MỌI node** (`.read: true` trên toàn bộ cây `/solar/*`).
   - Phục vụ người xem mở trang Web Dashboard quan sát trực tiếp các biểu đồ, tham số quang điện, góc nghiêng và thời tiết mà không cần đăng nhập.
   - **TUYỆT ĐỐI KHÔNG CÓ QUYỀN GHI** vào bất kỳ node nào (`.write: false` khi `auth == null`). Mọi hành vi dùng REST API / Postman / cURL gửi gói tin trái phép sẽ bị Google Firebase từ chối với mã lỗi `HTTP 401/403 Permission Denied`.

2. **Thiết bị nhúng ESP32-S3 (Tracker Node & Static Node)**:
   - Được quyền **GHI Telemetry** thời gian thực (`/solar/telemetry/*`, `/solar/tracking/*`, `/solar/static/*`, `/solar/history/*`).
   - Được quyền **ĐỌC Cấu hình & Lệnh** (`/solar/config/*`, `/solar/control/*`).
   - **Cơ chế xác thực của ESP32**:
     * **Cơ chế chuẩn (Khuyên dùng - Firebase Email/Password Auth)**: Tạo tài khoản chuyên dụng cho vi điều khiển trên Firebase Authentication (ví dụ: `esp32-tracker@solar-tracker.internal`). Thư viện `Firebase_ESP_Client` của Mobizt trên ESP32 tự động gửi yêu cầu đăng nhập nhận Token JWT (Access Token) và tự động làm mới (refresh) mỗi 60 phút. Khi đó `auth.uid === 'esp32_tracker_uid'` hoặc claim `auth.token.device === true`.
     * **Cơ chế dự phòng (Legacy Database Secret)**: Cấu hình `fbConfig.signer.tokens.legacy_token = "<DATABASE_SECRET>";`. Khi sử dụng secret, máy chủ Firebase cấp cờ `auth.admin === true`.
     * Rules được thiết kế tương thích với cả hai phương thức xác thực trên.

3. **Quản trị viên (Admin)**:
   - Có cờ xác thực Custom Claim `auth.token.admin === true`.
   - Có toàn quyền cấu hình tọa độ `/solar/config/site`, gửi lệnh điều khiển thủ công `/solar/control/*`, xác nhận thực địa (`site_confirmed`), và quản trị người dùng.

---

## 2. NỘI DUNG FIREBASE SECURITY RULES ĐỀ XUẤT

```json
{
  "rules": {
    "solar": {
      // 1. Cho phép đọc công khai toàn bộ để Web Dashboard hiển thị realtime
      ".read": true,

      // 2. Phân quyền ghi theo từng phân vùng chức năng
      "config": {
        // Chỉ Admin có custom claim mới được ghi/sửa cấu hình tọa độ, tham số
        ".write": "auth != null && (auth.token.admin === true || auth.admin === true)",
        "site": {
          ".validate": "newData.hasChildren(['lat_deg', 'lon_deg', 'rev'])",
          "lat_deg": {
            ".validate": "newData.isNumber() && newData.val() >= -90.0 && newData.val() <= 90.0"
          },
          "lon_deg": {
            ".validate": "newData.isNumber() && newData.val() >= -180.0 && newData.val() <= 180.0"
          },
          "rev": {
            ".validate": "newData.isNumber() && (!data.exists() || newData.val() > data.val())"
          }
        }
      },

      "control": {
        // Chỉ Admin mới được phát lệnh Jog, chuyển chế độ, đổi thuật toán, E-stop
        ".write": "auth != null && (auth.token.admin === true || auth.admin === true)",
        "command": {
          // Bắt buộc có mã lệnh cmd, timestamp và TTL
          ".validate": "newData.hasChildren(['cmd', 'timestamp'])"
        }
      },

      "telemetry": {
        // ESP32 (Device Token/Secret) hoặc Admin được ghi Telemetry
        ".write": "auth != null"
      },

      "tracking": {
        // Node dữ liệu telemetry trực tiếp của tấm xoay
        ".write": "auth != null"
      },

      "static": {
        // Node dữ liệu telemetry của tấm cố định
        ".write": "auth != null"
      },

      "history": {
        // Node nhật ký ngày và audit log
        ".write": "auth != null"
      },

      "security": {
        // Thông tin người dùng nội bộ: Chỉ admin đọc/ghi
        ".read": "auth != null && (auth.token.admin === true || auth.admin === true)",
        ".write": "auth != null && (auth.token.admin === true || auth.admin === true)"
      }
    }
  }
}
```

---

## 3. HƯỚNG DẪN CẤP CUSTOM CLAIM ADMIN (NODE.JS FIREBASE ADMIN SDK)

Để một tài khoản người dùng có quyền ghi vào `/solar/config/*` và `/solar/control/*`, cần gán Custom User Claim `admin: true` qua Firebase Admin SDK:

### Bước 1: Chuẩn bị tệp khóa Service Account
1. Truy cập [Firebase Console](https://console.firebase.google.com/) $\rightarrow$ Chọn Dự án.
2. Chọn biểu tượng **Cài đặt (Bánh răng)** $\rightarrow$ **Project settings** $\rightarrow$ Tab **Service accounts**.
3. Bấm **Generate new private key** $\rightarrow$ Tải tệp JSON về.
4. Đổi tên tệp thành `serviceAccountKey.json` và lưu vào thư mục `scripts/serviceAccountKey.json` trong dự án.

### Bước 2: Chạy lệnh gán quyền Admin
Mở PowerShell tại thư mục gốc dự án và chạy lệnh:
```bash
# Cài đặt thư viện firebase-admin (nếu chưa có)
npm install --save-dev firebase-admin

# Gán quyền admin theo email hoặc UID của người dùng:
node scripts/set_admin_claim.js phanminhduytien123@gmail.com
```

### Bước 3: Đăng nhập lại trên Dashboard
Sau khi script báo thành công, người dùng cần **Đăng xuất** và **Đăng nhập lại** trên giao diện Web Dashboard để trình duyệt nhận chuỗi JWT Token mới có chứa claim `{ admin: true }`.

---

## 4. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG BẰNG `@firebase/rules-unit-testing`

Tệp unit test mô phỏng quy tắc phân quyền: `dashboard/test/firebase_rules.test.js`.

### Các ca kiểm thử được bao phủ:
1. **Khách vãng lai (`unauthenticated`)**:
   - Đọc `/solar/tracking` $\to$ **CHO PHÉP (PASS)**.
   - Ghi `/solar/config/site` $\to$ **TỪ CHỐI (DENIED)**.
   - Ghi `/solar/control/command` $\to$ **TỪ CHỐI (DENIED)**.
   - Ghi `/solar/telemetry` $\to$ **TỪ CHỐI (DENIED)**.
2. **Thiết bị ESP32 (`auth: { uid: 'esp32_tracker_node' }`)**:
   - Đọc `/solar/config/site` $\to$ **CHO PHÉP (PASS)**.
   - Đọc `/solar/control/command` $\to$ **CHO PHÉP (PASS)**.
   - Ghi `/solar/tracking` $\to$ **CHO PHÉP (PASS)**.
   - Ghi đè cấu hình `/solar/config/site` $\to$ **TỪ CHỐI (DENIED)**.
3. **Quản trị viên (`auth: { uid: 'admin_uid', token: { admin: true } }`)**:
   - Ghi tọa độ `/solar/config/site` hợp lệ $\to$ **CHO PHÉP (PASS)**.
   - Ghi lệnh điều khiển `/solar/control/command` $\to$ **CHO PHÉP (PASS)**.
   - Ghi tọa độ sai quy cách (Lat = 120, Rev cũ) $\to$ **TỪ CHỐI BỞI VALIDATE (DENIED)**.
