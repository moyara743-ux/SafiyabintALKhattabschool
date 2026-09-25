// 1. Roles definition (7 exact school roles)
export type SchoolRole =
  | 'owner'
  | 'director'
  | 'supervisor'
  | 'administrator'
  | 'counselor'
  | 'teacher'
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
  | 'manageSiteSettings';

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
  school_role: SchoolRole;
  customPermissions?: PermissionKey[];
  temporaryPermissions?: TemporaryPermission[];
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
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
  | 'SETTINGS_UPDATE';

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: ActivityAction;
  entity: string; // 'users', 'announcements', 'posts', 'events', 'achievements', 'photos', 'albums', 'dailyMessages', 'siteSettings'
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
  | 'admin_dashboard'
  | 'users_management'
  | 'activity_log'
  | 'site_settings'
  | 'profile';
