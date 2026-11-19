/**
 * ============================================================================
 * UTILITY: DÙNG CHUNG CHO ĐỊNH DẠNG SỐ VÀ NHÃN TRÊN TOÀN DASHBOARD
 * File: dashboard/src/utils/formatters.js
 * Chuẩn định dạng: Dấu phẩy kiểu Việt Nam (TCVN), chữ thường đầu câu
 * ============================================================================
 */

/**
 * Chuyển đổi số sang chuỗi có dấu phẩy thập phân kiểu Việt Nam
 */
export function formatDecimal(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val) || val === '') {
    return '--';
  }
  const num = Number(val);
  return num.toFixed(decimals).replace('.', ',');
}

/**
 * Định dạng số có dấu chuẩn:
 * - Dùng dấu trừ unicode '−' (\u2212) thay vì hyphen '-', không bao giờ xuất hiện "+-"
 * - Dấu phẩy kiểu Việt Nam (ví dụ: +12,4 | −0,3)
 * - Số 0 hiển thị "±0,0" hoặc "0,0"
 */
export function formatSignedNumber(val, decimals = 1, unit = '') {
  if (val === null || val === undefined || isNaN(val) || val === '') {
    return '--';
  }
  const num = Number(val);
  if (Math.abs(num) < 1e-6) {
    const zeroStr = `0${decimals > 0 ? ',' + '0'.repeat(decimals) : ''}`;
    return `±${zeroStr}${unit ? ` ${unit}` : ''}`;
  }
  const sign = num > 0 ? '+' : '−';
  const absFormatted = Math.abs(num).toFixed(decimals).replace('.', ',');
  return `${sign}${absFormatted}${unit ? ` ${unit}` : ''}`;
}

/**
 * Định dạng giá trị đo hoặc hiển thị gạch ngang '--' khi dữ liệu cũ/mất kết nối
 * Dấu phẩy kiểu Việt Nam (ví dụ: 19,45 | 50,2)
 */
export function formatValueOrDash(val, decimals = 2, unit = '') {
  if (val === null || val === undefined || isNaN(val) || val === '') {
    return '--';
  }
  const num = Number(val);
  const formatted = typeof decimals === 'number' 
    ? num.toFixed(decimals).replace('.', ',') 
    : String(val).replace('.', ',');
  return `${formatted}${unit ? ` ${unit}` : ''}`;
}

/**
 * Tạo nhãn kết nối và độ tươi của khối dữ liệu (Phong cách bảng đo phòng Lab)
 * Không dùng pill badge, không nhấp nháy; dùng chữ thường đầu câu và chấm tĩnh
 */
export function getConnectionStatusBadge(connStatus, staleDurationMs = 0) {
  if (connStatus === 'LIVE') {
    return {
      text: 'Đang trực tiếp',
      textColor: 'text-emerald-700 dark:text-emerald-400 font-medium',
      dotColor: 'bg-emerald-600 dark:bg-emerald-400',
      isLive: true
    };
  }
  if (connStatus === 'STALE') {
    const sec = Math.max(1, Math.round(staleDurationMs / 1000));
    const label = sec >= 60 ? `Dữ liệu cũ ${Math.floor(sec / 60)} phút` : `Dữ liệu cũ ${sec} s`;
    return {
      text: label,
      textColor: 'text-amber-700 dark:text-amber-300 font-medium',
      dotColor: 'bg-amber-600 dark:bg-amber-400',
      isLive: false
    };
  }
  return {
    text: 'Mất kết nối',
    textColor: 'text-red-700 dark:text-rose-400 font-medium',
    dotColor: 'bg-red-600 dark:bg-rose-400',
    isLive: false
  };
}

/**
 * Chuyển đổi góc phương vị (0° - 360°) sang tên 8 hướng la bàn chuẩn
 */
export function getCompassDirectionName(deg) {
  if (deg === null || deg === undefined || isNaN(deg) || deg === '') {
    return '--';
  }
  const norm = ((Number(deg) % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) return 'Bắc';
  if (norm >= 22.5 && norm < 67.5) return 'Đông Bắc';
  if (norm >= 67.5 && norm < 112.5) return 'Đông';
  if (norm >= 112.5 && norm < 157.5) return 'Đông Nam';
  if (norm >= 157.5 && norm < 202.5) return 'Nam';
  if (norm >= 202.5 && norm < 247.5) return 'Tây Nam';
  if (norm >= 247.5 && norm < 292.5) return 'Tây';
  return 'Tây Bắc';
}

const EL_SCREW_COUNTS = [0, 20275, 44349, 54001, 66174];
const EL_SCREW_TILTS = [60.0, 30.0, 0.0, -12.0, -30.0];

/**
 * Quy đổi encoder Trục 2 (vít me bước 8) và góc nâng epsilon sang góc nghiêng có dấu (°):
 * - +60.0° = nghiêng hết mức về phía sáng (+X / Nam khi φ = 0°), chạm CTHT 2 (Cnt = 0)
 * -   0.0° = nằm ngang phẳng Zenith (Cnt = 44349, ε = 90.0°)
 * - -30.0° = nghiêng về phía chiều (-X), chạm giới hạn mềm dưới (Cnt = 66174)
 */
export function computeSignedTiltFromTelemetry(elEncoder, epsAngle) {
  const hasEps = epsAngle !== null && epsAngle !== undefined && !isNaN(Number(epsAngle));
  const epsNum = hasEps ? Number(epsAngle) : null;

  const hasEnc = elEncoder !== null && elEncoder !== undefined && !isNaN(Number(elEncoder));
  if (hasEnc) {
    const c = Math.abs(Number(elEncoder));
    let tiltFromEnc = EL_SCREW_TILTS[0];
    if (c <= EL_SCREW_COUNTS[0]) {
      tiltFromEnc = EL_SCREW_TILTS[0];
    } else if (c >= EL_SCREW_COUNTS[4]) {
      tiltFromEnc = EL_SCREW_TILTS[4];
    } else {
      for (let i = 0; i < 4; i++) {
        const c0 = EL_SCREW_COUNTS[i];
        const c1 = EL_SCREW_COUNTS[i + 1];
        if (c >= c0 && c <= c1) {
          const t = (c - c0) / (c1 - c0);
          tiltFromEnc = EL_SCREW_TILTS[i] + t * (EL_SCREW_TILTS[i + 1] - EL_SCREW_TILTS[i]);
          break;
        }
      }
    }

    if (!hasEps || Math.abs((90.0 - Math.abs(tiltFromEnc)) - epsNum) <= 5.0) {
      return tiltFromEnc;
    }
  }

  if (hasEps) {
    return Math.max(-30.0, Math.min(60.0, 90.0 - epsNum));
  }

  return 0.0;
}
