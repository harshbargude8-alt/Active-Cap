import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { SwapModal } from '../components/SwapModal';
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  Folder,
  RefreshCw,
  X
} from 'lucide-react';

export const AllProjects = ({ onViewChange, onSelectProjectId }) => {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Create Project State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Code');
  const [newDescription, setNewDescription] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newStatus, setNewStatus] = useState('Parked');
  const [createError, setCreateError] = useState('');

  // Active Cap Swap State
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapTargetProject, setSwapTargetProject] = useState(null);
  const [activeProjectsList, setActiveProjectsList] = useState([]);

  const categories = ["Code", "Content", "Music", "Animation", "Writing", "Research", "Other"];
  const statuses = ["Active", "Parked", "Someday", "Done", "Abandoned"];

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error loading projects list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e, swapId = null) => {
    if (e) e.preventDefault();
    setCreateError('');

    if (!newTitle.trim()) {
      setCreateError('Title is required.');
      return;
    }

    if (newStatus === 'Active' && !newNextStep.trim()) {
      setCreateError('A concrete next step is required when status is Active.');
      return;
    }

    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          status: swapId ? 'Parked' : newStatus, // if we are swapping, create as parked first
          nextStep: newNextStep.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.capReached) {
          // Trigger swap dialog
          setSwapTargetProject({
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory,
            nextStep: newNextStep.trim(),
          });
          setActiveProjectsList(data.activeProjects);
          setIsSwapOpen(true);
          setIsCreateOpen(false);
        } else {
          setCreateError(data.error || 'Failed to create project.');
        }
        return;
      }

      // If we swapped successfully
      if (swapId) {
        const swapRes = await apiFetch(`/projects/${data._id}/status`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'Active',
            swapProjectId: swapId,
            nextStep: newNextStep.trim(),
          }),
        });

        if (!swapRes.ok) {
          const swapErr = await swapRes.json();
          setCreateError(swapErr.error || 'Project created but status swap failed.');
          return;
        }
      }

      setIsCreateOpen(false);
      resetCreateForm();
      loadProjects();
    } catch (err) {
      setCreateError('Connection error. Please try again.');
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewCategory('Code');
    setNewDescription('');
    setNewNextStep('');
    setNewStatus('Parked');
    setCreateError('');
  };

  const handleSwap = (activeIdToPark) => {
    handleCreateProject(null, activeIdToPark);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-blue-50 text-accent-blue border-blue-100';
      case 'Parked': return 'bg-slate-100 text-calm-slate border-slate-200';
      case 'Done': return 'bg-emerald-50 text-accent-green border-emerald-100';
      case 'Abandoned': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-orange-50 text-accent-orange border-orange-100';
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                          p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm text-calm-muted">Opening project archives...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-calm-text tracking-tight">Track Catalog</h2>
          <p className="text-xs text-calm-muted mt-0.5">Explore, search, and manage your active and parked tracks.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-1.5 bg-calm-slate hover:bg-calm-slate/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm self-start md:self-auto transition-all duration-300"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Track</span>
        </button>
      </div>

      {/* Filter and Search Bar Panel */}
      <div className="bg-white border border-calm-border rounded-2xl p-4 shadow-3xs mb-6 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-calm-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Tracks..."
            className="w-full bg-slate-50 border border-calm-border pl-9 pr-4 py-2 rounded-xl text-xs outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-calm-border px-3 py-2 pr-8 rounded-xl text-xs text-calm-text outline-none focus:bg-white focus:border-accent-blue transition-all duration-300 appearance-none"
            >
              <option value="All">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-calm-border px-3 py-2 pr-8 rounded-xl text-xs text-calm-text outline-none focus:bg-white focus:border-accent-blue transition-all duration-300 appearance-none"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects List catalog */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-calm-border rounded-3xl p-10 text-center text-xs text-calm-muted shadow-3xs">
          No Tracks found matching the criteria.
        </div>
      ) : (
        <div className="bg-white border border-calm-border rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-3xs">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              onClick={() => {
                onSelectProjectId(project._id);
                onViewChange('project-detail', project._id);
              }}
              className="p-4 hover:bg-slate-50/50 cursor-pointer flex justify-between items-center transition-all duration-300"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="text-[9px] font-bold bg-slate-100 text-calm-slate border border-slate-200 px-2 py-0.5 rounded">
                    {project.category}
                  </span>
                  <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-calm-text truncate">{project.title}</h4>
                <p className="text-xs text-calm-muted truncate mt-0.5">{project.description || 'No description.'}</p>
              </div>

              <ChevronRight className="w-4 h-4 text-calm-muted flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* New Project Form Drawer */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-slate-100 text-calm-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-calm-text mb-4">Start New Track</h3>
            {createError && (
              <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. OutboxSyncService"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Write a brief overview..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
                >
                  <option value="Parked">Parked</option>
                  <option value="Active">Active</option>
                  <option value="Someday">Someday</option>
                  <option value="Done">Done</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">
                  Next Step {newStatus === 'Active' && <span className="text-accent-orange font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="The next concrete action"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-calm-border rounded-xl text-calm-text text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-calm-muted hover:text-calm-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-calm-slate hover:bg-calm-slate/95 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-300"
                >
                  Create Track
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <SwapModal
        isOpen={isSwapOpen}
        activeProjects={activeProjectsList}
        targetProjectName={swapTargetProject?.title}
        onSwap={handleSwap}
        onClose={() => {
          setIsSwapOpen(false);
          setSwapTargetProject(null);
        }}
      />
    </div>
  );
};
export default AllProjects;
