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
    phone: '',
    email: '',
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
    const unsubSettings = dataStore.subscribe<SiteSettings>('settings', (st) => {
      const cleanSt: SiteSettings = {
        ...st,
        phone: st.phone && st.phone !== '011-2345678' ? st.phone : '',
        email: st.email && st.email !== 'info@safiah-school.edu.sa' ? st.email : '',
        address: st.address || 'المملكة العربية السعودية - الرياض',
      };
      setSettings(cleanSt);
    });

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
        className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-slate-800"
        dir="rtl"
      >
        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-900 to-emerald-700 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-950/20 border-2 border-amber-400/50 animate-pulse mb-4">
          <GraduationCap className="w-9 h-9 text-amber-300" />
        </div>
        <h2 className="text-lg font-extrabold text-emerald-950">مدرسة صفية بنت عمر الابتدائية</h2>
        <p className="text-xs text-slate-500 mt-1">جارٍ التحقق من جلسة الدخول...</p>

        {showSkipButton && (
          <button
            type="button"
            onClick={() => setBypassAuthLoading(true)}
            className="mt-6 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-900 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer animate-in fade-in duration-300"
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
      className="min-h-screen bg-white text-slate-800 font-sans flex flex-col justify-between selection:bg-emerald-900 selection:text-amber-200 overflow-x-hidden w-full max-w-full"
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
          <div className="mb-6 p-4 sm:p-5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between shadow-sm">
            <span className="text-xs sm:text-sm lg:text-base font-bold text-emerald-950">
              نتائج البحث عن:{' '}
              <span className="underline font-black text-emerald-900">"{searchQuery}"</span>
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs sm:text-sm lg:text-base text-emerald-800 hover:text-emerald-950 font-bold underline"
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
      <footer className="bg-emerald-950 text-white border-t-2 border-amber-400/40 mt-16 pt-12 pb-8 shadow-2xl" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-emerald-800/60">
            {/* School Profile */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-tr from-emerald-800 to-emerald-600 rounded-2xl flex items-center justify-center text-amber-300 border border-amber-400/40 shadow-md">
                  <GraduationCap className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">{settings.schoolName}</h3>
                  <p className="text-xs text-amber-300/90 font-medium">{settings.motto}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed max-w-md font-light">
                {settings.aboutText}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>أقسام المنصة الرئيسية</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-100/90">
                <li>
                  <button onClick={() => setCurrentView('announcements')} className="hover:text-amber-300 transition-colors">
                    الإعلانات والتعاميم
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('news')} className="hover:text-amber-300 transition-colors">
                    الأخبار والمنشورات
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('today')} className="hover:text-amber-300 transition-colors">
                    ماذا حدث اليوم؟
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('events')} className="hover:text-amber-300 transition-colors">
                    جدول الفعاليات
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('achievements')} className="hover:text-amber-300 transition-colors">
                    لوحة الشرف والإنجازات
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('gallery')} className="hover:text-amber-300 transition-colors">
                    معرض الصور والألبومات
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-3 text-xs text-emerald-100/90">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>معلومات التواصل المعتمدة</span>
              </h4>
              <div className="space-y-2 text-emerald-200/90">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-xs">
                  <MapPin className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-amber-300/80 block font-bold">الموقع الجغرافي</span>
                    <span className="text-xs font-medium text-white block">
                      {settings.address || 'المملكة العربية السعودية - الرياض'}
                    </span>
                  </div>
                </div>
                {settings.phone && settings.phone !== '011-2345678' && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="text-xs font-medium text-white">{settings.phone}</span>
                  </div>
                )}
                {settings.email && settings.email !== 'info@safiah-school.edu.sa' && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="text-xs font-medium text-white">{settings.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-300/80">
            <p>© {new Date().getFullYear()} مدرسة صفية بنت عمر — جميع الحقوق محفوظة</p>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
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
