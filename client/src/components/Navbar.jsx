import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Feather,
  Compass,
  Bookmark,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  Check,
  PlusCircle,
  ExternalLink
} from 'lucide-react';

export default function Navbar({ onOpenAuth, onNavigate, currentPath }) {
  const {
    user,
    penNames,
    activePenName,
    selectActivePenName,
    logout,
    notifications,
    unreadNotifsCount,
    markNotificationRead,
    markAllNotificationsRead
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [penDropdownOpen, setPenDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userDropdownRef = useRef(null);
  const penDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (penDropdownRef.current && !penDropdownRef.current.contains(event.target)) {
        setPenDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinkClass = (path) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      currentPath === path
        ? 'text-[#1E1B4B] bg-[#E8E2D6] font-semibold'
        : 'text-[#4B4870] hover:text-[#1E1B4B] hover:bg-[#F0EBE1]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DECF] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E1B4B] to-[#3B3878] flex items-center justify-center text-[#FAF7F2] shadow-sm group-hover:shadow transition-transform group-hover:scale-105">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-cinzel text-xl font-bold tracking-wider text-[#1E1B4B] block leading-none">
                  INDIGO
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#6B6694] font-medium block">
                  Literary House
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <button onClick={() => onNavigate('/')} className={navLinkClass('/')}>
                Home
              </button>
              <button onClick={() => onNavigate('/discover')} className={navLinkClass('/discover')}>
                Discover
              </button>
              <button onClick={() => onNavigate('/community')} className={navLinkClass('/community')}>
                Community
              </button>
              <button onClick={() => onNavigate('/library')} className={navLinkClass('/library')}>
                My Library
              </button>
              <button
                onClick={() => onNavigate('/write')}
                className="ml-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-[#1E1B4B] text-[#FAF7F2] hover:bg-[#312E81] transition-shadow shadow-xs hover:shadow"
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-6">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7E79A4]" />
              <input
                type="text"
                placeholder="Search books, authors, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F2EDE2] border border-[#DDD5C5] rounded-full focus:outline-none focus:border-[#1E1B4B] focus:bg-white text-[#1E1B4B] placeholder-[#8B86AA] transition-all"
              />
            </form>
          </div>

          {/* Right Action Icons & User Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Pen Name Switcher Pill */}
                {penNames.length > 0 && (
                  <div className="relative" ref={penDropdownRef}>
                    <button
                      onClick={() => setPenDropdownOpen(!penDropdownOpen)}
                      className="hidden sm:flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 bg-[#EFE9DC] hover:bg-[#E5DECDB0] border border-[#DDD5C5] rounded-full text-[#1E1B4B] transition-colors"
                      title="Switch active author persona"
                    >
                      <Feather className="w-3 h-3 text-[#5A5488]" />
                      <span className="font-semibold max-w-[110px] truncate">
                        {activePenName ? activePenName.name : 'Choose Pen Name'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-[#7E79A4]" />
                    </button>

                    {penDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#E5DECF] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1.5 border-b border-gray-100">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Active Pen Name
                          </p>
                          <p className="text-xs text-gray-500">
                            Works you write will publish under this author persona.
                          </p>
                        </div>
                        <div className="max-h-56 overflow-y-auto py-1">
                          {penNames.map((pn) => (
                            <button
                              key={pn.id}
                              onClick={() => {
                                selectActivePenName(pn);
                                setPenDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#FAF7F2] transition-colors ${
                                activePenName?.id === pn.id ? 'bg-[#F4EFE6] font-semibold text-[#1E1B4B]' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {pn.avatar_url ? (
                                  <img
                                    src={pn.avatar_url}
                                    alt={pn.name}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center text-[10px]">
                                    {pn.name.charAt(0)}
                                  </div>
                                )}
                                <span className="truncate">{pn.name}</span>
                              </div>
                              {activePenName?.id === pn.id && (
                                <Check className="w-3.5 h-3.5 text-[#1E1B4B]" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="pt-1 mt-1 border-t border-gray-100 px-2">
                          <button
                            onClick={() => {
                              setPenDropdownOpen(false);
                              onNavigate('/pen-names');
                            }}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#312E81] hover:bg-[#FAF7F2] rounded-lg font-medium"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Manage Pen Names</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notifications Bell */}
                <div className="relative" ref={notifDropdownRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2 rounded-full text-[#4B4870] hover:text-[#1E1B4B] hover:bg-[#F0EBE1] transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                        {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#E5DECF] py-2 z-50">
                      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1E1B4B]">Notifications</span>
                        {unreadNotifsCount > 0 && (
                          <button
                            onClick={markAllNotificationsRead}
                            className="text-[11px] text-[#312E81] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-6">
                            No notifications yet
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markNotificationRead(n.id);
                                if (n.link) {
                                  onNavigate(n.link);
                                  setNotifDropdownOpen(false);
                                }
                              }}
                              className={`p-3 text-xs cursor-pointer hover:bg-[#FAF7F2] transition-colors ${
                                !n.is_read ? 'bg-[#F6F4FB]' : ''
                              }`}
                            >
                              <p className="font-semibold text-gray-900">{n.title}</p>
                              <p className="text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-gray-400 mt-1 block">
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#F0EBE1] transition-colors border border-transparent hover:border-[#DDD5C5]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1E1B4B] text-[#FAF7F2] flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                      {user.username.charAt(0)}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#5A5488] hidden sm:block" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E5DECF] py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-900 truncate">@{user.username}</p>
                        <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                        {user.role === 'admin' && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                            Platform Admin
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('/pen-names');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-[#FAF7F2]"
                        >
                          <Feather className="w-4 h-4 text-[#4B4870]" />
                          <span>Pen Name Profiles</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('/library');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-[#FAF7F2]"
                        >
                          <Bookmark className="w-4 h-4 text-[#4B4870]" />
                          <span>My Library</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('/settings');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-[#FAF7F2]"
                        >
                          <Settings className="w-4 h-4 text-[#4B4870]" />
                          <span>Account Settings</span>
                        </button>

                        {user.role === 'admin' && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onNavigate('/admin');
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#312E81] font-semibold hover:bg-indigo-50"
                          >
                            <ShieldAlert className="w-4 h-4 text-[#312E81]" />
                            <span>Administrator Panel</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-1 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                            onNavigate('/');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#1E1B4B] hover:bg-[#EFE9DC] rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-1.5 text-xs font-semibold text-[#FAF7F2] bg-[#1E1B4B] hover:bg-[#312E81] rounded-lg shadow-xs hover:shadow transition-all"
                >
                  Join Indigo
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#4B4870] hover:text-[#1E1B4B] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5DECF] bg-[#FAF7F2] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7E79A4]" />
              <input
                type="text"
                placeholder="Search books, authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
              />
            </div>
          </form>

          <button
            onClick={() => {
              onNavigate('/');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-[#1E1B4B] rounded-lg hover:bg-[#F0EBE1]"
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate('/discover');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-[#1E1B4B] rounded-lg hover:bg-[#F0EBE1]"
          >
            Discover
          </button>
          <button
            onClick={() => {
              onNavigate('/community');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-[#1E1B4B] rounded-lg hover:bg-[#F0EBE1]"
          >
            Community
          </button>
          <button
            onClick={() => {
              onNavigate('/library');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-[#1E1B4B] rounded-lg hover:bg-[#F0EBE1]"
          >
            My Library
          </button>
          <button
            onClick={() => {
              onNavigate('/write');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#1E1B4B] rounded-xl"
          >
            <Feather className="w-4 h-4" />
            <span>Write & Publish</span>
          </button>
        </div>
      )}
    </header>
  );
}
