import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { decodeJwt, redirectToGoogleOAuth } from '../lib/googleAuth';
import { isStaffEmailAuthorized } from '../lib/authorizedStaffService';
import { verifyGoogleEmailPreAuthorization } from '../lib/authSecurity';
import { SYSTEM_OWNER_EMAIL, getDesignatedPrincipalEmail } from '../lib/principalService';
import { GraduationCap, Shield, AlertCircle } from 'lucide-react';

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

  const processedRef = useRef(false);
  const hasRoutedRef = useRef(false);

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

        let email = '';
        let displayName = '';
        let photoURL = '';

        if (idToken) {
          const decoded = decodeJwt(idToken);
          email = (decoded.email || '').trim().toLowerCase();
          displayName = decoded.name || '';
          photoURL = decoded.picture || '';
        } else if (accessToken) {
          // Fast fetch from Google userinfo API
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

        if (!email) {
          // Direct check if email was passed in search params
          const directEmail = searchParams.get('email');
          if (directEmail) {
            email = directEmail.trim().toLowerCase();
            displayName = searchParams.get('name') || '';
          }
        }

        // Strict Check: Must have a valid Google email from the official OAuth response
        if (!email || !email.includes('@')) {
          clearTimeout(timeoutTimer);
          setErrorMessage('لم يتم استلام بريد إلكتروني صالح من Google. يرجى الضغط أدناه لإعادة المحاولة.');
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

        // 2. Strict Redirection Logic:
        // A. System Owner & Designated Principal:
        const isOwner = email === SYSTEM_OWNER_EMAIL.toLowerCase();
        const isPrincipal = email === getDesignatedPrincipalEmail().toLowerCase();

        if (isOwner || isPrincipal) {
          clearTimeout(timeoutTimer);
          try {
            await registerWithGoogle({
              email,
              providedName: displayName,
              photoURL,
            });
          } catch {}
          dispatchRoute({ view: 'admin_dashboard' });
          return;
        }

        // B. Check Authorized Staff List:
        const staffAuth = await isStaffEmailAuthorized(email);

        if (staffAuth.isAuthorized) {
          clearTimeout(timeoutTimer);
          if (!staffAuth.isActivated) {
            // RULE 1:
            // البريد معتمد ومُدرج في قائمة الإدارة وكان الحساب (غير مفعل / لأول مرة):
            // يُعاد توجيه المنسوبة تلقائياً إلى صفحة إكمال البيانات والرمز
            dispatchRoute({
              view: 'login',
              staffActivationEmail: email,
              staffActivationName: displayName || staffAuth.record?.name || '',
            });
            return;
          } else {
            // الحساب مفعل مسبقاً في قاعدة بيانات المدرسة
            if (state === 'register_staff') {
              // إذا حاولت منسوبة مفعلة التسجيل عبر "شاشة أول مرة"
              dispatchRoute({
                view: 'login',
                error: 'حسابكِ مفعل مسبقاً في النظام برتبة معتمدة. يرجى استخدام «تسجيل الدخول السريع عبر Google» للدخول المباشر إلى المنصة.',
              });
              return;
            } else {
              // الدخول السريع لحساب مفعل مسبقاً
              try {
                await registerWithGoogle({
                  email,
                  providedName: displayName || staffAuth.record?.name,
                  photoURL,
                });
              } catch {}
              dispatchRoute({ view: 'home' });
              return;
            }
          }
        }

        // C. Check General School Database (Students & Parents):
        const preAuthCheck = await verifyGoogleEmailPreAuthorization(email);

        clearTimeout(timeoutTimer);

        if (state === 'register_student') {
          if (
            preAuthCheck.isAuthorized &&
            preAuthCheck.profile &&
            (preAuthCheck.profile.is_profile_completed ||
              preAuthCheck.profile.accountStatus === 'completed')
          ) {
            dispatchRoute({
              view: 'login',
              notice:
                'حساب الطالبة مفعل ومكتمل مسبقاً في النظام. يرجى استخدام «تسجيل الدخول السريع عبر Google» للدخول المباشر.',
            });
            return;
          }
          if (preAuthCheck.isAuthorized) {
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
          }
          // Student not registered
          dispatchRoute({
            view: 'login',
            error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
          });
          return;
        }

        if (state === 'register_parent') {
          if (preAuthCheck.isAuthorized && preAuthCheck.profile?.accountStatus === 'completed') {
            dispatchRoute({
              view: 'login',
              notice:
                'حساب ولي الأمر مفعل ومكتمل مسبقاً في النظام. يرجى استخدام «تسجيل الدخول السريع عبر Google» للدخول المباشر.',
            });
            return;
          }
          if (preAuthCheck.isAuthorized) {
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
          }
          // Parent not registered
          dispatchRoute({
            view: 'login',
            error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
          });
          return;
        }

        // Quick Sign-In
        if (preAuthCheck.isAuthorized) {
          try {
            await registerWithGoogle({
              email,
              providedName: displayName,
              photoURL,
            });
          } catch {}
          dispatchRoute({ view: 'home' });
          return;
        }

        // Strict Rejection for any email not in the school database:
        dispatchRoute({
          view: 'login',
          error: 'هذا البريد غير مسجل لدى إدارة المدرسة.',
        });
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

        {errorMessage ? (
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
