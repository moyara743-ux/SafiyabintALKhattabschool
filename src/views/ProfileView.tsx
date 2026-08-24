import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Shield, CheckCircle2, AlertCircle, Save, KeyRound, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export const ProfileView: React.FC = () => {
  const { user, profile, updateUserProfile, isOwner, resetPassword } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      await updateUserProfile(displayName.trim());
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-bold text-2xl text-amber-300">
          {profile?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-xl font-extrabold font-serif text-white">{profile?.displayName || 'المستخدم'}</h1>
          <p className="text-xs text-emerald-200 font-mono mt-0.5">{user?.email}</p>
          <div className="mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {profile?.role === 'owner' ? 'المديرة والمالكة الرئيسية' :
               profile?.role === 'admin' ? 'مشرفة إدارية' :
               profile?.role === 'teacher' ? 'معلمة' :
               profile?.role === 'editor' ? 'محررة محتوى' : 'عضو مسجل'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Edit Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900">إعدادات الحساب والبيانات الشخصية</h3>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}

        {err && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكريم</label>
            <div className="relative">
              <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني (محمي)</label>
            <div className="relative">
              <Mail className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pr-10 pl-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              البريد الإلكتروني موثق في قاعدة البيانات ولا يظهر للعامة.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
          </div>
        </form>

        <div className="pt-6 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-800 mb-2">الأمان وكلمة المرور</h4>
          <p className="text-xs text-slate-500 mb-3">
            يمكنك إرسال رابط لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني المسجل.
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-slate-600" />
            <span>طلب إعادة تعيين كلمة المرور</span>
          </button>
        </div>
      </div>
    </div>
  );
};
