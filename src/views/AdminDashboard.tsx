import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../types';
import { dataStore } from '../lib/dataStore';
import { supabase } from '../supabaseClient';
import {
  LayoutDashboard,
  Users,
  Shield,
  FileSpreadsheet,
  Bell,
  BookOpen,
  Calendar,
  Award,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: PageView) => void;
  onOpenCreatePost: () => void;
  onOpenCreateAnnouncement: () => void;
  onOpenAddEvent: () => void;
  onOpenAddAchievement: () => void;
  onOpenAddPhoto: () => void;
  onOpenCreateAlbum: () => void;
  onOpenDailyMessageModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenCreatePost,
  onOpenCreateAnnouncement,
  onOpenAddEvent,
  onOpenAddAchievement,
  onOpenAddPhoto,
  onOpenCreateAlbum,
  onOpenDailyMessageModal,
}) => {
  const { user, profile, hasPerm, isOwner } = useAuth();
  const [counts, setCounts] = useState({
    posts: 0,
    announcements: 0,
    events: 0,
    achievements: 0,
    photos: 0,
    users: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess =
    hasPerm('accessAdminDashboard') ||
    hasPerm('manageUsers') ||
    hasPerm('viewActivityLogs') ||
    isOwner;

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const posts = dataStore.getPosts();
        const ann = await dataStore.getAnnouncements();
        const events = dataStore.getEvents();
        const ach = dataStore.getAchievements();
        const photos = dataStore.getPhotos();
        const users = await dataStore.getUsers();

        setCounts({
          posts: posts.length,
          announcements: ann.length,
          events: events.length,
          achievements: ach.length,
          photos: photos.length,
          users: users.length,
        });

        const localLogs: any[] = JSON.parse(
          localStorage.getItem('safiah_activity_logs') || '[]'
        );
        setRecentLogs(localLogs.slice(0, 5));
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (canAccess) {
      fetchStats();
    }
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-rose-800 rounded-3xl max-w-lg mx-auto space-y-3" dir="rtl">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">غير مصرح لك بالدخول</h2>
        <p className="text-xs text-slate-400">لوحة التحكم مقتصرة على إدارة المدرسة والمعلمات المصرح لهن.</p>
      </div>
    );
  }

  const statCards = [
    { title: 'الأخبار والمنشورات', count: counts.posts, icon: BookOpen, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30', view: 'news' as PageView },
    { title: 'الإعلانات والتعاميم', count: counts.announcements, icon: Bell, color: 'text-rose-400 bg-rose-950/60 border-rose-500/30', view: 'announcements' as PageView },
    { title: 'الفعاليات المجدولة', count: counts.events, icon: Calendar, color: 'text-teal-400 bg-teal-950/60 border-teal-500/30', view: 'events' as PageView },
    { title: 'الإنجازات والجوائز', count: counts.achievements, icon: Award, color: 'text-purple-400 bg-purple-950/60 border-purple-500/30', view: 'achievements' as PageView },
    { title: 'الصور بالمعرض', count: counts.photos, icon: ImageIcon, color: 'text-blue-400 bg-blue-950/60 border-blue-500/30', view: 'gallery' as PageView },
    { title: 'المستخدمين والمنسوبين', count: counts.users, icon: Users, color: 'text-amber-400 bg-amber-950/60 border-amber-500/30', view: 'users_management' as PageView },
  ];

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              لوحة الإدارة والتحكم المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            مرحباً بكِ، {profile?.name} ({profile?.school_role}). مركز المتابعة الميداني لإدارة محتوى منصة مدرسة صفية بنت عمر.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {hasPerm('manageUsers') && (
            <button
              onClick={() => onNavigate('users_management')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <Users className="w-4 h-4" />
              <span>إدارة الرتب والمستخدمين</span>
            </button>
          )}

          {hasPerm('viewActivityLogs') && (
            <button
              onClick={() => onNavigate('activity_logs')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>سجل العمليات</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Publishing Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>إجراءات الإضافة السريعة لمحتوى المنصة</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {hasPerm('createPosts') && (
            <button
              onClick={onOpenCreatePost}
              className="p-3 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-2xl text-center space-y-1 text-emerald-300 transition-all"
            >
              <BookOpen className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">خبر جديد</span>
            </button>
          )}

          {hasPerm('createAnnouncements') && (
            <button
              onClick={onOpenCreateAnnouncement}
              className="p-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 rounded-2xl text-center space-y-1 text-rose-300 transition-all"
            >
              <Bell className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">إعلان هام</span>
            </button>
          )}

          {hasPerm('createEvents') && (
            <button
              onClick={onOpenAddEvent}
              className="p-3 bg-teal-950/50 hover:bg-teal-900/60 border border-teal-500/30 rounded-2xl text-center space-y-1 text-teal-300 transition-all"
            >
              <Calendar className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">فعالية</span>
            </button>
          )}

          {hasPerm('createAchievements') && (
            <button
              onClick={onOpenAddAchievement}
              className="p-3 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 rounded-2xl text-center space-y-1 text-purple-300 transition-all"
            >
              <Award className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">إنجاز</span>
            </button>
          )}

          {hasPerm('createPhotos') && (
            <button
              onClick={onOpenAddPhoto}
              className="p-3 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/30 rounded-2xl text-center space-y-1 text-blue-300 transition-all"
            >
              <ImageIcon className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">رفع صورة</span>
            </button>
          )}

          {hasPerm('createAlbums') && (
            <button
              onClick={onOpenCreateAlbum}
              className="p-3 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-2xl text-center space-y-1 text-indigo-300 transition-all"
            >
              <ImageIcon className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">ألبوم صور</span>
            </button>
          )}

          {hasPerm('createDailyMessage') && (
            <button
              onClick={onOpenDailyMessageModal}
              className="p-3 bg-orange-950/50 hover:bg-orange-900/60 border border-orange-500/30 rounded-2xl text-center space-y-1 text-orange-300 transition-all"
            >
              <MessageSquare className="w-5 h-5 mx-auto" />
              <span className="block text-xs font-bold">رسالة اليوم</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(c.view)}
              className={`p-5 rounded-2xl border ${c.color} shadow-md cursor-pointer hover:scale-102 transition-all flex flex-col justify-between space-y-3`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5" />
                <span className="text-2xl font-extrabold font-serif">{c.count}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{c.title}</h4>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                  <span>إدارة القسم</span>
                  <ArrowLeft className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Log Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">آخر العمليات والتعديلات المسجلة</h3>
          </div>
          {hasPerm('viewActivityLogs') && (
            <button
              onClick={() => onNavigate('activity_logs')}
              className="text-xs font-bold text-emerald-400 hover:underline"
            >
              عرض السجل الكامل
            </button>
          )}
        </div>

        {recentLogs.length > 0 ? (
          <div className="divide-y divide-slate-800 text-xs">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-white">{log.details}</p>
                  <p className="text-[11px] text-slate-400">
                    بواسطة: {log.actorName} ({log.actorEmail}) • قسم: {log.entity}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">لا توجد عمليات مسجلة حديثاً.</p>
        )}
      </div>
    </div>
  );
};
