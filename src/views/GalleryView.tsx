import React, { useState } from 'react';
import { GalleryPhoto } from '../types';
import { useAuth } from '../context/AuthContext';
import { Image as ImageIcon, PlusCircle, Filter, Sparkles, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GalleryViewProps {
  gallery: GalleryPhoto[];
  onOpenUploadModal?: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ gallery, onOpenUploadModal }) => {
  const { canUploadPhotos } = useAuth();
  const [selectedAlbum, setSelectedAlbum] = useState<string>('الكل');
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  const albums = [
    'الكل',
    'فعاليات المدرسة',
    'الأنشطة الطلابية',
    'الإنجازات والجوائز',
    'الاحتفالات',
    'المسابقات',
    'مناسبات المدرسة',
  ];

  const filtered = gallery.filter((p) => {
    if (selectedAlbum === 'الكل') return true;
    return p.album === selectedAlbum;
  });

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-amber-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-serif">معرض صور مدرسة صفية بنت عمر</h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
            ألبومات مصورة توثق نبض الفصول، المعامل، التكريمات، والاحتفالات المدرسية.
          </p>
        </div>

        {canUploadPhotos && onOpenUploadModal && (
          <button
            onClick={onOpenUploadModal}
            className="px-5 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-md transition-transform hover:scale-102 flex items-center gap-2 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            <span>إضافة صورة للألبوم</span>
          </button>
        )}
      </div>

      {/* Album Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {albums.map((alb) => (
          <button
            key={alb}
            onClick={() => setSelectedAlbum(alb)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedAlbum === alb
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {alb}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((photo) => (
          <motion.div
            key={photo.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setActivePhoto(photo)}
            className="group relative h-64 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 cursor-pointer bg-slate-100"
          >
            <img
              src={photo.imageUrl}
              alt={photo.title}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-white">
              <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30 self-start mb-1.5">
                {photo.album}
              </span>
              <h3 className="text-xs font-bold leading-snug">{photo.title}</h3>
              {photo.description && (
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-1">{photo.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
            >
              <button
                onClick={() => setActivePhoto(null)}
                className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={activePhoto.imageUrl}
                  alt={activePhoto.title}
                  className="max-h-[70vh] w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-6 bg-slate-900 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {activePhoto.album}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(activePhoto.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{activePhoto.title}</h3>
                {activePhoto.description && (
                  <p className="text-xs text-slate-300">{activePhoto.description}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
