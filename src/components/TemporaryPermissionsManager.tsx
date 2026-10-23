import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DelegatedPermission,
  getDelegatedPermissions,
  grantTemporaryPermission,
  updateDelegationDuration,
  revokeDelegatedPermission,
  getPermissibleDelegationsForActor,
  canActorDelegatePermissions,
  computeDelegationStatus,
} from '../lib/delegatedPermissionsService';
import { UserProfile, PermissionKey, SchoolRole } from '../types';
import { dataStore } from '../lib/dataStore';
import { PERMISSION_LABELS_AR, ROLE_LABELS_AR } from '../lib/permissions';
import {
  Shield,
  KeyRound,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Trash2,
  Edit,
  History,
  Lock,
  User,
  Users,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const TemporaryPermissionsManager: React.FC = () => {
  const { user, profile } = useAuth();
  const [delegations, setDelegations] = useState<DelegatedPermission[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'expired' | 'revoked' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Grant Modal States
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPerm, setSelectedPerm] = useState<PermissionKey>('createPosts');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [endTime, setEndTime] = useState('16:00');
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  // Extend Modal States
  const [delegationToExtend, setDelegationToExtend] = useState<DelegatedPermission | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [newEndTime, setNewEndTime] = useState('16:00');
  const [extendReason, setExtendReason] = useState('');
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  // Revoke Modal States
  const [delegationToRevoke, setDelegationToRevoke] = useState<DelegatedPermission | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Feedback notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canManage = canActorDelegatePermissions(profile);
  const allowedPerms = getPermissibleDelegationsForActor(profile);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allDel, allUsers] = await Promise.all([
        getDelegatedPermissions(),
        dataStore.getUsers(),
      ]);

      // Filter out System Owner, current Director, and yaradrashed from beneficiary options
      const cleanUsers = allUsers.filter((u) => {
        const email = (u.email || '').toLowerCase().trim();
        return (
          email !== 'moyara743@gmail.com' &&
          u.school_role !== 'system_owner' &&
          email !== 'yaradrashed@gmail.com' &&
          u.status !== 'disabled'
        );
      });

      setDelegations(allDel);
      setAvailableUsers(cleanUsers);
      if (cleanUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(cleanUsers[0].id);
      }
    } catch (err) {
      console.error('[TemporaryPermissionsManager] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      loadData();
    }
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2" dir="rtl">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700">الصلاحيات الإضافية والتفويض المؤقت</h4>
        <p className="text-xs text-slate-500">
          تقتصر إدارة الصلاحيات الإضافية على مالك النظام والمديرة والمشرفة المعتمدة.
        </p>
      </div>
    );
  }

  // Count stats
  const activeCount = delegations.filter((d) => d.status === 'active').length;
  const pendingCount = delegations.filter((d) => d.status === 'pending').length;
  const expiredCount = delegations.filter((d) => d.status === 'expired').length;
  const revokedCount = delegations.filter((d) => d.status === 'revoked').length;

  // Filtered list
  const filteredList = delegations.filter((item) => {
    if (activeTab !== 'history' && item.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.userName.toLowerCase().includes(q);
      const matchEmail = item.userEmail.toLowerCase().includes(q);
      const matchPerm = (PERMISSION_LABELS_AR[item.permission] || item.permission).toLowerCase().includes(q);
      const matchReason = item.reason.toLowerCase().includes(q);
      return matchName || matchEmail || matchPerm || matchReason;
    }
    return true;
  });

  // Handle Grant Submit
  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setGrantError(null);

    const beneficiary = availableUsers.find((u) => u.id === selectedUserId);
    if (!beneficiary) {
      setGrantError('يرجى اختيار الموظفة المستفيدة.');
      return;
    }

    if (!grantReason.trim()) {
      setGrantError('يرجى كتابة سبب واضح لمنح الصلاحية المؤقتة.');
      return;
    }

    setGranting(true);
    try {
      await grantTemporaryPermission({
        userId: beneficiary.id,
        userName: beneficiary.name,
        userEmail: beneficiary.email,
        userRole: beneficiary.school_role,
        permission: selectedPerm,
        startDate,
        startTime,
        endDate,
        endTime,
        reason: grantReason.trim(),
        actor: profile,
      });

      showToast(`تم منح صلاحية (${PERMISSION_LABELS_AR[selectedPerm] || selectedPerm}) للموظفة ${beneficiary.name} بنجاح.`);
      setShowGrantModal(false);
      setGrantReason('');
      await loadData();
    } catch (err: any) {
      setGrantError(err?.message || 'تعذر منح الصلاحية المؤقتة.');
    } finally {
      setGranting(false);
    }
  };

  // Handle Extend Submit
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !delegationToExtend) return;
    setExtendError(null);

    setExtending(true);
    try {
      await updateDelegationDuration({
        delegationId: delegationToExtend.id,
        newEndDate,
        newEndTime,
        actor: profile,
        reason: extendReason.trim(),
      });

      showToast(`تم تحديث مدة الصلاحية حتى ${newEndDate} ${newEndTime} بنجاح.`);
      setDelegationToExtend(null);
      setExtendReason('');
      await loadData();
    } catch (err: any) {
      setExtendError(err?.message || 'تعذر تعديل مدة الصلاحية.');
    } finally {
      setExtending(false);
    }
  };

  // Handle Revoke Submit
  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !delegationToRevoke) return;
    setRevokeError(null);

    if (!revokeReason.trim()) {
      setRevokeError('يرجى كتابة سبب الإلغاء والسحب.');
      return;
    }

    setRevoking(true);
    try {
      await revokeDelegatedPermission({
        delegationId: delegationToRevoke.id,
        actor: profile,
        reason: revokeReason.trim(),
      });

      showToast(`تم إلغاء وسحب الصلاحية من ${delegationToRevoke.userName} بنجاح.`);
      setDelegationToRevoke(null);
      setRevokeReason('');
      await loadData();
    } catch (err: any) {
      setRevokeError(err?.message || 'تعذر إلغاء الصلاحية.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="bg-white border-2 border-indigo-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6" dir="rtl">
      {/* Toast message */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>نظام الصلاحيات الإضافية والتفويض المؤقت</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[11px] font-black border border-indigo-200">
                  فصل الصلاحيات عن الدور
                </span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mt-0.5">
                تمنح الموظفة صلاحيات إضافية محددة لفترة زمنية مؤقتة (تاريخ ووقت بداية ونهاية) مع بقاء دورها الأساسي ثابتاً، وتنتهي تلقائياً دون التأثير على حسابها.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setGrantError(null);
            setShowGrantModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ منح صلاحية إضافية مؤقتة</span>
        </button>
      </div>

      {/* Stats Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`p-3.5 rounded-2xl border transition-all text-right cursor-pointer ${
            activeTab === 'active'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-600">نشطة حالياً</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-emerald-900">{activeCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`p-3.5 rounded-2xl border transition-all text-right cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-600">لم تبدأ بعد (مجدولة)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900">{pendingCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expired')}
          className={`p-3.5 rounded-2xl border transition-all text-right cursor-pointer ${
            activeTab === 'expired'
              ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-300'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-600">منتهية الصلاحية</span>
            <span className="text-[10px] text-slate-400 font-mono">انتهت</span>
          </div>
          <div className="text-xl font-black text-slate-700">{expiredCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revoked')}
          className={`p-3.5 rounded-2xl border transition-all text-right cursor-pointer ${
            activeTab === 'revoked'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-600">ملغاة ومسحوبة</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-800">{revokedCount}</div>
        </button>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'active' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            النشطة ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pending' ? 'bg-white text-amber-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المجدولة ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'expired' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المنتهية ({expiredCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('revoked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'revoked' ? 'bg-white text-rose-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الملغاة ({revokedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'history' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>السجل الكامل ({delegations.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الصلاحية أو السبب..."
            className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Delegations List Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 space-y-2">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <span>جارٍ تحميل مصفوفة الصلاحيات المؤقتة...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-600">لا توجد صلاحيات مسجلة ضمن هذا القسم حالياً.</p>
          <p className="text-[11px] text-slate-400">يمكنك الضغط على زر [+ منح صلاحية إضافية مؤقتة] بالأعلى لإنشاء تكليف جديد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const isLive = item.status === 'active';
            const isPending = item.status === 'pending';
            const isExpired = item.status === 'expired';
            const isRevoked = item.status === 'revoked';

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 relative flex flex-col justify-between ${
                  isLive
                    ? 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-300 shadow-sm'
                    : isPending
                    ? 'bg-gradient-to-br from-amber-50/70 to-white border-amber-300 shadow-xs'
                    : isRevoked
                    ? 'bg-rose-50/40 border-rose-200 opacity-90'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold text-xs">
                        {item.userName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{item.userName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                            الدور الأساسي: {ROLE_LABELS_AR[item.userRole] || item.userRole}
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          {item.userEmail}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>نشطة حالياً</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>تبدأ قريباً</span>
                      </span>
                    )}
                    {isExpired && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                        <span>منتهية</span>
                      </span>
                    )}
                    {isRevoked && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <span>ملغاة ومسحوبة</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Delegated Permission Detail */}
                <div className="p-3 bg-white/90 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">الصلاحية الإضافية الممنوحة:</span>
                    <span className="font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {PERMISSION_LABELS_AR[item.permission] || item.permission}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-700">السبب والغرض: </span>
                    <span>{item.reason}</span>
                  </div>
                </div>

                {/* Duration & Interval */}
                <div className="text-[11px] text-slate-600 space-y-1 bg-slate-100/60 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>تاريخ البداية:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {item.startDate} ({item.startTime})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>تاريخ النهاية:</span>
                    </span>
                    <span className="font-mono font-black text-rose-900">
                      {item.endDate} ({item.endTime})
                    </span>
                  </div>
                </div>

                {/* Metadata & Granter */}
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>منحها: {item.grantedBy} ({ROLE_LABELS_AR[item.grantedByRole] || item.grantedByRole})</span>
                  <span>بتاريخ: {new Date(item.grantedAt).toLocaleDateString('ar-SA')}</span>
                </div>

                {/* Revocation notice if revoked */}
                {isRevoked && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 space-y-0.5">
                    <span className="font-bold">أُلغيت بواسطة: {item.revokedBy}</span>
                    <p>السبب: {item.revocationReason}</p>
                  </div>
                )}

                {/* Action Controls (Extend / Revoke) */}
                {(isLive || isPending) && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setExtendError(null);
                        setNewEndDate(item.endDate);
                        setNewEndTime(item.endTime);
                        setExtendReason('');
                        setDelegationToExtend(item);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit className="w-3 h-3 text-slate-600" />
                      <span>تعديل / تمديد المدة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRevokeError(null);
                        setRevokeReason('');
                        setDelegationToRevoke(item);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>إلغاء مبكر (سحب الإذن)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 1: منح صلاحية إضافية مؤقتة (Grant Modal)                     */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    منح صلاحية إضافية مؤقتة لموظفة
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    لا يتغير الدور الأساسي للموظفة وتنتهي الصلاحية تلقائياً
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {grantError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{grantError}</span>
              </div>
            )}

            <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs">
              {/* Beneficiary selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. الموظفة المستفيدة (المعلمة / الإدارية / المرشدة):
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer font-bold"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — ({ROLE_LABELS_AR[u.school_role] || u.school_role}) [{u.email}]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  ملاحظة أمنية: يمنع منح صلاحيات إضافية لحساب مالك النظام أو المديرة أو النفس.
                </p>
              </div>

              {/* Permission selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. الصلاحية المطلوبة:
                </label>
                <select
                  value={selectedPerm}
                  onChange={(e) => setSelectedPerm(e.target.value as PermissionKey)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer font-bold"
                >
                  {allowedPerms.map((perm) => (
                    <option key={perm} value={perm}>
                      {PERMISSION_LABELS_AR[perm] || perm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Dates & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">بداية الصلاحية:</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نهاية الصلاحية (انتهاء تلقائي):</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. سبب المنح والتكليف (للتوثيق وسجل التدقيق):
                </label>
                <textarea
                  required
                  rows={2}
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="مثال: تكليف بتغطية فعاليات أسبوع النشاط وإدارة قسم الأخبار"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-xl shadow cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {granting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>اعتماد ومنح الصلاحية</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 2: تعديل وتمديد المدة (Extend Modal)                          */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {delegationToExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                تمديد / تعديل مدة الصلاحية المؤقتة
              </h3>
              <button
                type="button"
                onClick={() => setDelegationToExtend(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {extendError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {extendError}
              </div>
            )}

            <form onSubmit={handleExtendSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">المستفيدة: {delegationToExtend.userName}</div>
                <div className="text-slate-500">
                  الصلاحية: {PERMISSION_LABELS_AR[delegationToExtend.permission] || delegationToExtend.permission}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ النهاية الجديد:</label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وقت النهاية:</label>
                <input
                  type="time"
                  required
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب التعديل / التمديد:</label>
                <input
                  type="text"
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="مثال: تمديد الفعاليات ليومين إضافيين"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDelegationToExtend(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  {extending ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 3: إلغاء مبكر وسحب الصلاحية (Revoke Modal)                   */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {delegationToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-slate-900 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>إلغاء مبكر وسحب الصلاحية المؤقتة</span>
              </div>
              <button
                type="button"
                onClick={() => setDelegationToRevoke(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {revokeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {revokeError}
              </div>
            )}

            <form onSubmit={handleRevokeSubmit} className="space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                هل أنتِ متأكدة من رغبتك في سحب صلاحية (
                <strong>{PERMISSION_LABELS_AR[delegationToRevoke.permission] || delegationToRevoke.permission}</strong>)
                فوراً من الموظفة: <strong>{delegationToRevoke.userName}</strong>؟
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  سبب الإلغاء (يُسجل في سجل التدقيق):
                </label>
                <textarea
                  required
                  rows={2}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="مثال: انتهاء المهمة قبل موعدها / سحب الإذن"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDelegationToRevoke(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  disabled={revoking}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {revoking ? 'جارٍ السحب...' : 'تأكيد سحب الصلاحية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
