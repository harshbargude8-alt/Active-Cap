import { useState, useEffect } from 'react';
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
import { DailyTasks } from './pages/DailyTasks';
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
      } else if (hash === '#/tasks' || hash === '#/daily-tasks') {
        setView('daily-tasks');
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
    } else if (viewName === 'daily-tasks' || viewName === 'tasks') {
      window.location.hash = `#/tasks`;
    } else {
      window.location.hash = `#/dashboard`;
    }
  };

  // LOADING STATE: dynamic app background + lime accent spinner
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-app-bg space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-sm text-text-muted font-medium">Connecting to active cap session...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // MAIN SHELL: dynamic app background, primary text, bottom padding for mobile nav
  return (
    <div className="min-h-screen bg-app-bg text-text-primary pb-20 md:pb-0 transition-colors duration-200">
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
        {view === 'daily-tasks' && (
          <DailyTasks onViewChange={navigate} />
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
