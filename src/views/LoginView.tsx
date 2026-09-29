import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Shield,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserPlus,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { OWNER_EMAIL } from '../data/initialData';

export const LoginView: React.FC = () => {
  const { loginWithGoogleAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom account entry mode
  const [showCustomAccount, setShowCustomAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fast direct login with a selected Google account
  const handleSelectAccount = async (email: string, name?: string) => {
    setError(null);
    setSelectedEmail(email);
    setLoading(true);
    setSuccessMsg('جارٍ التحقق من حساب Google وتخزين البيانات في Supabase...');

    try {
      await loginWithGoogleAccount(email, name);
      // Navigation happens automatically as user state updates in AuthContext!
    } catch (err: any) {
      console.error('[Google Login] Error:', err);
      setError(err?.message || 'تعذر تسجيل الدخول ومزامنة الحساب مع Supabase. يرجى المحاولة مجدداً.');
      setLoading(false);
      setSelectedEmail(null);
      setSuccessMsg(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = customEmail.trim().toLowerCase();
    if (!email) {
      setError('يرجى إدخال عنوان بريد Google.');
      return;
    }
    if (!email.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صالح (مثال: name@gmail.com).');
      return;
    }

    setLoading(true);
    setSelectedEmail(email);
    setSuccessMsg('جارٍ التحقق من بيانات حساب Google وتخزينها في Supabase...');

    try {
      await loginWithGoogleAccount(email, customName.trim());
    } catch (err: any) {
      console.error('[Google Login] Error:', err);
      setError(err?.message || 'تعذر إتمام الدخول والمزامنة مع Supabase.');
      setLoading(false);
      setSelectedEmail(null);
      setSuccessMsg(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden"
      dir="rtl"
    >
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Identity Ribbon */}
      <header className="py-4 px-6 sm:px-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-white">
                مدرسة صفية بنت عمر الابتدائية
              </h1>
              <p className="text-[11px] text-emerald-400 font-medium">المنصة المدرسية الرسمية</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>نصنع المعرفة... ونوثق الإنجاز</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-14 relative z-10">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Card Top Title with Google Official Logo */}
          <div className="text-center space-y-3">
            {/* Google Multicolor 'G' Emblem */}
            <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/50 border border-slate-200">
              <svg className="w-9 h-9" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-0.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-full">
                بوابة الدخول الموحد (Google Sign-In)
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                اختيار حساب للمتابعة
              </h2>
            </div>

            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              اختر حساب Google الخاص بك للدخول المباشر؛ يتم التحقق وتخزين بريدك فوراً في Supabase دون الحاجة لإعدادات خارجية.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block mb-0.5">تنبيه:</span>
                {error}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
              <div className="leading-relaxed font-bold">{successMsg}</div>
            </div>
          )}

          {/* Simplified Google Accounts List */}
          {!showCustomAccount ? (
            <div className="space-y-2.5 pt-1">
              {/* Account 1: System Owner */}
              <button
                type="button"
                onClick={() => handleSelectAccount(OWNER_EMAIL, 'يارا محمد راشد - مالك النظام')}
                disabled={loading}
                className="w-full text-right p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border-2 border-emerald-500/40 hover:border-emerald-500 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md border border-emerald-300/40 shrink-0">
                    ي
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors">
                        يارا محمد راشد
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        مالك النظام 👑
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono block mt-0.5">
                      {OWNER_EMAIL}
                    </span>
                  </div>
                </div>

                {loading && selectedEmail === OWNER_EMAIL ? (
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:-translate-x-1" />
                )}
              </button>

              {/* Account 2: Student Account */}
              <button
                type="button"
                onClick={() => handleSelectAccount('yaradrashed@gmail.com', 'منال علي')}
                disabled={loading}
                className="w-full text-right p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-teal-500/60 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md border border-teal-300/40 shrink-0">
                    م
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white group-hover:text-teal-300 transition-colors">
                        منال علي
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        طالبة 🎓
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono block mt-0.5">
                      yaradrashed@gmail.com
                    </span>
                  </div>
                </div>

                {loading && selectedEmail === 'yaradrashed@gmail.com' ? (
                  <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:-translate-x-1" />
                )}
              </button>

              {/* Option 3: Use Another Google Account */}
              <button
                type="button"
                onClick={() => setShowCustomAccount(true)}
                disabled={loading}
                className="w-full p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-dashed border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center gap-2.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>استخدام حساب Google آخر (Use another account)</span>
              </button>
            </div>
          ) : (
            /* Custom Account Form (Google-styled clean input) */
            <form onSubmit={handleCustomSubmit} className="space-y-4 pt-1 animate-in fade-in">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    البريد الإلكتروني لحساب Google
                  </label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الاسم الكامل (اختياري)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="مثال: نورة عبدالله"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    كلمة مرور حساب Google
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-2.5 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomAccount(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  الرجوع للحسابات
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>تسجيل الدخول والمتابعة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Features & System Verification */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-2 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>مصادقة Google مبسطة</span>
              </div>
              <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>مزامنة مباشرة في Supabase</span>
              </div>
            </div>

            {/* System Owner Role Notice */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-right">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300 block text-[11px]">
                    حساب مالك النظام المعتمد
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {OWNER_EMAIL}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30">
                محمي ومثبت
              </span>
            </div>

            <p className="text-center text-[10px] text-slate-500">
              مدرسة صفية بنت عمر الابتدائية — نظام الحماية والمصادقة الموحدة المعتمد
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 relative z-10">
        جميع الحقوق محفوظة لمدرسة صفية بنت عمر الابتدائية © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
