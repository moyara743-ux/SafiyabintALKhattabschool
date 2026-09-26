import React, { useState } from 'react';
import { SchoolEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
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
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface EventsViewProps {
  events: SchoolEvent[];
  onOpenNewEventModal: () => void;
  onEditEvent: (ev: SchoolEvent) => void;
  onDeleteEvent?: (id: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  onOpenNewEventModal,
  onEditEvent,
  onDeleteEvent,
}) => {
  const { user, profile, hasPerm, isOwner } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'tomorrow' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation Modal State
  const [eventToDelete, setEventToDelete] = useState<SchoolEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine permissions
  const userRole = profile?.school_role || '';
  const isSystemOwner = isOwner || userRole === 'owner' || user?.email?.toLowerCase() === 'moyara743@gmail.com';
  const canCreate = hasPerm('createEvents') || isSystemOwner;
  const canEdit = hasPerm('editEvents') || isSystemOwner;
  const canDelete = hasPerm('deleteEvents') || isSystemOwner;

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

  // Handle clicking the trash icon to initiate deletion
  const handleInitiateDelete = (ev: SchoolEvent) => {
    setDeleteError(null);
    setEventToDelete(ev);
  };

  // Close the confirmation modal
  const handleCloseModal = () => {
    if (isDeleting) return;
    setEventToDelete(null);
    setDeleteError(null);
  };

  // Perform actual deletion with Supabase call, RLS check, error handling, and reactive update
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    // 1. Permission and Authentication verification
    if (!user || !profile) {
      setDeleteError('يجب تسجيل الدخول بحساب مصرح له (مالك النظام أو المديرة) لتنفيذ عملية الحذف.');
      setIsDeleting(false);
      return;
    }

    if (!canDelete) {
      setDeleteError(
        'عذراً، حسابك لا يمتلك صلاحية حذف الفعاليات (DELETE). هذه العملية مقتصرة حصرياً على مالك النظام والإدارة المدرسية.'
      );
      setIsDeleting(false);
      return;
    }

    try {
      const targetId = eventToDelete.id;
      const targetTitle = eventToDelete.title;

      // 2. Direct Supabase deletion on table 'events' matching id
      console.log(`[Supabase] Initiating DELETE on table 'events' where id = "${targetId}"`);
      const { error: supabaseError } = await supabase
        .from('events')
        .delete()
        .eq('id', targetId);

      if (supabaseError) {
        console.error('Supabase delete event returned error:', supabaseError);

        // Check for PostgreSQL Row Level Security (RLS) denial (code 42501)
        if (
          supabaseError.code === '42501' ||
          supabaseError.message?.toLowerCase().includes('violates row-level security') ||
          supabaseError.message?.toLowerCase().includes('permission denied')
        ) {
          setDeleteError(
            `فشل الحذف بسبب قيود سياسات الأمان (RLS) في Supabase (${supabaseError.code || '42501'}): لا تتوفر صلاحية DELETE على جدول events لهذا المستخدم. يرجى تفعيل سياسة RLS لمالك النظام (owner).`
          );
          setIsDeleting(false);
          return;
        } else if (supabaseError.code === 'PGRST205') {
          // Table not present in Supabase schema cache yet
          console.warn('Table "events" not found in Supabase schema cache, removing from local data store.');
        } else {
          // General database error
          setDeleteError(
            `خطأ في قاعدة بيانات Supabase: ${supabaseError.message} (رمز الخطأ: ${supabaseError.code})`
          );
          setIsDeleting(false);
          return;
        }
      }

      // 3. Immediately update local dataStore to notify all subscribers
      await dataStore.deleteEvent(targetId);

      // 4. Immediately trigger parent update if provided to ensure instant vanishing without page reload
      if (onDeleteEvent) {
        onDeleteEvent(targetId);
      }

      // 5. Record operation in activity log
      try {
        await logActivity({
          actorId: user.id || user.uid,
          actorName: profile.name,
          actorEmail: user.email || '',
          action: 'DELETE',
          entity: 'events',
          entityId: targetId,
          oldValue: targetTitle,
          details: `حذف فعالية: ${targetTitle}`,
        });
      } catch (logErr) {
        console.warn('Activity logging notice:', logErr);
      }

      // 6. Success notification and close modal
      setSuccessMessage(`تم حذف فعالية "${targetTitle}" بنجاح.`);
      setEventToDelete(null);

      // Auto-hide success toast after 4 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Unexpected exception during event deletion:', err);
      setDeleteError(err?.message || 'حدث خطأ غير متوقع أثناء معالجة طلب الحذف.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 relative" dir="rtl">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 text-white px-5 py-3 rounded-2xl border border-emerald-500/50 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-300 transition-colors mr-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          dir="rtl"
          onClick={handleCloseModal}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">تأكيد حذف الفعالية</h3>
                  <p className="text-xs text-slate-400 mt-0.5">يرجى التأكيد قبل إزالة السجل من النظام</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question and Event Details */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-white leading-relaxed">
                هل أنتِ متأكدة من حذف هذه الفعالية؟
              </p>

              <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-2 text-xs">
                <div className="font-extrabold text-teal-300 text-sm">{eventToDelete.title}</div>
                {eventToDelete.description && (
                  <p className="text-slate-300 line-clamp-2 leading-relaxed">
                    {eventToDelete.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-teal-400" />
                    <span>التاريخ: {eventToDelete.date}</span>
                  </span>
                  {eventToDelete.time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>الوقت: {eventToDelete.time}</span>
                    </span>
                  )}
                  {eventToDelete.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>المكان: {eventToDelete.location}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300/90 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  تنبيه: سيتم حذف الفعالية نهائياً من قاعدة بيانات Supabase والنظام فور تأكيد الحذف، ولا يمكن التراجع عن هذه العملية.
                </span>
              </div>

              {/* Error Message Display */}
              {deleteError && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 leading-relaxed animate-in fade-in duration-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">فشلت عملية الحذف:</span>
                    <span>{deleteError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الحذف من Supabase...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
            type="button"
            onClick={onOpenNewEventModal}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-950/50 self-start md:self-auto transition-all cursor-pointer"
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
              type="button"
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-teal-500/40 transition-all group"
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
                    {ev.category || 'فعالية مدرسية'}
                  </span>

                  {/* Action Buttons for Edit & Delete */}
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onEditEvent(ev)}
                        className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="تعديل الفعالية"
                        aria-label={`تعديل فعالية ${ev.title}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInitiateDelete(ev);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 rounded-lg transition-all cursor-pointer"
                        title="حذف الفعالية"
                        aria-label={`حذف فعالية ${ev.title}`}
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
export default EventsView;
