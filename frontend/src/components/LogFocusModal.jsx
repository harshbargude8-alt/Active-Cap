import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTimer } from '../context/TimerContext';
import { useAuth } from '../context/AuthContext';
import { Clock, BookOpen, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const LogFocusModal = () => {
  const { logSessionData, setLogSessionData } = useTimer();
  const { apiFetch } = useAuth();
  
  const [minutesSpent, setMinutesSpent] = useState(logSessionData ? logSessionData.minutes : 1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!logSessionData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('A session note is required to log progress.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // If attached to a project track, log check-in
      if (logSessionData.projectId && logSessionData.projectId !== 'general' && logSessionData.projectId !== 'none') {
        const res = await apiFetch(`/projects/${logSessionData.projectId}/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            note,
            minutesSpent: Number(minutesSpent),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to submit focus session.');
        }
      }

      // If attached to a daily task, update task's logged minutes
      if (logSessionData.taskId) {
        try {
          const getRes = await apiFetch(`/daily-tasks/${logSessionData.taskId}`);
          if (getRes.ok) {
            const taskObj = await getRes.json();
            const newActual = (taskObj.actualMinutes || 0) + Number(minutesSpent);
            await apiFetch(`/daily-tasks/${logSessionData.taskId}`, {
              method: 'PUT',
              body: JSON.stringify({ actualMinutes: newActual }),
            });
          }
        } catch (taskErr) {
          console.error('Failed to update task minutes:', taskErr);
        }
      }

      // Success confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#C7F36B', '#67E8D2', '#75D99A'],
      });

      // Notify all active views to reload data
      window.dispatchEvent(new Event('project-checkin-logged'));
      
      // Close modal
      setLogSessionData(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-graphite-800 border border-border-default rounded-2xl p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-lime-accent/10 flex items-center justify-center text-lime-accent">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base leading-tight">Focus Session Logged</h3>
              <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                {logSessionData.projectTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogSessionData(null)}
            className="p-1.5 hover:bg-graphite-700 text-text-muted hover:text-text-secondary rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 text-error text-xs font-semibold rounded-2xl border border-error/20 animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Time Invested (Minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="number"
                min="1"
                required
                value={minutesSpent}
                onChange={(e) => setMinutesSpent(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              What did you accomplish?
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
              <textarea
                required
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Completed header styling and verified responsiveness"
                className="w-full pl-10 pr-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-xs outline-none focus:border-lime-accent transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setLogSessionData(null)}
              className="flex-1 py-2.5 bg-graphite-700 hover:bg-graphite-600 text-text-secondary text-xs font-semibold rounded-xl transition-all"
            >
              Log Later
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-lime-accent hover:brightness-110 text-graphite-950 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Saving...' : 'Save Check-In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
