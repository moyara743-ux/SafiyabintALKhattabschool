import React, { useState } from 'react';
import { Post } from '../types';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { Award, PlusCircle, Trophy, Sparkles, Medal, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface AchievementsViewProps {
  posts: Post[];
  onSelectPost: (p: Post) => void;
  onOpenNewPostModal?: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  posts,
  onSelectPost,
  onOpenNewPostModal,
}) => {
  const { canPublish } = useAuth();
  const [filterCategory, setFilterCategory] = useState<string>('الكل');

  const achievementPosts = posts.filter(
    (p) =>
      p.status === 'published' &&
      (p.type === 'achievement' || p.category === 'الإنجازات والجوائز' || p.category === 'المسابقات المدرسية')
  );

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-purple-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-purple-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-serif">
              سجل الشرف والإنجازات المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-purple-200 max-w-xl font-light">
            توثيق إنجازات وتكريمات طالبات ومعلمات مدرسة صفية بنت عمر، والشهادات والجوائز المعتمدة.
          </p>
        </div>

        {onOpenNewPostModal && (
          <button
            onClick={onOpenNewPostModal}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-transform hover:scale-102 flex items-center gap-2 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>إضافة إنجاز أو شهادة تكريم</span>
          </button>
        )}
      </div>

      {/* Content Grid */}
      {achievementPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievementPosts.map((post) => (
            <PostCard key={post.id} post={post} onSelect={onSelectPost} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 bg-purple-50 text-purple-700 rounded-3xl flex items-center justify-center mx-auto border border-purple-100 shadow-sm">
            <Medal className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">لا توجد إنجازات مسجلة حالياً</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              يمكنك البدء الآن في توثيق إنجازات الطالبات، شهادات الشكر، والجوائز الحقيقية بالصور والتفاصيل الكاملة.
            </p>
          </div>
          {onOpenNewPostModal && (
            <button
              onClick={onOpenNewPostModal}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>إضافة أول إنجاز وتكريم</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
