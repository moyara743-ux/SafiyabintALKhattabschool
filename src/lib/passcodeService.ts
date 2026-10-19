import { StaffRolePasscodes, SchoolRole, UserProfile } from '../types';
import { logActivity } from './activityLogger';

const STORAGE_KEY_PASSCODES = 'safiah_staff_role_passcodes';

const DEFAULT_PASSCODES: StaffRolePasscodes = {
  teacher: 'TEA-8942X7',
  supervisor: 'SUP-7319M4',
  administrator: 'ADM-5628K9',
  counselor: 'COU-4195R2',
  updatedAt: new Date().toISOString(),
  updatedBy: 'إدارة المدرسة',
};

/**
 * Generates a strong random alphanumeric passcode for a role
 */
export function generateStrongRolePasscode(role: 'teacher' | 'supervisor' | 'administrator' | 'counselor'): string {
  const prefixes = {
    teacher: 'TEA',
    supervisor: 'SUP',
    administrator: 'ADM',
    counselor: 'COU',
  };
  const prefix = prefixes[role] || 'SAF';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
}

/**
 * Retrieves the current active passcodes from storage
 */
export function getStaffRolePasscodes(): StaffRolePasscodes {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_PASSCODES);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_PASSCODES,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.warn('[passcodeService] Error reading passcodes from storage:', e);
  }
  return DEFAULT_PASSCODES;
}

/**
 * Saves and updates a role passcode (restricted to Principal / authorized admins)
 */
export async function updateStaffRolePasscode(
  role: 'teacher' | 'supervisor' | 'administrator' | 'counselor',
  newPasscode: string,
  actor?: UserProfile | null
): Promise<StaffRolePasscodes> {
  const current = getStaffRolePasscodes();
  const cleanCode = newPasscode.trim().toUpperCase();

  if (!cleanCode || cleanCode.length < 5) {
    throw new Error('رمز الأمان يجب ألا يقل عن 5 خانات.');
  }

  const updated: StaffRolePasscodes = {
    ...current,
    [role]: cleanCode,
    updatedAt: new Date().toISOString(),
    updatedBy: actor?.name || 'مديرة المدرسة',
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PASSCODES, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('[passcodeService] Error saving passcodes:', e);
  }

  // Audit Log
  const roleNames: Record<string, string> = {
    teacher: 'المعلمات',
    supervisor: 'المشرفات',
    administrator: 'الإداريات',
    counselor: 'المرشدة الطلابية',
  };

  if (actor) {
    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'UPDATE_PERMISSIONS',
      entity: 'siteSettings',
      entityId: `passcode_${role}`,
      oldValue: current[role],
      newValue: cleanCode,
      details: `تحديث رمز الأمان الوظيفي الخاص بـ (${roleNames[role]}) إلى رمز جديد`,
    });
  }

  return updated;
}

/**
 * Verifies if the entered passcode matches the designated role passcode
 * STRICT CONDITION: Must match the database passcode for this exact role.
 * If user selected 'teacher' and entered the 'supervisor' passcode, rejects completely.
 */
export function verifyStaffRolePasscode(
  role: 'teacher' | 'supervisor' | 'administrator' | 'counselor',
  enteredCode: string
): { isValid: boolean; message?: string } {
  const current = getStaffRolePasscodes();
  const expected = (current[role] || '').trim().toUpperCase();
  const actual = (enteredCode || '').trim().toUpperCase();

  if (!actual) {
    return {
      isValid: false,
      message: 'تعذر التفعيل، يرجى التأكد من البيانات المدخلة والمحاولة مرة أخرى.',
    };
  }

  // Strict check: The entered passcode must match the exact authorized passcode for the selected role
  // Generic error message to prevent brute-force / guessing of roles and codes
  if (actual !== expected) {
    return {
      isValid: false,
      message: 'تعذر التفعيل، يرجى التأكد من البيانات المدخلة والمحاولة مرة أخرى.',
    };
  }

  return { isValid: true };
}
