/**
 * System Owner & Principal (Director) Governance Rules:
 * 1. System Owner (مالك النظام):
 *    - Permanent fixed account: moyara743@gmail.com
 *    - Official Title: "يارا محمد راشد - مالك النظام"
 *    - Badge / Role Title: "مالك النظام"
 *    - Full supreme authority across all dashboards, settings, and logs.
 *    - Completely exempt from "إكمال البيانات" (Complete Profile) screen.
 * 
 * 2. Principal / Director (المديرة):
 *    - There is STRICTLY ONLY ONE designated Director account registered in the system.
 *    - Self-registration as Director or creating a secondary Director account is strictly forbidden.
 *    - The System Owner (moyara743@gmail.com) is the SOLE authority permitted to designate or change the Director's email.
 *    - The Director account is completely exempt from "إكمال البيانات" (enters directly after Google authentication without requiring national ID or phone).
 */

import { logActivity } from './activityLogger';
import { supabase } from '../supabaseClient';
import { dataStore } from './dataStore';

export const SYSTEM_OWNER_EMAIL = 'moyara743@gmail.com';
export const SYSTEM_OWNER_NAME = 'يارا محمد راشد - مالك النظام';
export const SYSTEM_OWNER_ROLE_LABEL = 'مالك النظام';

export const DEFAULT_DIRECTOR_EMAIL = 'director.safiah@gmail.com';
export const DEFAULT_DIRECTOR_NAME = 'أ. هدى الغامدي - مديرة المدرسة';

const PRINCIPAL_STORAGE_KEY = 'school_designated_director_email';
const PRINCIPAL_NAME_STORAGE_KEY = 'school_designated_director_name';

/**
 * Retrieves the single designated Principal's email address
 */
export function getDesignatedPrincipalEmail(): string {
  try {
    const saved = localStorage.getItem(PRINCIPAL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().toLowerCase();
    }
  } catch {
    // ignore
  }
  return DEFAULT_DIRECTOR_EMAIL.toLowerCase();
}

/**
 * Retrieves the designated Principal's display name
 */
export function getDesignatedPrincipalName(): string {
  try {
    const saved = localStorage.getItem(PRINCIPAL_NAME_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return DEFAULT_DIRECTOR_NAME;
}

/**
 * Check if the provided email is the System Owner
 */
export function isSystemOwner(email?: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase();
}

/**
 * Check if the provided email is the designated Director
 */
export function isDesignatedPrincipal(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  // System owner is treated separately
  if (isSystemOwner(clean)) return false;
  return clean === getDesignatedPrincipalEmail().toLowerCase();
}

/**
 * Checks whether an actor has permission to designate or change the Director email.
 * Sole authorized party: System Owner (moyara743@gmail.com).
 */
export function canManageDirectorAccount(actorEmail?: string): boolean {
  return isSystemOwner(actorEmail);
}

/**
 * Updates the designated Principal's email.
 * Strictly enforced: Only System Owner (moyara743@gmail.com) is permitted.
 */
export async function updateDesignatedPrincipal(params: {
  newEmail: string;
  newName?: string;
  actorEmail: string;
  actorName: string;
  actorId: string;
}): Promise<{ success: boolean; message: string }> {
  const { newEmail, newName, actorEmail, actorName, actorId } = params;

  if (!isSystemOwner(actorEmail)) {
    throw new Error('غير مصرح لك بتغيير حساب مديرة المدرسة. هذه العملية محصورة حصراً بـ [مالك النظام].');
  }

  const cleanNewEmail = newEmail.trim().toLowerCase();
  if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
    throw new Error('يرجى إدخال عنوان بريد Google صالح للمديرة.');
  }

  if (cleanNewEmail === SYSTEM_OWNER_EMAIL.toLowerCase()) {
    throw new Error('لا يمكن تعيين بريد مالك النظام كمديرة؛ حيث يمتلك بريد مالك النظام رتبة [مالك النظام] المستقلة.');
  }

  const oldEmail = getDesignatedPrincipalEmail();
  const oldName = getDesignatedPrincipalName();
  const finalName = (newName || oldName || DEFAULT_DIRECTOR_NAME).trim();

  // 1. Save in local storage
  try {
    localStorage.setItem(PRINCIPAL_STORAGE_KEY, cleanNewEmail);
    localStorage.setItem(PRINCIPAL_NAME_STORAGE_KEY, finalName);
  } catch {
    // ignore
  }

  // 2. Sync to Supabase Site Settings or Users table if present
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanNewEmail)
      .maybeSingle();

    if (existingUser) {
      await supabase
        .from('users')
        .update({
          school_role: 'director',
          name: finalName,
          account_status: 'completed',
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);
    }
  } catch (err) {
    console.warn('[principalService] Supabase sync notice:', err);
  }

  // 3. Update local cached users in dataStore
  try {
    const allUsers = await dataStore.getUsers();
    const target = allUsers.find((u) => u.email.toLowerCase() === cleanNewEmail);
    if (target) {
      await dataStore.updateUser(target.id, {
        school_role: 'director',
        name: finalName,
        accountStatus: 'completed',
        is_profile_completed: true,
      });
    }
  } catch {
    // ignore
  }

  // 4. Activity Log Audit
  await logActivity({
    actorId,
    actorName,
    actorEmail,
    action: 'UPDATE_ROLE',
    entity: 'siteSettings',
    entityId: 'principal_account',
    oldValue: `${oldName} (${oldEmail})`,
    newValue: `${finalName} (${cleanNewEmail})`,
    details: `مالك النظام قام بتعيين/تحديث حساب مديرة المدرسة المعتمد إلى (${cleanNewEmail})`,
  });

  return {
    success: true,
    message: `تم اعتماد وتعيين حساب مديرة المدرسة الجديد بنجاح (${cleanNewEmail}).`,
  };
}
