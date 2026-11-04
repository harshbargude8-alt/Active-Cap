import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lightbulb, Send, Plus, X } from 'lucide-react';

export const QuickCapture = ({ onSuccess }) => {
  const { apiFetch, user } = useAuth();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/inbox', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        setText('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
        if (onSuccess) onSuccess();
        setIsMobileOpen(false);
      }
    } catch (err) {
      console.error('Error capturing idea:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Desktop Capture Bar */}
      <div className="hidden md:block max-w-2xl mx-auto my-6 px-4">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="flex items-center bg-graphite-700 border border-border-default rounded-xl shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-lime-accent/50 transition-all duration-300 px-4 py-3">
            <Lightbulb className="w-5 h-5 text-text-muted mr-3 group-focus-within:text-lime-accent transition-colors duration-300" />
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Got a quick idea? Dump it here..."
              disabled={isSubmitting}
              className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted text-sm"
            />
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className={`p-1.5 rounded-xl transition-all duration-300 ${
                text.trim()
                  ? 'bg-lime-accent text-graphite-950 hover:brightness-110 cursor-pointer'
                  : 'text-text-muted cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {success && (
            <span className="absolute -bottom-6 left-4 text-xs font-medium text-success animate-fade-in">
              ✨ Captured to Inbox!
            </span>
          )}
        </form>
      </div>

      {/* Mobile Floating Action Button (FAB) & Input Dialog */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-20 right-6 z-40 bg-lime-accent text-graphite-950 p-4 rounded-full shadow-lg hover:shadow-xl active:scale-95 hover:brightness-110 transition-all duration-300"
          aria-label="Quick capture idea"
        >
          <Plus className="w-6 h-6" />
        </button>

        {isMobileOpen && (
          <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
            <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-t-3xl p-6 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-lime-accent" />
                  <h3 className="font-semibold text-text-primary">Quick Capture Idea</h3>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Draft your raw idea... (decide details later)"
                  disabled={isSubmitting}
                  rows="3"
                  className="w-full bg-graphite-700 border border-border-default rounded-xl p-3 text-text-primary text-sm placeholder-text-muted outline-none focus:border-lime-accent transition-all duration-300 mb-4 resize-none"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsMobileOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!text.trim() || isSubmitting}
                    className="px-5 py-2 text-sm font-medium bg-lime-accent text-graphite-950 rounded-xl shadow-sm hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300"
                  >
                    {isSubmitting ? 'Saving...' : 'Capture'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
export default QuickCapture;
