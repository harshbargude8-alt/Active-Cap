import { useState } from 'react';
import {
  Check,
  Play,
  Clock,
  Trash2,
  Edit3,
  ArrowRight,
  Flame,
  Sunrise,
  Sun,
  Moon,
  Zap,
  Repeat,
  Plus,
  X,
  CheckSquare
} from 'lucide-react';
import { getCategoryColor } from '../constants/project';

export const DailyTaskCard = ({
  task,
  onToggle,
  onEdit,
  onDelete,
  onReschedule,
  onStartFocus,
  onToggleSubtask,
  onAddSubtask,
  isTimerActive = false,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const isCompleted = task.status === 'completed';
  const isRoutine = task.source === 'routine' || Boolean(task.routineId);

  // Priority indicator helper
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return {
          label: 'High',
          classes: 'bg-error/10 text-error border-error/20',
          dot: 'bg-error',
        };
      case 'low':
        return {
          label: 'Low',
          classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          dot: 'bg-blue-500 dark:bg-blue-400',
        };
      case 'medium':
      default:
        return {
          label: 'Med',
          classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500 dark:bg-amber-400',
        };
    }
  };

  // Time slot badge helper
  const getTimeSlotBadge = (slot) => {
    switch (slot) {
      case 'morning':
        return { label: 'Morning', icon: Sunrise, color: 'text-amber-600 dark:text-amber-400' };
      case 'afternoon':
        return { label: 'Afternoon', icon: Sun, color: 'text-amber-500 dark:text-yellow-400' };
      case 'evening':
        return { label: 'Evening', icon: Moon, color: 'text-indigo-600 dark:text-indigo-400' };
      case 'anytime':
      default:
        return { label: 'Anytime', icon: Zap, color: 'text-lime-accent' };
    }
  };

  const priorityInfo = getPriorityBadge(task.priority);
  const timeSlotInfo = getTimeSlotBadge(task.timeSlot);
  const TimeSlotIcon = timeSlotInfo.icon;

  // Project details
  const projectTitle = task.projectId?.title || (task.projectId ? 'Project' : null);
  const projectCategory = task.projectId?.category;

  const handleToggleClick = (e) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(task);
    }
  };

  const handleMoveToTomorrow = (e) => {
    e.stopPropagation();
    if (onReschedule) {
      // Calculate tomorrow's date string YYYY-MM-DD
      const currentDate = task.date ? new Date(task.date + 'T00:00:00') : new Date();
      currentDate.setDate(currentDate.getDate() + 1);
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const tomorrowStr = `${year}-${month}-${day}`;
      onReschedule(task, tomorrowStr);
    }
  };

  const handleAddSubtaskSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newSubtaskText.trim() || !onAddSubtask) return;
    onAddSubtask(task, newSubtaskText.trim());
    setNewSubtaskText('');
    setIsAddingSubtask(false);
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 p-4 ${
        isCompleted
          ? 'bg-graphite-700/50 border-border-subtle opacity-75'
          : isTimerActive
          ? 'bg-graphite-800 border-lime-accent/60 shadow-lg ring-1 ring-lime-accent/40'
          : 'bg-graphite-800/90 border-border-default hover:border-lime-accent/30 hover:bg-graphite-800 shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Custom Rounded Checkbox */}
        <button
          type="button"
          onClick={handleToggleClick}
          aria-label={isCompleted ? 'Mark task pending' : 'Mark task completed'}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0 ${
            isCompleted
              ? 'bg-lime-accent border-lime-accent text-graphite-950 scale-100 shadow-xs'
              : 'border-border-default hover:border-lime-accent bg-graphite-700 hover:bg-lime-accent/10 text-transparent group-hover:border-lime-accent/60'
          }`}
        >
          <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform duration-200 ${isCompleted ? 'scale-100' : 'scale-0'}`} />
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Badges Bar: Track, Priority, TimeSlot */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {/* Track / Project Badge */}
            {projectTitle ? (
              <span
                className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider truncate max-w-[150px] ${
                  projectCategory ? getCategoryColor(projectCategory) : 'bg-lime-accent/10 text-lime-accent border-lime-accent/20'
                }`}
                title={projectTitle}
              >
                {projectTitle}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-text-muted bg-graphite-700/60 border border-border-default px-2 py-0.5 rounded-full uppercase tracking-wider">
                General
              </span>
            )}

            {/* Time Slot Badge */}
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-graphite-700/70 border border-border-default text-text-secondary">
              <TimeSlotIcon className={`w-3 h-3 ${timeSlotInfo.color}`} />
              <span>{timeSlotInfo.label}</span>
            </span>

            {/* Scheduled Time Range Badge */}
            {task.startTime && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-graphite-700/80 border border-border-default text-lime-accent">
                <Clock className="w-3 h-3 text-lime-accent" />
                <span>{task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}</span>
              </span>
            )}

            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityInfo.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
              <span>{priorityInfo.label}</span>
            </span>

            {/* Rollover badge if source was rollover */}
            {task.source === 'rollover' && (
              <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                Rolled Over
              </span>
            )}

            {/* Routine badge if source was routine */}
            {(task.source === 'routine' || task.routineId) && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-lime-accent bg-lime-accent/10 border border-lime-accent/25 px-1.5 py-0.2 rounded-full">
                <Repeat className="w-2.5 h-2.5" />
                <span>Routine</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4
            className={`text-sm font-semibold text-text-primary leading-snug break-words transition-all duration-200 ${
              isCompleted ? 'line-through text-text-muted' : ''
            }`}
          >
            {task.title}
          </h4>

          {/* Optional Description */}
          {task.description && (
            <p
              className={`text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2 ${
                isCompleted ? 'text-text-muted/60' : ''
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Interactive Subtask Checklist */}
          {((task.checklist && task.checklist.length > 0) || isAddingSubtask) && (
            <div className="mt-2.5 pt-2 border-t border-border-subtle/50 space-y-1.5">
              {/* Progress Summary if items exist */}
              {task.checklist && task.checklist.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span className="font-semibold flex items-center gap-1.5 text-text-secondary">
                    <CheckSquare className="w-3 h-3 text-lime-accent" />
                    <span>
                      {task.checklist.filter((i) => i.completed).length} of {task.checklist.length} subtasks completed
                    </span>
                  </span>
                  <span className="font-mono text-lime-accent text-[10px] font-bold">
                    {Math.round((task.checklist.filter((i) => i.completed).length / task.checklist.length) * 100)}%
                  </span>
                </div>
              )}

              {/* Subtask Items */}
              <div className="space-y-1">
                {task.checklist?.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleSubtask) {
                        onToggleSubtask(task, idx, item._id);
                      }
                    }}
                    className={`flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-colors group/sub ${
                      item.completed
                        ? 'bg-graphite-700/50 text-text-muted'
                        : 'hover:bg-graphite-700/50 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.completed
                          ? 'bg-lime-accent/25 border-lime-accent text-lime-accent'
                          : 'border-border-default group-hover/sub:border-lime-accent/60 bg-graphite-800'
                      }`}
                    >
                      {item.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className={`text-xs select-none break-words ${item.completed ? 'line-through text-text-muted/70' : ''}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick Inline Add Subtask Input or Button */}
              {isAddingSubtask ? (
                <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    autoFocus
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="e.g. 15m Tutorial / 25m Artwork..."
                    className="flex-1 px-2.5 py-1 bg-graphite-700 border border-border-default rounded-lg text-text-primary text-xs outline-none focus:border-lime-accent"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold text-xs rounded-lg cursor-pointer transition-all"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSubtask(false);
                      setNewSubtaskText('');
                    }}
                    className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                onAddSubtask && !isCompleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingSubtask(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-lime-accent transition-colors pt-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add subtask</span>
                  </button>
                )
              )}
            </div>
          )}

          {/* Quick "Add Subtask" trigger if task doesn't have any subtasks yet */}
          {!task.checklist?.length && !isAddingSubtask && onAddSubtask && !isCompleted && (
            <div className="mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingSubtask(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted/60 hover:text-lime-accent transition-colors cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add subtask checklist</span>
              </button>
            </div>
          )}

          {/* Bottom Metas: Time tracking info & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-border-subtle/70">
            {/* Time Metrics */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {task.estimatedMinutes > 0 && (
                <span className="inline-flex items-center gap-1 font-mono font-medium text-text-secondary bg-graphite-700/50 px-2 py-0.5 rounded-md border border-border-default/60">
                  <Clock className="w-3 h-3 text-text-muted" />
                  <span>{task.estimatedMinutes}m est</span>
                </span>
              )}

              {task.actualMinutes > 0 && (
                <span className="inline-flex items-center gap-1 font-mono font-medium text-lime-accent bg-lime-accent/10 px-2 py-0.5 rounded-md border border-lime-accent/20">
                  <Flame className="w-3 h-3 text-lime-accent" />
                  <span>{task.actualMinutes}m logged</span>
                </span>
              )}

              {task.estimatedMinutes === 0 && task.actualMinutes === 0 && (
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> No time set
                </span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Focus Timer Button */}
              {!isCompleted && onStartFocus && (
                <button
                  type="button"
                  onClick={() => onStartFocus(task)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isTimerActive
                      ? 'bg-lime-accent text-graphite-950 shadow-sm animate-pulse ring-2 ring-lime-accent/40'
                      : 'bg-lime-accent/15 hover:bg-lime-accent text-lime-accent hover:text-graphite-950 border border-lime-accent/30 hover:border-lime-accent shadow-2xs active:scale-95'
                  }`}
                  title={isTimerActive ? 'Active in timer' : 'Start Focus Timer on this task'}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isTimerActive ? 'Focusing...' : 'Focus'}</span>
                </button>
              )}

              {/* Only regular manual tasks have Reschedule, Edit, and Delete; routines are managed centrally */}
              {!isRoutine && (
                <>
                  {/* Move to Tomorrow */}
                  {!isCompleted && onReschedule && (
                    <button
                      type="button"
                      onClick={handleMoveToTomorrow}
                      className="p-1.5 rounded-xl bg-graphite-700 hover:bg-graphite-600 border border-border-default/70 text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer shadow-2xs"
                      title="Move to tomorrow"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Edit Button */}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="p-1.5 rounded-xl bg-graphite-700 hover:bg-graphite-600 border border-border-default/70 text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer shadow-2xs"
                      title="Edit task"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {onDelete && !showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-xl bg-graphite-700 hover:bg-error/20 border border-border-default/70 text-text-secondary hover:text-error hover:border-error/30 transition-all duration-200 cursor-pointer shadow-2xs"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Confirmation prompt */}
                  {showDeleteConfirm && (
                    <div className="flex items-center gap-1 bg-graphite-800 border border-error/40 px-2 py-0.5 rounded-lg animate-fade-in">
                      <span className="text-[10px] text-error font-medium">Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          onDelete(task._id);
                        }}
                        className="text-[10px] font-bold text-error hover:underline px-1 cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-[10px] text-text-muted hover:text-text-primary px-1 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DailyTaskCard;
