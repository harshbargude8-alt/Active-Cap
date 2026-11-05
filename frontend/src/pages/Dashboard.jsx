import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { QuickCapture } from '../components/QuickCapture';
import { CheckInModal } from '../components/CheckInModal';
import { SwapModal } from '../components/SwapModal';
import { PROJECT_CATEGORIES, getCategoryColor } from '../constants/project';
import { clientCache } from '../utils/clientCache';
import {
  X,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Plus,
  RefreshCw,
  FolderOpen,
  Play,
  Square,
  CheckSquare,
  Check,
  Clock,
  ArrowRight,
  Repeat
} from 'lucide-react';

export const Dashboard = ({ onViewChange, onSelectProjectId }) => {
  const { apiFetch } = useAuth();
  const { activeTimer, secondsElapsed, formatTime, startTimer, stopTimer } = useTimer();

  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialTodayStr = getTodayISO();
  const cachedProjects = clientCache.get('/projects');
  const cachedReview = clientCache.get('/review');
  const cachedTasks = clientCache.get(`/daily-tasks?date=${initialTodayStr}`);

  const [projects, setProjects] = useState(cachedProjects || []);
  const [reviewData, setReviewData] = useState(cachedReview || null);
  const [loading, setLoading] = useState(!cachedProjects && !cachedReview);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Today's Agenda State
  const [todayTasks, setTodayTasks] = useState(cachedTasks?.tasks || []);
  const [todaySummary, setTodaySummary] = useState(cachedTasks?.summary || { total: 0, completed: 0, pending: 0 });
  const [agendaNewTitle, setAgendaNewTitle] = useState('');
  const [isAddingAgendaTask, setIsAddingAgendaTask] = useState(false);

  // Swap State
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapTargetProject, setSwapTargetProject] = useState(null);
  const [activeProjectsList, setActiveProjectsList] = useState([]);

  // Create Project Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Code');
  const [newDescription, setNewDescription] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newStatus, setNewStatus] = useState('Parked');
  const [createError, setCreateError] = useState('');

  const loadData = useCallback(async () => {
    // Only show full loading spinner if there is no cached data to display
    if (!clientCache.get('/projects')) {
      setLoading(true);
    }
    try {
      const todayStr = getTodayISO();
      // Fetch all dashboard data concurrently (removes sequential waterfall)
      const [projRes, revRes, taskRes] = await Promise.all([
        apiFetch('/projects'),
        apiFetch('/review'),
        apiFetch(`/daily-tasks?date=${todayStr}`),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
        clientCache.set('/projects', projData, 60);
      }

      if (revRes.ok) {
        const revData = await revRes.json();
        setReviewData(revData);
        clientCache.set('/review', revData, 60);
      }

      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTodayTasks(taskData.tasks || []);
        setTodaySummary(taskData.summary || { total: 0, completed: 0, pending: 0 });
        clientCache.set(`/daily-tasks?date=${todayStr}`, taskData, 60);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const handleToggleAgendaTask = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTodayTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
    );
    setTodaySummary((prev) => {
      const isCompleted = nextStatus === 'completed';
      return {
        ...prev,
        completed: isCompleted ? prev.completed + 1 : Math.max(0, prev.completed - 1),
        pending: isCompleted ? Math.max(0, prev.pending - 1) : prev.pending + 1,
      };
    });

    try {
      const res = await apiFetch(`/daily-tasks/${task._id}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to toggle');
      const updated = await res.json();
      setTodayTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
    } catch (err) {
      console.error('Toggle agenda task error:', err);
      loadData();
    }
  };

  const handleQuickAddAgendaTask = async (e) => {
    e.preventDefault();
    if (!agendaNewTitle.trim()) return;

    setIsAddingAgendaTask(true);
    try {
      const todayStr = getTodayISO();
      const res = await apiFetch('/daily-tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: agendaNewTitle.trim(),
          date: todayStr,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setTodayTasks((prev) => [...prev, created]);
        setTodaySummary((prev) => ({
          ...prev,
          total: prev.total + 1,
          pending: prev.pending + 1,
        }));
        setAgendaNewTitle('');
      }
    } catch (err) {
      console.error('Quick add agenda task error:', err);
    } finally {
      setIsAddingAgendaTask(false);
    }
  };

  const handleSyncTodayRoutines = async () => {
    try {
      const todayStr = getTodayISO();
      await apiFetch('/routines/sync-to-date', {
        method: 'POST',
        body: JSON.stringify({ date: todayStr }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to sync today routines:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handleCheckinLogged = () => {
      loadData();
    };
    window.addEventListener('project-checkin-logged', handleCheckinLogged);
    return () => window.removeEventListener('project-checkin-logged', handleCheckinLogged);
  }, [loadData]);

  const handleCheckInSuccess = () => {
    loadData();
  };

  // Trigger Swap Flow
  const handleSwap = async (activeProjectIdToPark) => {
    try {
      const res = await apiFetch(`/projects/${swapTargetProject._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Active',
          swapProjectId: activeProjectIdToPark,
          nextStep: swapTargetProject.nextStep,
        }),
      });

      if (res.ok) {
        setIsSwapOpen(false);
        setSwapTargetProject(null);
        loadData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Swap failed');
      }
    } catch (err) {
      console.error('Error executing swap:', err);
    }
  };

  // Create Project Submit
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newTitle.trim()) {
      setCreateError('Title is required.');
      return;
    }

    if (newStatus === 'Active' && !newNextStep.trim()) {
      setCreateError('A concrete next step is required to save a project as Active.');
      return;
    }

    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          status: newStatus,
          nextStep: newNextStep.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.capReached) {
          // Trigger swap prompt
          setSwapTargetProject({
            _id: 'pending', // placeholder id since project doesn't exist yet, we will prompt user to park one, then we will create this project
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory,
            nextStep: newNextStep.trim(),
          });
          setActiveProjectsList(data.activeProjects);
          // Wait, since we are creating it, we can create it as Parked first, and then swap it!
          // Let's call another API to create it as Parked, then perform swap on that ID.
          // Creating as Parked first is extremely clean:
          const createParkedRes = await apiFetch('/projects', {
            method: 'POST',
            body: JSON.stringify({
              title: newTitle.trim(),
              description: newDescription.trim(),
              category: newCategory,
              status: 'Parked',
              nextStep: newNextStep.trim(),
            }),
          });
          if (createParkedRes.ok) {
            const parkedProj = await createParkedRes.json();
            setSwapTargetProject(parkedProj);
            setIsCreateOpen(false);
            setIsSwapOpen(true);
          } else {
            const errData = await createParkedRes.json();
            setCreateError(errData.error || 'Failed to create project.');
          }
        } else {
          setCreateError(data.error || 'Failed to create project.');
        }
        return;
      }

      setIsCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch {
      setCreateError('Connection error. Please try again.');
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewCategory('Code');
    setNewDescription('');
    setNewNextStep('');
    setNewStatus('Parked');
    setCreateError('');
  };

  // Group projects
  const activeProjects = projects.filter((p) => p.status === 'Active');
  const parkedProjects = projects.filter((p) => p.status === 'Parked');
  const somedayProjects = projects.filter((p) => p.status === 'Someday');

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-sm text-text-muted">Gathering your tracks...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      
      {/* Quick capture input at the top */}
      <QuickCapture onSuccess={loadData} />

      {/* Today's Agenda Widget */}
      <section className="mb-10 bg-graphite-800 border border-border-default rounded-2xl p-5 shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-lime-accent/10 border border-lime-accent/20 flex items-center justify-center text-lime-accent">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading text-lg font-bold text-text-primary tracking-tight">
                  Today's Agenda
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-lime-accent/15 text-lime-accent border border-lime-accent/25">
                  {todaySummary.completed}/{todaySummary.total} Completed
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Routines and daily micro-deliverables for today
              </p>
            </div>
          </div>

          <button
            onClick={() => onViewChange('daily-tasks')}
            className="flex items-center space-x-1 text-xs font-semibold text-lime-accent hover:text-lime-accent-hover transition-colors cursor-pointer group"
          >
            <span>View All ({todayTasks.length})</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Completion Progress Bar */}
        <div className="w-full h-2 bg-graphite-700 rounded-full overflow-hidden mb-4 border border-border-subtle">
          <div
            className="h-full bg-lime-accent transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(132,204,22,0.4)]"
            style={{
              width: `${todaySummary.total > 0 ? Math.round((todaySummary.completed / todaySummary.total) * 100) : 0}%`,
            }}
          />
        </div>

        {/* Top 4 Priority Tasks */}
        {todayTasks.length === 0 ? (
          <div className="p-4 bg-graphite-700/50 rounded-xl border border-dashed border-border-default text-center text-xs text-text-muted mb-3 flex flex-col items-center justify-center space-y-2">
            <span>No daily tasks scheduled for today yet.</span>
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleSyncTodayRoutines}
                className="px-3 py-1 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Repeat className="w-3 h-3" />
                <span>Load Today's Routines</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange('daily-tasks')}
                className="px-3 py-1 bg-graphite-700 hover:bg-graphite-600 text-text-primary rounded-lg transition-colors cursor-pointer"
              >
                Open Daily Planner
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
            {todayTasks.slice(0, 4).map((task) => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task._id}
                  onClick={() => handleToggleAgendaTask(task)}
                  className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-graphite-900/40 border-border-default/40 opacity-70'
                      : 'bg-graphite-700/60 border-border-default hover:border-lime-accent/30 hover:bg-graphite-700'
                  }`}
                >
                  <button
                    type="button"
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone
                        ? 'bg-lime-accent border-lime-accent text-graphite-950 shadow-xs'
                        : 'border-border-default hover:border-lime-accent bg-graphite-800 text-transparent'
                    }`}
                  >
                    <Check className={`w-3 h-3 stroke-[3] ${isDone ? 'block' : 'hidden'}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium truncate ${
                        isDone ? 'line-through text-text-muted' : 'text-text-primary'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-text-muted">
                      {task.projectId?.title && (
                        <span className="truncate max-w-[120px] text-lime-accent">
                          {task.projectId.title}
                        </span>
                      )}
                      {task.startTime && (
                        <span className="font-mono text-lime-accent/90 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-lime-accent" /> {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                        </span>
                      )}
                      {task.estimatedMinutes > 0 && (
                        <span className="font-mono flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {task.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Add Agenda Task Form */}
        <form onSubmit={handleQuickAddAgendaTask} className="flex items-center space-x-2 pt-2 border-t border-border-subtle">
          <input
            type="text"
            value={agendaNewTitle}
            onChange={(e) => setAgendaNewTitle(e.target.value)}
            placeholder="Add a quick daily task for today..."
            className="flex-1 px-3 py-1.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-xs outline-none focus:border-lime-accent transition-all"
          />
          <button
            type="submit"
            disabled={isAddingAgendaTask || !agendaNewTitle.trim()}
            className="px-3 py-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>
      </section>

      {/* Main Grid: Active Focus & Review Banner */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-text-primary tracking-tight flex items-center">
              Active Focus
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-lime-accent/10 text-lime-accent border border-lime-accent/20 rounded-full">
                {activeProjects.length}/2 Active
              </span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">The hard cap. No extra pile-on.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-medium px-4 py-2.5 rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Track</span>
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="bg-graphite-800 border border-border-default rounded-2xl p-8 text-center max-w-xl mx-auto shadow-sm transition-colors duration-200">
            <FolderOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-text-primary">No active Tracks</h3>
            <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
              You currently have 0 active items. Activate a parked Track or start a new one to focus.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors duration-200"
            >
              Start New Track
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProjects.map((project) => (
              <div
                key={project._id}
                className="bg-graphite-800 border border-border-default rounded-2xl p-6 shadow-sm hover:bg-graphite-700 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full uppercase tracking-wider ${getCategoryColor(project.category)}`}>
                      {project.category}
                    </span>
                    {project.streakCount > 0 && (
                      <div className="flex items-center space-x-1 text-warning bg-warning/10 px-2 py-1 rounded-lg border border-warning/20">
                        <Flame className="w-4 h-4 fill-warning" />
                        <span className="text-xs font-bold">{project.streakCount}d streak</span>
                      </div>
                    )}
                  </div>

                  <h3
                    onClick={() => {
                      onSelectProjectId(project._id);
                      onViewChange('project-detail', project._id);
                    }}
                    className="font-heading font-bold text-lg text-text-primary hover:text-lime-accent cursor-pointer transition-colors leading-tight"
                  >
                    {project.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-2 line-clamp-2">{project.description || 'No description provided.'}</p>

                  <div className="mt-5 p-3.5 bg-graphite-700 border border-border-subtle rounded-xl">
                    <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                      Next Step
                    </span>
                    <p className="text-xs font-medium text-text-primary leading-relaxed">
                      {project.nextStep}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-border-subtle">
                  <span className="text-[10px] text-text-muted font-medium">
                    Touched {project.lastTouchedAt ? new Date(project.lastTouchedAt).toLocaleDateString() : 'never'}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    {activeTimer && activeTimer.projectId === project._id ? (
                      <button
                        onClick={() => stopTimer()}
                        className="bg-error/10 border border-error/20 hover:bg-error/20 text-error text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300 flex items-center space-x-1 cursor-pointer animate-pulse"
                        title="Stop Timer & Log Time"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop ({formatTime(secondsElapsed)})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startTimer(project._id, project.title)}
                        disabled={activeTimer !== null}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-300 flex items-center space-x-1 cursor-pointer ${
                          activeTimer
                            ? 'bg-graphite-800 border-border-default text-text-muted cursor-not-allowed opacity-50'
                            : 'bg-graphite-700 hover:bg-graphite-700/80 border-border-default hover:border-lime-accent/40 text-text-primary hover:text-lime-accent'
                        }`}
                        title={activeTimer ? 'A timer is already running' : 'Start Focus Timer'}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Focus</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setIsCheckInOpen(true);
                      }}
                      className="bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-300 shadow-sm flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check in</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weekly review prompt banner */}
      {reviewData && (reviewData.checkInsThisWeek.length > 0 || reviewData.longestParked.length > 0) && (
        <section className="mb-12 bg-gradient-to-tr from-graphite-800 to-graphite-800/70 border border-border-default rounded-2xl p-6 relative overflow-hidden transition-colors duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-lime-accent/5 rounded-full blur-lg"></div>
          
          <h3 className="font-heading font-bold text-sm text-text-primary uppercase tracking-wider flex items-center mb-3">
            <TrendingUp className="w-4 h-4 mr-1.5 text-lime-accent animate-bounce" /> Weekly review helper
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              You recorded <span className="font-bold text-text-primary">{reviewData.checkInsThisWeek.length} check-ins</span> this week.
            </p>
            {reviewData.longestParked.length > 0 && (
              <p className="text-xs text-text-secondary">
                📌 Longest parked without touches:{' '}
                <span className="font-semibold text-text-primary">
                  "{reviewData.longestParked[0].title}"
                </span>{' '}
                (since {new Date(reviewData.longestParked[0].lastTouchedAt || reviewData.longestParked[0].updatedAt).toLocaleDateString()}).
              </p>
            )}
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">
                Still focused on the right 2 things, or swap?
              </span>
              <button
                onClick={() => onViewChange('all-projects')}
                className="text-xs font-semibold text-lime-accent hover:text-lime-accent-hover hover:underline flex items-center transition-colors"
              >
                Manage Tracks <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Parked Projects & Someday List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Parked list (2/3 width on desktop) */}
        <section className="md:col-span-2">
          <h3 className="font-heading text-lg font-bold text-text-primary mb-4 flex items-center justify-between">
            <span>Parked ({parkedProjects.length})</span>
            <span className="text-xs text-text-muted font-normal">Visible, not nagged</span>
          </h3>

          {parkedProjects.length === 0 ? (
            <div className="bg-graphite-800 border border-dashed border-border-default rounded-2xl p-6 text-center text-text-muted text-xs">
              No parked Tracks.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {parkedProjects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => {
                    onSelectProjectId(project._id);
                    onViewChange('project-detail', project._id);
                  }}
                  className="bg-graphite-800 border border-border-default rounded-2xl p-4 hover:bg-graphite-700 hover:border-border-default cursor-pointer shadow-2xs hover:shadow-xs transition-all duration-300 flex justify-between items-center"
                >
                  <div className="min-w-0 pr-4">
                    <span className={`inline-block text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider mb-1.5 ${getCategoryColor(project.category)}`}>
                      {project.category}
                    </span>
                    <h4 className="font-semibold text-sm text-text-primary truncate">{project.title}</h4>
                    <p className="text-xs text-text-muted truncate mt-0.5">Next step: {project.nextStep || 'Not set'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Someday list (1/3 width on desktop) */}
        <section>
          <h3 className="font-heading text-lg font-bold text-text-primary mb-4">Someday ({somedayProjects.length})</h3>
          
          {somedayProjects.length === 0 ? (
            <div className="bg-graphite-800 border border-dashed border-border-default rounded-2xl p-6 text-center text-text-muted text-xs">
              No someday items.
            </div>
          ) : (
            <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 divide-y divide-border-subtle max-h-96 overflow-y-auto custom-scrollbar">
              {somedayProjects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => {
                    onSelectProjectId(project._id);
                    onViewChange('project-detail', project._id);
                  }}
                  className="py-2.5 hover:text-lime-accent cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <span className="text-xs text-text-primary font-medium truncate group-hover:text-lime-accent transition-colors">
                    {project.title}
                  </span>
                  <span className="text-[9px] text-text-muted font-normal capitalize">
                    {project.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Dialogs */}
      <CheckInModal
        project={selectedProject}
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setSelectedProject(null);
        }}
        onSuccess={handleCheckInSuccess}
      />

      <SwapModal
        isOpen={isSwapOpen}
        activeProjects={activeProjectsList}
        targetProjectName={swapTargetProject?.title}
        onSwap={handleSwap}
        onClose={() => {
          setIsSwapOpen(false);
          setSwapTargetProject(null);
        }}
      />

      {/* New Project Dialog */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-text-primary mb-4">Start New Track</h3>
            {createError && <div className="mb-4 text-xs bg-warning/10 border border-warning/20 text-warning p-3 rounded-xl">{createError}</div>}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Synth patch design"
                  required
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  {PROJECT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-graphite-800">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief context or goals..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  <option value="Parked" className="bg-graphite-800">Parked (Keep visible but inactive)</option>
                  <option value="Active" className="bg-graphite-800">Active (Bring to top of focus, max 2)</option>
                  <option value="Someday" className="bg-graphite-800">Someday</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Next Step {newStatus === 'Active' && <span className="text-warning font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="The single next concrete action"
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-sm font-medium rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default Dashboard;
