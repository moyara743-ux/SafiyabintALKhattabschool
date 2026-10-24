import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  findStudentRecordByNationalIdOrEmail,
  completeStudentProfileByStudentId,
  validateNationalIdFormat,
} from '../lib/studentService';
import { StudentRecord, SchoolRole } from '../types';
import { ROLE_LABELS_AR } from '../lib/permissions';
import { isSystemOwner, isDesignatedPrincipal } from '../lib/principalService';
import { validateProfileCompleteness } from '../lib/profileGuard';
import { dataStore } from '../lib/dataStore';
import { supabase } from '../supabaseClient';
import { logActivity } from '../lib/activityLogger';
import {
  getOfficialApprovedStaffName,
  getApprovedAccountRole,
} from '../lib/authorizedStaffService';
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
  Briefcase,
  Users,
  CheckCircle2,
  KeyRound,
  IdCard,
} from 'lucide-react';

interface CompleteProfileViewProps {
  onComplete?: (completedRole?: SchoolRole) => void;
}

export const CompleteProfileView: React.FC<CompleteProfileViewProps> = ({ onComplete }) => {
  const { user, profile, refreshProfile } = useAuth();

  const isOwner = Boolean(
    (user?.email && isSystemOwner(user.email)) ||
    (profile?.email && isSystemOwner(profile.email)) ||
    profile?.school_role === 'system_owner'
  );
  const isPrin = Boolean(
    (user?.email && isDesignatedPrincipal(user.email)) ||
    (profile?.email && isDesignatedPrincipal(profile.email)) ||
    profile?.school_role === 'director'
  );

  useEffect(() => {
    if (isOwner || isPrin) {
      onComplete?.();
    }
  }, [isOwner, isPrin, onComplete]);

  if (isOwner || isPrin) {
    return null;
  }

  const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
  const approvedStaffRole = getApprovedAccountRole(userEmail);
  const officialApprovedName = getOfficialApprovedStaffName(userEmail);

  const role: SchoolRole = (userEmail === 'miaaa7433@gmail.com')
    ? 'administrator'
    : (profile?.school_role && profile.school_role !== 'student'
        ? profile.school_role
        : (approvedStaffRole || profile?.school_role || 'student'));

  const roleLabel = ROLE_LABELS_AR[role] || 'مستخدم المنصة';
  const isStaff = ['teacher', 'supervisor', 'administrator', 'counselor'].includes(role) || userEmail === 'miaaa7433@gmail.com';

  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Common Fields
  const [name, setName] = useState(
    isStaff && officialApprovedName
      ? officialApprovedName
      : (profile?.name && !profile.name.includes('@') ? profile.name : (officialApprovedName || ''))
  );
  const [nationalId, setNationalId] = useState(
    profile?.nationalId ||
      profile?.national_id ||
      (profile?.customPermissions?.find((p) => typeof p === 'string' && p.startsWith('nid:')) as string || '')
        .replace('nid:', '')
  );
  const [phone, setPhone] = useState(profile?.phone || '');

  // Role-specific fields
  const [specialization, setSpecialization] = useState(
    profile?.specialization || (userEmail === 'miaaa7433@gmail.com' ? 'الشؤون الإدارية المدرسية' : '')
  );
  const [guardianRelation, setGuardianRelation] = useState(profile?.guardianRelation || 'أب');
  const [staffCode, setStaffCode] = useState(
    profile?.staffCode ||
      profile?.employeeIdCode ||
      profile?.jobCode ||
      (profile?.customPermissions?.find((p) => typeof p === 'string' && (p.startsWith('staff_code:') || p.startsWith('emp:'))) as string || '')
        .replace(/^(staff_code:|emp:)/, '') ||
      ''
  );
  const [studentCode, setStudentCode] = useState(profile?.studentIdCode || '');
  const [gradeStage, setGradeStage] = useState(profile?.gradeStage || 'الأول الثانوي');
  const [classroom, setClassroom] = useState(profile?.classroom || '1/1');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync official approved name if name is empty or default email
  useEffect(() => {
    if (isStaff && officialApprovedName && (!name || name.includes('@'))) {
      setName(officialApprovedName);
    }
  }, [isStaff, officialApprovedName]);

  // For students, fetch authoritative school record
  useEffect(() => {
    let isMounted = true;
    if (role === 'student' && profile) {
      setLoadingRecord(true);
      findStudentRecordByNationalIdOrEmail({
        nationalId: nationalId || profile.nationalId,
        email: profile.email,
        studentIdCode: studentCode || profile.studentIdCode,
        name: profile.name,
      })
        .then((record) => {
          if (isMounted && record) {
            setStudentRecord(record);
            if (record.is_profile_complete && record.national_id && !nationalId) setNationalId(record.national_id);
            if (record.is_profile_complete && record.phone && !phone) setPhone(record.phone);
            if (record.student_id_code && !studentCode) setStudentCode(record.student_id_code);
            if (record.grade_stage) setGradeStage(record.grade_stage);
            if (record.classroom) setClassroom(record.classroom);
          }
        })
        .catch((err) => console.warn('Record fetch notice:', err))
        .finally(() => {
          if (isMounted) setLoadingRecord(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [role, profile]);

  // Handle live National ID typing / lookup for students
  const handleNationalIdChange = async (val: string) => {
    const clean = val.replace(/\D/g, '');
    setNationalId(clean);

    if (role === 'student' && clean.length === 10) {
      try {
        const found = await findStudentRecordByNationalIdOrEmail({
          nationalId: clean,
          email: profile?.email,
          name: profile?.name,
        });
        if (found) {
          setStudentRecord(found);
          if (found.phone && !phone) setPhone(found.phone);
          if (found.student_id_code && !studentCode) setStudentCode(found.student_id_code);
          if (found.grade_stage) setGradeStage(found.grade_stage);
          if (found.classroom) setClassroom(found.classroom);
          setError(null);
        }
      } catch (err) {
        console.warn('[CompleteProfileView] Live nid lookup notice:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    const cleanNationalId = nationalId.trim().replace(/\D/g, '');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanName = name.trim() || profile.name;

    // Strict Character-for-Character Name Validation for Staff / Administrative Accounts
    if (isStaff && officialApprovedName) {
      if (cleanName !== officialApprovedName.trim()) {
        setError('الاسم المدخل غير مطابق للاسم المعتمد في سجلات المدرسة');
        return;
      }
    }

    // 1. National ID Validation (Mandatory for all roles, 10 digits starting with 1 or 2)
    if (!cleanNationalId) {
      setError('يرجى إدخال رقم الهوية الوطنية أو الإقامة (حقل إلزامي).');
      return;
    }
    const valNid = validateNationalIdFormat(cleanNationalId);
    if (!valNid.isValid) {
      setError(valNid.message || 'صيغة رقم الهوية غير صحيحة (10 أرقام تبدأ بـ 1 أو 2).');
      return;
    }

    // 2. Mobile Phone Validation (Mandatory for all roles: 05XXXXXXXX)
    if (!cleanPhone) {
      setError('يرجى إدخال رقم الجوال (حقل إلزامي).');
      return;
    }
    if (!cleanPhone.startsWith('05') || cleanPhone.length !== 10) {
      setError('يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام.');
      return;
    }

    // 3. Role specific validation
    if (role === 'student') {
      if (!gradeStage.trim()) {
        setError('يرجى تحديد المرحلة الدراسية للطالبة.');
        return;
      }
      if (!classroom.trim()) {
        setError('يرجى تحديد الصف / الفصل.');
        return;
      }
    } else if (isStaff) {
      if (!staffCode.trim()) {
        setError('يرجى إدخال الرمز الوظيفي المعتمد للمنسوبة (حقل إلزامي لفتح الصلاحيات).');
        return;
      }
      if (!specialization.trim()) {
        setError('يرجى إدخال الرتبة أو التخصص التعليمي/الإداري (حقل إلزامي).');
        return;
      }
    }
 else if (role === 'parent') {
      if (!guardianRelation.trim()) {
        setError('يرجى تحديد صلة القرابة بالطالبة.');
        return;
      }
    }

    setSaving(true);

    try {
      if (role === 'student') {
        // Authoritative Student completion flow
        let finalStudentCode =
          studentCode.trim() ||
          studentRecord?.student_id_code ||
          profile.studentIdCode ||
          (profile.email.includes('@') && profile.email.split('@')[0].toUpperCase().startsWith('STU-')
            ? profile.email.split('@')[0].toUpperCase()
            : `STU-${cleanNationalId.slice(-6)}`);

        // Perform authoritative lookup if still needed
        const matched = await findStudentRecordByNationalIdOrEmail({
          nationalId: cleanNationalId,
          email: profile.email,
          name: profile.name,
        });
        if (matched) {
          finalStudentCode = matched.student_id_code;
          setStudentRecord(matched);
        }

        await completeStudentProfileByStudentId({
          studentIdCode: finalStudentCode,
          nationalId: cleanNationalId,
          phone: cleanPhone,
          actor: profile,
        });

        // Also update local/remote user record
        const updatedCustomPerms = Array.isArray(profile.customPermissions)
          ? [...profile.customPermissions.filter((p) => typeof p === 'string' && !p.startsWith('nid:'))]
          : [];
        updatedCustomPerms.push(`nid:${cleanNationalId}` as any);
        if (!updatedCustomPerms.includes('profile_completed' as any)) {
          updatedCustomPerms.push('profile_completed' as any);
        }

        const studentPayload: any = {
          name: cleanName,
          phone: cleanPhone,
          national_id: cleanNationalId,
          nationalId: cleanNationalId,
          studentIdCode: finalStudentCode,
          student_id_code: finalStudentCode,
          gradeStage: gradeStage.trim(),
          grade_stage: gradeStage.trim(),
          classroom: classroom.trim(),
          account_status: 'completed',
          accountStatus: 'completed',
          is_profile_completed: true,
          is_profile_complete: true,
          status: 'active',
          updated_at: new Date().toISOString(),
          custom_permissions: updatedCustomPerms,
          customPermissions: updatedCustomPerms,
        };

        try {
          await supabase.from('users').update({
            name: cleanName,
            phone: cleanPhone,
            national_id: cleanNationalId,
            student_id_code: finalStudentCode,
            grade_stage: gradeStage.trim(),
            classroom: classroom.trim(),
            account_status: 'completed',
            status: 'active',
            is_profile_completed: true,
            custom_permissions: updatedCustomPerms,
            updated_at: new Date().toISOString(),
          }).eq('id', profile.id);
        } catch (dbErr) {
          console.warn('[CompleteProfileView] Supabase student update notice:', dbErr);
        }

        await dataStore.updateUser(profile.id, {
          ...profile,
          ...studentPayload,
        });
      } else {
        // Staff or Parent Completion Flow
        const updatedCustomPerms = Array.isArray(profile.customPermissions)
          ? [...profile.customPermissions.filter((p) => typeof p === 'string' && !p.startsWith('nid:') && !p.startsWith('staff_code:'))]
          : [];
        updatedCustomPerms.push(`nid:${cleanNationalId}` as any);
        if (staffCode.trim()) {
          updatedCustomPerms.push(`staff_code:${staffCode.trim()}` as any);
        }
        if (!updatedCustomPerms.includes('profile_completed' as any)) {
          updatedCustomPerms.push('profile_completed' as any);
        }

        const updatePayload: any = {
          name: cleanName,
          phone: cleanPhone,
          national_id: cleanNationalId,
          nationalId: cleanNationalId,
          account_status: 'completed',
          status: 'active',
          accountStatus: 'completed',
          is_profile_completed: true,
          is_profile_complete: true,
          googleLinked: true,
          updated_at: new Date().toISOString(),
          custom_permissions: updatedCustomPerms,
          customPermissions: updatedCustomPerms,
        };

        if (isStaff) {
          updatePayload.staffCode = staffCode.trim();
          updatePayload.employeeIdCode = staffCode.trim();
          updatePayload.jobCode = staffCode.trim();
          updatePayload.specialization = specialization.trim();
        } else if (role === 'parent') {
          updatePayload.guardian_relation = guardianRelation;
          updatePayload.guardianRelation = guardianRelation;
        }

        // 1. Update in Supabase public.users if row exists
        try {
          await supabase
            .from('users')
            .update({
              name: cleanName,
              phone: cleanPhone,
              national_id: cleanNationalId,
              specialization: updatePayload.specialization || null,
              account_status: 'completed',
              status: 'active',
              is_profile_completed: true,
              custom_permissions: updatedCustomPerms,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
        } catch (dbErr) {
          console.warn('[CompleteProfileView] Supabase update notice:', dbErr);
        }

        // 2. Update in DataStore
        await dataStore.updateUser(profile.id, {
          ...profile,
          ...updatePayload,
        });

        // 3. Log Audit
        await logActivity({
          actorId: profile.id,
          actorName: cleanName,
          actorEmail: profile.email,
          action: 'PROFILE_COMPLETED',
          entity: 'users',
          entityId: profile.id,
          details: `اكتمال توثيق بيانات الحساب الرسمية (${cleanName}) - الرتبة: (${roleLabel}) - الرمز: (${staffCode.trim() || 'N/A'})`,
        });
      }

      // Refresh global Auth state
      if (refreshProfile) {
        await refreshProfile();
      }

      // Unlock route guard
      if (onComplete) {
        onComplete(role);
      }
    } catch (err: any) {
      console.error('[CompleteProfileView] Error completing profile:', err);
      setError(err?.message || 'تعذر حفظ البيانات، يرجى المحاولة لاحقاً.');
    } finally {
      setSaving(false);
    }
  };

  const studentDisplayName = studentRecord?.name || profile?.name || 'الطالبة';
  const studentCodeDisplay =
    studentCode ||
    studentRecord?.student_id_code ||
    profile?.studentIdCode ||
    (profile?.email.includes('@') && profile.email.split('@')[0].toUpperCase().startsWith('STU-')
      ? profile.email.split('@')[0].toUpperCase()
      : (nationalId && nationalId.length === 10 ? `STU-${nationalId.slice(-6)}` : 'STU-467645'));

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-4" dir="rtl">
      <div className="bg-white rounded-3xl border-2 border-emerald-600/30 shadow-2xl p-6 sm:p-9 space-y-7 relative overflow-hidden">
        {/* Top Gradient Ribbon */}
        <div className="absolute top-0 right-0 left-0 h-2.5 bg-gradient-to-r from-emerald-600 via-amber-400 to-teal-600" />

        {/* Lockout Warning Banner */}
        <div className="p-4 bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl flex items-start gap-3 text-amber-950">
          <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-extrabold block mb-0.5">حارس المسارات الإجباري (Mandatory Profile Guard):</span>
            تم تقييد التصفح وحظر الوصول لكافة أقسام المنصة ولوحات التحكم لحين إكمال البيانات الإلزامية المطلوبة (رقم الجوال، الرمز الوظيفي/سجل الطالبة، الرتبة/الصف) والضغط على زر <strong className="font-black text-amber-950 underline">[حفظ واكتمال البيانات]</strong>.
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2.5 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-800 to-teal-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-950/25 border-2 border-amber-400/40">
            <GraduationCap className="w-9 h-9 text-amber-300" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>مدرسة صفية بنت عمر الثانوية • المنصة الرسمية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {role === 'student' ? 'إكمال البيانات الأساسية للطالبة' : `إكمال وتوثيق بيانات الحساب (${roleLabel})`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            مرحباً بكِ <strong className="text-slate-800 font-bold">{profile?.name || 'في المنصة'}</strong>. لتفعيل حسابكِ المعتمد وفتح صلاحيات المنصة كاملة، يُرجى تعبئة الحقول الإلزامية أدناه.
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{error}</div>
          </div>
        )}

        {/* 1. STUDENT SPECIFIC VIEW */}
        {role === 'student' ? (
          <>
            {/* Pre-existing School Data (Read-only / School Record) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    البيانات المدرسية المعتمدة في سجل المدرسة
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
                    {gradeStage}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                  <span className="block text-[11px] text-slate-400 font-medium mb-1">الصف / الفصل:</span>
                  <span className="font-bold text-slate-800 block">
                    {classroom}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Completion Form (Strictly National ID + Mobile + Grade/Classroom) */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    رقم الهوية الوطنية / الإقامة للطالبة *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={nationalId}
                      onChange={(e) => handleNationalIdChange(e.target.value)}
                      placeholder="10 أرقام تبدأ بـ 1 أو 2"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-colors"
                      dir="ltr"
                    />
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    رقم الهوية الوطنية للمواطنات أو الإقامة النظامية للمقيمات (10 أرقام).
                  </p>
                </div>

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
                    رقم الجوال المعتمد؛ يُستخدم لإرسال رمز التحقق وربط حساب ولي الأمر.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      المرحلة الدراسية *
                    </label>
                    <select
                      value={gradeStage}
                      onChange={(e) => setGradeStage(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    >
                      <option value="الأول الثانوي">الأول الثانوي</option>
                      <option value="الثاني الثانوي">الثاني الثانوي</option>
                      <option value="الثالث الثانوي">الثالث الثانوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      الصف / الفصل *
                    </label>
                    <input
                      type="text"
                      required
                      value={classroom}
                      onChange={(e) => setClassroom(e.target.value)}
                      placeholder="مثال: 1/1"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={saving || loadingRecord}
                  className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-sm sm:text-base font-black text-white shadow-xl shadow-emerald-950/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ التحقق وحفظ واكتمال البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-amber-300" />
                      <span>[حفظ واكتمال البيانات]</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* 2. STAFF AND PARENT VIEW */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Info Read-only Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-bold text-slate-700">بيانات الحساب الموثق عبر Google</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {roleLabel}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-400 font-medium">البريد الإلكتروني المعتمد:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs" dir="ltr">
                    {profile?.email}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 font-medium">الرتبة المحددة بالنظام:</span>
                  <span className="font-bold text-emerald-800">
                    {roleLabel} (محددة من قاعدة البيانات)
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Required Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    الاسم الكامل المعتمد *
                  </label>
                  {officialApprovedName && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>الاسم المعتمد في السجلات: {officialApprovedName}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={officialApprovedName || "الاسم الثلاثي أو الرباعي المعتمد"}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
                {officialApprovedName && (
                  <div className="flex items-center justify-between mt-1.5 text-[11px] flex-wrap gap-1">
                    <span className="text-slate-500">
                      يُشترط مطابقة الاسم المدخل حرفياً للاسم المعتمد في سجلات المدرسة دون زيادة أو نقصان حرف.
                    </span>
                    {name.trim() !== officialApprovedName.trim() && (
                      <button
                        type="button"
                        onClick={() => setName(officialApprovedName)}
                        className="text-emerald-700 hover:text-emerald-950 font-extrabold underline cursor-pointer"
                      >
                        استعادة الاسم المعتمد ({officialApprovedName})
                      </button>
                    )}
                  </div>
                )}
              </div>

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
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  رقم الجوال المعتمد *
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
              </div>

              {/* Staff-specific: Staff Job Code (الرمز الوظيفي) & Rank/Specialization (الرتبة/التخصص) */}
              {isStaff && (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      الرمز الوظيفي المعتمد للمنسوبة *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={staffCode}
                        onChange={(e) => setStaffCode(e.target.value)}
                        placeholder="مثال: TCH-2024 أو ADM-101 أو رمز السجل الوظيفي"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-colors"
                        dir="ltr"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      الرمز الوظيفي الصادر من إدارة المدرسة المعتمد للتحقق من هوية المنسوبة وتفعيل الصلاحيات.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      الرتبة / التخصص والقسم المدرسي *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="مثال: معلمة لغة عربية، مسؤولة القبول والتسجيل، مشرفة تربوية..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                      />
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* Parent-specific: Guardian relation */}
              {role === 'parent' && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    صلة القرابة بالطالبة *
                  </label>
                  <select
                    value={guardianRelation}
                    onChange={(e) => setGuardianRelation(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  >
                    <option value="أب">أب</option>
                    <option value="أم">أم</option>
                    <option value="ولي أمر شرعي">ولي أمر شرعي</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-sm sm:text-base font-black text-white shadow-xl shadow-emerald-950/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ حفظ واكتمال البيانات وتفعيل الحساب...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-amber-300" />
                    <span>[حفظ واكتمال البيانات]</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Security Assurance Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>يتم تشفير وتوثيق البيانات وفق المعايير الأمنية المعتمدة للمنصة</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>حساب Google المعتمد: {profile?.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
