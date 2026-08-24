import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, UserRole, UserPermissions, Post, SchoolEvent, GalleryPhoto, ActivityLog, SchoolSettings } from '../types';
import { OWNER_EMAIL, DEFAULT_SETTINGS } from '../data/initialData';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Shield,
  Users,
  FileText,
  Image as ImageIcon,
  Calendar,
  Activity,
  Settings,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  UserCheck,
  UserX,
  Lock,
  Eye,
  AlertTriangle,
  Save,
  Check,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AdminTab = 'users' | 'moderators' | 'posts' | 'events' | 'gallery' | 'logs' | 'settings';

export const AdminDashboard: React.FC = () => {
  const { user, profile, isOwner, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Collections state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [eventsList, setEventsList] = useState<SchoolEvent[]>([]);
  const [galleryList, setGalleryList] = useState<GalleryPhoto[]>([]);
  const [logsList, setLogsList] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);

  // Filter and search
  const [searchUser, setSearchUser] = useState('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Real-time listener for users (Owner/Admin)
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach((d) => {
        uList.push({ ...(d.data() as UserProfile), id: d.id });
      });
      setUsersList(uList);
    }, (err) => console.warn('Users listener:', err));

    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      const pList: Post[] = [];
      snap.forEach((d) => {
        pList.push({ ...(d.data() as Post), id: d.id });
      });
      pList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPostsList(pList);
    }, (err) => console.warn('Posts listener:', err));

    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const eList: SchoolEvent[] = [];
      snap.forEach((d) => {
        eList.push({ ...(d.data() as SchoolEvent), id: d.id });
      });
      setEventsList(eList);
    }, (err) => console.warn('Events listener:', err));

    const unsubGallery = onSnapshot(collection(db, 'gallery'), (snap) => {
      const gList: GalleryPhoto[] = [];
      snap.forEach((d) => {
        gList.push({ ...(d.data() as GalleryPhoto), id: d.id });
      });
      setGalleryList(gList);
    }, (err) => console.warn('Gallery listener:', err));

    const unsubLogs = onSnapshot(collection(db, 'activityLogs'), (snap) => {
      const lList: ActivityLog[] = [];
      snap.forEach((d) => {
        lList.push({ ...(d.data() as ActivityLog), id: d.id });
      });
      lList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogsList(lList);
    }, (err) => console.warn('Logs listener:', err));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SchoolSettings);
      }
    }, (err) => console.warn('Settings listener:', err));

    return () => {
      unsubUsers();
      unsubPosts();
      unsubEvents();
      unsubGallery();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  // Handlers for User Management & Permissions
  const handleUpdateRoleAndPermissions = async (u: UserProfile, newRole: UserRole, perms: UserPermissions) => {
    if (!isOwner && !isAdmin) return;
    if (u.role === 'owner' || u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      alert('لا يمكن تعديل صلاحيات حساب المديرة والمالكة الرئيسية للموقع.');
      return;
    }

    try {
      setSavingUser(true);
      await updateDoc(doc(db, 'users', u.id), {
        role: newRole,
        permissions: perms,
      });

      await addDoc(collection(db, 'activityLogs'), {
        action: 'تعديل رتبة وصلاحيات مستخدم',
        details: `قام ${profile?.displayName} بتغيير رتبة المستخدم ${u.displayName} (${u.email}) إلى ${newRole}`,
        userId: user?.uid || '',
        userName: profile?.displayName || 'المديرة',
        userEmail: user?.email || '',
        targetId: u.id,
        targetType: 'user',
        timestamp: new Date().toISOString(),
      });

      showToast(`تم تحديث صلاحيات ${u.displayName} بنجاح.`);
      setSelectedUserForEdit(null);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل الصلاحيات.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (u: UserProfile) => {
    if (!isOwner) {
      alert('هذا الإجراء متاح للمديرة الرئيسية فقط.');
      return;
    }
    if (u.role === 'owner' || u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      alert('لا يمكن إيقاف حساب المديرة الرئيسية.');
      return;
    }

    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    const actionName = newStatus === 'suspended' ? 'إيقاف حساب' : 'تفعيل حساب';

    if (!window.confirm(`هل أنت متأكدة من ${actionName} المستخدم (${u.displayName})؟`)) return;

    try {
      await updateDoc(doc(db, 'users', u.id), { status: newStatus });
      await addDoc(collection(db, 'activityLogs'), {
        action: actionName,
        details: `تم ${actionName} للمستخدم ${u.displayName} (${u.email})`,
        userId: user?.uid || '',
        userName: profile?.displayName || 'المديرة',
        userEmail: user?.email || '',
        targetId: u.id,
        targetType: 'user',
        timestamp: new Date().toISOString(),
      });
      showToast(`تم ${actionName} بنجاح.`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تغيير حالة الحساب.');
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (!isOwner) {
      alert('حذف المستخدمين مقتصر فقط على المديرة والمالكة الرئيسية.');
      return;
    }
    if (u.role === 'owner' || u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      alert('لا يمكن حذف حساب المديرة والمالكة الرئيسية للموقع بأي حال من الأحوال.');
      return;
    }

    if (!window.confirm(`تحذير أمني: هل أنتِ متأكدة تماماً من حذف حساب ${u.displayName} (${u.email}) نهائياً؟`)) return;

    try {
      await deleteDoc(doc(db, 'users', u.id));
      await addDoc(collection(db, 'activityLogs'), {
        action: 'حذف مستخدم نهائياً',
        details: `قامت المديرة بحذف حساب ${u.displayName} (${u.email})`,
        userId: user?.uid || '',
        userName: profile?.displayName || 'المديرة',
        userEmail: user?.email || '',
        targetId: u.id,
        targetType: 'user',
        timestamp: new Date().toISOString(),
      });
      showToast(`تم حذف حساب ${u.displayName} بنجاح.`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف المستخدم.');
    }
  };

  // Post Approval & Moderation Handlers
  const handleApprovePost = async (post: Post) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), { status: 'published' });
      await addDoc(collection(db, 'activityLogs'), {
        action: 'اعتماد ونشر منشور',
        details: `تمت الموافقة على نشر المنشور "${post.title}" المقدم من ${post.authorName}`,
        userId: user?.uid || '',
        userName: profile?.displayName || 'المديرة',
        userEmail: user?.email || '',
        targetId: post.id,
        targetType: 'post',
        timestamp: new Date().toISOString(),
      });
      showToast(`تم اعتماد ونشر المنشور "${post.title}"`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف المنشور "${post.title}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      await addDoc(collection(db, 'activityLogs'), {
        action: 'حذف منشور من الإدارة',
        details: `تم حذف المنشور "${post.title}" بواسطة ${profile?.displayName}`,
        userId: user?.uid || '',
        userName: profile?.displayName || 'المديرة',
        userEmail: user?.email || '',
        targetId: post.id,
        targetType: 'post',
        timestamp: new Date().toISOString(),
      });
      showToast('تم حذف المنشور بنجاح.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (ev: SchoolEvent) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف فعالية "${ev.title}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'events', ev.id));
      showToast('تم حذف الفعالية بنجاح.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGalleryPhoto = async (pic: GalleryPhoto) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف الصورة "${pic.title}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'gallery', pic.id));
      showToast('تم حذف الصورة من المعرض.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    try {
      setSavingSettings(true);
      await setDoc(doc(db, 'settings', 'general'), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      await addDoc(collection(db, 'activityLogs'), {
        action: 'تحديث إعدادات المدرسة',
        details: 'تم تحديث بيانات المدرسة والشعار وبيانات التواصل',
        userId: user?.uid || '',
        userName: profile?.displayName || 'المديرة',
        userEmail: user?.email || '',
        timestamp: new Date().toISOString(),
      });
      showToast('تم حفظ إعدادات المدرسة بنجاح.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الإعدادات.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered lists
  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchUser.toLowerCase())
  );

  const pendingPosts = postsList.filter((p) => p.status === 'pending_review');
  const moderatorsList = usersList.filter((u) => u.role !== 'user');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-900 text-emerald-100 rounded-2xl shadow-2xl border border-emerald-500/40 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Dashboard Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-inner">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {isOwner ? 'المديرة والمالكة الرئيسية' : 'مشرفة النظام'}
                </span>
                <span className="text-xs text-slate-400">لوحة القيادة والتحكم الشاملة</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold font-serif text-white mt-1">
                إدارة منصة مدرسة صفية بنت عمر
              </h1>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                متابعة الحسابات، الصلاحيات، اعتماد المنشورات، سجل العمليات، وإعدادات المنظومة
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="text-center px-2">
              <span className="text-lg font-black text-amber-400 block">{usersList.length}</span>
              <span className="text-[10px] text-slate-300">المستخدمين المسجلين</span>
            </div>
            <div className="text-center px-2 border-r border-white/10">
              <span className="text-lg font-black text-emerald-400 block">{moderatorsList.length}</span>
              <span className="text-[10px] text-slate-300">المشرفين والمعلمات</span>
            </div>
            <div className="text-center px-2 border-r border-white/10">
              <span className="text-lg font-black text-sky-400 block">{postsList.length}</span>
              <span className="text-[10px] text-slate-300">إجمالي المنشورات</span>
            </div>
            <div className="text-center px-2 border-r border-white/10">
              <span className="text-lg font-black text-rose-400 block">{pendingPosts.length}</span>
              <span className="text-[10px] text-slate-300">بانتظار المراجعة</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-8 overflow-x-auto pb-1 border-t border-slate-800/80 pt-4">
          {[
            { id: 'users', label: 'المستخدمين والحسابات', icon: Users, count: usersList.length },
            { id: 'moderators', label: 'إدارة المشرفين والصلاحيات', icon: UserCheck, count: moderatorsList.length },
            { id: 'posts', label: 'إدارة المنشورات والأخبار', icon: FileText, count: postsList.length, alert: pendingPosts.length > 0 },
            { id: 'events', label: 'إدارة الفعاليات', icon: Calendar, count: eventsList.length },
            { id: 'gallery', label: 'إدارة المعرض والألبومات', icon: ImageIcon, count: galleryList.length },
            { id: 'logs', label: 'سجل النشاطات والأمان', icon: Activity, count: logsList.length },
            { id: 'settings', label: 'إعدادات وهوية المدرسة', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-slate-900 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                    {tab.count}
                  </span>
                )}
                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Panels */}
      <div>
        {/* TAB 1: ALL USERS */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">سجل المستخدمين المسجلين في المنصة</h3>
                <p className="text-xs text-slate-500">
                  عرض جميع الحسابات، البريد الإلكتروني، الحالة، مع إمكانية البحث والتحكم الكامل
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو البريد..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/70">
                    <th className="p-3.5 rounded-tr-xl">المستخدم</th>
                    <th className="p-3.5">البريد الإلكتروني</th>
                    <th className="p-3.5">الرتبة</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">تاريخ التسجيل</th>
                    <th className="p-3.5 text-left rounded-tl-xl">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                          {u.displayName?.[0] || 'م'}
                        </div>
                        <span>{u.displayName}</span>
                        {u.role === 'owner' && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                            المالكة
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">{u.email}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.role === 'owner' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          u.role === 'admin' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                          u.role === 'teacher' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          u.role === 'editor' ? 'bg-sky-100 text-sky-900 border border-sky-300' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role === 'owner' ? 'المديرة الرئيسية' :
                           u.role === 'admin' ? 'مشرفة إدارية' :
                           u.role === 'teacher' ? 'معلمة' :
                           u.role === 'editor' ? 'محررة محتوى' : 'مستخدم عادي'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {u.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-3.5 text-left">
                        {u.role !== 'owner' && u.email.toLowerCase() !== OWNER_EMAIL.toLowerCase() ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedUserForEdit(u)}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg transition-colors"
                              title="تعديل الرتبة والصلاحيات"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.status === 'active'
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  }`}
                                  title={u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                                >
                                  {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                                  title="حذف المستخدم نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-bold">الحساب الرئيسي (محمي)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MODERATORS & GRANULAR PERMISSIONS */}
        {activeTab === 'moderators' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">هيئة الإشراف والمعلمات والصلاحيات المخصصة</h3>
                <p className="text-xs text-slate-500">
                  تحديد الصلاحيات الدقيقة لكل مشرفة ومعلمة (نشر الأخبار، إضافة الفعاليات، رفع الصور، يوميات المدرسة)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moderatorsList.map((mod) => (
                <div key={mod.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:border-emerald-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {mod.displayName?.[0] || 'م'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{mod.displayName}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{mod.email}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {mod.role === 'owner' ? 'المديرة' : mod.role === 'admin' ? 'وكيلة/مشرفة' : mod.role === 'teacher' ? 'معلمة' : 'محررة'}
                      </span>
                    </div>

                    {/* Permissions Checklist Summary */}
                    <div className="space-y-1.5 my-3 text-xs bg-white p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-slate-700">
                        <span>نشر الأخبار والمنشورات:</span>
                        {mod.permissions?.canPublishNews || mod.role === 'owner' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                        ) : (
                          <span className="text-slate-300 text-[10px]">✕</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>إضافة وإدارة الفعاليات:</span>
                        {mod.permissions?.canManageEvents || mod.role === 'owner' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                        ) : (
                          <span className="text-slate-300 text-[10px]">✕</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>رفع صور المعرض:</span>
                        {mod.permissions?.canUploadPhotos || mod.role === 'owner' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                        ) : (
                          <span className="text-slate-300 text-[10px]">✕</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>نشر ملخص "يومنا بالمدرسة":</span>
                        {mod.permissions?.canPostTodaySummary || mod.role === 'owner' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                        ) : (
                          <span className="text-slate-300 text-[10px]">✕</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>يحتاج مراجعة قبل النشر:</span>
                        <span className={`text-[10px] font-bold ${mod.permissions?.requiresReview ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {mod.permissions?.requiresReview ? 'نعم (مراجعة)' : 'لا (نشر مباشر)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {mod.role !== 'owner' && (
                    <button
                      onClick={() => setSelectedUserForEdit(mod)}
                      className="w-full mt-2 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تخصيص الصلاحيات</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: POSTS & MODERATION QUEUE */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Pending Moderation Section if any */}
            {pendingPosts.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-amber-950">
                    منشورات بانتظار مراجعة واعتماد المديرة ({pendingPosts.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingPosts.map((post) => (
                    <div key={post.id} className="p-4 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {post.category}
                        </span>
                        <span className="text-[10px] text-slate-400">بواسطة: {post.authorName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{post.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{post.content}</p>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl"
                        >
                          رفض وحذف
                        </button>
                        <button
                          onClick={() => handleApprovePost(post)}
                          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>موافقة ونشر</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Published Posts */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">جميع منشورات وأخبار المدرسة ({postsList.length})</h3>
                  <p className="text-xs text-slate-500">حذف، تعديل، أو إعادة تنظيم أي منشور في المنصة</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {postsList.map((p) => (
                  <div key={p.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{p.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span>الناشر: {p.authorName}</span>
                          <span>•</span>
                          <span>{p.category}</span>
                          <span>•</span>
                          <span>{new Date(p.createdAt).toLocaleDateString('ar-SA')}</span>
                          {p.isPinned && (
                            <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded text-[10px]">
                              مثبت
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePost(p)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                      title="حذف المنشور"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EVENTS */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">إدارة فعاليات وتقويم المدرسة ({eventsList.length})</h3>
            <p className="text-xs text-slate-500 mb-6">التحكم في الفعاليات القادمة والمكتملة</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventsList.map((ev) => (
                <div key={ev.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {ev.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{ev.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">التاريخ: {ev.date} | الوقت: {ev.time}</p>
                    <p className="text-xs text-slate-500">المكان: {ev.location}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: GALLERY */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">إدارة معرض الصور والألبومات ({galleryList.length})</h3>
            <p className="text-xs text-slate-500 mb-6">حذف أي صورة غير مناسبة والتحكم بالألبومات</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryList.map((pic) => (
                <div key={pic.id} className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={pic.imageUrl} alt={pic.title} className="w-full h-36 object-cover" referrerPolicy="no-referrer" />
                  <div className="p-2.5 bg-white">
                    <span className="text-[10px] text-emerald-700 font-bold block">{pic.album}</span>
                    <h5 className="text-xs font-bold text-slate-800 truncate">{pic.title}</h5>
                  </div>
                  <button
                    onClick={() => handleDeleteGalleryPhoto(pic)}
                    className="absolute top-2 left-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">سجل النشاطات والعمليات الأمنية (Audit Trail)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              سجل فوري ومؤرشف لا يمكن التلاعب به، يوثق من نشر، من حذف، من غيّر الصلاحيات، ووقت العملية بالتحديد.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                    <th className="p-3">الإجراء</th>
                    <th className="p-3">التفاصيل</th>
                    <th className="p-3">المنفذ</th>
                    <th className="p-3">البريد الإلكتروني</th>
                    <th className="p-3">الوقت والتاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsList.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          {l.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">{l.details}</td>
                      <td className="p-3 font-bold text-slate-900">{l.userName}</td>
                      <td className="p-3 text-slate-500 font-mono">{l.userEmail}</td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(l.timestamp).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: SCHOOL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">إعدادات وهوية مدرسة صفية بنت عمر</h3>
            <p className="text-xs text-slate-500 mb-6">تعديل بيانات المدرسة الرسمية والشعار ونظام المراجعة</p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المدرسة الرسمي</label>
                <input
                  type="text"
                  required
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شعار المدرسة (Motto)</label>
                <input
                  type="text"
                  required
                  value={settings.motto}
                  onChange={(e) => setSettings({ ...settings, motto: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نبذة عن المدرسة والرؤية</label>
                <textarea
                  rows={4}
                  required
                  value={settings.aboutText}
                  onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف / الجوال الرسمي للمدرسة
                </label>
                <input
                  type="text"
                  placeholder="اكتب رقم الهاتف هنا (مثال: 05xxxxxxxx أو 011xxxxxxx)"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يمكنك كتابة رقم الهاتف ليظهر تلقائياً في تذييل المنصة وقسم التواصل، أو تركه فارغاً.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الموقع الجغرافي / العنوان</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">تفعيل نظام اعتماد المنشورات قبل النشر</span>
                  <span className="text-[11px] text-emerald-800">
                    عند التفعيل، تتطلب منشورات بعض المشرفين موافقة المديرة قبل ظهورها للعامة
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableModerationWorkflow}
                  onChange={(e) => setSettings({ ...settings, enableModerationWorkflow: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings || !isOwner}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ الإعدادات</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Permissions Editor Modal for Specific User */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-emerald-800 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">تحديد رتبة وصلاحيات المشرف</h3>
                <p className="text-xs text-emerald-100">{selectedUserForEdit.displayName} ({selectedUserForEdit.email})</p>
              </div>
              <button onClick={() => setSelectedUserForEdit(null)} className="text-white hover:opacity-80">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الرتبة الممنوحة</label>
                <select
                  value={selectedUserForEdit.role}
                  onChange={(e) =>
                    setSelectedUserForEdit({
                      ...selectedUserForEdit,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="user">مستخدم عادي (اطلاع فقط)</option>
                  <option value="editor">محررة محتوى (Editor)</option>
                  <option value="teacher">معلمة (Teacher)</option>
                  <option value="admin">مشرفة إدارية (Admin)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-2">الصلاحيات الدقيقة الممنوحة:</span>

                <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer">
                  <span className="text-xs font-medium text-slate-700">نشر الأخبار والمنشورات العامة</span>
                  <input
                    type="checkbox"
                    checked={selectedUserForEdit.permissions?.canPublishNews ?? false}
                    onChange={(e) =>
                      setSelectedUserForEdit({
                        ...selectedUserForEdit,
                        permissions: { ...selectedUserForEdit.permissions, canPublishNews: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer">
                  <span className="text-xs font-medium text-slate-700">إضافة وإدارة الفعاليات والتقويم</span>
                  <input
                    type="checkbox"
                    checked={selectedUserForEdit.permissions?.canManageEvents ?? false}
                    onChange={(e) =>
                      setSelectedUserForEdit({
                        ...selectedUserForEdit,
                        permissions: { ...selectedUserForEdit.permissions, canManageEvents: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer">
                  <span className="text-xs font-medium text-slate-700">رفع صور الأنشطة وإدارة المعرض</span>
                  <input
                    type="checkbox"
                    checked={selectedUserForEdit.permissions?.canUploadPhotos ?? false}
                    onChange={(e) =>
                      setSelectedUserForEdit({
                        ...selectedUserForEdit,
                        permissions: { ...selectedUserForEdit.permissions, canUploadPhotos: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer">
                  <span className="text-xs font-medium text-slate-700">نشر في قسم "يومنا بالمدرسة"</span>
                  <input
                    type="checkbox"
                    checked={selectedUserForEdit.permissions?.canPostTodaySummary ?? false}
                    onChange={(e) =>
                      setSelectedUserForEdit({
                        ...selectedUserForEdit,
                        permissions: { ...selectedUserForEdit.permissions, canPostTodaySummary: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">إلزام المنشور بالمراجعة قبل النشر</span>
                    <span className="text-[10px] text-amber-700">ترسل المنشورات للمديرة أولاً للاعتماد</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedUserForEdit.permissions?.requiresReview ?? false}
                    onChange={(e) =>
                      setSelectedUserForEdit({
                        ...selectedUserForEdit,
                        permissions: { ...selectedUserForEdit.permissions, requiresReview: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={savingUser}
                  onClick={() =>
                    handleUpdateRoleAndPermissions(
                      selectedUserForEdit,
                      selectedUserForEdit.role,
                      selectedUserForEdit.permissions
                    )
                  }
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  حفظ الصلاحيات
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
