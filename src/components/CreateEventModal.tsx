import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SchoolEvent, EventStatus } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString, getTomorrowDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import { X, Calendar, Image as ImageIcon, MapPin, Clock, AlertCircle } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: SchoolEvent | null;
  onSuccess?: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onSuccess,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState('08:30 ص');
  const [location, setLocation] = useState('مسرح المدرسة');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('أنشطة عامة');
  const [status, setStatus] = useState<EventStatus>('upcoming');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.title || '');
        setDescription(eventToEdit.description || '');
        setDate(eventToEdit.date || getTodayDateString());
        setTime(eventToEdit.time || '08:30 ص');
        setLocation(eventToEdit.location || 'مسرح المدرسة');
        setImage(eventToEdit.image || '');
        setCategory(eventToEdit.category || 'أنشطة عامة');
        setStatus(eventToEdit.status || 'upcoming');
        setAdditionalInfo(eventToEdit.additionalInfo || '');
      } else {
        setTitle('');
        setDescription('');
        setDate(getTodayDateString());
        setTime('08:30 ص');
        setLocation('مسرح المدرسة');
        setImage('');
        setCategory('أنشطة عامة');
        setStatus('upcoming');
        setAdditionalInfo('');
      }
      setError(null);
    }
  }, [isOpen, eventToEdit]);

  if (!isOpen) return null;

  const canEdit = eventToEdit ? hasPerm('editEvents') : hasPerm('createEvents');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية إضافة أو تعديل الفعاليات والأنشطة.</p>
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
    if (!title.trim() || !description.trim() || !date) {
      setError('يرجى ملء جميع الحقول الإلزامية');
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

      if (eventToEdit) {
        await dataStore.updateEvent(eventToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          date,
          time: time.trim(),
          location: location.trim(),
          image: image.trim() || undefined,
          category,
          status,
          additionalInfo: additionalInfo.trim() || undefined,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'events',
          entityId: eventToEdit.id,
          oldValue: eventToEdit.title,
          newValue: title.trim(),
          details: `تعديل فعالية: ${title.trim()}`,
        });
      } else {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          date,
          time: time.trim(),
          location: location.trim(),
          image: image.trim() || undefined,
          category,
          status,
          additionalInfo: additionalInfo.trim() || undefined,
          authorId: user.id || user.uid,
          authorName: profile.name,
          createdAt: now,
          updatedAt: now,
        };
        const newDoc = await dataStore.addEvent(payload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'events',
          entityId: newDoc.id,
          newValue: title.trim(),
          details: `إضافة فعالية جديدة: ${title.trim()}`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving event:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الفعالية');
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
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {eventToEdit ? 'تعديل الفعالية' : 'إضافة فعالية مدرسية جديدة'}
            </h2>
            <p className="text-xs text-slate-400">جدولة وتوثيق برامج وأنشطة اليوم والغد والأسابيع القادمة</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الفعالية أو النشاط *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: معرض العلوم والابتكار السنوي"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">تاريخ الفعالية *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                    date === getTodayDateString()
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold'
                      : 'bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getTomorrowDateString())}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                    date === getTomorrowDateString()
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold'
                      : 'bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  غداً
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>الوقت</span>
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="مثال: 09:00 ص"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>المكان</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: مسرح المدرسة"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="أنشطة عامة">أنشطة عامة</option>
                <option value="ثقافي ولغوي">ثقافي ولغوي</option>
                <option value="علمي وتقني">علمي وتقني</option>
                <option value="تكريم وتفوق">تكريم وتفوق</option>
                <option value="برامج إرشادية">برامج إرشادية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="upcoming">قادمة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف الفعالية *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتبي نبذة عن الفعالية وأهدافها والمستهدفين منها..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">صورة الفعالية (اختياري)</label>
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
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-950/40 transition-all disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ والتحقق...' : eventToEdit ? 'حفظ التعديلات' : 'إضافة الفعالية'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
