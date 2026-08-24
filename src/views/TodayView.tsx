import React from 'react';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { Sun, PlusCircle, Calendar, User, Clock, Heart, Share2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface TodayViewProps {
  posts: Post[];
  onSelectPost: (p: Post) => void;
  onOpenNewPostModal?: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ posts, onSelectPost, onOpenNewPostModal }) => {
  const { canPostToday } = useAuth();
  const todaySummaries = posts.filter((p) => p.type === 'today_summary' && p.status === 'published');

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Spotlight */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-200" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-serif">يومنا في مدرسة صفية بنت عمر</h1>
          </div>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
            ماذا حدث اليوم؟ ملخص يومي ينقل نبض المدرسة، الطابور الصباحي، الحصص النموذجية، تكريمات اليوم، وزيارات اللجان.
          </p>
        </div>

        {canPostToday && onOpenNewPostModal && (
          <button
            onClick={onOpenNewPostModal}
            className="px-5 py-2.5 bg-white text-amber-950 hover:bg-amber-50 text-xs font-bold rounded-xl shadow-md transition-transform hover:scale-102 flex items-center gap-2 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-amber-700" />
            <span>نشر تقرير اليوم</span>
          </button>
        )}
      </div>

      {/* Timeline Layout */}
      {todaySummaries.length > 0 ? (
        <div className="space-y-6">
          {todaySummaries.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                    <Sun className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>إعداد: {item.authorName}</span>
                      <span>•</span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString('ar-SA', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-full text-xs font-bold self-start sm:self-auto">
                  تقرير يومي موثق
                </span>
              </div>

              {/* Text content */}
              <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                {item.content}
              </div>

              {/* Attached Photos */}
              {item.images && item.images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {item.images.map((img, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 h-48 bg-slate-100">
                      <img src={img} alt="لقطة اليوم" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="text-slate-400">توثيق إدارة مدرسة صفية بنت عمر</span>
                <button
                  onClick={() => onSelectPost(item)}
                  className="text-amber-800 font-bold hover:underline"
                >
                  قراءة التقرير والتفاعل ←
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-amber-200 text-slate-500">
          <Sun className="w-12 h-12 mx-auto text-amber-300 mb-2" />
          <p className="text-base font-bold text-slate-800">لا توجد تقارير منشورة لليوم حتى الآن</p>
          <p className="text-xs text-slate-400 mt-1">يتم نشر اليوميات المدرسية يومياً من قبل المعلمات والإدارة.</p>
        </div>
      )}
    </div>
  );
};
