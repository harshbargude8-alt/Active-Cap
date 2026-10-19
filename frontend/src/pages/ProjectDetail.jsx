import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { SwapModal } from '../components/SwapModal';
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

  const categories = ["Code", "Content", "Reading", "Music", "Animation", "Writing", "Research", "Course", "Other"];

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

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Code': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40';
      case 'Content': return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40';
      case 'Reading': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40';
      case 'Music': return 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-900/40';
      case 'Animation': return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40';
      case 'Writing': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40';
      case 'Research': return 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900/40';
      case 'Course': return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/40';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm text-calm-muted dark:text-slate-400">Loading Track details...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-calm-text dark:text-slate-100">Track not found</h3>
        <button
          onClick={() => onViewChange('dashboard')}
          className="mt-4 px-4 py-2 bg-calm-slate hover:bg-calm-slate/95 text-white text-xs font-semibold rounded-xl"
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
        className="flex items-center space-x-1.5 text-xs font-semibold text-calm-muted dark:text-slate-400 hover:text-calm-text dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Project Card Summary / Edit Mode */}
      <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs mb-8 transition-colors duration-200">
        {!isEditing ? (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full uppercase tracking-wider ${getCategoryColor(project.category)}`}>
                  {project.category}
                </span>
                <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full ${
                  project.status === 'Active' ? 'bg-sky-50 dark:bg-sky-950/30 text-accent-blue dark:text-sky-300 border-sky-200 dark:border-sky-800/40' :
                  project.status === 'Parked' ? 'bg-amber-50 dark:bg-amber-950/30 text-accent-amber dark:text-amber-300 border-amber-200 dark:border-amber-800/40' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  {project.status}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 border border-calm-border dark:border-slate-700 rounded-xl text-calm-muted dark:text-slate-400 hover:text-calm-text dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
                  title="Edit Track"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 border border-calm-border dark:border-slate-700 rounded-xl text-calm-muted dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-300 cursor-pointer"
                  title="Delete Track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-calm-text dark:text-slate-100 tracking-tight leading-tight">
              {project.title}
            </h2>
            <p className="text-sm text-calm-muted dark:text-slate-400 mt-2 whitespace-pre-line leading-relaxed">
              {project.description || 'No description provided.'}
            </p>

            {project.status === 'Active' && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/80 border border-calm-border/60 dark:border-slate-700/60 rounded-2xl">
                <span className="block text-[10px] font-bold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-1">
                  Concrete Next Action
                </span>
                <p className="text-sm font-semibold text-calm-text dark:text-slate-200">{project.nextStep}</p>
              </div>
            )}
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <h3 className="font-bold text-lg text-calm-text dark:text-slate-100">Edit Track Details</h3>
            
            {editError && (
              <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-xl">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all duration-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all duration-300"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-white dark:bg-slate-900">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all duration-300"
                >
                  <option value="Active" className="bg-white dark:bg-slate-900">Active</option>
                  <option value="Parked" className="bg-white dark:bg-slate-900">Parked</option>
                  <option value="Someday" className="bg-white dark:bg-slate-900">Someday</option>
                  <option value="Done" className="bg-white dark:bg-slate-900">Done</option>
                  <option value="Abandoned" className="bg-white dark:bg-slate-900">Abandoned</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all duration-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-2">
                Next Step {status === 'Active' && <span className="text-accent-orange font-bold">*</span>}
              </label>
              <input
                type="text"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="The single next concrete action"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-calm-text dark:text-slate-100 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all duration-300"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditError('');
                }}
                className="px-4 py-2 text-sm font-medium text-calm-muted dark:text-slate-400 hover:text-calm-text dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-calm-slate hover:bg-calm-slate/95 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-300"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats Block Dashboard */}
      <section className="mb-10">
        <h3 className="text-sm font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-4">Focus Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <Calendar className="w-5 h-5 text-calm-muted dark:text-slate-400 mb-1" />
            <span className="text-[10px] text-calm-muted dark:text-slate-400 uppercase font-bold tracking-wider">Days Active</span>
            <span className="text-lg font-bold text-calm-text dark:text-slate-100 mt-0.5">{daysSinceStart}d</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <CheckCircle className="w-5 h-5 text-accent-blue mb-1" />
            <span className="text-[10px] text-calm-muted dark:text-slate-400 uppercase font-bold tracking-wider">Check-ins</span>
            <span className="text-lg font-bold text-calm-text dark:text-slate-100 mt-0.5">{project.totalCheckIns || 0}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <Flame className="w-5 h-5 text-accent-amber mb-1" />
            <span className="text-[10px] text-calm-muted dark:text-slate-400 uppercase font-bold tracking-wider">Current Streak</span>
            <span className="text-lg font-bold text-calm-text dark:text-slate-100 mt-0.5">{project.streakCount || 0}d</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-200">
            <Sparkles className="w-5 h-5 text-accent-green mb-1" />
            <span className="text-[10px] text-calm-muted dark:text-slate-400 uppercase font-bold tracking-wider">Longest Streak</span>
            <span className="text-lg font-bold text-calm-text dark:text-slate-100 mt-0.5">{project.longestStreak || 0}d</span>
          </div>
        </div>
      </section>

      {/* Check-In History Timeline */}
      <section>
        <h3 className="text-sm font-semibold text-calm-muted dark:text-slate-400 uppercase tracking-wider mb-4">Check-in Logs</h3>
        {checkIns.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-calm-muted dark:text-slate-400">
            No check-in logs recorded yet. Start working and track your first step!
          </div>
        ) : (
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6">
            {checkIns.map((log) => (
              <div key={log._id} className="relative pl-6">
                {/* Dots indicator */}
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-accent-blue rounded-full"></div>
                
                <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 rounded-2xl p-4 shadow-3xs transition-colors duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-calm-muted dark:text-slate-400 font-medium">
                      {new Date(log.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {log.minutesSpent && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-calm-muted dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 mr-1" /> {log.minutesSpent}m
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-calm-text dark:text-slate-100 leading-relaxed font-medium">
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
          <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-calm-muted dark:text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start space-x-3.5 mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-2xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="pr-4">
                <h3 className="font-bold text-lg text-calm-text dark:text-slate-100 leading-tight">
                  Delete Track?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5 uppercase tracking-wider">
                  Permanent Action
                </p>
              </div>
            </div>

            <p className="text-sm text-calm-muted dark:text-slate-400 leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-semibold text-calm-text dark:text-slate-200">"{project.title}"</span>?
            </p>

            <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl mb-6 space-y-1 text-xs text-rose-800 dark:text-rose-300">
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
                className="px-4 py-2.5 text-xs font-semibold text-calm-muted dark:text-slate-400 hover:text-calm-text dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
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
