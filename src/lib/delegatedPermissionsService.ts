import { PermissionKey, SchoolRole, UserProfile } from '../types';
import { logActivity } from './activityLogger';
import { dataStore } from './dataStore';
import { PERMISSION_LABELS_AR } from './permissions';
import {
  isSystemOwner as checkIsSystemOwner,
  isDesignatedPrincipal,
  getDesignatedPrincipalEmail,
} from './principalService';

export interface DelegatedPermission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: SchoolRole;
  permission: PermissionKey;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  reason: string;
  grantedBy: string;
  grantedByEmail: string;
  grantedByRole: SchoolRole;
  grantedAt: string; // ISO date
  status: 'active' | 'pending' | 'expired' | 'revoked';
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
  extendedAt?: string;
  extendedBy?: string;
  notes?: string;
}

const STORAGE_KEY = 'safiah_delegated_permissions';

/**
 * Permissions that can be delegated by Supervisor (المشرفة):
 * Can delegate content management permissions (News, Announcements, Events, Achievements, Photos, Albums, Daily Message, Parent Relationships)
 * STRICTLY FORBIDDEN to delegate: manageSiteSettings, manageUsers, changeRoles, managePermissions, or Director/Owner powers.
 */
export const SUPERVISOR_DELEGATABLE_PERMISSIONS: PermissionKey[] = [
  'createPosts',
  'editPosts',
  'deletePosts',
  'createAnnouncements',
  'editAnnouncements',
  'deleteAnnouncements',
  'createEvents',
  'editEvents',
  'deleteEvents',
  'createAchievements',
  'editAchievements',
  'deleteAchievements',
  'createPhotos',
  'editPhotos',
  'deletePhotos',
  'createAlbums',
  'editAlbums',
  'deleteAlbums',
  'createDailyMessage',
  'editDailyMessage',
  'manageParentRelationships',
];

/**
 * Permissions that can be delegated by Director (المديرة):
 * Can delegate all of the above plus user management (manageUsers), but NOT manageSiteSettings or Director designates.
 */
export const DIRECTOR_DELEGATABLE_PERMISSIONS: PermissionKey[] = [
  ...SUPERVISOR_DELEGATABLE_PERMISSIONS,
  'manageUsers',
];

/**
 * Permissions delegatable by System Owner (مالك النظام):
 * All delegatable permissions.
 */
export const OWNER_DELEGATABLE_PERMISSIONS: PermissionKey[] = [
  ...DIRECTOR_DELEGATABLE_PERMISSIONS,
  'manageSiteSettings',
];

/**
 * Seed initial sample delegation demonstrating temporary teacher assignment
 */
const DEFAULT_DELEGATIONS: DelegatedPermission[] = [
  {
    id: 'delegation_sample_01',
    userId: 'user_teacher_demo_01',
    userName: 'أ. سحر أحمد',
    userEmail: 'teacher.safiah@gmail.com',
    userRole: 'teacher',
    permission: 'createPosts',
    startDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endTime: '15:00',
    reason: 'تكليف بتغطية فعاليات أسبوع النشاط والموهبة المدرسي وإدارة الأخبار',
    grantedBy: 'المديرة - أ. هدى الغامدي',
    grantedByEmail: 'director.safiah@gmail.com',
    grantedByRole: 'director',
    grantedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: 'delegation_sample_02',
    userId: 'user_teacher_demo_01',
    userName: 'أ. سحر أحمد',
    userEmail: 'teacher.safiah@gmail.com',
    userRole: 'teacher',
    permission: 'editPosts',
    startDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endTime: '15:00',
    reason: 'متابعة وتدقيق أخبار المدرسة المنشورة خلال أسبوع الفعاليات',
    grantedBy: 'المديرة - أ. هدى الغامدي',
    grantedByEmail: 'director.safiah@gmail.com',
    grantedByRole: 'director',
    grantedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'active',
  },
];

/**
 * Helper to compute status based on current local timestamp
 */
export function computeDelegationStatus(
  item: {
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    status?: 'active' | 'pending' | 'expired' | 'revoked';
  },
  now: Date = new Date()
): 'active' | 'pending' | 'expired' | 'revoked' {
  if (item.status === 'revoked') {
    return 'revoked';
  }

  try {
    const sTime = item.startTime || '00:00';
    const eTime = item.endTime || '23:59';

    // Parse start date-time
    const [sYear, sMonth, sDay] = item.startDate.split('-').map(Number);
    const [sHour, sMin] = sTime.split(':').map(Number);
    const startDateObj = new Date(sYear, sMonth - 1, sDay, sHour, sMin, 0);

    // Parse end date-time
    const [eYear, eMonth, eDay] = item.endDate.split('-').map(Number);
    const [eHour, eMin] = eTime.split(':').map(Number);
    const endDateObj = new Date(eYear, eMonth - 1, eDay, eHour, eMin, 59);

    if (now < startDateObj) {
      return 'pending';
    }
    if (now > endDateObj) {
      return 'expired';
    }
    return 'active';
  } catch (err) {
    // Fallback to simple date string comparison
    const todayStr = now.toISOString().split('T')[0];
    if (item.startDate > todayStr) return 'pending';
    if (item.endDate < todayStr) return 'expired';
    return 'active';
  }
}

/**
 * Checks if a specific delegation or temporary permission is currently active
 */
export function isDelegatedPermissionActive(
  item: {
    permission: PermissionKey;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    status?: 'active' | 'pending' | 'expired' | 'revoked';
  },
  now: Date = new Date()
): boolean {
  return computeDelegationStatus(item, now) === 'active';
}

/**
 * Retrieves all stored delegated permissions
 */
export async function getDelegatedPermissions(): Promise<DelegatedPermission[]> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-evaluate live status on read
          const now = new Date();
          return parsed.map((item: DelegatedPermission) => ({
            ...item,
            status: computeDelegationStatus(item, now),
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[delegatedPermissionsService] Error reading storage:', err);
  }

  // Fallback to default
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DELEGATIONS));
    } catch {}
  }
  return [...DEFAULT_DELEGATIONS];
}

/**
 * Checks whether the current user is authorized to grant additional permissions
 */
export function canActorDelegatePermissions(actor: UserProfile | null): boolean {
  if (!actor || actor.status === 'disabled') return false;

  const email = (actor.email || '').trim().toLowerCase();
  if (email === 'yaradrashed@gmail.com') return false;

  if (checkIsSystemOwner(email) || actor.school_role === 'system_owner') return true;
  if (isDesignatedPrincipal(email) || actor.school_role === 'director') return true;
  if (actor.school_role === 'supervisor') return true;

  // Custom permission check
  if (actor.customPermissions?.includes('managePermissions')) return true;

  return false;
}

/**
 * Returns allowed permissions for this specific actor to delegate
 */
export function getPermissibleDelegationsForActor(actor: UserProfile | null): PermissionKey[] {
  if (!actor || actor.status === 'disabled') return [];

  const email = (actor.email || '').trim().toLowerCase();
  if (email === 'yaradrashed@gmail.com') return [];

  if (checkIsSystemOwner(email) || actor.school_role === 'system_owner') {
    return OWNER_DELEGATABLE_PERMISSIONS;
  }
  if (isDesignatedPrincipal(email) || actor.school_role === 'director') {
    return DIRECTOR_DELEGATABLE_PERMISSIONS;
  }
  if (actor.school_role === 'supervisor') {
    return SUPERVISOR_DELEGATABLE_PERMISSIONS;
  }

  return [];
}

/**
 * Grants a new temporary delegated permission to a user
 */
export async function grantTemporaryPermission(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: SchoolRole;
  permission: PermissionKey;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  reason: string;
  actor: UserProfile;
}): Promise<DelegatedPermission> {
  const { actor } = params;

  if (!canActorDelegatePermissions(actor)) {
    throw new Error('غير مصرح لك بمنح الصلاحيات الإضافية.');
  }

  const actorEmail = (actor.email || '').trim().toLowerCase();
  const targetEmail = params.userEmail.trim().toLowerCase();

  // 1. Prevent self-escalation
  if (actorEmail === targetEmail || actor.id === params.userId) {
    throw new Error('قاعدة أمنية: لا يمكن للمستخدمة منح صلاحيات إضافية لنفسها.');
  }

  // 2. Protect yaradrashed account (strictly student)
  if (targetEmail === 'yaradrashed@gmail.com') {
    throw new Error('الحساب yaradrashed@gmail.com مقيد برتبة طالبة ولا يمكن منحه صلاحيات إدارية.');
  }

  // 3. Prevent delegating Owner or Director protected privileges
  const allowedPerms = getPermissibleDelegationsForActor(actor);
  if (!allowedPerms.includes(params.permission)) {
    throw new Error(
      `غير مصرح لك بمنح الصلاحية (${PERMISSION_LABELS_AR[params.permission] || params.permission})؛ حيث تقتصر على مالك النظام أو المديرة.`
    );
  }

  // 4. Validate dates
  if (!params.startDate || !params.endDate) {
    throw new Error('يرجى تحديد تاريخ البداية وتاريخ النهاية.');
  }
  if (params.startDate > params.endDate) {
    throw new Error('تاريخ نهاية الصلاحية يجب أن يكون بعد تاريخ البداية.');
  }
  if (!params.reason.trim()) {
    throw new Error('يرجى كتابة سبب واضح لمنح هذه الصلاحية المؤقتة.');
  }

  const sTime = params.startTime || '08:00';
  const eTime = params.endTime || '16:00';
  const now = new Date();

  const newEntry: DelegatedPermission = {
    id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: targetEmail,
    userRole: params.userRole,
    permission: params.permission,
    startDate: params.startDate,
    startTime: sTime,
    endDate: params.endDate,
    endTime: eTime,
    reason: params.reason.trim(),
    grantedBy: actor.name,
    grantedByEmail: actor.email,
    grantedByRole: actor.school_role,
    grantedAt: now.toISOString(),
    status: computeDelegationStatus({
      startDate: params.startDate,
      endDate: params.endDate,
      startTime: sTime,
      endTime: eTime,
    }, now),
  };

  // 5. Save to local list
  const existingList = await getDelegatedPermissions();
  const updatedList = [newEntry, ...existingList];
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  }

  // 6. Update user's profile temporaryPermissions array in dataStore and users
  try {
    const allUsers = await dataStore.getUsers();
    const targetUser = allUsers.find(
      (u) => u.id === params.userId || (u.email && u.email.toLowerCase() === targetEmail)
    );
    if (targetUser) {
      const existingTemp = targetUser.temporaryPermissions || [];
      const updatedUserTemp = [
        ...existingTemp,
        {
          id: newEntry.id,
          permission: newEntry.permission,
          startDate: newEntry.startDate,
          endDate: newEntry.endDate,
          startTime: newEntry.startTime,
          endTime: newEntry.endTime,
          reason: newEntry.reason,
          grantedBy: newEntry.grantedBy,
          status: newEntry.status,
        } as any,
      ];
      await dataStore.updateUser(targetUser.id, {
        temporaryPermissions: updatedUserTemp,
      });
    }
  } catch (userSyncErr) {
    console.warn('[delegatedPermissionsService] Note syncing user profile temp perms:', userSyncErr);
  }

  // 7. Audit log
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'UPDATE_PERMISSIONS',
    entity: 'users',
    entityId: params.userId,
    newValue: params.permission,
    details: `منح صلاحية إضافية مؤقتة (${PERMISSION_LABELS_AR[params.permission] || params.permission}) للموظفة: ${params.userName} (${targetEmail}) من ${params.startDate} ${sTime} إلى ${params.endDate} ${eTime}. السبب: ${params.reason.trim()}`,
  });

  return newEntry;
}

/**
 * Extends or reduces the duration of a delegated permission
 */
export async function updateDelegationDuration(params: {
  delegationId: string;
  newEndDate: string;
  newEndTime?: string;
  actor: UserProfile;
  reason?: string;
}): Promise<DelegatedPermission> {
  const { actor, delegationId, newEndDate, newEndTime = '16:00', reason } = params;

  if (!canActorDelegatePermissions(actor)) {
    throw new Error('غير مصرح لك بتعديل مدة الصلاحيات.');
  }

  const list = await getDelegatedPermissions();
  const item = list.find((d) => d.id === delegationId);
  if (!item) {
    throw new Error('لم يتم العثور على الصلاحية المؤقتة المحددة.');
  }

  if (item.status === 'revoked') {
    throw new Error('لا يمكن تمديد صلاحية تم إلغاؤها سابقاً.');
  }

  if (newEndDate < item.startDate) {
    throw new Error('تاريخ نهاية الصلاحية الجديد لا يمكن أن يسبق تاريخ البداية.');
  }

  const oldEndDate = `${item.endDate} ${item.endTime}`;
  item.endDate = newEndDate;
  item.endTime = newEndTime;
  item.extendedAt = new Date().toISOString();
  item.extendedBy = actor.name;
  if (reason) {
    item.notes = `${item.notes ? item.notes + ' | ' : ''}تعديل المدة: ${reason.trim()} (بواسطة ${actor.name})`;
  }
  item.status = computeDelegationStatus(item);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // Update in user profile
  try {
    const allUsers = await dataStore.getUsers();
    const targetUser = allUsers.find((u) => u.id === item.userId || u.email?.toLowerCase() === item.userEmail.toLowerCase());
    if (targetUser && targetUser.temporaryPermissions) {
      const updatedUserTemp = targetUser.temporaryPermissions.map((t: any) => {
        if (t.id === delegationId || (t.permission === item.permission && t.startDate === item.startDate)) {
          return {
            ...t,
            endDate: newEndDate,
            endTime: newEndTime,
            status: item.status,
          };
        }
        return t;
      });
      await dataStore.updateUser(targetUser.id, { temporaryPermissions: updatedUserTemp });
    }
  } catch (e) {}

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'UPDATE_PERMISSIONS',
    entity: 'users',
    entityId: item.userId,
    oldValue: oldEndDate,
    newValue: `${newEndDate} ${newEndTime}`,
    details: `تعديل مدة الصلاحية المؤقتة (${PERMISSION_LABELS_AR[item.permission] || item.permission}) للموظفة: ${item.userName}. الموعد الجديد: حتى ${newEndDate} ${newEndTime}`,
  });

  return item;
}

/**
 * Revokes a delegated permission early (سحب الإذن)
 */
export async function revokeDelegatedPermission(params: {
  delegationId: string;
  actor: UserProfile;
  reason: string;
}): Promise<DelegatedPermission> {
  const { actor, delegationId, reason } = params;

  if (!canActorDelegatePermissions(actor)) {
    throw new Error('غير مصرح لك بإلغاء الصلاحيات المؤقتة.');
  }

  if (!reason.trim()) {
    throw new Error('يرجى توضيح سبب إلغاء وسحب الصلاحية.');
  }

  const list = await getDelegatedPermissions();
  const item = list.find((d) => d.id === delegationId);
  if (!item) {
    throw new Error('لم يتم العثور على الصلاحية المؤقتة.');
  }

  item.status = 'revoked';
  item.revokedAt = new Date().toISOString();
  item.revokedBy = actor.name;
  item.revocationReason = reason.trim();

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // Remove / set revoked in user's profile
  try {
    const allUsers = await dataStore.getUsers();
    const targetUser = allUsers.find((u) => u.id === item.userId || u.email?.toLowerCase() === item.userEmail.toLowerCase());
    if (targetUser && targetUser.temporaryPermissions) {
      const updatedUserTemp = targetUser.temporaryPermissions.map((t: any) => {
        if (t.id === delegationId || (t.permission === item.permission && t.startDate === item.startDate)) {
          return {
            ...t,
            status: 'revoked',
          };
        }
        return t;
      });
      await dataStore.updateUser(targetUser.id, { temporaryPermissions: updatedUserTemp });
    }
  } catch (e) {}

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'UPDATE_PERMISSIONS',
    entity: 'users',
    entityId: item.userId,
    details: `إلغاء وسحب الصلاحية المؤقتة (${PERMISSION_LABELS_AR[item.permission] || item.permission}) مبكراً من الموظفة: ${item.userName}. السبب: ${reason.trim()}`,
  });

  return item;
}
