export type UserRole = 'owner' | 'admin' | 'teacher' | 'editor' | 'user';

export type UserStatus = 'active' | 'suspended';

export interface UserPermissions {
  canPublishNews: boolean;
  canManageEvents: boolean;
  canUploadPhotos: boolean;
  canPostTodaySummary: boolean;
  canManageAnnouncements: boolean;
  requiresReview: boolean; // if true, posts go to 'pending_review' instead of 'published'
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  createdAt: string;
  lastLoginAt?: string;
}

export type PostType = 'news' | 'today_summary' | 'announcement' | 'achievement';
export type PostStatus = 'published' | 'draft' | 'pending_review';

export interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  type: PostType;
  images: string[];
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorEmail?: string;
  status: PostStatus;
  isPinned: boolean;
  likesCount: number;
  likedBy: string[];
  createdAt: string;
  updatedAt?: string;
}

export type EventStatus = 'upcoming' | 'completed' | 'cancelled';

export interface SchoolEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "09:00 ص"
  location: string;
  description: string;
  image?: string;
  status: EventStatus;
  category: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  album: string;
  imageUrl: string;
  description?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  userId: string;
  userName: string;
  userEmail: string;
  targetId?: string;
  targetType?: string;
  timestamp: string;
}

export interface SchoolSettings {
  schoolName: string;
  motto: string;
  aboutText: string;
  phone: string;
  email: string;
  address: string;
  principalName: string;
  enableModerationWorkflow: boolean;
  updatedAt?: string;
}

export type PageView =
  | 'home'
  | 'news'
  | 'today'
  | 'events'
  | 'gallery'
  | 'announcements'
  | 'achievements'
  | 'about'
  | 'contact'
  | 'profile'
  | 'admin_dashboard';
