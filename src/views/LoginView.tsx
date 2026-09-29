import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Shield,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Settings,
  HelpCircle,
  ExternalLink,
  Key,
} from 'lucide-react';
import { OWNER_EMAIL } from '../data/initialData';
import { getGoogleClientId, setGoogleClientId } from '../lib/googleAuth';

export const LoginView: React.FC = () => {
  const { loginWithGoogleCredential } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [oneTapPrompted, setOneTapPrompted] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(getGoogleClientId());

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize and mount Google Identity Services (Google One Tap / Google Auth SDK)
  useEffect(() => {
    let checkInterval: any = null;
    let isMounted = true;

    const initGoogleIdentityServices = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) {
        return false;
      }

      setSdkLoaded(true);
      const activeClientId = getGoogleClientId();

      // Only initialize GSI if client_id is present
      if (activeClientId && activeClientId.trim()) {
        try {
          window.google.accounts.id.initialize({
            client_id: activeClientId.trim(),
            callback: async (response: { credential: string; select_by?: string }) => {
              console.log('[Google GSI SDK] Received Google credential token:', response);
              setLoading(true);
              setError(null);
              setSuccessMsg('تم التحقق بنجاح! جارٍ حفظ الحساب في Supabase والدخول للمنصة...');

              try {
                await loginWithGoogleCredential(response.credential);
              } catch (err: any) {
                console.error('[Google GSI SDK] Error processing Google login:', err);
                setError(err?.message || 'حدث خطأ أثناء مزامنة بيانات حساب Google مع Supabase.');
                setLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button into the designated container
          if (googleBtnContainerRef.current) {
            googleBtnContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              shape: 'pill',
              logo_alignment: 'left',
              width: 320,
              locale: 'ar',
            });
          }

          // Trigger Google One Tap UI prompt
          window.google.accounts.id.prompt((notification: any) => {
            console.log('[Google GSI SDK] Prompt status:', notification);
            if (isMounted) {
              setOneTapPrompted(true);
            }
          });
        } catch (initErr) {
          console.warn('[Google GSI SDK] Initialization notice:', initErr);
        }
      }

      return true;
    };

    // Attempt instant initialization
    const loadedImmediately = initGoogleIdentityServices();

    // If script is still loading asynchronously, poll for up to 5 seconds
    if (!loadedImmediately) {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (initGoogleIdentityServices() || attempts >= 25) {
          clearInterval(checkInterval);
        }
      }, 200);
    }

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [clientIdInput]);

  // Standard Google OAuth redirect via Supabase
  const handleGoogleOAuthSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const msg =
        err?.message ||
        (typeof err === 'string'
          ? err
          : 'تعذر الاتصال بخدمة تسجيل الدخول عبر Google. يرجى التحقق والمحاولة مرة أخرى.');
      setError(msg);
      setLoading(false);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleClientId(clientIdInput);
    setShowConfigModal(false);
    setSuccessMsg('تم حفظ معرّف عميل Google بنجاح. جارٍ إعادة تهيئة Google Auth SDK...');
    setTimeout(() => setSuccessMsg(null), 4000);
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

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>نصنع المعرفة... ونوثق الإنجاز</span>
            </div>

            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="إعدادات معرف Google Client ID"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">إعدادات الربط</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16 relative z-10">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Card Top Title & Emblem */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-950/60 border-2 border-emerald-400/30">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-0.5 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-full">
                بوابة الدخول الموحد (Google Auth)
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                تسجيل الدخول إلى المنصة
              </h2>
            </div>

            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              اختر حساب Google الرسمي للمتابعة؛ يتم التحقق بكلمة المرور وتخزين البريد وبياناتك فوراً في Supabase.
            </p>
          </div>

          {/* Feedback Success / Error Alert */}
          {error && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block mb-0.5">تعذر إتمام الدخول:</span>
                {error}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-bold">{successMsg}</div>
            </div>
          )}

          {/* Official Google GSI Rendered Button Container (if Client ID configured) */}
          <div className="flex flex-col items-center justify-center w-full space-y-3 pt-1">
            <div
              ref={googleBtnContainerRef}
              className="min-h-[44px] flex items-center justify-center w-full overflow-hidden"
            />

            {/* Primary Action Button: Google Sign-In (Direct Supabase OAuth / Official SDK) */}
            <button
              type="button"
              onClick={handleGoogleOAuthSignIn}
              disabled={loading}
              className="w-full group relative py-3.5 px-5 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-extrabold rounded-2xl shadow-xl shadow-black/40 border-2 border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="تسجيل الدخول باستخدام Google"
            >
              {loading ? (
                <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-emerald-600 rounded-full animate-spin" />
                  <span>جارٍ التوجيه إلى صفحة Google الرسمية والمزامنة...</span>
                </div>
              ) : (
                <>
                  {/* Official Google 4-Color 'G' Logo SVG */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-800 tracking-tight">
                    <span>تسجيل الدخول باستخدام Google</span>
                    <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                      (Sign in with Google)
                    </span>
                  </div>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              يتم توجيهك لصفحة Google الرسمية لاختيار حسابك وإدخال كلمة المرور، ثم حفظ بريدك تلقائياً في Supabase.
            </p>
          </div>

          {/* Integration Status Badges */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-2 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Google One Tap / SDK</span>
              </div>
              <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>مزامنة فورية في Supabase</span>
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

      {/* Google Client ID Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">إعداد معرّف Google Client ID</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              لتفعيل نافذة Google One Tap التلقائية الخاصة بنطاق مدرستك، يمكنك إدخال معرّف العميل (Client ID) الصادر من Google Cloud Console:
            </p>

            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="مثال: xxxxx-xxxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer"
                >
                  حفظ وتفعيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 relative z-10">
        جميع الحقوق محفوظة لمدرسة صفية بنت عمر الابتدائية © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
