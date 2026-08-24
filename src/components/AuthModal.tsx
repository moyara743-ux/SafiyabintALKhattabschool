import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, User as UserIcon, Shield, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OWNER_EMAIL } from '../data/initialData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        onClose();
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
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.');
      }
    } catch (err: any) {
      console.error(err);
      let message = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'هذا البريد الإلكتروني مسجل مسبقاً.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'صيغة البريد الإلكتروني غير صحيحة.';
      } else if (err.code === 'auth/weak-password') {
        message = 'كلمة المرور ضعيفة جداً.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemoOwner = () => {
    setEmail(OWNER_EMAIL);
    setPassword('SafiyyahAdmin2026!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl border border-emerald-100"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-l from-emerald-800 to-teal-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-emerald-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="إغلاق"
          >
            ✕
          </button>
          
          <div className="w-14 h-14 mx-auto mb-3 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
            <GraduationCap className="w-8 h-8 text-amber-300" />
          </div>
          
          <h2 className="text-xl font-bold font-serif tracking-wide">مدرسة صفية بنت عمر</h2>
          <p className="text-emerald-100 text-xs mt-1">بوابة الحسابات والخدمات التعليمية الآمنة</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الاسم الثلاثي أو المستعار
                </label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: نورة محمد العتيبي"
                    className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    كلمة المرور
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <>
                  <span>إنشاء الحساب</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>إرسال رابط الاستعادة</span>
              )}
            </button>
          </form>

          {/* Directrice / Owner Quick helper */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-amber-900 text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-right">
                <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                <span>حساب المديرة والمالكة الرئيسية ({OWNER_EMAIL})</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemoOwner}
                className="px-2 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded text-[10px] transition-colors"
              >
                تعبئة
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              جميع البيانات محمية بأعلى معايير الأمان والتشفير وفق نظام حماية البيانات.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
