import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, PostType } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import {
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Pin,
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: Post | null;
  defaultType?: PostType;
  onSuccess?: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  postToEdit,
  defaultType = 'news',
  onSuccess,
}) => {
  const { user, profile, hasPerm, isOwner } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('أخبار المدرسة');
  const [type, setType] = useState<PostType>(defaultType);
  const [date, setDate] = useState(getTodayDateString());
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (postToEdit) {
        setTitle(postToEdit.title || '');
        setContent(postToEdit.content || '');
        setCategory(postToEdit.category || 'أخبار المدرسة');
        setType(postToEdit.type || defaultType);
        setDate(postToEdit.date || getTodayDateString());
        setImages(postToEdit.images || []);
        setIsPinned(postToEdit.isPinned || false);
      } else {
        setTitle('');
        setContent('');
        setType(defaultType);
        setCategory(defaultType === 'today_summary' ? 'يوميات المدرسة' : 'أخبار المدرسة');
        setDate(getTodayDateString());
        setImages([]);
        setIsPinned(false);
      }
      setNewImageUrl('');
      setError(null);
    }
  }, [isOpen, postToEdit, defaultType]);

  if (!isOpen) return null;

  const canEdit = postToEdit ? hasPerm('editPosts') : hasPerm('createPosts');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية إضافة أو تعديل الأخبار والمنشورات.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const res = event.target?.result as string;
      if (res) setImages((prev) => [...prev, res]);
    };
    reader.readAsDataURL(file);
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('يرجى كتابة عنوان وتفاصيل المنشور');
      return;
    }
    if (!user || !profile) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      if (postToEdit) {
        await dataStore.updatePost(postToEdit.id, {
          title: title.trim(),
          content: content.trim(),
          category: category.trim(),
          type,
          date,
          images,
          isPinned,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'posts',
          entityId: postToEdit.id,
          oldValue: postToEdit.title,
          newValue: title.trim(),
          details: `تعديل منشور: ${title.trim()}`,
        });
      } else {
        const newPostPayload = {
          title: title.trim(),
          content: content.trim(),
          category: category.trim(),
          type,
          date,
          images,
          authorId: user.id || user.uid,
          authorName: profile.name,
          authorRole: profile.school_role,
          authorEmail: user.email || '',
          status: 'published' as const,
          isPinned,
          likesCount: 0,
          likedBy: [],
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await dataStore.addPost(newPostPayload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'posts',
          entityId: docRef.id,
          newValue: title.trim(),
          details: `نشر محتوى جديد (${type === 'today_summary' ? 'يومنا بالمدرسة' : 'خبر'}): ${title.trim()}`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving post:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ المنشور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden my-8 text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-300" />
            <div>
              <h3 className="text-base font-bold">
                {postToEdit ? 'تعديل المنشور' : 'إضافة منشور / خبر جديد للمدرسة'}
              </h3>
              <p className="text-xs text-emerald-200">
                توثيق الأنشطة اليومية والأخبار والفعاليات المدرسية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              نوع المنشور / القسم المخصص
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'news', label: 'أخبار وفعاليات المدرسة', desc: 'أخبار عامة وأنشطة' },
                { id: 'today_summary', label: 'يومنا بالمدرسة (ماذا حدث اليوم؟)', desc: 'توثيق اليوم المدرسي الصباحي' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as PostType)}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    type === t.id
                      ? `bg-emerald-800/60 border-emerald-500 text-emerald-100 shadow-md`
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] text-slate-400">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              عنوان المنشور *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تكريم الطالبات الفائزات في الأولمبياد الوطني"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                تاريخ النشر *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                التصنيف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="أخبار المدرسة">أخبار المدرسة العامة</option>
                <option value="الأنشطة والابتكار">الأنشطة والموهبة</option>
                <option value="يوميات المدرسة">يوميات المدرسة</option>
                <option value="المسابقات المدرسية">المسابقات المدرسية</option>
                <option value="برامج الإرشاد">برامج الإرشاد الطلابي</option>
              </select>
            </div>

            {/* Pin Option (Admins / Owner only) */}
            {isOwner && (
              <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl mt-4 sm:mt-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>تثبيت بالأعلى</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              تفاصيل المنشور والمحتوى *
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل الخبر، الفعالية، التكريم، أو الإعلان بأسلوب واضح ومرتب..."
              className="w-full p-3.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>صور المنشور</span>
              <span className="text-[11px] text-slate-400 font-normal">اختر من جهازك أو ضع رابط الصورة</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <label className="flex items-center justify-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-dashed border-slate-600 rounded-xl cursor-pointer text-slate-300 text-xs font-bold">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>اختر صورة من جهازك</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>

              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="أو الصق رابط صورة https://..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {/* Attached Images */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                {images.map((url, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-700 h-24 bg-slate-800 shadow-sm">
                    <img src={url} alt="مرفق" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 left-1 p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg shadow-md"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl text-center text-slate-400 text-[11px]">
                لم يتم إرفاق صور بعد. يمكنك إضافة صور للخبر لتوثيقه بوضوح.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{postToEdit ? 'حفظ التعديلات' : 'نشر المنشور الآن'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
