import React, { useEffect, useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { PageView, Post, SchoolEvent, GalleryPhoto, SchoolSettings, PostType } from './types';
import { DEFAULT_SETTINGS } from './data/initialData';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from './lib/firebase';

import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CreatePostModal } from './components/CreatePostModal';
import { QuickAddModal } from './components/QuickAddModal';
import { PostDetailsModal } from './components/PostDetailsModal';
import { AdminDashboard } from './components/AdminDashboard';
import { FloatingAddButton } from './components/FloatingAddButton';

import { HomePage } from './views/HomePage';
import { NewsView } from './views/NewsView';
import { TodayView } from './views/TodayView';
import { EventsView } from './views/EventsView';
import { GalleryView } from './views/GalleryView';
import { ProfileView } from './views/ProfileView';
import { AboutAndContactView } from './views/AboutAndContactView';
import { AchievementsView } from './views/AchievementsView';

import { GraduationCap, Heart, Shield, Sparkles, Phone, Mail, MapPin } from 'lucide-react';

function AppContent() {
  const { user, profile, isOwner, isAdmin, isModerator, canPublish, canManageEvents, canUploadPhotos } = useAuth();

  const [currentView, setCurrentView] = useState<PageView>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // Collections state
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [defaultPostType, setDefaultPostType] = useState<PostType | undefined>(undefined);
  const [quickAddType, setQuickAddType] = useState<'event' | 'gallery' | null>(null);
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<Post | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

  // Listen to Firestore real-time collections
  useEffect(() => {
    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      const list: Post[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as Post), id: d.id });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(list);
    }, (err) => console.warn('Posts sync:', err));

    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const list: SchoolEvent[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as SchoolEvent), id: d.id });
      });
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(list);
    }, (err) => console.warn('Events sync:', err));

    const unsubGallery = onSnapshot(collection(db, 'gallery'), (snap) => {
      const list: GalleryPhoto[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as GalleryPhoto), id: d.id });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGallery(list);
    }, (err) => console.warn('Gallery sync:', err));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SchoolSettings);
      }
    }, (err) => console.warn('Settings sync:', err));

    return () => {
      unsubPosts();
      unsubEvents();
      unsubGallery();
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

  // Filter posts based on global search query if entered
  const searchedPosts = searchQuery.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenAuth={handleOpenAuth}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewPostModal={() => handleOpenCreatePost('news')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Global Search Results Alert if active */}
        {searchQuery.trim() && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950">
              نتائج البحث عن: <span className="underline font-black">"{searchQuery}"</span> ({searchedPosts.length} نتيجة)
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-emerald-700 hover:text-emerald-950 font-bold"
            >
              مسح البحث
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        {currentView === 'home' && (
          <HomePage
            posts={searchedPosts}
            events={events}
            gallery={gallery}
            onNavigate={setCurrentView}
            onSelectPost={setSelectedPostForDetails}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenNewPostModal={handleOpenCreatePost}
            onOpenAddEvent={() => setQuickAddType('event')}
            onOpenAddPhoto={() => setQuickAddType('gallery')}
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
            onSelectPost={setSelectedPostForDetails}
            onOpenNewPostModal={() => handleOpenCreatePost('today_summary')}
          />
        )}

        {currentView === 'events' && (
          <EventsView
            events={events}
            onOpenNewEventModal={() => setQuickAddType('event')}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryView
            gallery={gallery}
            onOpenUploadModal={() => setQuickAddType('gallery')}
          />
        )}

        {currentView === 'achievements' && (
          <AchievementsView
            posts={searchedPosts}
            onSelectPost={setSelectedPostForDetails}
            onOpenNewPostModal={() => handleOpenCreatePost('achievement')}
          />
        )}

        {currentView === 'about' && (
          <AboutAndContactView mode="about" settings={settings} />
        )}

        {currentView === 'contact' && (
          <AboutAndContactView mode="contact" settings={settings} />
        )}

        {currentView === 'profile' && <ProfileView />}

        {currentView === 'admin_dashboard' && (
          isModerator ? (
            <AdminDashboard />
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
              <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-800">منطقة مخصصة للمديرة والمشرفين فقط</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                يجب تسجيل الدخول بحساب مديرة أو مشرفة مصرح لها للوصول إلى لوحة التحكم.
              </p>
              <button
                onClick={() => handleOpenAuth('login')}
                className="mt-4 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md"
              >
                تسجيل الدخول كمسؤول
              </button>
            </div>
          )
        )}
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

      {quickAddType && (
        <QuickAddModal
          isOpen={true}
          onClose={() => setQuickAddType(null)}
          type={quickAddType}
        />
      )}

      <PostDetailsModal
        post={selectedPostForDetails}
        onClose={() => setSelectedPostForDetails(null)}
      />

      {/* Global Floating Quick Add Button */}
      <FloatingAddButton
        onOpenCreatePost={handleOpenCreatePost}
        onOpenAddEvent={() => setQuickAddType('event')}
        onOpenAddPhoto={() => setQuickAddType('gallery')}
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
                  <p className="text-xs text-emerald-400 font-medium">"نصنع المعرفة... ونوثق الإنجاز"</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md font-light">
                {settings.aboutText}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-amber-300">أقسام المنصة</h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li><button onClick={() => setCurrentView('news')} className="hover:text-white">أخبار المدرسة</button></li>
                <li><button onClick={() => setCurrentView('today')} className="hover:text-white">يومنا بالمدرسة</button></li>
                <li><button onClick={() => setCurrentView('events')} className="hover:text-white">جدول الفعاليات</button></li>
                <li><button onClick={() => setCurrentView('gallery')} className="hover:text-white">معرض الصور</button></li>
                <li><button onClick={() => setCurrentView('achievements')} className="hover:text-white">لوحة الإنجازات</button></li>
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <h4 className="text-xs font-bold text-amber-300">التواصل الرسمي</h4>
              <div className="space-y-2 text-slate-400">
                {settings.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{settings.phone}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{settings.address}</span>
                </div>
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
