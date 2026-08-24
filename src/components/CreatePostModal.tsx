import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, PostType, PostStatus } from '../types';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Pin,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: Post | null;
  defaultType?: PostType;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  postToEdit,
  defaultType = 'news',
}) => {
  const { user, profile, isOwner, isAdmin } = useAuth();

  const [title, setTitle] = useState(postToEdit?.title || '');
  const [content, setContent] = useState(postToEdit?.content || '');
  const [category, setCategory] = useState(
    postToEdit?.category || (defaultType === 'achievement' ? 'الإنجازات والجوائز' : defaultType === 'today_summary' ? 'يوميات المدرسة' : 'أخبار المدرسة')
  );
  const [type, setType] = useState<PostType>(postToEdit?.type || defaultType);
  const [images, setImages] = useState<string[]>(postToEdit?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(postToEdit?.isPinned || false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (postToEdit) {
        setTitle(postToEdit.title);
        setContent(postToEdit.content);
        setCategory(postToEdit.category);
        setType(postToEdit.type);
        setImages(postToEdit.images || []);
        setIsPinned(postToEdit.isPinned || false);
      } else {
        setTitle('');
        setContent('');
        setType(defaultType);
        setCategory(
          defaultType === 'achievement'
            ? 'الإنجازات والجوائز'
            : defaultType === 'today_summary'
            ? 'يوميات المدرسة'
            : 'أخبار المدرسة'
        );
        setImages([]);
        setIsPinned(false);
      }
      setNewImageUrl('');
      setError(null);
    }
  }, [isOpen, postToEdit, defaultType]);

  if (!isOpen) return null;

  // Determine initial status based on permissions / moderation workflow
  const isDirectPublisher = isOwner || isAdmin || !(profile?.permissions?.requiresReview);

  const handleAddImage = () => {
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
    if (!user || !profile) return;
    setError(null);
    setSubmitting(true);

    try {
      const status: PostStatus = isDirectPublisher ? 'published' : 'pending_review';

      if (postToEdit) {
        // Edit existing post
        const postRef = doc(db, 'posts', postToEdit.id);
        await updateDoc(postRef, {
          title: title.trim(),
          content: content.trim(),
          category: category.trim(),
          type,
          images,
          isPinned,
          updatedAt: new Date().toISOString(),
        });

        // Log action
        await addDoc(collection(db, 'activityLogs'), {
          action: 'تعديل منشور',
          details: `تم تعديل المنشور "${title}" بواسطة ${profile.displayName}`,
          userId: user.uid,
          userName: profile.displayName,
          userEmail: user.email,
          targetId: postToEdit.id,
          targetType: 'post',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } else {
        // Create new post
        const newPost: Omit<Post, 'id'> = {
          title: title.trim(),
          content: content.trim(),
          category: category.trim(),
          type,
          images,
          authorId: user.uid,
          authorName: profile.displayName,
          authorRole: profile.role,
          authorEmail: user.email || undefined,
          status,
          isPinned,
          likesCount: 0,
          likedBy: [],
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'posts'), newPost);

        // Audit log
        await addDoc(collection(db, 'activityLogs'), {
          action: 'إنشاء منشور جديد',
          details: `تم نشر/إرسال منشور "${title}" بحالة (${status}) بواسطة ${profile.displayName}`,
          userId: user.uid,
          userName: profile.displayName,
          userEmail: user.email,
          targetId: docRef.id,
          targetType: 'post',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء حفظ المنشور');
    } finally {
      setSubmitting(false);
    }
  };

  const sampleImages = [
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1000&q=80',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-300" />
            <div>
              <h3 className="text-base font-bold">
                {postToEdit ? 'تعديل المنشور' : 'إضافة منشور / خبر جديد للمدرسة'}
              </h3>
              <p className="text-xs text-emerald-100">
                {isDirectPublisher
                  ? 'سيتم نشر هذا المنشور مباشرة في المنصة'
                  : 'سيتم إرسال المنشور لمراجعة واعتماد المديرة قبل النشر'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نوع المنشور / القسم المخصص
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'news', label: 'أخبار وفعاليات', color: 'border-emerald-500 text-emerald-800' },
                { id: 'today_summary', label: 'يومنا بالمدرسة (ماذا حدث اليوم)', color: 'border-amber-500 text-amber-800' },
                { id: 'achievement', label: 'إنجازات وجوائز', color: 'border-purple-500 text-purple-800' },
                { id: 'announcement', label: 'إعلان وتنبيه هام', color: 'border-blue-500 text-blue-800' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as PostType)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                    type === t.id
                      ? `bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm ring-1 ring-emerald-600`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان المنشور *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تكريم الطالبات الفائزات في الأولمبياد الوطني"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                التصنيف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="أخبار المدرسة">أخبار المدرسة العامة</option>
                <option value="الأنشطة والابتكار">الأنشطة والموهبة</option>
                <option value="الإنجازات والجوائز">الإنجازات والتفوق</option>
                <option value="إعلانات وتنبيهات">إعلانات وتنبيهات</option>
                <option value="يوميات المدرسة">يوميات المدرسة</option>
                <option value="المسابقات المدرسية">المسابقات المدرسية</option>
              </select>
            </div>

            {/* Pin Option (Admins / Owner only) */}
            {(isOwner || isAdmin) && (
              <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Pin className="w-4 h-4 text-amber-700" />
                  <span>تثبيت في أعلى الصفحة الرئيسية</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تفاصيل المنشور والمحتوى *
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل الخبر، الفعالية، التكريم، أو الإعلان بأسلوب واضح ومرتب..."
              className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>صور المنشور أو شهادة التكريم</span>
              <span className="text-[11px] text-emerald-700 font-normal">اختر من جهازك أو ضع رابط الصورة</span>
            </label>

            {/* File Upload Button & URL Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <label className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-dashed border-emerald-300 rounded-xl cursor-pointer transition-colors text-emerald-900 text-xs font-bold">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>اختر صورة من جهازك / الجوال</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const res = event.target?.result as string;
                        if (res) setImages([...images, res]);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="أو الصق رابط صورة https://..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {/* Attached Images List */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                {images.map((url, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-200 h-24 bg-slate-100 shadow-sm">
                    <img src={url} alt="مرفق" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 left-1 p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg shadow-md transition-opacity"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                لم يتم إرفاق صور بعد. يمكنك إضافة صور للخبر أو وثائق وتكريمات بكل سهولة.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{postToEdit ? 'حفظ التعديلات' : isDirectPublisher ? 'نشر الآن' : 'إرسال للمراجعة'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
