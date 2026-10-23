// 1. Roles definition (System Owner is supreme authority, Director is executive school head)
export type SchoolRole =
  | 'system_owner'
  | 'director'
  | 'supervisor'
  | 'administrator'
  | 'counselor'
  | 'teacher'
  | 'parent'
  | 'student';

export type UserStatus = 'active' | 'disabled';

// Account lifecycle status as required by the school system:
// جديد (new), يحتاج إكمال البيانات (needs_completion), مكتمل (completed), موقوف (suspended)
export type AccountStatus = 'new' | 'needs_completion' | 'completed' | 'suspended';

export const ACCOUNT_STATUS_LABELS_AR: Record<AccountStatus, string> = {
  new: 'جديد',
  needs_completion: 'يحتاج إكمال البيانات',
  completed: 'مكتمل',
  suspended: 'موقوف',
};

// 2. Granular Permissions
export type PermissionKey =
  | 'viewAnnouncements'
  | 'createAnnouncements'
  | 'editAnnouncements'
  | 'deleteAnnouncements'
  | 'viewPosts'
  | 'createPosts'
  | 'editPosts'
  | 'deletePosts'
  | 'viewEvents'
  | 'createEvents'
  | 'editEvents'
  | 'deleteEvents'
  | 'viewAchievements'
  | 'createAchievements'
  | 'editAchievements'
  | 'deleteAchievements'
  | 'viewPhotos'
  | 'createPhotos'
  | 'editPhotos'
  | 'deletePhotos'
  | 'viewAlbums'
  | 'createAlbums'
  | 'editAlbums'
  | 'deleteAlbums'
  | 'viewDailyMessage'
  | 'createDailyMessage'
  | 'editDailyMessage'
  | 'deleteDailyMessage'
  | 'manageUsers'
  | 'changeRoles'
  | 'managePermissions'
  | 'viewActivityLog'
  | 'manageSiteSettings'
  | 'manageParentRelationships'
  | 'viewOwnChildren';

// 3. Temporary Permissions
export interface TemporaryPermission {
  permission: PermissionKey;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// 4. User Profile
export interface UserProfile {
  id: string; // Supabase Auth User ID
  name: string;
  email: string;
  photoURL?: string;
  phone?: string;
  nationalId?: string;
  national_id?: string;
  is_profile_completed?: boolean;
  is_profile_complete?: boolean;
  specialization?: string;
  guardianRelation?: string;
  studentIdCode?: string;
  gradeStage?: string;
  classroom?: string;
  linkedStudentIds?: string[];
  linkedParentIds?: string[];
  school_role: SchoolRole;
  customPermissions?: PermissionKey[];
  temporaryPermissions?: TemporaryPermission[];
  status: UserStatus;
  accountStatus?: AccountStatus;
  account_status?: AccountStatus;
  googleLinked?: boolean;
  googleId?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// 4.1 Student Record (سجل الطالبة في قاعدة البيانات)
export interface StudentRecord {
  id: string; // Internal UUID
  student_id_code: string; // Unique fixed ID e.g. STU-000251
  name: string;
  phone: string; // Registered mobile phone for parent linking
  national_id: string; // Mandatory, unique 10-digit national ID
  access_secret?: string; // Strong cryptographic secret for student login
  birth_date?: string;
  grade_stage: string; // e.g. 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'
  classroom?: string; // e.g. '1/1'
  is_profile_complete: boolean;
  blood_type?: string;
  notes?: string;
  emergency_contact_phone?: string;
  account_user_id?: string; // If registered in users table
  status: 'active' | 'graduated' | 'suspended';
  created_at: string;
  updated_at?: string;
}

// 4.2 Linking Code (رمز الربط)
export type LinkingCodeStatus = 'active' | 'expired' | 'used' | 'revoked';

export interface StudentLinkingCode {
  id: string;
  student_id: string; // StudentRecord.id
  code: string; // Cryptographically secure random code
  created_at: string;
  expires_at: string; // exactly created_at + 3 days
  is_used: boolean;
  is_revoked: boolean;
  used_at?: string;
  used_by_parent_id?: string;
  created_by?: string;
}

// 4.3 Student Linking States (حالات الربط الستة الدقيقة)
export type StudentLinkingState =
  | 'unlinked' // غير مرتبطة
  | 'pending_link' // بانتظار الربط
  | 'linked' // مرتبطة
  | 'code_expired' // رمز الربط منتهي
  | 'code_revoked' // رمز الربط ملغى
  | 'code_used'; // رمز الربط مستخدم

// 4.4 Parent-Student Relationship
export type RelationshipType = 'father' | 'mother' | 'guardian';

// 4.5 Role Security Passcodes for Staff (رموز الأمان الوظيفية للمنسوبات)
export interface StaffRolePasscodes {
  teacher: string; // رمز المعلمات
  supervisor: string; // رمز المشرفات
  administrator: string; // رمز الإداريات
  counselor: string; // رمز المرشدة الطلابية
  updatedAt: string;
  updatedBy?: string;
}

// 4.6 Authorized Staff Email Entry (قائمة البريد المصرح له لمنسوبات المدرسة)
export interface AuthorizedStaffEmail {
  id: string;
  email: string;
  name?: string;
  addedBy?: string;
  addedAt: string;
  isActivated: boolean;
  activatedAt?: string;
  assignedRole?: 'teacher' | 'supervisor' | 'administrator' | 'counselor';
}

export interface ParentStudentRelationship {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  student_record_id?: string;
  relationship_type: RelationshipType;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  student?: UserProfile;
  studentRecord?: StudentRecord;
  parent?: UserProfile;
}

// 5. Announcements (الإعلانات)
export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  image?: string;
  isImportant?: boolean;
  authorId: string;
  authorName: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 6. News & Posts (الأخبار والمنشورات)
export type PostType = 'news' | 'today_summary';
export type PostStatus = 'published' | 'draft' | 'archived';

export interface Post {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  category: string;
  type: PostType;
  images: string[];
  authorId: string;
  authorName: string;
  authorRole: SchoolRole;
  authorEmail?: string;
  status: PostStatus;
  isPinned?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

// 7. Events (الفعاليات)
export type EventStatus = 'upcoming' | 'completed' | 'cancelled' | 'archived';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  image?: string;
  additionalInfo?: string;
  status: EventStatus;
  category?: string;
  authorId: string;
  authorName: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 8. Achievements (الإنجازات)
export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  image?: string;
  category?: string;
  authorId: string;
  authorName: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 9. Photos (الصور)
export interface SchoolPhoto {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  albumId?: string;
  albumName?: string;
  date: string; // YYYY-MM-DD
  authorId: string;
  authorName: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 10. Albums (الألبومات)
export interface SchoolAlbum {
  id: string;
  name: string;
  description?: string;
  coverImage: string;
  photoUrls?: string[];
  photosCount?: number;
  date: string; // YYYY-MM-DD
  authorId: string;
  authorName: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 11. Daily Message (الرسالة اليومية)
export interface DailyMessage {
  id: string;
  content: string;
  date: string; // YYYY-MM-DD
  authorName: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  isActive?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

// 12. Activity Log (سجل النشاط)
export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'UPDATE_ROLE'
  | 'UPDATE_PERMISSIONS'
  | 'SETTINGS_UPDATE'
  | 'PARENT_RELATION_CREATE'
  | 'PARENT_RELATION_UPDATE'
  | 'PARENT_RELATION_DELETE'
  | 'PARENT_RELATION_TOGGLE'
  | 'STUDENT_CREATE'
  | 'STUDENT_UPDATE'
  | 'STUDENT_DELETE'
  | 'LINKING_CODE_GENERATE'
  | 'LINKING_CODE_REVOKE'
  | 'PARENT_LINK_SUCCESS'
  | 'PARENT_LINK_FAILURE'
  | 'PARENT_UNLINK'
  | 'ACCOUNT_LOCKED_TEMPORARY'
  | 'FAILED_LOGIN_ATTEMPT'
  | 'UNAUTHORIZED_LOGIN_ATTEMPT'
  | 'PROFILE_COMPLETED'
  | 'ARCHIVE'
  | 'RESTORE';

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: ActivityAction;
  entity: string; // 'users', 'announcements', 'posts', 'events', 'achievements', 'photos', 'albums', 'dailyMessages', 'siteSettings', 'parent_student_relationships'
  entityId: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
  timestamp: string;
}

// 13. Site Settings (إعدادات الموقع)
export interface SiteSettings {
  schoolName: string;
  motto: string;
  aboutText: string;
  phone: string;
  email: string;
  address: string;
  principalName: string;
  updatedAt?: string;
}

// Navigation Page Views
export type PageView =
  | 'home'
  | 'announcements'
  | 'news'
  | 'today'
  | 'events'
  | 'achievements'
  | 'gallery'
  | 'daily_message'
  | 'parent_portal'
  | 'admin_dashboard'
  | 'users_management'
  | 'students_management'
  | 'delegated_permissions'
  | 'parent_link'
  | 'complete_student_profile'
  | 'activity_log'
  | 'site_settings'
  | 'profile';

declare global {
  interface Window {
    google?: any;
  }
}

