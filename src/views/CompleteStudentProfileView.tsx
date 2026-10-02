import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getStudentRecordForStudentProfile,
  completeStudentProfileByStudentId,
  validateNationalIdFormat,
} from '../lib/studentService';
import { StudentRecord } from '../types';
import {
  GraduationCap,
  Sparkles,
  AlertCircle,
  FileCheck,
  Phone,
  Shield,
  BadgeCheck,
  UserCheck,
  School,
  Lock,
} from 'lucide-react';

interface CompleteStudentProfileViewProps {
  onComplete?: () => void;
}

export const CompleteStudentProfileView: React.FC<CompleteStudentProfileViewProps> = ({
  onComplete,
}) => {
  const { profile, refreshProfile } = useAuth();

  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  // Form Fields - Strictly the two required fields requested
  const [nationalId, setNationalId] = useState(
    (profile?.customPermissions?.find((p) => typeof p === 'string' && p.startsWith('nid:')) as string || '')
      .replace('nid:', '')
  );
  const [phone, setPhone] = useState(profile?.phone || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch authoritative student record from database tied to Student ID
  useEffect(() => {
    let isMounted = true;
    const loadRecord = async () => {
      if (!profile) return;
      setLoadingRecord(true);
      try {
        const record = await getStudentRecordForStudentProfile(profile);
        if (isMounted) {
          setStudentRecord(record);
          if (record?.national_id && !nationalId) {
            setNationalId(record.national_id);
          }
          if (record?.phone && !phone) {
            setPhone(record.phone);
          }
        }
      } catch (err) {
        console.warn('[CompleteStudentProfileView] Error loading student record:', err);
      } finally {
        if (isMounted) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      isMounted = false;
    };
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError(null);

    const cleanNationalId = nationalId.trim();
    const cleanPhone = phone.trim();

    // 1. Validation of National ID / Iqama
    if (!cleanNationalId) {
      setError('يرجى إدخال رقم الهوية الوطنية أو الإقامة (حقل إلزامي).');
      return;
    }

    const valNid = validateNationalIdFormat(cleanNationalId);
    if (!valNid.isValid) {
      setError(valNid.message || 'صيغة رقم الهوية الوطنية / الإقامة غير صحيحة (يجب أن تتكون من 10 أرقام وتبدأ بـ 1 أو 2).');
      return;
    }

    // 2. Validation of Mobile Phone
    if (!cleanPhone) {
      setError('يرجى إدخال رقم الجوال الخاص بالطالبة (حقل إلزامي).');
      return;
    }

    if (!cleanPhone.startsWith('05') || cleanPhone.replace(/\D/g, '').length !== 10) {
      setError('يرجى إدخال رقم جوال سعودي معتمد يبدأ بـ 05 ويتكون من 10 أرقام.');
      return;
    }

    const studentIdCode =
      studentRecord?.student_id_code ||
      profile.studentIdCode ||
      (profile.email.includes('@') && profile.email.split('@')[0].toUpperCase().startsWith('STU-')
        ? profile.email.split('@')[0].toUpperCase()
        : '');

    if (!studentIdCode) {
      setError('تعذر تحديد معرّف الطالبة (Student ID). يرجى مراجعة إدارة المدرسة.');
      return;
    }

    setSaving(true);

    try {
      // Save data strictly associated with the student's Student ID in database
      await completeStudentProfileByStudentId({
        studentIdCode,
        nationalId: cleanNationalId,
        phone: cleanPhone,
        actor: profile,
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('[CompleteStudentProfileView] Submit error:', err);
      setError(err?.message || 'تعذر حفظ البيانات، يرجى المحاولة لاحقاً أو مراجعة إدارة المدرسة.');
    } finally {
      setSaving(false);
    }
  };

  const studentDisplayName = studentRecord?.name || profile?.name || 'الطالبة';
  const studentCodeDisplay =
    studentRecord?.student_id_code ||
    profile?.studentIdCode ||
    (profile?.email.includes('@') && profile.email.split('@')[0].toUpperCase().startsWith('STU-')
      ? profile.email.split('@')[0].toUpperCase()
      : 'STU-000000');
  const gradeDisplay = studentRecord?.grade_stage || profile?.gradeStage || 'المرحلة الثانوية';
  const classroomDisplay = studentRecord?.classroom || profile?.classroom || 'الفصل 1';

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-9 space-y-7 relative overflow-hidden">
        {/* Subtle decorative accent */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />

        {/* Top Header */}
        <div className="text-center space-y-2.5 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-800 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-950/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>مدرسة صفية بنت عمر الثانوية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            إكمال البيانات الأساسية للطالبة
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            مرحباً بكِ <strong className="text-slate-800 font-bold">{studentDisplayName}</strong>. لاستكمال وتفعيل دخولكِ الرسمي إلى المنصة المدرسية، يرجى استكمال البيانات الإلزامية أدناه.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{error}</div>
          </div>
        )}

        {/* 1. Pre-existing School Data (Read-only / Automatic from School Records) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-emerald-700" />
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                البيانات المدرسية المعتمدة (للقراءة فقط)
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <BadgeCheck className="w-3 h-3 text-emerald-700" />
              <span>معتمدة من السجل المدرسي</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
              <span className="block text-[11px] text-slate-400 font-medium mb-1">اسم الطالبة:</span>
              <span className="font-extrabold text-slate-900 text-sm block">
                {studentDisplayName}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
              <span className="block text-[11px] text-slate-400 font-medium mb-1">معرّف الطالبة (Student ID):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs" dir="ltr">
                  {studentCodeDisplay}
                </span>
                <span className="text-[10px] text-slate-400">ثابت في النظام</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
              <span className="block text-[11px] text-slate-400 font-medium mb-1">المرحلة الدراسية:</span>
              <span className="font-bold text-slate-800 block">
                {gradeDisplay}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
              <span className="block text-[11px] text-slate-400 font-medium mb-1">الصف / الفصل:</span>
              <span className="font-bold text-slate-800 block">
                {classroomDisplay}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
            * هذه البيانات مسجلة تلقائياً من إدارة المدرسة ولا تتطلب منكِ إعادة إدخالها، وتُعدل حصراً عبر لوحة الإدارة.
          </p>
        </div>

        {/* 2. Completion Form - Strictly National ID and Student Mobile Phone */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Field 1: National ID / Iqama */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                رقم الهوية الوطنية / الإقامة *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="10 أرقام تبدأ بـ 1 أو 2"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-colors"
                  dir="ltr"
                />
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                رقم الهوية الوطنية للمواطنات أو الإقامة النظامية للمقيمات (10 أرقام). حقل إلزامي يتم التحقق من صحة تنسيقه وعدم تكراره في قاعدة بيانات المدرسة.
              </p>
            </div>

            {/* Field 2: Student Mobile Phone */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                رقم الجوال الخاص بالطالبة *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="05XXXXXXXX"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-colors"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                رقم الجوال الخاص بكِ؛ سيظهر في حسابكِ تحت بياناتكِ الشخصية، وهو الرقم المعتمد الذي سيُستخدم لاحقاً للتحقق في عملية «ربط حساب ولي الأمر».
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={saving || loadingRecord}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ حفظ البيانات وتوثيق الحساب...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5 text-emerald-200" />
                  <span>حفظ البيانات وتفعيل الدخول للمنصة</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Assurance Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>البيانات محفوظة ومشفرة وفق أعلى معايير الخصوصية المدرسية</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>ربط موثق بمعرّف: {studentCodeDisplay}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
