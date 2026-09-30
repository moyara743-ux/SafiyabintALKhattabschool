import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  HeartHandshake,
} from 'lucide-react';
import { getGoogleClientId } from '../lib/googleAuth';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogleAccount, loginWithGoogleCredential, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mode: standard password login vs google direct login
  const [activeMethod, setActiveMethod] = useState<'standard' | 'google'>('standard');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Password reset state
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services (GIS) if available
  useEffect(() => {
    const clientId = getGoogleClientId();
    if (!clientId) return;

    const checkGsiReady = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
              if (response?.credential) {
                setLoading(true);
                setError(null);
                setSuccessMsg('جارٍ التحقق وتوثيق الدخول عبر Google...');
                try {
                  await loginWithGoogleCredential(response.credential);
                } catch (err: any) {
                  setError(err?.message || 'تعذر التحقق من اعتماد Google');
                  setLoading(false);
                  setSuccessMsg(null);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official button if container exists
          if (googleBtnContainerRef.current) {
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              text: 'signin_with',
              shape: 'pill',
              logo_alignment: 'left',
              width: 320,
              locale: 'ar',
            });
          }

          // Trigger One Tap prompt
          window.google.accounts.id.prompt();
        } catch (e) {
          console.warn('[GIS Init] Notice initializing Google Identity Services:', e);
        }
      }
    };

    const timer = setTimeout(checkGsiReady, 600);
    return () => clearTimeout(timer);
  }, [loginWithGoogleCredential]);

  // Standard Email & Password Login
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    setLoading(true);
    setSuccessMsg('جارٍ التحقق من الحساب وتسجيل الدخول...');

    try {
      await login(cleanEmail, password);
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setError(
        err?.message?.includes('Invalid login credentials')
          ? 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.'
          : err?.message || 'تعذر تسجيل الدخول. يرجى المحاولة مجدداً.'
      );
      setLoading(false);
      setSuccessMsg(null);
    }
  };

  // Direct Google Email Login
  const handleGoogleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال عنوان بريد Google صحيح (example@gmail.com).');
      return;
    }

    setLoading(true);
    setSuccessMsg('جارٍ التحقق من حساب Google ومزامنة الصلاحيات...');

    try {
      await loginWithGoogleAccount(cleanEmail, googleName.trim() || undefined);
    } catch (err: any) {
      console.error('[Google Direct Login] Error:', err);
      setError(err?.message || 'تعذر إتمام الدخول بحساب Google. يرجى المحاولة مجدداً.');
      setLoading(false);
      setSuccessMsg(null);
    }
  };

  // Google One Tap Trigger Button Click
  const handleTriggerGoogleOneTap = () => {
    setError(null);
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Google prompt exception:', e);
      }
    }
    setActiveMethod('google');
  };

  // Password Reset Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('يرجى كتابة البريد الإلكتروني لإرسال رابط الاستعادة.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(forgotEmail.trim());
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.');
      setShowForgotPass(false);
      setForgotEmail('');
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال رابط استعادة كلمة المرور.');
    } finally {
      setLoading(false);
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
                مدرسة صفية بنت عمر الثانوية
              </h1>
              <p className="text-[11px] text-emerald-400 font-medium">المنصة المدرسية الرسمية</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>نصنع المعرفة... ونوثق الإنجاز</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-14 relative z-10">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Card Top Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              تسجيل الدخول للمنصة
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              بوابة الدخول الموحد لمنسوبات وطالبات وأولياء أمور مدرسة صفية بنت عمر الثانوية
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

          {/* Forgot Password View */}
          {showForgotPass ? (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white">استعادة كلمة المرور</h3>
                <p className="text-xs text-slate-400">
                  أدخل بريدك الإلكتروني المسجل لإرسال رابط إعادة تعيين كلمة المرور
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-9"
                    dir="ltr"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPass(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  إرسال الرابط
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Method Tabs */}
              <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setActiveMethod('standard')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeMethod === 'standard'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMethod('google')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeMethod === 'google'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  <span>حساب Google</span>
                </button>
              </div>

              {/* Standard Password Form */}
              {activeMethod === 'standard' && (
                <form onSubmit={handleStandardLogin} className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@safiah.edu.sa"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-9"
                        dir="ltr"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        كلمة المرور
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(true)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-9 pl-9"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>تسجيل الدخول</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Google Method View */}
              {activeMethod === 'google' && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Google GSI Official Button Container */}
                  <div className="flex justify-center" ref={googleBtnContainerRef} />

                  {/* Direct One Tap Action */}
                  <button
                    type="button"
                    onClick={handleTriggerGoogleOneTap}
                    disabled={loading}
                    className="w-full p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 transition-all flex items-center justify-center gap-3 font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span>الدخول بحساب Google المعتمد</span>
                  </button>

                  <div className="relative py-2 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <span className="relative px-3 bg-slate-900 text-[11px] text-slate-500 font-medium">
                      أو كتابة عنوان بريد Google
                    </span>
                  </div>

                  {/* Direct Google Email Entry Form */}
                  <form onSubmit={handleGoogleDirectLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        عنوان بريد Google
                      </label>
                      <input
                        type="email"
                        required
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
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
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                        placeholder="مثال: نورة محمد"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          <span>تأكيد ومتابعة الدخول</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Secure Note */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>نظام محمي ومشفر وفق معايير الأمان المدرسية</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 relative z-10">
        جميع الحقوق محفوظة لمدرسة صفية بنت عمر الثانوية © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
