import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { hasAnyCreatePermission } from '../lib/permissions';
import {
  Plus,
  X,
  FileText,
  Calendar,
  Image as ImageIcon,
  Award,
  Bell,
  MessageSquare,
  FolderPlus,
} from 'lucide-react';

interface FloatingAddButtonProps {
  onOpenCreatePost: (type?: 'news' | 'today_summary') => void;
  onOpenCreateAnnouncement: () => void;
  onOpenAddEvent: () => void;
  onOpenAddAchievement: () => void;
  onOpenAddPhoto: () => void;
  onOpenCreateAlbum: () => void;
  onOpenDailyMessageModal: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onOpenCreatePost,
  onOpenCreateAnnouncement,
  onOpenAddEvent,
  onOpenAddAchievement,
  onOpenAddPhoto,
  onOpenCreateAlbum,
  onOpenDailyMessageModal,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Requirement 37:
  // 1. If not logged in -> DO NOT SHOW
  if (!user || !profile) return null;

  // 2. If has NO create permissions -> DO NOT SHOW
  if (!hasAnyCreatePermission(profile)) return null;

  // 3. Filter only the actions the user is authorized to perform
  const actions = [
    {
      id: 'announcement',
      label: 'إضافة إعلان جديد',
      icon: Bell,
      color: 'bg-rose-600 hover:bg-rose-700 text-white',
      allowed: hasPerm('createAnnouncements'),
      onClick: () => {
        setIsOpen(false);
        onOpenCreateAnnouncement();
      },
    },
    {
      id: 'news',
      label: 'إضافة خبر للمدرسة',
      icon: FileText,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      allowed: hasPerm('createPosts'),
      onClick: () => {
        setIsOpen(false);
        onOpenCreatePost('news');
      },
    },
    {
      id: 'today_summary',
      label: 'توثيق: ماذا حدث اليوم؟',
      icon: FileText,
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      allowed: hasPerm('createPosts'),
      onClick: () => {
        setIsOpen(false);
        onOpenCreatePost('today_summary');
      },
    },
    {
      id: 'event',
      label: 'إضافة فعالية بالتقويم',
      icon: Calendar,
      color: 'bg-teal-600 hover:bg-teal-700 text-white',
      allowed: hasPerm('createEvents'),
      onClick: () => {
        setIsOpen(false);
        onOpenAddEvent();
      },
    },
    {
      id: 'achievement',
      label: 'إضافة إنجاز أو تكريم',
      icon: Award,
      color: 'bg-purple-600 hover:bg-purple-700 text-white',
      allowed: hasPerm('createAchievements'),
      onClick: () => {
        setIsOpen(false);
        onOpenAddAchievement();
      },
    },
    {
      id: 'photo',
      label: 'رفع صورة جديدة',
      icon: ImageIcon,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      allowed: hasPerm('createPhotos'),
      onClick: () => {
        setIsOpen(false);
        onOpenAddPhoto();
      },
    },
    {
      id: 'album',
      label: 'إنشاء ألبوم صور',
      icon: FolderPlus,
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      allowed: hasPerm('createAlbums'),
      onClick: () => {
        setIsOpen(false);
        onOpenCreateAlbum();
      },
    },
    {
      id: 'daily_message',
      label: 'إضافة رسالة اليوم',
      icon: MessageSquare,
      color: 'bg-orange-600 hover:bg-orange-700 text-white',
      allowed: hasPerm('createDailyMessage'),
      onClick: () => {
        setIsOpen(false);
        onOpenDailyMessageModal();
      },
    },
  ].filter((a) => a.allowed);

  // If no action matched
  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start" dir="rtl">
      {/* Sub menu choices */}
      {isOpen && (
        <div className="mb-3 flex flex-col items-start gap-2 bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <p className="text-[11px] font-bold text-slate-400 px-2 pb-1 border-b border-slate-800 w-full text-right">
            العمليات المتاحة لصلاحياتك:
          </p>
          <div className="flex flex-col gap-1.5 w-full">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={act.onClick}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${act.color} text-right w-full`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full shadow-xl shadow-emerald-950/40 border border-emerald-400/30 transition-all transform hover:scale-105 active:scale-95"
        title="إضافة محتوى جديد"
      >
        {isOpen ? (
          <>
            <X className="w-5 h-5" />
            <span className="text-xs font-bold">إغلاق</span>
          </>
        ) : (
          <>
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="text-xs font-bold">+ إضافة</span>
          </>
        )}
      </button>
    </div>
  );
};
