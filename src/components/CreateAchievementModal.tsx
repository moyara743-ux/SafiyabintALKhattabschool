import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Achievement } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import { X, Award, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CreateAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievementToEdit?: Achievement | null;
  onSuccess?: () => void;
}

export const CreateAchievementModal: React.FC<CreateAchievementModalProps> = ({
  isOpen,
  onClose,
  achievementToEdit,
  onSuccess,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('تفوق طالبات');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (achievementToEdit) {
        setTitle(achievementToEdit.title || '');
        setDescription(achievementToEdit.description || '');
        setDate(achievementToEdit.date || getTodayDateString());
        setImage(achievementToEdit.image || '');
        setCategory(achievementToEdit.category || 'تفوق طالبات');
      } else {
        setTitle('');
        setDescription('');
        setDate(getTodayDateString());
        setImage('');
        setCategory('تفوق طالبات');
      }
      setError(null);
    }
  }, [isOpen, achievementToEdit]);

  if (!isOpen) return null;

  const canEdit = achievementToEdit ? hasPerm('editAchievements') : hasPerm('createAchievements');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية إضافة أو تعديل سجل الإنجازات والجوائز.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('يرجى كتابة عنوان وتفاصيل الإنجاز');
      return;
    }
    if (!user || !profile) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      if (achievementToEdit) {
        await dataStore.updateAchievement(achievementToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          date,
          image: image.trim() || undefined,
          category,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'achievements',
          entityId: achievementToEdit.id,
          oldValue: achievementToEdit.title,
          newValue: title.trim(),
          details: `تعديل إنجاز: ${title.trim()}`,
        });
      } else {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          date,
          image: image.trim() || undefined,
          category,
          authorId: user.id || user.uid,
          authorName: profile.name,
          createdAt: now,
          updatedAt: now,
        };
        const newDoc = await dataStore.addAchievement(payload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'achievements',
          entityId: newDoc.id,
          newValue: title.trim(),
          details: `إضافة إنجاز جديد: ${title.trim()}`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving achievement:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الإنجاز');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {achievementToEdit ? 'تعديل الإنجاز' : 'إضافة إنجاز أو تكريم مدرسي'}
            </h2>
            <p className="text-xs text-slate-400">توثيق الجوائز والمراكز المتقدمة والتفوق العلمي والمهاري</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الإنجاز والتكريم *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المركز الأول في مسابقة تحدي القراءة العربي"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ الإنجاز *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">الفئة والتصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="تفوق طالبات">تفوق طالبات</option>
                <option value="تميز معلمات">تميز معلمات</option>
                <option value="جوائز المدرسة">جوائز المدرسة</option>
                <option value="مسابقات وزارية">مسابقات وزارية</option>
                <option value="مبادرات مجتمعية">مبادرات مجتمعية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">تفاصيل وحيثيات الإنجاز *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتبي أسماء المكرمات ومستوى المسابقة والجهة المانحة..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">صورة التكريم أو الشهادة (اختياري)</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span>اختيار صورة من الجهاز</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="text-xs text-rose-400 hover:underline"
                >
                  إزالة الصورة
                </button>
              )}
            </div>
            {image && (
              <div className="mt-2 h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/40">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/40 transition-all disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ والتحقق...' : achievementToEdit ? 'حفظ التعديلات' : 'توثيق الإنجاز'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
