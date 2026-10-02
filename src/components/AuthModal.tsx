import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Shield,
  AlertCircle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  X,
  KeyRound,
  Users,
} from 'lucide-react';
import { getGoogleClientId } from '../lib/googleAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    login,
    loginStudent,
    signInWithGoogle,
    loginWithGoogleCredential,
    loginWithGoogleAccount,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'staff_parent' | 'student'>('staff_parent');

  // Staff Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student Form
  const [studentName, setStudentName] = useState('');
  const [studentSecret, setStudentSecret] = useState('');
  const [showStudentSecret, setShowStudentSecret] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null);
    setEmail('');
    setPassword('');
    setStudentName('');
    setStudentSecret('');
  }, [isOpen, activeTab]);

  // Google Identity Services (GIS) inside modal
  useEffect(() => {
    if (!isOpen) return;
    const clientId = getGoogleClientId();
    if (!clientId) return;

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
              if (response?.credential) {
                setLoading(true);
                setError(null);
                try {
                  await loginWithGoogleCredential(response.credential);
                  onClose();
                } catch (err: any) {
                  setError(err?.message || 'تعذر التحقق من اعتماد Google');
                } finally {
                  setLoading(false);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280,
            locale: 'ar',
          });
        } catch (e) {
          console.warn('[Modal GIS] Notice:', e);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, loginWithGoogleCredential, onClose]);

  if (!isOpen) return null;

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال عنوان بريد إلكتروني صالح.');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'بيانات الدخول غير صحيحة.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = studentName.trim();
    const cleanSecret = studentSecret.trim();

    if (!cleanName) {
      setError('يرجى كتابة اسم الطالبة الرباعي.');
      return;
    }
    if (!cleanSecret) {
      setError('يرجى إدخال السر الخاص بالطالبة.');
      return;
    }

    setLoading(true);
    try {
      await loginStudent(cleanName, cleanSecret);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'بيانات الدخول غير صحيحة.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول عبر Google.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 mx-auto bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-950/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">تسجيل الدخول للمنصة</h3>
          <p className="text-xs text-slate-500">مدرسة صفية بنت عمر الثانوية</p>
        </div>

        {/* Category Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('staff_parent')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'staff_parent'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>المنسوبات وأولياء الأمور</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>دخول الطالبات</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Tab 1: Staff & Parents */}
        {activeTab === 'staff_parent' && (
          <div className="space-y-4">
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>تسجيل الدخول باستخدام Google</span>
            </button>

            <div className="flex justify-center" ref={googleBtnContainerRef} />

            <div className="relative text-center py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative px-3 bg-white text-[10px] text-slate-400 font-medium">
                أو بالبريد الإلكتروني وكلمة المرور
              </span>
            </div>

            <form onSubmit={handleStaffSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@safiah.edu.sa"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 font-mono pr-9"
                    dir="ltr"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 font-mono pr-9 pl-9"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-extrabold text-white shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
          </div>
        )}

        {/* Tab 2: Students */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالبة الرباعي *</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="مثال: سارة محمد راشد العتيبي"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السر الخاص بالطالبة *</label>
              <div className="relative">
                <input
                  type={showStudentSecret ? 'text' : 'password'}
                  required
                  value={studentSecret}
                  onChange={(e) => setStudentSecret(e.target.value)}
                  placeholder="STU-XXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 font-mono pr-9 pl-9"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowStudentSecret(!showStudentSecret)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showStudentSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-extrabold text-white shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
        )}

        <div className="pt-2 border-t border-slate-100 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>الحسابات معتمدة رسمياً ومحمية بنظام قفل المحاولات الفاشلة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
