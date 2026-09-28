import React, { useState } from 'react';
import { Achievement } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import {
  Award,
  Trophy,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';

interface AchievementsViewProps {
  achievements: Achievement[];
  onOpenCreateModal: () => void;
  onEditAchievement: (ach: Achievement) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  achievements,
  onOpenCreateModal,
  onEditAchievement,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = hasPerm('createAchievements');
  const canEdit = hasPerm('editAchievements');
  const canDelete = hasPerm('deleteAchievements');

  const categories = [
    'الكل',
    'تفوق طالبات',
    'تميز معلمات',
    'جوائز المدرسة',
    'مسابقات وزارية',
    'مبادرات مجتمعية',
  ];

  const filtered = achievements.filter((ach) => {
    const matchesCategory = selectedCategory === 'الكل' || ach.category === selectedCategory;
    const matchesSearch =
      ach.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ach.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (ach: Achievement) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف الإنجاز "${ach.title}"؟`)) {
      return;
    }
    if (!user || !profile) return;

    setDeletingId(ach.id);
    try {
      await dataStore.deleteAchievement(ach.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'achievements',
        entityId: ach.id,
        oldValue: ach.title,
        details: `حذف إنجاز: ${ach.title}`,
      });
    } catch (err) {
      console.error('Error deleting achievement:', err);
      alert('حدث خطأ أثناء حذف الإنجاز');
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
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              لوحة الشرف والإنجازات المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed font-normal">
            توثيق إنجازات وجوائز طالبات ومعلمات مدرسة صفية بنت عمر، والتكريم في المحافل والمنافسات المحلية والوطنية.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md border border-amber-300 self-start md:self-auto transition-transform hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-950" />
            <span>توثيق إنجاز جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-slate-900">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث في الإنجازات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ach) => (
            <div
              key={ach.id}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-amber-400/80 hover:shadow-md transition-all group"
            >
              {ach.image && (
                <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                  <img src={ach.image} alt={ach.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-sm">
                      {ach.category || 'إنجاز'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{ach.date}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => onEditAchievement(ach)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="تعديل الإنجاز"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(ach)}
                        disabled={deletingId === ach.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الإنجاز"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">{ach.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-4">
                  {ach.description}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-amber-700 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>تكريم معتمد</span>
                </span>
                <span>بواسطة: <strong className="text-slate-700">{ach.authorName || 'إدارة المدرسة'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500 space-y-2">
          <Award className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">لا توجد إنجازات مسجلة في هذا التصنيف</p>
          <p className="text-xs text-slate-400">
            يمكنك توثيق إنجازات وتكريمات الطالبات والمعلمات وإضافتها بكل سهولة.
          </p>
        </div>
      )}
    </div>
  );
};
