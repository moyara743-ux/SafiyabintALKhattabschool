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
  CheckCircle2,
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

  const [activeTab, setActiveTab] = useState<'staff' | 'student' | 'parent'>('staff');

  // Alternative Form state
  const [showAltForm, setShowAltForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student Form
  const [studentName, setStudentName] = useState('');
  const [studentSecret, setStudentSecret] = useState('');
  const [showStudentSecret, setShowStudentSecret] = useState(false);

  // Custom Google input
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null);
    setEmail('');
    setPassword('');
    setStudentName('');
    setStudentSecret('');
    setShowGoogleInput(false);
    setShowAltForm(false);
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

  const handleGoogleClick = async () => {
    setError(null);

    if (getGoogleClientId()) {
      setLoading(true);
      try {
        await signInWithGoogle();
        return;
      } catch (err: any) {
        setLoading(false);
      }
    }

    // Direct Google Email Prompt
    setShowGoogleInput(true);
  };

  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال عنوان بريد Google صحيح.');
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogleAccount(cleanEmail);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول بالبريد المحدد.');
    } finally {
      setLoading(false);
    }
  };

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
      setError('يرجى إدخال الرمز المخصص لك من إدارة المدرسة.');
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
          <p className="text-xs text-slate-500">مدرسة صفية بنت عمر الثانوية • الدخول الموحد</p>
        </div>

        {/* Category Tabs (3 Categories) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'staff'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">المنسوبات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'student'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">الطالبة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'parent'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ولي الأمر</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Primary Action: Google Login */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
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

          {showGoogleInput && (
            <form onSubmit={handleGoogleDirectSubmit} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                أدخل عنوان بريد Google المعتمد:
              </label>
              <input
                type="email"
                required
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="moyara743@gmail.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                dir="ltr"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleInput(false)}
                  className="flex-1 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  تأكيد
                </button>
              </div>
            </form>
          )}

          {/* Quick link to alternative login */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowAltForm(!showAltForm)}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              {showAltForm ? 'إخفاء خيارات الدخول البديلة' : 'أو الدخول بالرمز المدرسي / كلمة المرور'}
            </button>
          </div>
        </div>

        {/* Collapsible Alternative Forms */}
        {showAltForm && (
          <div className="pt-2 border-t border-slate-100 animate-in fade-in">
            {activeTab === 'student' ? (
              <form onSubmit={handleStudentSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالبة الرباعي *</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="اسم الطالبة كاملاً"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرمز *</label>
                  <div className="relative">
                    <input
                      type={showStudentSecret ? 'text' : 'password'}
                      required
                      value={studentSecret}
                      onChange={(e) => setStudentSecret(e.target.value)}
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
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    أدخل الرمز المخصص لك من إدارة المدرسة
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  دخول الطالبة
                </button>
              </form>
            ) : (
              <form onSubmit={handleStaffSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@safiah.edu.sa"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-mono"
                    dir="ltr"
                  />
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono pr-9 pl-9"
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
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  دخول بالحساب
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
