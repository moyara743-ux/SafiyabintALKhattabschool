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
      <div className="bg-gradient-to-l from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-2xl text-emerald-300 shrink-0">
          {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white">{profile?.name || 'المستخدم'}</h1>
          <p className="text-xs text-slate-300 font-mono mt-0.5">{user?.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {profile?.school_role === 'owner' ? 'المديرة العامة (مالك النظام)' :
               profile?.school_role === 'admin' ? 'إدارية ومسؤولة نظام' :
               profile?.school_role === 'teacher' ? 'معلمة' :
               profile?.school_role === 'student' ? 'طالبة' :
               profile?.school_role === 'parent' ? 'ولي أمر' : 'زائر'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              الحالة: {profile?.status === 'disabled' ? 'معطل' : 'نشط ومفعل'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Info Form */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-6">
        <h3 className="text-base font-extrabold text-white">البيانات الشخصية</h3>

        {msg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{msg}</span>
          </div>
        )}

        {err && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الظاهر</label>
            <div className="relative">
              <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني (الموثق)</label>
            <div className="relative">
              <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pr-10 pl-3.5 py-2.5 text-xs bg-slate-800/50 border border-slate-800 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>

        {/* Temporary Permissions Display */}
        {activeTempPerms.length > 0 && (
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Calendar className="w-4 h-4" />
              <h4>التكليفات والصلاحيات المؤقتة النشطة</h4>
            </div>

            <div className="space-y-2">
              {activeTempPerms.map((tp, idx) => (
                <div key={idx} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white font-mono">{tp.permission}</span>
                    <p className="text-[11px] text-slate-400">
                      سارية حتى: {tp.endDate} {tp.reason && `• ${tp.reason}`}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">
                    نشط
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Reset */}
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-white">الأمان وكلمة المرور</h4>
          <p className="text-xs text-slate-400">
            يمكنك إرسال رسالة بريد إلكتروني لإعادة تعيين كلمة المرور الخاصة بحسابك بأمان.
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700"
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>طلب إعادة تعيين كلمة المرور</span>
          </button>
        </div>
      </div>
    </div>
  );
};
