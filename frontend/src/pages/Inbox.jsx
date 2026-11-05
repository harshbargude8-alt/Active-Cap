import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { SwapModal } from '../components/SwapModal';
import { PROJECT_CATEGORIES } from '../constants/project';
import { clientCache } from '../utils/clientCache';
import {
  Lightbulb,
  ArrowUpRight,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

export const Inbox = ({ onViewChange, onSelectProjectId }) => {
  const { apiFetch } = useAuth();

  const cachedInbox = clientCache.get('/inbox');

  const [items, setItems] = useState(cachedInbox || []);
  const [loading, setLoading] = useState(!cachedInbox);

  // Promotion Form State
  const [promotingItem, setPromotingItem] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Code');
  const [description, setDescription] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [status, setStatus] = useState('Parked');
  const [promoError, setPromoError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Swap State
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapTargetProject, setSwapTargetProject] = useState(null);
  const [activeProjectsList, setActiveProjectsList] = useState([]);

  const loadInboxItems = async () => {
    if (!clientCache.get('/inbox')) {
      setLoading(true);
    }
    try {
      const res = await apiFetch('/inbox');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        clientCache.set('/inbox', data, 60);
      }
    } catch (err) {
      console.error('Error loading inbox items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInboxItems();
  }, []);

  const handleDiscard = async (itemId) => {
    console.log('handleDiscard clicked for item:', itemId);
    try {
      const res = await apiFetch(`/inbox/${itemId}`, {
        method: 'DELETE',
      });
      console.log('Discard response status:', res.status);

      if (res.ok) {
        loadInboxItems();
      } else {
        alert('Failed to discard idea.');
      }
    } catch (err) {
      console.error('Error discarding inbox item:', err);
    }
  };

  const handlePromoteClick = (item) => {
    setPromotingItem(item);
    setTitle(item.text);
    setCategory('Code');
    setDescription('');
    setNextStep('');
    setStatus('Parked');
    setPromoError('');
  };

  const handleSubmitPromotion = async (e, swapId = null) => {
    if (e) e.preventDefault();
    setPromoError('');
    setIsSubmitting(true);

    if (status === 'Active' && !nextStep.trim()) {
      setPromoError('A concrete next step is required to activate a project.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create the new project
      const projRes = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          status: swapId ? 'Parked' : status, // if we are swapping, create as parked first
          nextStep: nextStep.trim(),
        }),
      });

      const newProject = await projRes.json();

      if (!projRes.ok) {
        if (newProject.capReached) {
          // Trigger swap dialog
          setSwapTargetProject({
            title: title.trim(),
            description: description.trim(),
            category,
            nextStep: nextStep.trim(),
          });
          setActiveProjectsList(newProject.activeProjects);
          setIsSwapOpen(true);
          setIsSubmitting(false);
        } else {
          setPromoError(newProject.error || 'Failed to promote idea.');
          setIsSubmitting(false);
        }
        return;
      }

      // 2. Promote the inbox item to match the new project
      const promoRes = await apiFetch(`/inbox/${promotingItem._id}/promote`, {
        method: 'PUT',
        body: JSON.stringify({ projectId: newProject._id }),
      });

      if (!promoRes.ok) {
        setPromoError('Project was created but inbox item could not be marked as promoted.');
        setIsSubmitting(false);
        return;
      }

      // 3. If swapping was requested, run the status swap now
      if (swapId) {
        const swapRes = await apiFetch(`/projects/${newProject._id}/status`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'Active',
            swapProjectId: swapId,
            nextStep: nextStep.trim(),
          }),
        });

        if (!swapRes.ok) {
          const swapErr = await swapRes.json();
          setPromoError(swapErr.error || 'Project created and promoted, but active swap failed.');
          setIsSubmitting(false);
          return;
        }
      }

      // Close everything and refresh
      setPromotingItem(null);
      setIsSwapOpen(false);
      setSwapTargetProject(null);
      loadInboxItems();
      
      // Auto navigate to dashboard to see it
      onViewChange('dashboard');
    } catch (err) {
      setPromoError('Connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSwapAndPromote = (activeIdToPark) => {
    handleSubmitPromotion(null, activeIdToPark);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-sm text-text-muted">Opening your inbox folder...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => onViewChange('all-projects')}
          className="inline-flex items-center space-x-1.5 text-xs text-text-muted hover:text-text-primary mb-3 transition-colors duration-200 cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200 text-lime-accent" />
          <span>Back to Tracks</span>
        </button>
        <h2 className="font-heading text-xl font-bold text-text-primary tracking-tight flex items-center">
          Quick Capture Inbox
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-lime-accent/10 text-lime-accent border border-lime-accent/20 rounded-full">
            {items.length} Ideas
          </span>
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Zero-friction dump zone. Turn these into projects when you do your reviews.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-graphite-800 border border-border-default rounded-2xl p-12 text-center shadow-xs transition-colors duration-200">
          <Lightbulb className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-heading font-bold text-text-primary">Your inbox is clear</h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            Got an idea mid-work? Use the quick capture bar at the top or the FAB on mobile to capture it immediately.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-graphite-800 border border-border-default rounded-2xl p-5 shadow-2xs hover:bg-graphite-700 hover:border-border-default transition-all duration-300 flex justify-between items-center"
            >
              <div className="min-w-0 pr-4">
                <h4 className="font-medium text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {item.text}
                </h4>
                <div className="flex items-center space-x-1 mt-2 text-[10px] text-text-muted">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Captured {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handlePromoteClick(item)}
                  className="flex items-center space-x-1.5 bg-lime-accent/15 hover:bg-lime-accent text-lime-accent hover:text-graphite-950 border border-lime-accent/30 hover:border-lime-accent text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Promote</span>
                </button>
                <button
                  onClick={() => handleDiscard(item._id)}
                  className="p-2 border border-border-default text-text-muted hover:text-error hover:border-error/40 hover:bg-error/10 rounded-xl transition-all duration-300 cursor-pointer"
                  title="Discard Idea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promotion Form Dialog */}
      {promotingItem && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setPromotingItem(null)}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-text-primary mb-4">Promote to Track</h3>
            {promoError && (
              <div className="mb-4 text-xs bg-warning/10 border border-warning/20 text-warning p-3 rounded-xl">
                {promoError}
              </div>
            )}

            <form onSubmit={handleSubmitPromotion} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Track Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  {PROJECT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-graphite-800">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Context, notes, ideas..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  <option value="Parked" className="bg-graphite-800">Parked</option>
                  <option value="Active" className="bg-graphite-800">Active (Bring to focus immediately)</option>
                  <option value="Someday" className="bg-graphite-800">Someday</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Next Step {status === 'Active' && <span className="text-warning font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="What is the single next concrete action?"
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromotingItem(null)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-sm font-medium rounded-xl shadow-sm transition-all duration-300 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Promote Track'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Swap Modal If Needed */}
      <SwapModal
        isOpen={isSwapOpen}
        activeProjects={activeProjectsList}
        targetProjectName={swapTargetProject?.title}
        onSwap={handleSwapAndPromote}
        onClose={() => {
          setIsSwapOpen(false);
          setSwapTargetProject(null);
        }}
      />
    </div>
  );
};
export default Inbox;
