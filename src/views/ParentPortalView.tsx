import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../lib/dataStore';
import { getParentStudentRelationships } from '../lib/parentStudentService';
import {
  ParentStudentRelationship,
  UserProfile,
  Announcement,
  Post,
  SchoolEvent,
  Achievement,
} from '../types';
import {
  Users,
  GraduationCap,
  Bell,
  Newspaper,
  Calendar,
  Award,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  HeartHandshake,
  Info,
} from 'lucide-react';

interface ParentPortalViewProps {
  onNavigate?: (page: any) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [relationships, setRelationships] = useState<ParentStudentRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Content for tabs
  const [activeTab, setActiveTab] = useState<'announcements' | 'news' | 'events' | 'achievements'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<Post[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      if (user?.id) {
        try {
          const rels = await getParentStudentRelationships({
            parentId: user.id,
            activeOnly: true,
            currentUser: profile,
          });

          if (isMounted) {
            setRelationships(rels);
            if (rels.length > 0 && !selectedStudentId) {
              setSelectedStudentId(rels[0].student_user_id);
            }
          }
        } catch (e) {
          console.error('[ParentPortal] Error loading relationships:', e);
        }
      }

      // Load school media content
      if (isMounted) {
        const anns = await dataStore.getAnnouncements();
        setAnnouncements(anns.slice(0, 6));
        setNews(dataStore.getPosts().filter((p) => p.status === 'published').slice(0, 6));
        setEvents(dataStore.getEvents().slice(0, 6));
        setAchievements(dataStore.getAchievements().slice(0, 6));
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, profile]);

  const selectedStudentRel = relationships.find(
    (r) => r.student_user_id === selectedStudentId
  );

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-800/60">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>بوابة أولياء الأمور الرسمية</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              مرحباً بك، {profile?.name || 'ولي الأمر الكريم'}
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              نافذتكم المباشرة للاطلاع على إعلانات وفعاليات وإنجازات مدرسة صفية بنت عمر الثانوية ومتابعة المحتوى الإعلامي العام لبناتكم الطالبات.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] text-emerald-200 font-medium">عدد الطالبات المرتبطات</span>
              <span className="text-base sm:text-lg font-black text-white">
                {relationships.length} طالبة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Students Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">طالباتي في المدرسة</h2>
              <p className="text-xs text-slate-500">الطالبات المعتمد ارتباطهن رسمياً بحسابك من قبل إدارة المدرسة</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">جارٍ جلب بيانات الطالبات المرتبطات...</span>
          </div>
        ) : relationships.length === 0 ? (
          /* Empty state */
          <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">لا توجد طالبات مرتبطات بحسابك حتى الآن</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              يتم إنشاء وتوثيق روابط أولياء الأمور حصرياً من قِبل إدارة مدرسة صفية بنت عمر الثانوية. يُرجى مراجعة إدارة المدرسة أو إرسال استفسار عبر صفحة التواصل لربط حساب ابنتكم.
            </p>
            {onNavigate && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('parent_link')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  <HeartHandshake className="w-4 h-4 text-amber-300" />
                  <span>بدء ربط الطالبة الآن بواسطة رمز الربط</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <span>العودة للرئيسية</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Student Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relationships.map((rel) => {
              const student = rel.student;
              const isSelected = selectedStudentId === rel.student_user_id;

              return (
                <div
                  key={rel.id}
                  onClick={() => setSelectedStudentId(rel.student_user_id)}
                  className={`p-5 rounded-3xl bg-white border-2 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-base flex items-center justify-center shadow-md border border-white shrink-0">
                        {student?.name ? student.name.charAt(0) : 'ط'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                          {student?.name || 'طالبة'}
                        </h3>
                        <span className="text-xs text-slate-500 block">
                          مدرسة صفية بنت عمر الثانوية
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>{rel.relationship_type === 'father' ? 'أب' : rel.relationship_type === 'mother' ? 'أم' : 'ولي أمر'}</span>
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>حساب نشط ومعتمد</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {student?.email || ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected Student Information & School Content Tabs */}
      {selectedStudentRel && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>المحتوى الإعلامي والتواصلي العام المعتمد</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                متابعة مدرسة صفية بنت عمر — {selectedStudentRel.student?.name}
              </h3>
            </div>

            {/* Content Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl self-start">
              <button
                type="button"
                onClick={() => setActiveTab('announcements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'announcements'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>الإعلانات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('news')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'news'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5 text-blue-500" />
                <span>الأخبار واليوميات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'events'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                <span>الفعاليات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('achievements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'achievements'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-rose-500" />
                <span>الإنجازات والتكريم</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div>
            {activeTab === 'announcements' && (
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">لا توجد إعلانات منشورة حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {announcements.map((a) => (
                      <div
                        key={a.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono">{a.date}</span>
                          {a.isImportant && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                              هام وعاجل
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{a.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{a.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'news' && (
              <div className="space-y-3">
                {news.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">لا توجد أخبار منشورة حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono">{item.date}</span>
                          <span className="text-emerald-700 font-bold">{item.category}</span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">لا توجد فعاليات مجدولة حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono">{ev.date} {ev.time ? `- ${ev.time}` : ''}</span>
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">
                            {ev.status === 'upcoming' ? 'قادمة' : 'مكتملة'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{ev.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-3">
                {achievements.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">لا توجد إنجازات مسجلة حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {achievements.map((ach) => (
                      <div
                        key={ach.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono">{ach.date}</span>
                          <span className="text-amber-600 font-bold">{ach.category || 'تكريم'}</span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{ach.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ach.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy & Non-Academic Notice */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="leading-relaxed">
              تذكير: منصة مدرسة صفية بنت عمر الثانوية هي واجهة إعلامية وتواصلية لتوثيق الفعاليات والإنجازات والإعلانات العامة، وليست منصة أكاديمية لرصد الدرجات أو الحضور.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
