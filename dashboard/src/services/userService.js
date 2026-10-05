// =========================================================================
// USER MANAGEMENT & SECURITY SERVICE - CLOUD SYNCHRONIZED
// Syncs across all devices via Firebase Realtime Database
// =========================================================================

const FIREBASE_DB_URL = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/solar/security/users';
const STORAGE_KEY = 'solar_user_accounts_v4';

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
    displayName: 'Tài khoản khách (khach123)',
    role: 'guest',
    roleName: 'Khách tham quan',
    status: 'active',
    lockedUntil: null,
    lockedAt: null,
    isOnline: false,
    lastActive: 'Vừa xong',
    ipAddress: '118.69.182.45 (TP. Hồ Chí Minh)',
    createdAt: '2026-03-01'
  }
];

// Load users from local cache
export function getStoredUsers() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(data);
    const validUsers = parsed.filter(u => u.username === 'admin' || u.username === 'khach123');
    if (validUsers.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }

    const now = Date.now();
    const verified = validUsers.map(user => {
      if (user.status === 'locked_1h' && user.lockedUntil && now >= user.lockedUntil) {
        return { ...user, status: 'active', lockedUntil: null, lockedAt: null };
      }
      return user;
    });

    return verified;
  } catch (e) {
    return DEFAULT_USERS;
  }
}

// Save users to local cache
export function saveStoredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (e) {}
}

// Push user update to Firebase Cloud RTDB
async function pushUserToFirebase(user) {
  try {
    const key = user.username === 'khach123' ? 'khach123' : 'admin';
    await fetch(`${FIREBASE_DB_URL}/${key}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  } catch (err) {
    console.warn('[userService] Failed to push to Firebase RTDB:', err);
  }
}

// Fetch all users from Firebase Cloud RTDB
export async function fetchCloudUsers() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}.json`, { cache: 'no-store' });
    const data = await res.json();
    if (data && typeof data === 'object') {
      const users = [];
      if (data.admin) users.push({ ...DEFAULT_USERS[0], ...data.admin });
      if (data.khach123) users.push({ ...DEFAULT_USERS[1], ...data.khach123 });
      
      if (users.length > 0) {
        saveStoredUsers(users);
        return users;
      }
    }
  } catch (err) {
    console.warn('[userService] Cloud fetch error, using local cache:', err);
  }
  return getStoredUsers();
}

// Lock user for 1 hour (Both Local + Cloud)
export async function lockUser1Hour(userId) {
  const users = getStoredUsers();
  const lockedUntil = Date.now() + 3600 * 1000;
  let targetUser = null;

  const updated = users.map(user => {
    if (user.id === userId || user.username === userId || (userId === 'usr_khach123' && user.username === 'khach123')) {
      targetUser = {
        ...user,
        status: 'locked_1h',
        lockedUntil,
        lockedAt: new Date().toISOString(),
        isOnline: false
      };
      return targetUser;
    }
    return user;
  });

  saveStoredUsers(updated);
  if (targetUser) {
    pushUserToFirebase(targetUser);
  }
  return updated;
}

// Lock user permanently (Both Local + Cloud)
export async function lockUserPermanent(userId) {
  const users = getStoredUsers();
  let targetUser = null;

  const updated = users.map(user => {
    if (user.id === userId || user.username === userId || (userId === 'usr_khach123' && user.username === 'khach123')) {
      targetUser = {
        ...user,
        status: 'locked_permanent',
        lockedUntil: null,
        lockedAt: new Date().toISOString(),
        isOnline: false
      };
      return targetUser;
    }
    return user;
  });

  saveStoredUsers(updated);
  if (targetUser) {
    pushUserToFirebase(targetUser);
  }
  return updated;
}

// Restore / Unlock user (Both Local + Cloud)
export async function restoreUser(userId) {
  const users = getStoredUsers();
  let targetUser = null;

  const updated = users.map(user => {
    if (user.id === userId || user.username === userId || (userId === 'usr_khach123' && user.username === 'khach123')) {
      targetUser = {
        ...user,
        status: 'active',
        lockedUntil: null,
        lockedAt: null
      };
      return targetUser;
    }
    return user;
  });

  saveStoredUsers(updated);
  if (targetUser) {
    pushUserToFirebase(targetUser);
  }
  return updated;
}

// Synchronous fast check for fallback
export function checkUserLoginAllowed(username) {
  const clean = (username || '').trim().toLowerCase();
  const users = getStoredUsers();
  const matched = users.find(u => u.username.toLowerCase() === clean || (clean === 'khach123@gmail.com' && u.username === 'khach123'));
  
  if (!matched) return { allowed: true };

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
      return { allowed: true };
    }
  }

  return { allowed: true };
}

// Real-time Asynchronous Cloud Check (Queries Firebase Cloud RTDB directly)
export async function checkUserLoginAllowedAsync(username) {
  const clean = (username || '').trim().toLowerCase();
  const key = (clean === 'khach123' || clean === 'khach123@gmail.com') ? 'khach123' : clean === 'admin' ? 'admin' : null;
  
  if (!key) return { allowed: true };

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/${key}.json?t=${Date.now()}`, { cache: 'no-store' });
    const cloudUser = await res.json();
    if (cloudUser) {
      const now = Date.now();
      if (cloudUser.status === 'locked_permanent') {
        return {
          allowed: false,
          reason: 'Tài khoản này đã bị khóa vĩnh viễn bởi Quản trị viên.'
        };
      }

      if (cloudUser.status === 'locked_1h') {
        if (cloudUser.lockedUntil && now < cloudUser.lockedUntil) {
          const remainingMins = Math.max(1, Math.ceil((cloudUser.lockedUntil - now) / 60000));
          return {
            allowed: false,
            reason: `Tài khoản đang bị tạm khóa 1 giờ (còn lại khoảng ${remainingMins} phút).`
          };
        } else {
          // 1 hour elapsed -> auto unlock
          restoreUser(key);
          return { allowed: true };
        }
      }
    }
  } catch (err) {
    console.warn('[userService] Async cloud check error, fallback to local:', err);
  }

  return checkUserLoginAllowed(clean);
}
