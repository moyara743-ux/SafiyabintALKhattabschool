import React, { useState } from 'react';
import { SchoolEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { Calendar as CalendarIcon, Clock, MapPin, PlusCircle, Filter, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface EventsViewProps {
  events: SchoolEvent[];
  onOpenNewEventModal?: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ events, onOpenNewEventModal }) => {
  const { canManageEvents } = useAuth();
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const filtered = events.filter((ev) => {
    if (filterStatus === 'all') return true;
    return ev.status === filterStatus;
  });

  const monthNames = [
    'يناير (محرم/صفر)',
    'فبراير (صفر/ربيع الأول)',
    'مارس (ربيع الآخر)',
    'أبريل (جمادى الأولى)',
    'مايو (جمادى الآخرة)',
    'يونيو (رجب)',
    'يوليو (شعبان)',
    'أغسطس (رمضان/شوال)',
    'سبتمبر (ذو القعدة)',
    'أكتوبر (ذو الحجة)',
    'نوفمبر (محرم)',
    'ديسمبر (صفر)',
  ];

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/60 border border-emerald-500/30 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-amber-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-serif">تقويم الفعاليات والأنشطة المدرسية</h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
            جدول الفعاليات، المعارض العلمية، المهرجانات الثقافية، مواعيد الاختبارات والأنشطة اللاصفية.
          </p>
        </div>

        {canManageEvents && onOpenNewEventModal && (
          <button
            onClick={onOpenNewEventModal}
            className="px-5 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-md transition-transform hover:scale-102 flex items-center gap-2 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            <span>إضافة فعالية جديدة</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        {[
          { id: 'all', label: 'جميع الفعاليات' },
          { id: 'upcoming', label: 'الفعاليات القادمة' },
          { id: 'completed', label: 'الفعاليات المكتملة' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterStatus === tab.id
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ev) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {ev.image && (
                <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold shadow-md ${
                    ev.status === 'upcoming'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {ev.status === 'upcoming' ? 'قادمة' : 'مكتملة'}
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {ev.category}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mb-2">{ev.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                  {ev.description}
                </p>

                <div className="space-y-2 text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <CalendarIcon className="w-4 h-4 text-emerald-700" />
                    <span>التاريخ: {ev.date}</span>
                  </div>
                  {ev.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>الوقت: {ev.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>المكان: {ev.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>الجهة المشرفة: {ev.authorName}</span>
              <span className="text-emerald-700 font-bold">مدرسة صفية بنت عمر</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
