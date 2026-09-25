import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DailyMessage } from '../types';
import { dataStore } from '../lib/dataStore';
import { getTodayDateString } from '../lib/dateUtils';
import { logActivity } from '../lib/activityLogger';
import { X, MessageSquare, AlertCircle } from 'lucide-react';

interface DailyMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToEdit?: DailyMessage | null;
  onSuccess?: () => void;
}

export const DailyMessageModal: React.FC<DailyMessageModalProps> = ({
  isOpen,
  onClose,
  messageToEdit,
  onSuccess,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [content, setContent] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (messageToEdit) {
        setContent(messageToEdit.content || '');
        setDate(messageToEdit.date || getTodayDateString());
        setIsActive(messageToEdit.isActive !== false);
      } else {
        setContent('');
        setDate(getTodayDateString());
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, messageToEdit]);

  if (!isOpen) return null;

  const canEdit = messageToEdit ? hasPerm('editDailyMessage') : hasPerm('createDailyMessage');
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">غير مصرح لك بهذه العملية</h3>
          <p className="text-xs text-slate-400">حسابك لا يمتلك صلاحية كتابة أو تعديل الرسالة اليومية للمدرسة.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('يرجى كتابة نص الرسالة اليومية');
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

      if (messageToEdit) {
        await dataStore.updateDailyMessage(messageToEdit.id, {
          content: content.trim(),
          date,
          isActive,
          updatedAt: now,
        });

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'UPDATE',
          entity: 'dailyMessages',
          entityId: messageToEdit.id,
          newValue: content.trim().substring(0, 50),
          details: 'تعديل الرسالة اليومية للمدرسة',
        });
      } else {
        const payload = {
          content: content.trim(),
          date,
          isActive,
          authorName: profile.name,
          authorId: user.id || user.uid,
          createdAt: now,
          updatedAt: now,
        };
        const newDoc = await dataStore.addDailyMessage(payload);

        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'CREATE',
          entity: 'dailyMessages',
          entityId: newDoc.id,
          newValue: content.trim().substring(0, 50),
          details: 'نشر رسالة يومية جديدة للمدرسة',
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving daily message:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الرسالة اليومية');
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
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {messageToEdit ? 'تعديل الرسالة اليومية' : 'إضافة الرسالة اليومية للمدرسة'}
            </h2>
            <p className="text-xs text-slate-400">رسالة تربوية، تحفيزية، أو توجيهية تظهر في صدر المنصة</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ الرسالة *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">نص الرسالة اليومية *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتبي عبارة ملهمة أو توجيهاً صباحياً لطالبات ومعلمات المدرسة..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-orange-500 focus:ring-orange-400 w-4 h-4 bg-slate-800 border-slate-700"
              />
              <span className="text-xs font-bold text-slate-300">تفعيل الرسالة وجعلها ظاهرة في الصفحة الرئيسية</span>
            </label>
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
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/40 transition-all disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ والتحقق...' : messageToEdit ? 'حفظ التعديلات' : 'نشر رسالة اليوم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
