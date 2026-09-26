import React, { useEffect } from 'react';
import { Announcement } from '../types';
import {
  X,
  Calendar,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Building,
  Maximize2,
  Share2,
} from 'lucide-react';

interface AnnouncementDetailsModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnnouncementDetailsModal: React.FC<AnnouncementDetailsModalProps> = ({
  announcement,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !announcement) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: announcement.title,
          text: announcement.content,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(
        `${announcement.title}\n\n${announcement.content}\n\n— مدرسة صفية بنت عمر الابتدائية`
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="relative bg-gradient-to-l from-rose-950/80 via-slate-900 to-slate-900 p-5 sm:p-6 border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {announcement.isImportant ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>هام وعاجل</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-400" />
                  <span>إعلان مدرسي رسمي</span>
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>معتمد</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="مشاركة الإعلان"
                aria-label="مشاركة الإعلان"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق النافذة"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white leading-relaxed tracking-tight">
            {announcement.title}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>تاريخ الإعلان: <strong>{formatDate(announcement.date)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-rose-400" />
              <span>الجهة الناشرة: <strong>{announcement.authorName || 'إدارة المدرسة'}</strong></span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[62vh]">
          {/* Announcement Image (if present) - shown clearly for all users without restrictions */}
          {announcement.image && (
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/70 shadow-lg relative group">
              <img
                src={announcement.image}
                alt={announcement.title}
                className="w-full max-h-[380px] object-contain mx-auto block"
                loading="lazy"
              />
              <a
                href={announcement.image}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                <span>عرض الصورة بالحجم الكامل</span>
              </a>
            </div>
          )}

          {/* Full Content Text */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800/80">
            <p className="text-slate-100 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal selection:bg-rose-500/30 selection:text-white">
              {announcement.content}
            </p>
          </div>
        </div>

        {/* Read-only Footer */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>مدرسة صفية بنت عمر الابتدائية</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailsModal;
