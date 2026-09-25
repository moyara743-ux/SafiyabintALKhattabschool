import React, { useState } from 'react';
import { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import {
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  Pin,
  CheckCircle2,
} from 'lucide-react';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  onOpenCreateModal: () => void;
  onEditAnnouncement: (announcement: Announcement) => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  onOpenCreateModal,
  onEditAnnouncement,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'important'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = hasPerm('createAnnouncements');
  const canEdit = hasPerm('editAnnouncements');
  const canDelete = hasPerm('deleteAnnouncements');

  const filtered = announcements.filter((item) => {
    const matchesType = filterType === 'all' || item.isImportant;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDelete = async (item: Announcement) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف الإعلان "${item.title}"؟`)) {
      return;
    }
    if (!user || !profile) return;

    setDeletingId(item.id);
    try {
      await dataStore.deleteAnnouncement(item.id);

      await logActivity({
        actorId: user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'announcements',
        entityId: item.id,
        oldValue: item.title,
        details: `حذف إعلان: ${item.title}`,
      });
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('حدث خطأ أثناء حذف الإعلان');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Banner */}
      <div className="bg-gradient-to-l from-rose-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-rose-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              إعلانات وتعاميم مدرسة صفية بنت عمر
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            التبليغات الرسمية الصادرة من إدارة المدرسة، مواعيد الاختبارات، التنبيهات المهمة، والتعاميم الوزارية.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 self-start md:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إعلان جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            كل الإعلانات
          </button>
          <button
            onClick={() => setFilterType('important')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'important'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>الهام والعاجل فقط</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="البحث في الإعلانات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Announcements List */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                item.isImportant
                  ? 'bg-slate-900/90 border-rose-500/50 shadow-lg'
                  : 'bg-slate-900 border-slate-800 shadow-sm'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.isImportant ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>هام وعاجل</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        إعلان مدرسي
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{item.date}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => onEditAnnouncement(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="تعديل الإعلان"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف الإعلان"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-extrabold text-white">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>الجهة الناشرة: {item.authorName || 'إدارة المدرسة'}</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>معتمد</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <Bell className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-300">لا توجد إعلانات مطابقة</p>
          <p className="text-xs text-slate-500">جربي تغيير شروط البحث أو اختيار تبويب آخر.</p>
        </div>
      )}
    </div>
  );
};
