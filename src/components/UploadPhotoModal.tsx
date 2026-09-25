import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SchoolPhoto, SchoolAlbum } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import { X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface UploadPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoToEdit?: SchoolPhoto | null;
  onSuccess?: () => void;
}

export const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({
  isOpen,
  onClose,
  photoToEdit,
  onSuccess,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [albums, setAlbums] = useState<SchoolAlbum[]>([]);
  const [date, setDate] = useState(getTodayDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load available albums for dropdown
      setAlbums(dataStore.getAlbums());

      if (photoToEdit) {
        setTitle(photoToEdit.title || '');
        setDescription(photoToEdit.description || '');
        setImageUrl(photoToEdit.imageUrl || '');
        setAlbumId(photoToEdit.albumId || '');
        setDate(photoToEdit.date || getTodayDateString());
      } else {
        setTitle('');
        setDescription('');
        setImageUrl('');
        setAlbumId('');
        setDate(getTodayDateString());
      }
      setError(null);
    }
  }, [isOpen, photoToEdit]);

  if (!isOpen) return null;

  const canEdit = photoToEdit ? hasPerm('editPhotos') : hasPerm('createPhotos');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية رفع أو تعديل صور المعرض المدرسي.</p>
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
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setError('يرجى اختيار صورة للرفع أولاً');
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
      const selectedAlbum = albums.find((a) => a.id === albumId);
      const albumName = selectedAlbum ? selectedAlbum.name : '';

      if (photoToEdit) {
        await dataStore.updatePhoto(photoToEdit.id, {
          title: title.trim() || 'صورة مدرسية',
          description: description.trim(),
          imageUrl,
          albumId: albumId || undefined,
          albumName: albumName || undefined,
          date,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'photos',
          entityId: photoToEdit.id,
          oldValue: photoToEdit.title,
          newValue: title.trim(),
          details: `تعديل صورة: ${title.trim()}`,
        });
      } else {
        const payload = {
          title: title.trim() || 'صورة من فعاليات المدرسة',
          description: description.trim(),
          imageUrl,
          albumId: albumId || undefined,
          albumName: albumName || undefined,
          date,
          authorId: user.id || user.uid,
          authorName: profile.name,
          createdAt: now,
          updatedAt: now,
        };
        const newDoc = await dataStore.addPhoto(payload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'photos',
          entityId: newDoc.id,
          newValue: title.trim(),
          details: `رفع صورة جديدة للمعرض`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving photo:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الصورة');
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
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {photoToEdit ? 'تعديل بيانات الصورة' : 'رفع صورة جديدة للمعرض'}
            </h2>
            <p className="text-xs text-slate-400">توثيق بالصور لمناسبات وأنشطة وفصول مدرسة صفية بنت عمر</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اختيار الصورة *</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/40">
                <ImageIcon className="w-4 h-4" />
                <span>اختيار من جهازك</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              <span className="text-[11px] text-slate-400">PNG, JPG, WEBP حتى 5MB</span>
            </div>
            {imageUrl && (
              <div className="mt-3 h-40 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/40">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان أو تعليق الصورة</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: ورشة الروبوت والذكاء الاصطناعي"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">الألبوم (اختياري)</label>
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">بدون ألبوم (معرض عام)</option>
                {albums.map((alb) => (
                  <option key={alb.id} value={alb.id}>
                    {alb.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">التاريخ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">تفاصيل إضافية</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="معلومات إضافية عن المناسبة..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
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
              disabled={loading || !imageUrl}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-950/40 transition-all disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : photoToEdit ? 'حفظ التعديلات' : 'إضافة للمعرض'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
