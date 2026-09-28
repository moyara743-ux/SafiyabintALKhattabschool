import React, { useState, useRef, useEffect } from 'react';
import {
  Post,
  SchoolEvent,
  Achievement,
  SchoolPhoto,
  SchoolAlbum,
  Announcement,
  DailyMessage,
  PageView,
  PostType,
} from '../types';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import {
  formatArabicFullDate,
  formatArabicShortDate,
  isTodayDate,
  isTomorrowDate,
} from '../lib/dateUtils';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  Image as ImageIcon,
  Award,
  ArrowLeft,
  Sun,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  Bell,
  ChevronLeft,
  ChevronDown,
  X,
  Users,
  Laptop,
  HeartHandshake,
  Compass,
  Lightbulb,
  ExternalLink,
  MessageSquare,
  Plus,
  Edit,
  FolderPlus,
} from 'lucide-react';

interface HomePageProps {
  posts: Post[];
  announcements: Announcement[];
  events: SchoolEvent[];
  achievements: Achievement[];
  photos: SchoolPhoto[];
  albums: SchoolAlbum[];
  dailyMessage: DailyMessage | null;
  onNavigate: (view: PageView) => void;
  onSelectPost: (p: Post) => void;
  onOpenAuth: () => void;
  onOpenCreatePost: (defaultType?: PostType) => void;
  onOpenCreateAnnouncement: () => void;
  onOpenAddEvent: () => void;
  onOpenAddAchievement: () => void;
  onOpenAddPhoto: () => void;
  onOpenCreateAlbum: () => void;
  onOpenDailyMessageModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  posts,
  announcements,
  events,
  achievements,
  photos,
  albums,
  dailyMessage,
  onNavigate,
  onSelectPost,
  onOpenAuth,
  onOpenCreatePost,
  onOpenCreateAnnouncement,
  onOpenAddEvent,
  onOpenAddAchievement,
  onOpenAddPhoto,
  onOpenCreateAlbum,
  onOpenDailyMessageModal,
}) => {
  const { user, profile, hasPerm, isOwner } = useAuth();

  // Strict permissions check for "+ إضافة" button in the statistics section ("أرقام وإحصائيات مباشرة")
  // Requirement:
  // - Hidden completely from students, teachers, parents, and unauthenticated visitors
  // - Visible exclusively to users with Admin role (administrator, director) or System Owner (owner, isOwner)
  const canManageStats = !!user && !!profile && (
    isOwner ||
    (profile.school_role === 'owner' && profile.email?.toLowerCase() === 'moyara743@gmail.com') ||
    profile.school_role === 'director' ||
    profile.school_role === 'administrator'
  );

  // Dynamic Date calculations
  const todayArabic = formatArabicFullDate(new Date());

  // Filter today's summary posts
  const todaySummaries = posts.filter(
    (p) => p.status === 'published' && p.type === 'today_summary'
  );

  // Filter events of today and tomorrow
  const todayEvents = events.filter((e) => isTodayDate(e.date));
  const tomorrowEvents = events.filter((e) => isTomorrowDate(e.date));
  const upcomingEvents = events.filter((e) => e.status === 'upcoming').slice(0, 4);

  // Filter important announcements
  const importantAnnouncements = announcements.filter((a) => a.isImportant);
  const displayAnnouncements =
    importantAnnouncements.length > 0 ? importantAnnouncements : announcements.slice(0, 3);

  // News and Achievements
  const latestNews = posts.filter((p) => p.status === 'published' && p.type === 'news').slice(0, 3);
  const latestAchievements = achievements.slice(0, 4);

  // Statistics
  const stats = [
    {
      number: `${posts.length + announcements.length}`,
      label: 'تقرير وخبر معتمد',
      sub: 'توثيق مستمر لليوم المدرسي',
      icon: BookOpen,
      color: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30',
    },
    {
      number: `${events.length}`,
      label: 'فعالية ونشاط',
      sub: 'برامج إثرائية ومسابقات',
      icon: Calendar,
      color: 'text-teal-400 bg-teal-950/80 border-teal-500/30',
    },
    {
      number: `${achievements.length}`,
      label: 'إنجاز وتكريم',
      sub: 'تفوق طالبات وكفاءة معلمات',
      icon: Award,
      color: 'text-purple-400 bg-purple-950/80 border-purple-500/30',
    },
    {
      number: `${photos.length + albums.length}`,
      label: 'صورة وألبوم موثق',
      sub: 'أرشيف بصري رقمي شامل',
      icon: ImageIcon,
      color: 'text-amber-400 bg-amber-950/80 border-amber-500/30',
    },
  ];

  // Official Education Platforms
  const [platformsDropdownOpen, setPlatformsDropdownOpen] = useState(false);
  const [showPlatformsModal, setShowPlatformsModal] = useState(false);
  const platformsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        platformsDropdownRef.current &&
        !platformsDropdownRef.current.contains(event.target as Node)
      ) {
        setPlatformsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlatformsDropdownOpen(false);
        setShowPlatformsModal(false);
      }
    };

    if (platformsDropdownOpen || showPlatformsModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [platformsDropdownOpen, showPlatformsModal]);

  const officialPlatforms = [
    {
      name: 'نظام نور',
      shortName: 'نور',
      url: 'https://noor.moe.gov.sa/',
      domain: 'noor.moe.gov.sa',
      description: 'النتائج، تسجيل الطلاب، والتقارير والخدمات المدرسية',
      color: 'border-blue-500/40 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    },
    {
      name: 'منصة مدرستي',
      shortName: 'مدرستي',
      url: 'https://schools.madrasati.sa/',
      domain: 'schools.madrasati.sa',
      description: 'التعليم الإلكتروني، الفصول الافتراضية، والجداول والواجبات',
      color: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    },
    {
      name: 'بوابة عين',
      shortName: 'عين',
      url: 'https://www.ien.edu.sa/Home/Dashbord',
      domain: 'ien.edu.sa',
      description: 'بوابة التعليم الوطنية — المناهج الرقمية والدروس الإثرائية',
      color: 'border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    },
  ];

  // Quick Portals
  const quickPortals = [
    {
      id: 'student_portal',
      title: 'بوابة الطالبات',
      subtitle: 'الأنشطة والمسابقات وسجل الشرف',
      icon: GraduationCap,
      action: () => onNavigate('achievements'),
      tag: 'إنجازات ومسابقات',
      accent: 'hover:border-emerald-500 hover:bg-emerald-900/30',
      isDropdown: false,
    },
    {
      id: 'staff_portal',
      title: 'بوابة المعلمات والإدارة',
      subtitle: 'لوحة التحكم والتوثيق اليومي',
      icon: Laptop,
      action: () => (user ? onNavigate('admin_dashboard') : onOpenAuth()),
      tag: user ? 'لوحة التحكم' : 'تسجيل الدخول',
      accent: 'hover:border-teal-500 hover:bg-teal-900/30',
      isDropdown: false,
    },
    {
      id: 'announcements_portal',
      title: 'الإعلانات والتعاميم',
      subtitle: 'التنبيهات المهمة ومواعيد الاختبارات',
      icon: Bell,
      action: () => onNavigate('announcements'),
      tag: 'إعلانات رسمية',
      accent: 'hover:border-rose-500 hover:bg-rose-900/30',
      isDropdown: false,
    },
    {
      id: 'official_platforms',
      title: 'المنصات التعليمية الرسمية',
      subtitle: 'نظام نور، منصة مدرستي، وبوابة عين',
      icon: ExternalLink,
      action: () => setPlatformsDropdownOpen(!platformsDropdownOpen),
      tag: 'خدمات وزارية',
      accent: 'hover:border-blue-500 hover:bg-blue-900/30',
      isDropdown: true,
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20 pb-20" dir="rtl">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-950 via-[#064e3b] to-emerald-900 text-white shadow-2xl border-2 border-amber-400/40">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fde68a_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            {/* Dynamic Date & Official Identity Badge */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-bold shadow-inner">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse" />
                <span>المنصة الرسمية المعتمدة</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-900/80 border border-emerald-700 text-emerald-100 text-xs sm:text-sm font-medium">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                <span>{todayArabic}</span>
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug text-white">
                مدرسة صفية بنت عمر الابتدائية
                <span className="block text-base sm:text-lg lg:text-xl font-bold text-amber-300 mt-1">
                  نصنع المعرفة... ونوثق الإنجاز
                </span>
              </h1>

              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl font-normal pt-1">
                مرحباً بكم في البوابة الرقمية الرسمية لمدرسة صفية بنت عمر. صرح تربوي وتعليمي رائد
                يجمع بين التميز الأكاديمي، وتنمية المهارات القيادية، ورعاية الموهوبات، وتوثيق يوميات
                المدرسة أولاً بأول.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('news')}
                className="px-4 py-2.5 sm:px-5 sm:py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer border border-amber-300"
              >
                <span>استكشاف الأخبار والأنشطة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('today')}
                className="px-4 py-2.5 sm:px-5 sm:py-3 bg-emerald-900/90 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl border border-emerald-700/80 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sun className="w-4 h-4 text-amber-300" />
                <span>ماذا حدث اليوم بالمدرسة؟</span>
              </button>

              <button
                onClick={() => onNavigate('events')}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 text-amber-300 hover:text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>جدول الفعاليات</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* School Card Preview */}
          <div className="lg:col-span-4 hidden lg:flex justify-center">
            <div className="w-80 lg:w-84 rounded-3xl bg-emerald-900/90 p-6 lg:p-7 border-2 border-amber-400/40 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between text-xs sm:text-sm text-emerald-100">
                <span className="font-bold flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                  بيئة تعليمية محفزة
                </span>
                <span className="bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-400/30">
                  نشط ومتميز
                </span>
              </div>

              <div className="text-center py-6 px-4 bg-emerald-950/80 rounded-2xl border border-white/10 space-y-2">
                <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
                  <GraduationCap className="w-8 h-8 text-emerald-950" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">مدرسة صفية بنت عمر</h3>
                <p className="text-xs sm:text-sm text-amber-300 font-medium">تعليم متميز وقيم أصيلة</p>
              </div>

              <div className="p-4 bg-emerald-950/90 rounded-2xl text-xs sm:text-sm space-y-2.5 border border-amber-400/30">
                <div className="flex items-center justify-between text-emerald-200">
                  <span>تاريخ اليوم:</span>
                  <span className="font-bold text-amber-300">{formatArabicShortDate(new Date())}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span>فعاليات اليوم:</span>
                  <span className="font-bold text-white">مجدولة ومتاحة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IMPORTANT ANNOUNCEMENTS TICKER / BANNER */}
      {displayAnnouncements.length > 0 && (
        <section className="bg-amber-50 border-2 border-amber-300 rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-7 text-amber-950 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-amber-200 text-amber-900 border border-amber-300 shrink-0 shadow-sm">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-800 animate-bounce" />
              </span>
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs lg:text-sm font-extrabold uppercase tracking-wider text-amber-800 block">
                  إعلانات وتنبيهات المدرسة الرسمية
                </span>
                <p className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-900">
                  {displayAnnouncements[0].title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => onNavigate('announcements')}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm lg:text-base font-bold transition-all border border-amber-400 shadow-sm cursor-pointer"
              >
                عرض كل الإعلانات
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. DAILY MESSAGE (الرسالة اليومية للمدرسة) */}
      <section className="bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/40 border border-amber-300/80 rounded-3xl p-6 sm:p-8 lg:p-10 text-slate-900 shadow-sm relative space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shrink-0 shadow-sm">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-amber-700 block">الرسالة اليومية</span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-emerald-950 mt-0.5">
                إشراقة اليوم في صفية بنت عمر
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {dailyMessage && hasPerm('editDailyMessage') && (
              <button
                onClick={onOpenDailyMessageModal}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
                <span>تعديل رسالة اليوم</span>
              </button>
            )}
            {!dailyMessage && hasPerm('createDailyMessage') && (
              <button
                onClick={onOpenDailyMessageModal}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm lg:text-base font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-900"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>إضافة رسالة اليوم</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('daily_message')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:underline px-2.5"
            >
              أرشيف الرسائل
            </button>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-200/90 shadow-sm mt-4">
          {dailyMessage ? (
            <div className="space-y-3.5">
              <p className="text-sm sm:text-base lg:text-lg text-slate-800 leading-relaxed font-medium">
                "{dailyMessage.content}"
              </p>
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 pt-3.5 border-t border-slate-100">
                <span>كتبت بواسطة: <strong className="text-slate-800">{dailyMessage.authorName}</strong></span>
                <span>تاريخ: {dailyMessage.date}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 italic">
              "العلم نورٌ يبني العقول، والأخلاق تاجٌ يزيّن النفوس. نتمنى لطالباتنا ومعلماتنا يوماً مليئاً بالإنجاز والعطاء."
            </p>
          )}
        </div>
      </section>

      {/* 4. QUICK ACCESS PORTALS */}
      <section className="space-y-5 lg:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-950">بوابات وخدمات الوصول السريع</h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-500 mt-1">روابط مباشرة مخصصة للطالبات، المعلمات، وأولياء الأمور</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {quickPortals.map((portal, idx) => {
            const Icon = portal.icon;

            if (portal.isDropdown) {
              return (
                <div key={portal.id || idx} ref={platformsDropdownRef} className="relative">
                  <div
                    onClick={portal.action}
                    className={`bg-slate-50/80 hover:bg-white p-6 lg:p-8 rounded-2xl lg:rounded-3xl border ${
                      platformsDropdownOpen
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-md'
                        : 'border-slate-200'
                    } shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group min-h-[200px] lg:min-h-[230px] hover:border-amber-400/80`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 lg:w-13 lg:h-13 rounded-xl lg:rounded-2xl bg-white text-emerald-800 border border-slate-200 group-hover:bg-emerald-50 group-hover:border-emerald-300 flex items-center justify-center transition-colors shadow-xs">
                          <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                          {portal.tag}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg lg:text-xl font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors">
                        {portal.title}
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {portal.subtitle}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm lg:text-base text-emerald-800 font-bold">
                      <span>اختيار المنصة (3 منصات)</span>
                      <ChevronDown
                        className={`w-4 h-4 lg:w-5 lg:h-5 transition-transform duration-200 ${
                          platformsDropdownOpen ? 'rotate-180 text-amber-600' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Dropdown Menu for Official Platforms */}
                  {platformsDropdownOpen && (
                    <div
                      className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 text-slate-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                          <span>منصات وزارة التعليم المعتمدة</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPlatformsDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="إغلاق"
                          aria-label="إغلاق"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {officialPlatforms.map((plat) => (
                          <a
                            key={plat.name}
                            href={plat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setPlatformsDropdownOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all text-slate-800 group/item"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="px-2 py-1 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-900 shrink-0">
                                {plat.shortName}
                              </span>
                              <div className="truncate">
                                <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover/item:text-emerald-900">
                                  {plat.name}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate">
                                  {plat.domain}
                                </div>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-800 transition-colors shrink-0 mr-1.5" />
                          </a>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-1">
                        <span>تفتح في تبويب جديد</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPlatformsDropdownOpen(false);
                            setShowPlatformsModal(true);
                          }}
                          className="text-emerald-800 hover:text-emerald-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          عرض بالتفصيل
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={portal.id || idx}
                onClick={portal.action}
                className="bg-slate-50/80 hover:bg-white p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group min-h-[200px] lg:min-h-[230px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 lg:w-13 lg:h-13 rounded-xl lg:rounded-2xl bg-white text-emerald-800 border border-slate-200 group-hover:bg-emerald-50 group-hover:border-emerald-300 flex items-center justify-center transition-colors shadow-xs">
                      <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md group-hover:text-emerald-800 transition-colors">
                      {portal.tag}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg lg:text-xl font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {portal.subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm lg:text-base text-emerald-800 font-bold">
                  <span>الدخول للبوابة</span>
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:-translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. "WHAT HAPPENED TODAY?" & "WHAT WILL HAPPEN TOMORROW?" SPOTLIGHT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
        {/* Today's Updates (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shrink-0 shadow-xs">
                  <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-amber-700 block">توثيق مباشر</span>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-emerald-950">ماذا حدث اليوم في المدرسة؟</h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasPerm('createPosts') && (
                  <button
                    onClick={() => onOpenCreatePost('today_summary')}
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-900"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>توثيق اليوم</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('today')}
                  className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:underline px-2.5"
                >
                  عرض الكل
                </button>
              </div>
            </div>

            {todaySummaries.length > 0 ? (
              <div className="space-y-3.5">
                {todaySummaries.slice(0, 2).map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost(post)}
                    className="p-4 sm:p-5 lg:p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-amber-400/80 transition-all cursor-pointer group space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                      <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{post.category}</span>
                      <span>{post.date}</span>
                    </div>
                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-emerald-950 group-hover:text-emerald-700 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-7 lg:p-9 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <p className="text-xs sm:text-sm lg:text-base text-slate-500">
                  لم يتم توثيق ملخص اليوم بعد. ترقبوا التحديثات الصباحية اليومية من معلمات المدرسة.
                </p>
                {hasPerm('createPosts') && (
                  <button
                    onClick={() => onOpenCreatePost('today_summary')}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm lg:text-base rounded-xl inline-flex items-center gap-1.5 shadow-sm border border-emerald-900"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>إضافة ملخص اليوم الأول</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-left">
            <button
              onClick={() => onNavigate('today')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:underline flex items-center gap-1.5 inline-flex"
            >
              <span>مشاهدة تقارير يومنا بالمدرسة كاملة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tomorrow's Agenda & Today's Events (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-300 shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-emerald-800 block">جدول الأنشطة</span>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-emerald-950">ماذا سيحدث غداً؟</h3>
                </div>
              </div>

              {hasPerm('createEvents') && (
                <button
                  onClick={onOpenAddEvent}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 shadow-sm border border-emerald-900"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة فعالية</span>
                </button>
              )}
            </div>

            {tomorrowEvents.length > 0 ? (
              <div className="space-y-3.5">
                <p className="text-xs sm:text-sm font-bold text-emerald-900">فعاليات مجدولة للغد:</p>
                {tomorrowEvents.map((ev) => (
                  <div key={ev.id} className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-xs">
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                      غداً
                    </span>
                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">{ev.title}</h4>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 line-clamp-1">{ev.description}</p>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 pt-1">
                      {ev.time && <span>{ev.time}</span>}
                      {ev.location && <span>• {ev.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : todayEvents.length > 0 ? (
              <div className="space-y-3.5">
                <p className="text-xs sm:text-sm font-bold text-emerald-900">فعاليات قائمة اليوم:</p>
                {todayEvents.map((ev) => (
                  <div key={ev.id} className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-xs">
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300">
                      اليوم
                    </span>
                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">{ev.title}</h4>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 line-clamp-1">{ev.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-7 lg:p-9 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                <p className="text-xs sm:text-sm lg:text-base text-slate-500">
                  لا توجد فعاليات مجدولة للغد. يمكنكم الاطلاع على التقويم الشهري المكتمل.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 text-left">
            <button
              onClick={() => onNavigate('events')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:underline flex items-center gap-1.5 inline-flex"
            >
              <span>فتح تقويم الفعاليات بالكامل</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. LATEST NEWS & POSTS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-950">آخر أخبار المدرسة والأنشطة</h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-500 mt-1">تغطيات حية للبرامج التعليمية والمسابقات والفعاليات</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPerm('createPosts') && (
              <button
                onClick={() => onOpenCreatePost('news')}
                className="px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl flex items-center gap-2 shadow-sm transition-all border border-emerald-900 cursor-pointer"
              >
                <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>إضافة خبر</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('news')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 px-3.5 sm:px-4 lg:px-5 py-2.5 sm:py-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-xs cursor-pointer transition-colors"
            >
              <span>عرض كل الأخبار</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {latestNews.map((post) => (
            <PostCard key={post.id} post={post} onViewDetails={onSelectPost} />
          ))}
        </div>
      </section>

      {/* 7. UPCOMING EVENTS & HONOR BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
        {/* Upcoming Events (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-300 shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-emerald-950">الفعاليات المدرسية القادمة</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-500">مواعيد المعارض، المهرجانات، والأنشطة</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasPerm('createEvents') && (
                  <button
                    onClick={onOpenAddEvent}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-900 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('events')}
                  className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:underline px-2 cursor-pointer"
                >
                  التقويم الكامل
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-amber-400/80 transition-all flex items-start gap-4 shadow-xs"
                >
                  <div className="bg-emerald-900 text-white rounded-xl p-2.5 sm:p-3 text-center min-w-[54px] sm:min-w-[64px] lg:min-w-[70px] shrink-0 shadow-sm border border-emerald-950">
                    <span className="block text-[10px] sm:text-xs text-emerald-200 font-medium">
                      {formatArabicShortDate(ev.date)}
                    </span>
                    <span className="block text-sm sm:text-base lg:text-lg font-extrabold text-amber-300">
                      {ev.date.split('-')[2] || ''}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 truncate">{ev.title}</h4>
                      <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 shrink-0">
                        {ev.category || 'عام'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 line-clamp-1">{ev.description}</p>

                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 pt-1">
                      {ev.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.time}</span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements Section (5 cols) */}
        <section className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-[#064e3b] to-emerald-900 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-xl border-2 border-amber-400/40 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-white">سجل إنجازات وتفوق المدرسة</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-amber-200/90 font-medium">التكريم والشهادات والمراكز</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasPerm('createAchievements') && (
                  <button
                    onClick={onOpenAddAchievement}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('achievements')}
                  className="text-xs sm:text-sm lg:text-base font-bold text-amber-300 hover:text-amber-200 hover:underline px-2 cursor-pointer"
                >
                  المزيد
                </button>
              </div>
            </div>

            {latestAchievements.length > 0 ? (
              <div className="space-y-3.5">
                {latestAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="p-4 sm:p-5 lg:p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 hover:bg-white/15 hover:border-amber-400/50 transition-all cursor-pointer space-y-1.5"
                  >
                    <span className="text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-950/70 px-2.5 py-0.5 rounded-md border border-amber-400/40">
                      {ach.category || 'إنجاز متميز'}
                    </span>
                    <h4 className="text-xs sm:text-sm lg:text-base font-bold text-white">
                      {ach.title}
                    </h4>
                    <p className="text-xs sm:text-sm lg:text-base text-emerald-100/80 line-clamp-1">{ach.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-7 lg:p-9 bg-white/10 rounded-2xl border border-dashed border-amber-400/40 text-center space-y-3">
                <p className="text-xs sm:text-sm lg:text-base text-emerald-100">
                  يمكن توثيق إنجازات وجوائز الطالبات والمعلمات وإضافتها إلى هذا السجل.
                </p>
                {hasPerm('createAchievements') && (
                  <button
                    onClick={onOpenAddAchievement}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm lg:text-base font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md border border-amber-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة إنجاز أو شهادة تكريم</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/15 text-center">
            <p className="text-xs sm:text-sm lg:text-base text-amber-200/90 font-medium">
              فخورون بإنجازات طالباتنا ومعلماتنا المبدعات
            </p>
          </div>
        </section>
      </div>

      {/* 8. GALLERY & ALBUMS PREVIEW */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-300 shrink-0 shadow-xs">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-950">معرض المدرسة الفوتوغرافي والألبومات</h2>
              <p className="text-xs sm:text-sm lg:text-base text-slate-500 mt-1">توثيق مرئي لفعاليات وأنشطة وفصول مدرسة صفية بنت عمر</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {hasPerm('createPhotos') && (
              <button
                onClick={onOpenAddPhoto}
                className="px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-emerald-900 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>رفع صورة</span>
              </button>
            )}
            {hasPerm('createAlbums') && (
              <button
                onClick={onOpenCreateAlbum}
                className="px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm lg:text-base font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-amber-400 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>إنشاء ألبوم</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('gallery')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-800 hover:underline px-2.5 cursor-pointer"
            >
              عرض كل المعرض
            </button>
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {photos.slice(0, 4).map((pic) => (
              <div
                key={pic.id}
                onClick={() => onNavigate('gallery')}
                className="group relative h-48 sm:h-56 lg:h-64 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer"
              >
                <img
                  src={pic.imageUrl}
                  alt={pic.title || 'صورة مدرسية'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent p-3.5 sm:p-4 lg:p-5 flex flex-col justify-end text-white">
                  {pic.albumName && (
                    <span className="text-[10px] sm:text-xs text-amber-300 font-bold mb-0.5">{pic.albumName}</span>
                  )}
                  <h4 className="text-xs sm:text-sm lg:text-base font-bold truncate">{pic.title || 'صورة من فعاليات المدرسة'}</h4>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs sm:text-sm lg:text-base">
            لم يتم رفع صور بالمعرض بعد. اضغطي على زر "رفع صورة" لإضافة صور للمنصة.
          </div>
        )}
      </section>

      {/* 9. SCHOOL STATISTICS */}
      <section className="bg-gradient-to-r from-emerald-950 via-[#064e3b] to-emerald-950 rounded-3xl p-8 sm:p-10 lg:p-12 text-white shadow-xl border-2 border-amber-400/40 space-y-8 sm:space-y-10">
        <div className={`flex flex-col ${canManageStats ? 'sm:flex-row items-center justify-between' : 'items-center text-center'} gap-4`}>
          <div className={`${canManageStats ? 'text-center sm:text-right' : 'text-center max-w-xl mx-auto'} space-y-2`}>
            <span className="text-amber-300 text-xs sm:text-sm font-bold uppercase tracking-wider block">
              أرقام وإحصائيات مباشرة
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">إحصائيات مدرسة صفية بنت عمر</h2>
            {!canManageStats && (
              <p className="text-xs sm:text-sm text-emerald-200/80 font-normal">
                مؤشرات وإحصاءات دقيقة ومحدثة تلقائياً تعكس واقع العمل والتميز المدرسي
              </p>
            )}
          </div>

          {canManageStats && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => onNavigate('admin_dashboard')}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md border border-amber-300 transition-all hover:scale-105 cursor-pointer"
                title="إدارة وتحديث إحصائيات المنصة (خاص بالأدمن ومالك النظام)"
              >
                <Plus className="w-4 h-4 text-emerald-950" />
                <span>+ إضافة</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-7 lg:p-8 rounded-2xl bg-white/10 border border-white/15 text-center flex flex-col items-center justify-center space-y-2.5 hover:bg-white/15 hover:border-amber-400/40 transition-all shadow-sm"
              >
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center mb-1">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                </div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-amber-300 font-serif">
                  {item.number}
                </span>
                <span className="text-xs sm:text-sm lg:text-base font-bold text-white">{item.label}</span>
                <span className="text-[11px] sm:text-xs text-emerald-200/80 font-medium">{item.sub}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. FOOTER & CONTACT */}
      <footer className="bg-emerald-950 rounded-3xl p-8 sm:p-10 lg:p-12 border-2 border-amber-400/40 text-emerald-100 text-xs sm:text-sm lg:text-base space-y-8 mt-12 sm:mt-16 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg lg:text-xl">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              <span>مدرسة صفية بنت عمر</span>
            </div>
            <p className="text-emerald-100/90 leading-relaxed text-xs sm:text-sm lg:text-base">
              صرح تعليمي وتربوي رائد يهدف إلى تقديم بيئة محفزة تصنع المعرفة وتوثق الإنجاز.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-amber-300 font-bold text-sm sm:text-base lg:text-lg">أقسام المنصة</h4>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm lg:text-base">
              <button onClick={() => onNavigate('announcements')} className="text-right hover:text-amber-300 transition-colors cursor-pointer">الإعلانات</button>
              <button onClick={() => onNavigate('news')} className="text-right hover:text-amber-300 transition-colors cursor-pointer">الأخبار والمنشورات</button>
              <button onClick={() => onNavigate('today')} className="text-right hover:text-amber-300 transition-colors cursor-pointer">ماذا حدث اليوم؟</button>
              <button onClick={() => onNavigate('events')} className="text-right hover:text-amber-300 transition-colors cursor-pointer">الفعاليات</button>
              <button onClick={() => onNavigate('achievements')} className="text-right hover:text-amber-300 transition-colors cursor-pointer">الإنجازات</button>
              <button onClick={() => onNavigate('gallery')} className="text-right hover:text-amber-300 transition-colors cursor-pointer">معرض الصور</button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-amber-300 font-bold text-sm sm:text-base lg:text-lg">الاعتماد والجودة</h4>
            <p className="text-emerald-100/90 text-xs sm:text-sm lg:text-base leading-relaxed">
              جميع الحقوق محفوظة © {new Date().getFullYear()} مدرسة صفية بنت عمر. المنصة المدرسية الرقمية المعتمدة.
            </p>
          </div>
        </div>
      </footer>

      {/* OFFICIAL EDUCATION PLATFORMS MODAL */}
      {showPlatformsModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowPlatformsModal(false)}
          dir="rtl"
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-300 flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                    وزارة التعليم بالمملكة
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-emerald-950">
                    المنصات التعليمية الرسمية
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPlatformsModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="إغلاق"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              روابط البوابات الإلكترونية الرسمية المعتمدة لمنظومة التعليم. اختر المنصة للانتقال المباشر إليها بأمان في تبويب جديد:
            </p>

            {/* Platforms List */}
            <div className="space-y-3">
              {officialPlatforms.map((plat) => (
                <a
                  key={plat.name}
                  href={plat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-950 transition-colors">
                        {plat.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {plat.domain}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {plat.description}
                    </p>
                  </div>

                  <div className="mr-3 w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:bg-emerald-800 text-slate-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-xs">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </a>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                تفتح جميع الروابط مباشرة في تبويب جديد
              </span>
              <button
                type="button"
                onClick={() => setShowPlatformsModal(false)}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border border-emerald-900"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
