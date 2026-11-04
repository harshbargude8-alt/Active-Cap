import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { getCategoryColor } from '../constants/project';
import {
  X,
  Plus,
  Repeat,
  Trash2,
  Edit3,
  AlertCircle,
  Sparkles,
  Power,
  RotateCw
} from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const RoutinesModal = ({
  isOpen,
  onClose,
  projects = [],
  currentDate,
  onRoutinesSynced,
}) => {
  const { apiFetch } = useAuth();

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State (for both create and edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState(DAYS_OF_WEEK);
  const [timeSlot, setTimeSlot] = useState('morning');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadRoutines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/routines');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load routines');
      }
      const data = await res.json();
      setRoutines(data);
    } catch (err) {
      console.error('Error loading routines:', err);
      setError(err.message || 'Error loading routines');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (isOpen) {
      loadRoutines();
    }
  }, [isOpen, loadRoutines]);

  const resetForm = () => {
    setEditingRoutineId(null);
    setTitle('');
    setDescription('');
    setProjectId('');
    setFrequency('daily');
    setDaysOfWeek(DAYS_OF_WEEK);
    setTimeSlot('morning');
    setEstimatedMinutes(30);
    setPriority('medium');
    setIsFormOpen(false);
  };

  const handleFrequencyChange = (freq) => {
    setFrequency(freq);
    if (freq === 'daily') {
      setDaysOfWeek(DAYS_OF_WEEK);
    } else if (freq === 'weekdays') {
      setDaysOfWeek(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else if (freq === 'weekends') {
      setDaysOfWeek(['Sat', 'Sun']);
    }
  };

  const toggleDay = (day) => {
    setFrequency('custom');
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleOpenEdit = (routine) => {
    setEditingRoutineId(routine._id);
    setTitle(routine.title || '');
    setDescription(routine.description || '');
    setProjectId(routine.projectId?._id || routine.projectId || '');
    setFrequency(routine.frequency || 'daily');
    setDaysOfWeek(routine.daysOfWeek || DAYS_OF_WEEK);
    setTimeSlot(routine.timeSlot || 'morning');
    setEstimatedMinutes(routine.estimatedMinutes || 30);
    setPriority(routine.priority || 'medium');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        projectId: projectId || null,
        frequency,
        daysOfWeek,
        timeSlot,
        estimatedMinutes: Number(estimatedMinutes) || 0,
        priority,
      };

      if (editingRoutineId) {
        // Update
        const res = await apiFetch(`/routines/${editingRoutineId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update routine');
        }
        showToast('Routine updated successfully');
      } else {
        // Create
        const res = await apiFetch('/routines', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create routine');
        }
        showToast('Recurring routine created');
      }

      resetForm();
      loadRoutines();
      if (onRoutinesSynced) {
        onRoutinesSynced();
      }
      window.dispatchEvent(new Event('project-checkin-logged'));
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving routine', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (routineId) => {
    try {
      const res = await apiFetch(`/routines/${routineId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const updated = await res.json();
        setRoutines((prev) => prev.map((r) => (r._id === routineId ? updated : r)));
        showToast(updated.isActive ? 'Routine resumed' : 'Routine paused');
        if (onRoutinesSynced) {
          onRoutinesSynced();
        }
        window.dispatchEvent(new Event('project-checkin-logged'));
      }
    } catch (err) {
      console.error('Toggle error:', err);
      showToast('Failed to toggle routine', 'error');
    }
  };

  const handleDelete = async (routineId) => {
    if (!window.confirm('Delete this recurring routine? It will also be deleted from all synced days.')) {
      return;
    }

    try {
      const res = await apiFetch(`/routines/${routineId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRoutines((prev) => prev.filter((r) => r._id !== routineId));
        showToast('Routine deleted from all synced days');
        if (onRoutinesSynced) {
          onRoutinesSynced();
        }
        window.dispatchEvent(new Event('project-checkin-logged'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete routine', 'error');
    }
  };

  const handleSyncToCurrentDate = async () => {
    setIsSyncing(true);
    try {
      const targetDate = currentDate || new Date().toISOString().split('T')[0];
      const res = await apiFetch('/routines/sync-to-date', {
        method: 'POST',
        body: JSON.stringify({ date: targetDate }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to sync routines');
      }

      const data = await res.json();
      showToast(data.message || `Routines synced to ${targetDate}`);
      if (onRoutinesSynced) {
        onRoutinesSynced();
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast(err.message || 'Error syncing routines', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-graphite-900 border border-border-default w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Toast */}
        {toast && (
          <div
            className={`absolute top-4 left-6 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-slide-up border ${
              toast.type === 'error'
                ? 'bg-error/20 border-error/30 text-error'
                : 'bg-lime-accent/20 border-lime-accent/40 text-lime-accent bg-graphite-900'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-lime-accent/10 border border-lime-accent/20 flex items-center justify-center text-lime-accent">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-text-primary">
                Daily & Recurring Routines
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Set once per week/month. Automatically populates into your daily agenda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-graphite-800 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content (scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-1">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Header Action: Add Routine Button */}
          {!isFormOpen && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Active Routines ({routines.filter((r) => r.isActive).length}/{routines.length})
              </span>
              <button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="flex items-center space-x-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Routine</span>
              </button>
            </div>
          )}

          {/* Form (Create / Edit Routine) */}
          {isFormOpen && (
            <div className="bg-graphite-800 border border-lime-accent/30 rounded-2xl p-4 sm:p-5 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm text-text-primary flex items-center space-x-2">
                  <Repeat className="w-4 h-4 text-lime-accent" />
                  <span>{editingRoutineId ? 'Edit Recurring Routine' : 'Create Recurring Routine'}</span>
                </h3>
                <button
                  onClick={resetForm}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                    Routine Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 60m Krita silhouette study / Live CT session prep"
                    className="w-full px-3.5 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all"
                  />
                </div>

                {/* Track / Project & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Project / Track
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent"
                    >
                      <option value="">General (No specific Track)</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Time Slot
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent capitalize"
                    >
                      <option value="morning">🌅 Morning</option>
                      <option value="afternoon">☀️ Afternoon</option>
                      <option value="evening">🌙 Evening</option>
                      <option value="anytime">⚡ Anytime</option>
                    </select>
                  </div>
                </div>

                {/* Frequency Presets */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Repeat Schedule
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { id: 'daily', label: 'Every Day' },
                      { id: 'weekdays', label: 'Weekdays (Mon-Fri)' },
                      { id: 'weekends', label: 'Weekends (Sat-Sun)' },
                      { id: 'custom', label: 'Custom Days' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFrequencyChange(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          frequency === f.id
                            ? 'bg-lime-accent text-graphite-950 font-bold shadow-xs'
                            : 'bg-graphite-700 text-text-muted hover:text-text-primary border border-border-default'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Day of Week Chips */}
                  <div className="flex flex-wrap gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = daysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`w-9 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-lime-accent text-graphite-950 font-extrabold shadow-xs'
                              : 'bg-graphite-700 text-text-muted border border-border-default hover:bg-graphite-600 hover:text-text-primary'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority & Estimated Minutes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent capitalize"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Estimated Time (Minutes)
                    </label>
                    <div className="flex items-center space-x-1">
                      {[15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setEstimatedMinutes(mins)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                            estimatedMinutes === mins
                              ? 'bg-lime-accent text-graphite-950 font-bold shadow-xs'
                              : 'bg-graphite-700 text-text-muted border border-border-default hover:bg-graphite-600 hover:text-text-primary'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 px-2 py-1.5 bg-graphite-700 border border-border-default rounded-lg text-text-primary text-xs font-mono outline-none focus:border-lime-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                    Description / Checklist (Optional)
                  </label>
                  <textarea
                    rows="2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short reminders, sprint steps, or resources..."
                    className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent transition-all resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="px-4 py-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingRoutineId ? 'Save Changes' : 'Create Routine'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Routine List */}
          {loading ? (
            <div className="py-8 text-center text-xs text-text-muted">
              Loading routines...
            </div>
          ) : routines.length === 0 ? (
            <div className="p-8 bg-graphite-800 border border-dashed border-border-default rounded-2xl text-center">
              <Repeat className="w-8 h-8 text-lime-accent/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-primary">No recurring routines set up yet</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Create routines you follow daily (e.g., 60m Krita sprint, live session tasks, research) so they appear automatically in your daily plan.
              </p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-3 px-4 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Create Your First Routine
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {routines.map((routine) => {
                const isActive = routine.isActive;
                const projectTitle = routine.projectId?.title;
                const projectCategory = routine.projectId?.category;

                return (
                  <div
                    key={routine._id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-graphite-800 border-border-default hover:border-lime-accent/30'
                        : 'bg-graphite-800/40 border-border-default/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {projectTitle ? (
                            <span
                              className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                projectCategory ? getCategoryColor(projectCategory) : 'bg-lime-accent/10 text-lime-accent'
                              }`}
                            >
                              {projectTitle}
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-text-muted bg-graphite-700 px-2 py-0.5 rounded-full uppercase">
                              General
                            </span>
                          )}

                          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-graphite-700 text-text-secondary capitalize">
                            {routine.timeSlot}
                          </span>

                          <span className="text-[9px] font-semibold text-lime-accent bg-lime-accent/10 px-2 py-0.5 rounded-full">
                            {routine.frequency === 'daily'
                              ? 'Daily'
                              : routine.frequency === 'weekdays'
                              ? 'Mon-Fri'
                              : routine.frequency === 'weekends'
                              ? 'Weekends'
                              : `${routine.daysOfWeek?.length || 0} days`}
                          </span>

                          <span className="text-[9px] font-mono text-text-muted">
                            {routine.estimatedMinutes}m
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-semibold text-text-primary leading-tight">
                          {routine.title}
                        </h4>
                        {routine.description && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                            {routine.description}
                          </p>
                        )}

                        {/* Active Days */}
                        <div className="flex items-center gap-1 mt-2">
                          {DAYS_OF_WEEK.map((d) => {
                            const isMatch = routine.daysOfWeek?.includes(d);
                            return (
                              <span
                                key={d}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                  isMatch
                                    ? 'bg-lime-accent/15 text-lime-accent font-bold'
                                    : 'text-text-muted/40'
                                }`}
                              >
                                {d}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Routine Actions */}
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {/* Toggle Active Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(routine._id)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-lime-accent/15 border-lime-accent/40 text-lime-accent hover:bg-lime-accent/25'
                              : 'bg-graphite-700 border-border-default text-text-muted hover:text-text-primary'
                          }`}
                          title={isActive ? 'Active (Click to pause)' : 'Paused (Click to resume)'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(routine)}
                          className="p-2 rounded-xl bg-graphite-700 hover:bg-graphite-600 border border-border-default/80 text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-2xs"
                          title="Edit routine"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(routine._id)}
                          className="p-2 rounded-xl bg-graphite-700 hover:bg-error/20 border border-border-default/80 text-text-secondary hover:text-error hover:border-error/30 transition-all cursor-pointer shadow-2xs"
                          title="Delete routine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border-subtle flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleSyncToCurrentDate}
            disabled={isSyncing || routines.filter((r) => r.isActive).length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Populate routines matching today's day into your daily schedule"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Active Routines to Schedule'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 text-text-primary text-xs font-semibold rounded-xl border border-border-default transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default RoutinesModal;
