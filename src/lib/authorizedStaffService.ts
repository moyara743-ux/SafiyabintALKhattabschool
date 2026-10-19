/**
 * School Staff Pre-Authorization Service (قائمة البريد المصرح له لمنسوبات المدرسة)
 *
 * Rules - Option (A):
 * 1. The administration (System Owner, Principal, or authorized admin) adds the staff member's email ONLY
 *    to the list of authorized emails in the database.
 * 2. Independent job security passcodes exist in the database for each role (teacher, supervisor, administrator, counselor).
 * 3. On First-Time Onboarding:
 *    - Staff authenticates with Google.
 *    - The system verifies if the email is in the authorized staff list.
 *    - If authorized, she is redirected to the Activation Page where she chooses her role and enters the passcode.
 *    - Strict match: the passcode must match the exact role chosen.
 * 4. Returning Users:
 *    - Enters directly after Google auth without asking for the passcode again.
 */

import { AuthorizedStaffEmail, UserProfile, SchoolRole } from '../types';
import { logActivity } from './activityLogger';
import { supabase } from '../supabaseClient';
import { dataStore } from './dataStore';

const STORAGE_KEY = 'safiah_authorized_staff_emails';

// Default initial pre-authorized staff accounts
const DEFAULT_AUTHORIZED_STAFF: AuthorizedStaffEmail[] = [
  {
    id: 'auth_staff_hana_01',
    email: 'hana.safiah@gmail.com',
    name: 'أ. هنا محمد الدوسري',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-02-01T00:00:00Z',
    isActivated: false, // غير مفعل وبانتظار التفعيل لأول مرة
  },
  {
    id: 'auth_staff_hana_02',
    email: 'hana.dossari@gmail.com',
    name: 'أ. هنا محمد الدوسري',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-02-01T00:00:00Z',
    isActivated: false, // غير مفعل وبانتظار التفعيل لأول مرة
  },
  {
    id: 'auth_staff_teacher_01',
    email: 'teacher.safiah@gmail.com',
    name: 'أ. سحر أحمد',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-01-01T00:00:00Z',
    isActivated: true,
    activatedAt: '2024-01-01T00:00:00Z',
    assignedRole: 'teacher',
  },
  {
    id: 'auth_staff_supervisor_01',
    email: 'supervisor.safiah@gmail.com',
    name: 'أ. منيرة إبراهيم',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-01-01T00:00:00Z',
    isActivated: true,
    activatedAt: '2024-01-01T00:00:00Z',
    assignedRole: 'supervisor',
  },
  {
    id: 'auth_staff_admin_01',
    email: 'admin.safiah@gmail.com',
    name: 'أ. نورة فهد',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-01-01T00:00:00Z',
    isActivated: true,
    activatedAt: '2024-01-01T00:00:00Z',
    assignedRole: 'administrator',
  },
  {
    id: 'auth_staff_counselor_01',
    email: 'counselor.safiah@gmail.com',
    name: 'أ. ريم سليمان',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-01-01T00:00:00Z',
    isActivated: true,
    activatedAt: '2024-01-01T00:00:00Z',
    assignedRole: 'counselor',
  },
  {
    id: 'auth_staff_new_01',
    email: 'fatima.safiah@gmail.com',
    name: 'أ. فاطمة علي العتيبي',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-02-01T00:00:00Z',
    isActivated: false,
  },
  {
    id: 'auth_staff_new_02',
    email: 'nouf.safiah@gmail.com',
    name: 'أ. نوف الحربي',
    addedBy: 'إدارة المدرسة',
    addedAt: '2024-02-01T00:00:00Z',
    isActivated: false,
  },
];

/**
 * Retrieves the full list of authorized staff emails
 */
export async function getAuthorizedStaffEmails(): Promise<AuthorizedStaffEmail[]> {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsed: AuthorizedStaffEmail[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check and enforce reset for Hana Al-Dossari so she is always unactivated until she passes step 2
          let changed = false;
          parsed = parsed.map((item) => {
            const isHana =
              (item.name && (item.name.includes('هنا') || item.name.includes('الدوسري'))) ||
              (item.email && (item.email.includes('hana') || item.email.includes('dossari')));
            if (isHana && item.isActivated) {
              changed = true;
              return {
                ...item,
                name: 'أ. هنا محمد الدوسري',
                isActivated: false,
                assignedRole: undefined,
                activatedAt: undefined,
              };
            }
            return item;
          });

          // Ensure Hana emails exist in list
          const hasHana = parsed.some(
            (item) => item.email.includes('hana') || (item.name && item.name.includes('هنا'))
          );
          if (!hasHana) {
            parsed.unshift(
              {
                id: 'auth_staff_hana_01',
                email: 'hana.safiah@gmail.com',
                name: 'أ. هنا محمد الدوسري',
                addedBy: 'إدارة المدرسة',
                addedAt: new Date().toISOString(),
                isActivated: false,
              },
              {
                id: 'auth_staff_hana_02',
                email: 'hana.dossari@gmail.com',
                name: 'أ. هنا محمد الدوسري',
                addedBy: 'إدارة المدرسة',
                addedAt: new Date().toISOString(),
                isActivated: false,
              }
            );
            changed = true;
          }

          if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[authorizedStaffService] Error reading storage:', e);
  }

  // Seed default if empty
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AUTHORIZED_STAFF));
    }
  } catch {
    // ignore
  }

  return [...DEFAULT_AUTHORIZED_STAFF];
}

/**
 * Checks if a specific email is in the authorized staff list and whether it is already activated
 */
export async function isStaffEmailAuthorized(email: string): Promise<{
  isAuthorized: boolean;
  record?: AuthorizedStaffEmail;
  isActivated: boolean;
}> {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return { isAuthorized: false, isActivated: false };
  }

  const list = await getAuthorizedStaffEmails();
  const found = list.find((item) => item.email.toLowerCase() === clean);

  if (found) {
    return {
      isAuthorized: true,
      record: found,
      isActivated: Boolean(found.isActivated),
    };
  }

  // Fallback check in dataStore users
  try {
    const allUsers = await dataStore.getUsers();
    const existing = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === clean);
    if (existing && ['teacher', 'supervisor', 'administrator', 'counselor'].includes(existing.school_role)) {
      const isCompleted = existing.accountStatus === 'completed' || existing.is_profile_completed === true;
      return {
        isAuthorized: true,
        record: {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          addedAt: existing.createdAt || new Date().toISOString(),
          isActivated: isCompleted,
          assignedRole: existing.school_role as any,
        },
        isActivated: isCompleted,
      };
    }
  } catch (err) {
    console.warn('[authorizedStaffService] dataStore check notice:', err);
  }

  return { isAuthorized: false, isActivated: false };
}

/**
 * Adds a new staff member's email ONLY to the pre-authorized list.
 * Role is NOT fixed by the admin; it will be bound upon passcode entry during first-time onboarding.
 */
export async function addAuthorizedStaffEmail(params: {
  email: string;
  name?: string;
  actor?: UserProfile | null;
}): Promise<AuthorizedStaffEmail> {
  const cleanEmail = params.email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('يرجى إدخال عنوان بريد إلكتروني Google صالح.');
  }

  const list = await getAuthorizedStaffEmails();
  const existing = list.find((item) => item.email.toLowerCase() === cleanEmail);

  if (existing) {
    throw new Error(
      `البريد الإلكتروني (${cleanEmail}) مضاف مسبقاً في قائمة المنسوبات المصرح لهن ${
        existing.isActivated ? '(حساب مفعل)' : '(بانتظار التفعيل لأول مرة)'
      }.`
    );
  }

  const newRecord: AuthorizedStaffEmail = {
    id: `staff_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: cleanEmail,
    name: params.name?.trim() || undefined,
    addedBy: params.actor?.name || 'إدارة المدرسة',
    addedAt: new Date().toISOString(),
    isActivated: false,
  };

  const updatedList = [newRecord, ...list];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (e) {
    console.warn('[authorizedStaffService] Error saving to storage:', e);
  }

  // Also pre-create placeholder in Supabase users table if accessible
  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      name: newRecord.name || cleanEmail.split('@')[0],
      school_role: 'teacher', // placeholder until activation
      account_status: 'needs_completion',
      status: 'active',
      is_profile_completed: false,
      is_profile_complete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[authorizedStaffService] Supabase pre-insert notice:', err);
  }

  // Audit Log
  if (params.actor) {
    await logActivity({
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorEmail: params.actor.email,
      action: 'CREATE',
      entity: 'authorizedStaff',
      entityId: newRecord.id,
      details: `إضافة البريد الإلكتروني (${cleanEmail}) إلى قائمة منسوبات المدرسة المصرح لهن (بانتظار التفعيل الأول عبر Google)`,
    });
  }

  return newRecord;
}

/**
 * Removes an email from the authorized staff list and strips their privileges
 */
export async function removeAuthorizedStaffEmail(
  email: string,
  actor?: UserProfile | null
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Update authorized staff list in local storage
  try {
    const list = await getAuthorizedStaffEmails();
    const updatedList = list.filter((item) => item.email.toLowerCase() !== cleanEmail);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (e) {
    console.warn('[authorizedStaffService] Storage update notice:', e);
  }

  // 2. Strip privileges & suspend in Supabase users table (with try/catch for RLS)
  try {
    await supabase
      .from('users')
      .update({
        school_role: 'student',
        status: 'disabled',
        account_status: 'suspended',
        custom_permissions: [],
        temporary_permissions: [],
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);
  } catch (sbErr) {
    console.warn('[authorizedStaffService] Supabase users revoke notice (gracefully handled):', sbErr);
  }

  // 3. Strip privileges & update local dataStore if account exists
  try {
    const allUsers = await dataStore.getUsers();
    const existing = allUsers.find(
      (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
    );
    if (existing) {
      await dataStore.updateUser(existing.id, {
        school_role: 'student',
        status: 'disabled',
        accountStatus: 'suspended',
        customPermissions: [],
      });
    }
  } catch (dsErr) {
    console.warn('[authorizedStaffService] dataStore revoke notice (gracefully handled):', dsErr);
  }

  // 4. Audit Log
  if (actor) {
    try {
      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'DELETE',
        entity: 'authorizedStaff',
        entityId: cleanEmail,
        details: `إلغاء تصريح البريد الإلكتروني (${cleanEmail}) وحذفه من قائمة المنسوبات المصرح لهن وتجريده من الصلاحيات فوراً`,
      });
    } catch (logErr) {
      console.warn('[authorizedStaffService] Activity log notice:', logErr);
    }
  }
}

/**
 * Updates an authorized staff member's information (email, name, role)
 */
export async function updateAuthorizedStaffMember(params: {
  oldEmail: string;
  newEmail: string;
  name?: string;
  assignedRole?: 'teacher' | 'supervisor' | 'administrator' | 'counselor';
  actor?: UserProfile | null;
}): Promise<AuthorizedStaffEmail> {
  const cleanOldEmail = params.oldEmail.trim().toLowerCase();
  const cleanNewEmail = params.newEmail.trim().toLowerCase();

  if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
    throw new Error('يرجى إدخال عنوان بريد Google صالح.');
  }

  const list = await getAuthorizedStaffEmails();
  const existingIdx = list.findIndex((item) => item.email.toLowerCase() === cleanOldEmail);

  if (existingIdx === -1) {
    throw new Error('لم يتم العثور على سجل المنسوبة المطلوب تعديلها.');
  }

  // Check if changing email to another already registered email
  if (cleanNewEmail !== cleanOldEmail && list.some((item) => item.email.toLowerCase() === cleanNewEmail)) {
    throw new Error(`البريد الإلكتروني الجديد (${cleanNewEmail}) موجود مسبقاً في القائمة.`);
  }

  const current = list[existingIdx];
  const updated: AuthorizedStaffEmail = {
    ...current,
    email: cleanNewEmail,
    name: params.name !== undefined ? params.name.trim() : current.name,
    assignedRole: params.assignedRole || current.assignedRole,
  };

  const updatedList = [...list];
  updatedList[existingIdx] = updated;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (e) {
    console.warn('[authorizedStaffService] Error updating storage:', e);
  }

  // Sync with Supabase users table if accessible
  try {
    await supabase
      .from('users')
      .update({
        email: cleanNewEmail,
        name: updated.name,
        school_role: updated.assignedRole || 'teacher',
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanOldEmail);
  } catch (err) {
    console.warn('[authorizedStaffService] Supabase update notice:', err);
  }

  // Sync with local dataStore users if exists
  try {
    const allUsers = await dataStore.getUsers();
    const targetUser = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === cleanOldEmail);
    if (targetUser) {
      await dataStore.updateUser(targetUser.id, {
        email: cleanNewEmail,
        name: updated.name,
        school_role: updated.assignedRole,
      });
    }
  } catch (err) {
    console.warn('[authorizedStaffService] dataStore update notice:', err);
  }

  if (params.actor) {
    try {
      await logActivity({
        actorId: params.actor.id,
        actorName: params.actor.name,
        actorEmail: params.actor.email,
        action: 'UPDATE',
        entity: 'authorizedStaff',
        entityId: updated.id,
        details: `تحديث بيانات المنسوبة (${cleanOldEmail} -> ${cleanNewEmail})${params.name ? ` الاسم: ${params.name}` : ''}`,
      });
    } catch (logErr) {
      console.warn('[authorizedStaffService] Activity log notice:', logErr);
    }
  }

  return updated;
}

/**
 * Marks a staff member's email as activated in the database with their chosen role
 */
export async function activateStaffEmail(params: {
  email: string;
  role: 'teacher' | 'supervisor' | 'administrator' | 'counselor';
  name?: string;
}): Promise<AuthorizedStaffEmail> {
  const cleanEmail = params.email.trim().toLowerCase();
  const list = await getAuthorizedStaffEmails();

  let target = list.find((item) => item.email.toLowerCase() === cleanEmail);
  const now = new Date().toISOString();

  if (target) {
    target.isActivated = true;
    target.activatedAt = now;
    target.assignedRole = params.role;
    if (params.name) target.name = params.name.trim();
  } else {
    target = {
      id: `staff_auth_${Date.now()}`,
      email: cleanEmail,
      name: params.name?.trim(),
      addedAt: now,
      isActivated: true,
      activatedAt: now,
      assignedRole: params.role,
    };
    list.unshift(target);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('[authorizedStaffService] Error updating storage:', e);
  }

  return target;
}
