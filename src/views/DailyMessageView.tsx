import React, { useState } from 'react';
import { DailyMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface DailyMessageViewProps {
  messages: DailyMessage[];
  onOpenCreateModal: () => void;
  onEditMessage: (msg: DailyMessage) => void;
}

export const DailyMessageView: React.FC<DailyMessageViewProps> = ({
  messages,
  onOpenCreateModal,
  onEditMessage,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = hasPerm('createDailyMessage');
  const canEdit = hasPerm('editDailyMessage');
  const canDelete = hasPerm('deleteDailyMessage');

  const handleToggleActive = async (msg: DailyMessage) => {
    if (!canEdit || !user || !profile) return;
    try {
      await dataStore.updateDailyMessage(msg.id, {
        isActive: !msg.isActive,
      });

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'UPDATE',
        entity: 'dailyMessages',
        entityId: msg.id,
        newValue: msg.isActive ? 'false' : 'true',
        details: `تغيير حالة تفعيل الرسالة اليومية (${msg.id})`,
      });
    } catch (err) {
      console.error('Error updating active state:', err);
    }
  };

  const handleDelete = async (msg: DailyMessage) => {
    if (!window.confirm('هل أنتِ متأكدة من حذف هذه الرسالة اليومية نهائياً؟')) {
      return;
    }
    if (!user || !profile) return;

    setDeletingId(msg.id);
    try {
      await dataStore.deleteDailyMessage(msg.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'dailyMessages',
        entityId: msg.id,
        oldValue: msg.content.substring(0, 30),
        details: `حذف رسالة يومية بتاريخ ${msg.date}`,
      });
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('حدث خطأ أثناء حذف الرسالة');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-[#064e3b] to-emerald-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border-2 border-amber-400/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              أرشيف الرسائل اليومية للمدرسة
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed font-normal">
            الرسائل التربوية والتوجيهية الصباحية الموجهة للطالبات والمعلمات ومنسوبي المدرسة.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md border border-amber-300 self-start md:self-auto transition-transform hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-950" />
            <span>إضافة رسالة يومية</span>
          </button>
        )}
      </div>

      {/* Messages List */}
      {messages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                msg.isActive
                  ? 'bg-amber-50/40 border-amber-300 shadow-sm'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{msg.date}</span>
                    </span>

                    {msg.isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>نشط في الواجهة</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        مؤرشفة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => handleToggleActive(msg)}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          msg.isActive
                            ? 'text-amber-600 hover:bg-amber-100'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={msg.isActive ? 'تعطيل الظهور' : 'تفعيل للظهور بالرئيسية'}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => onEditMessage(msg)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="تعديل الرسالة"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(msg)}
                        disabled={deletingId === msg.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الرسالة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed italic">
                  "{msg.content}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span>الكاتب: <strong className="text-slate-700">{msg.authorName || 'إدارة المدرسة'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500 space-y-2">
          <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">لا توجد رسائل يومية مسجلة بعد</p>
          <p className="text-xs text-slate-400">
            يمكن لمديرة المدرسة أو المسؤولات إضافة رسائل يومية تربوية.
          </p>
        </div>
      )}
    </div>
  );
};
