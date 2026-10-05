// =========================================================================
// USER MANAGEMENT SERVICE - SOLAR TRACKING SYSTEM
// Manages accounts, online/offline presence, and security lockouts
// =========================================================================

const STORAGE_KEY = 'solar_user_accounts';

export const DEFAULT_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    displayName: 'Quản trị viên (Admin)',
    role: 'admin',
    roleName: 'Quản trị viên',
    status: 'active', // 'active' | 'locked_1h' | 'locked_permanent'
    lockedUntil: null,
    lockedAt: null,
    isOnline: true,
    lastActive: 'Đang hoạt động',
    ipAddress: '192.168.1.102 (Trạm điều hành)',
    createdAt: '2026-01-15'
  },
  {
    id: 'usr_khach123',
    username: 'khach123',
    displayName: 'Tài khoản khách (Demo)',
    role: 'guest',
    roleName: 'Khách tham quan',
    status: 'active',
    lockedUntil: null,
    lockedAt: null,
    isOnline: false,
    lastActive: '12 phút trước',
    ipAddress: '118.69.182.45 (TP. Hồ Chí Minh)',
    createdAt: '2026-03-01'
  },
  {
    id: 'usr_kythuat01',
    username: 'kythuat_01',
    displayName: 'Kỹ thuật viên Trạm 01',
    role: 'operator',
    roleName: 'Vận hành viên',
    status: 'active',
    lockedUntil: null,
    lockedAt: null,
    isOnline: true,
    lastActive: '3 phút trước',
    ipAddress: '192.168.4.2 (Kết nối ESP32 Gateway)',
    createdAt: '2026-02-10'
  },
  {
    id: 'usr_giamsat02',
    username: 'giamsat_02',
    displayName: 'Cán bộ giám sát trạm',
    role: 'viewer',
    roleName: 'Giám sát viên',
    status: 'active',
    lockedUntil: null,
    lockedAt: null,
    isOnline: false,
    lastActive: 'Hôm qua, 18:30',
    ipAddress: '14.161.35.88 (Bình Dương)',
    createdAt: '2026-02-25'
  }
];

export function getStoredUsers() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(data);
    // Check if any 1h locked users have expired
    let updated = false;
    const now = Date.now();
    const verified = parsed.map(user => {
      if (user.status === 'locked_1h' && user.lockedUntil && now >= user.lockedUntil) {
        updated = true;
        return { ...user, status: 'active', lockedUntil: null, lockedAt: null };
      }
      return user;
    });
    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verified));
    }
    return verified;
  } catch (e) {
    console.error('[userService] Error loading stored users:', e);
    return DEFAULT_USERS;
  }
}

export function saveStoredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('[userService] Error saving users:', e);
  }
}

export function lockUser1Hour(userId) {
  const users = getStoredUsers();
  const lockedUntil = Date.now() + 3600 * 1000; // 1 hour from now
  const updated = users.map(user => {
    if (user.id === userId || user.username === userId) {
      return {
        ...user,
        status: 'locked_1h',
        lockedUntil,
        lockedAt: new Date().toISOString(),
        isOnline: false
      };
    }
    return user;
  });
  saveStoredUsers(updated);
  return updated;
}

export function lockUserPermanent(userId) {
  const users = getStoredUsers();
  const updated = users.map(user => {
    if (user.id === userId || user.username === userId) {
      return {
        ...user,
        status: 'locked_permanent',
        lockedUntil: null,
        lockedAt: new Date().toISOString(),
        isOnline: false
      };
    }
    return user;
  });
  saveStoredUsers(updated);
  return updated;
}

export function restoreUser(userId) {
  const users = getStoredUsers();
  const updated = users.map(user => {
    if (user.id === userId || user.username === userId) {
      return {
        ...user,
        status: 'active',
        lockedUntil: null,
        lockedAt: null
      };
    }
    return user;
  });
  saveStoredUsers(updated);
  return updated;
}

export function checkUserLoginAllowed(username) {
  const clean = (username || '').trim().toLowerCase();
  const users = getStoredUsers();
  const matched = users.find(u => u.username.toLowerCase() === clean || (clean === 'khach123@gmail.com' && u.username === 'khach123'));
  
  if (!matched) {
    return { allowed: true };
  }

  const now = Date.now();
  if (matched.status === 'locked_permanent') {
    return {
      allowed: false,
      reason: 'Tài khoản này đã bị khóa vĩnh viễn bởi Quản trị viên.'
    };
  }

  if (matched.status === 'locked_1h') {
    if (matched.lockedUntil && now < matched.lockedUntil) {
      const remainingMins = Math.max(1, Math.ceil((matched.lockedUntil - now) / 60000));
      return {
        allowed: false,
        reason: `Tài khoản đang bị tạm khóa 1 giờ (còn lại khoảng ${remainingMins} phút).`
      };
    } else {
      // Auto-unlock
      restoreUser(matched.id);
      return { allowed: true };
    }
  }

  return { allowed: true };
}
