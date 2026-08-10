import React, { useState, useEffect } from 'react';
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
  Sparkles
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

  const categories = ["Code", "Content", "Music", "Animation", "Writing", "Research", "Other"];

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
      } else {
        setProject(data);
        setIsEditing(false);
        setIsSwapOpen(false);
        loadProjectData();
      }
    } catch (err) {
      setEditError('Connection error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwap = (activeIdToPark) => {
    handleUpdateProject(null, activeIdToPark);
  };

  const handleDeleteProject = async () => {

    try {
      const res = await apiFetch(`/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onViewChange('dashboard');
      } else {
        alert('Failed to delete project.');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  if (loading && !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm text-calm-muted">Loading project file...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-calm-text">Project not found</h3>
        <button
          onClick={() => onViewChange('dashboard')}
          className="mt-4 px-4 py-2 bg-calm-slate text-white text-xs font-semibold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Calculate days since start
  const daysSinceStart = Math.max(
    0,
    Math.floor((new Date() - new Date(project.createdAt)) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      <button
        onClick={() => onViewChange('dashboard')}
        className="flex items-center space-x-1.5 text-xs font-semibold text-calm-muted hover:text-calm-text mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to dashboard</span>
      </button>

      {/* Main Details Panel */}
      <div className="bg-white border border-calm-border rounded-3xl p-6 md:p-8 shadow-2xs mb-8">
        
        {/* View Details Header */}
        {!isEditing ? (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold bg-slate-100 text-calm-slate px-2.5 py-1 rounded-full uppercase border border-slate-200">
                  {project.category}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${
                  project.status === 'Active' ? 'bg-blue-50 text-accent-blue border-blue-100' :
                  project.status === 'Parked' ? 'bg-slate-100 text-calm-slate border-slate-200' :
                  project.status === 'Done' ? 'bg-emerald-50 text-accent-green border-emerald-100' :
                  'bg-orange-50 text-accent-orange border-orange-100'
                }`}>
                  {project.status}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 border border-calm-border rounded-xl text-calm-muted hover:text-calm-text hover:bg-slate-50 transition-all duration-300"
                  title="Edit Project"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 border border-calm-border rounded-xl text-calm-muted hover:text-amber-700 hover:border-amber-200 hover:bg-amber-50 transition-all duration-300"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-calm-text tracking-tight leading-tight">
              {project.title}
            </h2>
            <p className="text-sm text-calm-muted mt-2 whitespace-pre-line leading-relaxed">
              {project.description || 'No description provided.'}
            </p>

            {project.status === 'Active' && (
              <div className="mt-6 p-4 bg-slate-50 border border-calm-border/60 rounded-2xl">
                <span className="block text-[10px] font-bold text-calm-muted uppercase tracking-wider mb-1">
                  Concrete Next Action
                </span>
                <p className="text-sm font-semibold text-calm-text">{project.nextStep}</p>
              </div>
            )}
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <h3 className="font-bold text-lg text-calm-text">Edit Project Details</h3>
            
            {editError && (
              <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
                >
                  <option value="Active">Active</option>
                  <option value="Parked">Parked</option>
                  <option value="Someday">Someday</option>
                  <option value="Done">Done</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">
                Next Step {status === 'Active' && <span className="text-accent-orange font-bold">*</span>}
              </label>
              <input
                type="text"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="The single next concrete action"
                className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditError('');
                }}
                className="px-4 py-2 text-sm font-medium text-calm-muted hover:text-calm-text"
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
        <h3 className="text-sm font-semibold text-calm-muted uppercase tracking-wider mb-4">Focus Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-calm-border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Calendar className="w-5 h-5 text-calm-muted mb-1" />
            <span className="text-[10px] text-calm-muted uppercase font-bold tracking-wider">Days Active</span>
            <span className="text-lg font-bold text-calm-text mt-0.5">{daysSinceStart}d</span>
          </div>

          <div className="bg-white border border-calm-border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-5 h-5 text-accent-blue mb-1" />
            <span className="text-[10px] text-calm-muted uppercase font-bold tracking-wider">Check-ins</span>
            <span className="text-lg font-bold text-calm-text mt-0.5">{project.totalCheckIns || 0}</span>
          </div>

          <div className="bg-white border border-calm-border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Flame className="w-5 h-5 text-accent-amber mb-1" />
            <span className="text-[10px] text-calm-muted uppercase font-bold tracking-wider">Current Streak</span>
            <span className="text-lg font-bold text-calm-text mt-0.5">{project.streakCount || 0}d</span>
          </div>

          <div className="bg-white border border-calm-border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-5 h-5 text-accent-green mb-1" />
            <span className="text-[10px] text-calm-muted uppercase font-bold tracking-wider">Longest Streak</span>
            <span className="text-lg font-bold text-calm-text mt-0.5">{project.longestStreak || 0}d</span>
          </div>
        </div>
      </section>

      {/* Check-In History Timeline */}
      <section>
        <h3 className="text-sm font-semibold text-calm-muted uppercase tracking-wider mb-4">Check-in Logs</h3>
        {checkIns.length === 0 ? (
          <div className="bg-white border border-calm-border rounded-2xl p-6 text-center text-xs text-calm-muted">
            No check-in logs recorded yet. Start working and track your first step!
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-4 space-y-6">
            {checkIns.map((log) => (
              <div key={log._id} className="relative pl-6">
                {/* Dots indicator */}
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-white border-2 border-accent-blue rounded-full"></div>
                
                <div className="bg-white border border-calm-border rounded-2xl p-4 shadow-3xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-calm-muted font-medium">
                      {new Date(log.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {log.minutesSpent && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-calm-muted bg-slate-50 border px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 mr-1" /> {log.minutesSpent}m
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-calm-text leading-relaxed font-medium">
                    {log.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
