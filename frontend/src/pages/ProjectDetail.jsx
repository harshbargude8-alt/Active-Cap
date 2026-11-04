import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { SwapModal } from '../components/SwapModal';
import { PROJECT_CATEGORIES, getCategoryColor } from '../constants/project';
import {
  ArrowLeft,
  Calendar,
  Flame,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';

export const ProjectDetail = ({ projectId, onViewChange }) => {
  const { apiFetch } = useAuth();
  const [project, setProject] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form edit fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [status, setStatus] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active Cap Swap State
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [activeProjectsList, setActiveProjectsList] = useState([]);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const projRes = await apiFetch(`/projects/${projectId}`);
      if (projRes.ok) {
        const projData = await projRes.json();
        setProject(projData);
        // Pre-populate fields
        setTitle(projData.title);
        setCategory(projData.category);
        setDescription(projData.description || '');
        setNextStep(projData.nextStep || '');
        setStatus(projData.status);
      }

      const checkInRes = await apiFetch(`/projects/${projectId}/checkins`);
      if (checkInRes.ok) {
        const checkInData = await checkInRes.json();
        setCheckIns(checkInData);
      }
    } catch (err) {
      console.error('Error fetching project detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const handleUpdateProject = async (e, swapId = null) => {
    if (e) e.preventDefault();
    setEditError('');
    setIsSaving(true);

    if (status === 'Active' && !nextStep.trim()) {
      setEditError('A concrete next step is required when status is Active.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          status,
          nextStep: nextStep.trim(),
          swapProjectId: swapId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.capReached) {
          setActiveProjectsList(data.activeProjects);
          setIsSwapOpen(true);
        } else {
          setEditError(data.error || 'Failed to update project details.');
        }
        setIsSaving(false);
        return;
      }

      setProject(data);
      setIsEditing(false);
      setIsSwapOpen(false);
      loadProjectData();
    } catch (err) {
      setEditError('Connection error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwap = (activeIdToPark) => {
    handleUpdateProject(null, activeIdToPark);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        onViewChange('dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete track.');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Network error while deleting track.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-sm text-text-muted">Loading Track details...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h3 className="font-heading text-lg font-bold text-text-primary">Track not found</h3>
        <button
          onClick={() => onViewChange('dashboard')}
          className="mt-4 px-4 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const daysSinceStart = Math.ceil((new Date() - new Date(project.createdAt)) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      <button
        onClick={() => onViewChange('dashboard')}
        className="flex items-center space-x-1.5 text-xs font-semibold text-text-muted hover:text-text-primary mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Project Card Summary / Edit Mode */}
      <div className="bg-graphite-800 border border-border-default rounded-2xl p-6 md:p-8 shadow-xs mb-8 transition-colors duration-200">
        {!isEditing ? (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full uppercase tracking-wider ${getCategoryColor(project.category)}`}>
                  {project.category}
                </span>
                <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full ${
                  project.status === 'Active' ? 'bg-lime-accent/10 text-lime-accent border-lime-accent/20' :
                  project.status === 'Parked' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-graphite-700 text-text-secondary border-border-default'
                }`}>
                  {project.status}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 border border-border-default rounded-xl text-text-muted hover:text-text-primary hover:bg-graphite-700 transition-all duration-300 cursor-pointer"
                  title="Edit Track"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 border border-border-default rounded-xl text-text-muted hover:text-error hover:border-error/40 hover:bg-error/10 transition-all duration-300 cursor-pointer"
                  title="Delete Track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="font-heading text-2xl font-bold text-text-primary tracking-tight leading-tight">
              {project.title}
            </h2>
            <p className="text-sm text-text-secondary mt-2 whitespace-pre-line leading-relaxed">
              {project.description || 'No description provided.'}
            </p>

            {project.status === 'Active' && (
              <div className="mt-6 p-4 bg-graphite-700 border border-border-subtle rounded-xl">
                <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                  Concrete Next Action
                </span>
                <p className="text-sm font-semibold text-text-primary">{project.nextStep}</p>
              </div>
            )}
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <h3 className="font-heading font-bold text-lg text-text-primary">Edit Track Details</h3>
            
            {editError && (
              <div className="text-xs bg-warning/10 border border-warning/20 text-warning p-3 rounded-xl">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300 cursor-pointer"
                >
                  {PROJECT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-graphite-800">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300 cursor-pointer"
                >
                  <option value="Active" className="bg-graphite-800">Active</option>
                  <option value="Parked" className="bg-graphite-800">Parked</option>
                  <option value="Someday" className="bg-graphite-800">Someday</option>
                  <option value="Done" className="bg-graphite-800">Done</option>
                  <option value="Abandoned" className="bg-graphite-800">Abandoned</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Next Step {status === 'Active' && <span className="text-warning font-bold">*</span>}
              </label>
              <input
                type="text"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="The single next concrete action"
                className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditError('');
                }}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-sm font-medium rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats Block Dashboard */}
      <section className="mb-10">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Focus Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <Calendar className="w-5 h-5 text-text-muted mb-1" />
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Days Active</span>
            <span className="text-lg font-bold text-text-primary mt-0.5">{daysSinceStart}d</span>
          </div>

          <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <CheckCircle className="w-5 h-5 text-lime-accent mb-1" />
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Check-ins</span>
            <span className="text-lg font-bold text-text-primary mt-0.5">{project.totalCheckIns || 0}</span>
          </div>

          <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <Flame className="w-5 h-5 text-warning mb-1" />
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Current Streak</span>
            <span className="text-lg font-bold text-text-primary mt-0.5">{project.streakCount || 0}d</span>
          </div>

          <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <Sparkles className="w-5 h-5 text-mint-accent mb-1" />
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Longest Streak</span>
            <span className="text-lg font-bold text-text-primary mt-0.5">{project.longestStreak || 0}d</span>
          </div>
        </div>
      </section>

      {/* Check-In History Timeline */}
      <section>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Check-in Logs</h3>
        {checkIns.length === 0 ? (
          <div className="bg-graphite-800 border border-border-default rounded-2xl p-6 text-center text-xs text-text-muted">
            No check-in logs recorded yet. Start working and track your first step!
          </div>
        ) : (
          <div className="relative border-l border-border-default ml-4 space-y-6">
            {checkIns.map((log) => (
              <div key={log._id} className="relative pl-6">
                {/* Dots indicator */}
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-graphite-950 border-2 border-lime-accent rounded-full"></div>
                
                <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 shadow-3xs transition-colors duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-text-muted font-medium">
                      {new Date(log.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {log.minutesSpent && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-text-secondary bg-graphite-700 border border-border-default px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 mr-1" /> {log.minutesSpent}m
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed font-medium">
                    {log.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start space-x-3.5 mb-4">
              <div className="p-3 bg-error/10 text-error border border-error/20 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="pr-4">
                <h3 className="font-heading font-bold text-lg text-text-primary leading-tight">
                  Delete Track?
                </h3>
                <p className="text-xs text-error font-semibold mt-0.5 uppercase tracking-wider">
                  Permanent Action
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-semibold text-text-primary">"{project.title}"</span>?
            </p>

            <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl mb-6 space-y-1 text-xs text-error">
              <p className="font-medium flex items-center space-x-1.5">
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>This will permanently delete this track and its <strong>{checkIns.length} check-in log{checkIns.length === 1 ? '' : 's'}</strong> and streak history.</span>
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-graphite-700 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 text-xs font-semibold bg-error hover:brightness-110 text-graphite-950 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Track & Logs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <SwapModal
        isOpen={isSwapOpen}
        activeProjects={activeProjectsList}
        targetProjectName={title}
        onSwap={handleSwap}
        onClose={() => {
          setIsSwapOpen(false);
        }}
      />
    </div>
  );
};
export default ProjectDetail;
