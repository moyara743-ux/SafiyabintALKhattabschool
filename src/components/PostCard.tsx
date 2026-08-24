import React, { useState } from 'react';
import { Post, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Heart,
  Calendar,
  User,
  Tag,
  Share2,
  Pin,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  Clock,
  Sparkles,
  Award,
  Sun,
  Bell
} from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onViewDetails?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onViewDetails }) => {
  const { user, profile, isOwner, isAdmin } = useAuth();
  const [likes, setLikes] = useState(post.likesCount || 0);
  const [isLiked, setIsLiked] = useState(user ? post.likedBy?.includes(user.uid) : false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEditOrDelete =
    isOwner ||
    (user && post.authorId === user.uid) ||
    isAdmin;

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

      await updateDoc(doc(db, 'posts', post.id), {
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

    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'posts', post.id));

      if (user && profile) {
        await addDoc(collection(db, 'activityLogs'), {
          action: 'حذف منشور',
          details: `تم حذف المنشور "${post.title}" بواسطة ${profile.displayName}`,
          userId: user.uid,
          userName: profile.displayName,
          userEmail: user.email,
          targetId: post.id,
          targetType: 'post',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
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
        return <Sun className="w-3.5 h-3.5 text-amber-600" />;
      case 'achievement':
        return <Award className="w-3.5 h-3.5 text-purple-600" />;
      case 'announcement':
        return <Bell className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'today_summary':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'achievement':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'announcement':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
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

  if (deleting) return null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        post.isPinned
          ? 'border-amber-300 shadow-md ring-1 ring-amber-300/60'
          : 'border-slate-200 hover:border-emerald-300 hover:shadow-lg'
      }`}
      dir="rtl"
    >
      {/* Top Banner / Image */}
      <div>
        {post.images && post.images.length > 0 ? (
          <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onViewDetails?.(post)}>
            <img
              src={post.images[0]}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            {post.images.length > 1 && (
              <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                +{post.images.length - 1} صور إضافية
              </span>
            )}
            {post.isPinned && (
              <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-md">
                <Pin className="w-3 h-3" />
                <span>مثبت</span>
              </div>
            )}
          </div>
        ) : (
          post.isPinned && (
            <div className="p-3 bg-amber-50/80 border-b border-amber-200/60 flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Pin className="w-3.5 h-3.5 text-amber-700" />
              <span>منشور مثبت في مقدمة الأخبار</span>
            </div>
          )
        )}

        {/* Content Section */}
        <div className="p-5">
          {/* Metadata Row */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${getTypeBadge(post.type)}`}>
                {getTypeIcon(post.type)}
                <span>{post.category}</span>
              </span>

              {post.status === 'pending_review' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  قيد المراجعة
                </span>
              )}
            </div>

            {/* Dropdown Options */}
            {canEditOrDelete && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(!dropdownOpen);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {dropdownOpen && (
                  <div
                    onMouseLeave={() => setDropdownOpen(false)}
                    className="absolute left-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-20 text-xs"
                  >
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(false);
                          onEdit(post);
                        }}
                        className="w-full px-3 py-1.5 text-right text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تعديل</span>
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-1.5 text-right text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onViewDetails?.(post)}
            className="text-base font-extrabold text-slate-900 hover:text-emerald-800 transition-colors leading-snug line-clamp-2 cursor-pointer mb-2"
          >
            {post.title}
          </h3>

          {/* Body Preview */}
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
            {post.content}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-[10px]">
            {post.authorName?.[0] || 'م'}
          </div>
          <div>
            <span className="font-semibold text-slate-800 block text-[11px]">
              {post.authorName}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {formatDate(post.createdAt)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isLiked
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'text-slate-500 hover:bg-slate-200/60'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{likes}</span>
          </button>

          <button
            onClick={() => onViewDetails?.(post)}
            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg transition-colors"
          >
            قراءة المزيد
          </button>
        </div>
      </div>
    </motion.article>
  );
};
