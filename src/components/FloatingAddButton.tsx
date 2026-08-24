import React, { useState } from 'react';
import { Plus, X, FileText, Image as ImageIcon, Calendar, Award, Sun, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostType } from '../types';

interface FloatingAddButtonProps {
  onOpenCreatePost: (defaultType?: PostType) => void;
  onOpenAddEvent: () => void;
  onOpenAddPhoto: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onOpenCreatePost,
  onOpenAddEvent,
  onOpenAddPhoto,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'news',
      label: 'إضافة خبر أو إعلان',
      icon: FileText,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      onClick: () => {
        setIsOpen(false);
        onOpenCreatePost('news');
      },
    },
    {
      id: 'today',
      label: 'إضافة يوميات اليوم',
      icon: Sun,
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      onClick: () => {
        setIsOpen(false);
        onOpenCreatePost('today_summary');
      },
    },
    {
      id: 'achievement',
      label: 'إضافة إنجاز أو تكريم',
      icon: Award,
      color: 'bg-purple-600 hover:bg-purple-700 text-white',
      onClick: () => {
        setIsOpen(false);
        onOpenCreatePost('achievement');
      },
    },
    {
      id: 'event',
      label: 'إضافة فعالية جديدة',
      icon: Calendar,
      color: 'bg-teal-600 hover:bg-teal-700 text-white',
      onClick: () => {
        setIsOpen(false);
        onOpenAddEvent();
      },
    },
    {
      id: 'photo',
      label: 'رفع صورة لمعرض المدرسة',
      icon: ImageIcon,
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      onClick: () => {
        setIsOpen(false);
        onOpenAddPhoto();
      },
    },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start" dir="rtl">
      {/* Action Options Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className="mb-3 flex flex-col space-y-2 bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl"
          >
            <div className="px-2 py-1 text-[11px] font-bold text-amber-300 border-b border-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>إضافة محتوى جديد للموقع</span>
            </div>

            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${action.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-xl border border-emerald-400/40 transition-transform active:scale-95 group font-bold text-xs"
        aria-label="إضافة سريعة للموقع"
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-5 h-5" />
        </motion.div>
        <span className="hidden sm:inline">إضافة للموقع</span>
      </button>
    </div>
  );
};
