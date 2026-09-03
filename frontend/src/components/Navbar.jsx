import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Inbox, Folder, LogOut, Sparkles, Calendar, Sun, Moon } from 'lucide-react';

export const Navbar = ({ currentView, onViewChange }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  if (!user) return null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hash: '#/dashboard' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, hash: '#/inbox' },
    { id: 'all-projects', label: 'Tracks', icon: Folder, hash: '#/projects' },
    { id: 'timetable', label: 'Schedule', icon: Calendar, hash: '#/schedule' },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="hidden md:flex sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-calm-border dark:border-slate-800/80 px-8 py-4 items-center justify-between transition-colors duration-200">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('dashboard')}>
          <div className="bg-gradient-to-tr from-accent-blue to-accent-green p-2 rounded-xl text-white shadow-sm flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-calm-text dark:text-slate-100">Active Cap</span>
        </div>

        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-calm-slate/10 dark:bg-slate-800 text-calm-text dark:text-slate-100 scale-102 font-semibold'
                    : 'text-calm-muted dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-calm-text dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 border border-calm-border dark:border-slate-700/80 rounded-xl text-calm-muted dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 flex items-center justify-center cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          <span className="text-sm text-calm-muted dark:text-slate-400 pl-1">
            Hello, <span className="font-medium text-calm-text dark:text-slate-200">{user.username}</span>
          </span>

          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 border border-calm-border dark:border-slate-700/80 rounded-xl text-sm font-medium text-calm-muted dark:text-slate-300 hover:border-amber-200 dark:hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-calm-border dark:border-slate-800 px-4 py-2 flex justify-around items-center pb-safe-bottom transition-colors duration-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-transform duration-300 active:scale-95 ${
                isActive ? 'text-accent-blue font-semibold' : 'text-calm-muted dark:text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Mobile Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center py-1 px-2.5 text-calm-muted dark:text-slate-400 active:scale-95"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          <span className="text-[10px] mt-1 font-medium">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <button
          onClick={logout}
          className="flex flex-col items-center py-1 px-2.5 text-calm-muted dark:text-slate-400 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Logout</span>
        </button>
      </div>
    </>
  );
};
export default Navbar;
