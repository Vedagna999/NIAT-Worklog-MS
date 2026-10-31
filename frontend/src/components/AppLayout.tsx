import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import {
  Clock,
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  Users,
  Search,
  BarChart3,
  Shield,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  FileText,
  User as UserIcon,
  ChevronRight,
  TrendingUp,
  BookOpen
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout, switchDemoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Demo Switcher dropdown
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  if (!user) return null;

  const isCurrentPath = (path: string) => {
    if (path === '/worklog' && (location.pathname === '/worklog' || location.pathname === '/mentor/dashboard')) {
      return true;
    }
    if (path === '/manager' && (location.pathname === '/manager' || location.pathname === '/manager/overview')) {
      return true;
    }
    return location.pathname === path;
  };

  const handleDemoSwitch = async (email: string, pass: string) => {
    setShowDemoMenu(false);
    setMobileMenuOpen(false);
    await switchDemoUser(email, pass);
    if (email.includes('mentor') || email.includes('vedagna') || email.includes('tharun') || email.includes('bhargav') || email.includes('rahul')) {
      navigate('/worklog');
    } else if (email.includes('manager') || email.includes('kushal')) {
      navigate('/manager');
    } else {
      navigate('/admin');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MENTOR':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  // Mentor navigation items
  const mentorNavItems = [
    {
      name: 'My Dashboard',
      path: '/worklog',
      icon: <LayoutDashboard className="w-4 h-4 text-emerald-400" />,
      description: "Today's hours & target progress"
    },
    {
      name: 'Daily Worklog',
      path: '/mentor/daily',
      icon: <Clock className="w-4 h-4 text-blue-400" />,
      description: 'Activity entry & draft submission'
    },
    {
      name: 'My History',
      path: '/mentor/history',
      icon: <CalendarDays className="w-4 h-4 text-amber-400" />,
      description: 'Monthly calendar & attendance'
    },
    {
      name: 'My Learning',
      path: '/mentor/learning',
      icon: <GraduationCap className="w-4 h-4 text-purple-400" />,
      description: 'Skills, topics & outcomes logged'
    },
    {
      name: 'Skills Profile',
      path: '/mentor/skills',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      description: 'Self-assessed confidence & ratings'
    }
  ];

  // Manager navigation items
  const managerNavItems = [
    {
      name: 'Team Overview',
      path: '/manager',
      icon: <Users className="w-4 h-4 text-blue-400" />,
      description: 'Assigned mentors & team metrics'
    },
    {
      name: 'Skills & Growth',
      path: '/manager/skills',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      description: 'Ratings, timelines & evidence'
    },
    {
      name: 'Mentor Insights',
      path: '/manager/insights',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      description: 'Detailed upskilling & distribution'
    },
    {
      name: 'Skill Finder',
      path: '/skill-finder',
      icon: <Search className="w-4 h-4 text-cyan-400" />,
      description: 'Search mentor topics & evidence'
    },
    {
      name: 'Worklog History',
      path: '/manager/worklogs',
      icon: <CalendarDays className="w-4 h-4 text-amber-400" />,
      description: 'Daily inspection & guidance remarks'
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: <BarChart3 className="w-4 h-4 text-purple-400" />,
      description: 'Team aggregation & exports'
    }
  ];

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const isMentor = user.role === 'MENTOR';
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 flex-shrink-0 z-50 shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile hamburger + Brand */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-inner group-hover:from-blue-500 group-hover:to-indigo-400 transition-all">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    NIAT Worklog
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                      v2.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 -mt-0.5">Mentor Performance System</p>
                </div>
              </Link>
            </div>

            {/* Right: Role Switcher + User Profile Pill + Logout */}
            <div className="flex items-center space-x-3">
              {/* Role Switcher Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 transition-all shadow-sm"
                  title="Switch demo role instantly"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Role Switcher</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showDemoMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                      Quick Demo Switcher
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                      {DEMO_USERS.map((u) => (
                        <button
                          key={u.email}
                          type="button"
                          onClick={() => handleDemoSwitch(u.email, u.pass)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                            user.email === u.email ? 'bg-blue-950/60 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-medium text-white flex items-center gap-1.5">
                              {u.label}
                              {user.email === u.email && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${getRoleBadge(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Identity Chip */}
              <div className="hidden sm:flex items-center space-x-2.5 pl-3 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                  {initials}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">{user.full_name}</div>
                  <span
                    className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${getRoleBadge(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                title="Logout from system"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: PERSISTENT SIDEBAR + CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* DESKTOP PERSISTENT SIDEBAR */}
        <aside className="hidden lg:flex lg:flex-col w-64 h-full flex-shrink-0 bg-slate-900 border-r border-slate-800 text-slate-300 select-none overflow-hidden">
          {/* User mini badge */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
                <span className="text-[9px] uppercase font-extrabold text-blue-400 tracking-wider">
                  {isMentor ? 'Mentor Portal' : isManager ? 'Manager Portal' : 'Admin Console'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3 flex-1 overflow-y-auto space-y-6">
            {/* Primary Section */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Navigation
              </div>

              {/* Mentor Nav Items */}
              {isMentor &&
                mentorNavItems.map((item) => {
                  const active = isCurrentPath(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1 rounded-lg ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-800'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          active ? 'text-white' : 'text-slate-600 group-hover:translate-x-0.5'
                        }`}
                      />
                    </Link>
                  );
                })}

              {/* Manager Nav Items */}
              {(isManager || isAdmin) &&
                managerNavItems.map((item) => {
                  const active = isCurrentPath(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1 rounded-lg ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-800'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          active ? 'text-white' : 'text-slate-600 group-hover:translate-x-0.5'
                        }`}
                      />
                    </Link>
                  );
                })}

              {/* Admin Special Console Link */}
              {isAdmin && (
                <div className="pt-2">
                  <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    System
                  </div>
                  <Link
                    to="/admin"
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isCurrentPath('/admin')
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-lg bg-slate-800 text-purple-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <span>Admin Console</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
            <span className="font-mono text-[10px] text-slate-400">6h Rule Active</span>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-left duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-white text-sm">NIAT Worklog</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Links */}
                <div className="space-y-1">
                  {(isMentor ? mentorNavItems : managerNavItems).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold ${
                        isCurrentPath(item.path)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold ${
                        isCurrentPath('/admin')
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Mobile Drawer Bottom User Info */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">{user.full_name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 text-rose-400 hover:bg-slate-800 rounded-lg"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. MAIN CONTENT CONTAINER */}
        <main className="flex-1 h-full overflow-y-auto min-h-0 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
