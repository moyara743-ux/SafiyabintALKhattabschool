import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  StudentRecord,
  StudentLinkingCode,
  StudentLinkingState,
  ParentStudentRelationship,
  UserProfile,
} from '../types';
import {
  getAllStudents,
  addStudent,
  updateStudent,
  generateLinkingCodeForStudent,
  revokeLinkingCode,
  getStudentLinkingInspection,
  unlinkParentFromStudent,
  validateNationalIdFormat,
  maskNationalId,
} from '../lib/studentService';
import {
  Users,
  Search,
  Plus,
  Key,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Unlink,
  Phone,
  GraduationCap,
  Calendar,
  Sparkles,
  Check,
  X,
  Shield,
  FileText,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export const StudentsManagementView: React.FC = () => {
  const { profile: currentProfile } = useAuth();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [linkingDetails, setLinkingDetails] = useState<
    Record<
      string,
      {
        state: StudentLinkingState;
        stateLabel: string;
        activeCode: StudentLinkingCode | null;
        remainingTime: string;
        linkedRelationship: ParentStudentRelationship | null;
        linkedParent: UserProfile | null;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal: Add Student
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStudentIdCode, setNewStudentIdCode] = useState('');
  const [newGradeStage, setNewGradeStage] = useState('الأول الثانوي');
  const [newClassroom, setNewClassroom] = useState('1/1');
  const [newNationalId, setNewNationalId] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // Modal: Edit Student
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGradeStage, setEditGradeStage] = useState('');
  const [editClassroom, setEditClassroom] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');

  // Action states & Toast
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage =
    ['director', 'supervisor', 'administrator'].includes(currentProfile?.school_role || '') ||
    currentProfile?.email === 'moyara743@gmail.com';

  const toggleRevealId = (studentId: string) => {
    setRevealedIds((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load students and their linking status
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const studentList = await getAllStudents();
      setStudents(studentList);

      // Fetch linking inspections for each student
      const detailsMap: typeof linkingDetails = {};
      for (const s of studentList) {
        detailsMap[s.id] = await getStudentLinkingInspection(s.id);
      }
      setLinkingDetails(detailsMap);
    } catch (err: any) {
      console.error('[StudentsManagement] Error loading data:', err);
      setErrorMessage(err?.message || 'تعذر تحميل بيانات الطالبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add Student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    if (!newName.trim() || !newPhone.trim()) {
      alert('يرجى ملء اسم الطالبة ورقم الجوال.');
      return;
    }

    const cleanNationalId = newNationalId.trim();
    if (!cleanNationalId) {
      alert('رقم الهوية الوطنية إلزامي لجميع الطالبات ولا يمكن إضافة طالبة بدونه.');
      return;
    }

    const val = validateNationalIdFormat(cleanNationalId);
    if (!val.isValid) {
      alert(val.message || 'صيغة رقم الهوية الوطنية غير صحيحة.');
      return;
    }

    setSavingStudent(true);
    try {
      await addStudent({
        name: newName.trim(),
        phone: newPhone.trim(),
        studentIdCode: newStudentIdCode.trim() || undefined,
        gradeStage: newGradeStage,
        classroom: newClassroom,
        nationalId: cleanNationalId,
        birthDate: newBirthDate || undefined,
        actor: currentProfile,
      });

      showToast(`تمت إضافة الطالبة (${newName}) بنجاح.`);
      setAddModalOpen(false);
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewStudentIdCode('');
      setNewNationalId('');
      setNewBirthDate('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'تعذر إضافة الطالبة.');
    } finally {
      setSavingStudent(false);
    }
  };

  // Handle Edit Student
  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile || !editingStudent) return;

    const cleanNationalId = editNationalId.trim();
    if (!cleanNationalId) {
      alert('رقم الهوية الوطنية إلزامي للطالبة ولا يمكن تركه فارغاً.');
      return;
    }

    const val = validateNationalIdFormat(cleanNationalId);
    if (!val.isValid) {
      alert(val.message || 'صيغة رقم الهوية الوطنية غير صحيحة.');
      return;
    }

    setSavingStudent(true);
    try {
      await updateStudent(
        editingStudent.id,
        {
          name: editName.trim(),
          phone: editPhone.trim(),
          grade_stage: editGradeStage,
          classroom: editClassroom.trim(),
          national_id: cleanNationalId,
          birth_date: editBirthDate || undefined,
          is_profile_complete: Boolean(cleanNationalId && editBirthDate),
        },
        currentProfile
      );

      showToast('تم تحديث بيانات الطالبة بنجاح.');
      setEditModalOpen(false);
      setEditingStudent(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'تعذر تحديث بيانات الطالبة.');
    } finally {
      setSavingStudent(false);
    }
  };

  // Generate / Regenerate Linking Code
  const handleGenerateCode = async (studentId: string, studentName: string) => {
    if (!currentProfile) return;
    setActionLoading(studentId);
    try {
      const codeRecord = await generateLinkingCodeForStudent(studentId, currentProfile);
      showToast(`تم إنشاء رمز ربط جديد للطالبة (${studentName}) صالح لمدة 3 أيام.`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'تعذر إنشاء رمز الربط.');
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke Code
  const handleRevokeCode = async (codeId: string, studentName: string) => {
    if (!currentProfile) return;
    if (!confirm(`هل أنتِ متأكدة من إلغاء رمز الربط الحالي للطالبة (${studentName})؟`)) {
      return;
    }

    try {
      await revokeLinkingCode(codeId, currentProfile);
      showToast(`تم إلغاء رمز الربط للطالبة (${studentName}).`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'تعذر إلغاء الرمز.');
    }
  };

  // Copy Code to Clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('تم نسخ رمز الربط إلى الحافظة بنجاح.');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Unlink Parent
  const handleUnlink = async (studentId: string, studentName: string) => {
    if (!currentProfile) return;
    if (
      !confirm(
        `هل أنتِ متأكدة من فك ارتباط ولي الأمر عن الطالبة (${studentName})؟ سيتمكن ولي الأمر أو ولي أمر جديد من الربط مجدداً برمز جديد.`
      )
    ) {
      return;
    }

    try {
      await unlinkParentFromStudent(studentId, currentProfile);
      showToast(`تم فك ارتباط ولي الأمر عن الطالبة (${studentName}) بنجاح.`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'تعذر فك الارتباط.');
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.student_id_code.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.national_id && s.national_id.includes(q));

    const matchesStage = stageFilter === 'all' || s.grade_stage === stageFilter;
    const insp = linkingDetails[s.id];
    const matchesStatus =
      statusFilter === 'all' || (insp && insp.state === statusFilter);

    return matchesSearch && matchesStage && matchesStatus;
  });

  // Calculate statistics
  const totalCount = students.length;
  const allInspections = Object.values(linkingDetails) as {
    state: StudentLinkingState;
    stateLabel: string;
    activeCode: StudentLinkingCode | null;
  }[];
  const linkedCount = allInspections.filter((d) => d.state === 'linked').length;
  const pendingCount = allInspections.filter((d) => d.state === 'pending_link').length;
  const unlinkedCount = allInspections.filter(
    (d) => d.state === 'unlinked' || d.state === 'code_expired' || d.state === 'code_revoked'
  ).length;

  if (!canManage) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200" dir="rtl">
        <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">غير مصرح بالوصول</h2>
        <p className="text-xs text-slate-500 mt-1">
          هذه الصفحة مخصصة للمديرة والمشرفات والإداريات لإدارة الطالبات ورموز الربط.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 p-4 bg-emerald-900 text-white rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-800/60">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>إدارة الطالبات والربط الرسمي</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
              إدارة الطالبات ورموز ربط أولياء الأمور
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              تسجيل الطالبات المعتمدات، إصدار رموز الربط الآمنة بصلاحية 3 أيام، والتحقق الفعلي من مطابقة أرقام الجوالات ومنع تعدد أولياء الأمور.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-950/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طالبة جديدة</span>
          </button>
        </div>

        {/* Quick Stats Ribbon */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-emerald-800/80">
          <div className="bg-emerald-900/60 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="block text-[11px] text-emerald-300 font-medium">إجمالي الطالبات</span>
            <span className="text-lg sm:text-xl font-black text-white">{totalCount} طالبة</span>
          </div>

          <div className="bg-emerald-900/60 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="block text-[11px] text-emerald-300 font-medium">مرتبطات بولي أمر</span>
            <span className="text-lg sm:text-xl font-black text-emerald-300">{linkedCount} مرتبطة</span>
          </div>

          <div className="bg-emerald-900/60 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="block text-[11px] text-amber-300 font-medium">بانتظار الربط (رمز نشط)</span>
            <span className="text-lg sm:text-xl font-black text-amber-300">{pendingCount} رمز نشط</span>
          </div>

          <div className="bg-emerald-900/60 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="block text-[11px] text-slate-300 font-medium">غير مرتبطة</span>
            <span className="text-lg sm:text-xl font-black text-slate-200">{unlinkedCount} غير مرتبطة</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم الطالبة، المعرّف (STU-...)، أو رقم الجوال..."
              className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>

          <div className="flex gap-2">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="all">جميع المراحل</option>
              <option value="الأول الثانوي">الأول الثانوي</option>
              <option value="الثاني الثانوي">الثاني الثانوي</option>
              <option value="الثالث الثانوي">الثالث الثانوي</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="all">جميع حالات الربط</option>
              <option value="linked">مرتبطة</option>
              <option value="pending_link">بانتظار الربط</option>
              <option value="unlinked">غير مرتبطة</option>
              <option value="code_expired">رمز الربط منتهي</option>
              <option value="code_revoked">رمز الربط ملغى</option>
              <option value="code_used">رمز الربط مستخدم</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold">جارٍ جلب سجلات الطالبات وحالات الربط...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800">لا توجد سجلات طالبات مطابقة</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {students.length === 0
              ? 'لم يتم تسجيل أي طالبة في قاعدة البيانات حتى الآن. يمكنكِ إضافة طالبة جديدة عبر الزر أعلاه.'
              : 'لم نجد أي طالبة تطابق معايير البحث والفلترة المحددة.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.map((student) => {
            const insp = linkingDetails[student.id] || {
              state: 'unlinked',
              stateLabel: 'غير مرتبطة',
              activeCode: null,
              remainingTime: '',
              linkedRelationship: null,
              linkedParent: null,
            };

            const isCodeActive = insp.state === 'pending_link' && !!insp.activeCode;

            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-emerald-300 transition-all space-y-5"
              >
                {/* Top: Student Information */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-600 text-white font-black text-base flex items-center justify-center shadow-md shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">{student.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {student.student_id_code}
                        </span>
                        {student.is_profile_complete ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مكتملة البيانات ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            بيانات أساسية فقط
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>المرحلة: <strong className="text-slate-700">{student.grade_stage}</strong></span>
                        {student.classroom && <span>الفصل: <strong className="text-slate-700">{student.classroom}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                    {/* National ID Display (Secure & Masked by default for admin) */}
                    <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-700" />
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">الهوية الوطنية:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-800" dir="ltr">
                            {revealedIds[student.id] ? student.national_id : maskNationalId(student.national_id)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealId(student.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                            title={revealedIds[student.id] ? 'إخفاء رقم الهوية' : 'إظهار رقم الهوية'}
                          >
                            {revealedIds[student.id] ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Registered Phone */}
                    <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">رقم الجوال المرتبط:</span>
                        <span className="text-xs font-mono font-bold text-slate-800" dir="ltr">
                          {student.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Parent Linking Status & Code Management */}
                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Status Indicator */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">حالة الربط:</span>
                      {insp.state === 'linked' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>مرتبطة بولي أمر</span>
                        </span>
                      )}
                      {insp.state === 'pending_link' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>بانتظار الربط (رمز نشط)</span>
                        </span>
                      )}
                      {insp.state === 'code_expired' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>رمز الربط منتهي</span>
                        </span>
                      )}
                      {insp.state === 'code_revoked' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5">
                          <span>رمز الربط ملغى</span>
                        </span>
                      )}
                      {insp.state === 'code_used' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5">
                          <span>رمز الربط مستخدم</span>
                        </span>
                      )}
                      {insp.state === 'unlinked' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                          <span>غير مرتبطة</span>
                        </span>
                      )}
                    </div>

                    {/* Linked Parent info */}
                    {insp.state === 'linked' && (
                      <p className="text-xs text-slate-600">
                        ولي الأمر المرتبط: <strong className="text-slate-900">{insp.linkedParent?.name || 'ولي أمر معتمد'}</strong>
                        {insp.linkedParent?.phone && (
                          <span className="text-slate-500 font-mono mr-2">({insp.linkedParent.phone})</span>
                        )}
                      </p>
                    )}

                    {/* Code countdown note */}
                    {isCodeActive && (
                      <p className="text-xs text-amber-800 font-medium">
                        صلاحية الرمز: {insp.remainingTime} (ينتهي في {insp.activeCode?.expires_at.split('T')[0]})
                      </p>
                    )}
                  </div>

                  {/* Active Code Box or Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Active Code Display */}
                    {isCodeActive && insp.activeCode && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm">
                        <Key className="w-4 h-4 text-amber-600" />
                        <span className="font-mono font-black text-xs sm:text-sm text-slate-900 tracking-wider select-all">
                          {insp.activeCode.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(insp.activeCode!.code)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="نسخ رمز الربط"
                        >
                          {copiedCode === insp.activeCode.code ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Action Buttons based on State */}
                    {insp.state === 'linked' ? (
                      <button
                        type="button"
                        onClick={() => handleUnlink(student.id, student.name)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>فك الربط</span>
                      </button>
                    ) : isCodeActive && insp.activeCode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRevokeCode(insp.activeCode!.id, student.name)}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          إلغاء الرمز
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === student.id}
                          onClick={() => handleGenerateCode(student.id, student.name)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>تجديد الرمز</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading === student.id}
                        onClick={() => handleGenerateCode(student.id, student.name)}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-300" />
                        <span>إنشاء رمز ربط</span>
                      </button>
                    )}

                    {/* Edit Student Info button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(student);
                        setEditName(student.name);
                        setEditPhone(student.phone);
                        setEditGradeStage(student.grade_stage);
                        setEditClassroom(student.classroom || '');
                        setEditNationalId(student.national_id || '');
                        setEditBirthDate(student.birth_date || '');
                        setEditModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="تعديل بيانات الطالبة"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Student */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5 relative">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">إضافة طالبة جديدة</h3>
                <p className="text-xs text-slate-500">تسجيل الطالبة في قاعدة البيانات لإصدار رمز ربط ولي الأمر</p>
              </div>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالبة الرباعي *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: سارة محمد راشد العتيبي"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الجوال المرتبط * (المعتمد للربط)
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 font-mono"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يُشترط أن يطابقه ولي الأمر تماماً عند طلب الربط
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    معرّف الطالبة (Student ID)
                  </label>
                  <input
                    type="text"
                    value={newStudentIdCode}
                    onChange={(e) => setNewStudentIdCode(e.target.value)}
                    placeholder="تلقائي: STU-000251"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
                  <select
                    value={newGradeStage}
                    onChange={(e) => setNewGradeStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    <option value="الأول الثانوي">الأول الثانوي</option>
                    <option value="الثاني الثانوي">الثاني الثانوي</option>
                    <option value="الثالث الثانوي">الثالث الثانوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفصل / الشعبة</label>
                  <input
                    type="text"
                    value={newClassroom}
                    onChange={(e) => setNewClassroom(e.target.value)}
                    placeholder="مثال: 1/1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهوية الوطنية * (إلزامي - 10 أرقام)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 أرقام تبدأ بـ 1 أو 2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    مطلوب وفريد لكل طالبة في النظام
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الميلاد (اختياري)
                  </label>
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={savingStudent}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-extrabold text-white shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {savingStudent ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>حفظ الطالبة في السجلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Student */}
      {editModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5 relative">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">تعديل بيانات الطالبة</h3>
                <p className="text-xs text-slate-500">{editingStudent.student_id_code}</p>
              </div>
            </div>

            <form onSubmit={handleEditStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالبة</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الجوال المرتبط (المعتمد للربط)
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
                  <select
                    value={editGradeStage}
                    onChange={(e) => setEditGradeStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    <option value="الأول الثانوي">الأول الثانوي</option>
                    <option value="الثاني الثانوي">الثاني الثانوي</option>
                    <option value="الثالث الثانوي">الثالث الثانوي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفصل</label>
                  <input
                    type="text"
                    value={editClassroom}
                    onChange={(e) => setEditClassroom(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهوية الوطنية * (إلزامي - 10 أرقام)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 أرقام تبدأ بـ 1 أو 2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يمنع تكرار رقم الهوية لطالبتين
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-extrabold text-white shadow"
                >
                  {savingStudent ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
