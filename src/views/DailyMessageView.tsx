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
      <div className="bg-gradient-to-l from-orange-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-orange-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              أرشيف الرسائل اليومية للمدرسة
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            الرسائل التربوية والتوجيهية الصباحية الموجهة للطالبات والمعلمات ومنسوبي المدرسة.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-950/50 self-start md:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
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
                  ? 'bg-slate-900 border-orange-500/50 shadow-md'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      <span>{msg.date}</span>
                    </span>

                    {msg.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>نشط في الواجهة</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        مؤرشفة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => handleToggleActive(msg)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          msg.isActive
                            ? 'text-amber-400 hover:bg-slate-800'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                        title={msg.isActive ? 'تعطيل الظهور' : 'تفعيل للظهور بالرئيسية'}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => onEditMessage(msg)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="تعديل الرسالة"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(msg)}
                        disabled={deletingId === msg.id}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف الرسالة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "{msg.content}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <span>الكاتب: {msg.authorName || 'إدارة المدرسة'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-300">لا توجد رسائل يومية مسجلة بعد</p>
          <p className="text-xs text-slate-500">
            يمكن لمديرة المدرسة أو المسؤولات إضافة رسائل يومية تربوية.
          </p>
        </div>
      )}
    </div>
  );
};
