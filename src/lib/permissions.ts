import { SchoolRole, PermissionKey, UserProfile, TemporaryPermission } from '../types';
import { getTodayDateString } from './dateUtils';

// 1. Role Levels hierarchy (used for management rules & escalation prevention)
export const ROLE_LEVELS: Record<SchoolRole, number> = {
  owner: 100,
  director: 90,
  supervisor: 70,
  administrator: 60,
  counselor: 50,
  teacher: 40,
  student: 10,
};

// 2. Arabic Role Titles
export const ROLE_LABELS_AR: Record<SchoolRole, string> = {
  owner: 'مالك النظام',
  director: 'المديرة',
  supervisor: 'المشرفة',
  administrator: 'الإدارية',
  counselor: 'المرشدة الطلابية',
  teacher: 'المعلمة',
  student: 'الطالبة',
};

// 3. Human-readable Arabic Permission Labels
export const PERMISSION_LABELS_AR: Record<PermissionKey, string> = {
  viewAnnouncements: 'مشاهدة الإعلانات',
  createAnnouncements: 'إضافة إعلان جديد',
  editAnnouncements: 'تعديل الإعلانات',
  deleteAnnouncements: 'حذف الإعلانات',

  viewPosts: 'مشاهدة الأخبار والمنشورات',
  createPosts: 'إضافة خبر أو منشور',
  editPosts: 'تعديل الأخبار والمنشورات',
  deletePosts: 'حذف الأخبار والمنشورات',

  viewEvents: 'مشاهدة الفعاليات',
  createEvents: 'إضافة فعالية جديدة',
  editEvents: 'تعديل الفعاليات',
  deleteEvents: 'حذف الفعاليات',

  viewAchievements: 'مشاهدة الإنجازات',
  createAchievements: 'إضافة إنجاز أو تكريم',
  editAchievements: 'تعديل الإنجازات',
  deleteAchievements: 'حذف الإنجازات',

  viewPhotos: 'مشاهدة الصور',
  createPhotos: 'رفع وإضافة صور',
  editPhotos: 'تعديل بيانات الصور',
  deletePhotos: 'حذف الصور',

  viewAlbums: 'مشاهدة الألبومات',
  createAlbums: 'إنشاء ألبومات صور',
  editAlbums: 'تعديل الألبومات',
  deleteAlbums: 'حذف الألبومات',

  viewDailyMessage: 'مشاهدة الرسالة اليومية',
  createDailyMessage: 'إضافة الرسالة اليومية',
  editDailyMessage: 'تعديل الرسالة اليومية',

  manageUsers: 'إدارة المستخدمين',
  changeRoles: 'تغيير ألقاب وأدوار المستخدمين',
  managePermissions: 'منح الصلاحيات المخصصة والمؤقتة',

  viewActivityLog: 'مشاهدة سجل النشاط والعمليات',
  manageSiteSettings: 'إدارة إعدادات ومعلومات الموقع',
};

export const ALL_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSION_LABELS_AR) as PermissionKey[];

// 4. Default Base Permissions by School Role
export const ROLE_PERMISSIONS: Record<SchoolRole, PermissionKey[]> = {
  owner: [...ALL_PERMISSIONS],

  director: [
    'viewAnnouncements', 'createAnnouncements', 'editAnnouncements', 'deleteAnnouncements',
    'viewPosts', 'createPosts', 'editPosts', 'deletePosts',
    'viewEvents', 'createEvents', 'editEvents', 'deleteEvents',
    'viewAchievements', 'createAchievements', 'editAchievements', 'deleteAchievements',
    'viewPhotos', 'createPhotos', 'editPhotos', 'deletePhotos',
    'viewAlbums', 'createAlbums', 'editAlbums', 'deleteAlbums',
    'viewDailyMessage', 'createDailyMessage', 'editDailyMessage',
    'manageUsers', 'changeRoles', 'managePermissions',
    'viewActivityLog',
    'manageSiteSettings',
  ],

  supervisor: [
    'viewAnnouncements', 'createAnnouncements', 'editAnnouncements',
    'viewPosts', 'createPosts', 'editPosts',
    'viewEvents', 'createEvents', 'editEvents',
    'viewAchievements', 'createAchievements', 'editAchievements',
    'viewPhotos', 'createPhotos', 'editPhotos',
    'viewAlbums', 'createAlbums', 'editAlbums',
    'viewDailyMessage', 'createDailyMessage', 'editDailyMessage',
  ],

  administrator: [
    'viewAnnouncements', 'createAnnouncements', 'editAnnouncements',
    'viewPosts', 'createPosts', 'editPosts',
    'viewEvents', 'createEvents', 'editEvents',
    'viewAchievements', 'createAchievements',
    'viewPhotos', 'createPhotos', 'editPhotos',
    'viewAlbums', 'createAlbums', 'editAlbums',
    'viewDailyMessage', 'createDailyMessage', 'editDailyMessage',
  ],

  counselor: [
    'viewAnnouncements', 'createAnnouncements',
    'viewPosts', 'createPosts',
    'viewEvents', 'createEvents',
    'viewAchievements',
    'viewPhotos',
    'viewAlbums',
    'viewDailyMessage', 'createDailyMessage',
  ],

  teacher: [
    'viewAnnouncements',
    'viewPosts',
    'viewEvents',
    'viewAchievements',
    'viewPhotos',
    'viewAlbums',
    'viewDailyMessage',
  ],

  student: [
    'viewAnnouncements',
    'viewPosts',
    'viewEvents',
    'viewAchievements',
    'viewPhotos',
    'viewAlbums',
    'viewDailyMessage',
  ],
};

// 5. Compute Effective Permissions: Base + Custom + Active Temporary
export function computeEffectivePermissions(profile: UserProfile | null): Set<PermissionKey> {
  // Public visitors have read-only access to published content
  if (!profile) {
    return new Set<PermissionKey>([
      'viewAnnouncements',
      'viewPosts',
      'viewEvents',
      'viewAchievements',
      'viewPhotos',
      'viewAlbums',
      'viewDailyMessage',
    ]);
  }

  // Suspended/disabled account has NO permissions
  if (profile.status === 'disabled') {
    return new Set<PermissionKey>();
  }

  const effective = new Set<PermissionKey>();

  // 1. Base role permissions
  const roleBase = ROLE_PERMISSIONS[profile.school_role] || [];
  roleBase.forEach((p) => effective.add(p));

  // 2. Custom permissions
  if (profile.customPermissions && Array.isArray(profile.customPermissions)) {
    profile.customPermissions.forEach((p) => effective.add(p));
  }

  // 3. Temporary permissions (checked against real system date)
  if (profile.temporaryPermissions && Array.isArray(profile.temporaryPermissions)) {
    const todayStr = getTodayDateString();
    profile.temporaryPermissions.forEach((temp: TemporaryPermission) => {
      if (temp.startDate <= todayStr && todayStr <= temp.endDate) {
        effective.add(temp.permission);
      }
    });
  }

  return effective;
}

// Check if user has a specific permission
export function hasPermission(profile: UserProfile | null, permission: PermissionKey): boolean {
  if (!profile) {
    // Check if permission is a view permission
    return permission.startsWith('view');
  }
  if (profile.status === 'disabled') return false;
  if (profile.school_role === 'owner' || profile.email?.toLowerCase() === 'moyara743@gmail.com') return true;

  const permissions = computeEffectivePermissions(profile);
  return permissions.has(permission);
}

// 6. Hierarchy & Management Rules (Privilege Escalation & Owner Protection)

// Check if actor is allowed to manage a specific target user
export function canUserManageTarget(actor: UserProfile, target: UserProfile): boolean {
  if (!actor || actor.status === 'disabled') return false;

  // Rule 17 & 99: NO ONE except the Owner can manage or modify the Owner!
  if (target.school_role === 'owner' && actor.id !== target.id) {
    return false;
  }

  // Owner can manage anyone
  if (actor.school_role === 'owner') return true;

  // Actor must have manageUsers permission
  if (!hasPermission(actor, 'manageUsers')) return false;

  // Actor cannot manage anyone with equal or higher level
  const actorLevel = ROLE_LEVELS[actor.school_role] || 0;
  const targetLevel = ROLE_LEVELS[target.school_role] || 0;

  return actorLevel > targetLevel;
}

// Check if actor is allowed to assign a specific role to someone
export function canAssignRole(actor: UserProfile, newRole: SchoolRole): boolean {
  if (!actor || actor.status === 'disabled') return false;
  if (!hasPermission(actor, 'changeRoles')) return false;

  // Only the Owner can assign the 'owner' role
  if (newRole === 'owner') {
    return actor.school_role === 'owner';
  }

  // Owner can assign any role
  if (actor.school_role === 'owner') return true;

  // Actor can only assign roles STRICTLY LOWER than their own role level
  const actorLevel = ROLE_LEVELS[actor.school_role] || 0;
  const targetRoleLevel = ROLE_LEVELS[newRole] || 0;

  return actorLevel > targetRoleLevel;
}

// Check if actor can grant a specific permission
export function canGrantPermission(actor: UserProfile, permission: PermissionKey): boolean {
  if (!actor || actor.status === 'disabled') return false;
  if (!hasPermission(actor, 'managePermissions')) return false;
  if (actor.school_role === 'owner') return true;

  // Actor cannot grant a permission that they themselves do not possess
  return hasPermission(actor, permission);
}

// Check if user has ANY create permission (for "+ إضافة" button)
export function hasAnyCreatePermission(profile: UserProfile | null): boolean {
  if (!profile || profile.status === 'disabled') return false;
  const perms = computeEffectivePermissions(profile);
  for (const p of perms) {
    if (p.startsWith('create')) return true;
  }
  return false;
}
