import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { getCategoryColor } from '../constants/project';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  Play,
  Square,
  Repeat,
  Folder,
  Tag,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  CheckSquare,
  Plus,
  X,
  Check,
  RotateCw,
  ExternalLink,
  Copy,
  Sunrise,
  Sun,
  Moon,
  Zap,
  ArrowRight
} from 'lucide-react';

// Format YYYY-MM-DD to "Thursday, Nov 5, 2026"
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
  if (!dateStr) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  if (dateStr === today) return 'Today';

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
  if (dateStr === yStr) return 'Yesterday';

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
  if (dateStr === tStr) return 'Tomorrow';

  return null;
};

// Calculate difference in minutes between HH:MM strings
const calculateDiffMinutes = (start, end) => {
  if (!start || !end) return null;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff < 0) diff += 24 * 60;
  return diff > 0 ? diff : null;
};

export const TaskDetail = ({ taskId, onViewChange, fallbackDate }) => {
  const { apiFetch } = useAuth();
  const { activeTimer, startTimer, stopTimer, secondsElapsed, formatTime } = useTimer();

  const [task, setTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState('anytime');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editEstMinutes, setEditEstMinutes] = useState(25);
  const [isSaving, setIsSaving] = useState(false);

  // Subtask addition state
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy feedback state
  const [copiedDescription, setCopiedDescription] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Task and Projects Data
  const loadTaskData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [taskRes, projRes] = await Promise.all([
        apiFetch(`/daily-tasks/${taskId}`),
        apiFetch('/projects'),
      ]);

      if (!taskRes.ok) {
        throw new Error('Task not found or could not be loaded');
      }

      const taskData = await taskRes.json();
      setTask(taskData);

      // Pre-fill edit fields
      setEditTitle(taskData.title || '');
      setEditDescription(taskData.description || '');
      setEditDate(taskData.date || '');
      setEditProjectId(taskData.projectId?._id || taskData.projectId || '');
      setEditTimeSlot(taskData.timeSlot || 'anytime');
      setEditStartTime(taskData.startTime || '');
      setEditEndTime(taskData.endTime || '');
      setEditPriority(taskData.priority || 'medium');
      setEditEstMinutes(taskData.estimatedMinutes || 25);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [taskId, apiFetch]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  // Handle Toggle Completion
  const handleToggleTaskStatus = async () => {
    if (!task) return;
    try {
      const res = await apiFetch(`/daily-tasks/${task._id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        showToast(updated.status === 'completed' ? 'Task marked as completed!' : 'Task marked as pending');
      }
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      showToast('Failed to update task status', 'error');
    }
  };

  // Handle Save Edit Form
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editTitle.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        date: editDate,
        projectId: editProjectId || null,
        timeSlot: editTimeSlot,
        startTime: editStartTime,
        endTime: editEndTime,
        priority: editPriority,
        estimatedMinutes: Number(editEstMinutes) || 0,
      };

      const res = await apiFetch(`/daily-tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update task');
      }

      const updated = await res.json();
      setTask(updated);
      setIsEditing(false);
      showToast('Task details saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message || 'Failed to save task', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Toggle Subtask Checklist Item
  const handleToggleSubtask = async (subtaskIndex, subtaskId) => {
    if (!task) return;
    try {
      const res = await apiFetch(`/daily-tasks/${task._id}/checklist-toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ index: subtaskIndex, subtaskId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      showToast('Failed to update subtask', 'error');
    }
  };

  // Handle Add Subtask Checklist Item
  const handleAddSubtask = async (e) => {
    if (e) e.preventDefault();
    if (!newSubtaskText.trim() || !task) return;

    const updatedChecklist = [
      ...(task.checklist || []),
      { text: newSubtaskText.trim(), completed: false },
    ];

    try {
      const res = await apiFetch(`/daily-tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ checklist: updatedChecklist }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        setNewSubtaskText('');
        setIsAddingSubtask(false);
        showToast('Subtask added');
      }
    } catch (err) {
      console.error('Failed to add subtask:', err);
      showToast('Failed to add subtask', 'error');
    }
  };

  // Handle Delete Subtask Checklist Item
  const handleDeleteSubtask = async (indexToRemove) => {
    if (!task) return;
    const updatedChecklist = task.checklist.filter((_, idx) => idx !== indexToRemove);
    try {
      const res = await apiFetch(`/daily-tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ checklist: updatedChecklist }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        showToast('Subtask removed');
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      showToast('Failed to delete subtask', 'error');
    }
  };

  // Handle Quick Add Logged Focus Minutes
  const handleQuickAddMinutes = async (minsToAdd) => {
    if (!task) return;
    const newTotal = (task.actualMinutes || 0) + minsToAdd;
    try {
      const res = await apiFetch(`/daily-tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ actualMinutes: newTotal }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        showToast(`Added +${minsToAdd}m focus time!`);
      }
    } catch (err) {
      console.error('Failed to add focus minutes:', err);
      showToast('Failed to log time', 'error');
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/daily-tasks/${task._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Task deleted');
        setTimeout(() => {
          if (onViewChange) {
            onViewChange('daily-tasks', task.date || fallbackDate);
          }
        }, 500);
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (err) {
      console.error('Delete task error:', err);
      showToast(err.message || 'Failed to delete task', 'error');
      setIsDeleting(false);
    }
  };

  // Handle Copy Description
  const handleCopyDescription = () => {
    if (!task?.description) return;
    navigator.clipboard.writeText(task.description);
    setCopiedDescription(true);
    showToast('Description copied to clipboard');
    setTimeout(() => setCopiedDescription(false), 2500);
  };

  // Timer helpers
  const isThisTaskTimerActive = activeTimer && (activeTimer.taskId === task?._id || activeTimer.projectTitle?.includes(task?.title));

  const handleFocusTimerToggle = () => {
    if (!task) return;
    if (isThisTaskTimerActive) {
      stopTimer();
    } else {
      const targetProjId = task.projectId?._id || task.projectId || 'daily-task';
      const targetTitle = task.title;
      startTimer(targetProjId, targetTitle, task._id);
      showToast(`Focus session started for "${task.title}"`);
    }
  };

  // Time Slot info helper
  const getTimeSlotBadge = (slot) => {
    switch (slot) {
      case 'morning':
        return { label: 'Morning Routine', icon: Sunrise, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' };
      case 'afternoon':
        return { label: 'Afternoon Deep Work', icon: Sun, color: 'text-amber-500 dark:text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25' };
      case 'evening':
        return { label: 'Evening Review', icon: Moon, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25' };
      case 'anytime':
      default:
        return { label: 'Anytime / Flexible', icon: Zap, color: 'text-lime-accent', bg: 'bg-lime-accent/10 border-lime-accent/25' };
    }
  };

  // Priority badge helper
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return { label: 'High Priority', classes: 'bg-error/10 text-error border-error/25', dot: 'bg-error' };
      case 'low':
        return { label: 'Low Priority', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25', dot: 'bg-blue-500 dark:bg-blue-400' };
      case 'medium':
      default:
        return { label: 'Medium Priority', classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-xs text-text-muted font-medium">Loading task details...</span>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => onViewChange && onViewChange('daily-tasks', fallbackDate)}
          className="inline-flex items-center space-x-1.5 text-xs text-text-muted hover:text-text-primary mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Daily Tasks</span>
        </button>
        <div className="bg-graphite-800 border border-error/30 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
          <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-text-primary text-base">Unable to load task</h3>
          <p className="text-xs text-text-muted mt-1 mb-5">{error || 'Task could not be found.'}</p>
          <button
            onClick={() => loadTaskData()}
            className="px-4 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = task.status === 'completed';
  const relativeDateLabel = getRelativeDateLabel(task.date);
  const timeSlotInfo = getTimeSlotBadge(task.timeSlot);
  const TimeSlotIcon = timeSlotInfo.icon;
  const priorityInfo = getPriorityBadge(task.priority);
  const projectTitle = task.projectId?.title || (task.projectId ? 'Project' : null);
  const projectCategory = task.projectId?.category;
  const subtasksCount = task.checklist?.length || 0;
  const completedSubtasksCount = task.checklist?.filter((item) => item.completed).length || 0;
  const subtasksPercentage = subtasksCount > 0 ? Math.round((completedSubtasksCount / subtasksCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-slide-up border ${
            toast.type === 'error'
              ? 'bg-error/20 border-error/30 text-error'
              : 'bg-lime-accent/20 border-lime-accent/40 text-lime-accent bg-graphite-800/95 backdrop-blur-md'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar: Back & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button
          onClick={() => onViewChange && onViewChange('daily-tasks', task.date || fallbackDate)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-700 border border-border-default text-text-muted hover:text-text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs self-start"
          title={`Return to Daily Planner for ${formatDisplayDate(task.date)}`}
        >
          <ArrowLeft className="w-4 h-4 text-lime-accent" />
          <span>Back to Daily Tasks ({formatDisplayDate(task.date)})</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {/* Focus Timer Button */}
          <button
            onClick={handleFocusTimerToggle}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isThisTaskTimerActive
                ? 'bg-lime-accent text-graphite-950 animate-pulse ring-2 ring-lime-accent/50'
                : 'bg-lime-accent/15 hover:bg-lime-accent text-lime-accent hover:text-graphite-950 border border-lime-accent/30 hover:border-lime-accent'
            }`}
            title={isThisTaskTimerActive ? 'Stop focus timer' : 'Start Focus Session for this task'}
          >
            {isThisTaskTimerActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Timer Active ({formatTime(secondsElapsed)})</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isEditing
                ? 'bg-lime-accent text-graphite-950 border-lime-accent shadow-xs'
                : 'bg-graphite-800 hover:bg-graphite-700 text-text-secondary hover:text-text-primary border-border-default shadow-xs'
            }`}
            title={isEditing ? 'Cancel editing' : 'Edit task details'}
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete Task Button */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-xl bg-graphite-800 hover:bg-error/15 border border-border-default hover:border-error/30 text-text-muted hover:text-error transition-all cursor-pointer shadow-xs"
            title="Delete this task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Task Header Card */}
      <section className="bg-graphite-800 border border-border-default rounded-2xl p-6 sm:p-7 mb-6 shadow-sm transition-colors duration-200">
        <div className="flex items-start gap-4">
          {/* Checkbox toggle status */}
          <button
            type="button"
            onClick={handleToggleTaskStatus}
            aria-label={isCompleted ? 'Mark task as pending' : 'Mark task as completed'}
            className={`mt-1 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0 ${
              isCompleted
                ? 'bg-lime-accent border-lime-accent text-graphite-950 scale-100 shadow-sm'
                : 'border-border-default hover:border-lime-accent bg-graphite-700 hover:bg-lime-accent/10 text-transparent'
            }`}
            title={isCompleted ? 'Completed! Click to mark pending' : 'Click to complete task'}
          >
            <Check className={`w-4 h-4 stroke-[3] transition-transform duration-200 ${isCompleted ? 'scale-100' : 'scale-0'}`} />
          </button>

          {/* Title & Metadata */}
          <div className="flex-1 min-w-0">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Status Pill */}
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-lime-accent/20 text-lime-accent border border-lime-accent/30'
                    : 'bg-graphite-700 text-text-muted border border-border-default'
                }`}
              >
                {isCompleted ? 'Completed' : 'Pending'}
              </span>

              {/* Associated Track Badge */}
              {projectTitle ? (
                <button
                  type="button"
                  onClick={() => onViewChange && onViewChange('project-detail', task.projectId?._id || task.projectId)}
                  className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all cursor-pointer hover:brightness-110 flex items-center space-x-1 ${
                    projectCategory ? getCategoryColor(projectCategory) : 'bg-lime-accent/10 text-lime-accent border-lime-accent/20'
                  }`}
                  title={`View project track: ${projectTitle}`}
                >
                  <Folder className="w-3 h-3" />
                  <span>{projectTitle}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </button>
              ) : (
                <span className="text-[10px] font-semibold text-text-muted bg-graphite-700/80 border border-border-default px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  General (No Track)
                </span>
              )}

              {/* Priority Pill */}
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${priorityInfo.classes}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
                <span>{priorityInfo.label}</span>
              </span>

              {/* Routine Indicator */}
              {(task.source === 'routine' || task.routineId) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-lime-accent bg-lime-accent/10 border border-lime-accent/25 px-2.5 py-0.5 rounded-full">
                  <Repeat className="w-3 h-3" />
                  <span>Automated Routine</span>
                </span>
              )}

              {/* Rollover Indicator */}
              {task.source === 'rollover' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                  <RotateCw className="w-3 h-3" />
                  <span>Rolled Over</span>
                </span>
              )}
            </div>

            {/* Task Title (Editable or View) */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-2 space-y-3">
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-base font-heading font-semibold outline-none focus:border-lime-accent transition-all"
                  placeholder="Task title..."
                />
              </form>
            ) : (
              <h1
                className={`font-heading text-xl sm:text-2xl font-bold tracking-tight text-text-primary leading-tight ${
                  isCompleted ? 'line-through text-text-muted' : ''
                }`}
              >
                {task.title}
              </h1>
            )}

            {/* Sub-meta details bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border-subtle text-xs text-text-muted">
              {/* Date */}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-lime-accent" />
                <span className="font-medium text-text-secondary">{formatDisplayDate(task.date)}</span>
                {relativeDateLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full uppercase bg-lime-accent text-graphite-950 font-mono">
                    {relativeDateLabel}
                  </span>
                )}
              </div>

              {/* Time Slot */}
              <div className="flex items-center space-x-1.5">
                <TimeSlotIcon className={`w-3.5 h-3.5 ${timeSlotInfo.color}`} />
                <span className="capitalize text-text-secondary">{timeSlotInfo.label}</span>
              </div>

              {/* Scheduled Time Window */}
              {task.startTime && (
                <div className="flex items-center space-x-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-secondary">
                    {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                  </span>
                </div>
              )}

              {/* Estimated Minutes */}
              <div className="flex items-center space-x-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span>{task.estimatedMinutes || 0}m estimated</span>
              </div>

              {/* Logged Minutes */}
              <div className="flex items-center space-x-1 text-lime-accent font-mono font-semibold">
                <Flame className="w-3.5 h-3.5 fill-lime-accent" />
                <span>{task.actualMinutes || 0}m logged</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Form Drawer / Details Configuration Form */}
      {isEditing && (
        <section className="bg-graphite-800 border border-lime-accent/40 rounded-2xl p-6 mb-6 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
            <h3 className="font-heading font-bold text-sm text-text-primary flex items-center space-x-2">
              <Edit2 className="w-4 h-4 text-lime-accent" />
              <span>Edit Task Settings</span>
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project / Track */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Project Track
                </label>
                <select
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent"
                >
                  <option value="">General (No Track)</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slot */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Time Slot
                </label>
                <select
                  value={editTimeSlot}
                  onChange={(e) => setEditTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent capitalize"
                >
                  <option value="morning">🌅 Morning</option>
                  <option value="afternoon">☀️ Afternoon</option>
                  <option value="evening">🌙 Evening</option>
                  <option value="anytime">⚡ Anytime</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => {
                    setEditStartTime(e.target.value);
                    const diff = calculateDiffMinutes(e.target.value, editEndTime);
                    if (diff) setEditEstMinutes(diff);
                  }}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => {
                    setEditEndTime(e.target.value);
                    const diff = calculateDiffMinutes(editStartTime, e.target.value);
                    if (diff) setEditEstMinutes(diff);
                  }}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent capitalize"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              {/* Estimated Minutes */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Estimated Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={editEstMinutes}
                  onChange={(e) => setEditEstMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary outline-none focus:border-lime-accent font-mono"
                />
              </div>
            </div>

            {/* Description Textarea in Edit Mode */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                Description & Detailed Execution Notes
              </label>
              <textarea
                rows={6}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter instructions, notes, bullet points, or reference checklists..."
                className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs font-mono outline-none focus:border-lime-accent transition-all resize-y leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Description / Sprint Plan Card */}
      <section className="bg-graphite-800 border border-border-default rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-lime-accent" />
            <h2 className="font-heading font-semibold text-sm text-text-primary">
              Task Notes & Execution Plan
            </h2>
          </div>

          {task.description && (
            <button
              onClick={handleCopyDescription}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-text-muted hover:text-text-primary text-[11px] font-medium transition-colors cursor-pointer"
              title="Copy notes to clipboard"
            >
              {copiedDescription ? (
                <>
                  <Check className="w-3.5 h-3.5 text-lime-accent" />
                  <span className="text-lime-accent">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {task.description ? (
          <div className="bg-graphite-700/50 border border-border-default/60 rounded-xl p-4 text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar max-h-96">
            {task.description}
          </div>
        ) : (
          <div className="p-6 bg-graphite-700/30 border border-dashed border-border-default rounded-xl text-center">
            <p className="text-xs text-text-muted">No description or notes provided for this task.</p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-2 text-xs font-semibold text-lime-accent hover:underline cursor-pointer"
            >
              + Add notes & execution details
            </button>
          </div>
        )}
      </section>

      {/* Subtasks / Checklist Card */}
      <section className="bg-graphite-800 border border-border-default rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-lime-accent" />
            <h2 className="font-heading font-semibold text-sm text-text-primary">
              Subtask Checklist ({completedSubtasksCount}/{subtasksCount})
            </h2>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-text-muted">Add preset:</span>
            {[
              '15m Tutorial & Study',
              '15m Technical Drill',
              '25m Sprint Session',
              '5m Review & Notes',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={async () => {
                  const updatedChecklist = [
                    ...(task.checklist || []),
                    { text: preset, completed: false },
                  ];
                  try {
                    const res = await apiFetch(`/daily-tasks/${task._id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ checklist: updatedChecklist }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setTask(updated);
                      showToast(`Added "${preset}"`);
                    }
                  } catch (err) {
                    console.error('Error adding preset:', err);
                  }
                }}
                className="text-[10px] font-medium bg-graphite-700 hover:bg-lime-accent/20 hover:text-lime-accent border border-border-default px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                + {preset.split(' ')[0]} {preset.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar if items exist */}
        {subtasksCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-text-secondary">{completedSubtasksCount} of {subtasksCount} completed</span>
              <span className="text-lime-accent font-mono font-bold">{subtasksPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-graphite-700 rounded-full overflow-hidden border border-border-default/50">
              <div
                className="h-full bg-lime-accent transition-all duration-300 rounded-full"
                style={{ width: `${subtasksPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Subtask list */}
        <div className="space-y-2 mb-4">
          {task.checklist && task.checklist.length > 0 ? (
            task.checklist.map((item, idx) => (
              <div
                key={item._id || idx}
                onClick={() => handleToggleSubtask(idx, item._id)}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  item.completed
                    ? 'bg-graphite-700/40 border-border-default/40 opacity-75'
                    : 'bg-graphite-700/60 hover:bg-graphite-700 border-border-default'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-lime-accent border-lime-accent text-graphite-950 shadow-2xs'
                        : 'border-border-default bg-graphite-800'
                    }`}
                  >
                    {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs text-text-primary leading-snug break-words ${
                      item.completed ? 'line-through text-text-muted' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSubtask(idx);
                  }}
                  className="p-1 text-text-muted hover:text-error transition-colors cursor-pointer"
                  title="Remove subtask"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-4 bg-graphite-700/30 rounded-xl text-center text-xs text-text-muted border border-dashed border-border-default">
              No subtasks created for this task yet.
            </div>
          )}
        </div>

        {/* Add new subtask input form */}
        <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            placeholder="Add new subtask item (e.g. '15m Outline research', press Enter)..."
            className="flex-1 px-3.5 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent transition-all"
          />
          <button
            type="submit"
            disabled={!newSubtaskText.trim()}
            className="px-4 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            Add Subtask
          </button>
        </form>
      </section>

      {/* Focus & Manual Time Logging Card */}
      <section className="bg-graphite-800 border border-border-default rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-lime-accent" />
            <h2 className="font-heading font-semibold text-sm text-text-primary">
              Focus & Time Investment
            </h2>
          </div>
          <span className="font-mono text-xs text-lime-accent font-semibold">
            {task.actualMinutes || 0}m Total Logged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Left: Focus Timer Status */}
          <div className="p-4 bg-graphite-700/50 rounded-xl border border-border-default/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-primary">Interactive Focus Timer</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {isThisTaskTimerActive
                  ? `Focusing on this task... (${formatTime(secondsElapsed)})`
                  : 'Start a session to track actual minutes automatically.'}
              </p>
            </div>
            <button
              onClick={handleFocusTimerToggle}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isThisTaskTimerActive
                  ? 'bg-error text-white'
                  : 'bg-lime-accent hover:bg-lime-accent-hover text-graphite-950'
              }`}
            >
              {isThisTaskTimerActive ? 'Stop' : 'Start'}
            </button>
          </div>

          {/* Right: Quick Manual Logging */}
          <div className="p-4 bg-graphite-700/50 rounded-xl border border-border-default/60">
            <p className="text-xs font-semibold text-text-primary mb-2">Manual Time Adjustment</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[15, 25, 30, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleQuickAddMinutes(mins)}
                  className="px-2.5 py-1 bg-graphite-700 hover:bg-lime-accent hover:text-graphite-950 text-text-secondary text-xs font-mono font-medium rounded-lg border border-border-default transition-all cursor-pointer"
                  title={`Add ${mins} minutes to this task`}
                >
                  +{mins}m
                </button>
              ))}
              <button
                onClick={() => {
                  const custom = prompt('Enter total actual minutes spent on this task:', task.actualMinutes || 0);
                  if (custom !== null) {
                    const parsed = parseInt(custom, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                      apiFetch(`/daily-tasks/${task._id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ actualMinutes: parsed }),
                      }).then(async (res) => {
                        if (res.ok) {
                          const updated = await res.json();
                          setTask(updated);
                          showToast('Actual time updated');
                        }
                      });
                    }
                  }
                }}
                className="px-2 py-1 bg-graphite-700 hover:bg-graphite-600 text-text-muted hover:text-text-primary text-[11px] rounded-lg border border-border-default cursor-pointer transition-colors"
              >
                Set Total
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-graphite-800 border border-border-default w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-scale-up">
            <div className="w-10 h-10 rounded-2xl bg-error/15 border border-error/30 flex items-center justify-center text-error mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-center text-base text-text-primary mb-1">
              Delete Daily Task?
            </h3>
            <p className="text-xs text-text-muted text-center leading-relaxed mb-5">
              Are you sure you want to delete <strong className="text-text-primary">"{task.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-graphite-700 hover:bg-graphite-600 text-text-secondary hover:text-text-primary border border-border-default transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-error hover:brightness-110 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;

