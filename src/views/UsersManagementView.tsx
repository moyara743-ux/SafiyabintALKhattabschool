import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, SchoolRole, PermissionKey, TemporaryPermission, UserStatus } from '../types';
import { supabase } from '../supabaseClient';
import { dataStore } from '../lib/dataStore';
import {
  ROLE_LEVELS,
  ROLE_LABELS_AR,
  PERMISSION_LABELS_AR,
  ALL_PERMISSIONS,
  canUserManageTarget,
  canAssignRole,
} from '../lib/permissions';
import { logActivity } from '../lib/activityLogger';
import { getTodayDateString } from '../lib/dateUtils';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Check,
  X,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';

export const UsersManagementView: React.FC = () => {
  const { user: currentUser, profile: currentProfile, hasPerm, isOwner } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<SchoolRole>('teacher');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editCustomPerms, setEditCustomPerms] = useState<PermissionKey[]>([]);
  const [editTempPerms, setEditTempPerms] = useState<TemporaryPermission[]>([]);

  // Add Temp Perm inline form state
  const [newTempKey, setNewTempKey] = useState<PermissionKey>('createPosts');
  const [newTempStart, setNewTempStart] = useState(getTodayDateString());
  const [newTempEnd, setNewTempEnd] = useState(getTodayDateString());

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage = hasPerm('manageUsers') || isOwner;

  // Load all users from Supabase users table
  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await dataStore.getUsers();
      // Sort by role hierarchy
      list.sort((a, b) => (ROLE_LEVELS[b.school_role] || 0) - (ROLE_LEVELS[a.school_role] || 0));
      setUsers(list);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setErrorMessage('فشل في جلب قائمة المستخدمين من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    // Subscribe to real-time updates from dataStore for instant reflection of new users
    const unsub = dataStore.subscribe<UserProfile[]>('users', (updatedList) => {
      if (updatedList && Array.isArray(updatedList) && updatedList.length > 0) {
        const sorted = [...updatedList].sort(
          (a, b) => (ROLE_LEVELS[b.school_role] || 0) - (ROLE_LEVELS[a.school_role] || 0)
        );
        setUsers(sorted);
      }
    });

    const handleFocus = () => {
      loadUsers();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsub();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openEditModal = (target: UserProfile) => {
    if (!currentProfile) return;
    if (!canUserManageTarget(currentProfile, target)) {
      alert('لا يمكنك تعديل هذا المستخدم لأن رتبته مساوية أو أعلى من رتبتك');
      return;
    }

    setEditingUser(target);
    setEditRole(target.school_role);
    setEditStatus(target.status || 'active');
    setEditCustomPerms(target.customPermissions ? [...target.customPermissions] : []);
    setEditTempPerms(target.temporaryPermissions ? [...target.temporaryPermissions] : []);
    setErrorMessage(null);
  };

  const handleToggleCustomPerm = (perm: PermissionKey) => {
    setEditCustomPerms((prev) => {
      if (prev.includes(perm)) {
        return prev.filter((p) => p !== perm);
      } else {
        return [...prev, perm];
      }
    });
  };

  const handleAddTempPerm = () => {
    if (!newTempKey || !newTempStart || !newTempEnd) {
      alert('يرجى تحديد الصلاحية وتاريخ البداية والنهاية');
      return;
    }
    const newEntry: TemporaryPermission = {
      permission: newTempKey,
      startDate: newTempStart,
      endDate: newTempEnd,
    };
    setEditTempPerms([...editTempPerms, newEntry]);
  };

  const handleRemoveTempPerm = (index: number) => {
    setEditTempPerms(editTempPerms.filter((_, i) => i !== index));
  };

  const handleSaveUser = async () => {
    if (!editingUser || !currentUser || !currentProfile) return;

    if (editRole !== editingUser.school_role && !canAssignRole(currentProfile, editRole)) {
      setErrorMessage('لا تملكين صلاحية ترقية المستخدم لهذه الرتبة');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await dataStore.updateUser(editingUser.id, {
        school_role: editRole,
        status: editStatus,
        customPermissions: editCustomPerms,
      });

      // Audit Log
      await logActivity({
        actorId: currentUser.id || currentUser.uid,
        actorName: currentProfile.name,
        actorEmail: currentUser.email || '',
        action: 'UPDATE_ROLE',
        entity: 'users',
        entityId: editingUser.id,
        oldValue: `${ROLE_LABELS_AR[editingUser.school_role]} (${editingUser.status})`,
        newValue: `${ROLE_LABELS_AR[editRole]} (${editStatus})`,
        details: `تحديث صلاحيات ورتبة المستخدم (${editingUser.name})`,
      });

      showToast(`تم حفظ وتحديث صلاحيات ${editingUser.name} بنجاح`);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Error saving user permissions:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.school_role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: SchoolRole) => {
    const label = ROLE_LABELS_AR[role] || role;
    switch (role) {
      case 'owner':
        return (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'director':
        return (
          <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'supervisor':
        return (
          <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'administrator':
        return (
          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'counselor':
        return (
          <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'student':
        return (
          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-bold">
            {label}
          </span>
        );
    }
  };

  if (!canManage) {
    return (
      <div
        className="p-8 text-center bg-slate-900 border border-rose-800 rounded-3xl max-w-lg mx-auto space-y-3"
        dir="rtl"
      >
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">غير مصرح لك بالدخول</h2>
        <p className="text-xs text-slate-400">هذه اللوحة مخصصة لإدارة المستخدمين والصلاحيات فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              إدارة مستخدمي ورتب مدرسة صفية بنت عمر
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            التحكم في أدوار المعلمات والإداريات والطالبات، ومنح الصلاحيات المخصصة والمؤقتة وتفعيل أو تعطيل الحسابات مع حظر تصعيد الرتب غير المصرح به.
          </p>
        </div>

        <div className="text-left bg-slate-900/60 p-3 rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 block">إجمالي المستخدمين</span>
          <span className="text-xl font-extrabold text-emerald-400">{users.length} مستخدم</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="sm:col-span-2 relative">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="البحث بالاسم أو البريد الإلكتروني..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">كل الرتب والأدوار</option>
            <option value="owner">مالك النظام</option>
            <option value="director">المديرة</option>
            <option value="supervisor">المشرفة</option>
            <option value="administrator">الإدارية</option>
            <option value="counselor">المرشدة الطلابية</option>
            <option value="teacher">المعلمة</option>
            <option value="student">الطالبة</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط فقط</option>
            <option value="disabled">معطل فقط</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">جارٍ تحميل بيانات المستخدمين...</div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">البريد الإلكتروني</th>
                  <th className="p-4">الرتبة والدور</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">صلاحيات مخصصة</th>
                  <th className="p-4">صلاحيات مؤقتة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredUsers.map((u) => {
                  const customCount = (u.customPermissions || []).length;
                  const tempCount = (u.temporaryPermissions || []).length;
                  const isUserActive = u.status !== 'disabled';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {u.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {u.id === currentUser?.uid && (
                            <span className="text-[10px] text-emerald-400 block font-normal">
                              (حسابك الحالي)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-slate-400 font-mono text-[11px]">{u.email}</td>

                      <td className="p-4">{getRoleBadge(u.school_role)}</td>

                      <td className="p-4">
                        {isUserActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                            <UserCheck className="w-3 h-3" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit">
                            <UserX className="w-3 h-3" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {customCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                            {customCount} مخصصة
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">الافتراضية</span>
                        )}
                      </td>

                      <td className="p-4">
                        {tempCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center gap-1 w-fit">
                            <Calendar className="w-3 h-3" />
                            <span>{tempCount} مؤقتة</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">لا يوجد</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 border border-slate-700"
                        >
                          <Edit className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تعديل الصلاحيات</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            لم يتم العثور على مستخدمين يطابقون شروط البحث.
          </div>
        )}
      </div>

      {/* EDIT USER PERMISSIONS MODAL */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl text-white my-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    تعديل صلاحيات ورتبة: {editingUser.name}
                  </h3>
                  <p className="text-xs text-slate-400">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Role and Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  الرتبة المدرسية الرسمية
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as SchoolRole)}
                  disabled={!isOwner && editRole === 'owner'}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {isOwner && <option value="owner">مالك النظام (المديرة العامة)</option>}
                  <option value="director">المديرة</option>
                  <option value="supervisor">المشرفة</option>
                  <option value="administrator">الإدارية</option>
                  <option value="counselor">المرشدة الطلابية</option>
                  <option value="teacher">المعلمة</option>
                  <option value="student">الطالبة</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  تحدد الصلاحيات التلقائية وفق مصفوفة أدوار مدرسة صفية بنت عمر المعتمدة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  حالة الحساب في المنصة
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">حساب نشط ومفعل</option>
                  <option value="disabled">حساب معطل (ممنوع من الوصول)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  الحساب المعطل يتم حظره فوراً ولا يمكنه إجراء أي عملية كتابة أو قراءة خاصة.
                </p>
              </div>
            </div>

            {/* Granular Custom Permissions */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div>
                <h4 className="text-xs font-extrabold text-white">الصلاحيات المخصصة (Custom Permissions)</h4>
                <p className="text-[11px] text-slate-400">
                  يمكنك منح صلاحيات استثنائية محددة للمستخدم تتجاوز رتبته الأساسية.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_PERMISSIONS.map((key) => {
                  const isGranted = editCustomPerms.includes(key);
                  const label = PERMISSION_LABELS_AR[key] || key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handleToggleCustomPerm(key)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-xs ${
                        isGranted
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                      }`}
                    >
                      <div>
                        <span className="block font-bold">{label}</span>
                        <span className="font-mono text-[10px] text-slate-500">{key}</span>
                      </div>
                      <span className="text-[10px] font-bold">
                        {isGranted ? 'ممنوحة' : 'افتراضي'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temporary Permissions */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-extrabold text-white">الصلاحيات المؤقتة (بفترة زمنية محددة)</h4>
              <p className="text-[11px] text-slate-400">
                تمنح المستخدم إذناً ينتهي مفعوله تلقائياً عند انقضاء التاريخ المحدد (مثل تكليف أسبوعي أو شهري).
              </p>

              {/* Add inline form */}
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الصلاحية</label>
                    <select
                      value={newTempKey}
                      onChange={(e) => setNewTempKey(e.target.value as PermissionKey)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      {ALL_PERMISSIONS.map((k) => (
                        <option key={k} value={k}>
                          {PERMISSION_LABELS_AR[k] || k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={newTempStart}
                      onChange={(e) => setNewTempStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={newTempEnd}
                      onChange={(e) => setNewTempEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddTempPerm}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة تكليف مؤقت</span>
                  </button>
                </div>
              </div>

              {/* Active Temp Perms List */}
              {editTempPerms.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {editTempPerms.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-300 font-mono">
                          {PERMISSION_LABELS_AR[t.permission] || t.permission}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          من {t.startDate} حتى {t.endDate}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTempPerm(idx)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="إلغاء التكليف المؤقت"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span>جارٍ الحفظ والتحقق من الخادم...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>حفظ واعتماد التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
