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

      // Success confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#3b82f6', '#f59e0b', '#10b981'],
      });

      // Notify all active views to reload project data
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-calm-border/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-calm-text dark:text-slate-100 text-base leading-tight">Focus Session Logged</h3>
              <p className="text-[10px] text-calm-muted dark:text-slate-400 font-medium uppercase tracking-wider">
                {logSessionData.projectTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogSessionData(null)}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-calm-muted dark:text-slate-400 hover:text-calm-text dark:hover:text-slate-200 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-2xl border border-rose-100 dark:border-rose-900/40 animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Time Invested (Minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-calm-muted dark:text-slate-400" />
              <input
                type="number"
                min="1"
                required
                value={minutesSpent}
                onChange={(e) => setMinutesSpent(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 text-xs outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-1.5">
              What did you accomplish?
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-3 w-4 h-4 text-calm-muted dark:text-slate-400" />
              <textarea
                required
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Completed header styling and verified responsiveness"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 placeholder-calm-muted dark:placeholder-slate-500 text-xs outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setLogSessionData(null)}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-calm-text dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Log Later
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-calm-slate hover:bg-calm-slate/95 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
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
