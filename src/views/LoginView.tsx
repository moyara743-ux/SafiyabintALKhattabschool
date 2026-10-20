import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  KeyRound,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  School,
  UserCheck,
  HeartHandshake,
  Briefcase,
  Zap,
  ArrowLeft,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import {
  getGoogleClientId,
  isRealGoogleClientIdAvailable,
  shouldUseExternalGoogleOAuth,
  buildGoogleOAuthUrl,
  DIRECTOR_EMAIL,
  isUserProfileCompleted,
  redirectToGoogleOAuth,
  clearAuthStorageForNewOAuth,
} from '../lib/googleAuth';
import {
  SYSTEM_OWNER_EMAIL,
  SYSTEM_OWNER_NAME,
  getDesignatedPrincipalEmail,
  getDesignatedPrincipalName,
} from '../lib/principalService';
import { StaffActivationModal } from '../components/StaffActivationModal';
import { isStaffEmailAuthorized } from '../lib/authorizedStaffService';
import { verifyGoogleEmailPreAuthorization } from '../lib/authSecurity';
import { SchoolRole } from '../types';

interface LoginViewProps {
  initialError?: string | null;
  initialNotice?: string | null;
  initialStaffActivationEmail?: string | null;
  initialStaffActivationName?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  initialError,
  initialNotice,
  initialStaffActivationEmail,
  initialStaffActivationName,
}) => {
  const {
    login,
    loginStudent,
    signInWithGoogle,
    loginWithGoogleCredential,
    loginWithGoogleAccount,
    registerWithGoogle,
    resetPassword,
  } = useAuth();

  // Primary View Mode: 'quick_login' (تسجيل الدخول عبر Google) or 'first_time_register' (التسجيل لأول مرة)
  const [viewMode, setViewMode] = useState<'quick_login' | 'first_time_register'>('quick_login');

  // Alternative fallback login expansion (Preserves existing password/student code systems in collapsed drawer)
  const [showAlternativeLogin, setShowAlternativeLogin] = useState(false);
  const [altRoleTab, setAltRoleTab] = useState<'staff' | 'student' | 'parent'>('staff');

  // Alternative Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [studentSecret, setStudentSecret] = useState('');
  const [showStudentSecret, setShowStudentSecret] = useState(false);

  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Staff First-Time Activation Modal State (Option A)
  const [staffActivationEmail, setStaffActivationEmail] = useState<string | null>(null);
  const [staffActivationName, setStaffActivationName] = useState<string | undefined>(undefined);

  const [pendingIntent, setPendingIntent] = useState<'quick_login' | 'register_staff' | 'register_student' | 'register_parent'>('quick_login');

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
          console.warn('[GIS Init] Notice:', e);
        }
      }
    };

    const timer = setTimeout(checkGsiReady, 400);
    return () => clearTimeout(timer);
  }, [loginWithGoogleCredential]);

  // Receive initial feedback/states from callback handler
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
    if (initialNotice) {
      setSuccessMsg(initialNotice);
    }
    if (initialStaffActivationEmail) {
      setStaffActivationEmail(initialStaffActivationEmail);
      if (initialStaffActivationName) {
        setStaffActivationName(initialStaffActivationName);
      }
    }
  }, [initialError, initialNotice, initialStaffActivationEmail, initialStaffActivationName]);

  // Listen for OAuth completion from external popup window
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SAFIAH_OAUTH_CALLBACK') {
        const target = e.data.target;
        if (target) {
          if (target.error) setError(target.error);
          if (target.notice) setSuccessMsg(target.notice);
          if (target.staffActivationEmail) {
            setStaffActivationEmail(target.staffActivationEmail);
            if (target.staffActivationName) setStaffActivationName(target.staffActivationName);
          }
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'safiah_oauth_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.target) {
            const target = parsed.target;
            if (target.error) setError(target.error);
            if (target.notice) setSuccessMsg(target.notice);
            if (target.staffActivationEmail) {
              setStaffActivationEmail(target.staffActivationEmail);
              if (target.staffActivationName) setStaffActivationName(target.staffActivationName);
            }
          }
        } catch {}
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Official External Google OAuth Authentication (accounts.google.com)
  const handleStartGoogleOAuth = (intent: 'quick_login' | 'register_staff' | 'register_student' | 'register_parent') => {
    setError(null);
    setPendingIntent(intent);

    // Wipe all old tokens and storage immediately before Google redirect to force clean session
    clearAuthStorageForNewOAuth(intent);

    setSuccessMsg('جارٍ التحويل إلى صفحة Google الرسمية (accounts.google.com)...');
    redirectToGoogleOAuth(intent);
  };


  // Alternative: Staff Login (Email + Password)
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
      setError(err?.message || 'بيانات الدخول غير صحيحة.');
      setLoading(false);
      setSuccessMsg(null);
    }
  };

  // Alternative: Student Login (Name + Student Code)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = studentName.trim();
    const cleanSecret = studentSecret.trim();

    if (!cleanName) {
      setError('يرجى كتابة اسم الطالبة الرباعي.');
      return;
    }
    if (!cleanSecret) {
      setError('يرجى إدخال الرمز المخصص لك من إدارة المدرسة.');
      return;
    }

    setLoading(true);
    setSuccessMsg('جارٍ مطابقة اسم الطالبة والرمز المخصص...');

    try {
      await loginStudent(cleanName, cleanSecret);
    } catch (err: any) {
      setError(err?.message || 'بيانات الدخول غير صحيحة. يرجى مراجعة إدارة المدرسة.');
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
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور بنجاح.');
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
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Ribbon */}
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
              <p className="text-[11px] text-emerald-400 font-medium">
                بوابة الدخول والتسجيل الموحد عبر Google
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>نصنع المعرفة... ونوثق الإنجاز</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative z-10">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-9 shadow-2xl space-y-7">
          {/* School Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              بوابة الدخول والتسجيل الموحد
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              نظام موحد وسريع يعتمد رسمياً على حساب Google لجميع منسوبات وطالبات وأولياء أمور المدرسة
            </p>
          </div>

          {/* TWO MAIN MODES SELECTOR TABS */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setViewMode('quick_login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'quick_login'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>تسجيل الدخول عبر Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('first_time_register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'first_time_register'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-300" />
              <span>التسجيل لأول مرة (3 أقسام مستقلة)</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block mb-0.5">تنبيه النظام:</span>
                  {error}
                </div>
              </div>
              {(error.includes('مهلة') || error.includes('Google') || error.includes('المصادقة')) && (
                <button
                  type="button"
                  onClick={() => handleStartGoogleOAuth(pendingIntent)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow active:scale-[0.99]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة عبر Google</span>
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
              <div className="leading-relaxed font-bold">{successMsg}</div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 1: QUICK GOOGLE SIGN-IN (أولاً: تسجيل الدخول عبر Google)   */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewMode === 'quick_login' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-800/90 to-slate-800/40 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-400 font-extrabold text-sm sm:text-base">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>تسجيل الدخول عبر Google (المصادقة الرسمية المباشرة)</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  اضغط على زر Google أدناه للتحقق الفوري من حسابك. يقوم النظام بفحص قاعدة بيانات المدرسة (Supabase):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>الحسابات المكتملة</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      إذا كان البريد مسجلاً مسبقاً والبيانات مكتملة: يدخل المستخدم فوراً وبثانية واحدة بدون إعادة تعبئة أي بيانات.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>البريد الجديد أو غير المكتمل</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      يتم إيقافه وحظر تصفح الموقع فوراً وتوجيهه إلى شاشة "التسجيل لأول مرة وإكمال البيانات".
                    </p>
                  </div>
                </div>

                {/* GIS Render Anchor if ready */}
                <div className="flex justify-center" ref={googleBtnContainerRef} />

                {/* Big Prominent Direct Google Button */}
                <div className="space-y-2.5 pt-1">
                  <a
                    href={buildGoogleOAuthUrl('quick_login')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStartGoogleOAuth('quick_login')}
                    className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-200 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-center justify-center gap-3.5 font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl cursor-pointer active:scale-[0.99] text-center no-underline group"
                  >
                    <svg className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
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
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      تسجيل الدخول عبر Google
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      <ExternalLink className="w-3 h-3 text-emerald-700" />
                      <span>accounts.google.com</span>
                    </span>
                  </a>

                  <p className="text-[11px] text-center text-slate-400 font-medium">
                    توثيق رسمي موحد بدون محاكاة • ينقلك مباشرة لاختيار حسابك في Google والتحقق من اعتماده
                  </p>
                </div>
              </div>

              {/* Roles Badge List */}
              <div className="pt-2 text-center space-y-2">
                <span className="text-[11px] text-slate-400 font-bold block">
                  الأدوار والرتب المعتمدة في النظام:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    المديرة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    المشرفة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    الإدارية
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    المرشدة الطلابية
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    المعلمة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    الطالبة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    ولي الأمر
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 2: FIRST-TIME REGISTRATION (ثانياً: 3 عناوين عريضة وواضحة)    */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewMode === 'first_time_register' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-right space-y-1 pb-1">
                <h3 className="text-sm font-black text-white">
                  ثانياً: التسجيل لأول مرة وإكمال البيانات
                </h3>
                <p className="text-xs text-slate-400">
                  يرجى اختيار القسم المناسب لك أدناه لتوثيق حسابك عبر Google واستكمال البيانات المطلوبة:
                </p>
              </div>

              {/* 🟢 CARD 1: تسجيل الطالبات */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border-2 border-emerald-500/40 hover:border-emerald-400 transition-all space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <span>🟢 العنوان الأول: [ تسجيل الطالبات ]</span>
                      </h4>
                      <span className="text-[11px] text-emerald-300">
                        للطالبات المسجلات في مدرسة صفية بنت عمر الثانوية
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed pr-1">
                  <li>يطلب تسجيل الدخول عبر Google للتحقق من البريد الإلكتروني.</li>
                  <li>ينقل الطالبة لشاشة تعبئة <strong className="text-white">البيانات الأساسية</strong> (رقم الهوية/الإقامة، رقم الجوال الخاص بها).</li>
                  <li>تظهر بياناتها المدرسية التلقائية (اسم الطالبة، Student ID، الصف/الفصل) دون إمكانية تعديلها.</li>
                  <li className="text-amber-300 font-semibold">يمنع منعاً باتاً تصفح الموقع أو الانتقال لأي قسم إلا بعد حفظ كامل البيانات المطلوبة.</li>
                </ul>

                <a
                  href={buildGoogleOAuthUrl('register_student')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleStartGoogleOAuth('register_student')}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer no-underline text-center active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#fff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#fff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
                    <path fill="#fff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>تسجيل الطالبة عبر Google (accounts.google.com) ←</span>
                </a>
              </div>

              {/* 🔵 CARD 2: تسجيل أولياء الأمور */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 to-slate-900 border-2 border-blue-500/40 hover:border-blue-400 transition-all space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <span>🔵 العنوان الثاني: [ تسجيل أولياء الأمور ]</span>
                      </h4>
                      <span className="text-[11px] text-blue-300">
                        لأولياء أمور طالبات مدرسة صفية بنت عمر الثانوية
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed pr-1">
                  <li>تسجيل الدخول عبر Google للتحقق من البريد الإلكتروني.</li>
                  <li>تعبئة البيانات الأساسية (رقم الهوية الوطنية/الإقامة، رقم الجوال، صلة القرابة).</li>
                  <li>ربط الطالبة/الطالبات التابعات له عبر رمز الطالبة (Student ID) أو رمز التحقق (OTP) المرسل للجوال.</li>
                  <li className="text-amber-300 font-semibold">لا يمكن الدخول للنظام وتصفحه إلا بعد الربط وإكمال البيانات.</li>
                </ul>

                <a
                  href={buildGoogleOAuthUrl('register_parent')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleStartGoogleOAuth('register_parent')}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer no-underline text-center active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#fff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#fff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
                    <path fill="#fff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>تسجيل ولي الأمر عبر Google (accounts.google.com) ←</span>
                </a>
              </div>

              {/* 🟣 CARD 3: تسجيل الكادر المدرسي والإداري والمديرة */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 to-slate-900 border-2 border-purple-500/40 hover:border-purple-400 transition-all space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <span>🟣 العنوان الثالث: [ تسجيل الكادر المدرسي والإداري والمديرة ]</span>
                      </h4>
                      <span className="text-[11px] text-purple-300">
                        المديرة • المشرفة • الإدارية • المرشدة الطلابية • المعلمة
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed pr-1 break-words">
                  <li>الخطوة 1 (المصادقة): تسجيل الدخول عبر Google للتحقق من وجود البريد في قائمة المنسوبات المصرح لهن.</li>
                  <li>الخطوة 2 (التفعيل والرمز): اختيار المسمى الوظيفي المعتمد وإدخال رمز الأمان الوظيفي.</li>
                  <li className="text-emerald-300 font-semibold">المستخدمات المفعلات سابقاً: يدخلن مباشرة بحسابهن ورتبتهن دون طلب الرمز مجدداً.</li>
                </ul>

                <a
                  href={buildGoogleOAuthUrl('register_staff')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleStartGoogleOAuth('register_staff')}
                  className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer no-underline text-center active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#fff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#fff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
                    <path fill="#fff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>تسجيل الكادر والمديرة عبر Google (accounts.google.com) ←</span>
                </a>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* COLLAPSIBLE ALTERNATIVE ACCESS (Password or Student Code)    */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAlternativeLogin(!showAlternativeLogin)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>خيارات الدخول البديلة (الرمز المدرسي / كلمة المرور)</span>
              </span>
              {showAlternativeLogin ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showAlternativeLogin && (
              <div className="mt-3 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-4 animate-in fade-in">
                {/* Secondary Category Switcher for fallback inputs */}
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAltRoleTab('staff')}
                    className={`py-1.5 rounded-lg transition-all ${
                      altRoleTab === 'staff' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    المنسوبات
                  </button>
                  <button
                    type="button"
                    onClick={() => setAltRoleTab('student')}
                    className={`py-1.5 rounded-lg transition-all ${
                      altRoleTab === 'student' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الطالبة
                  </button>
                  <button
                    type="button"
                    onClick={() => setAltRoleTab('parent')}
                    className={`py-1.5 rounded-lg transition-all ${
                      altRoleTab === 'parent' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ولي الأمر
                  </button>
                </div>

                {altRoleTab === 'student' ? (
                  /* Student Fallback Form */
                  <form onSubmit={handleStudentLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        اسم الطالبة الرباعي *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="اسم الطالبة كاملاً"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        الرمز *
                      </label>
                      <div className="relative">
                        <input
                          type={showStudentSecret ? 'text' : 'password'}
                          required
                          value={studentSecret}
                          onChange={(e) => setStudentSecret(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-8 pl-8"
                          dir="ltr"
                        />
                        <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowStudentSecret(!showStudentSecret)}
                          className="absolute left-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                          tabIndex={-1}
                        >
                          {showStudentSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        أدخل الرمز المخصص لك من إدارة المدرسة
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      دخول الطالبة
                    </button>
                  </form>
                ) : (
                  /* Staff & Parent Fallback Form */
                  <form onSubmit={handleStaffLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        البريد الإلكتروني المعتمد
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@safiah.edu.sa"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-300">
                          كلمة المرور
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPass(true)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
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
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-8 pl-8"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      دخول بالحساب
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Security Policy Badge */}
          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>نظام محمي ومشفر وفق أعلى معايير الأمان المدرسية</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              لا يوجد أي دور باسم «مالك النظام». يتم تحديد الصلاحيات والرتب مركزياً من قاعدة البيانات: المديرة (أعلى سلطة إدارية)، المشرفة، الإدارية، المرشدة الطلابية، المعلمة، الطالبة، وولي الأمر.
            </p>
          </div>
        </div>
      </main>



      {/* Staff First-Time Onboarding Activation Modal (Option A: Select Role & Enter Role Passcode) */}
      {staffActivationEmail && (
        <StaffActivationModal
          email={staffActivationEmail}
          initialName={staffActivationName}
          onSuccess={async (activatedProfile) => {
            setStaffActivationEmail(null);
            setSuccessMsg(`تم تفعيل حساب (${activatedProfile.name}) بنجاح! مرحباً بكِ في المنصة.`);
            await loginWithGoogleAccount(activatedProfile.email, activatedProfile.name);
          }}
          onCancel={() => {
            setStaffActivationEmail(null);
          }}
        />
      )}



      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 relative z-10">
        جميع الحقوق محفوظة لمدرسة صفية بنت عمر الثانوية © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
