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
      <div className="bg-gradient-to-l from-purple-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-purple-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              لوحة الشرف والإنجازات المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            توثيق إنجازات وجوائز طالبات ومعلمات مدرسة صفية بنت عمر، والتكريم في المحافل والمنافسات المحلية والوطنية.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50 self-start md:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>توثيق إنجاز جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="البحث في الإنجازات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ach) => (
            <div
              key={ach.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-purple-500/40 transition-all"
            >
              {ach.image && (
                <div className="h-44 w-full bg-slate-800 overflow-hidden relative">
                  <img src={ach.image} alt={ach.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                      {ach.category || 'إنجاز'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>{ach.date}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => onEditAchievement(ach)}
                        className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="تعديل الإنجاز"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(ach)}
                        disabled={deletingId === ach.id}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="حذف الإنجاز"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-white leading-snug">{ach.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
                  {ach.description}
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تكريم معتمد</span>
                </span>
                <span>بواسطة: {ach.authorName || 'إدارة المدرسة'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <Award className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-300">لا توجد إنجازات مسجلة في هذا التصنيف</p>
          <p className="text-xs text-slate-500">
            يمكنك توثيق إنجازات وتكريمات الطالبات والمعلمات وإضافتها بكل سهولة.
          </p>
        </div>
      )}
    </div>
  );
};
