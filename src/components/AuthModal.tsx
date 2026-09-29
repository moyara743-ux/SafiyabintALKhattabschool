import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, AlertCircle, Lock, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OWNER_EMAIL } from '../data/initialData';
import { getGoogleClientId } from '../lib/googleAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { loginWithGoogleCredential } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const clientId = getGoogleClientId();
    if (clientId && window.google?.accounts?.id && googleBtnContainerRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            setLoading(true);
            try {
              await loginWithGoogleCredential(response.credential);
              onClose();
            } catch (err: any) {
              setError(err?.message || 'تعذر إتمام تسجيل الدخول عبر Google.');
              setLoading(false);
            }
          },
          auto_select: false,
        });

        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 320,
          locale: 'ar',
        });
      } catch (e) {
        console.warn('[AuthModal] Google GSI initialization note:', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      console.error('Google Auth Modal Error:', err);
      const message =
        err?.message ||
        (typeof err === 'string'
          ? err
          : 'تعذر الاتصال بخدمة تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl border border-emerald-100"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-l from-emerald-800 to-teal-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-emerald-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
            <GraduationCap className="w-8 h-8 text-amber-300" />
          </div>

          <h2 className="text-xl font-black tracking-wide">مدرسة صفية بنت عمر الابتدائية</h2>
          <p className="text-emerald-100 text-xs mt-1">بوابة الدخول الموحد والتحقق الرسمي</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-800">
              تسجيل الدخول إلى المنصة
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تسجيل الدخول معتمد حصرياً عبر حساب Google الرسمي للوصول الآمن إلى المحتوى المدرسي والخدمات.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Official Google GSI Rendered Button */}
          <div className="flex flex-col items-center justify-center w-full space-y-3">
            <div ref={googleBtnContainerRef} className="flex items-center justify-center w-full" />

            {/* Primary Action Button: Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleOAuthSignIn}
              disabled={loading}
              className="w-full group py-3.5 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="تسجيل الدخول باستخدام Google"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-emerald-600 rounded-full animate-spin" />
                  <span>جارٍ التوجيه إلى Google...</span>
                </div>
              ) : (
                <>
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
                  <span className="font-black text-slate-800">
                    تسجيل الدخول باستخدام Google
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                    (Sign in with Google)
                  </span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              سيتم نقلك لصفحة المصادقة الرسمية لدى Google، وبعد الموافقة يتم إرجاعك وتخزين بريدك تلقائياً في Supabase.
            </p>
          </div>

          {/* Quick Info & Security Details */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-emerald-900 text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-right">
                <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>حساب مالك النظام المعتمد:</span>
              </div>
              <span className="font-mono font-bold text-[10px] text-emerald-800">
                {OWNER_EMAIL}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              جميع عمليات التحقق مشفرة بنظام الحماية OAuth 2.0 المعتمد عالمياً.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
