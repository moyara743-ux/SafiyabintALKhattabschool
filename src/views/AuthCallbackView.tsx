import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { decodeJwt, redirectToGoogleOAuth, isUserProfileCompleted } from '../lib/googleAuth';
import { isStaffEmailAuthorized } from '../lib/authorizedStaffService';
import { verifyGoogleEmailPreAuthorization } from '../lib/authSecurity';
import { SYSTEM_OWNER_EMAIL, getDesignatedPrincipalEmail } from '../lib/principalService';
import { GraduationCap, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthCallbackViewProps {
  onRoute: (target: {
    view: 'home' | 'admin_dashboard' | 'login';
    staffActivationEmail?: string;
    staffActivationName?: string;
    error?: string;
    notice?: string;
  }) => void;
}

export const AuthCallbackView: React.FC<AuthCallbackViewProps> = ({ onRoute }) => {
  const { registerWithGoogle } = useAuth();
  const [statusMessage, setStatusMessage] = useState('جارٍ معالجة مصادقة Google والتحقق من الحساب المعتمد...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockedAccountNotice, setBlockedAccountNotice] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(2);

  const processedRef = useRef(false);
  const hasRoutedRef = useRef(false);

  useEffect(() => {
    if (blockedAccountNotice && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [blockedAccountNotice, redirectCountdown]);

  const handleRetryGoogleAuth = () => {
    const savedIntent =
      (typeof window !== 'undefined' ? localStorage.getItem('safiah_oauth_intent') : null) ||
      'quick_login';
    setErrorMessage(null);
    setStatusMessage('جارٍ تجديد طلب المصادقة والتحويل إلى صفحة Google الرسمية...');
    redirectToGoogleOAuth(savedIntent);
  };

  useEffect(() => {
    let isMounted = true;

    // Clean stale cache on mount
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('safiah_cached_callback');
        localStorage.removeItem('safiah_oauth_event');
      }
    } catch {}

    // Guard against React StrictMode double invocation
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    // Helper to notify opener window and dispatch route (single execution guaranteed)
    const dispatchRoute = (target: {
      view: 'home' | 'admin_dashboard' | 'login';
      staffActivationEmail?: string;
      staffActivationName?: string;
      error?: string;
      notice?: string;
    }) => {
      if (hasRoutedRef.current) return;
      hasRoutedRef.current = true;

      if (typeof window !== 'undefined') {
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'SAFIAH_OAUTH_CALLBACK', target }, '*');
          } catch (e) {
            console.warn('[AuthCallback] postMessage notice:', e);
          }
        }
        try {
          localStorage.setItem(
            'safiah_oauth_event',
            JSON.stringify({
              timestamp: Date.now(),
              target,
            })
          );
        } catch (e) {}

        // Clean up URL hash & query string cleanly after saving route
        if (window.history?.replaceState) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname.replace('/auth/callback', '') || '/'
          );
        }
      }

      if (isMounted) {
        onRoute(target);
      }
    };

    // 1. Timeout Safety: 15 seconds (15000ms) to give the user ample time to select her Google account
    const timeoutTimer = setTimeout(() => {
      if (isMounted && !hasRoutedRef.current) {
        console.warn('[AuthCallbackView] 15s timeout reached.');
        setErrorMessage('انتهت مهلة استلام بيانات المصادقة من Google (15 ثانية). يرجى النقر أدناه لإعادة المحاولة.');
      }
    }, 15000);

    const processOAuthCallback = async () => {
      try {
        // 1. Read hash & query parameters returned from Google OAuth
        const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
        const search = typeof window !== 'undefined' ? window.location.search.substring(1) : '';

        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(search);

        // Check for error returned by Google
        const oauthError = searchParams.get('error') || hashParams.get('error');
        if (oauthError) {
          clearTimeout(timeoutTimer);
          setErrorMessage('تم إلغاء عملية تسجيل الدخول أو رفض الإذن من قِبل Google.');
          return;
        }

        const idToken = hashParams.get('id_token') || searchParams.get('id_token');
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        let state =
          hashParams.get('state') ||
          searchParams.get('state') ||
          (typeof window !== 'undefined' ? localStorage.getItem('safiah_oauth_intent') : null) ||
          'quick_login';

        // 1. Handling Reload / Missing Tokens smoothly without flashing error:
        if (!idToken && !accessToken) {
          clearTimeout(timeoutTimer);
          const activeEmail = typeof window !== 'undefined' ? localStorage.getItem('school_active_session_email') : null;
          if (activeEmail && activeEmail.includes('@')) {
            const check = await verifyGoogleEmailPreAuthorization(activeEmail);
            if (check.isAuthorized) {
              dispatchRoute({ view: 'admin_dashboard' });
              return;
            }
          }
          // Smooth redirection to login view if no tokens and no active session
          dispatchRoute({ view: 'login' });
          return;
        }

        let email = '';
        let displayName = '';
        let photoURL = '';

        // Extract email solely from the newly received OAuth token from Google
        if (idToken) {
          const decoded = decodeJwt(idToken);
          email = (decoded.email || '').trim().toLowerCase();
          displayName = decoded.name || '';
          photoURL = decoded.picture || '';
        } else if (accessToken) {
          // Fast fetch directly from Google userinfo API
          try {
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 8000);
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: controller.signal,
            });
            clearTimeout(fetchTimeout);
            if (resp.ok) {
              const info = await resp.json();
              email = (info.email || '').trim().toLowerCase();
              displayName = info.name || '';
              photoURL = info.picture || '';
            }
          } catch (fetchErr) {
            console.warn('[AuthCallback] Notice fetching userinfo:', fetchErr);
          }
        }

        // Strict Check: Must have a valid Google email from the official OAuth response
        if (!email || !email.includes('@')) {
          clearTimeout(timeoutTimer);
          dispatchRoute({ view: 'login', error: 'لم يتم استلام رمز مصادقة أو بريد صالح من Google. يرجى المحاولة مرة أخرى.' });
          return;
        }

        // Cache valid credential in sessionStorage
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(
              'safiah_last_oauth_payload',
              JSON.stringify({ email, name: displayName, state })
            );
          } catch {}
        }

        setStatusMessage(`تم تأكيد الهوية عبر Google (${email}). جارٍ فحص الاعتماد المدرسي...`);

        // 2. Strict Redirection & Separation Logic:
        const isOwner = email === SYSTEM_OWNER_EMAIL.toLowerCase();
        const isPrincipal = email === getDesignatedPrincipalEmail().toLowerCase();
        const staffAuth = await isStaffEmailAuthorized(email);
        const preAuthCheck = await verifyGoogleEmailPreAuthorization(email);

        // Check if the email exists in school database at all
        const isKnownInSchool = isOwner || isPrincipal || staffAuth.isAuthorized || preAuthCheck.isAuthorized;

        if (!isKnownInSchool) {
          clearTimeout(timeoutTimer);
          dispatchRoute({
            view: 'login',
            error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
          });
          return;
        }

        // Determine if account is already completed and active:
        let isAlreadyCompleted = false;
        let schoolRole: string | undefined = undefined;

        if (isOwner) {
          isAlreadyCompleted = true;
          schoolRole = 'system_owner';
        } else if (isPrincipal) {
          isAlreadyCompleted = true;
          schoolRole = 'director';
        } else if (staffAuth.isAuthorized) {
          isAlreadyCompleted = staffAuth.isActivated === true;
          schoolRole = staffAuth.record?.assignedRole || 'teacher';
        } else if (preAuthCheck.isAuthorized && preAuthCheck.profile) {
          isAlreadyCompleted = isUserProfileCompleted(preAuthCheck.profile);
          schoolRole = preAuthCheck.profile.school_role;
        }

        const isFirstTimeRegistrationIntent =
          state === 'register_staff' ||
          state === 'register_student' ||
          state === 'register_parent' ||
          state.startsWith('register_');

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // RULE 1: مسار [التسجيل لأول مرة] (First-Time Registration Path)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (isFirstTimeRegistrationIntent) {
          clearTimeout(timeoutTimer);

          // إذا كان الحساب مسجلاً ومكتمل البيانات مسبقاً (is_active / completed):
          // اقفل المسار فوراً، واعرض تنبيه: «حسابك مسجل ومفعل بالفعل في النظام. يرجى استخدام تسجيل الدخول السريع عبر Google»، واعد توجيه الصفحة إلى شاشة الدخول الرئيسية خلال ثانيتين.
          if (isAlreadyCompleted) {
            const blockedNotice = 'حسابك مسجل ومفعل بالفعل في النظام. يرجى استخدام تسجيل الدخول السريع عبر Google.';
            setBlockedAccountNotice(blockedNotice);
            setRedirectCountdown(2);

            // Notify opener / storage so main view knows about the block immediately
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                  { type: 'SAFIAH_OAUTH_CALLBACK', target: { view: 'login', notice: blockedNotice } },
                  '*'
                );
              }
              localStorage.setItem(
                'safiah_oauth_event',
                JSON.stringify({
                  timestamp: Date.now(),
                  target: { view: 'login', notice: blockedNotice },
                })
              );
            } catch {}

            // Auto-redirect to main login after 2 seconds
            setTimeout(() => {
              dispatchRoute({
                view: 'login',
                notice: blockedNotice,
              });
            }, 2000);
            return;
          }

          // إذا كان الحساب غير مكتمل (لأول مرة بالفعل):
          if (state === 'register_staff') {
            if (staffAuth.isAuthorized && !staffAuth.isActivated) {
              dispatchRoute({
                view: 'login',
                staffActivationEmail: email,
                staffActivationName: displayName || staffAuth.record?.name || '',
              });
              return;
            } else {
              dispatchRoute({
                view: 'login',
                error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
              });
              return;
            }
          }

          if (state === 'register_student') {
            if (preAuthCheck.isAuthorized) {
              localStorage.setItem('school_active_session_email', email);
              try {
                await registerWithGoogle({
                  email,
                  role: 'student',
                  providedName: displayName,
                  photoURL,
                });
              } catch {}
              dispatchRoute({ view: 'home' });
              return;
            } else {
              dispatchRoute({
                view: 'login',
                error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
              });
              return;
            }
          }

          if (state === 'register_parent') {
            if (preAuthCheck.isAuthorized) {
              localStorage.setItem('school_active_session_email', email);
              try {
                await registerWithGoogle({
                  email,
                  role: 'parent',
                  providedName: displayName,
                  photoURL,
                });
              } catch {}
              dispatchRoute({ view: 'home' });
              return;
            } else {
              dispatchRoute({
                view: 'login',
                error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
              });
              return;
            }
          }

          dispatchRoute({
            view: 'login',
            error: 'تعذر تحديد قسم التسجيل المطلوب. يرجى المحاولة مرة أخرى.',
          });
          return;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // RULE 2: مسار [تسجيل الدخول السريع عبر Google] (Quick Google Login)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        clearTimeout(timeoutTimer);

        // إذا كان البريد غير مكتمل البيانات في هذا المسار: اعرض تنبيه «يرجى إكمال عملية التسجيل لأول مرة أولاً».
        if (!isAlreadyCompleted) {
          const incompleteError = 'يرجى إكمال عملية التسجيل لأول مرة أولاً.';
          dispatchRoute({
            view: 'login',
            error: incompleteError,
            staffActivationEmail: staffAuth.isAuthorized && !staffAuth.isActivated ? email : undefined,
            staffActivationName: displayName || staffAuth.record?.name,
          });
          return;
        }

        // إذا تبين أن البريد القادم من Google في هذا المسار مكتمل البيانات: انقل المستخدمة فوراً وبشكل تلقائي إلى [لوحة التحكم].
        localStorage.setItem('school_active_session_email', email);
        try {
          await registerWithGoogle({
            email,
            providedName: displayName || staffAuth.record?.name || preAuthCheck.profile?.name,
            photoURL,
          });
        } catch (authErr) {
          console.warn('[AuthCallbackView] registerWithGoogle notice:', authErr);
        }

        if (
          isOwner ||
          isPrincipal ||
          schoolRole === 'director' ||
          schoolRole === 'system_owner' ||
          schoolRole === 'teacher' ||
          schoolRole === 'supervisor' ||
          schoolRole === 'administrator' ||
          schoolRole === 'counselor'
        ) {
          dispatchRoute({ view: 'admin_dashboard' });
        } else {
          dispatchRoute({ view: 'home' });
        }
        return;
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        console.warn('[AuthCallbackView] Callback processing notice:', err?.message || err);
        setErrorMessage('تعذر استكمال التحقق من حساب Google. يرجى الضغط أدناه لإعادة المحاولة.');
      }
    };

    processOAuthCallback();

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-400/30">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-white">مدرسة صفية بنت عمر الثانوية</h2>
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>بوابة المصادقة الرسمية Google OAuth Callback</span>
          </div>
        </div>

        {blockedAccountNotice ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 rounded-2xl text-xs sm:text-sm text-right flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">
                <strong className="block mb-1 text-white text-sm">تنبيه النظام:</strong>
                {blockedAccountNotice}
              </div>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              جارٍ تحويلك تلقائياً إلى صفحة الدخول السريع عبر Google خلال {redirectCountdown} ثوانٍ...
            </p>

            <button
              type="button"
              onClick={() => onRoute({ view: 'login', notice: blockedAccountNotice })}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-[0.99] transition-all"
            >
              <span>الانتقال المباشر لتسجيل الدخول السريع الآن ←</span>
            </button>
          </div>
        ) : errorMessage ? (
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs sm:text-sm text-right flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">
                <strong className="block mb-1 text-white">تنبيه المصادقة:</strong>
                {errorMessage}
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleRetryGoogleAuth}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 shadow-lg shadow-white/10 transition-all cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>إعادة المحاولة عبر Google</span>
              </button>

              <button
                type="button"
                onClick={() => onRoute({ view: 'login' })}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ← العودة لصفحة الدخول
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {statusMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default AuthCallbackView;
