import React, { useState } from 'react';
import { SchoolRole, UserProfile } from '../types';
import { verifyStaffRolePasscode } from '../lib/passcodeService';
import { activateStaffEmail } from '../lib/authorizedStaffService';
import { registerOrAuthenticateWithGoogle } from '../lib/googleAuth';
import {
  GraduationCap,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface StaffActivationModalProps {
  email: string;
  initialName?: string;
  photoURL?: string;
  onSuccess: (profile: UserProfile) => void;
  onCancel: () => void;
}

export const StaffActivationModal: React.FC<StaffActivationModalProps> = ({
  email,
  initialName = '',
  photoURL,
  onSuccess,
  onCancel,
}) => {
  const [fullName, setFullName] = useState(initialName);
  // Strict Security: No default selection. User MUST explicitly click to choose her job title.
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'supervisor' | 'administrator' | 'counselor' | null>(null);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rolesList: {
    id: 'teacher' | 'supervisor' | 'administrator' | 'counselor';
    title: string;
    desc: string;
    color: string;
  }[] = [
    {
      id: 'teacher',
      title: 'المعلمة',
      desc: 'الكادر التعليمي والتدريس',
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-950',
    },
    {
      id: 'supervisor',
      title: 'المشرفة التربوية',
      desc: 'الإشراف الأكاديمي والمتابعة',
      color: 'border-blue-500 bg-blue-500/10 text-blue-950',
    },
    {
      id: 'administrator',
      title: 'الإدارية',
      desc: 'الشؤون الإدارية والتنظيمية',
      color: 'border-indigo-500 bg-indigo-500/10 text-indigo-950',
    },
    {
      id: 'counselor',
      title: 'المرشدة الطلابية',
      desc: 'التوجيه والإرشاد الطلابي',
      color: 'border-purple-500 bg-purple-500/10 text-purple-950',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanPasscode = passcode.trim();

    if (!cleanName) {
      setError('يرجى كتابة الاسم الثلاثي أو الرباعي المعتمد.');
      return;
    }

    if (!selectedRole) {
      setError('يرجى تحديد مسماكِ الوظيفي المعتمد أولاً.');
      return;
    }

    if (!cleanPasscode) {
      setError('يرجى إدخال رمز الأمان الوظيفي.');
      return;
    }

    // STRICT CHECK: Verify that the entered passcode matches the EXACT role selected
    // Generic error message to prevent brute-forcing / guessing of roles and codes
    const verification = verifyStaffRolePasscode(selectedRole, cleanPasscode);
    if (!verification.isValid) {
      setError(
        verification.message ||
          'تعذر التفعيل، يرجى التأكد من البيانات المدخلة والمحاولة مرة أخرى.'
      );
      return;
    }

    setLoading(true);

    try {
      // Execute registration / activation with Google
      const authRes = await registerOrAuthenticateWithGoogle({
        email,
        role: selectedRole,
        passcode: cleanPasscode,
        providedName: cleanName,
        photoURL,
      });

      // Mark as activated in authorized staff service
      await activateStaffEmail({
        email,
        role: selectedRole,
        name: cleanName,
      });

      onSuccess(authRes.profile);
    } catch (err: any) {
      console.error('[StaffActivationModal] Error:', err);
      setError(err?.message || 'تعذر تفعيل الحساب. يرجى مراجعة إدارة المدرسة.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md flex items-center justify-center min-h-screen"
      dir="rtl"
    >
      <div className="w-full max-w-lg my-auto bg-white rounded-3xl shadow-2xl border-2 border-emerald-500/30 text-slate-900 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-5 sm:p-6 text-white text-center rounded-t-3xl relative">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg border border-emerald-300/40 mb-3 shrink-0">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight break-words">
            مدرسة صفية بنت عمر الثانوية
          </h2>
          <p className="text-xs text-emerald-200 font-bold mt-1 break-words">
            الخطوة 2: تحديد المسمى الوظيفي وإدخال رمز الأمان المعتمد
          </p>

          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-800/90 border border-emerald-400/50 text-[11px] text-emerald-100 font-black shadow-xs text-center max-w-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="break-words">اكتملت الخطوة 1: تم التحقق من ملكية البريد واعتماده في المدرسة</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-5">
          {/* Email Info Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-right space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block break-words">
                بريد Google المصرح له من الإدارة:
              </span>
              <span className="text-xs font-mono font-black text-slate-900 break-all" dir="ltr">
                {email}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 self-start sm:self-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 sm:p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs font-bold text-rose-900 flex items-start gap-2.5 animate-in shake break-words">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed break-words flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 break-words">
                الاسم الكامل للمنسوبة (الاسم الثلاثي أو الرباعي): <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أ. سحر أحمد العتيبي"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 pr-9 break-words"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* 2. Job Title Selection (4 approved staff roles - No default selection) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <label className="block text-xs font-bold text-slate-800 break-words">
                  اختاري مسماكِ الوظيفي المعتمد: <span className="text-rose-500">*</span>
                </label>
                {!selectedRole && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0">
                    يرجى النقر لتحديد المسمى
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rolesList.map((r) => {
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(r.id);
                        setError(null);
                      }}
                      className={`p-3 sm:p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[72px] break-words ${
                        isSelected
                          ? `${r.color} shadow-sm font-black ring-2 ring-emerald-500/30`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="text-xs font-extrabold break-words">{r.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-500 break-words leading-relaxed">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Confidential Role Security Passcode (Completely Anonymous & Generic) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <label className="block text-xs font-bold text-slate-800 break-words">
                  رمز الأمان الوظيفي <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                  معتمد من الإدارة
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(null);
                  }}
                  placeholder="أدخلي الرمز الوظيفي المعتمد"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 pr-9 pl-9 tracking-wider"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed break-words">
                * شرط أمني: يجب إدخال الرمز الوظيفي المعتمد الخاص بمسمّاكِ بدقة كما استلمتِه من إدارة المدرسة؛ لن يقبل النظام أي رمز غير مطابق.
              </p>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex flex-wrap items-center justify-center gap-2 text-center break-words"
              >
                {loading ? (
                  <span>جارٍ المطابقة وتفعيل الحساب...</span>
                ) : (
                  <>
                    <span>تأكيد وتفعيل الحساب والدخول للمنصة</span>
                    <ArrowRight className="w-4 h-4 rotate-180 shrink-0" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer text-center shrink-0"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default StaffActivationModal;
