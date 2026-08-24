import React, { useState } from 'react';
import { Post, SchoolEvent, GalleryPhoto, PageView, PostType } from '../types';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
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
  Trophy,
  ExternalLink,
  Phone,
  MessageCircle,
  Layers,
  ChevronDown,
  PlusCircle,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface HomePageProps {
  posts: Post[];
  events: SchoolEvent[];
  gallery: GalleryPhoto[];
  onNavigate: (view: PageView) => void;
  onSelectPost: (p: Post) => void;
  onOpenAuth: () => void;
  onOpenNewPostModal?: (defaultType?: PostType) => void;
  onOpenAddEvent?: () => void;
  onOpenAddPhoto?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  posts,
  events,
  gallery,
  onNavigate,
  onSelectPost,
  onOpenAuth,
  onOpenNewPostModal,
  onOpenAddEvent,
  onOpenAddPhoto,
}) => {
  const { user, profile, isOwner, canPublish } = useAuth();

  // Filtered Highlights
  const pinnedPost = posts.find((p) => p.isPinned && p.status === 'published');
  const latestNews = posts.filter((p) => p.status === 'published').slice(0, 3);
  const todaySummaries = posts.filter((p) => p.type === 'today_summary' && p.status === 'published').slice(0, 2);
  const upcomingEvents = events.filter((e) => e.status === 'upcoming').slice(0, 3);
  const achievements = posts.filter((p) => (p.type === 'achievement' || p.category === 'الإنجازات والجوائز') && p.status === 'published').slice(0, 3);

  // Statistics data
  const stats = [
    { number: '+650', label: 'طالبة متميزة', sub: 'في بيئة تعليمية محفزة', icon: Users, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { number: '+45', label: 'معلمة وإدارية', sub: 'كفاءات وخبرات متخصصة', icon: GraduationCap, color: 'text-teal-700 bg-teal-50 border-teal-200' },
    { number: '+35', label: 'نشاط وبرنامج إثرائي', sub: 'رعاية المواهب والابتكار', icon: Lightbulb, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { number: '100%', label: 'انضباط وبيئة آمنة', sub: 'متابعة ورعاية شاملة', icon: Shield, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  ];

  // School Distinct Features & Services
  const features = [
    {
      icon: Laptop,
      title: 'الفصول التفاعلية الذكية',
      desc: 'بيئة رقمية مجهزة بأحدث الشاشات والتقنيات لدعم استراتيجيات التعلم النشط وتنمية التفكير.',
      color: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
    },
    {
      icon: Lightbulb,
      title: 'رعاية الموهوبات والابتكار',
      desc: 'برامج إثرائية متخصصة، نوادي الروبوت والذكاء الاصطناعي، ومسابقات التفكير الإبداعي والبحث العلمي.',
      color: 'bg-amber-500/10 text-amber-800 border-amber-200',
    },
    {
      icon: HeartHandshake,
      title: 'الإرشاد الطلابي والدعم النفسي',
      desc: 'متابعة تربوية وأكاديمية متكاملة لتعزيز الانضباط، الصحة النفسية، وتطوير المهارات القيادية والشخصية.',
      color: 'bg-teal-500/10 text-teal-800 border-teal-200',
    },
    {
      icon: Compass,
      title: 'الأنشطة اللاصفية والرياضية',
      desc: 'معارض فنية، بطولات رياضية مدرسية، فعاليات بيئية، ومشاريع تطوعية تغرس روح المسؤولية والمبادرة.',
      color: 'bg-blue-500/10 text-blue-800 border-blue-200',
    },
    {
      icon: Sun,
      title: 'التوثيق اليومي الشامل',
      desc: 'تغطية إعلامية حية للطابور الصباحي، الحصص النموذجية، والزيارات الميدانية عبر منصة المدرسة الرقمية.',
      color: 'bg-orange-500/10 text-orange-800 border-orange-200',
    },
  ];

  // Quick Access Portals
  const quickPortals = [
    {
      title: 'بوابة الطالبات',
      subtitle: 'الأنشطة والمسابقات وسجل الشرف',
      icon: GraduationCap,
      action: () => onNavigate('achievements'),
      tag: 'إنجازات ومسابقات',
      accent: 'hover:border-emerald-400 hover:bg-emerald-50/50',
    },
    {
      title: 'بوابة المعلمات',
      subtitle: 'لوحة التحكم ونشر التقارير واليوميات',
      icon: Laptop,
      action: () => (user ? onNavigate('admin_dashboard') : onOpenAuth()),
      tag: user ? 'لوحة الإدارة' : 'تسجيل الدخول',
      accent: 'hover:border-teal-400 hover:bg-teal-50/50',
    },
    {
      title: 'أولياء الأمور',
      subtitle: 'التواصل والاستفسارات ومتابعة الفعاليات',
      icon: Users,
      action: () => onNavigate('contact'),
      tag: 'تواصل فوري',
      accent: 'hover:border-amber-400 hover:bg-amber-50/50',
    },
    {
      title: 'المنصات التعليمية الرسمية',
      subtitle: 'منصة مدرستي، نظام نور، وعين',
      icon: ExternalLink,
      action: () => window.open('https://schools.madrasati.sa', '_blank'),
      tag: 'خدمات وزارية',
      accent: 'hover:border-indigo-400 hover:bg-indigo-50/50',
    },
  ];

  return (
    <div className="space-y-16 pb-20" dir="rtl">
      {/* 1. HERO SECTION */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-950 via-teal-900 to-slate-900 text-white shadow-2xl border border-emerald-800/40"
      >
        {/* Subtle patterned overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#34d399_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        
        {/* Soft Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>المنصة الرسمية المعتمدة | مدرسة صفية بنت عمر</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold font-serif tracking-tight leading-tight sm:leading-tight text-white">
              نصنع المعرفة... <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                ونـوثـق الإنجــاز
              </span>
            </h1>

            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
              مرحباً بكم في الصرح التعليمي والتربوي لـ <strong className="font-bold text-white">مدرسة صفية بنت عمر</strong>. منصة رقمية متكاملة لتوثيق الفعاليات والأنشطة المدرسية، إبراز تفوق الطالبات، ورعاية الإبداع في بيئة تعليمية آمنة ومحفزة.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => onNavigate('news')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-transform hover:scale-102 flex items-center gap-2"
              >
                <span>استكشاف الأخبار والأنشطة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('today')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <Sun className="w-4 h-4 text-amber-300" />
                <span>ماذا حدث اليوم بالمدرسة؟</span>
              </button>

              <button
                onClick={() => onNavigate('about')}
                className="px-5 py-3 text-emerald-200 hover:text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-1"
              >
                <span>عن المدرسة</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 hidden lg:flex justify-center">
            <div className="relative w-72 rounded-3xl bg-emerald-900/60 p-5 border border-emerald-500/30 shadow-2xl backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-xs text-emerald-200">
                <span className="font-bold flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                  العام الدراسي 1447هـ
                </span>
                <span className="bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-400/20">
                  نشط ومتميز
                </span>
              </div>

              <div className="text-center py-4 px-2 bg-slate-900/40 rounded-2xl border border-white/10">
                <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                  <GraduationCap className="w-8 h-8 text-emerald-950" />
                </div>
                <h3 className="text-base font-extrabold text-white">مدرسة صفية بنت عمر</h3>
                <p className="text-xs text-emerald-300 font-medium mt-0.5">تعليم متميز، وقيم أصيلة</p>
              </div>

              <div className="p-3 bg-emerald-950/70 rounded-2xl text-xs space-y-1.5 border border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-300 text-[11px]">
                  <span>البيئة المدرسية:</span>
                  <span className="font-bold text-emerald-300">محفزة وآمنة</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 text-[11px]">
                  <span>رعاية المواهب:</span>
                  <span className="font-bold text-amber-300">مسارات إثرائية</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* QUICK ADD & CONTENT BAR (شريط الإضافة السريعة لمحتوى الموقع) */}
      <section className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-4 sm:p-5 rounded-3xl text-white shadow-lg border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-right">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">إضافة وتوثيق محتوى المنصة</h3>
              <p className="text-xs text-emerald-200">أضف خبراً، صورة لمعرض المدرسة، فعالية جديدة، أو تكريماً للطالبات</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => onOpenNewPostModal?.('news')}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>خبر جديد</span>
            </button>
            <button
              onClick={() => onOpenAddPhoto?.()}
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>رفع صورة</span>
            </button>
            <button
              onClick={() => onOpenAddEvent?.()}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>إضافة فعالية</span>
            </button>
            <button
              onClick={() => onOpenNewPostModal?.('achievement')}
              className="px-3.5 py-2 bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Award className="w-3.5 h-3.5" />
              <span>إضافة إنجاز</span>
            </button>
            <button
              onClick={() => onOpenNewPostModal?.('today_summary')}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>يوميات اليوم</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. QUICK ACCESS PORTALS (روابط وبوابات سريعة) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">بوابات وخدمات الوصول السريع</h2>
            <p className="text-xs text-slate-500">روابط مباشرة مخصصة للطالبات، المعلمات، وأولياء الأمور</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickPortals.map((portal, idx) => {
            const Icon = portal.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -3 }}
                onClick={portal.action}
                className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer transition-all flex flex-col justify-between group ${portal.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-emerald-800 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-white group-hover:text-emerald-800 transition-colors">
                      {portal.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {portal.subtitle}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold group-hover:text-emerald-800">
                  <span>الدخول للبوابة</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. ABOUT SCHOOL BRIEF (نبذة موجزة عن المدرسة) */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
      >
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            <span>عن مدرسة صفية بنت عمر</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900">
            بيئة تربوية تصنع المستقبل وترعى الإبداع
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            تعد مدرسة صفية بنت عمر صرحاً تعليمياً متميزاً يسعى لتقديم تعليم رائد يجمع بين التميز الأكاديمي وغرس القيم النبيلة. نحرص على توفير بيئة تعليمية داعمة ومجهزة بأحدث الوسائل، وتشجيع الطالبات على التفكير الناقد والابتكار لتحقيق طموحاتهن والمساهمة الفاعلة في بناء المجتمع.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-emerald-800 block mb-1">الرؤية التعليمية</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">الريادة في صناعة المعرفة وبناء جيل متفوق ومبتكر.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-amber-800 block mb-1">الرسالة التربوية</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">تقديم تعليم عالي الجودة وتنمية المهارات المستقبلية والوجدانية.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-teal-800 block mb-1">القيم الجوهرية</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">الأمانة، الإتقان، التعاون، ورعاية المواهب الطلابية.</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('about')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <span>المزيد عن المدرسة والرؤية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 to-teal-950 p-6 sm:p-8 rounded-3xl text-white space-y-4 shadow-lg border border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">الاعتماد والجودة المدرسية</h3>
              <p className="text-xs text-emerald-200">معايير أداء وتربية متميزة</p>
            </div>
          </div>

          <p className="text-xs text-emerald-100/90 leading-relaxed">
            نطبق أعلى المعايير في الإشراف والمتابعة الأكاديمية والتربوية لضمان سلامة وراحة بناتنا الطالبات مع برامج إثرائية متواصلة.
          </p>

          <ul className="space-y-2 text-xs text-emerald-200 pt-2 border-t border-emerald-800">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>متابعة أكاديمية وسلوكية مستمرة</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>تجهيزات مدرسية ومختبرات علمية متطورة</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>تواصل مستمر مع الأسرة والمجتمع</span>
            </li>
          </ul>
        </div>
      </motion.section>

      {/* 4. SCHOOL SERVICES & DISTINCTIONS (أهم الخدمات والمميزات) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
            مميزاتنا وخدماتنا
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900">
            ما يميز تجربة التعلم في صفية بنت عمر
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            نقدم منظومة شاملة من الخدمات التعليمية والأنشطة الإثرائية التي تصقل شخصية الطالبة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${feat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <span>خدمة معتمدة</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 5. SCHOOL STATISTICS (إحصائيات وأرقام المدرسة) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl"
      >
        <div className="text-center max-w-xl mx-auto mb-8 space-y-1.5">
          <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
            أرقام وإنجازات تعكس جودة التعليم
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-serif">
            إحصائيات مدرسة صفية بنت عمر
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center flex flex-col items-center justify-center space-y-2 hover:bg-white/15 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-1">
                  <Icon className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-2xl sm:text-4xl font-extrabold text-white font-serif">
                  {item.number}
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-200">
                  {item.label}
                </span>
                <span className="text-[11px] text-slate-300 font-light">
                  {item.sub}
                </span>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* 6. "WHAT HAPPENED TODAY?" SPOTLIGHT (ماذا حدث اليوم؟) */}
      <section className="bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-emerald-50/40 rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
              <Sun className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">يومنا في مدرسة صفية بنت عمر (ماذا حدث اليوم؟)</h2>
              <p className="text-xs text-slate-500">ملخص حي وتغطية مباشرة لأبرز فعاليات وأنشطة اليوم الدراسي</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => onOpenNewPostModal?.('today_summary')}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة ملخص اليوم</span>
            </button>
            <button
              onClick={() => onNavigate('today')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 px-2.5 py-1.5 bg-amber-100/60 rounded-xl"
            >
              <span>مشاهدة الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {todaySummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaySummaries.map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      يوميات المدرسة
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] font-medium text-slate-700">بواسطة: {post.authorName}</span>
                  <span className="text-[11px] font-bold text-amber-700 group-hover:underline">قراءة التقرير الكامل ←</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white/60 rounded-2xl border border-dashed border-amber-200 text-slate-600 text-xs flex flex-col items-center justify-center space-y-3">
            <p>لم يتم نشر ملخص اليوم بعد. ترقبوا التحديثات الصباحية اليومية من معلمات المدرسة.</p>
            <button
              onClick={() => onOpenNewPostModal?.('today_summary')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة ملخص اليوم الأول</span>
            </button>
          </div>
        )}
      </section>

      {/* 7. LATEST NEWS & ANNOUNCEMENTS (آخر الأخبار والإعلانات) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">آخر أخبار وإعلانات المدرسة</h2>
            <p className="text-xs text-slate-500">أحدث الأنشطة المدرسية والبرامج التعليمية والتعاميم المعتمدة</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenNewPostModal?.('news')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة خبر</span>
            </button>
            <button
              onClick={() => onNavigate('news')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 rounded-xl"
            >
              <span>عرض كل الأخبار</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestNews.map((post) => (
            <PostCard key={post.id} post={post} onViewDetails={onSelectPost} />
          ))}
        </div>
      </section>

      {/* 8. UPCOMING EVENTS & HONOR BOARD (الفعاليات القادمة وسجل الإنجازات) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upcoming Events Section (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">الفعاليات المدرسية القادمة</h3>
                  <p className="text-xs text-slate-500">مواعيد المعارض، المهرجانات، والاختبارات</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAddEvent?.()}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة فعالية</span>
                </button>
                <button
                  onClick={() => onNavigate('events')}
                  className="text-xs font-bold text-emerald-800 hover:underline"
                >
                  التقويم الكامل
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all flex items-start gap-3.5"
                >
                  <div className="bg-emerald-800 text-white rounded-xl p-2 text-center min-w-[54px] shrink-0 shadow-sm">
                    <span className="block text-[10px] text-emerald-200 font-medium">
                      {new Date(ev.date).toLocaleDateString('ar-SA', { month: 'short' })}
                    </span>
                    <span className="block text-base font-extrabold">
                      {new Date(ev.date).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {ev.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {ev.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1 mt-1">{ev.description}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                      {ev.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{ev.time}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{ev.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements Section (5 cols) */}
        <section className="lg:col-span-5 bg-gradient-to-br from-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">سجل إنجازات وتفوق الطالبات</h3>
                  <p className="text-xs text-purple-200">التكريم والشهادات والمراكز</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenNewPostModal?.('achievement')}
                  className="px-2.5 py-1 bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/30 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة</span>
                </button>
                <button
                  onClick={() => onNavigate('achievements')}
                  className="text-xs font-bold text-amber-300 hover:underline"
                >
                  المزيد
                </button>
              </div>
            </div>

            {achievements.length > 0 ? (
              <div className="space-y-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    onClick={() => onSelectPost(ach)}
                    className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                      إنجاز متميز
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white mt-1.5 mb-1">{ach.title}</h4>
                    <p className="text-xs text-purple-100/80 line-clamp-2">{ach.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-purple-400/30 text-center space-y-3">
                <p className="text-xs text-purple-200">
                  يمكنكم توثيق إنجازات وجوائز الطالبات والمعلمات وإضافتها إلى هذا السجل في أي وقت.
                </p>
                <button
                  onClick={() => onOpenNewPostModal?.('achievement')}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة إنجاز أو شهادة تكريم</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-purple-200 font-light">
              فخورون بإنجازات طالباتنا ومعلماتنا المبدعات في كافة المحافل التعليمية
            </p>
          </div>
        </section>
      </div>

      {/* 9. SCHOOL PHOTO GALLERY (معرض الصور والألبومات) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">معرض المدرسة الفوتوغرافي</h2>
              <p className="text-xs text-slate-500">توثيق مرئي لفعاليات وأنشطة مدرسة صفية بنت عمر</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAddPhoto?.()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>رفع صور جديدة</span>
            </button>
            <button
              onClick={() => onNavigate('gallery')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 rounded-xl"
            >
              <span>كل الألبومات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {gallery.slice(0, 4).map((pic) => (
            <div
              key={pic.id}
              onClick={() => onNavigate('gallery')}
              className="group relative h-44 rounded-2xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer"
            >
              <img
                src={pic.imageUrl}
                alt={pic.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                <span className="text-[10px] text-amber-300 font-bold">{pic.album}</span>
                <h4 className="text-xs font-bold truncate">{pic.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. CALL TO ACTION / CONTACT CALLOUT (شريط التواصل) */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-l from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-emerald-700/40"
      >
        <div className="space-y-2 text-center md:text-right">
          <h3 className="text-lg sm:text-xl font-bold font-serif">هل لديك استفسار أو ترغب في التواصل مع إدارة المدرسة؟</h3>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl font-light">
            فريق الإدارة والتعليم بمدرسة صفية بنت عمر يسعد باستقبال استفساراتكم واقتراحاتكم في أي وقت.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('contact')}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-transform hover:scale-102 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-slate-950" />
            <span>صفحة التواصل والاستفسارات</span>
          </button>
        </div>
      </motion.section>
    </div>
  );
};
