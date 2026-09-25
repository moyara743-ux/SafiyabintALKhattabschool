import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SchoolAlbum } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import { X, FolderPlus, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumToEdit?: SchoolAlbum | null;
  onSuccess?: () => void;
}

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  albumToEdit,
  onSuccess,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (albumToEdit) {
        setName(albumToEdit.name || '');
        setDescription(albumToEdit.description || '');
        setCoverImage(albumToEdit.coverImage || '');
        setDate(albumToEdit.date || getTodayDateString());
      } else {
        setName('');
        setDescription('');
        setCoverImage('');
        setDate(getTodayDateString());
      }
      setError(null);
    }
  }, [isOpen, albumToEdit]);

  if (!isOpen) return null;

  const canEdit = albumToEdit ? hasPerm('editAlbums') : hasPerm('createAlbums');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية إنشاء أو تعديل ألبومات الصور المدرسية.</p>
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
      setCoverImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coverImage) {
      setError('يرجى كتابة اسم الألبوم وتحديد صورة الغلاف');
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

      if (albumToEdit) {
        await dataStore.updateAlbum(albumToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          coverImage,
          date,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'albums',
          entityId: albumToEdit.id,
          oldValue: albumToEdit.name,
          newValue: name.trim(),
          details: `تعديل ألبوم: ${name.trim()}`,
        });
      } else {
        const payload = {
          name: name.trim(),
          description: description.trim(),
          coverImage,
          date,
          photosCount: 0,
          authorId: user.id || user.uid,
          authorName: profile.name,
          createdAt: now,
          updatedAt: now,
        };
        const newDoc = await dataStore.addAlbum(payload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'albums',
          entityId: newDoc.id,
          newValue: name.trim(),
          details: `إنشاء ألبوم صور جديد: ${name.trim()}`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving album:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الألبوم');
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
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {albumToEdit ? 'تعديل بيانات الألبوم' : 'إنشاء ألبوم صور جديد'}
            </h2>
            <p className="text-xs text-slate-400">تجميع صور الفعاليات والمناسبات في ألبومات منظمة</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الألبوم *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حفل تخرج الدفعة الخامسة عشرة"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ الألبوم</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">صورة غلاف الألبوم *</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/40">
                <ImageIcon className="w-4 h-4" />
                <span>اختيار صورة الغلاف</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-xs text-rose-400 hover:underline"
                >
                  إزالة
                </button>
              )}
            </div>
            {coverImage && (
              <div className="mt-3 h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/40">
                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف الألبوم (اختياري)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتبي نبذة توضيحية عن محتوى هذا الألبوم..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
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
              disabled={loading || !coverImage}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/40 transition-all disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : albumToEdit ? 'حفظ التعديلات' : 'إنشاء الألبوم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
