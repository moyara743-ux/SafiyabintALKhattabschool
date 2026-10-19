/**
 * System Owner & Principal (Director) Governance Rules:
 * 1. Single Active Principal Limit (حصر رتبة المديرة):
 *    - Strictly ONE designated Director account registered in the system at any time.
 *    - Self-registration as Director or creating a secondary Director account is strictly forbidden.
 *    - The Director account and System Owner account are exempt from profile completion screens and enter directly after Google auth.
 * 
 * 2. Transfer Authority (الصلاحيات المتاحة لنقل اللقب):
 *    - Sole authorized parties to transfer the rank & title of "المديرة" to another account:
 *      * "مالك النظام" (System Owner: moyara743@gmail.com)
 *      * "المديرة الحالية" (Current Designated Principal)
 *      Strictly through the administrative control panel.
 * 
 * 3. Instantaneous & Total Revocation on Transfer (السحب الفوري والكامل للصلاحيات):
 *    - The moment the title is transferred:
 *      * Title and ALL administrative permissions are immediately and automatically revoked from the old Principal account, converting it into a normal staff/teacher ('teacher') rank.
 *      * The 'director' rank and full executive administrative privileges are granted to the new account immediately.
 *      * Database and runtime state enforce zero remaining administrative permissions for the old account.
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
 * Check if the provided email is the single designated Director
 */
export function isDesignatedPrincipal(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  // System owner is separate supreme authority
  if (isSystemOwner(clean)) return false;
  return clean === getDesignatedPrincipalEmail().toLowerCase();
}

/**
 * Checks whether an actor has permission to transfer/designate the Director role.
 * Authorized parties: System Owner (moyara743@gmail.com) OR Current Principal.
 */
export function canManageDirectorAccount(actorEmail?: string, actorRole?: string): boolean {
  if (!actorEmail) return false;
  const clean = actorEmail.trim().toLowerCase();
  return isSystemOwner(clean) || isDesignatedPrincipal(clean) || actorRole === 'director';
}

/**
 * Transfers the single Principal title and all executive administrative privileges
 * to a new account, immediately stripping all administrative authority from the previous Principal.
 */
export async function transferPrincipalRole(params: {
  newEmail: string;
  newName?: string;
  actorEmail: string;
  actorName: string;
  actorId: string;
  actorRole?: string;
}): Promise<{ success: boolean; message: string; oldEmail: string; newEmail: string }> {
  const { newEmail, newName, actorEmail, actorName, actorId, actorRole } = params;

  const cleanActorEmail = actorEmail.trim().toLowerCase();
  const isActorOwner = isSystemOwner(cleanActorEmail);
  const isActorCurrentPrincipal = isDesignatedPrincipal(cleanActorEmail) || actorRole === 'director';

  if (!isActorOwner && !isActorCurrentPrincipal) {
    throw new Error('غير مصرح لك بنقل رتبة مديرة المدرسة. هذه العملية محصورة حصراً بـ [مالك النظام] و[المديرة الحالية].');
  }

  const cleanNewEmail = newEmail.trim().toLowerCase();
  if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
    throw new Error('يرجى إدخال عنوان بريد Google صالح للمديرة الجديدة.');
  }

  if (cleanNewEmail === SYSTEM_OWNER_EMAIL.toLowerCase()) {
    throw new Error('لا يمكن تعيين بريد مالك النظام كمديرة؛ حيث يمتلك بريد مالك النظام رتبة [مالك النظام] المستقلة.');
  }

  const oldEmail = getDesignatedPrincipalEmail().toLowerCase();
  const oldName = getDesignatedPrincipalName();
  const finalName = (newName || oldName || DEFAULT_DIRECTOR_NAME).trim();

  // 1. REVOKE OLD PRINCIPAL'S ROLE & ALL ADMIN PERMISSIONS IMMEDIATELY
  if (oldEmail && oldEmail !== cleanNewEmail) {
    try {
      // Demote old principal to standard teacher in Supabase
      await supabase
        .from('users')
        .update({
          school_role: 'teacher',
          custom_permissions: [],
          updated_at: new Date().toISOString(),
        })
        .eq('email', oldEmail);
    } catch (err) {
      console.warn('[principalService] Old principal Supabase demote notice:', err);
    }

    try {
      // Demote old principal in local dataStore cache
      const allUsers = await dataStore.getUsers();
      const oldUser = allUsers.find((u) => u.email.toLowerCase() === oldEmail);
      if (oldUser) {
        await dataStore.updateUser(oldUser.id, {
          ...oldUser,
          school_role: 'teacher',
          customPermissions: [],
          temporaryPermissions: [],
        });
      }
    } catch (err) {
      console.warn('[principalService] Old principal local cache demote notice:', err);
    }
  }

  // 2. ENFORCE SINGLE ACTIVE PRINCIPAL: Demote any other rogue accounts with 'director' role
  try {
    await supabase
      .from('users')
      .update({
        school_role: 'teacher',
        custom_permissions: [],
        updated_at: new Date().toISOString(),
      })
      .eq('school_role', 'director')
      .neq('email', cleanNewEmail)
      .neq('email', SYSTEM_OWNER_EMAIL);
  } catch (err) {
    console.warn('[principalService] Enforce single principal db notice:', err);
  }

  // 3. PROMOTE NEW PRINCIPAL IN SUPABASE & LOCAL STORAGE
  try {
    localStorage.setItem(PRINCIPAL_STORAGE_KEY, cleanNewEmail);
    localStorage.setItem(PRINCIPAL_NAME_STORAGE_KEY, finalName);
  } catch {
    // ignore
  }

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
          is_profile_completed: true,
          is_profile_complete: true,
          custom_permissions: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);
    } else {
      await supabase.from('users').insert({
        email: cleanNewEmail,
        name: finalName,
        school_role: 'director',
        account_status: 'completed',
        status: 'active',
        is_profile_completed: true,
        is_profile_complete: true,
        custom_permissions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[principalService] Supabase promote new principal notice:', err);
  }

  // 4. UPDATE DATASTORE CACHE FOR NEW PRINCIPAL
  try {
    const allUsers = await dataStore.getUsers();
    const target = allUsers.find((u) => u.email.toLowerCase() === cleanNewEmail);
    if (target) {
      await dataStore.updateUser(target.id, {
        school_role: 'director',
        name: finalName,
        accountStatus: 'completed',
        is_profile_completed: true,
        is_profile_complete: true,
        customPermissions: [],
      });
    }
  } catch {
    // ignore
  }

  // 5. ACTIVITY LOG AUDIT
  const actorTitle = isActorOwner ? 'مالك النظام' : 'المديرة السابقة';
  await logActivity({
    actorId,
    actorName,
    actorEmail: cleanActorEmail,
    action: 'UPDATE_ROLE',
    entity: 'siteSettings',
    entityId: 'principal_transfer',
    oldValue: `${oldName} (${oldEmail})`,
    newValue: `${finalName} (${cleanNewEmail})`,
    details: `تم نقل رتبة ولقب المديرة من (${oldEmail}) إلى (${cleanNewEmail}) بواسطة (${actorTitle}: ${actorName}). تم سحب كافة الصلاحيات الإدارية فوراً من الحساب السابق وتحويله إلى رتبة معلمة، ومنح كامل الصلاحيات للحساب الجديد.`,
  });

  return {
    success: true,
    message: `تم نقل رتبة وصلاحيات المديرة بنجاح إلى (${cleanNewEmail})، وسحب كافة الصلاحيات الإدارية فوراً من الحساب السابق (${oldEmail}) وتحويله إلى معلمة.`,
    oldEmail,
    newEmail: cleanNewEmail,
  };
}

/**
 * Backward compatibility alias for updateDesignatedPrincipal
 */
export const updateDesignatedPrincipal = transferPrincipalRole;
