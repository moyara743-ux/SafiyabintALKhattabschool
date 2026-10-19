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
  AlertCircle,
  Lock,
  GraduationCap,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  UserPlus,
  Mail,
  Search,
  Filter,
  Edit2,
  X,
  User,
  Clock,
} from 'lucide-react';
import {
  getStaffRolePasscodes,
  updateStaffRolePasscode,
  generateStrongRolePasscode,
} from '../lib/passcodeService';
import { StaffRolePasscodes, AuthorizedStaffEmail } from '../types';
import {
  getAuthorizedStaffEmails,
  addAuthorizedStaffEmail,
  removeAuthorizedStaffEmail,
  updateAuthorizedStaffMember,
} from '../lib/authorizedStaffService';
import {
  getDesignatedPrincipalEmail,
  getDesignatedPrincipalName,
  updateDesignatedPrincipal,
  isSystemOwner as checkIsSystemOwner,
  isDesignatedPrincipal,
} from '../lib/principalService';

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

  // Principal (Director) Governance State (System Owner & Current Principal)
  const isSystemOwner = Boolean(
    checkIsSystemOwner(user?.email) ||
    checkIsSystemOwner(profile?.email) ||
    profile?.school_role === 'system_owner'
  );
  const canManageDirector = Boolean(
    isSystemOwner ||
    (user?.email && isDesignatedPrincipal(user.email)) ||
    (profile?.email && isDesignatedPrincipal(profile.email)) ||
    profile?.school_role === 'director'
  );
  const [directorEmail, setDirectorEmail] = useState(getDesignatedPrincipalEmail());
  const [directorName, setDirectorName] = useState(getDesignatedPrincipalName());
  const [savingDirector, setSavingDirector] = useState(false);
  const [directorSuccessMsg, setDirectorSuccessMsg] = useState<string | null>(null);
  const [directorErrorMsg, setDirectorErrorMsg] = useState<string | null>(null);

  // Authorized Staff Emails State (Option A: Adding email only, role bound via passcode)
  const [authorizedStaffList, setAuthorizedStaffList] = useState<AuthorizedStaffEmail[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffListSuccessMsg, setStaffListSuccessMsg] = useState<string | null>(null);
  const [staffListErrorMsg, setStaffListErrorMsg] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<{ email: string; name?: string } | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);

  // Dedicated Staff Search, Filter & Edit States
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'activated' | 'pending'>('all');
  const [editingStaff, setEditingStaff] = useState<AuthorizedStaffEmail | null>(null);
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'teacher' | 'supervisor' | 'administrator' | 'counselor' | undefined>(undefined);
  const [savingEditStaff, setSavingEditStaff] = useState(false);

  const handleSaveDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectorErrorMsg(null);
    setDirectorSuccessMsg(null);
    setSavingDirector(true);
    try {
      const res = await updateDesignatedPrincipal({
        newEmail: directorEmail,
        newName: directorName,
        actorEmail: user?.email || profile?.email || '',
        actorName: profile?.name || (isSystemOwner ? 'مالك النظام' : 'المديرة الحالية'),
        actorId: profile?.id || user?.id || 'actor_id',
        actorRole: profile?.school_role,
      });
      setDirectorSuccessMsg(res.message);
      setTimeout(() => setDirectorSuccessMsg(null), 5000);
    } catch (err: any) {
      setDirectorErrorMsg(err?.message || 'تعذر نقل وتعيين حساب المديرة.');
    } finally {
      setSavingDirector(false);
    }
  };

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

  const handleAddStaffEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffListErrorMsg(null);
    setStaffListSuccessMsg(null);
    setAddingStaff(true);
    try {
      const added = await addAuthorizedStaffEmail({
        email: newStaffEmail,
        name: newStaffName,
        actor: profile,
      });
      setAuthorizedStaffList((prev) => [added, ...prev.filter((p) => p.email !== added.email)]);
      setNewStaffEmail('');
      setNewStaffName('');
      setShowAddStaffModal(false);
      setStaffListSuccessMsg(`تمت إضافة المنسوبة (${added.email}) إلى قائمة المصرح لهن بالدخول بنجاح.`);
      setTimeout(() => setStaffListSuccessMsg(null), 4000);
    } catch (err: any) {
      setStaffListErrorMsg(err?.message || 'تعذر إضافة البريد المصرح له.');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleOpenEditStaff = (staff: AuthorizedStaffEmail) => {
    setStaffListErrorMsg(null);
    setStaffListSuccessMsg(null);
    setEditingStaff(staff);
    setEditStaffEmail(staff.email);
    setEditStaffName(staff.name || '');
    setEditStaffRole(staff.assignedRole);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSavingEditStaff(true);
    setStaffListErrorMsg(null);
    setStaffListSuccessMsg(null);

    try {
      const updated = await updateAuthorizedStaffMember({
        oldEmail: editingStaff.email,
        newEmail: editStaffEmail,
        name: editStaffName,
        assignedRole: editStaffRole,
        actor: profile,
      });

      setAuthorizedStaffList((prev) =>
        prev.map((item) =>
          item.id === editingStaff.id || item.email.toLowerCase() === editingStaff.email.toLowerCase()
            ? updated
            : item
        )
      );

      setStaffListSuccessMsg(`تم تحديث بيانات المنسوبة (${updated.name || updated.email}) بنجاح.`);
      setTimeout(() => setStaffListSuccessMsg(null), 4000);
      setEditingStaff(null);
    } catch (err: any) {
      setStaffListErrorMsg(err?.message || 'تعذر تحديث بيانات المنسوبة.');
    } finally {
      setSavingEditStaff(false);
    }
  };

  const handleInitiateRemoveStaff = (targetEmail: string, name?: string) => {
    setStaffListErrorMsg(null);
    setStaffListSuccessMsg(null);
    setStaffToDelete({ email: targetEmail, name });
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    const targetEmail = staffToDelete.email;
    setDeletingStaff(true);
    setStaffListErrorMsg(null);
    setStaffListSuccessMsg(null);

    try {
      // 1. Delete/Revoke Mensebah in database and strip all privileges
      await removeAuthorizedStaffEmail(targetEmail, profile);

      // 2. Real-time state refresh (immediate removal of row without page reload)
      setAuthorizedStaffList((prev) =>
        prev.filter((p) => p.email.toLowerCase() !== targetEmail.toLowerCase())
      );

      setStaffListSuccessMsg(
        `تم إلغاء تصريح المنسوبة (${targetEmail}) وحذفها وتجريد الحساب من الصلاحيات بنجاح.`
      );
      setTimeout(() => setStaffListSuccessMsg(null), 4000);
      setStaffToDelete(null);
    } catch (err: any) {
      console.error('[AdminDashboard] Error removing staff member:', err);
      // Fallback state refresh to ensure UI responsiveness even if remote sync threw an error
      setAuthorizedStaffList((prev) =>
        prev.filter((p) => p.email.toLowerCase() !== targetEmail.toLowerCase())
      );
      setStaffListErrorMsg(
        err?.message || 'تعذر استكمال حذف المنسوبة بالكامل من الخادم، تم تحديث القائمة محلياً.'
      );
      setStaffToDelete(null);
    } finally {
      setDeletingStaff(false);
    }
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
        const staffList = await getAuthorizedStaffEmails();

        setCounts({
          posts: posts.length,
          announcements: ann.length,
          events: events.length,
          achievements: ach.length,
          photos: photos.length,
          users: users.length,
        });

        setAuthorizedStaffList(staffList);

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

      {/* ------------------------------------------------------------------- */}
      {/* SECTION: إدارة ونقل رتبة ولقب مديرة المدرسة (مالك النظام والمديرة الحالية) */}
      {/* ------------------------------------------------------------------- */}
      {canManageDirector && (
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border-2 border-amber-300 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 border border-amber-400/50 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4 text-amber-700" />
                </div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>إدارة ونقل رتبة ولقب مديرة المدرسة المعتمد</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 text-[10px] font-black border border-amber-300">
                    {isSystemOwner ? 'صلاحية مالك النظام' : 'صلاحية المديرة الحالية'}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                قاعدة أمنية عليا: يوجد حساب <strong>مديرة واحدة فقط</strong> في النظام. الجهة الوحيدة المخولة بنقل لقب ورتبة "المديرة" إلى حساب آخر هي <strong>مالك النظام</strong> و<strong>المديرة الحالية</strong>. بمجرد النقل، <strong>يُسحب اللقب وكافة الصلاحيات الإدارية فوراً وتلقائياً من الحساب القديم</strong> ويتحول إلى رتبة معلمة، وتُمنح للمديرة الجديدة فوراً.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-bold shrink-0 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>المديرة ومالك النظام معفيان من إكمال البيانات</span>
            </div>
          </div>

          {directorSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{directorSuccessMsg}</span>
            </div>
          )}

          {directorErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{directorErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveDirector} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                عنوان بريد Google المعتمد للمديرة:
              </label>
              <input
                type="email"
                required
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
                placeholder="director.safiah@gmail.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                اسم مديرة المدرسة:
              </label>
              <input
                type="text"
                required
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="أ. هدى الغامدي - مديرة المدرسة"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={savingDirector}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-colors cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{savingDirector ? 'جارٍ الاعتماد والتعيين...' : 'اعتماد وحفظ حساب المديرة'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

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

      {/* -------------------------------------------------------------------------- */}
      {/* SECTION: قائمة البريد المصرح له لمنسوبات المدرسة (الخيار أ - ربط المسمى بالرمز) */}
      {/* -------------------------------------------------------------------------- */}
      {/* -------------------------------------------------------------------------- */}
      {/* SECTION: إدارة وتصاريح منسوبات المدرسة (حصرياً لمالك النظام والمديرة)          */}
      {/* -------------------------------------------------------------------------- */}
      {canManageDirector && (
        <div className="bg-white border-2 border-teal-300/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
          {/* Header & Main Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>إدارة وتصاريح منسوبات المدرسة</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[11px] font-black border border-teal-200">
                      قائمة المعتمدات رسمياً
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl mt-0.5">
                    إدارة حسابات منسوبات المدرسة (معلمات، مشرفات تربويات، إداريات، مرشدات طلابيات)، واعتماد البريد الإلكتروني للربط مع Google والتحقق الأمني.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{authorizedStaffList.length} منسوبة معتمدة</span>
              </div>

              {/* Add Staff Button */}
              <button
                type="button"
                onClick={() => {
                  setStaffListErrorMsg(null);
                  setStaffListSuccessMsg(null);
                  setNewStaffEmail('');
                  setNewStaffName('');
                  setShowAddStaffModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة منسوبة جديدة</span>
              </button>
            </div>
          </div>

          {/* Success / Error Messages */}
          {staffListSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{staffListSuccessMsg}</span>
            </div>
          )}

          {staffListErrorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{staffListErrorMsg}</span>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو بالبريد الإلكتروني..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 pr-9"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              {staffSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStaffSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Role */}
            <div className="sm:col-span-4 relative">
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
              >
                <option value="all">كل الرتب والمسميات الوظيفية</option>
                <option value="teacher">معلمة</option>
                <option value="supervisor">مشرفة تربوية</option>
                <option value="administrator">إدارية</option>
                <option value="counselor">مرشدة طلابية</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="sm:col-span-3 relative">
              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
              >
                <option value="all">جميع حالات الحساب</option>
                <option value="activated">نشط ومكتمل</option>
                <option value="pending">بانتظار التفعيل والدخول</option>
              </select>
            </div>
          </div>

          {/* Authorized Staff Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">المنسوبة (الاسم الكامل)</th>
                    <th className="p-3.5">البريد الإلكتروني (المرتبط بـ Google)</th>
                    <th className="p-3.5">الرتبة والمسمى الوظيفي</th>
                    <th className="p-3.5">حالة الحساب</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {authorizedStaffList
                    .filter((item) => {
                      if (staffSearchQuery.trim()) {
                        const q = staffSearchQuery.trim().toLowerCase();
                        const matchEmail = item.email.toLowerCase().includes(q);
                        const matchName = (item.name || '').toLowerCase().includes(q);
                        if (!matchEmail && !matchName) return false;
                      }
                      if (staffRoleFilter !== 'all') {
                        if (item.assignedRole !== staffRoleFilter) return false;
                      }
                      if (staffStatusFilter === 'activated' && !item.isActivated) return false;
                      if (staffStatusFilter === 'pending' && item.isActivated) return false;
                      return true;
                    })
                    .map((item) => {
                      const roleConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
                        teacher: {
                          label: 'معلمة',
                          bg: 'bg-emerald-50',
                          text: 'text-emerald-900',
                          border: 'border-emerald-300',
                        },
                        supervisor: {
                          label: 'مشرفة تربوية',
                          bg: 'bg-blue-50',
                          text: 'text-blue-900',
                          border: 'border-blue-300',
                        },
                        administrator: {
                          label: 'إدارية',
                          bg: 'bg-indigo-50',
                          text: 'text-indigo-900',
                          border: 'border-indigo-300',
                        },
                        counselor: {
                          label: 'مرشدة طلابية',
                          bg: 'bg-purple-50',
                          text: 'text-purple-900',
                          border: 'border-purple-300',
                        },
                        director: {
                          label: 'مديرة المدرسة',
                          bg: 'bg-amber-50',
                          text: 'text-amber-900',
                          border: 'border-amber-300',
                        },
                      };
                      const roleInfo = item.assignedRole ? roleConfig[item.assignedRole] : null;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* 1. المنسوبة (الاسم الكامل) */}
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border border-teal-200">
                                {item.name ? item.name[0] : item.email[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="block font-black text-slate-900">
                                  {item.name || 'منسوبة معتمدة'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  أضيفت: {item.addedAt ? new Date(item.addedAt).toLocaleDateString('ar-SA') : 'معتمدة'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. البريد الإلكتروني (المرتبط بـ Google) */}
                          <td className="p-3.5 font-mono text-xs text-slate-800" dir="ltr">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span>{item.email}</span>
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </div>
                          </td>

                          {/* 3. الرتبة والمسمى الوظيفي */}
                          <td className="p-3.5">
                            {roleInfo ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}
                              >
                                {roleInfo.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-bold">
                                بانتظار تحديد الرتبة
                              </span>
                            )}
                          </td>

                          {/* 4. حالة الحساب */}
                          <td className="p-3.5">
                            {item.isActivated ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-black">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>نشط ومكتمل</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black">
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>بانتظار التفعيل والدخول</span>
                              </span>
                            )}
                          </td>

                          {/* 5. الإجراءات (زر تعديل / زر إلغاء التصريح والحذف) */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* زر تعديل */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(item)}
                                className="p-2 rounded-xl text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-900 transition-colors cursor-pointer border border-teal-200"
                                title="تعديل بيانات المنسوبة"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* زر إلغاء التصريح والحذف */}
                              <button
                                type="button"
                                onClick={() => handleInitiateRemoveStaff(item.email, item.name)}
                                className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer border border-rose-200"
                                title="إلغاء التصريح وحذف البريد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {authorizedStaffList.filter((item) => {
                    if (staffSearchQuery.trim()) {
                      const q = staffSearchQuery.trim().toLowerCase();
                      const matchEmail = item.email.toLowerCase().includes(q);
                      const matchName = (item.name || '').toLowerCase().includes(q);
                      if (!matchEmail && !matchName) return false;
                    }
                    if (staffRoleFilter !== 'all') {
                      if (item.assignedRole !== staffRoleFilter) return false;
                    }
                    if (staffStatusFilter === 'activated' && !item.isActivated) return false;
                    if (staffStatusFilter === 'pending' && item.isActivated) return false;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        لا توجد منسوبات مطابقة لمعايير البحث الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* MODAL: ADD NEW STAFF MEMBER                                  */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {showAddStaffModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
              dir="rtl"
            >
              <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-teal-500/30 p-6 space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        + إضافة منسوبة جديدة إلى القائمة المعتمدة
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        اعتماد بريد Google للسماح لها بالدخول ومطابقة رمز الأمان
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddStaffEmail} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      البريد الإلكتروني المعتمد للمنسوبة (مرتبط بـ Google): <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="teacher.name@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 pr-9"
                        dir="ltr"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      * لن تتمكن المنسوبة من تجاوز شاشة الدخول الأولى إلا إذا كان بريدها مسجلاً في هذه القائمة بدقة.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      اسم المنسوبة (اختياري / للتعريف في اللوحة):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="أ. نورة العتيبي"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 pr-9"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="submit"
                      disabled={addingStaff}
                      className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {addingStaff ? (
                        <span>جارٍ الإضافة والاعتماد...</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>إضافة واعتماد الدخول</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddStaffModal(false)}
                      disabled={addingStaff}
                      className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* MODAL: EDIT STAFF MEMBER DETAILS                              */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {editingStaff && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
              dir="rtl"
            >
              <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-teal-500/30 p-6 space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        تعديل بيانات وتصريح المنسوبة
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        تحديث البريد المعتمد أو المسمى الوظيفي
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditStaff} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      البريد الإلكتروني المعتمد (Google): <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={editStaffEmail}
                        onChange={(e) => setEditStaffEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 pr-9"
                        dir="ltr"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      اسم المنسوبة:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editStaffName}
                        onChange={(e) => setEditStaffName(e.target.value)}
                        placeholder="أ. نورة العتيبي"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 pr-9"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      الرتبة والمسمى الوظيفي المعتمد:
                    </label>
                    <select
                      value={editStaffRole || ''}
                      onChange={(e) =>
                        setEditStaffRole(
                          e.target.value ? (e.target.value as any) : undefined
                        )
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 cursor-pointer"
                    >
                      <option value="">(غير محدد - تحدده المنسوبة برمز الأمان)</option>
                      <option value="teacher">معلمة</option>
                      <option value="supervisor">مشرفة تربوية</option>
                      <option value="administrator">إدارية</option>
                      <option value="counselor">مرشدة طلابية</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="submit"
                      disabled={savingEditStaff}
                      className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {savingEditStaff ? (
                        <span>جارٍ حفظ التعديلات...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>حفظ التعديلات</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStaff(null)}
                      disabled={savingEditStaff}
                      className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* QUICK CONFIRMATION MODAL: REVOKE / DELETE STAFF MEMBER       */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {staffToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          dir="rtl"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-rose-200 p-6 space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  تأكيد إلغاء تصريح المنسوبة
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  إدارة الصلاحيات وقائمة البريد المعتمد
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed font-bold">
              هل أنتِ متأكدة من إلغاء تصريح المنسوبة وحذف بريدها الإلكتروني من القائمة المعتمدة؟
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
              {staffToDelete.name && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">اسم المنسوبة:</span>
                  <span className="font-bold text-slate-900">{staffToDelete.name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">البريد الإلكتروني:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {staffToDelete.email}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-bold">
                تنبيه: سيتم تجريد هذا الحساب من كافة الصلاحيات فوراً ومنعه من تسجيل الدخول كمنسوبة.
              </span>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={handleConfirmDeleteStaff}
                disabled={deletingStaff}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {deletingStaff ? (
                  <span>جارٍ الحذف والتجريد...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، إلغاء التصريح والحذف</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                disabled={deletingStaff}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
