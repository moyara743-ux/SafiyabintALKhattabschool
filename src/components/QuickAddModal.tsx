import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SchoolEvent, GalleryPhoto } from '../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar, Image as ImageIcon, Plus, X, CheckCircle2, AlertCircle, Clock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'event' | 'gallery';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, type }) => {
  const { user, profile } = useAuth();

  // Event states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('09:00 ص');
  const [eventLocation, setEventLocation] = useState('المسرح المدرسي');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('ثقافي وعلمي');
  const [eventImage, setEventImage] = useState('');

  // Gallery states
  const [photoTitle, setPhotoTitle] = useState('');
  const [album, setAlbum] = useState('الأنشطة الطلابية');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setError(null);
    setSubmitting(true);

    try {
      if (type === 'event') {
        const newEvent: Omit<SchoolEvent, 'id'> = {
          title: eventTitle.trim(),
          date: eventDate,
          time: eventTime,
          location: eventLocation.trim(),
          description: eventDescription.trim(),
          image: eventImage.trim() || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=80',
          status: 'upcoming',
          category: eventCategory,
          authorId: user.uid,
          authorName: profile.displayName,
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'events'), newEvent);

        await addDoc(collection(db, 'activityLogs'), {
          action: 'إضافة فعالية جديدة',
          details: `تمت إضافة فعالية "${eventTitle}" بواسطة ${profile.displayName}`,
          userId: user.uid,
          userName: profile.displayName,
          userEmail: user.email,
          targetId: docRef.id,
          targetType: 'event',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } else {
        const newPhoto: Omit<GalleryPhoto, 'id'> = {
          title: photoTitle.trim(),
          album,
          imageUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80',
          description: photoDescription.trim(),
          authorId: user.uid,
          authorName: profile.displayName,
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'gallery'), newPhoto);

        await addDoc(collection(db, 'activityLogs'), {
          action: 'رفع صورة إلى المعرض',
          details: `تمت إضافة صورة "${photoTitle}" في ألبوم ${album} بواسطة ${profile.displayName}`,
          userId: user.uid,
          userName: profile.displayName,
          userEmail: user.email,
          targetId: docRef.id,
          targetType: 'gallery',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {type === 'event' ? <Calendar className="w-6 h-6 text-amber-300" /> : <ImageIcon className="w-6 h-6 text-amber-300" />}
            <div>
              <h3 className="text-base font-bold">
                {type === 'event' ? 'إضافة فعالية مدرسية جديدة' : 'إضافة صورة إلى معرض المدرسة'}
              </h3>
              <p className="text-xs text-emerald-100">
                {type === 'event' ? 'سيتم إدراجها في تقويم الفعاليات والصفحة الرئيسية' : 'سيتم تصنيفها وتوثيقها في الألبوم المناسب'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {type === 'event' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الفعالية *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="مثال: حفل تكريم أوائل الطالبات"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفعالية *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وقت الفعالية</label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="مثال: 09:30 ص"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المكان</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="المسرح، الصالة الرياضية، المعمل..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="ثقافي ولغوي">ثقافي ولغوي</option>
                    <option value="علمي وتقني">علمي وتقني</option>
                    <option value="رياضي وصحي">رياضي وصحي</option>
                    <option value="احتفالي ومناسبات">احتفالي ومناسبات</option>
                    <option value="إرشادي وتوعوي">إرشادي وتوعوي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف الفعالية *</label>
                <textarea
                  rows={3}
                  required
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="وصف تفصيلي للفعالية وأهدافها والفئات المستهدفة..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صورة الفعالية (اختياري)</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 p-2 bg-emerald-50 hover:bg-emerald-100/80 border border-dashed border-emerald-300 rounded-xl cursor-pointer transition-colors text-emerald-900 text-xs font-bold">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>اختر صورة الفعالية من جهازك / الجوال</span>
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
                            if (res) setEventImage(res);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <input
                    type="url"
                    value={eventImage}
                    onChange={(e) => setEventImage(e.target.value)}
                    placeholder="أو رابط الصورة https://..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  {eventImage && (
                    <div className="relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={eventImage} alt="معاينة" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setEventImage('')}
                        className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded-md text-xs font-bold"
                      >
                        إلغاء الصورة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الصورة أو الحدث *</label>
                <input
                  type="text"
                  required
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="مثال: جانب من تكريم الطالبات في حفل التفوق"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الألبوم المخصص *</label>
                <select
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="فعاليات المدرسة">فعاليات المدرسة</option>
                  <option value="الأنشطة الطلابية">الأنشطة الطلابية</option>
                  <option value="الإنجازات والجوائز">الإنجازات والجوائز</option>
                  <option value="الاحتفالات">الاحتفالات المدرسية</option>
                  <option value="المسابقات">المسابقات والمشاركات</option>
                  <option value="مناسبات المدرسة">مناسبات المدرسة واليوم الوطني</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصورة المراد رفعها *</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-dashed border-emerald-300 rounded-xl cursor-pointer transition-colors text-emerald-900 text-xs font-bold">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>اختر صورة من الاستوديو / جهازك</span>
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
                            if (res) setPhotoUrl(res);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <input
                    type="url"
                    required
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="أو ضع رابط مباشر للصورة https://..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  {photoUrl && (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={photoUrl} alt="معاينة الصورة" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded-md text-xs font-bold"
                      >
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف أو تعليق الصورة</label>
                <textarea
                  rows={2}
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  placeholder="تعليق قصير يوضح تفاصيل الصورة..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>حفظ وإضافة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
