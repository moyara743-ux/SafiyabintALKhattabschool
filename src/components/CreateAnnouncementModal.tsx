import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Announcement } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import { X, Bell, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementToEdit?: Announcement | null;
  onSuccess?: () => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  announcementToEdit,
  onSuccess,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [image, setImage] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (announcementToEdit) {
        setTitle(announcementToEdit.title || '');
        setContent(announcementToEdit.content || '');
        setDate(announcementToEdit.date || getTodayDateString());
        setImage(announcementToEdit.image || '');
        setIsImportant(announcementToEdit.isImportant || false);
      } else {
        setTitle('');
        setContent('');
        setDate(getTodayDateString());
        setImage('');
        setIsImportant(false);
      }
      setError(null);
    }
  }, [isOpen, announcementToEdit]);

  if (!isOpen) return null;

  const canEdit = announcementToEdit ? hasPerm('editAnnouncements') : hasPerm('createAnnouncements');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية إضافة أو تعديل الإعلانات المدرسية.</p>
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
    if (!title.trim() || !content.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
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

      if (announcementToEdit) {
        // UPDATE operation
        await dataStore.updateAnnouncement(announcementToEdit.id, {
          title: title.trim(),
          content: content.trim(),
          date,
          image: image.trim() || undefined,
          isImportant,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'announcements',
          entityId: announcementToEdit.id,
          oldValue: announcementToEdit.title,
          newValue: title.trim(),
          details: `تعديل إعلان: ${title.trim()}`,
        });
      } else {
        // CREATE operation
        const payload = {
          title: title.trim(),
          content: content.trim(),
          date,
          image: image.trim() || undefined,
          isImportant,
          authorId: user.id || user.uid,
          authorName: profile.name,
          createdAt: now,
          updatedAt: now,
        };
        const newDoc = await dataStore.addAnnouncement(payload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'announcements',
          entityId: newDoc.id,
          newValue: title.trim(),
          details: `نشر إعلان جديد: ${title.trim()}`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الإعلان');
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
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {announcementToEdit ? 'تعديل الإعلان' : 'إضافة إعلان مدرسي جديد'}
            </h2>
            <p className="text-xs text-slate-400">نشر تنبيهات وتعاميم مهمة لمنسوبات المدرسة وأولياء الأمور</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الإعلان *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تنبيه هام بشأن موعد الحضور الصباحي"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ الإعلان *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-400 w-4 h-4 bg-slate-800 border-slate-700"
                />
                <span className="text-xs font-bold text-rose-300">إعلان عاجل ومهم</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">نص ومحتوى الإعلان *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتبي تفاصيل الإعلان هنا بوضوح..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">صورة توضيحية (اختياري)</label>
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
              <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/40">
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
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ والتحقق...' : announcementToEdit ? 'حفظ التعديلات' : 'نشر الإعلان الآن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
