import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { useCategories } from '../context/CategoriesContext';
import { QuickCapture } from '../components/QuickCapture';
import { CheckInModal } from '../components/CheckInModal';
import { SwapModal } from '../components/SwapModal';
import { getCategoryColor } from '../constants/project';
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
  Repeat,
  Archive,
  Zap,
  Star,
  BarChart2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Move,
} from 'lucide-react';

export const Dashboard = ({ onViewChange, onSelectProjectId }) => {
  const { apiFetch } = useAuth();
  const { activeTimer, secondsElapsed, formatTime, startTimer, stopTimer } = useTimer();
  const { categoryNames, openManageModal } = useCategories();

  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 86400000);
  };

  const formatCheckInDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    const datePart = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${datePart} · ${timeStr}`;
  };

  const getCheckInProject = (ci) => {
    if (ci.projectId && typeof ci.projectId === 'object') {
      return ci.projectId;
    }
    const pid = typeof ci.projectId === 'string' ? ci.projectId : ci.projectId?._id;
    if (pid) {
      const found = projects.find((p) => String(p._id) === String(pid));
      if (found) return found;
    }
    return null;
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

  // Weekly Review expanded state
  const [reviewExpanded, setReviewExpanded] = useState(false);

  // Status change loading state for parked/someday actions
  const [statusChanging, setStatusChanging] = useState(null);

  const loadData = useCallback(async () => {
    if (!clientCache.get('/projects')) {
      setLoading(true);
    }
    try {
      const todayStr = getTodayISO();
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

  // Change project status (Parked → Active, Parked → Someday, Someday → Parked, etc.)
  const handleChangeStatus = async (project, newStat) => {
    setStatusChanging(project._id);
    try {
      const res = await apiFetch(`/projects/${project._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStat, nextStep: project.nextStep }),
      });
      if (res.ok) {
        loadData();
      } else {
        const errData = await res.json();
        if (errData.capReached) {
          // Active cap hit – trigger swap
          setSwapTargetProject(project);
          setActiveProjectsList(errData.activeProjects);
          setIsSwapOpen(true);
        } else {
          alert(errData.error || 'Status change failed');
        }
      }
    } catch (err) {
      console.error('Status change error:', err);
    } finally {
      setStatusChanging(null);
    }
  };

  useEffect(() => {
    loadData();
    const handleCheckinLogged = () => {
      clientCache.invalidate('/review');
      clientCache.invalidate('/projects');
      loadData();
    };
    window.addEventListener('project-checkin-logged', handleCheckinLogged);
    return () => window.removeEventListener('project-checkin-logged', handleCheckinLogged);
  }, [loadData]);

  const handleCheckInSuccess = () => {
    clientCache.invalidate('/review');
    clientCache.invalidate('/projects');
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

  // Completion percent
  const completionPct = todaySummary.total > 0
    ? Math.round((todaySummary.completed / todaySummary.total) * 100)
    : 0;

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

      {/* ── ROW 1: Today's Agenda + Active Focus side by side ── */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Today's Agenda (3/5) ── */}
          <div className="lg:col-span-3 bg-graphite-800 border border-border-default rounded-2xl p-5 shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-accent/10 border border-lime-accent/20 flex items-center justify-center text-lime-accent flex-shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-heading text-base font-bold text-text-primary tracking-tight">
                      Today's Agenda
                    </h2>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-lime-accent/15 text-lime-accent border border-lime-accent/25">
                      {todaySummary.completed}/{todaySummary.total}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted">Routines & micro-deliverables</p>
                </div>
              </div>
              <button
                onClick={() => onViewChange('daily-tasks')}
                className="flex items-center space-x-1 text-[10px] font-semibold text-lime-accent hover:text-lime-accent-hover transition-colors cursor-pointer group flex-shrink-0"
              >
                <span>View All ({todayTasks.length})</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-graphite-700 rounded-full overflow-hidden mb-3 border border-border-subtle">
              <div
                className="h-full bg-lime-accent transition-all duration-500 rounded-full shadow-[0_0_6px_rgba(132,204,22,0.4)]"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            {/* Task List */}
            {todayTasks.length === 0 ? (
              <div className="flex-1 p-4 bg-graphite-700/50 rounded-xl border border-dashed border-border-default text-center text-xs text-text-muted flex flex-col items-center justify-center space-y-2">
                <span>No daily tasks scheduled for today yet.</span>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncTodayRoutines}
                    className="px-3 py-1 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Repeat className="w-3 h-3" />
                    <span>Load Routines</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewChange('daily-tasks')}
                    className="px-3 py-1 bg-graphite-700 hover:bg-graphite-600 text-text-primary rounded-lg transition-colors cursor-pointer"
                  >
                    Open Planner
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-1.5 mb-3 overflow-y-auto max-h-52 custom-scrollbar pr-1">
                {todayTasks.slice(0, 6).map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task._id}
                      onClick={() => onViewChange && onViewChange('task-detail', task._id, getTodayISO())}
                      className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer group ${
                        isDone
                          ? 'bg-graphite-700/40 border-border-default/30 opacity-60'
                          : 'bg-graphite-700/60 border-border-default hover:border-lime-accent/30 hover:bg-graphite-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAgendaTask(task);
                        }}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                          isDone
                            ? 'bg-lime-accent border-lime-accent text-graphite-950'
                            : 'border-border-default hover:border-lime-accent bg-graphite-800 text-transparent'
                        }`}
                      >
                        <Check className={`w-2.5 h-2.5 stroke-[3] ${isDone ? 'block' : 'hidden'}`} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-1.5 mt-0.5 text-[9px] text-text-muted">
                          {task.projectId?.title && (
                            <span className="truncate max-w-[100px] text-lime-accent">{task.projectId.title}</span>
                          )}
                          {task.startTime && (
                            <span className="font-mono flex items-center gap-0.5 text-lime-accent/80">
                              <Clock className="w-2 h-2" /> {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                            </span>
                          )}
                          {!task.startTime && task.estimatedMinutes > 0 && (
                            <span className="font-mono flex items-center gap-0.5">
                              <Clock className="w-2 h-2" /> {task.estimatedMinutes}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Add */}
            <form onSubmit={handleQuickAddAgendaTask} className="flex items-center space-x-2 pt-2.5 border-t border-border-subtle mt-auto">
              <input
                type="text"
                value={agendaNewTitle}
                onChange={(e) => setAgendaNewTitle(e.target.value)}
                placeholder="Quick add a task for today..."
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
          </div>

          {/* ── Active Focus (2/5) ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
                  Active Focus
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-lime-accent/10 text-lime-accent border border-lime-accent/20 rounded-full">
                    {activeProjects.length}/2
                  </span>
                </h2>
                <p className="text-[10px] text-text-muted mt-0.5">Hard cap. No pile-on.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center space-x-1 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {/* Active project cards */}
            {activeProjects.length === 0 ? (
              <div className="flex-1 bg-graphite-800 border border-dashed border-border-default rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-2 shadow-sm">
                <FolderOpen className="w-7 h-7 text-text-muted" />
                <p className="text-xs text-text-muted">No active tracks yet.</p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-1 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-[10px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-colors duration-200"
                >
                  Start Track
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeProjects.map((project) => (
                  <div
                    key={project._id}
                    className="bg-graphite-800 border border-border-default rounded-2xl p-4 shadow-sm hover:bg-graphite-700/80 transition-all duration-200 flex flex-col"
                  >
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryColor(project.category)}`}>
                        {project.category}
                      </span>
                      {project.streakCount > 0 && (
                        <div className="flex items-center space-x-0.5 text-warning bg-warning/10 px-1.5 py-0.5 rounded-lg border border-warning/20">
                          <Flame className="w-3 h-3 fill-warning" />
                          <span className="text-[9px] font-bold">{project.streakCount}d</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => {
                        onSelectProjectId(project._id);
                        onViewChange('project-detail', project._id);
                      }}
                      className="font-heading font-bold text-sm text-text-primary hover:text-lime-accent cursor-pointer transition-colors leading-tight mb-1.5"
                    >
                      {project.title}
                    </h3>

                    {/* Next step */}
                    <div className="px-2.5 py-1.5 bg-graphite-700 border border-border-subtle rounded-lg mb-3">
                      <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Next Step</span>
                      <p className="text-[10px] font-medium text-text-primary leading-snug line-clamp-2">{project.nextStep}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      <span className="text-[9px] text-text-muted">
                        {project.lastTouchedAt
                          ? `${daysSince(project.lastTouchedAt)}d ago`
                          : 'never touched'}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {activeTimer && activeTimer.projectId === project._id ? (
                          <button
                            onClick={() => stopTimer()}
                            className="bg-error/10 border border-error/20 hover:bg-error/20 text-error text-[10px] font-semibold px-2.5 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer animate-pulse"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>{formatTime(secondsElapsed)}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => startTimer(project._id, project.title)}
                            disabled={activeTimer !== null}
                            className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all flex items-center space-x-1 cursor-pointer ${
                              activeTimer
                                ? 'bg-graphite-800 border-border-default text-text-muted cursor-not-allowed opacity-50'
                                : 'bg-graphite-700 hover:bg-graphite-700/80 border-border-default hover:border-lime-accent/40 text-text-primary hover:text-lime-accent'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Focus</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setIsCheckInOpen(true);
                          }}
                          className="bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Check in</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ROW 2: Weekly Review ── */}
      {reviewData && (reviewData.checkInsThisWeek.length > 0 || reviewData.longestParked.length > 0) && (
        <section className="mb-6 bg-gradient-to-tr from-graphite-800 to-graphite-800/70 border border-border-default rounded-2xl overflow-hidden transition-colors duration-200">
          {/* Collapsed header – always visible */}
          <button
            onClick={() => setReviewExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-graphite-700/40 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-lime-accent" />
              <span className="font-heading font-bold text-sm text-text-primary uppercase tracking-wider">
                Weekly Review
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-lime-accent/10 text-lime-accent border border-lime-accent/20">
                {reviewData.checkInsThisWeek.length} check-ins this week
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[10px] text-text-muted hidden sm:block">
                Still on the right 2 things?
              </span>
              {reviewExpanded
                ? <ChevronUp className="w-4 h-4 text-text-muted" />
                : <ChevronDown className="w-4 h-4 text-text-muted" />}
            </div>
          </button>

          {/* Expanded body */}
          {reviewExpanded && (
            <div className="px-5 pb-5 border-t border-border-subtle">
              <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Stat: Check-ins */}
                <div className="bg-graphite-700/60 rounded-xl p-3 border border-border-subtle">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart2 className="w-4 h-4 text-lime-accent" />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">This Week</span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{reviewData.checkInsThisWeek.length}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">total check-ins logged</p>
                </div>

                {/* Stat: Longest Parked */}
                {reviewData.longestParked.length > 0 && (
                  <div className="bg-graphite-700/60 rounded-xl p-3 border border-warning/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Longest Parked</span>
                    </div>
                    <p className="text-sm font-bold text-text-primary truncate">"{reviewData.longestParked[0].title}"</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      since {new Date(reviewData.longestParked[0].lastTouchedAt || reviewData.longestParked[0].updatedAt).toLocaleDateString()}
                      {' · '}
                      {daysSince(reviewData.longestParked[0].lastTouchedAt || reviewData.longestParked[0].updatedAt)}d untouched
                    </p>
                  </div>
                )}

                {/* Stat: Active / focus health */}
                <div className="bg-graphite-700/60 rounded-xl p-3 border border-border-subtle">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4 text-lime-accent" />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Focus Slots</span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{activeProjects.length}<span className="text-sm text-text-muted font-normal">/2</span></p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {activeProjects.length < 2 ? `${2 - activeProjects.length} open slot${2 - activeProjects.length > 1 ? 's' : ''}` : 'Both slots filled'}
                  </p>
                </div>
              </div>

              {/* Recent check-ins list */}
              {reviewData.checkInsThisWeek.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Recent Check-ins</p>
                    <span className="text-[10px] text-text-muted font-medium">
                      Showing {Math.min(reviewData.checkInsThisWeek.length, 8)} of {reviewData.checkInsThisWeek.length} this week
                    </span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {reviewData.checkInsThisWeek.slice(0, 8).map((ci, i) => {
                      const proj = getCheckInProject(ci);
                      const title = proj?.title || ci.projectTitle || ci.project?.title || 'Track Check-in';
                      const category = proj?.category;
                      const projectId = proj?._id || (typeof ci.projectId === 'string' ? ci.projectId : null);
                      const minutes = ci.minutesSpent || ci.minutesLogged || 0;

                      return (
                        <div
                          key={ci._id || i}
                          onClick={() => {
                            if (projectId && onViewChange && onSelectProjectId) {
                              onSelectProjectId(projectId);
                              onViewChange('project-detail', projectId);
                            }
                          }}
                          className={`p-3 bg-graphite-700/50 hover:bg-graphite-700/80 border border-border-subtle rounded-xl transition-all duration-200 ${
                            projectId ? 'cursor-pointer group' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {category && (
                                <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${getCategoryColor(category)}`}>
                                  {category}
                                </span>
                              )}
                              <h4 className="text-xs font-bold text-text-primary group-hover:text-lime-accent truncate transition-colors">
                                {title}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-text-muted flex-shrink-0">
                              {minutes > 0 && (
                                <span className="font-mono text-lime-accent flex items-center gap-1 bg-lime-accent/10 border border-lime-accent/20 px-1.5 py-0.5 rounded">
                                  <Clock className="w-2.5 h-2.5" /> {minutes}m
                                </span>
                              )}
                              <span className="font-mono text-text-muted">
                                {formatCheckInDate(ci.date || ci.createdAt)}
                              </span>
                            </div>
                          </div>
                          {ci.note ? (
                            <p className="text-xs text-text-secondary leading-relaxed pl-0.5 mt-0.5 line-clamp-2">
                              {ci.note}
                            </p>
                          ) : (
                            <p className="text-[10px] text-text-muted italic pl-0.5 mt-0.5">
                              Check-in logged without note
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-medium text-text-primary">Still focused on the right 2 things, or swap?</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewChange('all-projects')}
                    className="text-xs font-semibold text-lime-accent hover:text-lime-accent-hover hover:underline flex items-center transition-colors"
                  >
                    Manage Tracks <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── ROW 3: Parked + Someday ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Parked list (2/3) */}
        <section className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-base font-bold text-text-primary flex items-center gap-2">
              <Archive className="w-4 h-4 text-text-muted" />
              Parked
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-graphite-700 border border-border-default text-text-muted">
                {parkedProjects.length}
              </span>
            </h3>
            <span className="text-[10px] text-text-muted font-normal">Visible, not nagged</span>
          </div>

          {parkedProjects.length === 0 ? (
            <div className="bg-graphite-800 border border-dashed border-border-default rounded-2xl p-6 text-center text-text-muted text-xs">
              No parked tracks. Park a project to keep it visible but out of active focus.
            </div>
          ) : (
            <div className="space-y-2.5">
              {parkedProjects.map((project) => {
                const daysOld = daysSince(project.lastTouchedAt || project.updatedAt);
                const isStale = daysOld !== null && daysOld > 14;
                return (
                  <div
                    key={project._id}
                    className={`bg-graphite-800 border rounded-2xl p-4 shadow-2xs transition-all duration-200 group ${
                      isStale ? 'border-warning/30 hover:border-warning/50' : 'border-border-default hover:border-border-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: info */}
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          onSelectProjectId(project._id);
                          onViewChange('project-detail', project._id);
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-block text-[8px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${getCategoryColor(project.category)}`}>
                            {project.category}
                          </span>
                          {isStale && (
                            <span className="text-[8px] font-bold text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                              <AlertTriangle className="w-2 h-2" /> {daysOld}d stale
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm text-text-primary group-hover:text-lime-accent truncate transition-colors">{project.title}</h4>
                        <p className="text-[10px] text-text-muted truncate mt-0.5">
                          Next: {project.nextStep || 'Not set'}
                        </p>
                        <p className="text-[9px] text-text-muted mt-0.5">
                          Last touched: {project.lastTouchedAt
                            ? `${daysOld}d ago (${new Date(project.lastTouchedAt).toLocaleDateString()})`
                            : 'never'}
                        </p>
                      </div>

                      {/* Right: actions */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {/* Activate */}
                        <button
                          onClick={() => handleChangeStatus(project, 'Active')}
                          disabled={statusChanging === project._id}
                          className="flex items-center space-x-1 text-[9px] font-bold px-2 py-1 bg-lime-accent/10 border border-lime-accent/25 text-lime-accent hover:bg-lime-accent hover:text-graphite-950 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          title="Activate this track"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>Activate</span>
                        </button>
                        {/* Move to Someday */}
                        <button
                          onClick={() => handleChangeStatus(project, 'Someday')}
                          disabled={statusChanging === project._id}
                          className="flex items-center space-x-1 text-[9px] font-bold px-2 py-1 bg-graphite-700 border border-border-default text-text-muted hover:text-text-primary hover:bg-graphite-600 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          title="Move to Someday"
                        >
                          <Star className="w-2.5 h-2.5" />
                          <span>Someday</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Someday list (1/3) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-base font-bold text-text-primary flex items-center gap-2">
              <Star className="w-4 h-4 text-text-muted" />
              Someday
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-graphite-700 border border-border-default text-text-muted">
                {somedayProjects.length}
              </span>
            </h3>
          </div>

          {somedayProjects.length === 0 ? (
            <div className="bg-graphite-800 border border-dashed border-border-default rounded-2xl p-6 text-center text-text-muted text-xs">
              No someday items. Ideas you're not ready to commit to.
            </div>
          ) : (
            <div className="bg-graphite-800 border border-border-default rounded-2xl p-3 divide-y divide-border-subtle max-h-80 overflow-y-auto custom-scrollbar">
              {somedayProjects.map((project) => (
                <div key={project._id} className="py-2.5 group">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        onSelectProjectId(project._id);
                        onViewChange('project-detail', project._id);
                      }}
                    >
                      <span className="text-xs text-text-primary font-medium truncate block group-hover:text-lime-accent transition-colors">
                        {project.title}
                      </span>
                      <span className="text-[9px] text-text-muted capitalize">{project.category}</span>
                    </div>
                    {/* Move to Parked */}
                    <button
                      onClick={() => handleChangeStatus(project, 'Parked')}
                      disabled={statusChanging === project._id}
                      className="flex items-center space-x-0.5 text-[8px] font-bold px-1.5 py-1 bg-graphite-700 border border-border-default text-text-muted hover:text-lime-accent hover:border-lime-accent/30 rounded-lg transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                      title="Move to Parked"
                    >
                      <Move className="w-2.5 h-2.5" />
                      <span>Park</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ── */}
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider">Category</label>
                  <button
                    type="button"
                    onClick={openManageModal}
                    className="text-[10px] font-semibold text-lime-accent hover:text-lime-accent-hover transition-colors cursor-pointer"
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    if (e.target.value === '__manage__') {
                      openManageModal();
                      return;
                    }
                    setNewCategory(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  {categoryNames.map((cat) => (
                    <option key={cat} value={cat} className="bg-graphite-800">{cat}</option>
                  ))}
                  <option disabled className="bg-graphite-800">──────────</option>
                  <option value="__manage__" className="bg-graphite-800 text-lime-accent font-semibold">⚙️ Manage Categories...</option>
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

      {/* ── Quick Capture: fixed bottom-right corner ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <QuickCapture onSuccess={loadData} compact />
      </div>
    </div>
  );
};

export default Dashboard;
