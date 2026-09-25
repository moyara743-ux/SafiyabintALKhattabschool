import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  Award,
  Calendar,
} from 'lucide-react';
import { OWNER_EMAIL } from '../data/initialData';

export const LoginView: React.FC = () => {
  const { login, register, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
        }
        await login(email.trim(), password);
      } else if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('يرجى إدخال الاسم الكريم');
        }
        if (password.length < 6) {
          throw new Error('يجب ألا تقل كلمة المرور عن 6 أحرف');
        }
        if (password !== confirmPass) {
          throw new Error('كلمتا المرور غير متطابقتين');
        }
        await register(name.trim(), email.trim(), password);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('يرجى إدخال البريد الإلكتروني المسجل');
        }
        await resetPassword(email.trim());
        setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Display genuine error message directly from Supabase
      const message =
        err?.message ||
        (typeof err === 'string' ? err : 'حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemoOwner = () => {
    setEmail(OWNER_EMAIL);
    setPassword('SafiyyahAdmin2026!');
    setError(null);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden"
      dir="rtl"
    >
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Identity Ribbon */}
      <header className="py-4 px-6 sm:px-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
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

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>نصنع المعرفة... ونوثق الإنجاز</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
          {/* Card Top Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-950/60 border border-emerald-400/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {mode === 'login'
                ? 'تسجيل الدخول إلى المنصة'
                : mode === 'register'
                ? 'إنشاء حساب جديد'
                : 'استعادة كلمة المرور'}
            </h2>

            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {mode === 'login'
                ? 'يرجى إدخال بياناتك للمتابعة والوصول إلى محتوى وخدمات مدرسة صفية بنت عمر.'
                : mode === 'register'
                ? 'أدخلي بياناتك لإنشاء حساب طالبة أو معلمة في المنصة.'
                : 'أدخلي بريدك الإلكتروني لإرسال تعليمات إعادة تعيين كلمة المرور.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                تسجيل الدخول
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                حساب جديد
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <UserIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أ. هند السبيعي"
                    className="w-full pr-10 pl-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu.sa"
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">كلمة المرور</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              ) : mode === 'register' ? (
                <>
                  <span>إنشاء الحساب</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              ) : (
                <span>إرسال رابط الاستعادة</span>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors text-center"
              >
                العودة إلى تسجيل الدخول
              </button>
            )}
          </form>

          {/* Quick Demo Helper Box */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-right">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300 block">حساب المديرة والمالكة</span>
                  <span className="text-[10px] text-slate-400 font-mono">{OWNER_EMAIL}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemoOwner}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                تعبئة سريعة
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-500">
              منصة آمنة ومحمية بقواعد بيانات معتمدة لضمان خصوصية المعلومات المدرسية.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        جميع الحقوق محفوظة لمدرسة صفية بنت عمر الابتدائية © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
