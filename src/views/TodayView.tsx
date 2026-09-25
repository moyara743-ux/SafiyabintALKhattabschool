import React from 'react';
import { Post, SchoolEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { isTodayDate, isTomorrowDate, formatArabicFullDate } from '../lib/dateUtils';
import {
  Sun,
  Plus,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface TodayViewProps {
  posts: Post[];
  events: SchoolEvent[];
  onSelectPost: (p: Post) => void;
  onOpenNewPostModal?: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  posts,
  events,
  onSelectPost,
  onOpenNewPostModal,
}) => {
  const { hasPerm } = useAuth();
  const canPostToday = hasPerm('createPosts');

  const todaySummaries = posts.filter(
    (p) => p.type === 'today_summary' && p.status === 'published'
  );

  const todayEvents = events.filter((e) => isTodayDate(e.date));
  const tomorrowEvents = events.filter((e) => isTomorrowDate(e.date));

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Spotlight */}
      <div className="bg-gradient-to-l from-amber-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sun className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              يوميات مدرسة صفية بنت عمر
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            توثيق حي ومباشر لما حدث اليوم في المدرسة (الطابور الصباحي، الإذاعة، الحصص النموذجية، تكريمات اليوم)، مع استعراض جدول فعاليات الغد.
          </p>
        </div>

        {canPostToday && onOpenNewPostModal && (
          <button
            onClick={onOpenNewPostModal}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-950/50 flex items-center gap-2 self-start md:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>توثيق تقرير جديد لليوم</span>
          </button>
        )}
      </div>

      {/* Grid: Events of Tomorrow & Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Today's Events */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <h3>فعاليات وبرامج اليوم</h3>
          </div>

          {todayEvents.length > 0 ? (
            <div className="space-y-2">
              {todayEvents.map((ev) => (
                <div key={ev.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs space-y-1">
                  <h4 className="font-bold text-white">{ev.title}</h4>
                  <p className="text-slate-300">{ev.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    {ev.time && <span>الوقت: {ev.time}</span>}
                    {ev.location && <span>المكان: {ev.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">لا توجد فعاليات مسجلة لهذا اليوم.</p>
          )}
        </div>

        {/* Tomorrow's Events */}
        <div className="bg-slate-900 border border-teal-800/40 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
            <CalendarIcon className="w-4 h-4" />
            <h3>ماذا سيحدث غداً؟</h3>
          </div>

          {tomorrowEvents.length > 0 ? (
            <div className="space-y-2">
              {tomorrowEvents.map((ev) => (
                <div key={ev.id} className="p-3 bg-slate-800/60 rounded-xl border border-teal-500/30 text-xs space-y-1">
                  <h4 className="font-bold text-white">{ev.title}</h4>
                  <p className="text-slate-300">{ev.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    {ev.time && <span>الوقت: {ev.time}</span>}
                    {ev.location && <span>المكان: {ev.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">لا توجد فعاليات مجدولة للغد حتى الآن.</p>
          )}
        </div>
      </div>

      {/* Today Summaries List */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span>تقارير ويوميات المدرسة</span>
        </h2>

        {todaySummaries.length > 0 ? (
          <div className="space-y-4">
            {todaySummaries.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">{item.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>إعداد: {item.authorName}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold self-start sm:self-auto">
                    تقرير يومي موثق
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {item.content}
                </div>

                {item.images && item.images.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {item.images.map((img, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden border border-slate-700 h-44 bg-slate-800">
                        <img src={img} alt="لقطة اليوم" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span>توثيق إدارة مدرسة صفية بنت عمر</span>
                  <button
                    onClick={() => onSelectPost(item)}
                    className="text-amber-400 font-bold hover:underline"
                  >
                    قراءة التفاصيل ←
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
            <Sun className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-300">لا توجد تقارير يومية مسجلة بعد</p>
            <p className="text-xs text-slate-500">
              يمكن للمعلمات والإدارة توثيق ملخصات اليوم عبر زر "توثيق تقرير جديد لليوم".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
