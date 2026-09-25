import React, { useState } from 'react';
import { SchoolEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import { isTodayDate, isTomorrowDate } from '../lib/dateUtils';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
} from 'lucide-react';

interface EventsViewProps {
  events: SchoolEvent[];
  onOpenNewEventModal: () => void;
  onEditEvent: (ev: SchoolEvent) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  onOpenNewEventModal,
  onEditEvent,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'tomorrow' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = hasPerm('createEvents');
  const canEdit = hasPerm('editEvents');
  const canDelete = hasPerm('deleteEvents');

  const filtered = events.filter((ev) => {
    let matchesTab = true;
    if (filterTab === 'today') {
      matchesTab = isTodayDate(ev.date);
    } else if (filterTab === 'tomorrow') {
      matchesTab = isTomorrowDate(ev.date);
    } else if (filterTab === 'upcoming') {
      matchesTab = ev.status === 'upcoming';
    } else if (filterTab === 'completed') {
      matchesTab = ev.status === 'completed';
    }

    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleDelete = async (ev: SchoolEvent) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف فعالية "${ev.title}"؟`)) return;
    if (!user || !profile) return;

    setDeletingId(ev.id);
    try {
      await dataStore.deleteEvent(ev.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'events',
        entityId: ev.id,
        oldValue: ev.title,
        details: `حذف فعالية: ${ev.title}`,
      });
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('حدث خطأ أثناء حذف الفعالية');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Banner */}
      <div className="bg-gradient-to-l from-teal-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-teal-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              تقويم الفعاليات والأنشطة المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            جدول البرامج التربوية، المعارض العلمية، الاختبارات الدورية، والمناسبات الوطنية بمدرسة صفية بنت عمر.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenNewEventModal}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-950/50 self-start md:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فعالية جديدة</span>
          </button>
        )}
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'today', label: 'اليوم' },
            { id: 'tomorrow', label: 'غداً' },
            { id: 'upcoming', label: 'القادمة' },
            { id: 'completed', label: 'المكتملة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="البحث في الفعاليات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Events Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-teal-500/40 transition-all"
            >
              {ev.image && (
                <div className="h-44 w-full bg-slate-800 overflow-hidden relative">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md ${
                      ev.status === 'upcoming'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ev.status === 'upcoming' ? 'قادمة' : 'مكتملة'}
                  </span>
                </div>
              )}

              <div className="p-5 space-y-3 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {ev.category}
                  </span>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => onEditEvent(ev)}
                        className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="تعديل الفعالية"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(ev)}
                        disabled={deletingId === ev.id}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف الفعالية"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-white leading-snug">{ev.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {ev.description}
                </p>

                <div className="space-y-1.5 text-xs text-slate-400 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CalendarIcon className="w-3.5 h-3.5 text-teal-400" />
                    <span>التاريخ: {ev.date}</span>
                  </div>
                  {ev.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>الوقت: {ev.time}</span>
                    </div>
                  )}
                  {ev.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>المكان: {ev.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>المشرفة: {ev.authorName || 'إدارة المدرسة'}</span>
                <span className="text-teal-400 font-bold">مدرسة صفية بنت عمر</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <CalendarIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-300">لا توجد فعاليات في هذا التبويب</p>
          <p className="text-xs text-slate-500">جربي تغيير شروط البحث أو اختيار تبويب آخر.</p>
        </div>
      )}
    </div>
  );
};
