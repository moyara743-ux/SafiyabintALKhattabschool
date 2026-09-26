import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageView, SchoolRole } from '../types';
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
}) => {
  const { user, profile, logout, isOwner, isDirector, roleLabel, hasPerm } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);

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

  const canAccessAdmin =
    hasPerm('manageUsers') || isOwner || isDirector || hasPerm('viewActivityLog') || hasPerm('manageSiteSettings');

  // Complete navigation links list
  const navLinks: { view: PageView; label: string; icon: any; adminOnly?: boolean }[] = [
    { view: 'home', label: 'الرئيسية', icon: Home },
    { view: 'announcements', label: 'الإعلانات', icon: Bell },
    { view: 'news', label: 'الأخبار والمنشورات', icon: BookOpen },
    { view: 'today', label: 'ماذا حدث اليوم؟', icon: Sun },
    { view: 'events', label: 'الفعاليات', icon: Calendar },
    { view: 'achievements', label: 'الإنجازات', icon: Award },
    { view: 'gallery', label: 'الصور والألبومات', icon: ImageIcon },
    { view: 'daily_message', label: 'الرسالة اليومية', icon: MessageSquare },
  ];

  if (canAccessAdmin) {
    navLinks.push({
      view: 'admin_dashboard',
      label: 'لوحة الإدارة والإحصائيات',
      icon: Shield,
      adminOnly: true,
    });
  }

  const handleLinkClick = (view: PageView) => {
    onNavigate(view);
    setDrawerOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-xl w-full max-w-full" dir="rtl">
      {/* 1. Top Identity & Motto Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 border-b border-emerald-800/40 text-[11px] sm:text-xs py-2 px-4 sm:px-6 lg:px-8 text-emerald-200 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full">
          {/* Official Tagline */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-bold text-emerald-100 truncate">المنصة المدرسية الرسمية المعتمدة</span>
            <span className="text-emerald-400/50 hidden md:inline">|</span>
            <span className="text-emerald-300/80 hidden md:inline italic truncate">"نصنع المعرفة... ونوثق الإنجاز"</span>
          </div>

          {/* User Role Badge & Status */}
          <div className="flex items-center gap-2.5 shrink-0">
            {profile && (
              <span className={`px-2.5 py-0.5 text-[11px] sm:text-xs font-bold rounded-lg border ${getRoleBadgeStyle(profile.school_role)}`}>
                {roleLabel}
              </span>
            )}
            <span className="text-emerald-300/70 text-[10px] sm:text-[11px] hidden sm:inline">
              بوابة إلكترونية موحدة
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Unified Navbar: Right Side (Logo + Name + Menu Button), Left Side (Search + User Info) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between min-h-[4.5rem] sm:min-h-[5rem] py-2.5 gap-3 sm:gap-4 w-full">
          
          {/* RIGHT SIDE (الجهة اليمنى): School Logo & School Name + Menu Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* School Logo & School Name */}
            <div
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/40 group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col justify-center text-right">
                <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-white group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                  مدرسة صفية بنت عمر
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block whitespace-nowrap mt-0.5">
                  بوابة الإعلام والتوثيق والأنشطة
                </p>
              </div>
            </div>

            {/* Menu Button (☰): Placed directly beside school logo/name with 10-12px gap, compact size matching search button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="min-w-[40px] min-h-[40px] p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group"
              aria-label="القائمة الرئيسية"
              title="فتح القائمة الرئيسية"
            >
              <Menu className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">
                القائمة
              </span>
            </button>
          </div>

          {/* LEFT SIDE (أقصى اليسار): Search Icon + User Info (Name and Role) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search Button */}
            <button
              onClick={() => setSearchBarOpen(!searchBarOpen)}
              className="min-w-[40px] min-h-[40px] p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="البحث في المنصة"
              aria-label="البحث"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline text-xs font-semibold text-slate-300">بحث</span>
            </button>

            {/* Desktop & Tablet User Chip (≥ 640px) */}
            {user ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 transition-all shadow-sm cursor-pointer text-right group"
                  aria-label="قائمة المستخدم"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0 group-hover:bg-emerald-600 transition-colors">
                    {profile?.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-white whitespace-nowrap">
                      {profile?.name || user.email?.split('@')[0]}
                    </span>
                    <span className="text-slate-400 font-normal">-</span>
                    <span className="text-amber-300 font-bold whitespace-nowrap">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu - anchored at left-0 to open inwards */}
                {userDropdownOpen && (
                  <div
                    onMouseLeave={() => setUserDropdownOpen(false)}
                    className="absolute left-0 mt-2.5 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in duration-150"
                  >
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50">
                      <p className="text-xs font-bold text-white truncate">
                        {profile?.name || 'مستخدم'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                      <div className="mt-2">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${getRoleBadgeStyle(profile?.school_role)}`}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-right text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>الملف الشخصي والصلاحيات</span>
                      </button>

                      {canAccessAdmin && (
                        <button
                          onClick={() => {
                            onNavigate('admin_dashboard');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-right text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-amber-400" />
                          <span>لوحة الإدارة والإحصائيات</span>
                        </button>
                      )}

                      {hasPerm('manageUsers') && (
                        <button
                          onClick={() => {
                            onNavigate('users_management');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-right text-xs text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-emerald-400" />
                          <span>إدارة المستخدمين والألقاب</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await logout();
                        onNavigate('home');
                      }}
                      className="w-full px-4 py-2.5 text-right text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="hidden sm:inline-flex px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>

        {/* Search Bar Row (When toggled open) */}
        {searchBarOpen && (
          <div className="pb-3 pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2">
              <Search className="w-4 h-4 text-emerald-400 ml-2 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="ابحث في الأخبار والفعاليات والأنشطة..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="text-slate-400 hover:text-white text-xs px-1.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Mobile Dedicated User Bar (< 640px) Under Header */}
      {user && (
        <div className="sm:hidden border-t border-slate-800/80 bg-slate-900/90 px-4 py-2">
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-right cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {profile?.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-xs font-bold text-white truncate">
                  <span>{profile?.name || user.email?.split('@')[0]}</span>
                  <span className="mx-1 text-slate-400 font-normal">-</span>
                  <span className="text-amber-300 font-bold">{roleLabel}</span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile User Dropdown Menu */}
            {userDropdownOpen && (
              <div
                className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/50">
                  <p className="text-xs font-bold text-white truncate">
                    {profile?.name || 'مستخدم'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-right text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>الملف الشخصي والصلاحيات</span>
                  </button>

                  {canAccessAdmin && (
                    <button
                      onClick={() => {
                        onNavigate('admin_dashboard');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-right text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2.5 font-bold cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>لوحة الإدارة والإحصائيات</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={async () => {
                    setUserDropdownOpen(false);
                    await logout();
                    onNavigate('home');
                  }}
                  className="w-full px-4 py-2.5 text-right text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Unified Full Sidebar / Drawer (used across all screen sizes) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          {/* Backdrop overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 sm:w-96 max-w-[85vw] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white">قائمة المنصة المدرسية</h2>
                  <p className="text-[11px] text-emerald-400 font-medium">مدرسة صفية بنت عمر</p>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links with Spacious Comfortable Vertical Separation (≥16px) */}
            <div className="p-5 sm:p-6 flex-1 space-y-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = currentView === link.view;
                return (
                  <button
                    key={link.view}
                    onClick={() => handleLinkClick(link.view)}
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3.5 transition-all text-right cursor-pointer ${
                      active
                        ? 'bg-emerald-800/90 text-white border border-emerald-500/50 shadow-md shadow-emerald-950/40'
                        : link.adminOnly
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                        : 'text-slate-200 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-amber-300' : link.adminOnly ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="flex-1">{link.label}</span>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-900/60 space-y-3">
              {user ? (
                <button
                  onClick={async () => {
                    setDrawerOpen(false);
                    await logout();
                    onNavigate('home');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </button>
              )}

              <p className="text-[11px] text-center text-slate-500 font-light">
                المنصة المدرسية الرسمية المعتمدة © {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
