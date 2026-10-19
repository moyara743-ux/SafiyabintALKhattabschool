import { SchoolRole, PermissionKey, UserProfile, TemporaryPermission } from '../types';
import { getTodayDateString } from './dateUtils';

// 1. Role Levels hierarchy (System Owner is supreme authority, Director is school head)
export const ROLE_LEVELS: Record<SchoolRole, number> = {
  system_owner: 999,
  director: 100,
  supervisor: 80,
  administrator: 70,
  counselor: 50,
  teacher: 40,
  parent: 20,
  student: 10,
};

// 2. Arabic Role Titles
export const ROLE_LABELS_AR: Record<SchoolRole, string> = {
  system_owner: 'مالك النظام',
  director: 'المديرة',
  supervisor: 'المشرفة',
  administrator: 'الإدارية',
  counselor: 'المرشدة الطلابية',
  teacher: 'المعلمة',
  parent: 'ولي أمر',
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
  manageParentRelationships: 'إدارة وربط أولياء الأمور بالطالبات',
  viewOwnChildren: 'عرض ومتابعة بيانات الطالبات المرتبطات',
};

export const ALL_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSION_LABELS_AR) as PermissionKey[];

// 4. Default Base Permissions by School Role
export const ROLE_PERMISSIONS: Record<SchoolRole, PermissionKey[]> = {
  system_owner: [
    'viewAnnouncements', 'createAnnouncements', 'editAnnouncements', 'deleteAnnouncements',
    'viewPosts', 'createPosts', 'editPosts', 'deletePosts',
    'viewEvents', 'createEvents', 'editEvents', 'deleteEvents',
    'viewAchievements', 'createAchievements', 'editAchievements', 'deleteAchievements',
    'viewPhotos', 'createPhotos', 'editPhotos', 'deletePhotos',
    'viewAlbums', 'createAlbums', 'editAlbums', 'deleteAlbums',
    'viewDailyMessage', 'createDailyMessage', 'editDailyMessage',
    'manageUsers', 'changeRoles', 'managePermissions',
    'manageParentRelationships',
    'viewActivityLog',
    'manageSiteSettings',
  ],

  director: [
    'viewAnnouncements', 'createAnnouncements', 'editAnnouncements', 'deleteAnnouncements',
    'viewPosts', 'createPosts', 'editPosts', 'deletePosts',
    'viewEvents', 'createEvents', 'editEvents', 'deleteEvents',
    'viewAchievements', 'createAchievements', 'editAchievements', 'deleteAchievements',
    'viewPhotos', 'createPhotos', 'editPhotos', 'deletePhotos',
    'viewAlbums', 'createAlbums', 'editAlbums', 'deleteAlbums',
    'viewDailyMessage', 'createDailyMessage', 'editDailyMessage',
    'manageUsers', 'changeRoles', 'managePermissions',
    'manageParentRelationships',
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
    'manageParentRelationships',
  ],

  administrator: [
    'viewAnnouncements', 'createAnnouncements', 'editAnnouncements',
    'viewPosts', 'createPosts', 'editPosts',
    'viewEvents', 'createEvents', 'editEvents',
    'viewAchievements', 'createAchievements',
    'viewPhotos', 'createPhotos', 'editPhotos',
    'viewAlbums', 'createAlbums', 'editAlbums',
    'viewDailyMessage', 'createDailyMessage', 'editDailyMessage',
    'manageParentRelationships',
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

  parent: [
    'viewAnnouncements',
    'viewPosts',
    'viewEvents',
    'viewAchievements',
    'viewPhotos',
    'viewAlbums',
    'viewDailyMessage',
    'viewOwnChildren',
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

// 5. Effective Permissions Computation
export function computeEffectivePermissions(profile: UserProfile | null): Set<PermissionKey> {
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

  const cleanEmail = (profile.email || '').trim().toLowerCase();

  // STRICT RULE: yaradrashed@gmail.com is strictly a student with no elevated permissions
  if (cleanEmail === 'yaradrashed@gmail.com') {
    const studentPerms = ROLE_PERMISSIONS['student'] || [];
    return new Set<PermissionKey>(studentPerms);
  }

  const safeRole: SchoolRole = profile.school_role || 'student';
  const effective = new Set<PermissionKey>();

  // 1. Base role permissions
  const roleBase = ROLE_PERMISSIONS[safeRole] || [];
  roleBase.forEach((p) => effective.add(p));

  // 2. Custom permissions
  if (profile.customPermissions && Array.isArray(profile.customPermissions)) {
    profile.customPermissions.forEach((p) => {
      if (typeof p === 'string' && !p.startsWith('nid:') && !p.startsWith('parent_of:') && p !== 'profile_completed' as any) {
        effective.add(p as PermissionKey);
      }
    });
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
    return permission.startsWith('view');
  }
  if (profile.status === 'disabled') return false;

  const cleanEmail = (profile.email || '').trim().toLowerCase();

  // System Owner (moyara743@gmail.com) and Principal have full access
  if (cleanEmail === 'moyara743@gmail.com' || profile.school_role === 'system_owner') return true;

  // STRICT RULE: yaradrashed@gmail.com is strictly a student with NO admin permissions
  if (cleanEmail === 'yaradrashed@gmail.com') {
    return permission.startsWith('view');
  }

  const permissions = computeEffectivePermissions(profile);
  return permissions.has(permission);
}

// 6. Hierarchy & Management Rules
export function canUserManageTarget(actor: UserProfile, target: UserProfile): boolean {
  if (!actor || actor.status === 'disabled') return false;

  const actorEmail = (actor.email || '').trim().toLowerCase();
  const targetEmail = (target.email || '').trim().toLowerCase();

  if (actorEmail === 'yaradrashed@gmail.com') return false;

  // System Owner account is protected from management by any other users
  if (targetEmail === 'moyara743@gmail.com' || target.school_role === 'system_owner') {
    return false;
  }

  if (actorEmail === 'moyara743@gmail.com' || actor.school_role === 'system_owner') return true;

  if (!hasPermission(actor, 'manageUsers')) return false;

  const actorLevel = ROLE_LEVELS[actor.school_role] || 0;
  const targetLevel = ROLE_LEVELS[target.school_role] || 0;

  return actorLevel > targetLevel;
}

// Check if actor is allowed to assign a specific role to someone
export function canAssignRole(actor: UserProfile, newRole: SchoolRole): boolean {
  if (!actor || actor.status === 'disabled') return false;

  const actorEmail = (actor.email || '').trim().toLowerCase();
  if (actorEmail === 'yaradrashed@gmail.com') return false;

  // System Owner role cannot be assigned to anyone
  if (newRole === 'system_owner') {
    return false;
  }

  // Director role is designated exclusively by System Owner or Current Principal through transfer tool
  if (newRole === 'director') {
    return actorEmail === 'moyara743@gmail.com' || actor.school_role === 'system_owner' || actor.school_role === 'director';
  }

  const isSupreme = actorEmail === 'moyara743@gmail.com' || actor.school_role === 'system_owner';
  if (isSupreme) return true;

  const isDirectorActor = actor.school_role === 'director';
  if (isDirectorActor) return true;

  if (!hasPermission(actor, 'changeRoles')) return false;

  const actorLevel = ROLE_LEVELS[actor.school_role] || 0;
  const targetRoleLevel = ROLE_LEVELS[newRole] || 0;

  return actorLevel > targetRoleLevel;
}

// Check if actor can grant a specific permission
export function canGrantPermission(actor: UserProfile, permission: PermissionKey): boolean {
  if (!actor || actor.status === 'disabled') return false;

  const actorEmail = (actor.email || '').trim().toLowerCase();
  if (actorEmail === 'yaradrashed@gmail.com') return false;

  if (actorEmail === 'moyara743@gmail.com' || actor.school_role === 'system_owner' || actor.school_role === 'director') return true;

  if (!hasPermission(actor, 'managePermissions')) return false;

  return hasPermission(actor, permission);
}

// Check if user has ANY create permission (for "+ إضافة" button)
export function hasAnyCreatePermission(profile: UserProfile | null): boolean {
  if (!profile || profile.status === 'disabled') return false;

  const email = (profile.email || '').trim().toLowerCase();
  if (email === 'yaradrashed@gmail.com') return false;

  const perms = computeEffectivePermissions(profile);
  for (const p of perms) {
    if (p.startsWith('create')) return true;
  }
  return false;
}
