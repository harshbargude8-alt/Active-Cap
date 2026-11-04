import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { DailyTaskCard } from '../components/DailyTaskCard';
import { RoutinesModal } from '../components/RoutinesModal';
import { getCategoryColor } from '../constants/project';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Flame,
  CheckCircle2,
  Filter,
  Sparkles,
  RefreshCw,
  Sunrise,
  Sun,
  Moon,
  Zap,
  CheckSquare,
  AlertCircle,
  X,
  RotateCw,
  Folder,
  LayoutDashboard,
  Repeat
} from 'lucide-react';

// Format date to local YYYY-MM-DD
const formatDateToISOString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Pretty display format: "Wednesday, Nov 5, 2026"
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Relative indicator ("Today", "Yesterday", "Tomorrow", or null)
const getRelativeDateLabel = (dateStr) => {
  const today = formatDateToISOString(new Date());
  if (dateStr === today) return 'Today';

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (dateStr === formatDateToISOString(yesterdayDate)) return 'Yesterday';

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dateStr === formatDateToISOString(tomorrowDate)) return 'Tomorrow';

  return null;
};

export const DailyTasks = ({ onViewChange }) => {
  const { apiFetch } = useAuth();
  const { activeTimer, startTimer } = useTimer();

  const todayStr = formatDateToISOString(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    totalEstimatedMinutes: 0,
    totalActualMinutes: 0,
  });

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Rollover state
  const [unresolvedPastCount, setUnresolvedPastCount] = useState(0);
  const [isRollingOver, setIsRollingOver] = useState(false);

  // Recurring Routines state
  const [isRoutinesModalOpen, setIsRoutinesModalOpen] = useState(false);
  const [routinesCount, setRoutinesCount] = useState(0);
  const [isSyncingRoutines, setIsSyncingRoutines] = useState(false);

  // Filters & Grouping
  const [trackFilter, setTrackFilter] = useState('all'); // 'all', 'general', or projectId
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [groupBy, setGroupBy] = useState('timeSlot'); // 'timeSlot' or 'track'

  // Quick Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('anytime');
  const [newPriority, setNewPriority] = useState('medium');
  const [newEstMinutes, setNewEstMinutes] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState('anytime');
  const [editPriority, setEditPriority] = useState('medium');
  const [editEstMinutes, setEditEstMinutes] = useState(0);
  const [editDate, setEditDate] = useState('');

  const dateInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Load active projects for selection
  const loadProjects = useCallback(async () => {
    try {
      const res = await apiFetch('/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [apiFetch]);

  // Load routines count for header indicator
  const loadRoutinesCount = useCallback(async () => {
    try {
      const res = await apiFetch('/routines');
      if (res.ok) {
        const data = await res.json();
        setRoutinesCount(data.filter((r) => r.isActive).length);
      }
    } catch (err) {
      console.error('Failed to load routines count:', err);
    }
  }, [apiFetch]);

  // Quick sync active routines to currently selected date
  const handleSyncRoutinesNow = async () => {
    setIsSyncingRoutines(true);
    try {
      const res = await apiFetch('/routines/sync-to-date', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to sync routines');
      }
      const data = await res.json();
      showToast(data.message || `Routines synced to ${selectedDate}`);
      loadDailyTasks();
    } catch (err) {
      console.error('Sync routines error:', err);
      showToast(err.message || 'Failed to sync routines', 'error');
    } finally {
      setIsSyncingRoutines(false);
    }
  };

  // Check for unfinished tasks from previous days when viewing Today
  const checkPreviousUnfinished = useCallback(async () => {
    if (selectedDate !== todayStr) {
      setUnresolvedPastCount(0);
      return;
    }

    try {
      // Calculate yesterday date
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yesterdayStr = formatDateToISOString(yDate);

      const res = await apiFetch(`/daily-tasks?date=${yesterdayStr}&status=pending`);
      if (res.ok) {
        const data = await res.json();
        setUnresolvedPastCount(data.tasks?.length || 0);
      }
    } catch (err) {
      console.error('Failed to check unfinished tasks:', err);
    }
  }, [apiFetch, selectedDate, todayStr]);

  // Load Daily Tasks for the selected date
  const loadDailyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/daily-tasks?date=${selectedDate}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load tasks');
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      setSummary(data.summary || {
        total: 0,
        completed: 0,
        pending: 0,
        totalEstimatedMinutes: 0,
        totalActualMinutes: 0,
      });
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Error fetching tasks');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedDate]);

  useEffect(() => {
    loadProjects();
    loadRoutinesCount();
    const handleCheckinLogged = () => {
      loadDailyTasks();
    };
    window.addEventListener('project-checkin-logged', handleCheckinLogged);
    return () => window.removeEventListener('project-checkin-logged', handleCheckinLogged);
  }, [loadProjects, loadRoutinesCount, loadDailyTasks]);

  useEffect(() => {
    loadDailyTasks();
    checkPreviousUnfinished();
  }, [loadDailyTasks, checkPreviousUnfinished]);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const curr = new Date(year, month - 1, day);
    curr.setDate(curr.getDate() - 1);
    setSelectedDate(formatDateToISOString(curr));
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const curr = new Date(year, month - 1, day);
    curr.setDate(curr.getDate() + 1);
    setSelectedDate(formatDateToISOString(curr));
  };

  const handleJumpToday = () => {
    setSelectedDate(todayStr);
  };

  // Quick Add Task Submit
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        date: selectedDate,
        projectId: newProjectId ? newProjectId : null,
        timeSlot: newTimeSlot,
        priority: newPriority,
        estimatedMinutes: Number(newEstMinutes) || 0,
      };

      const res = await apiFetch('/daily-tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task');
      }

      const createdTask = await res.json();
      setTasks((prev) => [...prev, createdTask]);
      
      // Update summary counts locally
      setSummary((prev) => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1,
        totalEstimatedMinutes: prev.totalEstimatedMinutes + (createdTask.estimatedMinutes || 0),
      }));

      // Reset form
      setNewTitle('');
      showToast('Task added for ' + (getRelativeDateLabel(selectedDate) || selectedDate));
    } catch (err) {
      console.error('Create task error:', err);
      showToast(err.message || 'Failed to add task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimistic Toggle Task Status
  const handleToggleTask = async (task) => {
    const originalStatus = task.status;
    const nextStatus = originalStatus === 'completed' ? 'pending' : 'completed';

    // Optimistically update state
    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? {
              ...t,
              status: nextStatus,
              completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
            }
          : t
      )
    );

    setSummary((prev) => {
      const isNowCompleted = nextStatus === 'completed';
      return {
        ...prev,
        completed: isNowCompleted ? prev.completed + 1 : Math.max(0, prev.completed - 1),
        pending: isNowCompleted ? Math.max(0, prev.pending - 1) : prev.pending + 1,
      };
    });

    try {
      const res = await apiFetch(`/daily-tasks/${task._id}/toggle`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        throw new Error('Failed to toggle status');
      }
      const updated = await res.json();
      // Sync populated data
      setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
    } catch (err) {
      console.error('Toggle error:', err);
      showToast('Failed to update task. Reverting...', 'error');
      // Revert on failure
      loadDailyTasks();
    }
  };

  // Reschedule / Move to specific date (e.g. tomorrow)
  const handleRescheduleTask = async (task, targetDateStr) => {
    try {
      const res = await apiFetch(`/daily-tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ date: targetDateStr }),
      });

      if (!res.ok) {
        throw new Error('Failed to reschedule task');
      }

      // Remove from current view
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      setSummary((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        pending: task.status !== 'completed' ? Math.max(0, prev.pending - 1) : prev.pending,
        completed: task.status === 'completed' ? Math.max(0, prev.completed - 1) : prev.completed,
        totalEstimatedMinutes: Math.max(0, prev.totalEstimatedMinutes - (task.estimatedMinutes || 0)),
        totalActualMinutes: Math.max(0, prev.totalActualMinutes - (task.actualMinutes || 0)),
      }));

      showToast(`Task moved to ${formatDisplayDate(targetDateStr)}`);
    } catch (err) {
      console.error('Reschedule error:', err);
      showToast(err.message || 'Failed to move task', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await apiFetch(`/daily-tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }

      const taskToDelete = tasks.find((t) => t._id === taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));

      if (taskToDelete) {
        setSummary((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pending: taskToDelete.status !== 'completed' ? Math.max(0, prev.pending - 1) : prev.pending,
          completed: taskToDelete.status === 'completed' ? Math.max(0, prev.completed - 1) : prev.completed,
          totalEstimatedMinutes: Math.max(0, prev.totalEstimatedMinutes - (taskToDelete.estimatedMinutes || 0)),
          totalActualMinutes: Math.max(0, prev.totalActualMinutes - (taskToDelete.actualMinutes || 0)),
        }));
      }

      showToast('Task deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditProjectId(task.projectId?._id || task.projectId || '');
    setEditTimeSlot(task.timeSlot || 'anytime');
    setEditPriority(task.priority || 'medium');
    setEditEstMinutes(task.estimatedMinutes || 0);
    setEditDate(task.date || selectedDate);
  };

  // Save Edited Task
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      const payload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        projectId: editProjectId || null,
        timeSlot: editTimeSlot,
        priority: editPriority,
        estimatedMinutes: Number(editEstMinutes) || 0,
        date: editDate,
      };

      const res = await apiFetch(`/daily-tasks/${editingTask._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update task');
      }

      const updated = await res.json();

      if (editDate !== selectedDate) {
        // If task was moved to another date, remove from current view
        setTasks((prev) => prev.filter((t) => t._id !== editingTask._id));
        showToast(`Task updated & moved to ${formatDisplayDate(editDate)}`);
      } else {
        setTasks((prev) => prev.map((t) => (t._id === editingTask._id ? updated : t)));
        showToast('Task updated');
      }

      setEditingTask(null);
    } catch (err) {
      console.error('Update error:', err);
      showToast(err.message || 'Failed to save changes', 'error');
    }
  };

  // Rollover incomplete tasks from yesterday/previous
  const handleRollover = async () => {
    setIsRollingOver(true);
    try {
      const res = await apiFetch('/daily-tasks/rollover', {
        method: 'POST',
        body: JSON.stringify({ toDate: selectedDate }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to rollover tasks');
      }

      const data = await res.json();
      showToast(`Rolled over ${data.rolledOverCount} unfinished task(s) to Today!`);
      setUnresolvedPastCount(0);
      loadDailyTasks();
    } catch (err) {
      console.error('Rollover error:', err);
      showToast(err.message || 'Failed to carry over tasks', 'error');
    } finally {
      setIsRollingOver(false);
    }
  };

  // Start Focus Timer for a task
  const handleStartFocus = (task) => {
    const projId = task.projectId?._id || task.projectId || null;
    const projTitle = task.projectId?.title || 'General';
    // Start timer with project and task info
    startTimer(projId, `${task.title} (${projTitle})`, task._id);
    showToast(`Focus timer started for "${task.title}"`);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    // Status filter
    if (statusFilter === 'pending' && t.status === 'completed') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;

    // Track filter
    if (trackFilter === 'general') {
      if (t.projectId) return false;
    } else if (trackFilter !== 'all') {
      const pId = t.projectId?._id || t.projectId;
      if (pId !== trackFilter) return false;
    }

    return true;
  });

  // Calculate percentage
  const completionPercentage = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const relativeLabel = getRelativeDateLabel(selectedDate);

  // Group definitions
  const TIME_SLOTS = [
    { id: 'morning', label: 'Morning Routine', icon: Sunrise, color: 'text-amber-400' },
    { id: 'afternoon', label: 'Afternoon Deep Work', icon: Sun, color: 'text-yellow-400' },
    { id: 'evening', label: 'Evening Review & Wrap-up', icon: Moon, color: 'text-indigo-400' },
    { id: 'anytime', label: 'Anytime / Flexible', icon: Zap, color: 'text-lime-accent' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-slide-up border ${
            toast.type === 'error'
              ? 'bg-error/20 border-error/30 text-error'
              : 'bg-lime-accent/20 border-lime-accent/40 text-lime-accent bg-graphite-900/90 backdrop-blur-md'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-error/15 border border-error/30 text-error rounded-2xl flex items-center justify-between text-xs font-semibold animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadDailyTasks()}
            className="px-2.5 py-1 bg-error/20 hover:bg-error/30 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* 1. DATE SELECTOR & HEADER                                                   */}
      {/* --------------------------------------------------------------------------- */}
      <section className="bg-graphite-900 border border-border-default rounded-2xl p-5 mb-6 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Day & Relative Indicator */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-lime-accent/10 border border-lime-accent/20 flex items-center justify-center text-lime-accent flex-shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  {formatDisplayDate(selectedDate)}
                </h1>
                {relativeLabel && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-lime-accent text-graphite-950">
                    {relativeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Plan, prioritize, and check off routines across your active tracks.
              </p>
            </div>
          </div>

          {/* Right: Date Controls (< Today > Picker) & Routines Manager */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            {/* Recurring Routines Manager Button */}
            <button
              onClick={() => setIsRoutinesModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-graphite-800 hover:bg-graphite-700 border border-border-default hover:border-lime-accent/40 text-text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Manage Daily & Weekly Recurring Routines"
            >
              <Repeat className="w-3.5 h-3.5 text-lime-accent" />
              <span>Routines</span>
              {routinesCount > 0 && (
                <span className="text-[10px] bg-lime-accent/20 text-lime-accent px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {routinesCount}
                </span>
              )}
            </button>

            {/* Quick 1-Click Sync Routines to this Day */}
            {routinesCount > 0 && (
              <button
                onClick={handleSyncRoutinesNow}
                disabled={isSyncingRoutines}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-lime-accent/15 hover:bg-lime-accent text-lime-accent hover:text-graphite-950 border border-lime-accent/30 hover:border-lime-accent text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                title={`Sync active routines for ${formatDisplayDate(selectedDate)}`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncingRoutines ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncingRoutines ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}

            {onViewChange && (
              <button
                onClick={() => onViewChange('dashboard')}
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-graphite-800 hover:bg-graphite-700 border border-border-default text-text-muted hover:text-text-primary text-xs font-medium transition-all cursor-pointer"
                title="Back to Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            )}

            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-graphite-800 hover:bg-graphite-700 border border-border-default text-text-muted hover:text-text-primary transition-all cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {selectedDate !== todayStr && (
              <button
                onClick={handleJumpToday}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-graphite-800 hover:bg-lime-accent hover:text-graphite-950 border border-border-default transition-all text-text-primary cursor-pointer"
              >
                Today
              </button>
            )}

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-graphite-800 hover:bg-graphite-700 border border-border-default text-text-muted hover:text-text-primary transition-all cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Hidden native date picker with trigger button */}
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              />
              <button
                onClick={() => {
                  if (dateInputRef.current) {
                    if (dateInputRef.current.showPicker) {
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current.click();
                    }
                  }
                }}
                className="p-2 rounded-xl bg-graphite-800 hover:bg-graphite-700 border border-border-default text-text-muted hover:text-lime-accent transition-all cursor-pointer"
                title="Select Date"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------------- */}
        {/* 2. DAILY METRICS BAR                                                        */}
        {/* --------------------------------------------------------------------------- */}
        <div className="mt-5 pt-4 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Progress Pill & Bar */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-text-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-accent" />
                <span>
                  {summary.completed} of {summary.total} Completed
                </span>
              </span>
              <span className="text-lime-accent font-mono">{completionPercentage}%</span>
            </div>
            {/* Animated Progress Bar */}
            <div className="w-full h-2.5 bg-graphite-800 rounded-full overflow-hidden border border-border-default/60">
              <div
                className="h-full bg-lime-accent transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(132,204,22,0.4)]"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Time Summary */}
          <div className="flex items-center justify-start md:justify-end gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-1 font-mono bg-graphite-800 px-2.5 py-1.5 rounded-xl border border-border-default/60">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <span>{summary.totalEstimatedMinutes}m est</span>
            </div>
            <div className="flex items-center gap-1 font-mono bg-graphite-800 px-2.5 py-1.5 rounded-xl border border-border-default/60 text-lime-accent">
              <Flame className="w-3.5 h-3.5 fill-lime-accent text-lime-accent" />
              <span>{summary.totalActualMinutes}m logged</span>
            </div>
          </div>
        </div>

        {/* Rollover Alert Banner */}
        {selectedDate === todayStr && unresolvedPastCount > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center space-x-2 text-xs text-amber-300 font-medium">
              <RotateCw className="w-4 h-4 flex-shrink-0 animate-spin-reverse" />
              <span>
                You have <strong className="font-bold">{unresolvedPastCount}</strong> unfinished task(s) from yesterday.
              </span>
            </div>
            <button
              onClick={handleRollover}
              disabled={isRollingOver}
              className="self-start sm:self-auto px-3 py-1 bg-amber-400 hover:bg-amber-300 text-graphite-950 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRollingOver ? 'Rolling Over...' : 'Carry Over to Today'}
            </button>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------------------------- */}
      {/* 3. INLINE QUICK-ADD TASK BAR                                                */}
      {/* --------------------------------------------------------------------------- */}
      <section className="bg-graphite-900 border border-border-default rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to get done today? (e.g. '60m Krita silhouette study')"
              className="flex-1 px-4 py-2.5 bg-graphite-800 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-sm outline-none focus:border-lime-accent transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Quick Config Pills: Track, TimeSlot, Priority, Estimated Minutes */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Track Selector */}
            <div className="flex items-center space-x-1.5 bg-graphite-800 border border-border-default px-2.5 py-1 rounded-xl">
              <Folder className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="bg-transparent text-text-secondary text-xs outline-none cursor-pointer hover:text-text-primary"
              >
                <option value="" className="bg-graphite-900 text-text-primary">General (No Track)</option>
                {projects.map((proj) => (
                  <option key={proj._id} value={proj._id} className="bg-graphite-900 text-text-primary">
                    {proj.title} ({proj.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Time Slot Selector */}
            <div className="flex items-center space-x-1.5 bg-graphite-800 border border-border-default px-2.5 py-1 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                className="bg-transparent text-text-secondary text-xs outline-none cursor-pointer hover:text-text-primary capitalize"
              >
                <option value="morning" className="bg-graphite-900 text-text-primary">🌅 Morning</option>
                <option value="afternoon" className="bg-graphite-900 text-text-primary">☀️ Afternoon</option>
                <option value="evening" className="bg-graphite-900 text-text-primary">🌙 Evening</option>
                <option value="anytime" className="bg-graphite-900 text-text-primary">⚡ Anytime</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div className="flex items-center space-x-1.5 bg-graphite-800 border border-border-default px-2.5 py-1 rounded-xl">
              <span className="text-[10px] text-text-muted uppercase font-bold">Priority:</span>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="bg-transparent text-text-secondary text-xs outline-none cursor-pointer hover:text-text-primary capitalize"
              >
                <option value="high" className="bg-graphite-900 text-error">High</option>
                <option value="medium" className="bg-graphite-900 text-amber-400">Medium</option>
                <option value="low" className="bg-graphite-900 text-blue-400">Low</option>
              </select>
            </div>

            {/* Estimated Minutes Chips */}
            <div className="flex items-center space-x-1">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setNewEstMinutes(mins)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    newEstMinutes === mins
                      ? 'bg-lime-accent text-graphite-950 font-bold shadow-xs'
                      : 'bg-graphite-800 text-text-muted hover:text-text-primary hover:bg-graphite-700 border border-border-default'
                  }`}
                >
                  {mins}m
                </button>
              ))}
              <input
                type="number"
                min="0"
                step="5"
                value={newEstMinutes}
                onChange={(e) => setNewEstMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 px-2 py-1 bg-graphite-800 border border-border-default rounded-lg text-text-primary text-xs font-mono outline-none focus:border-lime-accent"
                title="Custom minutes"
              />
            </div>
          </div>
        </form>
      </section>

      {/* --------------------------------------------------------------------------- */}
      {/* 4. FILTERS & GROUPING TABS                                                  */}
      {/* --------------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {/* Track & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center p-1 bg-graphite-900 border border-border-default rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-lime-accent text-graphite-950 font-bold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-lime-accent text-graphite-950 font-bold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Pending ({summary.pending})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-lime-accent text-graphite-950 font-bold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Done ({summary.completed})
            </button>
          </div>

          {/* Project Track Dropdown Filter */}
          <div className="flex items-center bg-graphite-900 border border-border-default rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-text-muted mr-1.5" />
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="bg-transparent text-text-secondary outline-none cursor-pointer hover:text-text-primary text-xs"
            >
              <option value="all" className="bg-graphite-900">All Tracks</option>
              <option value="general" className="bg-graphite-900">General Tasks</option>
              {projects.map((proj) => (
                <option key={proj._id} value={proj._id} className="bg-graphite-900">
                  {proj.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grouping Toggle */}
        <div className="flex items-center self-end sm:self-auto bg-graphite-900 border border-border-default rounded-xl p-1 text-xs">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider px-2">Group By:</span>
          <button
            onClick={() => setGroupBy('timeSlot')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              groupBy === 'timeSlot'
                ? 'bg-graphite-700 text-lime-accent font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Time Slot
          </button>
          <button
            onClick={() => setGroupBy('track')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              groupBy === 'track'
                ? 'bg-graphite-700 text-lime-accent font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Track
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 5. TASK LIST & GROUPINGS                                                    */}
      {/* --------------------------------------------------------------------------- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-lime-accent" />
          <span className="text-xs text-text-muted font-medium">Gathering your daily schedule...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-graphite-900 border border-border-default rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <CheckSquare className="w-10 h-10 text-lime-accent/60 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-text-primary text-base">
            No tasks found for this view
          </h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-sm mx-auto">
            {tasks.length === 0
              ? 'No tasks scheduled for this day. Plan your day by adding one above, or take a well-deserved rest!'
              : 'No tasks match your active filters. Try changing or clearing the filters above.'}
          </p>

          {routinesCount > 0 && tasks.length === 0 && (
            <div className="mt-5 pt-4 border-t border-border-subtle flex flex-wrap items-center justify-center gap-2 animate-fade-in">
              <button
                onClick={handleSyncRoutinesNow}
                disabled={isSyncingRoutines}
                className="px-4 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncingRoutines ? 'animate-spin' : ''}`} />
                <span>Sync {routinesCount} Recurring Routine(s) to This Day</span>
              </button>
              <button
                onClick={() => setIsRoutinesModalOpen(true)}
                className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 text-text-primary text-xs font-semibold rounded-xl border border-border-default transition-all cursor-pointer"
              >
                Manage Routines
              </button>
            </div>
          )}
        </div>
      ) : groupBy === 'timeSlot' ? (
        /* Grouped by Time Slot */
        <div className="space-y-6">
          {TIME_SLOTS.map((slot) => {
            const slotTasks = filteredTasks.filter((t) => t.timeSlot === slot.id);
            if (slotTasks.length === 0) return null;
            const SlotIcon = slot.icon;

            return (
              <div key={slot.id} className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <SlotIcon className={`w-4 h-4 ${slot.color}`} />
                  <span>{slot.label}</span>
                  <span className="text-[10px] text-text-muted bg-graphite-800 border border-border-default px-2 py-0.5 rounded-full font-mono">
                    {slotTasks.filter((t) => t.status === 'completed').length}/{slotTasks.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {slotTasks.map((task) => (
                    <DailyTaskCard
                      key={task._id}
                      task={task}
                      onToggle={handleToggleTask}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteTask}
                      onReschedule={handleRescheduleTask}
                      onStartFocus={handleStartFocus}
                      isTimerActive={activeTimer && (activeTimer.taskId === task._id || activeTimer.projectTitle?.includes(task.title))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grouped by Track / Project */
        <div className="space-y-6">
          {/* Distinct project groupings */}
          {Array.from(new Set(filteredTasks.map((t) => t.projectId?._id || 'general'))).map((projKey) => {
            const trackTasks = filteredTasks.filter((t) => (t.projectId?._id || 'general') === projKey);
            const firstTask = trackTasks[0];
            const trackTitle = firstTask.projectId?.title || 'General Tasks';
            const trackCategory = firstTask.projectId?.category;

            return (
              <div key={projKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        trackCategory ? getCategoryColor(trackCategory) : 'bg-graphite-800 text-text-primary border-border-default'
                      }`}
                    >
                      {trackTitle}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono bg-graphite-800 px-2 py-0.5 rounded-full border border-border-default">
                      {trackTasks.filter((t) => t.status === 'completed').length}/{trackTasks.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {trackTasks.map((task) => (
                    <DailyTaskCard
                      key={task._id}
                      task={task}
                      onToggle={handleToggleTask}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteTask}
                      onReschedule={handleRescheduleTask}
                      onStartFocus={handleStartFocus}
                      isTimerActive={activeTimer && (activeTimer.taskId === task._id || activeTimer.projectTitle?.includes(task.title))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* 6. EDIT TASK MODAL                                                          */}
      {/* --------------------------------------------------------------------------- */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-graphite-900 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setEditingTask(null)}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-800 text-text-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-base text-text-primary mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-lime-accent" />
              <span>Edit Daily Task</span>
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-graphite-800 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Description / Sub-notes
                </label>
                <textarea
                  rows="2"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional details or checklists..."
                  className="w-full px-3.5 py-2 bg-graphite-800 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Track / Project
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-graphite-800 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent"
                  >
                    <option value="">General (No Track)</option>
                    {projects.map((proj) => (
                      <option key={proj._id} value={proj._id}>
                        {proj.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Time Slot
                  </label>
                  <select
                    value={editTimeSlot}
                    onChange={(e) => setEditTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-graphite-800 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent capitalize"
                  >
                    <option value="morning">🌅 Morning</option>
                    <option value="afternoon">☀️ Afternoon</option>
                    <option value="evening">🌙 Evening</option>
                    <option value="anytime">⚡ Anytime</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-graphite-800 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent capitalize"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Est. Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editEstMinutes}
                    onChange={(e) => setEditEstMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-graphite-800 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-graphite-800 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring Routines Modal */}
      <RoutinesModal
        isOpen={isRoutinesModalOpen}
        onClose={() => {
          setIsRoutinesModalOpen(false);
          loadRoutinesCount();
        }}
        projects={projects}
        currentDate={selectedDate}
        onRoutinesSynced={() => {
          loadDailyTasks();
          loadRoutinesCount();
        }}
      />
    </div>
  );
};
export default DailyTasks;
