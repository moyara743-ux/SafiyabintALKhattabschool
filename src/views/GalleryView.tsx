import React, { useState } from 'react';
import { SchoolPhoto, SchoolAlbum } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import {
  Image as ImageIcon,
  FolderPlus,
  Plus,
  Edit,
  Trash2,
  Calendar,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';

interface GalleryViewProps {
  photos: SchoolPhoto[];
  albums: SchoolAlbum[];
  onOpenUploadPhoto: () => void;
  onOpenCreateAlbum: () => void;
  onEditPhoto: (p: SchoolPhoto) => void;
  onEditAlbum: (a: SchoolAlbum) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  albums,
  onOpenUploadPhoto,
  onOpenCreateAlbum,
  onEditPhoto,
  onEditAlbum,
}) => {
  const { user, profile, hasPerm } = useAuth();
  const [activeTab, setActiveTab] = useState<'photos' | 'albums'>('photos');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [activePhoto, setActivePhoto] = useState<SchoolPhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreatePhoto = hasPerm('createPhotos');
  const canEditPhoto = hasPerm('editPhotos');
  const canDeletePhoto = hasPerm('deletePhotos');

  const canCreateAlbum = hasPerm('createAlbums');
  const canEditAlbum = hasPerm('editAlbums');
  const canDeleteAlbum = hasPerm('deleteAlbums');

  const filteredPhotos = photos.filter((p) => {
    if (selectedAlbumId === 'all') return true;
    return p.albumId === selectedAlbumId;
  });

  const handleDeletePhoto = async (pic: SchoolPhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`هل أنتِ متأكدة من حذف هذه الصورة؟`)) return;
    if (!user || !profile) return;

    setDeletingId(pic.id);
    try {
      await dataStore.deletePhoto(pic.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'photos',
        entityId: pic.id,
        oldValue: pic.title,
        details: `حذف صورة: ${pic.title}`,
      });
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('حدث خطأ أثناء حذف الصورة');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAlbum = async (album: SchoolAlbum) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف الألبوم "${album.name}"؟`)) return;
    if (!user || !profile) return;

    try {
      await dataStore.deleteAlbum(album.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'albums',
        entityId: album.id,
        oldValue: album.name,
        details: `حذف ألبوم: ${album.name}`,
      });
    } catch (err) {
      console.error('Error deleting album:', err);
      alert('حدث خطأ أثناء حذف الألبوم');
    }
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Banner */}
      <div className="bg-gradient-to-l from-blue-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-blue-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              معرض مدرسة صفية بنت عمر المصور
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            أرشيف بصري رقمي يوثق أنشطة الفصول، التجارب العلمية، المعارض المدرسية، وحفلات التخرج والتكريم.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {canCreatePhoto && (
            <button
              onClick={onOpenUploadPhoto}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>رفع صورة</span>
            </button>
          )}

          {canCreateAlbum && (
            <button
              onClick={onOpenCreateAlbum}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>إنشاء ألبوم</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>جميع الصور</span>
          </button>

          <button
            onClick={() => setActiveTab('albums')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'albums'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الألبومات المنظمة</span>
          </button>
        </div>

        {activeTab === 'photos' && albums.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">تصفية حسب الألبوم:</span>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">كل الألبومات</option>
              {albums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: PHOTOS GRID */}
      {activeTab === 'photos' && (
        <>
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePhoto(photo)}
                  className="group relative h-56 rounded-3xl overflow-hidden shadow-md border border-slate-800 cursor-pointer bg-slate-800"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || 'صورة مدرسية'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent p-4 flex flex-col justify-end text-white">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      {photo.albumName ? (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/30">
                          {photo.albumName}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md">
                          عام
                        </span>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditPhoto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPhoto(photo);
                            }}
                            className="p-1 bg-slate-900/80 hover:bg-blue-600 text-white rounded-lg text-xs"
                            title="تعديل الصورة"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                        {canDeletePhoto && (
                          <button
                            onClick={(e) => handleDeletePhoto(photo, e)}
                            disabled={deletingId === photo.id}
                            className="p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg text-xs"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold leading-snug line-clamp-1">{photo.title}</h4>
                    {photo.date && (
                      <span className="text-[10px] text-slate-400 mt-0.5">{photo.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-300">لا توجد صور في هذا العرض</p>
              <p className="text-xs text-slate-500">
                اضغطي على "رفع صورة" لإضافة صور جديدة للمعرض المدرسي.
              </p>
            </div>
          )}
        </>
      )}

      {/* TAB 2: ALBUMS GRID */}
      {activeTab === 'albums' && (
        <>
          {albums.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {albums.map((album) => {
                const albumPhotoCount = photos.filter((p) => p.albumId === album.id).length;
                return (
                  <div
                    key={album.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-indigo-500/40 transition-all"
                  >
                    <div
                      className="h-44 w-full bg-slate-800 overflow-hidden relative cursor-pointer"
                      onClick={() => {
                        setSelectedAlbumId(album.id);
                        setActiveTab('photos');
                      }}
                    >
                      <img
                        src={album.coverImage}
                        alt={album.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm">
                          {albumPhotoCount} صورة
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{album.date}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {canEditAlbum && (
                            <button
                              onClick={() => onEditAlbum(album)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="تعديل الألبوم"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteAlbum && (
                            <button
                              onClick={() => handleDeleteAlbum(album)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="حذف الألبوم"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3
                        onClick={() => {
                          setSelectedAlbumId(album.id);
                          setActiveTab('photos');
                        }}
                        className="text-sm font-extrabold text-white cursor-pointer hover:text-indigo-400 transition-colors"
                      >
                        {album.name}
                      </h3>
                      {album.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {album.description}
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <button
                        onClick={() => {
                          setSelectedAlbumId(album.id);
                          setActiveTab('photos');
                        }}
                        className="text-indigo-400 hover:underline font-bold"
                      >
                        استعراض صور الألبوم ←
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
              <FolderPlus className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-300">لا توجد ألبومات مخصصة بعد</p>
              <p className="text-xs text-slate-500">
                يمكنك تنظيم الصور بإنشاء ألبومات للمناسبات وحفلات التخرج والمعارض.
              </p>
            </div>
          )}
        </>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          dir="rtl"
        >
          <div className="relative max-w-4xl w-full bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="p-6 bg-slate-900 space-y-2">
              <div className="flex items-center gap-2">
                {activePhoto.albumName && (
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {activePhoto.albumName}
                  </span>
                )}
                <span className="text-xs text-slate-400">{activePhoto.date}</span>
              </div>
              <h3 className="text-base font-bold text-white">{activePhoto.title}</h3>
              {activePhoto.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activePhoto.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
