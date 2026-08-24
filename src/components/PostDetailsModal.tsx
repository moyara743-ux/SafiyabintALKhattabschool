import React from 'react';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, User, Tag, Heart, Share2, Pin, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PostDetailsModalProps {
  post: Post | null;
  onClose: () => void;
}

export const PostDetailsModal: React.FC<PostDetailsModalProps> = ({ post, onClose }) => {
  const { user } = useAuth();
  if (!post) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content.substring(0, 100),
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ رابط المنشور بنجاح!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header Ribbon */}
        <div className="relative bg-slate-900 text-white p-6 sm:p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {post.category}
              </span>
              {post.isPinned && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  منشور مثبت
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="relative z-10 text-xl sm:text-2xl font-extrabold font-serif leading-snug">
            {post.title}
          </h2>

          <div className="relative z-10 flex items-center gap-4 mt-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>الناشر: <strong>{post.authorName}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Post Content */}
          <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
            {post.content}
          </div>

          {/* Attached Images Gallery */}
          {post.images && post.images.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700">الصور والتوثيقات المرفقة:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {post.images.map((img, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                    <img
                      src={img}
                      alt={`${post.title} - ${i + 1}`}
                      className="w-full h-56 object-cover group-hover:scale-102 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>مشاركة المنشور</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};
