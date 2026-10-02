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
  KeyRound,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { getGoogleClientId } from '../lib/googleAuth';

export const LoginView: React.FC = () => {
  const {
    login,
    loginStudent,
    signInWithGoogle,
    loginWithGoogleCredential,
    loginWithGoogleAccount,
    resetPassword,
  } = useAuth();

  // Active Category: Staff/Parents vs Students
  const [activeCategory, setActiveCategory] = useState<'staff_parent' | 'student'>('staff_parent');

  // Staff & Parent Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentSecret, setStudentSecret] = useState('');
  const [showStudentSecret, setShowStudentSecret] = useState(false);

  // Google Direct Entry Form
  const [showGoogleDirect, setShowGoogleDirect] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // Password reset state
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services (GIS) if configured
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
        } catch (e) {
          console.warn('[GIS Init] Notice initializing Google Identity Services:', e);
        }
      }
    };

    const timer = setTimeout(checkGsiReady, 500);
    return () => clearTimeout(timer);
  }, [loginWithGoogleCredential]);

  // Handle Staff & Parent Login (Email + Password)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال عنوان بريد إلكتروني صحيح.');
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
      setError(err?.message || 'بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً.');
      setLoading(false);
      setSuccessMsg(null);
    }
  };

  // Handle Student Login (Student Name + Student Secret)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = studentName.trim();
    const cleanSecret = studentSecret.trim();

    if (!cleanName) {
      setError('يرجى كتابة اسم الطالبة الرباعي كما هو مسجل في المدرسة.');
      return;
    }
    if (!cleanSecret) {
      setError('يرجى إدخال الرمز المخصص للطالبة.');
      return;
    }

    setLoading(true);
    setSuccessMsg('جارٍ مطابقة اسم الطالبة والرمز المخصص في السجلات المدرسية...');

    try {
      await loginStudent(cleanName, cleanSecret);
    } catch (err: any) {
      console.error('[Student Login] Error:', err);
      setError(err?.message || 'بيانات الدخول غير صحيحة. يرجى مراجعة إدارة المدرسة.');
      setLoading(false);
      setSuccessMsg(null);
    }
  };

  // Handle Google Official Sign-In Button Click
  const handleGoogleClick = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // If GIS One Tap prompt is initialized in page, try prompt first
      if (typeof window !== 'undefined' && window.google?.accounts?.id && getGoogleClientId()) {
        try {
          window.google.accounts.id.prompt();
          setLoading(false);
          return;
        } catch (promptErr) {
          console.warn('GIS prompt fallback:', promptErr);
        }
      }

      // Default: Official Google OAuth Redirect Flow
      await signInWithGoogle();
    } catch (err: any) {
      console.error('[Google OAuth] Error:', err);
      // If OAuth redirect fails or client ID not configured, show direct pre-authorized Google email form
      setShowGoogleDirect(true);
      setError(err?.message || 'يرجى إدخال بريد Google المصرح به للمتابعة.');
      setLoading(false);
    }
  };

  // Direct Google Email Form Submission (Strict pre-authorization check)
  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى كتابة عنوان بريد Google صحيح.');
      return;
    }

    setLoading(true);
    setSuccessMsg('جارٍ التحقق من الحساب المصرح ومزامنة الصلاحيات...');

    try {
      await loginWithGoogleAccount(cleanEmail);
    } catch (err: any) {
      console.error('[Google Direct] Error:', err);
      setError(err?.message || 'البريد غير مسجل أو غير مصرح له.');
      setLoading(false);
      setSuccessMsg(null);
    }
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
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative z-10">
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
              بوابة الدخول الموحد لمنسوبات وطالبات وأولياء أمور المدرسة
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block mb-0.5">تنبيه أمني:</span>
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

          {/* Password Reset Modal View */}
          {showForgotPass ? (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white">استعادة كلمة المرور</h3>
                <p className="text-xs text-slate-400">
                  أدخل بريدك الإلكتروني المعتمد لإرسال رابط إعادة تعيين كلمة المرور
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
              {/* Category Selector Tabs */}
              <div className="flex bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('staff_parent');
                    setError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeCategory === 'staff_parent'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>المنسوبات وأولياء الأمور</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('student');
                    setError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeCategory === 'student'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>دخول الطالبات</span>
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* TAB 1: STAFF & PARENT LOGIN (Google & Email/Password)         */}
              {/* ------------------------------------------------------------- */}
              {activeCategory === 'staff_parent' && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Google GSI Render Container if ready */}
                  <div className="flex justify-center" ref={googleBtnContainerRef} />

                  {/* Prominent Google Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    disabled={loading}
                    className="w-full p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 transition-all flex items-center justify-center gap-3 font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50"
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
                    <span>تسجيل الدخول باستخدام Google</span>
                  </button>

                  {/* Fallback Direct Google Email Input (When popup/redirect unavailable) */}
                  {showGoogleDirect && (
                    <form onSubmit={handleGoogleDirectSubmit} className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">التحقق من بريد Google المصرح</span>
                        <button
                          type="button"
                          onClick={() => setShowGoogleDirect(false)}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          إغلاق
                        </button>
                      </div>
                      <input
                        type="email"
                        required
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                        dir="ltr"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        تأكيد ومتابعة الدخول
                      </button>
                    </form>
                  )}

                  {/* Divider */}
                  <div className="relative py-2 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <span className="relative px-3 bg-slate-900 text-[11px] text-slate-400 font-medium">
                      أو الدخول بالبريد الإلكتروني وكلمة المرور
                    </span>
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleStaffLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        البريد الإلكتروني المعتمد
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
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
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
                          <span>تسجيل الدخول للمنسوبة / ولي الأمر</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 2: STUDENT LOGIN (Name + Secret)                          */}
              {/* ------------------------------------------------------------- */}
              {activeCategory === 'student' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center gap-2.5 text-emerald-300">
                    <GraduationCap className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-[11px] leading-relaxed">
                      دخول الطالبات المعتمد: سجّلي دخولكِ باستخدام اسمكِ الرباعي والرمز المخصص لكِ من إدارة المدرسة.
                    </div>
                  </div>

                  <form onSubmit={handleStudentLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        اسم الطالبة الرباعي *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="اسم الطالبة كاملاً"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        اكتبي الاسم كاملاً كما هو مدون في بطاقة الطالبة
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        الرمز *
                      </label>
                      <div className="relative">
                        <input
                          type={showStudentSecret ? 'text' : 'password'}
                          required
                          value={studentSecret}
                          onChange={(e) => setStudentSecret(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-9 pl-9"
                          dir="ltr"
                        />
                        <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowStudentSecret(!showStudentSecret)}
                          className="absolute left-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                          tabIndex={-1}
                        >
                          {showStudentSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        أدخل الرمز المخصص لك من إدارة المدرسة
                      </span>
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
                          <GraduationCap className="w-4 h-4" />
                          <span>دخول الطالبة للمنصة</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Security Policy Badge */}
          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>نظام محمي ومشفر وفق معايير الأمان المدرسية</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              التسجيل الذاتي غير متاح. يتم اعتماد حسابات المنسوبات والطالبات حصرياً من قِبل إدارة المدرسة، ويتم قفل المحاولات الفاشلة مؤقتاً لحماية الحسابات.
            </p>
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
