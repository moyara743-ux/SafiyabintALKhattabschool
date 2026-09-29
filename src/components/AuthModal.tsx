import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, AlertCircle, Lock, CheckCircle2, X, ArrowRight, UserPlus, UserCheck, Eye, EyeOff } from 'lucide-react';
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
}) => {
  const { loginWithGoogleAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCustomAccount, setShowCustomAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSelectAccount = async (email: string, name?: string) => {
    setError(null);
    setSelectedEmail(email);
    setLoading(true);

    try {
      await loginWithGoogleAccount(email, name);
      onClose();
    } catch (err: any) {
      console.error('[Google Modal Login] Error:', err);
      setError(err?.message || 'تعذر إتمام الدخول والمزامنة مع Supabase.');
      setLoading(false);
      setSelectedEmail(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = customEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('يرجى إدخال عنوان بريد Google صالح.');
      return;
    }

    setLoading(true);
    setSelectedEmail(email);

    try {
      await loginWithGoogleAccount(email, customName.trim());
      onClose();
    } catch (err: any) {
      console.error('[Google Modal Login] Error:', err);
      setError(err?.message || 'تعذر إتمام الدخول والمزامنة مع Supabase.');
      setLoading(false);
      setSelectedEmail(null);
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
          <p className="text-emerald-100 text-xs mt-1">بوابة الدخول الموحد (Google Sign-In)</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-base font-extrabold text-slate-800">
              اختيار حساب للمتابعة
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              اختر حساب Google الخاص بك للدخول الفوري ومزامنة الصلاحيات مع Supabase.
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

          {!showCustomAccount ? (
            <div className="space-y-2">
              {/* Owner Account */}
              <button
                type="button"
                onClick={() => handleSelectAccount(OWNER_EMAIL, 'يارا محمد راشد - مالك النظام')}
                disabled={loading}
                className="w-full text-right p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-300 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    ي
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-emerald-950">يارا محمد راشد</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                        مالك النظام 👑
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {OWNER_EMAIL}
                    </span>
                  </div>
                </div>

                {loading && selectedEmail === OWNER_EMAIL ? (
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:-translate-x-1 transition-transform" />
                )}
              </button>

              {/* Student Account */}
              <button
                type="button"
                onClick={() => handleSelectAccount('yaradrashed@gmail.com', 'منال علي')}
                disabled={loading}
                className="w-full text-right p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    م
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-800">منال علي</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        طالبة 🎓
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      yaradrashed@gmail.com
                    </span>
                  </div>
                </div>

                {loading && selectedEmail === 'yaradrashed@gmail.com' ? (
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                )}
              </button>

              {/* Another Account Button */}
              <button
                type="button"
                onClick={() => setShowCustomAccount(true)}
                disabled={loading}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>استخدام حساب Google آخر (Use another account)</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  البريد الإلكتروني لحساب Google
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الاسم الكامل (اختياري)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="الاسم الكريم"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomAccount(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

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
              يتم حفظ الحساب والتحقق من الصلاحيات فوراً في قاعدة بيانات Supabase.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
