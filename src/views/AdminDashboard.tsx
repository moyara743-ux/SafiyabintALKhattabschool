import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../types';
import { dataStore } from '../lib/dataStore';
import { supabase } from '../supabaseClient';
import {
  LayoutDashboard,
  Users,
  Shield,
  FileSpreadsheet,
  Bell,
  BookOpen,
  Calendar,
  Award,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Lock,
  GraduationCap,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getStaffRolePasscodes,
  updateStaffRolePasscode,
  generateStrongRolePasscode,
} from '../lib/passcodeService';
import { StaffRolePasscodes } from '../types';

interface AdminDashboardProps {
  onNavigate: (view: PageView) => void;
  onOpenCreatePost: () => void;
  onOpenCreateAnnouncement: () => void;
  onOpenAddEvent: () => void;
  onOpenAddAchievement: () => void;
  onOpenAddPhoto: () => void;
  onOpenCreateAlbum: () => void;
  onOpenDailyMessageModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenCreatePost,
  onOpenCreateAnnouncement,
  onOpenAddEvent,
  onOpenAddAchievement,
  onOpenAddPhoto,
  onOpenCreateAlbum,
  onOpenDailyMessageModal,
}) => {
  const { user, profile, hasPerm, isDirector } = useAuth();
  const [counts, setCounts] = useState({
    posts: 0,
    announcements: 0,
    events: 0,
    achievements: 0,
    photos: 0,
    users: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Staff Role Passcodes Management State (Principal Passcode Center)
  const [passcodes, setPasscodes] = useState<StaffRolePasscodes>(getStaffRolePasscodes());
  const [editPasscodes, setEditPasscodes] = useState<StaffRolePasscodes>(getStaffRolePasscodes());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [passcodeSuccessMsg, setPasscodeSuccessMsg] = useState<string | null>(null);
  const [showPasscodes, setShowPasscodes] = useState<Record<string, boolean>>({
    teacher: false,
    supervisor: false,
    administrator: false,
    counselor: false,
  });

  const handleGenerateRandom = (role: 'teacher' | 'supervisor' | 'administrator' | 'counselor') => {
    const newCode = generateStrongRolePasscode(role);
    setEditPasscodes((prev) => ({ ...prev, [role]: newCode }));
  };

  const handleSavePasscode = async (role: 'teacher' | 'supervisor' | 'administrator' | 'counselor') => {
    setSavingKey(role);
    try {
      const updated = await updateStaffRolePasscode(role, editPasscodes[role], profile);
      setPasscodes(updated);
      setPasscodeSuccessMsg(`تم تحديث وحفظ رمز أمان (${role}) بنجاح.`);
      setTimeout(() => setPasscodeSuccessMsg(null), 3000);
    } catch (e: any) {
      alert(e?.message || 'تعذر تحديث الرمز');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCopyCode = (role: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedKey(role);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const canAccess =
    hasPerm('accessAdminDashboard') ||
    hasPerm('manageUsers') ||
    hasPerm('viewActivityLogs') ||
    isDirector;

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const posts = dataStore.getPosts();
        const ann = await dataStore.getAnnouncements();
        const events = dataStore.getEvents();
        const ach = dataStore.getAchievements();
        const photos = dataStore.getPhotos();
        const users = await dataStore.getUsers();

        setCounts({
          posts: posts.length,
          announcements: ann.length,
          events: events.length,
          achievements: ach.length,
          photos: photos.length,
          users: users.length,
        });

        const localLogs: any[] = JSON.parse(
          localStorage.getItem('safiah_activity_logs') || '[]'
        );
        setRecentLogs(localLogs.slice(0, 5));
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (canAccess) {
      fetchStats();
    }
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-rose-800 rounded-3xl max-w-lg mx-auto space-y-3" dir="rtl">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">غير مصرح لك بالدخول</h2>
        <p className="text-xs text-slate-400">لوحة التحكم مقتصرة على إدارة المدرسة والمعلمات المصرح لهن.</p>
      </div>
    );
  }

  const statCards = [
    { title: 'الأخبار والمنشورات', count: counts.posts, icon: BookOpen, color: 'text-emerald-900 bg-emerald-50 border-emerald-200 hover:border-emerald-400', view: 'news' as PageView },
    { title: 'الإعلانات والتعاميم', count: counts.announcements, icon: Bell, color: 'text-amber-900 bg-amber-50 border-amber-200 hover:border-amber-400', view: 'announcements' as PageView },
    { title: 'الفعاليات المجدولة', count: counts.events, icon: Calendar, color: 'text-teal-900 bg-teal-50 border-teal-200 hover:border-teal-400', view: 'events' as PageView },
    { title: 'الإنجازات والجوائز', count: counts.achievements, icon: Award, color: 'text-purple-900 bg-purple-50 border-purple-200 hover:border-purple-400', view: 'achievements' as PageView },
    { title: 'الصور بالمعرض', count: counts.photos, icon: ImageIcon, color: 'text-blue-900 bg-blue-50 border-blue-200 hover:border-blue-400', view: 'gallery' as PageView },
    { title: 'المستخدمين والمنسوبين', count: counts.users, icon: Users, color: 'text-slate-900 bg-slate-50 border-slate-200 hover:border-slate-400', view: 'users_management' as PageView },
  ];

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-[#064e3b] to-emerald-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border-2 border-amber-400/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40 shadow-xs">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              لوحة الإدارة والتحكم المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed font-normal">
            مرحباً بكِ، {profile?.name} ({profile?.school_role}). مركز المتابعة الميداني لإدارة محتوى منصة مدرسة صفية بنت عمر.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onNavigate('students_management')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md border border-emerald-400 transition-transform hover:scale-105 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>إدارة الطالبات والربط</span>
          </button>

          {hasPerm('manageUsers') && (
            <button
              onClick={() => onNavigate('users_management')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md border border-amber-300 transition-transform hover:scale-105 cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-950" />
              <span>إدارة الرتب والمستخدمين</span>
            </button>
          )}

          {hasPerm('viewActivityLogs') && (
            <button
              onClick={() => onNavigate('activity_logs')}
              className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white border border-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>سجل العمليات</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Publishing Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>إجراءات الإضافة السريعة لمحتوى المنصة</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {hasPerm('createPosts') && (
            <button
              onClick={onOpenCreatePost}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl text-center space-y-1 text-emerald-900 transition-all cursor-pointer shadow-xs"
            >
              <BookOpen className="w-5 h-5 mx-auto text-emerald-700" />
              <span className="block text-xs font-bold">خبر جديد</span>
            </button>
          )}

          {hasPerm('createAnnouncements') && (
            <button
              onClick={onOpenCreateAnnouncement}
              className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-2xl text-center space-y-1 text-amber-900 transition-all cursor-pointer shadow-xs"
            >
              <Bell className="w-5 h-5 mx-auto text-amber-700" />
              <span className="block text-xs font-bold">إعلان هام</span>
            </button>
          )}

          {hasPerm('createEvents') && (
            <button
              onClick={onOpenAddEvent}
              className="p-3 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-2xl text-center space-y-1 text-teal-900 transition-all cursor-pointer shadow-xs"
            >
              <Calendar className="w-5 h-5 mx-auto text-teal-700" />
              <span className="block text-xs font-bold">فعالية</span>
            </button>
          )}

          {hasPerm('createAchievements') && (
            <button
              onClick={onOpenAddAchievement}
              className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-2xl text-center space-y-1 text-purple-900 transition-all cursor-pointer shadow-xs"
            >
              <Award className="w-5 h-5 mx-auto text-purple-700" />
              <span className="block text-xs font-bold">إنجاز</span>
            </button>
          )}

          {hasPerm('createPhotos') && (
            <button
              onClick={onOpenAddPhoto}
              className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-2xl text-center space-y-1 text-blue-900 transition-all cursor-pointer shadow-xs"
            >
              <ImageIcon className="w-5 h-5 mx-auto text-blue-700" />
              <span className="block text-xs font-bold">رفع صورة</span>
            </button>
          )}

          {hasPerm('createAlbums') && (
            <button
              onClick={onOpenCreateAlbum}
              className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-2xl text-center space-y-1 text-indigo-900 transition-all cursor-pointer shadow-xs"
            >
              <ImageIcon className="w-5 h-5 mx-auto text-indigo-700" />
              <span className="block text-xs font-bold">ألبوم صور</span>
            </button>
          )}

          {hasPerm('createDailyMessage') && (
            <button
              onClick={onOpenDailyMessageModal}
              className="p-3 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-2xl text-center space-y-1 text-orange-900 transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-5 h-5 mx-auto text-orange-700" />
              <span className="block text-xs font-bold">رسالة اليوم</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(c.view)}
              className={`p-5 rounded-2xl border ${c.color} shadow-xs cursor-pointer hover:shadow-md hover:scale-102 transition-all flex flex-col justify-between space-y-3`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5" />
                <span className="text-2xl font-extrabold font-serif">{c.count}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                  <span>إدارة القسم</span>
                  <ArrowLeft className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: إدارة رموز المنسوبات (Admin Role Passcodes Control)  */}
      {/* ------------------------------------------------------------- */}
      {(isDirector || hasPerm('manageUsers')) && (
        <div className="bg-white border-2 border-emerald-300/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  إدارة رموز المنسوبات (Staff Passcodes)
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                رموز أمان وظيفية عشوائية وصعبة، قابلة للتوليد والتحديث في أي لحظة من قبل المديرة. يُشترط إدخال هذا الرمز مع بريد Google المعتمد عند تسجيل المنسوبة لأول مرة.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold shrink-0 self-start sm:self-auto">
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span>المديرة تدخل مباشرة بدون رمز</span>
            </div>
          </div>

          {passcodeSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passcodeSuccessMsg}</span>
            </div>
          )}

          {/* 4 Role Passcodes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. رمز المعلمات */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>رمز المعلمات</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Teacher</span>
              </div>

              <div className="relative">
                <input
                  type={showPasscodes.teacher ? 'text' : 'password'}
                  value={editPasscodes.teacher}
                  onChange={(e) =>
                    setEditPasscodes((prev) => ({ ...prev, teacher: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 pr-8 pl-8 tracking-wider"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasscodes((prev) => ({ ...prev, teacher: !prev.teacher }))
                  }
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasscodes.teacher ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerateRandom('teacher')}
                  title="توليد رمز عشوائي صعب"
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCode('teacher', editPasscodes.teacher)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title="نسخ الرمز"
                >
                  {copiedKey === 'teacher' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  disabled={savingKey === 'teacher'}
                  onClick={() => handleSavePasscode('teacher')}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingKey === 'teacher' ? 'جارٍ الحفظ...' : 'حفظ وتحديث'}
                </button>
              </div>
            </div>

            {/* 2. رمز المشرفات */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>رمز المشرفات</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Supervisor</span>
              </div>

              <div className="relative">
                <input
                  type={showPasscodes.supervisor ? 'text' : 'password'}
                  value={editPasscodes.supervisor}
                  onChange={(e) =>
                    setEditPasscodes((prev) => ({ ...prev, supervisor: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 pr-8 pl-8 tracking-wider"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasscodes((prev) => ({ ...prev, supervisor: !prev.supervisor }))
                  }
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasscodes.supervisor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerateRandom('supervisor')}
                  title="توليد رمز عشوائي صعب"
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCode('supervisor', editPasscodes.supervisor)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title="نسخ الرمز"
                >
                  {copiedKey === 'supervisor' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  disabled={savingKey === 'supervisor'}
                  onClick={() => handleSavePasscode('supervisor')}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingKey === 'supervisor' ? 'جارٍ الحفظ...' : 'حفظ وتحديث'}
                </button>
              </div>
            </div>

            {/* 3. رمز الإداريات */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                  <span>رمز الإداريات</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Admin</span>
              </div>

              <div className="relative">
                <input
                  type={showPasscodes.administrator ? 'text' : 'password'}
                  value={editPasscodes.administrator}
                  onChange={(e) =>
                    setEditPasscodes((prev) => ({ ...prev, administrator: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 pr-8 pl-8 tracking-wider"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasscodes((prev) => ({ ...prev, administrator: !prev.administrator }))
                  }
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasscodes.administrator ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerateRandom('administrator')}
                  title="توليد رمز عشوائي صعب"
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCode('administrator', editPasscodes.administrator)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title="نسخ الرمز"
                >
                  {copiedKey === 'administrator' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  disabled={savingKey === 'administrator'}
                  onClick={() => handleSavePasscode('administrator')}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingKey === 'administrator' ? 'جارٍ الحفظ...' : 'حفظ وتحديث'}
                </button>
              </div>
            </div>

            {/* 4. رمز المرشدة الطلابية */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span>رمز المرشدة الطلابية</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Counselor</span>
              </div>

              <div className="relative">
                <input
                  type={showPasscodes.counselor ? 'text' : 'password'}
                  value={editPasscodes.counselor}
                  onChange={(e) =>
                    setEditPasscodes((prev) => ({ ...prev, counselor: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 pr-8 pl-8 tracking-wider"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasscodes((prev) => ({ ...prev, counselor: !prev.counselor }))
                  }
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasscodes.counselor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerateRandom('counselor')}
                  title="توليد رمز عشوائي صعب"
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCode('counselor', editPasscodes.counselor)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title="نسخ الرمز"
                >
                  {copiedKey === 'counselor' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  disabled={savingKey === 'counselor'}
                  onClick={() => handleSavePasscode('counselor')}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingKey === 'counselor' ? 'جارٍ الحفظ...' : 'حفظ وتحديث'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Log Preview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-extrabold text-emerald-950">آخر العمليات والتعديلات المسجلة</h3>
          </div>
          {hasPerm('viewActivityLogs') && (
            <button
              onClick={() => onNavigate('activity_logs')}
              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              عرض السجل الكامل
            </button>
          )}
        </div>

        {recentLogs.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900">{log.details}</p>
                  <p className="text-[11px] text-slate-500">
                    بواسطة: {log.actorName} ({log.actorEmail}) • قسم: {log.entity}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">لا توجد عمليات مسجلة حديثاً.</p>
        )}
      </div>
    </div>
  );
};
