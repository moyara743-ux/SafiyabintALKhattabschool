import React, { useState } from 'react';
import { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import { AnnouncementDetailsModal } from '../components/AnnouncementDetailsModal';
import {
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ImageIcon,
  Eye,
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
  const { user, profile, hasPerm, isOwner } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'important'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected announcement for details view modal (Available to ALL users)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Announcement deletion confirmation modal state
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userRole = profile?.school_role || '';
  const isSystemOwner = isOwner || userRole === 'owner' || user?.email?.toLowerCase() === 'moyara743@gmail.com';
  const canCreate = hasPerm('createAnnouncements') || isSystemOwner;
  const canEdit = hasPerm('editAnnouncements') || isSystemOwner;
  const canDelete = hasPerm('deleteAnnouncements') || isSystemOwner;

  const filtered = announcements.filter((item) => {
    const matchesType = filterType === 'all' || item.isImportant;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleInitiateDelete = (item: Announcement) => {
    setDeleteError(null);
    setAnnouncementToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!announcementToDelete) return;
    if (!user || !profile) {
      setDeleteError('يجب تسجيل الدخول لتنفيذ هذا الإجراء.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await dataStore.deleteAnnouncement(announcementToDelete.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'announcements',
        entityId: announcementToDelete.id,
        oldValue: announcementToDelete.title,
        details: `حذف إعلان: ${announcementToDelete.title}`,
      });

      setAnnouncementToDelete(null);
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setDeleteError(err?.message || 'حدث خطأ أثناء حذف الإعلان من النظام.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 relative" dir="rtl">
      {/* 1. Details Modal (Read-Only, accessible to all users) */}
      <AnnouncementDetailsModal
        announcement={selectedAnnouncement}
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
      />

      {/* 2. Delete Confirmation Modal (Admin only) */}
      {announcementToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          dir="rtl"
          onClick={() => {
            if (!isDeleting) setAnnouncementToDelete(null);
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">تأكيد حذف الإعلان</h3>
                  <p className="text-xs text-slate-400 mt-0.5">لا يمكن التراجع عن هذا الإجراء</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) setAnnouncementToDelete(null);
                }}
                disabled={isDeleting}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-bold text-white">
                هل أنتِ متأكدة من حذف الإعلان: &quot;{announcementToDelete.title}&quot;؟
              </p>
              <p className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-800 line-clamp-2">
                {announcementToDelete.content}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الحذف...</span>
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
            التبليغات الرسمية الصادرة من إدارة المدرسة، مواعيد الاختبارات، التنبيهات المهمة، والتعاميم الوزارية. اضغطي على أي إعلان لعرض تفاصيله بالكامل والصور المرفقة.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 self-start md:self-auto transition-all cursor-pointer"
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
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            كل الإعلانات
          </button>
          <button
            type="button"
            onClick={() => setFilterType('important')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedAnnouncement(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedAnnouncement(item);
                }
              }}
              className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
                item.isImportant
                  ? 'bg-slate-900/95 border-rose-500/40 hover:border-rose-500/70 shadow-rose-950/20'
                  : 'bg-slate-900 border-slate-800 hover:border-rose-500/40'
              }`}
            >
              {/* Optional Preview Image Banner on Card */}
              {item.image && (
                <div className="h-44 w-full bg-slate-950 overflow-hidden relative border-b border-slate-800/80">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-white font-medium border border-white/10">
                    <ImageIcon className="w-3 h-3 text-rose-400" />
                    <span>مرفق صورة توضيحية</span>
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Card Header & Badges */}
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

                    {/* Action buttons (Edit & Delete) with strictly prevented event bubbling */}
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAnnouncement(item);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="تعديل الإعلان"
                          aria-label="تعديل الإعلان"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateDelete(item);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="حذف الإعلان"
                          aria-label="حذف الإعلان"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Preview Text */}
                  <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-rose-300 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-line">
                    {item.content}
                  </p>
                </div>

                {/* Click to read indicator */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>معتمد رسمياً</span>
                  </span>

                  <span className="text-rose-400 group-hover:text-rose-300 font-bold flex items-center gap-1 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض التفاصيل الكاملة</span>
                  </span>
                </div>
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

export default AnnouncementsView;
