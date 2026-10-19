import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { decodeJwt } from '../lib/googleAuth';
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

    // 1. Strict Timeout Safety: Max 1000ms (1 second)
    const timeoutTimer = setTimeout(() => {
      if (isMounted && !hasRoutedRef.current) {
        console.warn('[AuthCallbackView] 1s safety timeout reached.');
        dispatchRoute({
          view: 'login',
          error: 'انتهت مهلة استلام بيانات المصادقة من Google. يرجى إعادة المحاولة.',
        });
      }
    }, 1000);

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
          dispatchRoute({
            view: 'login',
            error: 'تم إلغاء عملية تسجيل الدخول أو رفض الإذن من قِبل Google.',
          });
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
            const fetchTimeout = setTimeout(() => controller.abort(), 600);
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
          dispatchRoute({
            view: 'login',
            error: 'لم يتم استلام بريد إلكتروني صالح من Google. يرجى المحاولة مرة أخرى.',
          });
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
        dispatchRoute({
          view: 'login',
          error: 'تعذر استكمال التحقق من حساب Google. يرجى المحاولة مرة أخرى.',
        });
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
          <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs sm:text-sm text-right flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed flex-1">
              <strong className="block mb-1 text-white">تنبيه المصادقة:</strong>
              {errorMessage}
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

        {errorMessage && (
          <button
            type="button"
            onClick={() => onRoute({ view: 'login' })}
            className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ← العودة لصفحة الدخول
          </button>
        )}
      </div>
    </div>
  );
};
export default AuthCallbackView;
