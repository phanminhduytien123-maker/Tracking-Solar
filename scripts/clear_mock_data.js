/**
 * ============================================================================
 * SCRIPT: CLEAR MOCK / VIRTUAL DATA ON FIREBASE REALTIME DATABASE
 * File: scripts/clear_mock_data.js
 * 
 * MỤC ĐÍCH:
 * Dọn dẹp dữ liệu ảo cũ trong node /solar do script test hoặc giả lập đẩy lên.
 * 
 * TÍNH NĂNG AN TOÀN:
 * 1. MẶC ĐỊNH LÀ CHẠY KHÔ (DRY-RUN): Chỉ quét, phân tích và liệt kê, TUYỆT ĐỐI KHÔNG XÓA.
 * 2. ĐỀ XUẤT XUẤT BẢN SAO (JSON BACKUP): Tự động sao lưu dữ liệu hiện tại trước khi xóa.
 * 3. XÁC NHẬN HAI BƯỚC:
 *    - Bước 1: Phải truyền tham số --execute qua dòng lệnh.
 *    - Bước 2: Bắt buộc gõ đúng cụm từ xác thực: "XAC_NHAN_XOA_DU_LIEU_AO".
 * 
 * HƯỚNG DẪN CHẠY:
 * - Chạy kiểm tra an toàn (Dry-run):
 *     node scripts/clear_mock_data.js
 * 
 * - Xuất bản sao lưu JSON về máy tính:
 *     node scripts/clear_mock_data.js --backup
 * 
 * - Thực thi xóa dữ liệu ảo (có xác nhận tương tác):
 *     node scripts/clear_mock_data.js --execute
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATABASE_URL = "https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/";

async function fetchCurrentData() {
  const url = `${DATABASE_URL}solar.json`;
  console.log(`📡 Đang tải cấu trúc dữ liệu hiện tại từ: ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể kết nối Firebase: HTTP ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function backupData(data) {
  const now = new Date();
  const timeStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const filePath = path.join(backupDir, `solar_backup_${timeStr}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 [BACKUP THÀNH CÔNG] Đã lưu bản sao JSON an toàn tại:`);
  console.log(`   👉 ${filePath}\n`);
  return filePath;
}

function analyzeData(data) {
  if (!data) {
    console.log("ℹ️  Node /solar hiện đang trống (null). Không có dữ liệu để dọn dẹp.\n");
    return [];
  }

  const nodesToDelete = [];
  console.log("\n📋 DANH SÁCH CÁC NODE ĐANG TỒN TẠI TRONG /solar:");
  console.log("------------------------------------------------------------------");

  for (const [key, value] of Object.entries(data)) {
    const isMock = (value && value.source === 'mock') || (data.source === 'mock');
    const isUnflagged = (value && !value.source && key !== 'config' && key !== 'security');
    
    let statusText = "✅ Dữ liệu thiết bị thật";
    if (isMock) {
      statusText = "⚠️  DỮ LIỆU GIẢ LẬP (source = 'mock')";
      nodesToDelete.push(key);
    } else if (isUnflagged) {
      statusText = "❓ KHÔNG RÕ NGUỒN (Thiếu cờ source, nghi ngờ dữ liệu test cũ)";
      nodesToDelete.push(key);
    } else if (key === 'config' || key === 'security') {
      statusText = "🔒 Node hệ thống / cấu hình / người dùng (KHÔNG ĐƯỢC XÓA)";
    }

    console.log(` • /solar/${key.padEnd(12)} -> ${statusText}`);
  }

  console.log("------------------------------------------------------------------");
  return nodesToDelete;
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isBackupOnly = args.includes('--backup');

  console.log("==================================================================");
  console.log("       CÔNG CỤ KIỂM TRA & DỌN DẸP DỮ LIỆU ẢO TRÊN FIREBASE        ");
  console.log("==================================================================");

  let currentData;
  try {
    currentData = await fetchCurrentData();
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  }

  if (isBackupOnly) {
    await backupData(currentData);
    console.log("🏁 Hoàn thành sao lưu!");
    return;
  }

  const nodesToDelete = analyzeData(currentData);

  if (nodesToDelete.length === 0) {
    console.log("✅ Không tìm thấy node dữ liệu ảo nào cần xóa. Node /solar đã sạch!");
    return;
  }

  console.log(`\n🔍 Phát hiện ${nodesToDelete.length} node ảo/không rõ nguồn: [${nodesToDelete.join(', ')}]`);

  if (!isExecute) {
    console.log("\n🛡️  CHẾ ĐỘ HIỆN TẠI: CHẠY KHÔ (DRY-RUN)");
    console.log("👉 KHÔNG CÓ BẤT KỲ DỮ LIỆU NÀO BỊ THAY ĐỔI HOẶC BỊ XÓA.");
    console.log("👉 Đề xuất bước tiếp theo:");
    console.log("   1. Xuất bản sao lưu trước:");
    console.log("      node scripts/clear_mock_data.js --backup");
    console.log("   2. Khi được cấp phép xóa thật, chạy lệnh:");
    console.log("      node scripts/clear_mock_data.js --execute\n");
    return;
  }

  // Nếu người dùng chỉ định --execute: Bước xác nhận thứ hai
  console.log("\n⚠️  CẢNH BÁO BẢO VỆ DỮ LIỆU CẤP ĐỘ CAO!");
  console.log(`Chuẩn bị xóa ${nodesToDelete.length} node trên Firebase: [${nodesToDelete.join(', ')}]`);
  
  // Tự động sao lưu trước khi xóa thực tế
  console.log("\n[Tự động] Đang tạo bản sao lưu phòng ngừa...");
  await backupData(currentData);

  const confirmText = await promptUser(
    '👉 Để XÁC NHẬN XÓA THỰC TẾ, hãy gõ chính xác "XAC_NHAN_XOA_DU_LIEU_AO": '
  );

  if (confirmText !== "XAC_NHAN_XOA_DU_LIEU_AO") {
    console.log("\n❌ Cụm từ xác nhận không chính xác. HỦY BỎ LỆNH XÓA. Dữ liệu an toàn.");
    return;
  }

  console.log("\n🚀 Đang tiến hành xóa các node đã xác nhận...");
  for (const node of nodesToDelete) {
    const nodeUrl = `${DATABASE_URL}solar/${node}.json`;
    const res = await fetch(nodeUrl, { method: 'DELETE' });
    if (res.ok) {
      console.log(`  ✅ Đã xóa /solar/${node}`);
    } else {
      console.error(`  ❌ Lỗi xóa /solar/${node}: HTTP ${res.status}`);
    }
  }

  console.log("\n🏁 ĐÃ HOÀN TẤT DỌN DẸP DỮ LIỆU ẢO AN TOÀN TRÊN FIREBASE!");
}

main().catch(err => console.error("❌ Lỗi ngoại lệ:", err));
