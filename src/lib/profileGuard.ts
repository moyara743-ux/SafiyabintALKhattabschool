import { UserProfile, SchoolRole } from '../types';
import { isSystemOwner, isDesignatedPrincipal } from './principalService';

export interface ProfileCompletenessResult {
  isComplete: boolean;
  missingFields: string[];
  missingLabelsArabic: string[];
  summary: string;
}

/**
 * Validates whether a user account has strictly completed all mandatory onboarding data:
 * 1. Mobile Phone (Saudi format: 10 digits starting with 05)
 * 2. National ID / Iqama (10 digits starting with 1 or 2)
 * 3. Role-specific Code / Record (Student ID code for students, Employee/Staff code for staff, Guardian relation for parents)
 * 4. Rank / Grade Stage (Grade & Classroom for students, Specialization & Rank for staff)
 * 5. Completion flags: is_profile_complete === true AND accountStatus === 'completed'
 */
export function validateProfileCompleteness(
  profile: UserProfile | null | undefined,
  userEmail?: string
): ProfileCompletenessResult {
  const missingFields: string[] = [];
  const missingLabelsArabic: string[] = [];

  if (!profile) {
    return {
      isComplete: false,
      missingFields: ['profile'],
      missingLabelsArabic: ['الملف الشخصي غير موجود'],
      summary: 'لم يتم العثور على بيانات الملف الشخصي.',
    };
  }

  const email = (userEmail || profile.email || '').trim().toLowerCase();

  // 1. System Owner & Designated Principal are supreme administrators and exempt from profile completion
  if (
    isSystemOwner(email) ||
    isSystemOwner(profile.email) ||
    profile.school_role === 'system_owner' ||
    email === 'moyara743@gmail.com'
  ) {
    return {
      isComplete: true,
      missingFields: [],
      missingLabelsArabic: [],
      summary: 'حساب مالك النظام معتمد ومكتمل الصلاحيات.',
    };
  }

  if (
    isDesignatedPrincipal(email) ||
    isDesignatedPrincipal(profile.email) ||
    profile.school_role === 'director' ||
    email === 'director.safiah@gmail.com'
  ) {
    return {
      isComplete: true,
      missingFields: [],
      missingLabelsArabic: [],
      summary: 'حساب مديرة المدرسة معتمد ومكتمل الصلاحيات.',
    };
  }

  // 2. Mobile Phone (رقم الجوال: 10 أرقام تبدأ بـ 05)
  const cleanPhone = (profile.phone || '').trim().replace(/\D/g, '');
  const hasValidPhone = cleanPhone.length === 10 && cleanPhone.startsWith('05');
  if (!hasValidPhone) {
    missingFields.push('phone');
    missingLabelsArabic.push('رقم الجوال السعودي (10 أرقام تبدأ بـ 05)');
  }

  // 3. National ID / Iqama (رقم الهوية الوطنية أو الإقامة: 10 أرقام)
  const cleanNid = (
    profile.nationalId ||
    profile.national_id ||
    (profile.customPermissions?.find((p) => typeof p === 'string' && p.startsWith('nid:')) as string || '')
      .replace('nid:', '')
  )
    .trim()
    .replace(/\D/g, '');

  const hasValidNid = cleanNid.length === 10 && (cleanNid.startsWith('1') || cleanNid.startsWith('2'));
  if (!hasValidNid) {
    missingFields.push('nationalId');
    missingLabelsArabic.push('رقم الهوية الوطنية / الإقامة (10 أرقام)');
  }

  // 4. Role-specific requirements:
  const role: SchoolRole = profile.school_role || 'student';

  if (role === 'student') {
    // 4.1 Student Code / Record (سجل الطالبة / الرمز)
    const rawCode = (profile.studentIdCode || '').trim();
    const hasStudentCode = rawCode.length >= 4 && (rawCode.toUpperCase().startsWith('STU-') || rawCode.length >= 6);
    if (!hasStudentCode) {
      missingFields.push('studentIdCode');
      missingLabelsArabic.push('سجل ومعرف الطالبة المعتمد (Student ID)');
    }

    // 4.2 Grade Stage & Classroom (الصف / الرتبة)
    const hasGrade = Boolean(profile.gradeStage && profile.gradeStage.trim().length > 0);
    const hasClassroom = Boolean(profile.classroom && profile.classroom.trim().length > 0);
    if (!hasGrade || !hasClassroom) {
      missingFields.push('gradeClassroom');
      missingLabelsArabic.push('المرحلة الدراسية والصف / الفصل');
    }
  } else if (['teacher', 'supervisor', 'administrator', 'counselor'].includes(role)) {
    // 4.3 Staff Job Code (الرمز الوظيفي)
    const customStaffCode = profile.customPermissions?.find(
      (p) => typeof p === 'string' && (p.startsWith('staff_code:') || p.startsWith('emp:'))
    );
    const rawStaffCode = (profile.staffCode || profile.employeeIdCode || profile.jobCode || (customStaffCode ? String(customStaffCode).split(':')[1] : '') || '').trim();
    const hasStaffCode = rawStaffCode.length >= 3;
    if (!hasStaffCode) {
      missingFields.push('staffCode');
      missingLabelsArabic.push('الرمز الوظيفي المعتمد للمنسوبة');
    }

    // 4.4 Specialization / Rank (الرتبة / التخصص)
    const hasSpec = Boolean(profile.specialization && profile.specialization.trim().length > 1);
    if (!hasSpec) {
      missingFields.push('specialization');
      missingLabelsArabic.push('التخصص / المسمى الوظيفي');
    }
  } else if (role === 'parent') {
    // 4.5 Guardian relation
    const hasRelation = Boolean(profile.guardianRelation && profile.guardianRelation.trim().length > 0);
    if (!hasRelation) {
      missingFields.push('guardianRelation');
      missingLabelsArabic.push('صلة القرابة بالطالبة');
    }
  }

  // 5. Completion Status Flags
  const isFlagComplete = Boolean(
    (profile.is_profile_complete === true || profile.is_profile_completed === true) &&
    (profile.accountStatus === 'completed' || profile.account_status === 'completed')
  );

  if (!isFlagComplete) {
    missingFields.push('statusFlag');
    missingLabelsArabic.push('حالة توثيق واعتماد البيانات');
  }

  const isComplete = missingFields.length === 0;

  let summary = 'البيانات الشخصية مكتملة وموثقة بالكامل.';
  if (!isComplete) {
    summary = `الحساب يحتاج إكمال البيانات التالية: ${missingLabelsArabic.join('، ')}.`;
  }

  return {
    isComplete,
    missingFields,
    missingLabelsArabic,
    summary,
  };
}

/**
 * Quick boolean checker for Route Guard and Navigation authorization.
 */
export function isProfileComplete(profile: UserProfile | null | undefined, userEmail?: string): boolean {
  return validateProfileCompleteness(profile, userEmail).isComplete;
}
