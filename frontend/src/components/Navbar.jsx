import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, CheckSquare, Inbox, Folder, LogOut, Sparkles, Calendar, Sun, Moon } from 'lucide-react';

export const Navbar = ({ currentView, onViewChange }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  if (!user) return null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hash: '#/dashboard' },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare, hash: '#/tasks' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, hash: '#/inbox' },
    { id: 'all-projects', label: 'Tracks', icon: Folder, hash: '#/projects' },
    { id: 'timetable', label: 'Schedule', icon: Calendar, hash: '#/schedule' },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="hidden md:flex sticky top-0 z-40 bg-graphite-800/80 backdrop-blur-md border-b border-border-default px-8 py-4 items-center justify-between transition-colors duration-200">
        {/* Branding */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('dashboard')}>
          <div className="bg-graphite-800 border border-border-default p-2 rounded-xl flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5 text-lime-accent" />
          </div>
          <span className="font-bold text-xl tracking-tight text-text-primary font-heading">Active Cap</span>
        </div>

        {/* Nav Items */}
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-graphite-700 text-text-primary border-l-2 border-lime-accent font-semibold shadow-xs'
                    : 'text-text-muted hover:bg-graphite-700 hover:text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Theme Toggle, Greeting, Logout */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-graphite-700 hover:bg-graphite-600 border border-border-default rounded-xl text-text-secondary hover:text-text-primary transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-warning" />
            ) : (
              <Moon className="w-4 h-4 text-text-primary" />
            )}
          </button>

          {/* User Greeting */}
          <span className="text-sm text-text-muted pl-1">
            Hello, <span className="font-medium text-text-primary">{user.username}</span>
          </span>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 border border-border-default rounded-xl text-sm font-medium text-text-muted hover:border-error/40 hover:text-error hover:bg-error/5 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-graphite-800/95 backdrop-blur-lg border-t border-border-default px-4 py-2 flex justify-around items-center pb-safe-bottom transition-colors duration-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive ? 'text-lime-accent font-semibold' : 'text-text-muted'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Mobile Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center py-1 px-2.5 text-text-muted active:scale-95 transition-all duration-200 cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-text-primary" />}
          <span className="text-[10px] mt-1 font-medium">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <button
          onClick={logout}
          className="flex flex-col items-center py-1 px-2.5 text-text-muted active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Logout</span>
        </button>
      </div>
    </>
  );
};
export default Navbar;
