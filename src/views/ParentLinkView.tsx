import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentRecord, RelationshipType } from '../types';
import {
  verifyAndInitiateParentLink,
  completeParentLinkingWithOtp,
} from '../lib/studentService';
import {
  HeartHandshake,
  Shield,
  Phone,
  Key,
  GraduationCap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Check,
  Lock,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

interface ParentLinkViewProps {
  onSuccess?: () => void;
  onNavigateHome?: () => void;
}

export const ParentLinkView: React.FC<ParentLinkViewProps> = ({
  onSuccess,
  onNavigateHome,
}) => {
  const { user, profile, refreshProfile } = useAuth();

  // Wizard Steps: 1: Enter Info, 2: OTP SMS, 3: Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Step 1
  const [phone, setPhone] = useState(profile?.phone || '');
  const [studentName, setStudentName] = useState('');
  const [linkingCode, setLinkingCode] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('guardian');

  // Step 2: OTP State
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string>('');
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [matchedStudent, setMatchedStudent] = useState<StudentRecord | null>(null);

  // Timer & Cooldown
  const [secondsLeft, setSecondsLeft] = useState<number>(300); // 5 mins
  const [resendCooldown, setResendCooldown] = useState<number>(60); // 60s
  const [canResend, setCanResend] = useState(false);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 3: Linked Student details
  const [linkedStudent, setLinkedStudent] = useState<StudentRecord | null>(null);

  // Timer countdown for OTP
  useEffect(() => {
    if (step !== 2) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });

      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Step 1: Submit Details & Verify Match
  const handleInitiateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError('يرجى إدخال رقم الجوال المسجل للطالبة.');
      return;
    }
    if (!studentName.trim()) {
      setError('يرجى إدخال اسم الطالبة الرباعي كما هو مسجل في المدرسة.');
      return;
    }
    if (!linkingCode.trim()) {
      setError('يرجى إدخال رمز الربط الصادر من إدارة المدرسة.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAndInitiateParentLink({
        studentName: studentName.trim(),
        phone: phone.trim(),
        linkingCode: linkingCode.trim(),
        actorEmail: profile?.email || user?.email,
      });

      setOtpSessionId(res.otpSessionId);
      setMaskedPhone(res.maskedPhone);
      setPreviewOtp(res.previewCode || null);
      setMatchedStudent(res.student);
      setSecondsLeft(300);
      setResendCooldown(60);
      setCanResend(false);
      setStep(2);
    } catch (err: any) {
      console.error('[ParentLink] Initiate error:', err);
      setError(err?.message || 'تعذر التحقق من بيانات الربط.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm OTP & Finalize Atomic Link
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSessionId || !profile) return;

    if (!enteredOtp.trim() || enteredOtp.trim().length < 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await completeParentLinkingWithOtp({
        otpSessionId,
        enteredOtp: enteredOtp.trim(),
        relationshipType,
        parentUser: profile,
      });

      setLinkedStudent(res.student);
      setStep(3);

      // Refresh auth profile so the application recognizes active relationship
      if (refreshProfile) {
        await refreshProfile();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('[ParentLink] Complete error:', err);
      setError(err?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || !matchedStudent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyAndInitiateParentLink({
        studentName: studentName.trim(),
        phone: phone.trim(),
        linkingCode: linkingCode.trim(),
        actorEmail: profile?.email || user?.email,
      });

      setOtpSessionId(res.otpSessionId);
      setPreviewOtp(res.previewCode || null);
      setSecondsLeft(300);
      setResendCooldown(60);
      setCanResend(false);
      setEnteredOtp('');
    } catch (err: any) {
      setError(err?.message || 'تعذر إعادة إرسال رمز التحقق.');
    } finally {
      setLoading(false);
    }
  };

  // Format countdown mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4" dir="rtl">
      {/* Wizard Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-800 to-teal-600 rounded-3xl flex items-center justify-center text-white shadow-xl border border-emerald-400/30">
          <HeartHandshake className="w-8 h-8 text-amber-300" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>الربط الرسمي المعتمد لطالبات مدرسة صفية بنت عمر</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          ربط حساب ولي الأمر بالطالبة
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          وفق أنظمة المدرسة المعتمدة، لا يتم تفعيل دخول ولي الأمر إلى المنصة إلا بعد التحقق من اسم الطالبة ورقم الجوال المعتمد ورمز الربط ورمز OTP.
        </p>

        {/* Steps Progress Indicator */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              step === 1
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <span>1</span>
            <span>بيانات الربط</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-200" />

          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              step === 2
                ? 'bg-emerald-700 text-white shadow'
                : step === 3
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span>2</span>
            <span>رمز التحقق (SMS)</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-200" />

          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              step === 3
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span>3</span>
            <span>اكتمال التفعيل</span>
          </div>
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block font-bold mb-0.5">تعذر إتمام التحقق:</strong>
              {error}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: Enter Details */}
        {/* ============================================================ */}
        {step === 1 && (
          <form onSubmit={handleInitiateLink} className="space-y-4 animate-in fade-in">
            <div className="space-y-1 border-b border-slate-100 pb-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                الخطوة الأولى: مطابقة بيانات الطالبة ورمز الربط
              </h2>
              <p className="text-xs text-slate-500">
                يجب أن تطابق جميع البيانات سجلات المدرسة المعتمدة لإرسال رمز التحقق.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم الطالبة الرباعي *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: سارة محمد راشد العتيبي"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white pr-9"
                />
                <GraduationCap className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                كما هو مسجل رسمياً في المدرسة.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الجوال المرتبط بالطالبة *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono pr-9"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[11px] text-amber-700 font-medium mt-1 block">
                ⚠️ قاعدة إلزامية: يجب أن يطابق تماماً رقم الجوال المسجل في ملف الطالبة بالمدرسة، وإلا سيفشل الربط مباشرة.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رمز الربط الصادر من إدارة المدرسة *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={linkingCode}
                  onChange={(e) => setLinkingCode(e.target.value.toUpperCase())}
                  placeholder="K8F2-XP94-MQ71-Z6R8"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono tracking-wider uppercase pr-9"
                  dir="ltr"
                />
                <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                رمز قوي ومؤقت صالح لمدة 3 أيام من تاريخ إصداره، ويُستخدم لمرة واحدة فقط.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                صلة القرابة
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="father">أب</option>
                <option value="mother">أم</option>
                <option value="guardian">ولي أمر شرعي / معتمد</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>التحقق وإرسال رمز OTP (SMS)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 2: OTP Verification */}
        {/* ============================================================ */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
            <div className="space-y-1 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>تمت مطابقة اسم الطالبة ورقم الجوال ورمز الربط بنجاح</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                الخطوة الثانية: إدخال رمز التحقق (SMS OTP)
              </h2>
              <p className="text-xs text-slate-500">
                تم إرسال رمز التحقق المكون من 6 أرقام إلى رقم الجوال المسجل للطالبة:{' '}
                <strong className="text-slate-900 font-mono" dir="ltr">
                  {maskedPhone}
                </strong>
              </p>
            </div>

            {/* In Preview / Dev environment, display simulator notice */}
            {previewOtp && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  <span>محاكاة الرسائل النصية القصيرة (SMS Simulator):</span>
                </div>
                <p>
                  رمز التحقق المرسل للجوال ({maskedPhone}) هو:{' '}
                  <strong className="font-mono text-sm tracking-widest text-slate-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {previewOtp}
                  </strong>
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                أدخل رمز التحقق (6 أرقام)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full max-w-xs mx-auto block py-3 px-4 text-center text-xl sm:text-2xl font-mono font-black tracking-[0.5em] bg-slate-50 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-white"
                dir="ltr"
                autoFocus
              />
            </div>

            {/* Timer and Resend Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>تنتهي الجلسة خلال:</span>
                <strong className="font-mono text-slate-800">{formatTime(secondsLeft)}</strong>
              </span>

              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  إعادة إرسال الرمز
                </button>
              ) : (
                <span className="text-slate-400">
                  إعادة الإرسال بعد ({resendCooldown} ثانية)
                </span>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                الرجوع للخطوة السابقة
              </button>

              <button
                type="submit"
                disabled={loading || secondsLeft <= 0}
                className="flex-[2] py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-xs sm:text-sm font-extrabold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد التحقق وإتمام الربط</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 3: Success Screen */}
        {/* ============================================================ */}
        {step === 3 && linkedStudent && (
          <div className="text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                تهانينا! تم ربط الحساب وتفعيل الدخول بنجاح
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                أصبح حساب ولي الأمر فعالاً ومرتبطاً رسمياً بسجلات المدرسة.
              </p>
            </div>

            {/* Student Card Summary */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-right space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">بيانات الطالبة المرتبطة:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  ربط نشط ومعتمد ✓
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <p>
                  اسم الطالبة: <strong className="text-slate-900 text-sm">{linkedStudent.name}</strong>
                </p>
                <p>
                  معرّف الطالبة: <strong className="font-mono text-slate-900">{linkedStudent.student_id_code}</strong>
                </p>
                <p>
                  المرحلة الدراسية: <strong className="text-slate-900">{linkedStudent.grade_stage}</strong>
                </p>
                <p>
                  المدرسة:{' '}
                  <strong className="text-emerald-900">مدرسة صفية بنت عمر الثانوية</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onNavigateHome) {
                  onNavigateHome();
                } else {
                  window.location.reload();
                }
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-sm font-extrabold text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>الدخول إلى منصة المدرسة وبوابة طالباتي</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Safety & School Instructions */}
      <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-500 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <span>تعليمات وإرشادات المدرسة لأولياء الأمور:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 leading-relaxed text-slate-600">
          <li>يتم إصدار رمز الربط حصرياً من قِبل إدارة مدرسة صفية بنت عمر الثانوية.</li>
          <li>صلاحية الرمز 3 أيام فقط من تاريخ الإنشاء، ويُستخدم لمرة واحدة.</li>
          <li>لا يمكن ربط نفس الطالبة بأكثر من ولي أمر داخل النظام.</li>
          <li>في حال تغيير رقم الجوال أو انتهاء الرمز، يُرجى مراجعة إدارة المدرسة لإصدار رمز جديد.</li>
        </ul>
      </div>
    </div>
  );
};
