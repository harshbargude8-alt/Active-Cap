import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { ManageCategoriesModal } from './components/ManageCategoriesModal';
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
import { TaskDetail } from './pages/TaskDetail';
import { RefreshCw } from 'lucide-react';
import './App.css';
import './index.css';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskDate, setSelectedTaskDate] = useState(null);

  // Hash-based router listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/dashboard';
      const [path, queryString] = hash.split('?');
      const searchParams = new URLSearchParams(queryString || '');
      const dateParam = searchParams.get('date');

      if (!path || path === '#/' || path === '#/dashboard') {
        setView('dashboard');
        setSelectedProjectId(null);
        setSelectedTaskId(null);
      } else if (path === '#/inbox') {
        setView('inbox');
        setSelectedProjectId(null);
        setSelectedTaskId(null);
      } else if (path === '#/projects') {
        setView('all-projects');
        setSelectedProjectId(null);
        setSelectedTaskId(null);
      } else if (path === '#/schedule' || path === '#/timetable') {
        setView('timetable');
        setSelectedProjectId(null);
        setSelectedTaskId(null);
      } else if (path === '#/tasks' || path === '#/daily-tasks') {
        setView('daily-tasks');
        setSelectedProjectId(null);
        setSelectedTaskId(null);
        if (dateParam) {
          setSelectedTaskDate(dateParam);
        }
      } else if (path.startsWith('#/task/')) {
        const id = path.replace('#/task/', '');
        setSelectedTaskId(id);
        setSelectedProjectId(null);
        if (dateParam) {
          setSelectedTaskDate(dateParam);
        }
        setView('task-detail');
      } else if (path.startsWith('#/project/')) {
        const id = path.replace('#/project/', '');
        setSelectedProjectId(id);
        setSelectedTaskId(null);
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

  const navigate = (viewName, id, extra) => {
    if (viewName === 'project-detail') {
      window.location.hash = `#/project/${id}`;
    } else if (viewName === 'task-detail') {
      const dateQuery = extra ? `?date=${extra}` : '';
      window.location.hash = `#/task/${id}${dateQuery}`;
    } else if (viewName === 'daily-tasks' || viewName === 'tasks') {
      const targetDate = id || extra;
      window.location.hash = targetDate ? `#/tasks?date=${targetDate}` : `#/tasks`;
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
          <DailyTasks onViewChange={navigate} initialDate={selectedTaskDate} />
        )}
        {view === 'task-detail' && (
          <TaskDetail taskId={selectedTaskId} onViewChange={navigate} fallbackDate={selectedTaskDate} />
        )}
      </main>

      {/* Global Timer Bar & Modal */}
      <TimerBar />
      <LogFocusModal />
      <ManageCategoriesModal />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CategoriesProvider>
          <TimerProvider>
            <MainAppContent />
          </TimerProvider>
        </CategoriesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
