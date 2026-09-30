import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { updateStudent, getAllStudents } from '../lib/studentService';
import { logActivity } from '../lib/activityLogger';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar,
  Phone,
  Shield,
  ArrowRight,
  Heart,
} from 'lucide-react';

interface CompleteStudentProfileViewProps {
  onComplete?: () => void;
}

export const CompleteStudentProfileView: React.FC<CompleteStudentProfileViewProps> = ({
  onComplete,
}) => {
  const { user, profile, refreshProfile } = useAuth();

  const [nationalId, setNationalId] = useState(
    (profile?.customPermissions?.find((p) => p.startsWith('nid:')) || '').replace('nid:', '')
  );
  const [birthDate, setBirthDate] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [healthNotes, setHealthNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!nationalId.trim() || nationalId.trim().length < 10) {
      setError('يرجى إدخال رقم الهوية الوطنية أو الإقامة (10 أرقام).');
      return;
    }
    if (!birthDate) {
      setError('يرجى تحديد تاريخ الميلاد.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update matching student record if exists
      const allStudents = await getAllStudents();
      const matched = allStudents.find(
        (s) =>
          s.account_user_id === profile.id ||
          s.phone === profile.phone ||
          s.name.trim().toLowerCase() === profile.name.trim().toLowerCase()
      );

      if (matched) {
        await updateStudent(
          matched.id,
          {
            national_id: nationalId.trim(),
            birth_date: birthDate,
            emergency_contact_phone: emergencyPhone.trim() || undefined,
            blood_type: bloodType,
            notes: healthNotes.trim() || undefined,
            is_profile_complete: true,
          },
          profile
        );
      }

      // 2. Update user profile to mark profile completed
      const existingCustom = profile.customPermissions || [];
      const newCustom = [
        ...existingCustom.filter((p) => !p.startsWith('nid:') && p !== 'profile_completed' as any),
        `nid:${nationalId.trim()}` as any,
        'profile_completed' as any,
      ];

      await dataStore.updateUser(profile.id, {
        customPermissions: newCustom,
      });

      await logActivity({
        actorId: profile.id,
        actorName: profile.name,
        actorEmail: profile.email,
        action: 'UPDATE',
        entity: 'users',
        entityId: profile.id,
        details: 'إكمال بيانات الطالبة الأساسية بنجاح وتفعيل الدخول للمنصة',
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('[CompleteStudentProfile] Error:', err);
      setError(err?.message || 'تعذر حفظ البيانات، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 px-4" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2 border-b border-slate-100 pb-5">
          <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>مدرسة صفية بنت عمر الثانوية</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            إكمال البيانات الأساسية للطالبة
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            مرحباً بكِ {profile?.name}. لاستكمال تسجيل دخولكِ إلى المنصة المدرسية، يُرجى تعبئة بياناتكِ الأساسية المعتمدة.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم الهوية الوطنية / الإقامة *
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
              placeholder="10 أرقام تبدأ بـ 1 أو 2"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 font-mono"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الميلاد *</label>
            <div className="relative">
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم التواصل في حالات الطوارئ
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">فصيلة الدم</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات صحية أو إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder="أي ملاحظات تودين إبلاغ المرشدة الطلابية بها..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs sm:text-sm font-extrabold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>حفظ البيانات ومتابعة الدخول</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>البيانات سرية ومحمية وفق أنظمة وزارة التعليم</span>
        </div>
      </div>
    </div>
  );
};
