/**
 * scripts/set_admin_claim.js
 * SCRIPT GÁN CUSTOM CLAIM ADMIN CHO TÀI KHOẢN FIREBASE AUTH
 * 
 * Hướng dẫn sử dụng:
 * 1. Tải Service Account Key (JSON) từ Firebase Console:
 *    Project Settings -> Service Accounts -> Generate new private key
 * 2. Lưu tệp đó thành serviceAccountKey.json cùng thư mục với script này
 * 3. Chạy lệnh: node scripts/set_admin_claim.js <USER_EMAIL_OR_UID>
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Không tìm thấy tệp 'scripts/serviceAccountKey.json'!");
  console.error("👉 Vui lòng tải Service Account JSON từ Firebase Console và đặt vào scripts/serviceAccountKey.json");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(identifier) {
  try {
    let userRecord;
    if (identifier.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(identifier);
    } else {
      userRecord = await admin.auth().getUser(identifier);
    }

    console.log(`🔍 Tìm thấy người dùng: ${userRecord.email} (UID: ${userRecord.uid})`);

    // Gán custom user claims: { admin: true, role: 'admin' }
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin'
    });

    console.log(`✅ Đã gán thành công Custom Claim { admin: true } cho ${userRecord.email}!`);
    console.log("ℹ️  Người dùng cần đăng xuất và đăng nhập lại trên Web Dashboard để Token JWT được làm mới.");
  } catch (error) {
    console.error("❌ Lỗi khi gán Custom Claim:", error.message);
  } finally {
    process.exit(0);
  }
}

const targetUser = process.argv[2];
if (!targetUser) {
  console.log("Cách dùng: node scripts/set_admin_claim.js <EMAIL_HOẶC_UID>");
  console.log("Ví dụ: node scripts/set_admin_claim.js phanminhduytien@gmail.com");
  process.exit(1);
}

setAdminClaim(targetUser);
