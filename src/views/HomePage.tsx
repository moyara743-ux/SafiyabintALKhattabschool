import React from 'react';
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
  const { user, profile, hasPerm } = useAuth();

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

  // Quick Portals
  const quickPortals = [
    {
      title: 'بوابة الطالبات',
      subtitle: 'الأنشطة والمسابقات وسجل الشرف',
      icon: GraduationCap,
      action: () => onNavigate('achievements'),
      tag: 'إنجازات ومسابقات',
      accent: 'hover:border-emerald-500 hover:bg-emerald-900/30',
    },
    {
      title: 'بوابة المعلمات والإدارة',
      subtitle: 'لوحة التحكم والتوثيق اليومي',
      icon: Laptop,
      action: () => (user ? onNavigate('admin_dashboard') : onOpenAuth()),
      tag: user ? 'لوحة التحكم' : 'تسجيل الدخول',
      accent: 'hover:border-teal-500 hover:bg-teal-900/30',
    },
    {
      title: 'الإعلانات والتعاميم',
      subtitle: 'التنبيهات المهمة ومواعيد الاختبارات',
      icon: Bell,
      action: () => onNavigate('announcements'),
      tag: 'إعلانات رسمية',
      accent: 'hover:border-rose-500 hover:bg-rose-900/30',
    },
    {
      title: 'المنصات التعليمية الرسمية',
      subtitle: 'منصة مدرستي، نظام نور، وعين',
      icon: ExternalLink,
      action: () => window.open('https://schools.madrasati.sa', '_blank'),
      tag: 'خدمات وزارية',
      accent: 'hover:border-blue-500 hover:bg-blue-900/30',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20 pb-20" dir="rtl">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-950 via-teal-950 to-slate-900 text-white shadow-2xl border border-emerald-800/40">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#34d399_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            {/* Dynamic Date & Official Identity Badge */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-bold shadow-inner">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>المنصة الرسمية المعتمدة</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs sm:text-sm font-medium">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>{todayArabic}</span>
              </span>
            </div>

            <div className="space-y-3.5 pt-2">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight sm:leading-snug lg:leading-normal text-white">
                مدرسة صفية بنت عمر <br />
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                  نصنع المعرفة... ونوثق الإنجاز
                </span>
              </h1>

              <p className="text-emerald-100/90 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl font-light pt-1">
                مرحباً بكم في البوابة الرقمية الرسمية لمدرسة صفية بنت عمر. صرح تربوي وتعليمي رائد
                يجمع بين التميز الأكاديمي، وتنمية المهارات القيادية، ورعاية الموهوبات، وتوثيق يوميات
                المدرسة أولاً بأول.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 pt-3">
              <button
                onClick={() => onNavigate('news')}
                className="px-4.5 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
              >
                <span>استكشاف الأخبار والأنشطة</span>
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>

              <button
                onClick={() => onNavigate('today')}
                className="px-4.5 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl border border-slate-700 transition-all flex items-center gap-2"
              >
                <Sun className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300" />
                <span>ماذا حدث اليوم بالمدرسة؟</span>
              </button>

              <button
                onClick={() => onNavigate('events')}
                className="px-4 sm:px-5 py-2.5 sm:py-3 text-emerald-200 hover:text-white text-xs sm:text-sm lg:text-base font-bold transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />
                <span>جدول الفعاليات</span>
                <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>

          {/* School Card Preview */}
          <div className="lg:col-span-4 hidden lg:flex justify-center">
            <div className="w-80 lg:w-84 rounded-3xl bg-emerald-950/70 p-6 lg:p-7 border border-emerald-500/30 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between text-xs sm:text-sm text-emerald-200">
                <span className="font-bold flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                  بيئة تعليمية محفزة
                </span>
                <span className="bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-400/20">
                  نشط ومتميز
                </span>
              </div>

              <div className="text-center py-6 px-4 bg-slate-900/60 rounded-2xl border border-white/10 space-y-2">
                <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
                  <GraduationCap className="w-8 h-8 text-emerald-950" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">مدرسة صفية بنت عمر</h3>
                <p className="text-xs sm:text-sm text-emerald-300 font-medium">تعليم متميز وقيم أصيلة</p>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-2xl text-xs sm:text-sm space-y-2.5 border border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-300">
                  <span>تاريخ اليوم:</span>
                  <span className="font-bold text-emerald-300">{formatArabicShortDate(new Date())}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>فعاليات اليوم:</span>
                  <span className="font-bold text-amber-300">مجدولة ومتاحة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IMPORTANT ANNOUNCEMENTS TICKER / BANNER */}
      {displayAnnouncements.length > 0 && (
        <section className="bg-rose-950/40 border border-rose-800/60 rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-7 text-rose-200 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-rose-600/30 text-rose-400 border border-rose-500/30 shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
              </span>
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs lg:text-sm font-extrabold uppercase tracking-wider text-rose-400 block">
                  إعلانات وتنبيهات المدرسة
                </span>
                <p className="text-sm sm:text-base lg:text-lg font-bold text-white">
                  {displayAnnouncements[0].title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => onNavigate('announcements')}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-rose-600/30 hover:bg-rose-600/50 text-white rounded-xl text-xs sm:text-sm lg:text-base font-bold transition-all border border-rose-500/40"
              >
                عرض كل الإعلانات
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. DAILY MESSAGE (الرسالة اليومية للمدرسة) */}
      <section className="bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-slate-900 border border-orange-500/30 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-lg relative space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-orange-400 block">الرسالة اليومية</span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-white mt-0.5">
                إشراقة اليوم في صفية بنت عمر
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {dailyMessage && hasPerm('editDailyMessage') && (
              <button
                onClick={onOpenDailyMessageModal}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-orange-600/30 hover:bg-orange-600/50 text-orange-200 border border-orange-500/30 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>تعديل رسالة اليوم</span>
              </button>
            )}
            {!dailyMessage && hasPerm('createDailyMessage') && (
              <button
                onClick={onOpenDailyMessageModal}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-xl text-xs sm:text-sm lg:text-base font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>إضافة رسالة اليوم</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('daily_message')}
              className="text-xs sm:text-sm lg:text-base font-bold text-orange-300 hover:underline px-2.5"
            >
              أرشيف الرسائل
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 sm:p-6 lg:p-8 rounded-2xl border border-white/5 mt-4">
          {dailyMessage ? (
            <div className="space-y-3.5">
              <p className="text-sm sm:text-base lg:text-lg text-slate-200 leading-relaxed font-medium">
                "{dailyMessage.content}"
              </p>
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 pt-3.5 border-t border-slate-800">
                <span>كتبت بواسطة: {dailyMessage.authorName}</span>
                <span>تاريخ: {dailyMessage.date}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 italic">
              "العلم نورٌ يبني العقول، والأخلاق تاجٌ يزيّن النفوس. نتمنى لطالباتنا ومعلماتنا يوماً مليئاً بالإنجاز والعطاء."
            </p>
          )}
        </div>
      </section>

      {/* 4. QUICK ACCESS PORTALS */}
      <section className="space-y-5 lg:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">بوابات وخدمات الوصول السريع</h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-400 mt-1">روابط مباشرة مخصصة للطالبات، المعلمات، وأولياء الأمور</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {quickPortals.map((portal, idx) => {
            const Icon = portal.icon;
            return (
              <div
                key={idx}
                onClick={portal.action}
                className={`bg-slate-900 p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-slate-800 shadow-md cursor-pointer transition-all flex flex-col justify-between group min-h-[200px] lg:min-h-[230px] ${portal.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 lg:w-13 lg:h-13 rounded-xl lg:rounded-2xl bg-slate-800 text-emerald-400 group-hover:bg-emerald-600/30 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md group-hover:text-emerald-300 transition-colors">
                      {portal.tag}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg lg:text-xl font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {portal.subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm lg:text-base text-emerald-400 font-bold">
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
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                  <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-amber-400 block">توثيق مباشر</span>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-white">ماذا حدث اليوم في المدرسة؟</h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasPerm('createPosts') && (
                  <button
                    onClick={() => onOpenCreatePost('today_summary')}
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>توثيق اليوم</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('today')}
                  className="text-xs sm:text-sm lg:text-base font-bold text-amber-400 hover:underline px-2.5"
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
                    className="p-4 sm:p-5 lg:p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 hover:border-amber-500/40 transition-all cursor-pointer group space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400">
                      <span className="text-amber-400 font-bold">{post.category}</span>
                      <span>{post.date}</span>
                    </div>
                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-300 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-7 lg:p-9 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-center space-y-3">
                <p className="text-xs sm:text-sm lg:text-base text-slate-400">
                  لم يتم توثيق ملخص اليوم بعد. ترقبوا التحديثات الصباحية اليومية من معلمات المدرسة.
                </p>
                {hasPerm('createPosts') && (
                  <button
                    onClick={() => onOpenCreatePost('today_summary')}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm lg:text-base rounded-xl inline-flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>إضافة ملخص اليوم الأول</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-left">
            <button
              onClick={() => onNavigate('today')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-400 hover:underline flex items-center gap-1.5 inline-flex"
            >
              <span>مشاهدة تقارير يومنا بالمدرسة كاملة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tomorrow's Agenda & Today's Events (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-950/80 to-slate-900 border border-teal-800/50 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-teal-400 block">جدول الأنشطة</span>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-white">ماذا سيحدث غداً؟</h3>
                </div>
              </div>

              {hasPerm('createEvents') && (
                <button
                  onClick={onOpenAddEvent}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/30 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة فعالية</span>
                </button>
              )}
            </div>

            {tomorrowEvents.length > 0 ? (
              <div className="space-y-3.5">
                <p className="text-xs sm:text-sm font-bold text-teal-300">فعاليات مجدولة للغد:</p>
                {tomorrowEvents.map((ev) => (
                  <div key={ev.id} className="p-4 sm:p-5 bg-slate-900/80 rounded-2xl border border-teal-500/30 space-y-1.5">
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                      غداً
                    </span>
                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-white">{ev.title}</h4>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-300 line-clamp-1">{ev.description}</p>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-400 pt-1">
                      {ev.time && <span>{ev.time}</span>}
                      {ev.location && <span>• {ev.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : todayEvents.length > 0 ? (
              <div className="space-y-3.5">
                <p className="text-xs sm:text-sm font-bold text-emerald-300">فعاليات قائمة اليوم:</p>
                {todayEvents.map((ev) => (
                  <div key={ev.id} className="p-4 sm:p-5 bg-slate-900/80 rounded-2xl border border-emerald-500/30 space-y-1.5">
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      اليوم
                    </span>
                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-white">{ev.title}</h4>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-300 line-clamp-1">{ev.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-7 lg:p-9 bg-slate-900/50 rounded-2xl border border-dashed border-teal-500/20 text-center space-y-2">
                <p className="text-xs sm:text-sm lg:text-base text-slate-400">
                  لا توجد فعاليات مجدولة للغد. يمكنكم الاطلاع على التقويم الشهري المكتمل.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-left">
            <button
              onClick={() => onNavigate('events')}
              className="text-xs sm:text-sm lg:text-base font-bold text-teal-400 hover:underline flex items-center gap-1.5 inline-flex"
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
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">آخر أخبار المدرسة والأنشطة</h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-400 mt-1">تغطيات حية للبرامج التعليمية والمسابقات والفعاليات</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPerm('createPosts') && (
              <button
                onClick={() => onOpenCreatePost('news')}
                className="px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>إضافة خبر</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('news')}
              className="text-xs sm:text-sm lg:text-base font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3.5 sm:px-4 lg:px-5 py-2.5 sm:py-3 bg-slate-800 rounded-xl border border-slate-700"
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
        <section className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-md flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-white">الفعاليات المدرسية القادمة</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-400">مواعيد المعارض، المهرجانات، والأنشطة</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasPerm('createEvents') && (
                  <button
                    onClick={onOpenAddEvent}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/30 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('events')}
                  className="text-xs sm:text-sm lg:text-base font-bold text-teal-400 hover:underline px-2"
                >
                  التقويم الكامل
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-800 bg-slate-800/50 hover:border-teal-500/40 transition-all flex items-start gap-4"
                >
                  <div className="bg-teal-800 text-white rounded-xl p-2.5 sm:p-3 text-center min-w-[54px] sm:min-w-[64px] lg:min-w-[70px] shrink-0 shadow-sm">
                    <span className="block text-[10px] sm:text-xs text-teal-200 font-medium">
                      {formatArabicShortDate(ev.date)}
                    </span>
                    <span className="block text-sm sm:text-base lg:text-lg font-extrabold">
                      {ev.date.split('-')[2] || ''}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm lg:text-base font-bold text-white truncate">{ev.title}</h4>
                      <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 shrink-0">
                        {ev.category || 'عام'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm lg:text-base text-slate-400 line-clamp-1">{ev.description}</p>

                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 pt-1">
                      {ev.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{ev.time}</span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
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
        <section className="lg:col-span-5 bg-gradient-to-br from-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-xl border border-purple-800/40 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-white">سجل إنجازات وتفوق المدرسة</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-purple-200">التكريم والشهادات والمراكز</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasPerm('createAchievements') && (
                  <button
                    onClick={onOpenAddAchievement}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/30 text-amber-300 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('achievements')}
                  className="text-xs sm:text-sm lg:text-base font-bold text-amber-300 hover:underline px-2"
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
                    className="p-4 sm:p-5 lg:p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer space-y-1.5"
                  >
                    <span className="text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                      {ach.category || 'إنجاز متميز'}
                    </span>
                    <h4 className="text-xs sm:text-sm lg:text-base font-bold text-white">
                      {ach.title}
                    </h4>
                    <p className="text-xs sm:text-sm lg:text-base text-purple-200/80 line-clamp-1">{ach.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-7 lg:p-9 bg-white/5 rounded-2xl border border-dashed border-purple-400/30 text-center space-y-3">
                <p className="text-xs sm:text-sm lg:text-base text-purple-200">
                  يمكن توثيق إنجازات وجوائز الطالبات والمعلمات وإضافتها إلى هذا السجل.
                </p>
                {hasPerm('createAchievements') && (
                  <button
                    onClick={onOpenAddAchievement}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm lg:text-base font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة إنجاز أو شهادة تكريم</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-xs sm:text-sm lg:text-base text-purple-200 font-light">
              فخورون بإنجازات طالباتنا ومعلماتنا المبدعات
            </p>
          </div>
        </section>
      </div>

      {/* 8. GALLERY & ALBUMS PREVIEW */}
      <section className="bg-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-md space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">معرض المدرسة الفوتوغرافي والألبومات</h2>
              <p className="text-xs sm:text-sm lg:text-base text-slate-400 mt-1">توثيق مرئي لفعاليات وأنشطة وفصول مدرسة صفية بنت عمر</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {hasPerm('createPhotos') && (
              <button
                onClick={onOpenAddPhoto}
                className="px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>رفع صورة</span>
              </button>
            )}
            {hasPerm('createAlbums') && (
              <button
                onClick={onOpenCreateAlbum}
                className="px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>إنشاء ألبوم</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('gallery')}
              className="text-xs sm:text-sm lg:text-base font-bold text-blue-400 hover:underline px-2.5"
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
                className="group relative h-48 sm:h-56 lg:h-64 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm border border-slate-700 cursor-pointer"
              >
                <img
                  src={pic.imageUrl}
                  alt={pic.title || 'صورة مدرسية'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent p-3.5 sm:p-4 lg:p-5 flex flex-col justify-end text-white">
                  {pic.albumName && (
                    <span className="text-[10px] sm:text-xs text-amber-300 font-bold mb-0.5">{pic.albumName}</span>
                  )}
                  <h4 className="text-xs sm:text-sm lg:text-base font-bold truncate">{pic.title || 'صورة من فعاليات المدرسة'}</h4>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-xs sm:text-sm lg:text-base">
            لم يتم رفع صور بالمعرض بعد. اضغطي على زر "رفع صورة" لإضافة صور للمنصة.
          </div>
        )}
      </section>

      {/* 9. SCHOOL STATISTICS */}
      <section className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-8 sm:p-10 lg:p-12 text-white shadow-xl border border-emerald-800/40 space-y-8 sm:space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-amber-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
            أرقام وإحصائيات مباشرة
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">إحصائيات مدرسة صفية بنت عمر</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-7 lg:p-8 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center space-y-2.5 hover:bg-white/10 transition-all shadow-sm"
              >
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-white/10 flex items-center justify-center mb-1">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                </div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-serif">
                  {item.number}
                </span>
                <span className="text-xs sm:text-sm lg:text-base font-bold text-emerald-300">{item.label}</span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-light">{item.sub}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. FOOTER & CONTACT */}
      <footer className="bg-slate-900 rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-800 text-slate-400 text-xs sm:text-sm lg:text-base space-y-8 mt-12 sm:mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg lg:text-xl">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              <span>مدرسة صفية بنت عمر</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs sm:text-sm lg:text-base">
              صرح تعليمي وتربوي رائد يهدف إلى تقديم بيئة محفزة تصنع المعرفة وتوثق الإنجاز.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm sm:text-base lg:text-lg">أقسام المنصة</h4>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm lg:text-base">
              <button onClick={() => onNavigate('announcements')} className="text-right hover:text-emerald-400 transition-colors">الإعلانات</button>
              <button onClick={() => onNavigate('news')} className="text-right hover:text-emerald-400 transition-colors">الأخبار والمنشورات</button>
              <button onClick={() => onNavigate('today')} className="text-right hover:text-emerald-400 transition-colors">ماذا حدث اليوم؟</button>
              <button onClick={() => onNavigate('events')} className="text-right hover:text-emerald-400 transition-colors">الفعاليات</button>
              <button onClick={() => onNavigate('achievements')} className="text-right hover:text-emerald-400 transition-colors">الإنجازات</button>
              <button onClick={() => onNavigate('gallery')} className="text-right hover:text-emerald-400 transition-colors">معرض الصور</button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm sm:text-base lg:text-lg">الاعتماد والجودة</h4>
            <p className="text-xs sm:text-sm lg:text-base text-slate-400 leading-relaxed">
              جميع الحقوق محفوظة © {new Date().getFullYear()} مدرسة صفية بنت عمر. المنصة المدرسية الرقمية المعتمدة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
