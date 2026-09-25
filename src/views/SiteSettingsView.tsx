import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Phone,
  Mail,
  MapPin,
  Lock,
} from 'lucide-react';

export const SiteSettingsView: React.FC = () => {
  const { user, profile, hasPerm, isOwner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState('مدرسة صفية بنت عمر الابتدائية');
  const [motto, setMotto] = useState('صرح تعليمي رائد يصنع جيل المستقبل برؤية طموحة');
  const [vision, setVision] = useState('بيئة تعليمية محفزة ومبتكرة تسهم في بناء جيل معرفي متميز');
  const [mission, setMission] = useState('تقديم تعليم متميز وشامل يعزز القيم الوطنية ويطور المهارات الحياتية');
  const [phone, setPhone] = useState('011-2345678');
  const [email, setEmail] = useState('info@safiah-school.edu.sa');
  const [address, setAddress] = useState('المملكة العربية السعودية - الرياض');
  const [twitter, setTwitter] = useState('@safiah_school');

  const canEdit = hasPerm('manageSettings') || isOwner;

  useEffect(() => {
    const fetchSettings = () => {
      setLoading(true);
      try {
        const data = dataStore.getSettings() as any;
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.motto) setMotto(data.motto);
        if (data.vision) setVision(data.vision);
        if (data.mission) setMission(data.mission);
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.twitter) setTwitter(data.twitter);
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !user || !profile) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload: any = {
        schoolName,
        motto,
        vision,
        mission,
        phone,
        email,
        address,
        twitter,
        updatedAt: new Date().toISOString(),
      };

      await dataStore.updateSettings(payload);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'UPDATE',
        entity: 'settings',
        entityId: 'general',
        details: 'تحديث بيانات وإعدادات المدرسة الرسمية',
      });

      setSuccessMsg('تم حفظ وتحديث إعدادات المدرسة بنجاح في قاعدة البيانات.');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-rose-800 rounded-3xl max-w-lg mx-auto space-y-3" dir="rtl">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">غير مصرح لك بالدخول</h2>
        <p className="text-xs text-slate-400">تعديل إعدادات المدرسة متاح فقط للمديرة والمسؤولات.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16" dir="rtl">
      {/* Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">إعدادات وبيانات المدرسة العامة</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            التحكم في بيانات المدرسة الرسمية، الرؤية والرسالة، ومعلومات التواصل التي تظهر في ترويسة وتذييل الموقع.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الصرح التعليمي</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">الشعار التربوي (Motto)</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">رؤية المدرسة</label>
            <textarea
              rows={3}
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">رسالة المدرسة</label>
            <textarea
              rows={3}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الهاتف الرسمي</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني الرسمي</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">الموقع الجغرافي / العنوان</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">حساب منصة إكس (تويتر)</label>
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ والتحقق...' : 'حفظ الإعدادات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
