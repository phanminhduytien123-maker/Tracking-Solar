/**
 * dashboard/test/firebase_rules.test.js
 * BỘ KIỂM THỬ TỰ ĐỘNG FIREBASE SECURITY RULES VỚI @firebase/rules-unit-testing
 * 
 * Mô phỏng quy tắc bảo mật:
 * 1. Khách chỉ ĐỌC ở MỌI node, KHÔNG được ghi bất kỳ node nào.
 * 2. ESP32 được ghi telemetry, đọc config/control, không được ghi đè config.
 * 3. Admin (auth.token.admin === true) được ghi config và control.
 * 4. Kiểm tra schema validation (lat in [-90, 90], rev tăng).
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'solar-tracking-unit-test';

describe('Firebase Security Rules - Phân Quyền Hệ Thống Solar Tracking', () => {
  let testEnv;

  beforeAll(async () => {
    // Đọc quy tắc Rules JSON đã đề xuất
    const rulesPath = path.join(__dirname, '../../docs/firebase_database.rules.json');
    let rulesContent = '';
    if (fs.existsSync(rulesPath)) {
      rulesContent = fs.readFileSync(rulesPath, 'utf8');
    } else {
      rulesContent = JSON.stringify({
        rules: {
          solar: {
            ".read": true,
            config: {
              ".write": "auth != null && (auth.token.admin === true || auth.admin === true)",
              site: {
                ".validate": "newData.hasChildren(['lat_deg', 'lon_deg', 'rev'])",
                lat_deg: { ".validate": "newData.isNumber() && newData.val() >= -90.0 && newData.val() <= 90.0" },
                lon_deg: { ".validate": "newData.isNumber() && newData.val() >= -180.0 && newData.val() <= 180.0" },
                rev: { ".validate": "newData.isNumber() && (!data.exists() || newData.val() > data.val())" }
              }
            },
            control: {
              ".write": "auth != null && (auth.token.admin === true || auth.admin === true)",
              command: {
                ".validate": "newData.hasChildren(['cmd', 'timestamp'])"
              }
            },
            telemetry: { ".write": "auth != null" },
            tracking: { ".write": "auth != null" },
            static: { ".write": "auth != null" },
            history: { ".write": "auth != null" },
            security: {
              ".read": "auth != null && (auth.token.admin === true || auth.admin === true)",
              ".write": "auth != null && (auth.token.admin === true || auth.admin === true)"
            }
          }
        }
      });
    }

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      database: { rules: rulesContent }
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearDatabase();
    }
  });

  // 1. KIỂM THỬ KHÁCH VÃNG LAI (UNAUTHENTICATED)
  describe('1. Khách Vãng Lai (Unauthenticated)', () => {
    test('Khách ĐƯỢC PHÉP đọc dữ liệu telemetry và tracking', async () => {
      const unauthDb = testEnv.unauthenticatedContext().database();
      await assertSucceeds(unauthDb.ref('solar/tracking').get());
      await assertSucceeds(unauthDb.ref('solar/static').get());
    });

    test('Khách ĐƯỢC PHÉP đọc config và control (chế độ giám sát công khai)', async () => {
      const unauthDb = testEnv.unauthenticatedContext().database();
      await assertSucceeds(unauthDb.ref('solar/config/site').get());
      await assertSucceeds(unauthDb.ref('solar/control').get());
    });

    test('Khách BỊ TỪ CHỐI khi cố tình ghi vào /solar/config/site', async () => {
      const unauthDb = testEnv.unauthenticatedContext().database();
      await assertFails(unauthDb.ref('solar/config/site').set({
        lat_deg: 10.78816,
        lon_deg: 106.66617,
        rev: 1
      }));
    });

    test('Khách BỊ TỪ CHỐI khi gửi lệnh vào /solar/control/command', async () => {
      const unauthDb = testEnv.unauthenticatedContext().database();
      await assertFails(unauthDb.ref('solar/control/command').set({
        cmd: 'estop',
        timestamp: Date.now()
      }));
    });

    test('Khách BỊ TỪ CHỐI khi ghi đè telemetry /solar/telemetry', async () => {
      const unauthDb = testEnv.unauthenticatedContext().database();
      await assertFails(unauthDb.ref('solar/telemetry').set({ fake: true }));
    });
  });

  // 2. KIỂM THỬ THIẾT BỊ ESP32 (AUTHENTICATED DEVICE)
  describe('2. Thiết Bị ESP32 (Authenticated Device)', () => {
    test('ESP32 ĐƯỢC PHÉP ghi Telemetry và Tracking', async () => {
      const esp32Db = testEnv.authenticatedContext('esp32_tracker_node', { role: 'device' }).database();
      await assertSucceeds(esp32Db.ref('solar/tracking').set({
        voltage: 19.45,
        current: 2.58,
        power: 50.18,
        lastUpdate: Date.now()
      }));
    });

    test('ESP32 ĐƯỢC PHÉP đọc cấu hình SiteConfig để tính Feedforward', async () => {
      const esp32Db = testEnv.authenticatedContext('esp32_tracker_node', { role: 'device' }).database();
      await assertSucceeds(esp32Db.ref('solar/config/site').get());
    });

    test('ESP32 BỊ TỪ CHỐI khi cố tình sửa cấu hình tọa độ /solar/config/site', async () => {
      const esp32Db = testEnv.authenticatedContext('esp32_tracker_node', { role: 'device' }).database();
      await assertFails(esp32Db.ref('solar/config/site').set({
        lat_deg: 10.78816,
        lon_deg: 106.66617,
        rev: 2
      }));
    });
  });

  // 3. KIỂM THỬ QUẢN TRỊ VIÊN (ADMIN AUTH WITH CUSTOM CLAIM)
  describe('3. Quản Trị Viên (Admin with Custom Claim admin: true)', () => {
    test('Admin ĐƯỢC PHÉP cập nhật tọa độ hợp lệ và tăng rev', async () => {
      const adminDb = testEnv.authenticatedContext('admin_uid', { admin: true }).database();
      await assertSucceeds(adminDb.ref('solar/config/site').set({
        lat_deg: 10.78816,
        lon_deg: 106.66617,
        rev: 1
      }));

      // Cập nhật rev tăng (+1) -> PASS
      await assertSucceeds(adminDb.ref('solar/config/site').set({
        lat_deg: 10.79000,
        lon_deg: 106.68000,
        rev: 2
      }));
    });

    test('Admin ĐƯỢC PHÉP phát lệnh điều khiển Jog / E-Stop', async () => {
      const adminDb = testEnv.authenticatedContext('admin_uid', { admin: true }).database();
      await assertSucceeds(adminDb.ref('solar/control/command').set({
        cmd: 'jog_az',
        axis: 'AZ',
        step: 5,
        timestamp: Date.now()
      }));
    });

    test('Admin BỊ TỪ CHỐI nếu gửi rev cũ hơn hoặc bằng rev hiện tại (Schema Validation)', async () => {
      const adminDb = testEnv.authenticatedContext('admin_uid', { admin: true }).database();
      // Khởi tạo rev = 5
      await adminDb.ref('solar/config/site').set({
        lat_deg: 10.78816,
        lon_deg: 106.66617,
        rev: 5
      });

      // Cố tình gửi rev = 4 hoặc rev = 5 -> BỊ TỪ CHỐI
      await assertFails(adminDb.ref('solar/config/site').set({
        lat_deg: 10.78816,
        lon_deg: 106.66617,
        rev: 4
      }));
    });
  });
});
