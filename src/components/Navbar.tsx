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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

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

  // Primary links visible directly in desktop navbar
  const primaryNavLinks = [
    { view: 'home' as PageView, label: 'الرئيسية', icon: Home },
    { view: 'announcements' as PageView, label: 'الإعلانات', icon: Bell },
    { view: 'news' as PageView, label: 'الأخبار والمنشورات', icon: BookOpen },
    { view: 'today' as PageView, label: 'ماذا حدث اليوم؟', icon: Sun },
    { view: 'events' as PageView, label: 'الفعاليات', icon: Calendar },
  ];

  // Secondary links tucked cleanly in the "المزيد ▾" dropdown on desktop
  const secondaryNavLinks = [
    { view: 'achievements' as PageView, label: 'الإنجازات', icon: Award },
    { view: 'gallery' as PageView, label: 'الصور والألبومات', icon: ImageIcon },
    { view: 'daily_message' as PageView, label: 'الرسالة اليومية', icon: MessageSquare },
  ];

  // All links for mobile drawer
  const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks];

  const canAccessAdmin =
    hasPerm('manageUsers') || isOwner || isDirector || hasPerm('viewActivityLog') || hasPerm('manageSiteSettings');

  const isSecondaryActive =
    secondaryNavLinks.some((link) => link.view === currentView) ||
    (canAccessAdmin && currentView === 'admin_dashboard');

  const activeSecondaryItem =
    secondaryNavLinks.find((link) => link.view === currentView) ||
    (canAccessAdmin && currentView === 'admin_dashboard' ? { label: 'لوحة الإدارة' } : null);

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

      {/* 2. Main Navigation Bar with Responsive Spacing and Sizing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between min-h-[4.5rem] sm:min-h-[4.75rem] lg:min-h-[5.25rem] py-2 sm:py-2.5 gap-3 lg:gap-6 xl:gap-8 w-full">
          
          {/* Logo & School Name: Clear visual space on the right */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 sm:gap-3.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/40 group-hover:scale-105 transition-transform duration-200">
              <GraduationCap className="w-6 h-6 sm:w-6.5 sm:h-6.5 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-white group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                مدرسة صفية بنت عمر
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block whitespace-nowrap mt-0.5">
                بوابة الإعلام والتوثيق والأنشطة
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (> 1024px) with generous spacing */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 shrink min-w-0">
            {primaryNavLinks.map((link) => {
              const Icon = link.icon;
              const active = currentView === link.view;
              return (
                <button
                  key={link.view}
                  onClick={() => onNavigate(link.view)}
                  className={`px-2.5 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-150 ${
                    active
                      ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600/40 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}

            {/* "المزيد ▾" Dropdown Menu */}
            <div className="relative" onMouseLeave={() => setMoreDropdownOpen(false)}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`px-3 xl:px-4 py-2 rounded-xl text-xs xl:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-150 ${
                  isSecondaryActive
                    ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600/40 shadow-inner'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <span>{activeSecondaryItem ? activeSecondaryItem.label : 'المزيد'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-150">
                  {secondaryNavLinks.map((link) => {
                    const Icon = link.icon;
                    const active = currentView === link.view;
                    return (
                      <button
                        key={link.view}
                        onClick={() => {
                          onNavigate(link.view);
                          setMoreDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-right text-xs xl:text-sm font-bold flex items-center gap-2.5 transition-colors ${
                          active
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>{link.label}</span>
                      </button>
                    );
                  })}

                  {/* Admin Dashboard inside dropdown for authorized users only */}
                  {canAccessAdmin && (
                    <>
                      <div className="border-t border-slate-800 my-1.5" />
                      <button
                        onClick={() => {
                          onNavigate('admin_dashboard');
                          setMoreDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-right text-xs xl:text-sm font-bold flex items-center gap-2.5 transition-colors ${
                          currentView === 'admin_dashboard'
                            ? 'bg-amber-500/25 text-amber-300'
                            : 'text-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>لوحة الإدارة</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Section: User Info, Search, Hamburger */}
          <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-3.5 shrink-0">
            {/* Quick Search on Desktop / Tablet */}
            <div className="relative hidden xl:block">
              <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="ابحث..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-24 2xl:w-36"
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

            {/* User Profile / Auth State with Guaranteed Edge Padding */}
            {user ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 transition-all shadow-sm"
                  aria-label="قائمة المستخدم"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
                    {profile?.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-white max-w-[85px] xl:max-w-[110px] truncate leading-tight">
                      {profile?.name || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-amber-300 font-medium leading-tight mt-0.5">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu with Generous Spacing */}
                {userDropdownOpen && (
                  <div
                    onMouseLeave={() => setUserDropdownOpen(false)}
                    className="absolute left-0 mt-2.5 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
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
                        className="w-full px-4 py-2.5 text-right text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
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
                          className="w-full px-4 py-2.5 text-right text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2.5 font-bold transition-colors"
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
                          className="w-full px-4 py-2.5 text-right text-xs text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2.5 transition-colors"
                        >
                          <Users className="w-4 h-4 text-emerald-400" />
                          <span>إدارة المستخدمين والألقاب والصلاحيات</span>
                        </button>
                      )}

                      {hasPerm('viewActivityLog') && (
                        <button
                          onClick={() => {
                            onNavigate('activity_log');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-right text-xs text-sky-300 hover:bg-sky-500/10 flex items-center gap-2.5 transition-colors"
                        >
                          <Activity className="w-4 h-4 text-sky-400" />
                          <span>سجل النشاط والعمليات</span>
                        </button>
                      )}

                      {hasPerm('manageSiteSettings') && (
                        <button
                          onClick={() => {
                            onNavigate('site_settings');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-right text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                        >
                          <SettingsIcon className="w-4 h-4 text-slate-400" />
                          <span>إعدادات ومعلومات المدرسة</span>
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
                      className="w-full px-4 py-2.5 text-right text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-medium transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-950/40 transition-all"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-block px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
                >
                  حساب جديد
                </button>
              </div>
            )}

            {/* Mobile & Tablet Menu Toggle Button (< 1024px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Only shown on small screens under 768px) */}
        <div className="md:hidden pb-3 pt-1">
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2">
            <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              placeholder="ابحث في الأخبار والفعاليات..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="text-slate-400 text-xs px-1">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Mobile & Tablet Adaptive Drawer Menu (< 1024px) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 px-5 py-5 space-y-4 shadow-2xl backdrop-blur-xl">
          {/* User summary inside mobile drawer */}
          {user && (
            <div className="p-3.5 bg-slate-800/70 border border-slate-700 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
                  {profile?.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{profile?.name || user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-amber-300 font-medium">{roleLabel}</p>
                </div>
              </div>
              {canAccessAdmin && (
                <button
                  onClick={() => {
                    onNavigate('admin_dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold"
                >
                  لوحة الإدارة
                </button>
              )}
            </div>
          )}

          {/* Navigation Links with Spacious Touch Targets */}
          <div className="space-y-1.5">
            {allNavLinks.map((link) => {
              const Icon = link.icon;
              const active = currentView === link.view;
              return (
                <button
                  key={link.view}
                  onClick={() => {
                    onNavigate(link.view);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-3 transition-all text-right ${
                    active
                      ? 'bg-emerald-800 text-emerald-100 border border-emerald-600/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Footer Actions */}
          {user && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  onNavigate('home');
                }}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 text-right transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
