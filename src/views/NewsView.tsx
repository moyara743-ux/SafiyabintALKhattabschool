import React, { useState } from 'react';
import { Post, PageView } from '../types';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { BookOpen, PlusCircle, Search, Filter, Sparkles } from 'lucide-react';

interface NewsViewProps {
  posts: Post[];
  onSelectPost: (p: Post) => void;
  onOpenNewPostModal?: () => void;
}

export const NewsView: React.FC<NewsViewProps> = ({ posts, onSelectPost, onOpenNewPostModal }) => {
  const { canPublish } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [filterQuery, setFilterQuery] = useState('');

  const categories = [
    'الكل',
    'أخبار المدرسة',
    'الأنشطة والابتكار',
    'الإنجازات والجوائز',
    'إعلانات وتنبيهات',
    'المسابقات المدرسية',
  ];

  const publishedPosts = posts.filter((p) => p.status === 'published');

  const filtered = publishedPosts.filter((post) => {
    const matchesCat = selectedCategory === 'الكل' || post.category === selectedCategory;
    const matchesText =
      post.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesCat && matchesText;
  });

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-900 to-teal-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg border border-emerald-700/40">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-6 h-6 text-amber-300" />
            <h1 className="text-xl sm:text-2xl font-bold font-serif">أخبار وفعاليات مدرسة صفية بنت عمر</h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
            متابعة شاملة لجميع الأخبار الرسمية، أنشطة الطالبات، المناسبات الوطنية والتربوية، وتوثيق المبادرات.
          </p>
        </div>

        {canPublish && onOpenNewPostModal && (
          <button
            onClick={onOpenNewPostModal}
            className="px-5 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-md transition-transform hover:scale-102 flex items-center gap-2 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            <span>نشر خبر جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search inside section */}
        <div className="relative min-w-[200px]">
          <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في هذا القسم..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Posts Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} onViewDetails={onSelectPost} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">لم يتم العثور على منشورات مطابقة</p>
          <p className="text-xs text-slate-400 mt-1">جرب تغيير التصنيف أو كلمات البحث.</p>
        </div>
      )}
    </div>
  );
};
