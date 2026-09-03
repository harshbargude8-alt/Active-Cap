import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';
import { TimerBar } from './components/TimerBar';
import { LogFocusModal } from './components/LogFocusModal';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { AllProjects } from './pages/AllProjects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Timetable } from './pages/Timetable';
import { RefreshCw } from 'lucide-react';
import './App.css';
import './index.css';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Hash-based router listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#/' || hash === '#/dashboard') {
        setView('dashboard');
        setSelectedProjectId(null);
      } else if (hash === '#/inbox') {
        setView('inbox');
        setSelectedProjectId(null);
      } else if (hash === '#/projects') {
        setView('all-projects');
        setSelectedProjectId(null);
      } else if (hash === '#/schedule' || hash === '#/timetable') {
        setView('timetable');
        setSelectedProjectId(null);
      } else if (hash.startsWith('#/project/')) {
        const id = hash.replace('#/project/', '');
        setSelectedProjectId(id);
        setView('project-detail');
      } else {
        // Fallback
        window.location.hash = '#/dashboard';
      }
    };

    // Run once on load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (viewName, id) => {
    if (viewName === 'project-detail') {
      window.location.hash = `#/project/${id}`;
    } else if (viewName === 'inbox') {
      window.location.hash = `#/inbox`;
    } else if (viewName === 'all-projects') {
      window.location.hash = `#/projects`;
    } else if (viewName === 'timetable' || viewName === 'schedule') {
      window.location.hash = `#/schedule`;
    } else {
      window.location.hash = `#/dashboard`;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 space-y-3 transition-colors duration-200">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm text-calm-muted dark:text-slate-400 font-medium">Connecting to active cap session...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-calm-text dark:text-slate-100 pb-20 md:pb-0 transition-colors duration-200">
      <Navbar currentView={view} onViewChange={navigate} />
      
      <main className="py-6">
        {view === 'dashboard' && (
          <Dashboard onViewChange={navigate} onSelectProjectId={setSelectedProjectId} />
        )}
        {view === 'inbox' && (
          <Inbox onViewChange={navigate} onSelectProjectId={setSelectedProjectId} />
        )}
        {view === 'all-projects' && (
          <AllProjects onViewChange={navigate} onSelectProjectId={setSelectedProjectId} />
        )}
        {view === 'project-detail' && (
          <ProjectDetail projectId={selectedProjectId} onViewChange={navigate} />
        )}
        {view === 'timetable' && (
          <Timetable />
        )}
      </main>

      {/* Global Timer Bar & Modal */}
      <TimerBar />
      <LogFocusModal />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TimerProvider>
          <MainAppContent />
        </TimerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
