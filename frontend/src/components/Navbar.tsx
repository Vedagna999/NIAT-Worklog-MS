import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import {
  CalendarDays,
  LayoutDashboard,
  BarChart3,
  Shield,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Clock,
  Sparkles,
  Search
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleDemoSwitch = async (email: string, pass: string) => {
    setShowDemoMenu(false);
    await switchDemoUser(email, pass);
    if (email.includes('mentor')) {
      navigate('/worklog');
    } else if (email.includes('manager')) {
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

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-inner">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <Link to="/" className="text-lg font-bold tracking-tight text-white hover:text-blue-300 transition-colors flex items-center gap-2">
                NIAT Worklog
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                  v2.0
                </span>
              </Link>
              <p className="text-[11px] text-slate-400 -mt-0.5">Mentor Performance System</p>
            </div>
          </div>

          {/* Navigation links based on role */}
          <nav className="hidden md:flex items-center space-x-1">
            {(user.role === 'MENTOR' || user.role === 'ADMIN') && (
              <Link
                to="/worklog"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/worklog')
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4 text-blue-400" />
                Mentor Worklog
              </Link>
            )}

            {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
              <>
                <Link
                  to="/manager"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/manager')
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  Manager Portal
                </Link>
                <Link
                  to="/reports"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/reports')
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Reports
                </Link>
                <Link
                  to="/skill-finder"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/skill-finder')
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  Skill Finder
                </Link>
              </>
            )}

            {user.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/admin')
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                Admin Console
              </Link>
            )}
          </nav>

          {/* User profile & Quick demo role switcher */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 transition-all shadow-sm"
                title="Switch demo role instantly"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span className="hidden sm:inline">Role Switcher</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {showDemoMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-2 z-50"
                  onMouseLeave={() => setShowDemoMenu(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Quick Role Switch (Demo)
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => handleDemoSwitch(u.email, u.pass)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        user.email === u.email ? 'bg-blue-50/70 font-semibold text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{u.label}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User profile badge */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user.full_name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium uppercase ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
