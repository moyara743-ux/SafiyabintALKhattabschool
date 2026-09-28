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
  RefreshCw,
  Database,
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

  // Load all users exclusively from Supabase public.users table
  const loadUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      console.log('[UsersManagementView] Fetching users exclusively from Supabase public.users table...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[UsersManagementView] Supabase public.users query error:', error);
        throw error;
      }

      if (data && Array.isArray(data)) {
        const remoteUsers: UserProfile[] = data.map((d: any) => ({
          id: d.id,
          name: d.name || 'مستخدم',
          email: (d.email || '').trim().toLowerCase(),
          school_role: d.school_role || 'student',
          status: d.status || 'active',
          customPermissions: Array.isArray(d.custom_permissions) ? d.custom_permissions : [],
          temporaryPermissions: Array.isArray(d.temporary_permissions) ? d.temporary_permissions : [],
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at,
        }));

        // Sort by role hierarchy
        remoteUsers.sort((a, b) => (ROLE_LEVELS[b.school_role] || 0) - (ROLE_LEVELS[a.school_role] || 0));
        setUsers(remoteUsers);
        dataStore.setUsers(remoteUsers);
      } else {
        setUsers([]);
        dataStore.setUsers([]);
      }
    } catch (err: any) {
      console.error('[UsersManagementView] Error fetching users from Supabase:', err);
      // Fallback only if offline, strictly filtering out any mock data
      const cached = (await dataStore.getUsers()).filter(
        (u) => u && u.id && !u.id.startsWith('00000000') && !u.id.startsWith('owner_') && !u.id.startsWith('user_')
      );
      setUsers(cached);
      setErrorMessage(err?.message || 'تعذر الاتصال المباشر بقاعدة بيانات Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Purge any legacy mock user data from localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('safiah_users');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (u: any) =>
                u &&
                u.id &&
                !u.id.startsWith('00000000') &&
                !u.id.startsWith('owner_') &&
                !u.id.startsWith('user_')
            );
            localStorage.setItem('safiah_users', JSON.stringify(cleaned));
          }
        }
      }
    } catch (e) {
      // ignore
    }

    loadUsers();

    // Subscribe to real-time postgres_changes directly on Supabase public.users table
    const channel = supabase
      .channel('realtime_public_users_management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        console.log('[UsersManagementView] Live postgres_change detected on public.users. Refreshing...');
        loadUsers();
      })
      .subscribe();

    const handleFocus = () => {
      loadUsers();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
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
      console.log(`[UsersManagementView] Saving role update for ${editingUser.name} (${editingUser.email}) to role: ${editRole}`);

      await dataStore.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
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
        details: `تحديث صلاحيات ورتبة المستخدم (${editingUser.name}) إلى (${ROLE_LABELS_AR[editRole]})`,
      });

      showToast(`تم حفظ وتحديث صلاحيات ${editingUser.name} في قاعدة البيانات بنجاح`);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error('[UsersManagementView] Error saving user permissions:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ التعديلات في قاعدة البيانات');
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
          <span className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-400 rounded-full text-xs font-bold shadow-xs">
            {label}
          </span>
        );
      case 'director':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-full text-xs font-bold shadow-xs">
            {label}
          </span>
        );
      case 'supervisor':
        return (
          <span className="px-2.5 py-1 bg-teal-100 text-teal-950 border border-teal-300 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'administrator':
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-950 border border-blue-300 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'counselor':
        return (
          <span className="px-2.5 py-1 bg-purple-100 text-purple-950 border border-purple-300 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'parent':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      case 'student':
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-full text-xs font-bold">
            {label}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            {label}
          </span>
        );
    }
  };

  if (!canManage) {
    return (
      <div
        className="p-8 text-center bg-white border border-rose-300 rounded-3xl max-w-lg mx-auto space-y-3 shadow-sm text-slate-900"
        dir="rtl"
      >
        <Lock className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">غير مصرح لك بالدخول</h2>
        <p className="text-xs text-slate-500">هذه اللوحة مخصصة لإدارة المستخدمين والصلاحيات فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-800 text-white rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-emerald-700 animate-in fade-in">
          <UserCheck className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && !editingUser && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => loadUsers()}
            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg font-bold transition-colors cursor-pointer text-[11px]"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-[#064e3b] to-emerald-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border-2 border-amber-400/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40 shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              إدارة مستخدمي ورتب مدرسة صفية بنت عمر
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed font-normal">
            التحكم في أدوار المعلمات والإداريات والطالبات، ومنح الصلاحيات المخصصة والمؤقتة وتفعيل أو تعطيل الحسابات مع حظر تصعيد الرتب غير المصرح به.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={loading}
            className="text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-3.5 py-2.5 rounded-2xl border border-white/20 flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="تحديث فوري من جدول public.users في Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-300' : ''}`} />
            <span>تحديث من Supabase</span>
          </button>

          <div className="text-left bg-white/10 p-3.5 rounded-2xl border border-white/15 shadow-sm">
            <span className="text-[11px] text-emerald-200 block font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-amber-300" />
              <span>مستخدمو public.users</span>
            </span>
            <span className="text-xl font-extrabold text-amber-300">{users.length} مستخدم</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-slate-900">
        <div className="sm:col-span-2 relative">
          <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث بالاسم أو البريد الإلكتروني..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">كل الرتب والأدوار</option>
            <option value="owner">مالك النظام</option>
            <option value="director">المديرة</option>
            <option value="supervisor">المشرفة</option>
            <option value="administrator">الإدارية</option>
            <option value="counselor">المرشدة الطلابية</option>
            <option value="teacher">المعلمة</option>
            <option value="parent">ولي أمر</option>
            <option value="student">الطالبة</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط فقط</option>
            <option value="disabled">معطل فقط</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">جارٍ تحميل بيانات المستخدمين...</div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => {
                  const customCount = (u.customPermissions || []).length;
                  const tempCount = (u.temporaryPermissions || []).length;
                  const isUserActive = u.status !== 'disabled';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                          {u.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {u.id === currentUser?.uid && (
                            <span className="text-[10px] text-emerald-700 block font-normal">
                              (حسابك الحالي)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-slate-500 font-mono text-[11px]">{u.email}</td>

                      <td className="p-4">{getRoleBadge(u.school_role)}</td>

                      <td className="p-4">
                        {isUserActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-fit">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {customCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-bold">
                            {customCount} مخصصة
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">الافتراضية</span>
                        )}
                      </td>

                      <td className="p-4">
                        {tempCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1 w-fit">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            <span>{tempCount} مؤقتة</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">لا يوجد</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-emerald-700" />
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
          <div className="p-12 text-center text-xs text-slate-500">
            {users.length === 0
              ? 'لا يوجد أي مستخدمين حالياً في جدول public.users بقاعدة بيانات Supabase.'
              : 'لم يتم العثور على مستخدمين يطابقون شروط البحث الحالية.'}
          </div>
        )}
      </div>

      {/* EDIT USER PERMISSIONS MODAL */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl text-slate-900 my-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 border border-amber-300 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    تعديل صلاحيات ورتبة: {editingUser.name}
                  </h3>
                  <p className="text-xs text-slate-500">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {errorMessage}
              </div>
            )}

            {/* Role and Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الرتبة المدرسية الرسمية
                </label>
                <select
                  id="user-edit-role-select"
                  value={editRole}
                  onChange={(e) => {
                    const selected = e.target.value as SchoolRole;
                    console.log('[UsersManagementView] Role selected:', selected);
                    setEditRole(selected);
                  }}
                  disabled={saving}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  {isOwner && (
                    <option value="owner">
                      مالك النظام (المديرة العامة)
                    </option>
                  )}
                  <option value="director">المديرة</option>
                  <option value="supervisor">المشرفة</option>
                  <option value="administrator">الإدارية</option>
                  <option value="counselor">المرشدة الطلابية</option>
                  <option value="teacher">المعلمة</option>
                  <option value="parent">ولي أمر</option>
                  <option value="student">الطالبة</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  تحدد الصلاحيات التلقائية وفق مصفوفة أدوار مدرسة صفية بنت عمر المعتمدة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  حالة الحساب في المنصة
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="active">حساب نشط ومفعل</option>
                  <option value="disabled">حساب معطل (ممنوع من الوصول)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  الحساب المعطل يتم حظره فوراً ولا يمكنه إجراء أي عملية كتابة أو قراءة خاصة.
                </p>
              </div>
            </div>

            {/* Granular Custom Permissions */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">الصلاحيات المخصصة (Custom Permissions)</h4>
                <p className="text-[11px] text-slate-500">
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
                      className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-xs cursor-pointer ${
                        isGranted
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="block font-bold">{label}</span>
                        <span className="font-mono text-[10px] text-slate-400">{key}</span>
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
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-900">الصلاحيات المؤقتة (بفترة زمنية محددة)</h4>
              <p className="text-[11px] text-slate-500">
                تمنح المستخدم إذناً ينتهي مفعوله تلقائياً عند انقضاء التاريخ المحدد (مثل تكليف أسبوعي أو شهري).
              </p>

              {/* Add inline form */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">الصلاحية</label>
                    <select
                      value={newTempKey}
                      onChange={(e) => setNewTempKey(e.target.value as PermissionKey)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                    >
                      {ALL_PERMISSIONS.map((k) => (
                        <option key={k} value={k}>
                          {PERMISSION_LABELS_AR[k] || k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={newTempStart}
                      onChange={(e) => setNewTempStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={newTempEnd}
                      onChange={(e) => setNewTempEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddTempPerm}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-emerald-900"
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
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-900 font-mono">
                          {PERMISSION_LABELS_AR[t.permission] || t.permission}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          من {t.startDate} حتى {t.endDate}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTempPerm(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
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
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md border border-emerald-900 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
