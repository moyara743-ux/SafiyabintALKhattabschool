import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActivityLog } from '../types';
import { supabase } from '../supabaseClient';
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  Lock,
  User,
} from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { hasPerm, isOwner } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const canView = hasPerm('viewActivityLogs') || isOwner;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const localLogs: ActivityLog[] = JSON.parse(
        localStorage.getItem('safiah_activity_logs') || '[]'
      );

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        const remoteLogs: ActivityLog[] = data.map((d: any) => ({
          id: d.id,
          actorId: d.actor_id || 'system',
          actorName: 'مستخدم',
          actorEmail: '',
          action: d.action || 'UPDATE',
          entity: d.entity || 'general',
          entityId: d.entity_id || '',
          timestamp: d.created_at || new Date().toISOString(),
        }));
        setLogs([...localLogs, ...remoteLogs]);
      } else {
        setLogs(localLogs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      loadLogs();
    }
  }, [canView]);

  if (!canView) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-rose-800 rounded-3xl max-w-lg mx-auto space-y-3" dir="rtl">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">غير مصرح لك بالدخول</h2>
        <p className="text-xs text-slate-400">سجل العمليات مقتصر على إدارة المدرسة والمالك.</p>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;
    const matchesSearch =
      (log.actorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesEntity && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">إنشاء</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">تعديل</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">حذف</span>;
      case 'UPDATE_ROLE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">تغيير رتبة</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">سجل العمليات والرقابة (Audit Trail)</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            توثيق غير قابل للتعديل لجميع العمليات الإدارية (إنشاء، تعديل، حذف، تغيير رتب) لضمان النزاهة والشفافية.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="البحث بالاسم أو التفاصيل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">كل أنواع العمليات</option>
            <option value="CREATE">إنشاء (CREATE)</option>
            <option value="UPDATE">تعديل (UPDATE)</option>
            <option value="DELETE">حذف (DELETE)</option>
            <option value="UPDATE_ROLE">تغيير رتبة (UPDATE_ROLE)</option>
          </select>
        </div>

        <div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">كل الأقسام</option>
            <option value="posts">الأخبار والمنشورات</option>
            <option value="announcements">الإعلانات</option>
            <option value="events">الفعاليات</option>
            <option value="achievements">الإنجازات</option>
            <option value="photos">الصور</option>
            <option value="albums">الألبومات</option>
            <option value="dailyMessages">الرسالة اليومية</option>
            <option value="users">المستخدمين</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">جارٍ جلب سجل العمليات...</div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">الوقت والتاريخ</th>
                  <th className="p-4">المنفّذ</th>
                  <th className="p-4">نوع العملية</th>
                  <th className="p-4">القسم</th>
                  <th className="p-4">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{log.actorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">{log.actorEmail}</span>
                    </td>

                    <td className="p-4">{getActionBadge(log.action)}</td>

                    <td className="p-4 font-mono text-[11px] text-slate-400">{log.entity}</td>

                    <td className="p-4">
                      <span className="text-white font-medium">{log.details}</span>
                      {(log.oldValue || log.newValue) && (
                        <div className="text-[10px] text-slate-400 mt-0.5 space-x-2 space-x-reverse font-mono">
                          {log.oldValue && <span className="text-rose-400/90">السابق: {log.oldValue}</span>}
                          {log.newValue && <span className="text-emerald-400/90">الجديد: {log.newValue}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            لا توجد سجلات تطابق عوامل التصفية الحالية.
          </div>
        )}
      </div>
    </div>
  );
};
