import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Flame, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CheckInModal = ({ project, isOpen, onClose, onSuccess }) => {
  const { apiFetch } = useAuth();
  const [note, setNote] = useState('');
  const [minutesSpent, setMinutesSpent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Please add a note describing what you did.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiFetch(`/projects/${project._id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          note: note.trim(),
          minutesSpent: minutesSpent ? parseInt(minutesSpent, 10) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Check-in failed');
      }

      // Celebrate progress with high-quality confetti
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.75 },
        colors: ['#C7F36B', '#67E8D2', '#75D99A'],
      });

      setNote('');
      setMinutesSpent('');
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 mb-4">
          <div className="bg-warning/10 p-2 rounded-xl text-warning">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-warning uppercase tracking-wider">
              Log Progress
            </span>
            <h3 className="font-bold text-lg text-text-primary leading-tight">{project.title}</h3>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-error bg-error/10 border border-error/20 p-3 rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              What did you accomplish today?
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Scaffolding backend routes and models"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-graphite-700 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-sm outline-none focus:border-lime-accent transition-all duration-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" /> Estimated Minutes (optional)
            </label>
            <input
              type="number"
              value={minutesSpent}
              onChange={(e) => setMinutesSpent(e.target.value)}
              placeholder="e.g. 45"
              min="1"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-graphite-700 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-sm outline-none focus:border-lime-accent transition-all duration-300"
            />
          </div>

          <div className="flex space-x-2 pt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium bg-lime-accent hover:brightness-110 text-graphite-950 rounded-xl shadow-sm transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Saving...' : 'Complete Check-in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CheckInModal;
