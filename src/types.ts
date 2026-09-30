// 1. Roles definition (8 school roles)
export type SchoolRole =
  | 'owner'
  | 'director'
  | 'supervisor'
  | 'administrator'
  | 'counselor'
  | 'teacher'
  | 'parent'
  | 'student';

export type UserStatus = 'active' | 'disabled';

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
  gradeStage?: string;
  linkedStudentIds?: string[];
  linkedParentIds?: string[];
  school_role: SchoolRole;
  customPermissions?: PermissionKey[];
  temporaryPermissions?: TemporaryPermission[];
  status: UserStatus;
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
  national_id?: string;
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
  createdAt: string;
  updatedAt?: string;
}

// 6. News & Posts (الأخبار والمنشورات)
export type PostType = 'news' | 'today_summary';
export type PostStatus = 'published' | 'draft';

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
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

// 7. Events (الفعاليات)
export type EventStatus = 'upcoming' | 'completed' | 'cancelled';

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
  | 'PARENT_UNLINK';

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
  | 'parent_link'
  | 'complete_student_profile'
  | 'activity_log'
  | 'site_settings'
  | 'profile';
