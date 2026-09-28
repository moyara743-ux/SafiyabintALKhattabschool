import React, { useState } from 'react';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { logActivity } from '../lib/activityLogger';
import {
  Heart,
  Calendar,
  User,
  Share2,
  Pin,
  MoreVertical,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  Award,
  Sun,
  Bell,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onViewDetails?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onViewDetails }) => {
  const { user, profile, isOwner, hasPerm } = useAuth();
  const [likes, setLikes] = useState(post.likesCount || 0);
  const [isLiked, setIsLiked] = useState(user ? post.likedBy?.includes(user.uid) : false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = isOwner || (user && post.authorId === user.uid) || hasPerm('editPosts');
  const canDelete = isOwner || (user && post.authorId === user.uid) || hasPerm('deletePosts');

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const newLikedState = !isLiked;
      const newLikesCount = newLikedState ? likes + 1 : Math.max(0, likes - 1);
      const newLikedBy = newLikedState
        ? [...(post.likedBy || []), user.uid]
        : (post.likedBy || []).filter((id) => id !== user.uid);

      setIsLiked(newLikedState);
      setLikes(newLikesCount);

      if (newLikedState) {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#059669', '#10b981', '#f59e0b'],
        });
      }

      await dataStore.updatePost(post.id, {
        likesCount: newLikesCount,
        likedBy: newLikedBy,
      });
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`هل أنت متأكد من حذف المنشور "${post.title}"؟`)) return;
    if (!user || !profile) return;

    try {
      setDeleting(true);
      await dataStore.deletePost(post.id);

      await logActivity({
        actorId: user.id || user.uid,
        actorName: profile.name,
        actorEmail: user.email || '',
        action: 'DELETE',
        entity: 'posts',
        entityId: post.id,
        oldValue: post.title,
        details: `حذف المنشور: "${post.title}"`,
      });
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('حدث خطأ أثناء الحذف أو ليس لديك الصلاحية الكافية.');
    } finally {
      setDeleting(false);
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'today_summary':
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'achievement':
        return <Award className="w-3.5 h-3.5 text-purple-400" />;
      case 'announcement':
        return <Bell className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'today_summary':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'achievement':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      case 'announcement':
        return 'bg-rose-50 text-rose-900 border-rose-300';
      default:
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'today_summary':
        return 'ماذا حدث اليوم؟';
      case 'achievement':
        return 'إنجاز وتكريم';
      case 'announcement':
        return 'إعلان رسمي';
      default:
        return 'خبر مدرسي';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <article
      onClick={() => onViewDetails?.(post)}
      className="group relative bg-white rounded-3xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
      dir="rtl"
    >
      {/* Pinned indicator banner */}
      {post.isPinned && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white px-4 py-1.5 text-[11px] font-black flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>منشور مثبت في واجهة المدرسة</span>
          </div>
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Post Cover Image if exists */}
      {post.images && post.images.length > 0 && (
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80" />

          {/* Type Tag Badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md bg-white/90 text-slate-800 border-slate-200 shadow-sm">
            {getTypeIcon(post.type)}
            <span>{getTypeLabel(post.type)}</span>
          </div>
        </div>
      )}

      {/* Post Body Content */}
      <div className="p-5 sm:p-6 lg:p-7 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Header Metadata and Action Menu */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${getTypeBadge(post.type)}`}>
                {post.category || 'عام'}
              </span>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(post.date || post.createdAt)}</span>
              </span>
            </div>

            {/* Menu Dropdown for Edit / Delete */}
            {(canEdit || canDelete) && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {dropdownOpen && (
                  <div
                    onMouseLeave={() => setDropdownOpen(false)}
                    className="absolute left-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-20"
                  >
                    {canEdit && onEdit && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onEdit(post);
                        }}
                        className="w-full px-3 py-1.5 text-right text-xs sm:text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تعديل</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full px-3 py-1.5 text-right text-xs sm:text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{deleting ? 'جارٍ الحذف...' : 'حذف'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title - Deep Emerald Green */}
          <h3 className="text-base sm:text-lg lg:text-xl font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
            {post.title}
          </h3>

          {/* Snippet */}
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 line-clamp-3 leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Footer info: Author & Like / Views */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-[10px] sm:text-xs border border-slate-200">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-700">
              {post.authorName || 'إدارة المدرسة'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Likes button */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1 text-xs sm:text-sm transition-colors p-1 rounded-lg ${
                isLiked
                  ? 'text-rose-600 font-bold'
                  : 'text-slate-400 hover:text-rose-600'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-[11px] sm:text-xs font-mono">{likes}</span>
            </button>

            {/* Share link button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.share) {
                  navigator.share({ title: post.title, text: post.content, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('تم نسخ رابط الصفحة');
                }
              }}
              className="text-slate-400 hover:text-emerald-700 transition-colors p-1"
              title="مشاركة"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
