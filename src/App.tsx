import React, { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import {
  PageView,
  Post,
  Announcement,
  SchoolEvent,
  Achievement,
  SchoolPhoto,
  SchoolAlbum,
  DailyMessage,
  SiteSettings,
  PostType,
} from './types';
import { dataStore } from './lib/dataStore';

import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CreatePostModal } from './components/CreatePostModal';
import { CreateAnnouncementModal } from './components/CreateAnnouncementModal';
import { CreateEventModal } from './components/CreateEventModal';
import { CreateAchievementModal } from './components/CreateAchievementModal';
import { UploadPhotoModal } from './components/UploadPhotoModal';
import { CreateAlbumModal } from './components/CreateAlbumModal';
import { DailyMessageModal } from './components/DailyMessageModal';
import { PostDetailsModal } from './components/PostDetailsModal';
import { FloatingAddButton } from './components/FloatingAddButton';

import { HomePage } from './views/HomePage';
import { AnnouncementsView } from './views/AnnouncementsView';
import { NewsView } from './views/NewsView';
import { TodayView } from './views/TodayView';
import { EventsView } from './views/EventsView';
import { AchievementsView } from './views/AchievementsView';
import { GalleryView } from './views/GalleryView';
import { DailyMessageView } from './views/DailyMessageView';
import { AdminDashboard } from './views/AdminDashboard';
import { UsersManagementView } from './views/UsersManagementView';
import { ActivityLogView } from './views/ActivityLogView';
import { SiteSettingsView } from './views/SiteSettingsView';
import { ProfileView } from './views/ProfileView';
import { LoginView } from './views/LoginView';

import { GraduationCap, Shield, Phone, Mail, MapPin, Sparkles } from 'lucide-react';

function AppContent() {
  const { user, profile, hasPerm, isOwner, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<PageView>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time Firestore Collections
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [photos, setPhotos] = useState<SchoolPhoto[]>([]);
  const [albums, setAlbums] = useState<SchoolAlbum[]>([]);
  const [dailyMessages, setDailyMessages] = useState<DailyMessage[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    schoolName: 'مدرسة صفية بنت عمر الابتدائية',
    motto: 'صرح تعليمي رائد يصنع جيل المستقبل برؤية طموحة',
    aboutText:
      'مدرسة صفية بنت عمر صرح تعليمي رائد يهدف إلى تقديم تعليم نوعي وتنشئة أجيال واعدة متمكنة من مهارات المستقبل ومعتزة بهويتها الوطنية والقيم الإسلامية.',
    phone: '011-2345678',
    email: 'info@safiah-school.edu.sa',
    address: 'المملكة العربية السعودية - الرياض',
    principalName: 'أ. هدى الغامدي',
  });

  // Modal Open States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [defaultPostType, setDefaultPostType] = useState<PostType | undefined>(undefined);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<SchoolEvent | null>(null);

  const [createAchievementOpen, setCreateAchievementOpen] = useState(false);
  const [achievementToEdit, setAchievementToEdit] = useState<Achievement | null>(null);

  const [uploadPhotoOpen, setUploadPhotoOpen] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<SchoolPhoto | null>(null);

  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [albumToEdit, setAlbumToEdit] = useState<SchoolAlbum | null>(null);

  const [dailyMessageModalOpen, setDailyMessageModalOpen] = useState(false);
  const [dailyMessageToEdit, setDailyMessageToEdit] = useState<DailyMessage | null>(null);

  const [selectedPostForDetails, setSelectedPostForDetails] = useState<Post | null>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [bypassAuthLoading, setBypassAuthLoading] = useState(false);

  // Safety timer on authLoading screen
  useEffect(() => {
    if (authLoading) {
      const skipTimer = setTimeout(() => setShowSkipButton(true), 2500);
      const autoReleaseTimer = setTimeout(() => setBypassAuthLoading(true), 6000);
      return () => {
        clearTimeout(skipTimer);
        clearTimeout(autoReleaseTimer);
      };
    } else {
      setShowSkipButton(false);
    }
  }, [authLoading]);

  // Data Synchronizers
  useEffect(() => {
    const unsubPosts = dataStore.subscribe<Post[]>('posts', (items) => setPosts(items));
    const unsubAnnouncements = dataStore.subscribe<Announcement[]>('announcements', (items) => setAnnouncements(items));
    dataStore.getAnnouncements().then((items) => setAnnouncements(items));
    const unsubEvents = dataStore.subscribe<SchoolEvent[]>('events', (items) => setEvents(items));
    const unsubAchievements = dataStore.subscribe<Achievement[]>('achievements', (items) => setAchievements(items));
    const unsubPhotos = dataStore.subscribe<SchoolPhoto[]>('photos', (items) => setPhotos(items));
    const unsubAlbums = dataStore.subscribe<SchoolAlbum[]>('albums', (items) => setAlbums(items));
    const unsubDailyMessages = dataStore.subscribe<DailyMessage[]>('dailyMessages', (items) => setDailyMessages(items));
    const unsubSettings = dataStore.subscribe<SiteSettings>('settings', (st) => setSettings(st));

    return () => {
      unsubPosts();
      unsubAnnouncements();
      unsubEvents();
      unsubAchievements();
      unsubPhotos();
      unsubAlbums();
      unsubDailyMessages();
      unsubSettings();
    };
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenCreatePost = (type?: PostType) => {
    setPostToEdit(null);
    setDefaultPostType(type);
    setCreatePostOpen(true);
  };

  const handleEditPost = (post: Post) => {
    setPostToEdit(post);
    setDefaultPostType(post.type);
    setCreatePostOpen(true);
  };

  const handleOpenCreateAnnouncement = () => {
    setAnnouncementToEdit(null);
    setCreateAnnouncementOpen(true);
  };

  const handleEditAnnouncement = (ann: Announcement) => {
    setAnnouncementToEdit(ann);
    setCreateAnnouncementOpen(true);
  };

  const handleOpenAddEvent = () => {
    setEventToEdit(null);
    setCreateEventOpen(true);
  };

  const handleEditEvent = (ev: SchoolEvent) => {
    setEventToEdit(ev);
    setCreateEventOpen(true);
  };

  const handleOpenAddAchievement = () => {
    setAchievementToEdit(null);
    setCreateAchievementOpen(true);
  };

  const handleEditAchievement = (ach: Achievement) => {
    setAchievementToEdit(ach);
    setCreateAchievementOpen(true);
  };

  const handleOpenAddPhoto = () => {
    setPhotoToEdit(null);
    setUploadPhotoOpen(true);
  };

  const handleEditPhoto = (pic: SchoolPhoto) => {
    setPhotoToEdit(pic);
    setUploadPhotoOpen(true);
  };

  const handleOpenCreateAlbum = () => {
    setAlbumToEdit(null);
    setCreateAlbumOpen(true);
  };

  const handleEditAlbum = (album: SchoolAlbum) => {
    setAlbumToEdit(album);
    setCreateAlbumOpen(true);
  };

  const handleOpenDailyMessageModal = () => {
    setDailyMessageToEdit(null);
    setDailyMessageModalOpen(true);
  };

  const handleEditDailyMessage = (msg: DailyMessage) => {
    setDailyMessageToEdit(msg);
    setDailyMessageModalOpen(true);
  };

  // Filter posts based on global search query
  const searchedPosts = searchQuery.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  // Active daily message
  const activeDailyMessage = dailyMessages.find((m) => m.isActive) || dailyMessages[0] || null;

  // Session check loading screen with timeout and skip button
  if (authLoading && !bypassAuthLoading) {
    return (
      <div
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white"
        dir="rtl"
      >
        <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-950/60 border border-emerald-400/30 animate-pulse mb-4">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-base font-extrabold text-white">مدرسة صفية بنت عمر الابتدائية</h2>
        <p className="text-xs text-slate-400 mt-1">جارٍ التحقق من جلسة الدخول...</p>

        {showSkipButton && (
          <button
            type="button"
            onClick={() => setBypassAuthLoading(true)}
            className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-all shadow-md cursor-pointer animate-in fade-in duration-300"
          >
            المتابعة إلى صفحة الدخول ←
          </button>
        )}
      </div>
    );
  }

  // Mandatory Login Gate: When not authenticated, show LoginView immediately
  if (!user) {
    return <LoginView />;
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white overflow-x-hidden w-full max-w-full"
      dir="rtl"
    >
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenAuth={handleOpenAuth}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewPostModal={() => handleOpenCreatePost('news')}
      />

      {/* Main Content Area with generous responsive padding */}
      <main className="flex-1 max-w-7xl 2xl:max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16 overflow-x-hidden">
        {/* Global Search Results Alert if active */}
        {searchQuery.trim() && (
          <div className="mb-6 p-4 sm:p-5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
            <span className="text-xs sm:text-sm lg:text-base font-bold text-emerald-300">
              نتائج البحث عن:{' '}
              <span className="underline font-black text-white">"{searchQuery}"</span>
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs sm:text-sm lg:text-base text-emerald-400 hover:text-white font-bold"
            >
              مسح البحث
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        {currentView === 'home' && (
          <HomePage
            posts={searchedPosts}
            announcements={announcements}
            events={events}
            achievements={achievements}
            photos={photos}
            albums={albums}
            dailyMessage={activeDailyMessage}
            onNavigate={setCurrentView}
            onSelectPost={setSelectedPostForDetails}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenCreatePost={handleOpenCreatePost}
            onOpenCreateAnnouncement={handleOpenCreateAnnouncement}
            onOpenAddEvent={handleOpenAddEvent}
            onOpenAddAchievement={handleOpenAddAchievement}
            onOpenAddPhoto={handleOpenAddPhoto}
            onOpenCreateAlbum={handleOpenCreateAlbum}
            onOpenDailyMessageModal={handleOpenDailyMessageModal}
          />
        )}

        {currentView === 'announcements' && (
          <AnnouncementsView
            announcements={announcements}
            onOpenCreateModal={handleOpenCreateAnnouncement}
            onEditAnnouncement={handleEditAnnouncement}
          />
        )}

        {currentView === 'news' && (
          <NewsView
            posts={searchedPosts}
            onSelectPost={setSelectedPostForDetails}
            onOpenNewPostModal={() => handleOpenCreatePost('news')}
          />
        )}

        {currentView === 'today' && (
          <TodayView
            posts={searchedPosts}
            events={events}
            onSelectPost={setSelectedPostForDetails}
            onOpenNewPostModal={() => handleOpenCreatePost('today_summary')}
          />
        )}

        {currentView === 'events' && (
          <EventsView
            events={events}
            onOpenNewEventModal={handleOpenAddEvent}
            onEditEvent={handleEditEvent}
            onDeleteEvent={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
          />
        )}

        {currentView === 'achievements' && (
          <AchievementsView
            achievements={achievements}
            onOpenCreateModal={handleOpenAddAchievement}
            onEditAchievement={handleEditAchievement}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryView
            photos={photos}
            albums={albums}
            onOpenUploadPhoto={handleOpenAddPhoto}
            onOpenCreateAlbum={handleOpenCreateAlbum}
            onEditPhoto={handleEditPhoto}
            onEditAlbum={handleEditAlbum}
          />
        )}

        {currentView === 'daily_message' && (
          <DailyMessageView
            messages={dailyMessages}
            onOpenCreateModal={handleOpenDailyMessageModal}
            onEditMessage={handleEditDailyMessage}
          />
        )}

        {currentView === 'admin_dashboard' && (
          <AdminDashboard
            onNavigate={setCurrentView}
            onOpenCreatePost={() => handleOpenCreatePost('news')}
            onOpenCreateAnnouncement={handleOpenCreateAnnouncement}
            onOpenAddEvent={handleOpenAddEvent}
            onOpenAddAchievement={handleOpenAddAchievement}
            onOpenAddPhoto={handleOpenAddPhoto}
            onOpenCreateAlbum={handleOpenCreateAlbum}
            onOpenDailyMessageModal={handleOpenDailyMessageModal}
          />
        )}

        {currentView === 'users_management' && <UsersManagementView />}

        {currentView === 'activity_log' && <ActivityLogView />}

        {currentView === 'site_settings' && <SiteSettingsView />}

        {currentView === 'profile' && <ProfileView />}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => {
          setCreatePostOpen(false);
          setPostToEdit(null);
        }}
        postToEdit={postToEdit}
        defaultType={defaultPostType}
      />

      <CreateAnnouncementModal
        isOpen={createAnnouncementOpen}
        onClose={() => {
          setCreateAnnouncementOpen(false);
          setAnnouncementToEdit(null);
        }}
        announcementToEdit={announcementToEdit}
      />

      <CreateEventModal
        isOpen={createEventOpen}
        onClose={() => {
          setCreateEventOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
      />

      <CreateAchievementModal
        isOpen={createAchievementOpen}
        onClose={() => {
          setCreateAchievementOpen(false);
          setAchievementToEdit(null);
        }}
        achievementToEdit={achievementToEdit}
      />

      <UploadPhotoModal
        isOpen={uploadPhotoOpen}
        onClose={() => {
          setUploadPhotoOpen(false);
          setPhotoToEdit(null);
        }}
        photoToEdit={photoToEdit}
      />

      <CreateAlbumModal
        isOpen={createAlbumOpen}
        onClose={() => {
          setCreateAlbumOpen(false);
          setAlbumToEdit(null);
        }}
        albumToEdit={albumToEdit}
      />

      <DailyMessageModal
        isOpen={dailyMessageModalOpen}
        onClose={() => {
          setDailyMessageModalOpen(false);
          setDailyMessageToEdit(null);
        }}
        messageToEdit={dailyMessageToEdit}
      />

      <PostDetailsModal
        post={selectedPostForDetails}
        onClose={() => setSelectedPostForDetails(null)}
      />

      {/* Global Floating Quick Add Button */}
      <FloatingAddButton
        onOpenCreatePost={handleOpenCreatePost}
        onOpenCreateAnnouncement={handleOpenCreateAnnouncement}
        onOpenAddEvent={handleOpenAddEvent}
        onOpenAddAchievement={handleOpenAddAchievement}
        onOpenAddPhoto={handleOpenAddPhoto}
        onOpenCreateAlbum={handleOpenCreateAlbum}
        onOpenDailyMessageModal={handleOpenDailyMessageModal}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 mt-16 pt-12 pb-8" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            {/* School Profile */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-serif">{settings.schoolName}</h3>
                  <p className="text-xs text-emerald-400 font-medium">{settings.motto}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md font-light">
                {settings.aboutText}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-amber-300">أقسام المنصة الرئيسية</h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>
                  <button onClick={() => setCurrentView('announcements')} className="hover:text-white">
                    الإعلانات والتعاميم
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('news')} className="hover:text-white">
                    الأخبار والمنشورات
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('today')} className="hover:text-white">
                    ماذا حدث اليوم؟
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('events')} className="hover:text-white">
                    جدول الفعاليات
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('achievements')} className="hover:text-white">
                    لوحة الشرف والإنجازات
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('gallery')} className="hover:text-white">
                    معرض الصور والألبومات
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <h4 className="text-xs font-bold text-amber-300">معلومات التواصل المعتمدة</h4>
              <div className="space-y-2 text-slate-400">
                {settings.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{settings.phone}</span>
                  </div>
                )}
                {settings.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{settings.email}</span>
                  </div>
                )}
                {settings.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{settings.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} مدرسة صفية بنت عمر — جميع الحقوق محفوظة</p>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام إدارة المحتوى المدرسي الآمن (RBAC)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
