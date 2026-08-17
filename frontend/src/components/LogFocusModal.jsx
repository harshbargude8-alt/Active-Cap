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
      <div className="relative w-full max-w-md bg-white border border-calm-border/60 rounded-3xl p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-calm-text text-base leading-tight">Focus Session Logged</h3>
              <p className="text-[10px] text-calm-muted font-medium uppercase tracking-wider">
                {logSessionData.projectTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogSessionData(null)}
            className="p-1.5 hover:bg-slate-50 text-calm-muted hover:text-calm-text rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-2xl border border-rose-100 animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-calm-muted uppercase tracking-wider mb-1.5">
              Time Invested (Minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-calm-muted" />
              <input
                type="number"
                min="1"
                required
                value={minutesSpent}
                onChange={(e) => setMinutesSpent(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-xs outline-none focus:bg-white focus:border-accent-blue transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-calm-muted uppercase tracking-wider mb-1.5">
              What did you accomplish?
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-3 w-4 h-4 text-calm-muted" />
              <textarea
                required
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Completed header styling and verified responsiveness"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-xs outline-none focus:bg-white focus:border-accent-blue transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setLogSessionData(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-calm-text text-xs font-semibold rounded-xl transition-all"
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
