import { supabase } from '../supabaseClient';
import { dataStore } from './dataStore';
import { UserProfile, SchoolRole } from '../types';
import { logActivity } from './activityLogger';

const STORAGE_KEY_LOGIN_ATTEMPTS = 'safiah_login_security_attempts';
const STORAGE_KEY_STAFF_CREDS = 'safiah_staff_credentials';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

interface AttemptRecord {
  count: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}

function getAttemptsStore(): Record<string, AttemptRecord> {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_LOGIN_ATTEMPTS);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[authSecurity] Notice reading attempts store:', e);
  }
  return {};
}

function setAttemptsStore(store: Record<string, AttemptRecord>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOGIN_ATTEMPTS, JSON.stringify(store));
    }
  } catch (e) {
    console.warn('[authSecurity] Notice saving attempts store:', e);
  }
}

/**
 * Checks if a specific login identifier (email, username, etc.) is currently locked out.
 */
export function checkLoginSecurityStatus(identifier: string): {
  isLocked: boolean;
  remainingMinutes: number;
  attemptsLeft: number;
} {
  const cleanId = identifier.trim().toLowerCase();
  const store = getAttemptsStore();
  const record = store[cleanId];

  if (!record) {
    return { isLocked: false, remainingMinutes: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingMs = record.lockedUntil - now;
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
    return { isLocked: true, remainingMinutes, attemptsLeft: 0 };
  }

  // If lockout expired, reset
  if (record.lockedUntil && now >= record.lockedUntil) {
    delete store[cleanId];
    setAttemptsStore(store);
    return { isLocked: false, remainingMinutes: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - record.count);
  return { isLocked: false, remainingMinutes: 0, attemptsLeft };
}

/**
 * Records a failed login attempt. Locks account if threshold is exceeded.
 */
export async function recordFailedLoginAttempt(identifier: string, contextInfo?: string): Promise<{
  isLocked: boolean;
  remainingMinutes: number;
  attemptsLeft: number;
}> {
  const cleanId = identifier.trim().toLowerCase();
  const store = getAttemptsStore();
  const now = Date.now();
  const current = store[cleanId] || { count: 0, lastAttemptAt: now };

  current.count += 1;
  current.lastAttemptAt = now;

  let isLocked = false;
  let remainingMinutes = 0;

  if (current.count >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS;
    isLocked = true;
    remainingMinutes = 15;

    // Security Audit Log for Lockout
    try {
      await logActivity({
        actorId: 'system_security',
        actorName: 'نظام الحماية والأمان',
        actorEmail: cleanId,
        action: 'ACCOUNT_LOCKED_TEMPORARY',
        entity: 'security_lockouts',
        entityId: cleanId,
        details: `قفل مؤقت للحساب (${cleanId}) لمدة 15 دقيقة بعد تجاوز ${MAX_FAILED_ATTEMPTS} محاولات دخول فاشلة متتالية`,
      });
    } catch (e) {
      console.warn('Logging lockout exception:', e);
    }
  } else {
    try {
      await logActivity({
        actorId: 'system_security',
        actorName: 'نظام الحماية والأمان',
        actorEmail: cleanId,
        action: 'FAILED_LOGIN_ATTEMPT',
        entity: 'auth',
        entityId: cleanId,
        details: `محاولة دخول فاشلة رقم ${current.count}/${MAX_FAILED_ATTEMPTS} للحساب (${cleanId}) ${contextInfo || ''}`,
      });
    } catch (e) {
      console.warn('Logging attempt exception:', e);
    }
  }

  store[cleanId] = current;
  setAttemptsStore(store);

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - current.count);
  return { isLocked, remainingMinutes, attemptsLeft };
}

/**
 * Resets failed login attempts upon successful login.
 */
export function resetLoginSecurityAttempts(identifier: string): void {
  const cleanId = identifier.trim().toLowerCase();
  const store = getAttemptsStore();
  if (store[cleanId]) {
    delete store[cleanId];
    setAttemptsStore(store);
  }
}

/**
 * Validates email format.
 */
export function validateEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(clean);
}

/**
 * Validates password strength (minimum 8 characters, letters and numbers).
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: 'كلمة المرور يجب ألا تقل عن 8 خانات وتحتوي على أحرف وأرقام.',
    };
  }
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return {
      isValid: false,
      message: 'كلمة المرور يجب أن تجمع بين الأحرف والأرقام لضمان أمان الحساب.',
    };
  }
  return { isValid: true };
}

/**
 * Hashes a plain password using SHA-256 for secure storage & comparison.
 */
export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(plain + '_safiah_salt_2026');
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores a credential hash for an admin-created user account.
 */
export async function saveStaffCredential(email: string, plainPassword: string): Promise<void> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const hash = await hashPassword(plainPassword);
    const store = getStaffCredentialsStore();
    store[cleanEmail] = hash;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STAFF_CREDS, JSON.stringify(store));
    }
  } catch (e) {
    console.warn('[authSecurity] Error saving staff credential:', e);
  }
}

function getStaffCredentialsStore(): Record<string, string> {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_STAFF_CREDS);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[authSecurity] Error reading staff credentials store:', e);
  }
  return {};
}

/**
 * Verifies if the provided plain password matches the stored credential hash.
 */
export async function verifyStaffCredential(email: string, plainPassword: string): Promise<boolean> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const store = getStaffCredentialsStore();
    const expectedHash = store[cleanEmail];
    if (!expectedHash) return false;
    const computedHash = await hashPassword(plainPassword);
    return computedHash === expectedHash;
  } catch (e) {
    console.warn('[authSecurity] Error verifying staff credential:', e);
    return false;
  }
}

/**
 * Authoritative check for Google Sign-In email.
 * STRICT SCHOOL POLICY:
 * 1. Google login is ONLY permitted for accounts that ALREADY exist and are pre-authorized in the school database.
 * 2. NO new accounts are created automatically upon Google login.
 * 3. Role and permissions must come strictly from the pre-existing database record.
 */
export async function verifyGoogleEmailPreAuthorization(email: string): Promise<{
  isAuthorized: boolean;
  profile?: UserProfile;
  reason?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !validateEmailFormat(cleanEmail)) {
    return {
      isAuthorized: false,
      reason: 'عنوان البريد الإلكتروني غير صحيح.',
    };
  }

  // 1. Fixed Director Account
  if (cleanEmail === 'moyara743@gmail.com') {
    return {
      isAuthorized: true,
      profile: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'يارا محمد راشد - مديرة المدرسة',
        email: cleanEmail,
        school_role: 'director',
        status: 'active',
        customPermissions: [],
        temporaryPermissions: [],
        createdAt: '2024-01-01T00:00:00Z',
      },
    };
  }

  // 2. Query Supabase public.users table directly
  try {
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!error && dbUser) {
      if (dbUser.status === 'disabled') {
        return {
          isAuthorized: false,
          reason: 'هذا الحساب معطل حالياً من قبل إدارة المدرسة. يرجى التواصل مع الإدارة.',
        };
      }

      const role: SchoolRole = dbUser.school_role || 'student';
      return {
        isAuthorized: true,
        profile: {
          id: dbUser.id,
          name: dbUser.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          school_role: role,
          status: dbUser.status || 'active',
          customPermissions: Array.isArray(dbUser.custom_permissions) ? dbUser.custom_permissions : [],
          temporaryPermissions: [],
          createdAt: dbUser.created_at || new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    console.warn('[authSecurity] Notice querying Supabase users table:', err);
  }

  // 3. Check dataStore users cache
  const cachedUsers = await dataStore.getUsers();
  const foundUser = cachedUsers.find((u) => u.email && u.email.trim().toLowerCase() === cleanEmail);

  if (foundUser) {
    if (foundUser.status === 'disabled') {
      return {
        isAuthorized: false,
        reason: 'هذا الحساب معطل حالياً من قبل إدارة المدرسة.',
      };
    }
    return {
      isAuthorized: true,
      profile: foundUser,
    };
  }

  // 4. Unauthorized: No pre-existing account in school database
  return {
    isAuthorized: false,
    reason: `عفواً، البريد الإلكتروني (${cleanEmail}) غير مسجل في المنصة المدرسية. التسجيل الذاتي غير متاح، ويجب اعتماد حسابك أولاً من قِبل إدارة المدرسة.`,
  };
}
