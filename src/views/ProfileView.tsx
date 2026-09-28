import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Calendar,
  Lock,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, profile, updateUserProfile, resetPassword, effectivePermissions } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      await updateUserProfile(name.trim());
      setMsg('تم تحديث البيانات الشخصية بنجاح.');
    } catch (e: any) {
      setErr(e.message || 'حدث خطأ أثناء التحديث.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      setMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
    } catch (e: any) {
      setErr('حدث خطأ أثناء إرسال البريد.');
    }
  };

  const activeTempPerms = profile?.temporaryPermissions || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-[#064e3b] to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border-2 border-amber-400/40 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center font-black text-2xl text-amber-300 shrink-0 shadow-inner">
          {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white">{profile?.name || 'المستخدم'}</h1>
          <p className="text-xs text-emerald-200 font-mono mt-0.5">{user?.email}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-400">
              {profile?.school_role === 'owner' ? 'المديرة العامة (مالك النظام)' :
               profile?.school_role === 'director' ? 'المديرة' :
               profile?.school_role === 'supervisor' ? 'المشرفة' :
               profile?.school_role === 'administrator' ? 'الإدارية ومسؤولة النظام' :
               profile?.school_role === 'counselor' ? 'المرشدة الطلابية' :
               profile?.school_role === 'teacher' ? 'المعلمة' :
               profile?.school_role === 'student' ? 'الطالبة' :
               profile?.school_role === 'parent' ? 'ولي أمر' : 'مستخدم'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-emerald-100 border border-emerald-700/60">
              الحالة: {profile?.status === 'disabled' ? 'معطل' : 'نشط ومفعل'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Info Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-base font-extrabold text-emerald-950">البيانات الشخصية</h3>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}

        {err && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الظاهر</label>
            <div className="relative">
              <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني (الموثق)</label>
            <div className="relative">
              <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pr-10 pl-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>

        {/* Temporary Permissions Display */}
        {activeTempPerms.length > 0 && (
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h4>التكليفات والصلاحيات المؤقتة النشطة</h4>
            </div>

            <div className="space-y-2">
              {activeTempPerms.map((tp, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{tp.permission}</span>
                    <p className="text-[11px] text-slate-500">
                      سارية حتى: {tp.endDate} {tp.reason && `• ${tp.reason}`}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
                    نشط
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Reset */}
        <div className="pt-6 border-t border-slate-100 space-y-2">
          <h4 className="text-xs font-bold text-slate-900">الأمان وكلمة المرور</h4>
          <p className="text-xs text-slate-500">
            يمكنك إرسال رسالة بريد إلكتروني لإعادة تعيين كلمة المرور الخاصة بحسابك بأمان.
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-slate-200 cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <span>طلب إعادة تعيين كلمة المرور</span>
          </button>
        </div>
      </div>
    </div>
  );
};
