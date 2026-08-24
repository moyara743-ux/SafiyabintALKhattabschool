import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageView, UserRole } from '../types';
import {
  GraduationCap,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Bell,
  Sparkles,
  BookOpen,
  Calendar,
  Image as ImageIcon,
  Award,
  Info,
  Phone,
  Home,
  Sun,
  PlusCircle,
  Lock
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
  const { user, profile, logout, isOwner, isAdmin, isModerator, canPublish } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full">المديرة والمالكة</span>;
      case 'admin':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full">مشرفة إدارية</span>;
      case 'teacher':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full">معلمة</span>;
      case 'editor':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-200 border border-sky-400/30 rounded-full">محررة</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-500/20 text-slate-300 rounded-full">عضو</span>;
    }
  };

  const navLinks: { view: PageView; label: string; icon: any }[] = [
    { view: 'home', label: 'الرئيسية', icon: Home },
    { view: 'news', label: 'أخبار المدرسة', icon: BookOpen },
    { view: 'today', label: 'يومنا بالمدرسة', icon: Sun },
    { view: 'events', label: 'الفعاليات والتقويم', icon: Calendar },
    { view: 'gallery', label: 'معرض الصور', icon: ImageIcon },
    { view: 'achievements', label: 'الإنجازات', icon: Award },
    { view: 'about', label: 'عن المدرسة', icon: Info },
    { view: 'contact', label: 'تواصل معنا', icon: Phone },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-lg" dir="rtl">
      {/* Top Banner with Motto & Direct Access */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 border-b border-emerald-800/40 text-[11px] py-1.5 px-4 sm:px-8 text-emerald-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold text-emerald-100">مدرسة صفية بنت عمر</span>
            <span className="text-emerald-400/60 hidden sm:inline">|</span>
            <span className="text-emerald-300/80 hidden sm:inline">"نصنع المعرفة... ونوثق الإنجاز"</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {isOwner && (
              <span className="flex items-center gap-1 text-amber-300 font-bold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                <Shield className="w-3 h-3" />
                لوحة المديرة مفعلة
              </span>
            )}
            <span className="text-emerald-300/80">العام الدراسي 1447 - 1448هـ</span>
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
              <h1 className="text-base sm:text-lg font-extrabold font-serif tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                مدرسة صفية بنت عمر
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">المنصة المدرسية الرقمية المعتمدة</p>
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
            {/* Quick Search Toggle / Input */}
            <div className="relative hidden md:block">
              <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input
                  type="text"
                  placeholder="ابحث في الأخبار والفعاليات..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-36 lg:w-48"
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

            {/* Quick New Post Button for Authorized Staff */}
            {canPublish && onOpenNewPostModal && (
              <button
                onClick={onOpenNewPostModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-all hover:scale-102"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة محتوى</span>
              </button>
            )}

            {/* Admin / Owner Dashboard Link */}
            {isModerator && (
              <button
                onClick={() => onNavigate('admin_dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  currentView === 'admin_dashboard'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {isOwner ? 'لوحة تحكم المديرة' : 'لوحة المشرفين'}
                </span>
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
                    {profile?.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-semibold text-white max-w-[100px] truncate">
                      {profile?.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {getRoleBadge(profile?.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    onMouseLeave={() => setUserDropdownOpen(false)}
                    className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/40">
                      <p className="text-xs font-bold text-white truncate">
                        {profile?.displayName || 'مستخدم'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5">{getRoleBadge(profile?.role)}</div>
                    </div>

                    {isModerator && (
                      <button
                        onClick={() => {
                          onNavigate('admin_dashboard');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-right text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 font-bold"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isOwner ? 'لوحة تحكم المديرة' : 'لوحة المشرفين'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-right text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>إعدادات الحساب</span>
                    </button>

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

        {/* Mobile Search Bar in Dropdown */}
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

          {canPublish && onOpenNewPostModal && (
            <button
              onClick={() => {
                onOpenNewPostModal();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة محتوى جديد</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
