import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageView, SchoolRole } from '../types';
import { ROLE_LABELS_AR } from '../lib/permissions';
import {
  GraduationCap,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Sparkles,
  BookOpen,
  Calendar,
  Image as ImageIcon,
  Award,
  Home,
  Sun,
  Bell,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Activity,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewPostModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  onOpenNewPostModal,
}) => {
  const { user, profile, logout, isOwner, isDirector, roleLabel, hasPerm } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getRoleBadgeStyle = (role?: SchoolRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
      case 'director':
        return 'bg-purple-500/20 text-purple-200 border-purple-400/40';
      case 'supervisor':
        return 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40';
      case 'administrator':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/40';
      case 'counselor':
        return 'bg-teal-500/20 text-teal-200 border-teal-400/40';
      case 'teacher':
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';
      case 'student':
        return 'bg-slate-500/20 text-slate-300 border-slate-600/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-600/40';
    }
  };

  const navLinks: { view: PageView; label: string; icon: any }[] = [
    { view: 'home', label: 'الرئيسية', icon: Home },
    { view: 'announcements', label: 'الإعلانات', icon: Bell },
    { view: 'news', label: 'الأخبار والمنشورات', icon: BookOpen },
    { view: 'today', label: 'ماذا حدث اليوم؟', icon: Sun },
    { view: 'events', label: 'الفعاليات', icon: Calendar },
    { view: 'achievements', label: 'الإنجازات', icon: Award },
    { view: 'gallery', label: 'الصور والألبومات', icon: ImageIcon },
    { view: 'daily_message', label: 'الرسالة اليومية', icon: MessageSquare },
  ];

  const canAccessAdmin = hasPerm('manageUsers') || isOwner || isDirector || hasPerm('viewActivityLog') || hasPerm('manageSiteSettings');

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-lg" dir="rtl">
      {/* Top Banner with Motto & School Identity */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 border-b border-emerald-800/40 text-[11px] py-1.5 px-4 sm:px-8 text-emerald-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold text-emerald-100">مدرسة صفية بنت عمر</span>
            <span className="text-emerald-400/60 hidden sm:inline">|</span>
            <span className="text-emerald-300/80 hidden sm:inline">"نصنع المعرفة... ونوثق الإنجاز"</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {profile && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getRoleBadgeStyle(profile.school_role)}`}>
                {roleLabel}
              </span>
            )}
            <span className="text-emerald-300/80 hidden md:inline">المنصة المدرسية الرسمية المعتمدة</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & School Name */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                مدرسة صفية بنت عمر
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">بوابة الإعلام والتوثيق والأنشطة</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = currentView === link.view;
              return (
                <button
                  key={link.view}
                  onClick={() => onNavigate(link.view)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600/40 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search */}
            <div className="relative hidden md:block">
              <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input
                  type="text"
                  placeholder="ابحث في الأخبار والفعاليات..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-32 lg:w-44"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="text-slate-400 hover:text-white text-xs mr-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Admin Dashboard shortcut for authorized users */}
            {canAccessAdmin && (
              <button
                onClick={() => onNavigate('admin_dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  currentView === 'admin_dashboard'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">لوحة الإدارة</span>
                <span className="sm:hidden">الإدارة</span>
              </button>
            )}

            {/* User Profile / Auth State */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-all"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    {profile?.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-semibold text-white max-w-[100px] truncate">
                      {profile?.name || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-amber-300 font-medium">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    onMouseLeave={() => setUserDropdownOpen(false)}
                    className="absolute left-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/40">
                      <p className="text-xs font-bold text-white truncate">
                        {profile?.name || 'مستخدم'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getRoleBadgeStyle(profile?.school_role)}`}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-right text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>الملف الشخصي والصلاحيات</span>
                    </button>

                    {canAccessAdmin && (
                      <button
                        onClick={() => {
                          onNavigate('admin_dashboard');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-right text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 font-bold"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>لوحة الإدارة والإحصائيات</span>
                      </button>
                    )}

                    {hasPerm('manageUsers') && (
                      <button
                        onClick={() => {
                          onNavigate('users_management');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-right text-xs text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>إدارة المستخدمين والألقاب والصلاحيات</span>
                      </button>
                    )}

                    {hasPerm('viewActivityLog') && (
                      <button
                        onClick={() => {
                          onNavigate('activity_log');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-right text-xs text-sky-300 hover:bg-sky-500/10 flex items-center gap-2"
                      >
                        <Activity className="w-3.5 h-3.5 text-sky-400" />
                        <span>سجل النشاط والعمليات</span>
                      </button>
                    )}

                    {hasPerm('manageSiteSettings') && (
                      <button
                        onClick={() => {
                          onNavigate('site_settings');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-right text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>إعدادات ومعلومات المدرسة</span>
                      </button>
                    )}

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await logout();
                        onNavigate('home');
                      }}
                      className="w-full px-4 py-2 text-right text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-950/30 transition-all"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-block px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
                >
                  حساب جديد
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar in Header */}
        <div className="md:hidden pb-3 pt-1">
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="ابحث في الأخبار والفعاليات..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="text-slate-400 text-xs">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-slate-900/98 px-4 py-4 space-y-1 shadow-2xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = currentView === link.view;
            return (
              <button
                key={link.view}
                onClick={() => {
                  onNavigate(link.view);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-right ${
                  active
                    ? 'bg-emerald-800 text-emerald-100 border border-emerald-600/40'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
