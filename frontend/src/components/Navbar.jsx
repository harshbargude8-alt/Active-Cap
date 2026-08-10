import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Inbox, Folder, LogOut, Sparkles } from 'lucide-react';

export const Navbar = ({ currentView, onViewChange }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hash: '#/dashboard' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, hash: '#/inbox' },
    { id: 'all-projects', label: 'Projects', icon: Folder, hash: '#/projects' },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="hidden md:flex sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-calm-border px-8 py-4 items-center justify-between transition-all duration-300">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('dashboard')}>
          <div className="bg-gradient-to-tr from-accent-blue to-accent-green p-2 rounded-xl text-white shadow-sm flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-calm-text">Active Cap</span>
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
                    ? 'bg-calm-slate/10 text-calm-text scale-102 font-semibold'
                    : 'text-calm-muted hover:bg-slate-100 hover:text-calm-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-calm-muted">
            Hello, <span className="font-medium text-calm-text">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 border border-calm-border rounded-xl text-sm font-medium text-calm-muted hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-calm-border px-6 py-2 flex justify-around items-center pb-safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition-transform duration-300 active:scale-95 ${
                isActive ? 'text-accent-blue' : 'text-calm-muted'
              }`}
            >
              <Icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center py-1 px-3 text-calm-muted active:scale-95"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Logout</span>
        </button>
      </div>
    </>
  );
};
export default Navbar;
