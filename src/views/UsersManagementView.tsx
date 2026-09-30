import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserProfile,
  SchoolRole,
  PermissionKey,
  TemporaryPermission,
  UserStatus,
  ParentStudentRelationship,
  RelationshipType,
} from '../types';
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
  getParentStudentRelationships,
  linkParentToStudent,
  toggleRelationshipStatus,
  deleteRelationship,
} from '../lib/parentStudentService';
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
  HeartHandshake,
  UserPlus,
  Link,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
} from 'lucide-react';

export const UsersManagementView: React.FC = () => {
  const { user: currentUser, profile: currentProfile, hasPerm, isOwner } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [relationships, setRelationships] = useState<ParentStudentRelationship[]>([]);
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

  // Parent-Student Management Modal State
  const [managingParentUser, setManagingParentUser] = useState<UserProfile | null>(null);
  const [newRelStudentId, setNewRelStudentId] = useState<string>('');
  const [newRelType, setNewRelType] = useState<RelationshipType>('guardian');
  const [relActionLoading, setRelActionLoading] = useState(false);

  // Create User Modal State
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<SchoolRole>('parent');
  const [newUserInitialStudentId, setNewUserInitialStudentId] = useState<string>('');
  const [newUserRelType, setNewUserRelType] = useState<RelationshipType>('father');

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage = hasPerm('manageUsers') || isOwner;

  // Load all users and relationships from Supabase
  const loadUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      console.log('[UsersManagementView] Fetching users & relationships from Supabase...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[UsersManagementView] Supabase public.users query error:', error);
        throw error;
      }

      if (data && Array.isArray(data)) {
        const remoteUsers: UserProfile[] = data.map((d: any) => {
          const email = (d.email || '').trim().toLowerCase();
          const isOwnerAccount = email === 'moyara743@gmail.com';
          const isYaraAccount = email === 'yaradrashed@gmail.com';

          let role: SchoolRole = d.school_role || 'student';
          if (isOwnerAccount) {
            role = 'owner';
          } else if (role === 'owner' || isYaraAccount) {
            role = 'student';
          }

          return {
            id: d.id,
            name: d.name || 'مستخدم',
            email,
            phone: d.phone || '',
            school_role: role,
            status: d.status || 'active',
            customPermissions: isYaraAccount ? [] : (Array.isArray(d.custom_permissions) ? d.custom_permissions : []),
            temporaryPermissions: isYaraAccount ? [] : (Array.isArray(d.temporary_permissions) ? d.temporary_permissions : []),
            createdAt: d.created_at || new Date().toISOString(),
            updatedAt: d.updated_at,
          };
        });

        // Sort by role hierarchy
        remoteUsers.sort((a, b) => (ROLE_LEVELS[b.school_role] || 0) - (ROLE_LEVELS[a.school_role] || 0));
        setUsers(remoteUsers);
        dataStore.setUsers(remoteUsers);
      } else {
        setUsers([]);
        dataStore.setUsers([]);
      }

      // Fetch parent-student relationships
      const rels = await getParentStudentRelationships({ currentUser: currentProfile });
      setRelationships(rels);
    } catch (err: any) {
      console.error('[UsersManagementView] Error fetching data:', err);
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
    loadUsers();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('realtime_public_users_and_rels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parent_student_relationships' }, () => {
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

  // Open Edit User Modal
  const openEditModal = (target: UserProfile) => {
    if (!currentProfile) return;
    if (!canUserManageTarget(currentProfile, target)) {
      alert('لا يمكنك تعديل هذا المستخدم لأن رتبته مساوية أو أعلى من رتبتك أو لأنه حساب مالك النظام المحمي');
      return;
    }

    setEditingUser(target);
    const targetEmail = (target.email || '').trim().toLowerCase();
    if (targetEmail === 'yaradrashed@gmail.com') {
      setEditRole('student');
      setEditCustomPerms([]);
      setEditTempPerms([]);
    } else {
      setEditRole(target.school_role === 'owner' && targetEmail !== 'moyara743@gmail.com' ? 'student' : target.school_role);
      setEditCustomPerms(target.customPermissions ? [...target.customPermissions] : []);
      setEditTempPerms(target.temporaryPermissions ? [...target.temporaryPermissions] : []);
    }
    setEditStatus(target.status || 'active');
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

  // Save Role / Permissions Update
  const handleSaveUser = async () => {
    if (!editingUser || !currentUser || !currentProfile) return;
    const targetEmail = (editingUser.email || '').trim().toLowerCase();

    // STRICT RULE: Absolute ban on owner promotion
    if (editRole === 'owner' && targetEmail !== 'moyara743@gmail.com') {
      setErrorMessage('يمنع منعاً باتاً ومطلقاً إتاحة رتبة مالك النظام أو الترقية إليها لأي حساب آخر في الموقع.');
      return;
    }

    // STRICT RULE: yaradrashed@gmail.com is strictly student
    if (targetEmail === 'yaradrashed@gmail.com') {
      if (editRole !== 'student' || editCustomPerms.length > 0 || editTempPerms.length > 0) {
        setErrorMessage('الحساب yaradrashed@gmail.com مقيد برتبة طالبة ولا يمتلك أي صلاحيات إدارة أو ملكية.');
        return;
      }
    }

    if (editRole !== editingUser.school_role && !canAssignRole(currentProfile, editRole)) {
      setErrorMessage('لا تملكين صلاحية ترقية المستخدم لهذه الرتبة');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
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

  // Create User Handler (e.g. Parent Account)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    const email = newUserEmail.trim().toLowerCase();
    const name = newUserName.trim();

    if (!name || !email) {
      alert('يرجى كتابة الاسم والبريد الإلكتروني.');
      return;
    }

    if (newUserRole === 'owner') {
      alert('لا يمكن إنشاء حساب جديد برتبة مالك النظام.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const newUserId = crypto.randomUUID();
      const newUserProfile: UserProfile = {
        id: newUserId,
        name,
        email,
        phone: newUserPhone.trim() || undefined,
        school_role: newUserRole,
        status: 'active',
        customPermissions: [],
        temporaryPermissions: [],
        createdAt: new Date().toISOString(),
      };

      await dataStore.addUser(newUserProfile);

      // If created as parent and an initial student was selected, link them immediately
      if (newUserRole === 'parent' && newUserInitialStudentId) {
        await linkParentToStudent({
          parentId: newUserId,
          studentId: newUserInitialStudentId,
          relationshipType: newUserRelType,
          actor: currentProfile,
        });
      }

      await logActivity({
        actorId: currentProfile.id,
        actorName: currentProfile.name,
        actorEmail: currentProfile.email,
        action: 'CREATE',
        entity: 'users',
        entityId: newUserId,
        details: `إنشاء حساب جديد للمستخدم (${name}) برتبة (${ROLE_LABELS_AR[newUserRole]})`,
      });

      showToast(`تم إنشاء حساب ${name} برتبة ${ROLE_LABELS_AR[newUserRole]} بنجاح`);
      setCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserInitialStudentId('');
      await loadUsers();
    } catch (err: any) {
      console.error('[UsersManagementView] Error creating user:', err);
      setErrorMessage(err?.message || 'تعذر إنشاء المستخدم في قاعدة البيانات');
    } finally {
      setSaving(false);
    }
  };

  // Parent-Student Relationships management
  const openParentManagement = (parent: UserProfile) => {
    setManagingParentUser(parent);
    setNewRelStudentId('');
    setNewRelType('guardian');
  };

  const handleAddRelationship = async () => {
    if (!managingParentUser || !newRelStudentId || !currentProfile) return;

    setRelActionLoading(true);
    try {
      await linkParentToStudent({
        parentId: managingParentUser.id,
        studentId: newRelStudentId,
        relationshipType: newRelType,
        actor: currentProfile,
      });

      showToast('تم ربط الطالبة بولي الأمر وحفظ العلاقة في قاعدة البيانات بنجاح');
      setNewRelStudentId('');
      await loadUsers();
    } catch (err: any) {
      alert(err?.message || 'تعذر ربط الطالبة بولي الأمر');
    } finally {
      setRelActionLoading(false);
    }
  };

  const handleToggleRelStatus = async (rel: ParentStudentRelationship) => {
    if (!currentProfile) return;
    setRelActionLoading(true);
    try {
      await toggleRelationshipStatus({
        relationshipId: rel.id,
        parentId: rel.parent_user_id,
        studentId: rel.student_user_id,
        isActive: !rel.is_active,
        actor: currentProfile,
      });
      showToast(rel.is_active ? 'تم تعطيل العلاقة بنجاح' : 'تمت إعادة تفعيل العلاقة بنجاح');
      await loadUsers();
    } catch (err: any) {
      alert(err?.message || 'تعذر تحديث حالة العلاقة');
    } finally {
      setRelActionLoading(false);
    }
  };

  const handleDeleteRelationship = async (rel: ParentStudentRelationship) => {
    if (!currentProfile) return;
    if (!confirm('هل أنتِ متأكدة من حذف هذا الرابط نهائياً بين ولي الأمر والطالبة؟ لن يتم حذف حساب الطالبة أو ولي الأمر.')) {
      return;
    }

    setRelActionLoading(true);
    try {
      await deleteRelationship({
        relationshipId: rel.id,
        parentId: rel.parent_user_id,
        studentId: rel.student_user_id,
        actor: currentProfile,
      });
      showToast('تم حذف الرابط بنجاح');
      await loadUsers();
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف الرابط');
    } finally {
      setRelActionLoading(false);
    }
  };

  // Helper functions for relationship inspection
  const getLinkedStudentsForParent = (parentId: string) => {
    return relationships.filter((r) => r.parent_user_id === parentId);
  };

  const getLinkedParentsForStudent = (studentId: string) => {
    return relationships.filter((r) => r.student_user_id === studentId);
  };

  // All student profiles
  const allStudents = users.filter((u) => u.school_role === 'student');

  // Filter users with enhanced search matching parent and student names
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    let matchesSearch =
      (u.name || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query);

    // If searching for a student name, match parents linked to that student
    if (query && u.school_role === 'parent') {
      const linked = getLinkedStudentsForParent(u.id);
      if (linked.some((r) => (r.student?.name || '').toLowerCase().includes(query))) {
        matchesSearch = true;
      }
    }

    // If searching for a parent name, match students linked to that parent
    if (query && u.school_role === 'student') {
      const linked = getLinkedParentsForStudent(u.id);
      if (linked.some((r) => (r.parent?.name || '').toLowerCase().includes(query))) {
        matchesSearch = true;
      }
    }

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
          <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-700" />
            <span>{label}</span>
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
              إدارة مستخدمي ورتب مدرسة صفية بنت عمر الثانوية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed font-normal">
            التحكم في أدوار المعلمات والإداريات وأولياء الأمور والطالبات، وربط أولياء الأمور ببناتهم الطالبات مع توثيق العلاقات مباشرة في Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateUserModalOpen(true)}
            className="text-xs bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold px-4 py-2.5 rounded-2xl border border-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>+ إنشاء حساب ولي أمر / مستخدم</span>
          </button>

          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={loading}
            className="text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-3.5 py-2.5 rounded-2xl border border-white/20 flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="تحديث فوري من جدول public.users في Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-300' : ''}`} />
            <span>تحديث</span>
          </button>

          <div className="text-left bg-white/10 p-3 rounded-2xl border border-white/15 shadow-sm">
            <span className="text-[10px] text-emerald-200 block font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-amber-300" />
              <span>إجمالي المستخدمين</span>
            </span>
            <span className="text-lg font-extrabold text-amber-300">{users.length} مستخدم</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-slate-900">
        <div className="sm:col-span-2 relative">
          <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، البريد، أو اسم الطالبة المرتبطة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="all">كل الرتب والأدوار</option>
            <option value="owner">مالك النظام</option>
            <option value="director">المديرة</option>
            <option value="supervisor">المشرفة</option>
            <option value="administrator">الإدارية</option>
            <option value="counselor">المرشدة الطلابية</option>
            <option value="teacher">المعلمة</option>
            <option value="parent">ولي الأمر</option>
            <option value="student">الطالبة</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
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
          <div className="p-12 text-center text-xs text-slate-500">جارٍ تحميل بيانات المستخدمين والعلاقات...</div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                <tr>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">البريد الإلكتروني</th>
                  <th className="p-4">الرتبة والدور</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">علاقات أولياء الأمور</th>
                  <th className="p-4">صلاحيات مخصصة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => {
                  const customCount = (u.customPermissions || []).filter((p) => !p.startsWith('parent_of:')).length;
                  const isUserActive = u.status !== 'disabled';
                  const isParent = u.school_role === 'parent';
                  const isStudent = u.school_role === 'student';

                  const linkedStudents = isParent ? getLinkedStudentsForParent(u.id) : [];
                  const activeStudentCount = linkedStudents.filter((r) => r.is_active).length;
                  const linkedParents = isStudent ? getLinkedParentsForStudent(u.id) : [];

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

                      {/* Parent-Student Relationships column */}
                      <td className="p-4">
                        {isParent ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              activeStudentCount > 0 ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {activeStudentCount > 0 ? `${activeStudentCount} طالبات` : 'لا طالبات'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openParentManagement(u)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <Link className="w-3 h-3" />
                              <span>إدارة الأبناء</span>
                            </button>
                          </div>
                        ) : isStudent ? (
                          linkedParents.length > 0 ? (
                            <div className="text-[11px] text-slate-600 space-y-0.5">
                              {linkedParents.map((lp) => (
                                <span key={lp.id} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] ml-1">
                                  ولي الأمر: {lp.parent?.name || 'ولي أمر'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
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

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تعديل</span>
                          </button>
                        </div>
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

      {/* MANAGE PARENT CHILDREN MODAL */}
      {managingParentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 text-slate-900 space-y-5 animate-in fade-in">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center border border-amber-400/40">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      ربط ولي الأمر بالطالبات
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      ولي الأمر
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {managingParentUser.name} ({managingParentUser.email})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManagingParentUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Linked Students List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <span>الطالبات المرتبطات حالياً ({getLinkedStudentsForParent(managingParentUser.id).length}):</span>
              </h4>

              {getLinkedStudentsForParent(managingParentUser.id).length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500">
                  لا توجد طالبات مرتبطات بهذا الحساب حالياً. يمكنكِ إضافة طالبة من النموذج أدناه.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getLinkedStudentsForParent(managingParentUser.id).map((rel) => {
                    const student = rel.student;
                    return (
                      <div
                        key={rel.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                          rel.is_active ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/50 border-rose-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                            {student?.name?.charAt(0) || 'ط'}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{student?.name || 'طالبة'}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{student?.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                            {rel.relationship_type === 'father' ? 'أب' : rel.relationship_type === 'mother' ? 'أم' : 'ولي أمر'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleRelStatus(rel)}
                            disabled={relActionLoading}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              rel.is_active
                                ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-900 hover:bg-rose-200'
                            }`}
                          >
                            {rel.is_active ? 'نشط (تعطيل)' : 'معطل (تفعيل)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRelationship(rel)}
                            disabled={relActionLoading}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="حذف الرابط نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Student Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>ربط طالبة جديدة بولي الأمر:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    اختيار الطالبة
                  </label>
                  <select
                    value={newRelStudentId}
                    onChange={(e) => setNewRelStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="">-- اختاري الطالبة --</option>
                    {allStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    صلة القرابة
                  </label>
                  <select
                    value={newRelType}
                    onChange={(e) => setNewRelType(e.target.value as RelationshipType)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="father">أب (Father)</option>
                    <option value="mother">أم (Mother)</option>
                    <option value="guardian">ولي أمر / وصي (Guardian)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManagingParentUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={handleAddRelationship}
                  disabled={!newRelStudentId || relActionLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {relActionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ وإضافة الرابط</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER / PARENT MODAL */}
      {createUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">إنشاء حساب مستخدم / ولي أمر جديد</h3>
                  <p className="text-[11px] text-slate-500">إضافة معتمد وموثق في جدول public.users</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="مثال: خالد إبراهيم السالم"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني (Google Account)</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="parent.name@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-600"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرتبة والدور</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as SchoolRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="parent">ولي الأمر</option>
                    <option value="teacher">المعلمة</option>
                    <option value="counselor">المرشدة الطلابية</option>
                    <option value="administrator">الإدارية</option>
                    <option value="supervisor">المشرفة</option>
                    <option value="director">المديرة</option>
                    <option value="student">الطالبة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الجوال (اختياري)</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-600"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* If Parent role selected, offer immediate linking of a student */}
              {newUserRole === 'parent' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-700" />
                    <span>ربط أولي بطالبة (اختياري عند الإنشاء):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={newUserInitialStudentId}
                      onChange={(e) => setNewUserInitialStudentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-[11px] text-slate-900 cursor-pointer"
                    >
                      <option value="">-- ربط لاحقاً --</option>
                      {allStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={newUserRelType}
                      onChange={(e) => setNewUserRelType(e.target.value as RelationshipType)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-[11px] text-slate-900 cursor-pointer"
                    >
                      <option value="father">أب (Father)</option>
                      <option value="mother">أم (Mother)</option>
                      <option value="guardian">ولي أمر / وصي</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ وإنشاء الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER PERMISSIONS MODAL */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-base">
                  {editingUser.name?.charAt(0) || 'م'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    تعديل صلاحيات ورتبة المستخدم
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-bold">{editingUser.name}</span>
                    <span className="text-xs text-slate-400 font-mono">({editingUser.email})</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message inside modal */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Role & Status Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رتبة ودور المستخدم (school_role)
                </label>
                {editingUser.email?.trim().toLowerCase() === 'moyara743@gmail.com' ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900">
                    مالك النظام المحمي (لا يمكن تعديله)
                  </div>
                ) : editingUser.email?.trim().toLowerCase() === 'yaradrashed@gmail.com' ? (
                  <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700">
                    طالبة (مقيدة بدون صلاحيات إدارية)
                  </div>
                ) : (
                  <select
                    value={editRole}
                    onChange={(e) => {
                      const selected = e.target.value as SchoolRole;
                      setEditRole(selected);
                    }}
                    disabled={saving}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                  >
                    <option value="director">المديرة</option>
                    <option value="supervisor">المشرفة</option>
                    <option value="administrator">الإدارية</option>
                    <option value="counselor">المرشدة الطلابية</option>
                    <option value="teacher">المعلمة</option>
                    <option value="parent">ولي الأمر</option>
                    <option value="student">الطالبة</option>
                  </select>
                )}
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

            {/* If user is Parent, display linked children directly in edit modal too */}
            {editRole === 'parent' && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-amber-950">الطالبات المرتبطات بولي الأمر:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManagingParentUser(editingUser);
                      setEditingUser(null);
                    }}
                    className="text-[11px] text-amber-800 font-bold hover:underline cursor-pointer"
                  >
                    إدارة وتعديل الروابط ←
                  </button>
                </div>
                <div className="text-xs text-slate-600">
                  {getLinkedStudentsForParent(editingUser.id).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {getLinkedStudentsForParent(editingUser.id).map((r) => (
                        <span key={r.id} className="px-2 py-0.5 bg-white border border-amber-300 rounded-md text-[11px] text-amber-900 font-bold">
                          {r.student?.name || 'طالبة'} ({r.is_active ? 'نشط' : 'معطل'})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">لا توجد طالبات مرتبطات حتى الآن.</span>
                  )}
                </div>
              </div>
            )}

            {/* Custom Permissions Grid */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                <span>الصلاحيات المخصصة الإضافية</span>
                <span className="text-[11px] font-normal text-slate-500">
                  (تمنح امتيازات إضافية علاوة على الرتبة الأساسية)
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50/50 rounded-2xl border border-slate-100">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = editCustomPerms.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCustomPerm(perm)}
                        className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="truncate">{PERMISSION_LABELS_AR[perm] || perm}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveUser}
                disabled={saving}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ الحفظ في Supabase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>حفظ التعديلات في Supabase</span>
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
