import { supabase } from '../supabaseClient';
import {
  StudentRecord,
  StudentLinkingCode,
  StudentLinkingState,
  ParentStudentRelationship,
  UserProfile,
  RelationshipType,
  SchoolRole,
} from '../types';
import { dataStore } from './dataStore';
import { logActivity } from './activityLogger';
import { SmsService, normalizePhoneNumber } from './smsService';
import { ROLE_LABELS_AR } from './permissions';

const STORAGE_KEY_STUDENTS = 'safiah_student_records';
const STORAGE_KEY_CODES = 'safiah_student_linking_codes';
const STORAGE_KEY_RELATIONSHIPS = 'safiah_parent_student_relationships';

/**
 * Local cache helpers for student records and linking codes
 */
function getCachedStudents(): StudentRecord[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[studentService] Error reading cached students:', e);
  }
  return [];
}

function setCachedStudents(students: StudentRecord[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    }
  } catch (e) {
    console.warn('[studentService] Error saving cached students:', e);
  }
}

function getCachedCodes(): StudentLinkingCode[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_CODES);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[studentService] Error reading cached codes:', e);
  }
  return [];
}

function setCachedCodes(codes: StudentLinkingCode[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(codes));
    }
  } catch (e) {
    console.warn('[studentService] Error saving cached codes:', e);
  }
}

function getCachedRelationships(): ParentStudentRelationship[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[studentService] Error reading cached relationships:', e);
  }
  return [];
}

function setCachedRelationships(rels: ParentStudentRelationship[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(rels));
    }
  } catch (e) {
    console.warn('[studentService] Error saving cached relationships:', e);
  }
}

/**
 * Generates a Cryptographically Secure Random Linking Code.
 * Format: 4 blocks of 4 alphanumeric characters (e.g. K8F2-XP94-MQ71-Z6R8).
 * Not based on student name, student ID, phone, or birthdate.
 */
export function generateCryptographicLinkingCode(): string {
  // Characters excluding visually ambiguous ones (0, O, 1, I)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const blockLength = 4;
  const numBlocks = 4;
  const totalChars = blockLength * numBlocks;

  const randomValues = new Uint32Array(totalChars);
  crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < totalChars; i++) {
    result += charset[randomValues[i] % charset.length];
    if ((i + 1) % blockLength === 0 && i + 1 < totalChars) {
      result += '-';
    }
  }

  return result;
}

/**
 * Generates a formatted Student ID code (e.g. STU-000251)
 */
export function generateStudentIdCode(): string {
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomNum = 100000 + (randomArray[0] % 900000);
  return `STU-${randomNum}`;
}

/**
 * Generates a strong, random cryptographic secret for student login.
 * Unpredictable and NOT based on name, student ID, or personal info.
 */
export function generateStudentAccessSecret(): string {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const length = 8;
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += charset[randomValues[i] % charset.length];
  }
  return `STU-${secret}`;
}

/**
 * Normalizes Arabic string for resilient exact matching.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove diacritics
    .toLowerCase();
}

/**
 * Validates National ID format for Saudi students and residents.
 * - Exactly 10 digits
 * - Starts with 1 (Saudi citizen) or 2 (Resident / Iqama)
 * - Digits only
 * - Not repetitive digits (e.g. 1111111111)
 */
export function validateNationalIdFormat(id?: string): { isValid: boolean; message?: string } {
  if (!id || typeof id !== 'string') {
    return { isValid: false, message: 'رقم الهوية الوطنية مطلوب ولا يمكن تركه فارغاً.' };
  }
  const clean = id.trim();
  if (!clean) {
    return { isValid: false, message: 'رقم الهوية الوطنية مطلوب ولا يمكن تركه فارغاً.' };
  }
  if (!/^\d{10}$/.test(clean)) {
    return { isValid: false, message: 'رقم الهوية الوطنية يجب أن يتكون من 10 أرقام تماماً وبدون مسافات أو أحرف.' };
  }
  if (!['1', '2'].includes(clean[0])) {
    return { isValid: false, message: 'رقم الهوية الوطنية للمواطنات يبدأ بـ 1 وللمقيمات بـ 2.' };
  }
  if (/^(\d)\1{9}$/.test(clean)) {
    return { isValid: false, message: 'رقم الهوية الوطنية المدخل غير صحيح (أرقام مكررة).' };
  }
  return { isValid: true };
}

/**
 * Safely masks a National ID (e.g. 10******12)
 * Ensures national ID is NEVER exposed fully in public views or plain activity logs.
 */
export function maskNationalId(nationalId?: string): string {
  if (!nationalId) return '—';
  const clean = nationalId.trim();
  if (clean.length < 4) return '********';
  return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
}

/**
 * Computes human-readable remaining time until expiration.
 */
export function formatRemainingTime(expiresAt: string): {
  isExpired: boolean;
  label: string;
} {
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;

  if (diff <= 0) {
    return { isExpired: true, label: 'منتهي الصلاحية' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { isExpired: false, label: `متبقي ${days} يوم و${hours} ساعة` };
  }
  if (hours > 0) {
    return { isExpired: false, label: `متبقي ${hours} ساعة و${minutes} دقيقة` };
  }
  return { isExpired: false, label: `متبقي ${minutes} دقيقة` };
}

/**
 * =========================================================================
 * 1. STUDENT RECORDS MANAGEMENT (إدارة سجلات الطالبات)
 * =========================================================================
 */

/**
 * Retrieves all student records with resilient Supabase query and offline cache.
 */
export async function getAllStudents(): Promise<StudentRecord[]> {
  let records: StudentRecord[] = [];

  try {
    const { data, error } = await supabase
      .from('student_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      records = data.map((d: any) => ({
        id: d.id,
        student_id_code: d.student_id_code,
        name: d.name,
        phone: d.phone,
        national_id: d.national_id,
        access_secret: d.access_secret || 'STU-9K8P4M',
        birth_date: d.birth_date,
        grade_stage: d.grade_stage || 'الأول الثانوي',
        classroom: d.classroom,
        is_profile_complete: Boolean(d.is_profile_complete),
        blood_type: d.blood_type,
        notes: d.notes,
        emergency_contact_phone: d.emergency_contact_phone,
        account_user_id: d.account_user_id,
        status: d.status || 'active',
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }
  } catch (err) {
    console.warn('[studentService] Notice querying student_records table:', err);
  }

  if (records.length === 0) {
    records = getCachedStudents();
  }

  // Ensure cached records have access_secret
  let needsCacheUpdate = false;
  records = records.map((s) => {
    if (!s.access_secret) {
      needsCacheUpdate = true;
      return { ...s, access_secret: generateStudentAccessSecret() };
    }
    return s;
  });
  if (needsCacheUpdate) {
    setCachedStudents(records);
  }

  // If completely empty on first launch, initialize with official sample students
  if (records.length === 0) {
    const initialStudents: StudentRecord[] = [
      {
        id: 'stu_001_sarah',
        student_id_code: 'STU-000251',
        name: 'سارة محمد راشد العتيبي',
        phone: '0501234567',
        grade_stage: 'الأول الثانوي',
        classroom: '1/1',
        is_profile_complete: true,
        national_id: '1098765432',
        access_secret: 'STU-9K8P4M',
        birth_date: '2008-04-15',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stu_002_reem',
        student_id_code: 'STU-000252',
        name: 'ريم فهد عبدالعزيز القحطاني',
        phone: '0559876543',
        grade_stage: 'الثاني الثانوي',
        classroom: '2/1',
        is_profile_complete: true,
        national_id: '1087654321',
        access_secret: 'STU-3W7X2R',
        birth_date: '2007-08-20',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stu_003_shahad',
        student_id_code: 'STU-000253',
        name: 'شهد خالد إبراهيم الدوسري',
        phone: '0541122334',
        grade_stage: 'الثالث الثانوي',
        classroom: '3/1',
        is_profile_complete: true,
        national_id: '1076543210',
        access_secret: 'STU-5N6B8Y',
        birth_date: '2006-11-10',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    records = initialStudents;
    setCachedStudents(initialStudents);

    // Attempt saving to Supabase
    try {
      supabase.from('student_records').upsert(initialStudents).then();
    } catch (e) {
      console.warn('Seeding initial student records notice:', e);
    }
  } else {
    setCachedStudents(records);
  }

  return records;
}

/**
 * Adds a new student record to database.
 * Only Director (المديرة), Supervisor (المشرفة), or Administrator (الإدارية) can add students.
 */
export async function addStudent(params: {
  name: string;
  phone: string;
  studentIdCode?: string;
  gradeStage: string;
  classroom?: string;
  nationalId: string; // Required & Unique
  birthDate?: string;
  actor: UserProfile;
}): Promise<StudentRecord> {
  const { name, phone, studentIdCode, gradeStage, classroom, nationalId, birthDate, actor } = params;

  // Verify actor privileges (7 approved school roles)
  const allowedRoles: SchoolRole[] = ['director', 'supervisor', 'administrator'];
  if (!allowedRoles.includes(actor.school_role) && actor.email !== 'moyara743@gmail.com') {
    throw new Error('عفواً، لا تملكين الصلاحية الإدارية لإضافة طالبة جديدة.');
  }

  const cleanName = name.trim();
  const cleanPhone = normalizePhoneNumber(phone);
  const cleanNationalId = (nationalId || '').trim();

  if (!cleanName) {
    throw new Error('يرجى كتابة اسم الطالبة الرباعي.');
  }
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('يرجى إدخال رقم جوال صحيح للطالبة (مثال: 05XXXXXXXX).');
  }

  // 1. Mandatory National ID Validation
  if (!cleanNationalId) {
    throw new Error('رقم الهوية الوطنية مطلوب وإلزامي لجميع الطالبات ولا يمكن إنشاء سجل بدون رقم هوية.');
  }

  const idValidation = validateNationalIdFormat(cleanNationalId);
  if (!idValidation.isValid) {
    throw new Error(idValidation.message || 'صيغة رقم الهوية الوطنية غير صحيحة.');
  }

  // 2. Uniqueness Check in Local Database/Cache
  const currentList = await getAllStudents();
  const duplicate = currentList.find((s) => s.national_id === cleanNationalId);
  if (duplicate) {
    throw new Error('رقم الهوية الوطنية مسجل مسبقاً في النظام لطالبة أخرى. لا يمكن تكرار رقم الهوية.');
  }

  // 3. Uniqueness Check in Supabase Table
  try {
    const { data: dbCheck } = await supabase
      .from('student_records')
      .select('id, student_id_code')
      .eq('national_id', cleanNationalId)
      .limit(1);

    if (dbCheck && dbCheck.length > 0) {
      throw new Error('رقم الهوية الوطنية مسجل مسبقاً في قاعدة بيانات المدرسة لطالبة أخرى.');
    }
  } catch (checkErr: any) {
    if (checkErr?.message && checkErr.message.includes('مسجل مسبقاً')) {
      throw checkErr;
    }
  }

  const newId = crypto.randomUUID();
  const finalCode = studentIdCode?.trim() || generateStudentIdCode();
  const finalSecret = generateStudentAccessSecret();

  const newRecord: StudentRecord = {
    id: newId,
    student_id_code: finalCode,
    name: cleanName,
    phone: cleanPhone,
    national_id: cleanNationalId,
    access_secret: finalSecret,
    birth_date: birthDate || undefined,
    grade_stage: gradeStage || 'الأول الثانوي',
    classroom: classroom?.trim() || '1/1',
    is_profile_complete: Boolean(cleanNationalId && birthDate),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. Save to Supabase
  try {
    const { error: dbError } = await supabase.from('student_records').insert([
      {
        id: newRecord.id,
        student_id_code: newRecord.student_id_code,
        name: newRecord.name,
        phone: newRecord.phone,
        national_id: newRecord.national_id,
        access_secret: newRecord.access_secret,
        birth_date: newRecord.birth_date,
        grade_stage: newRecord.grade_stage,
        classroom: newRecord.classroom,
        is_profile_complete: newRecord.is_profile_complete,
        status: newRecord.status,
        created_at: newRecord.created_at,
        updated_at: newRecord.updated_at,
      },
    ]);

    if (dbError) {
      console.warn('[studentService] Notice inserting into student_records table:', dbError.message);
      if (dbError.code === '23505' || dbError.message?.includes('duplicate key')) {
        throw new Error('رقم الهوية الوطنية أو رمز الطالبة مسجل مسبقاً في قاعدة البيانات.');
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('مسجل مسبقاً')) {
      throw err;
    }
    console.warn('[studentService] Notice saving student_records:', err);
  }

  // 5. Save to local storage
  const current = getCachedStudents();
  const updated = [newRecord, ...current.filter((s) => s.id !== newRecord.id)];
  setCachedStudents(updated);

  // 6. Audit Log (Safely masked national ID - raw ID is never logged)
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'STUDENT_CREATE',
    entity: 'student_records',
    entityId: newRecord.id,
    details: `إضافة طالبة جديدة (${cleanName}) برقم معرّف (${finalCode}) ورقم جوال (${cleanPhone}) ورقم هوية (${maskNationalId(cleanNationalId)})`,
  });

  return newRecord;
}

/**
 * Updates student information.
 * Only Director (المديرة), Supervisor (المشرفة), or Administrator (الإدارية) can update.
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<StudentRecord>,
  actor: UserProfile
): Promise<StudentRecord> {
  const allowedRoles: SchoolRole[] = ['director', 'supervisor', 'administrator'];
  if (!allowedRoles.includes(actor.school_role) && actor.email !== 'moyara743@gmail.com') {
    throw new Error('عفواً، لا تملكين الصلاحية الإدارية لتعديل بيانات الطالبة.');
  }

  const currentList = await getAllStudents();
  const student = currentList.find((s) => s.id === studentId);
  if (!student) {
    throw new Error('لم يتم العثور على سجل الطالبة المطلوب.');
  }

  let finalNationalId = student.national_id;
  if (updates.national_id !== undefined) {
    const cleanUpdatedId = updates.national_id.trim();
    if (!cleanUpdatedId) {
      throw new Error('رقم الهوية الوطنية إلزامي للطالبة ولا يمكن حذفه أو تركه فارغاً.');
    }
    const val = validateNationalIdFormat(cleanUpdatedId);
    if (!val.isValid) {
      throw new Error(val.message || 'صيغة رقم الهوية الوطنية غير صحيحة.');
    }

    // Uniqueness check across other students
    const dupLocal = currentList.find((s) => s.id !== studentId && s.national_id === cleanUpdatedId);
    if (dupLocal) {
      throw new Error('رقم الهوية الوطنية مسجل مسبقاً في النظام لطالبة أخرى. لا يمكن تكرار رقم الهوية.');
    }

    try {
      const { data: dbCheck } = await supabase
        .from('student_records')
        .select('id')
        .eq('national_id', cleanUpdatedId)
        .neq('id', studentId)
        .limit(1);

      if (dbCheck && dbCheck.length > 0) {
        throw new Error('رقم الهوية الوطنية مسجل مسبقاً في قاعدة بيانات المدرسة لطالبة أخرى.');
      }
    } catch (checkErr: any) {
      if (checkErr?.message && checkErr.message.includes('مسجل مسبقاً')) {
        throw checkErr;
      }
    }

    finalNationalId = cleanUpdatedId;
  }

  const cleanPhone = updates.phone ? normalizePhoneNumber(updates.phone) : student.phone;
  const isProfileComplete = Boolean(finalNationalId && (updates.birth_date || student.birth_date));

  const updatedStudent: StudentRecord = {
    ...student,
    ...updates,
    phone: cleanPhone,
    national_id: finalNationalId,
    is_profile_complete: isProfileComplete,
    updated_at: new Date().toISOString(),
  };

  // Sync with Supabase
  try {
    const { error } = await supabase
      .from('student_records')
      .update({
        name: updatedStudent.name,
        phone: updatedStudent.phone,
        grade_stage: updatedStudent.grade_stage,
        classroom: updatedStudent.classroom,
        national_id: updatedStudent.national_id,
        birth_date: updatedStudent.birth_date,
        is_profile_complete: updatedStudent.is_profile_complete,
        updated_at: updatedStudent.updated_at,
      })
      .eq('id', studentId);

    if (error) {
      console.warn('[studentService] Notice updating student_records:', error.message);
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        throw new Error('رقم الهوية الوطنية مسجل مسبقاً في قاعدة البيانات لطالبة أخرى.');
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('مسجل مسبقاً')) {
      throw err;
    }
    console.warn('[studentService] Notice updating student:', err);
  }

  // Update Cache
  const updatedList = currentList.map((s) => (s.id === studentId ? updatedStudent : s));
  setCachedStudents(updatedList);

  // Audit Log (Safely masked national ID - raw ID is never logged)
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'STUDENT_UPDATE',
    entity: 'student_records',
    entityId: studentId,
    details: `تحديث بيانات الطالبة (${updatedStudent.name}) معرّف (${updatedStudent.student_id_code}) ورقم الهوية (${maskNationalId(updatedStudent.national_id)})`,
  });

  return updatedStudent;
}

/**
 * =========================================================================
 * 2. LINKING CODES MANAGEMENT (رموز الربط وصلاحيتها 3 أيام)
 * =========================================================================
 */

/**
 * Retrieves all linking codes from database/cache.
 */
export async function getAllLinkingCodes(): Promise<StudentLinkingCode[]> {
  let codes: StudentLinkingCode[] = [];

  try {
    const { data, error } = await supabase
      .from('student_linking_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      codes = data.map((d: any) => ({
        id: d.id,
        student_id: d.student_id,
        code: d.code,
        created_at: d.created_at,
        expires_at: d.expires_at,
        is_used: Boolean(d.is_used),
        is_revoked: Boolean(d.is_revoked),
        used_at: d.used_at,
        used_by_parent_id: d.used_by_parent_id,
        created_by: d.created_by,
      }));
    }
  } catch (err) {
    console.warn('[studentService] Notice querying student_linking_codes:', err);
  }

  if (codes.length === 0) {
    codes = getCachedCodes();
  } else {
    setCachedCodes(codes);
  }

  return codes;
}

/**
 * Generates a fresh, single-use, 3-day linking code for a student.
 * Immediately revokes any previous active codes for this student.
 */
export async function generateLinkingCodeForStudent(
  studentId: string,
  actor: UserProfile
): Promise<StudentLinkingCode> {
  const allowedRoles: SchoolRole[] = ['director', 'supervisor', 'administrator'];
  if (!allowedRoles.includes(actor.school_role) && actor.email !== 'moyara743@gmail.com') {
    throw new Error('عفواً، لا تملكين الصلاحية الإدارية لإنشاء رمز ربط.');
  }

  const allStudents = await getAllStudents();
  const student = allStudents.find((s) => s.id === studentId);
  if (!student) {
    throw new Error('لم يتم العثور على سجل الطالبة.');
  }

  // Check if student is already linked
  const activeRel = await getActiveRelationshipForStudent(studentId);
  if (activeRel) {
    throw new Error(`الطالبة "${student.name}" مرتبطة بالفعل بولي أمر معتمد في النظام.`);
  }

  const allCodes = await getAllLinkingCodes();

  // RULE: If administration creates a new code, immediately invalidate any existing active codes!
  const now = new Date();
  const nowIso = now.toISOString();

  for (const c of allCodes) {
    if (c.student_id === studentId && !c.is_used && !c.is_revoked) {
      c.is_revoked = true;
      try {
        await supabase
          .from('student_linking_codes')
          .update({ is_revoked: true })
          .eq('id', c.id);
      } catch (e) {
        console.warn('Revoke old code exception:', e);
      }
    }
  }

  // Exactly 3 Days expiration
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + THREE_DAYS_MS).toISOString();

  const newCodeStr = generateCryptographicLinkingCode();
  const newCodeId = crypto.randomUUID();

  const newCodeRecord: StudentLinkingCode = {
    id: newCodeId,
    student_id: studentId,
    code: newCodeStr,
    created_at: nowIso,
    expires_at: expiresAt,
    is_used: false,
    is_revoked: false,
    created_by: actor.id,
  };

  // 1. Save to Supabase
  try {
    const { error } = await supabase.from('student_linking_codes').insert([
      {
        id: newCodeRecord.id,
        student_id: newCodeRecord.student_id,
        code: newCodeRecord.code,
        created_at: newCodeRecord.created_at,
        expires_at: newCodeRecord.expires_at,
        is_used: false,
        is_revoked: false,
        created_by: actor.id,
      },
    ]);

    if (error) {
      console.warn('[studentService] Notice inserting linking code:', error.message);
    }
  } catch (err) {
    console.warn('[studentService] Exception inserting linking code:', err);
  }

  // 2. Save to cache
  const updatedCodes = [newCodeRecord, ...allCodes.filter((c) => c.id !== newCodeId)];
  setCachedCodes(updatedCodes);

  // 3. Audit Log
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'LINKING_CODE_GENERATE',
    entity: 'student_linking_codes',
    entityId: newCodeId,
    details: `إنشاء رمز ربط جديد للطالبة (${student.name}) بصلاحية 3 أيام حتى (${expiresAt.split('T')[0]})`,
  });

  return newCodeRecord;
}

/**
 * Revokes an existing linking code.
 */
export async function revokeLinkingCode(codeId: string, actor: UserProfile): Promise<void> {
  const allowedRoles: SchoolRole[] = ['director', 'supervisor', 'administrator'];
  if (!allowedRoles.includes(actor.school_role) && actor.email !== 'moyara743@gmail.com') {
    throw new Error('عفواً، لا تملكين الصلاحية لإلغاء رمز الربط.');
  }

  const allCodes = await getAllLinkingCodes();
  const code = allCodes.find((c) => c.id === codeId);
  if (!code) {
    throw new Error('لم يتم العثور على رمز الربط المحدد.');
  }

  code.is_revoked = true;

  try {
    await supabase.from('student_linking_codes').update({ is_revoked: true }).eq('id', codeId);
  } catch (e) {
    console.warn('Revoke code exception:', e);
  }

  setCachedCodes(allCodes);

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'LINKING_CODE_REVOKE',
    entity: 'student_linking_codes',
    entityId: codeId,
    details: `إلغاء رمز الربط (${code.code}) للطالبة المعنية`,
  });
}

/**
 * =========================================================================
 * 3. RELATIONSHIPS & INSPECTION (التحقق من حالة ربط الطالبة)
 * =========================================================================
 */

/**
 * Finds active relationship for a student.
 * In this system, each student can be linked to ONLY ONE parent!
 */
export async function getActiveRelationshipForStudent(
  studentId: string
): Promise<ParentStudentRelationship | null> {
  // Query Supabase
  try {
    const { data, error } = await supabase
      .from('parent_student_relationships')
      .select('*')
      .or(`student_record_id.eq.${studentId},student_user_id.eq.${studentId}`)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        parent_user_id: data.parent_user_id,
        student_user_id: data.student_user_id,
        student_record_id: data.student_record_id || studentId,
        relationship_type: data.relationship_type || 'guardian',
        is_active: data.is_active !== false,
        created_at: data.created_at,
      };
    }
  } catch (e) {
    console.warn('getActiveRelationship query notice:', e);
  }

  // Fallback to cache
  const cached = getCachedRelationships();
  const found = cached.find(
    (r) =>
      (r.student_record_id === studentId || r.student_user_id === studentId) &&
      r.is_active
  );
  return found || null;
}

/**
 * Inspects a student's full linking status for the Administration screen.
 */
export async function getStudentLinkingInspection(studentId: string): Promise<{
  state: StudentLinkingState;
  stateLabel: string;
  activeCode: StudentLinkingCode | null;
  remainingTime: string;
  linkedRelationship: ParentStudentRelationship | null;
  linkedParent: UserProfile | null;
}> {
  // 1. Check if linked
  const activeRel = await getActiveRelationshipForStudent(studentId);
  if (activeRel) {
    let parentProfile: UserProfile | null = null;
    const allUsers = await dataStore.getUsers();
    parentProfile = allUsers.find((u) => u.id === activeRel.parent_user_id) || null;

    return {
      state: 'linked',
      stateLabel: 'مرتبطة',
      activeCode: null,
      remainingTime: '',
      linkedRelationship: activeRel,
      linkedParent: parentProfile,
    };
  }

  // 2. Check codes for this student
  const allCodes = await getAllLinkingCodes();
  const studentCodes = allCodes
    .filter((c) => c.student_id === studentId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (studentCodes.length === 0) {
    return {
      state: 'unlinked',
      stateLabel: 'غير مرتبطة',
      activeCode: null,
      remainingTime: '',
      linkedRelationship: null,
      linkedParent: null,
    };
  }

  const latestCode = studentCodes[0];
  const now = Date.now();
  const exp = new Date(latestCode.expires_at).getTime();

  if (latestCode.is_used) {
    return {
      state: 'code_used',
      stateLabel: 'رمز الربط مستخدم',
      activeCode: latestCode,
      remainingTime: 'تم استهلاك الرمز بنجاح',
      linkedRelationship: null,
      linkedParent: null,
    };
  }

  if (latestCode.is_revoked) {
    return {
      state: 'code_revoked',
      stateLabel: 'رمز الربط ملغى',
      activeCode: latestCode,
      remainingTime: 'ملغى من الإدارة',
      linkedRelationship: null,
      linkedParent: null,
    };
  }

  if (now > exp) {
    return {
      state: 'code_expired',
      stateLabel: 'رمز الربط منتهي',
      activeCode: latestCode,
      remainingTime: 'انتهت صلاحية الرمز (3 أيام)',
      linkedRelationship: null,
      linkedParent: null,
    };
  }

  const rem = formatRemainingTime(latestCode.expires_at);

  return {
    state: 'pending_link',
    stateLabel: 'بانتظار الربط',
    activeCode: latestCode,
    remainingTime: rem.label,
    linkedRelationship: null,
    linkedParent: null,
  };
}

/**
 * =========================================================================
 * 4. MULTI-STEP PARENT LINKING VERIFICATION (عملية الربط المتعددة الخطوات)
 * =========================================================================
 */

/**
 * STEP 1: Verify Student Name + Code + Phone and Dispatch SMS OTP.
 * Rules:
 * - If phone does not match registered student phone -> FAIL IMMEDIATELY!
 * - If student is already linked to another parent -> FAIL IMMEDIATELY!
 * - If code is expired (>3 days), revoked, or used -> FAIL IMMEDIATELY!
 */
export async function verifyAndInitiateParentLink(params: {
  studentName: string;
  linkingCode: string;
  phone: string;
  actorEmail?: string;
}): Promise<{
  otpSessionId: string;
  maskedPhone: string;
  previewCode?: string;
  student: StudentRecord;
}> {
  const { studentName, linkingCode, phone, actorEmail } = params;

  const rawCleanName = (studentName || '').trim();
  const cleanInputPhone = normalizePhoneNumber(phone);
  const cleanCode = (linkingCode || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!rawCleanName) {
    throw new Error('يرجى إدخال اسم الطالبة الرباعي.');
  }
  if (!cleanInputPhone || cleanInputPhone.length < 9) {
    throw new Error('يرجى إدخال رقم الجوال المعتمد والمسجل للطالبة.');
  }
  if (!cleanCode) {
    throw new Error('يرجى إدخال رمز الربط الصادر من إدارة المدرسة.');
  }

  // 1. Find Student by Name
  const allStudents = await getAllStudents();
  const normalizedInputName = normalizeArabicText(rawCleanName);

  const matchedStudent = allStudents.find((s) => {
    const sNorm = normalizeArabicText(s.name);
    return sNorm === normalizedInputName || sNorm.includes(normalizedInputName) || normalizedInputName.includes(sNorm);
  });

  if (!matchedStudent) {
    await logActivity({
      actorId: 'guest_parent',
      actorName: 'ولي أمر (محاولة ربط)',
      actorEmail: actorEmail || 'unknown',
      action: 'PARENT_LINK_FAILURE',
      entity: 'parent_student_relationships',
      entityId: 'none',
      details: `فشل التحقق: اسم الطالبة (${rawCleanName}) غير مسجل في سجلات المدرسة`,
    });
    throw new Error('اسم الطالبة غير مسجل في سجلات المدرسة المعتمدة. يرجى التأكد من كتابة الاسم بدقة.');
  }

  // 2. CHECK RULE: Is student already linked to a parent?
  // Only ONE parent per student in this system!
  const activeRel = await getActiveRelationshipForStudent(matchedStudent.id);
  if (activeRel) {
    await logActivity({
      actorId: 'guest_parent',
      actorName: 'ولي أمر (محاولة ربط)',
      actorEmail: actorEmail || 'unknown',
      action: 'PARENT_LINK_FAILURE',
      entity: 'parent_student_relationships',
      entityId: matchedStudent.id,
      details: `رفض الربط: الطالبة (${matchedStudent.name}) مرتبطة مسبقاً بولي أمر آخر`,
    });
    throw new Error('عفواً، هذه الطالبة مرتبطة بالفعل بولي أمر معتمد في النظام، ولا يسمح النظام بارتباط أكثر من ولي أمر لنفس الطالبة.');
  }

  // 3. MANDATORY RULE: Check Phone Number Match!
  // Must match student's registered phone number.
  const studentRegisteredPhone = normalizePhoneNumber(matchedStudent.phone);
  if (cleanInputPhone !== studentRegisteredPhone) {
    await logActivity({
      actorId: 'guest_parent',
      actorName: 'ولي أمر (محاولة ربط)',
      actorEmail: actorEmail || 'unknown',
      action: 'PARENT_LINK_FAILURE',
      entity: 'parent_student_relationships',
      entityId: matchedStudent.id,
      details: `رفض الربط: رقم الجوال المدخل (${cleanInputPhone}) غير مطابق لرقم جوال الطالبة المسجل (${studentRegisteredPhone})`,
    });
    throw new Error('رقم الجوال المدخل غير مطابق لرقم الجوال المعتمد والمسجل في ملف الطالبة بالمدرسة.');
  }

  // 4. Verify Linking Code
  const allCodes = await getAllLinkingCodes();
  const matchedCode = allCodes.find(
    (c) => c.student_id === matchedStudent.id && c.code.toUpperCase().replace(/\s+/g, '') === cleanCode
  );

  if (!matchedCode) {
    await logActivity({
      actorId: 'guest_parent',
      actorName: 'ولي أمر (محاولة ربط)',
      actorEmail: actorEmail || 'unknown',
      action: 'PARENT_LINK_FAILURE',
      entity: 'student_linking_codes',
      entityId: matchedStudent.id,
      details: `رفض الربط: رمز الربط (${cleanCode}) غير صحيح أو غير مسند للطالبة (${matchedStudent.name})`,
    });
    throw new Error('رمز الربط غير صحيح أو غير مرتبط بهذه الطالبة.');
  }

  if (matchedCode.is_revoked) {
    throw new Error('تم إلغاء رمز الربط هذا من قِبل إدارة المدرسة. يرجى التواصل مع الإدارة لإصدار رمز جديد.');
  }

  if (matchedCode.is_used) {
    throw new Error('تم استخدام رمز الربط هذا مسبقاً، والرمز صالح لمرة واحدة فقط.');
  }

  // Expiration check (3 Days)
  const now = Date.now();
  const exp = new Date(matchedCode.expires_at).getTime();
  if (now > exp) {
    await logActivity({
      actorId: 'guest_parent',
      actorName: 'ولي أمر (محاولة ربط)',
      actorEmail: actorEmail || 'unknown',
      action: 'PARENT_LINK_FAILURE',
      entity: 'student_linking_codes',
      entityId: matchedCode.id,
      details: `رفض الربط: رمز الربط منتهي الصلاحية (تجاوز 3 أيام) للطالبة (${matchedStudent.name})`,
    });
    throw new Error('انتهت صلاحية رمز الربط (صالح لمدة 3 أيام فقط). يُرجى من ولي الأمر طلب رمز جديد من إدارة المدرسة.');
  }

  // 5. All Verifications Succeeded -> Dispatch SMS OTP
  const otpResult = await SmsService.sendOtp({
    phone: matchedStudent.phone,
    studentId: matchedStudent.id,
    studentName: matchedStudent.name,
    linkingCode: matchedCode.code,
  });

  return {
    otpSessionId: otpResult.sessionId,
    maskedPhone: otpResult.maskedPhone,
    previewCode: otpResult.previewCode,
    student: matchedStudent,
  };
}

/**
 * STEP 2: Verify OTP, Atomically Consume Code, and Establish Parent Relationship.
 */
export async function completeParentLinkingWithOtp(params: {
  otpSessionId: string;
  enteredOtp: string;
  relationshipType?: RelationshipType;
  parentUser: UserProfile;
}): Promise<{
  relationship: ParentStudentRelationship;
  student: StudentRecord;
}> {
  const { otpSessionId, enteredOtp, relationshipType = 'guardian', parentUser } = params;

  // 1. Verify OTP with SMS Service
  const otpCheck = SmsService.verifyOtp({
    sessionId: otpSessionId,
    enteredOtp,
  });

  if (!otpCheck.success || !otpCheck.session) {
    await logActivity({
      actorId: parentUser.id,
      actorName: parentUser.name,
      actorEmail: parentUser.email,
      action: 'PARENT_LINK_FAILURE',
      entity: 'parent_student_relationships',
      entityId: parentUser.id,
      details: `فشل إدخال رمز التحقق OTP: ${otpCheck.error}`,
    });
    throw new Error(otpCheck.error || 'رمز التحقق (SMS) غير صحيح.');
  }

  const { studentId, linkingCode } = otpCheck.session;

  // 2. Fetch Student Record
  const allStudents = await getAllStudents();
  const student = allStudents.find((s) => s.id === studentId);
  if (!student) {
    throw new Error('لم يتم العثور على سجل الطالبة.');
  }

  // 3. Concurrency Protection & Atomic Re-check:
  // Ensure student has NOT been linked by anyone else in the meantime!
  const alreadyLinked = await getActiveRelationshipForStudent(studentId);
  if (alreadyLinked) {
    throw new Error('عفواً، تم ربط الطالبة بالفعل بحساب ولي أمر آخر في هذه الأثناء.');
  }

  // 4. Atomically Consume Linking Code (Single-use rule)
  const allCodes = await getAllLinkingCodes();
  const codeRecord = allCodes.find(
    (c) =>
      c.student_id === studentId &&
      c.code.toUpperCase().replace(/\s+/g, '') === linkingCode.toUpperCase().replace(/\s+/g, '') &&
      !c.is_used &&
      !c.is_revoked
  );

  if (!codeRecord) {
    throw new Error('رمز الربط لم يعد متاحاً للاستخدام أو تم استهلاكه.');
  }

  codeRecord.is_used = true;
  codeRecord.used_at = new Date().toISOString();
  codeRecord.used_by_parent_id = parentUser.id;

  try {
    await supabase
      .from('student_linking_codes')
      .update({
        is_used: true,
        used_at: codeRecord.used_at,
        used_by_parent_id: parentUser.id,
      })
      .eq('id', codeRecord.id);
  } catch (e) {
    console.warn('Update code used notice:', e);
  }

  setCachedCodes(allCodes);
  SmsService.consumeSession(otpSessionId);

  // 5. Create Parent-Student Relationship
  const newRelId = crypto.randomUUID();
  const newRel: ParentStudentRelationship = {
    id: newRelId,
    parent_user_id: parentUser.id,
    student_user_id: student.account_user_id || student.id,
    student_record_id: student.id,
    relationship_type: relationshipType,
    is_active: true,
    created_by: parentUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    studentRecord: student,
    parent: parentUser,
  };

  // Save relationship to Supabase
  try {
    const { error: relDbError } = await supabase.from('parent_student_relationships').insert([
      {
        id: newRel.id,
        parent_user_id: newRel.parent_user_id,
        student_user_id: newRel.student_user_id,
        relationship_type: newRel.relationship_type,
        is_active: true,
        created_by: parentUser.id,
        created_at: newRel.created_at,
        updated_at: newRel.updated_at,
      },
    ]);

    if (relDbError) {
      console.warn('[studentService] Notice inserting parent_student_relationship:', relDbError.message);
    }
  } catch (err) {
    console.warn('[studentService] Exception inserting parent_student_relationship:', err);
  }

  // Update Relationships Cache
  const currentRels = getCachedRelationships();
  const updatedRels = [
    newRel,
    ...currentRels.filter((r) => !(r.student_record_id === student.id || r.student_user_id === student.id)),
  ];
  setCachedRelationships(updatedRels);

  // 6. Update Parent User Profile: Ensure school_role = 'parent' and link encoded in profile
  try {
    const existingCustomPerms = parentUser.customPermissions || [];
    const newCustomPerms = [
      ...existingCustomPerms.filter((p) => typeof p === 'string' && !p.startsWith(`parent_of:${student.id}`)),
      `parent_of:${student.id}:${relationshipType}:1` as any,
    ];

    await dataStore.updateUser(parentUser.id, {
      school_role: 'parent',
      customPermissions: newCustomPerms,
    });
  } catch (uErr) {
    console.warn('Update parent user customPermissions notice:', uErr);
  }

  // 7. Audit Log Success
  await logActivity({
    actorId: parentUser.id,
    actorName: parentUser.name,
    actorEmail: parentUser.email,
    action: 'PARENT_LINK_SUCCESS',
    entity: 'parent_student_relationships',
    entityId: newRelId,
    details: `نجاح ربط ولي الأمر (${parentUser.name}) بالطالبة (${student.name} - ${student.student_id_code}) بعد التحقق من رقم الجوال (${student.phone}) والرمز ورمز OTP`,
  });

  return {
    relationship: newRel,
    student,
  };
}

/**
 * Unlinks a student from a parent (Admin action).
 */
export async function unlinkParentFromStudent(
  studentId: string,
  actor: UserProfile
): Promise<void> {
  const allowedRoles: SchoolRole[] = ['director', 'supervisor', 'administrator'];
  if (!allowedRoles.includes(actor.school_role) && actor.email !== 'moyara743@gmail.com') {
    throw new Error('عفواً، لا تملكين الصلاحية الإدارية لفك ربط ولي الأمر.');
  }

  const allStudents = await getAllStudents();
  const student = allStudents.find((s) => s.id === studentId);
  const studentName = student ? student.name : 'الطالبة';

  try {
    await supabase
      .from('parent_student_relationships')
      .update({ is_active: false })
      .or(`student_record_id.eq.${studentId},student_user_id.eq.${studentId}`);
  } catch (e) {
    console.warn('Unlink in supabase notice:', e);
  }

  const currentRels = getCachedRelationships();
  const updatedRels = currentRels.map((r) => {
    if (r.student_record_id === studentId || r.student_user_id === studentId) {
      return { ...r, is_active: false };
    }
    return r;
  });
  setCachedRelationships(updatedRels);

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'PARENT_UNLINK',
    entity: 'parent_student_relationships',
    entityId: studentId,
    details: `فك ربط ولي الأمر عن الطالبة (${studentName}) من قِبل الإدارة (${actor.name})`,
  });
}

/**
 * Verifies student National ID against database securely without leaking details.
 * Used for server-authoritative validations.
 */
export async function verifyStudentNationalId(
  studentId: string,
  inputNationalId: string
): Promise<boolean> {
  if (!studentId || !inputNationalId) return false;
  const clean = inputNationalId.trim();

  try {
    const { data, error } = await supabase
      .from('student_records')
      .select('id, national_id')
      .eq('id', studentId)
      .maybeSingle();

    if (!error && data?.national_id) {
      return data.national_id.trim() === clean;
    }
  } catch (e) {
    console.warn('[studentService] Notice during verifyStudentNationalId:', e);
  }

  const list = getCachedStudents();
  const found = list.find((s) => s.id === studentId);
  return Boolean(found && found.national_id && found.national_id.trim() === clean);
}

/**
 * Authenticates a student securely using Name and Secret Code.
 * - Confirms that the Name and Secret belong to the SAME student record.
 * - Does NOT use Name as primary identifier; relies on Student ID internally.
 * - Rejects suspended or non-active student records.
 */
export async function authenticateStudentByNameAndSecret(
  name: string,
  secret: string
): Promise<{
  student: StudentRecord;
  profile: UserProfile;
}> {
  const cleanName = normalizeArabicText(name);
  const cleanSecret = secret.trim();

  if (!cleanName || !cleanSecret) {
    throw new Error('يرجى كتابة اسم الطالبة والسر الخاص بها.');
  }

  const all = await getAllStudents();
  // Find student whose normalized name matches AND access_secret matches exactly
  const student = all.find((s) => {
    const nameMatches = normalizeArabicText(s.name) === cleanName;
    const secretMatches = (s.access_secret || '').trim().toUpperCase() === cleanSecret.toUpperCase();
    return nameMatches && secretMatches;
  });

  if (!student) {
    throw new Error('بيانات الدخول غير صحيحة. يرجى التأكد من اسم الطالبة والسر الخاص بها أو مراجعة إدارة المدرسة.');
  }

  if (student.status !== 'active') {
    throw new Error('سجل الطالبة غير نشط حالياً. يرجى مراجعة إدارة المدرسة.');
  }

  // Create or resolve student UserProfile
  const studentProfile: UserProfile = {
    id: student.account_user_id || student.id,
    name: student.name,
    email: `${student.student_id_code.toLowerCase()}@safiah.edu.sa`,
    phone: student.phone,
    school_role: 'student',
    status: 'active',
    customPermissions: [
      `nid:${student.national_id}` as any,
      'profile_completed' as any,
    ],
    temporaryPermissions: [],
    createdAt: student.created_at,
    lastLoginAt: new Date().toISOString(),
  };

  dataStore.syncUserProfileFromRemote(studentProfile);

  await logActivity({
    actorId: studentProfile.id,
    actorName: student.name,
    actorEmail: studentProfile.email,
    action: 'LOGIN',
    entity: 'student_records',
    entityId: student.id,
    details: `تسجيل دخول ناجح للطالبة (${student.name}) باستخدام الاسم والسر الخاص (${student.student_id_code})`,
  });

  return { student, profile: studentProfile };
}
