import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import { SwapModal } from '../components/SwapModal';
import { PROJECT_STATUSES, getCategoryColor, getStatusColor } from '../constants/project';
import { clientCache } from '../utils/clientCache';
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  Folder,
  RefreshCw,
  X,
  Inbox,
  Tag,
  Settings2,
} from 'lucide-react';

export const AllProjects = ({ onViewChange, onSelectProjectId }) => {
  const { apiFetch } = useAuth();
  const { categoryNames, openManageModal } = useCategories();

  const cachedProjects = clientCache.get('/projects');
  const cachedInbox = clientCache.get('/inbox');

  const [projects, setProjects] = useState(cachedProjects || []);
  const [loading, setLoading] = useState(!cachedProjects);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [inboxCount, setInboxCount] = useState(Array.isArray(cachedInbox) ? cachedInbox.length : 0);

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

  const loadData = async () => {
    if (!clientCache.get('/projects')) {
      setLoading(true);
    }
    try {
      // Parallel fetch for projects and inbox count
      const [projRes, inboxRes] = await Promise.all([
        apiFetch('/projects'),
        apiFetch('/inbox'),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);
        clientCache.set('/projects', data, 60);
      }

      if (inboxRes.ok) {
        const inData = await inboxRes.json();
        setInboxCount(Array.isArray(inData) ? inData.length : 0);
        clientCache.set('/inbox', inData, 60);
      }
    } catch (err) {
      console.error('Error loading projects list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      clientCache.invalidate('/projects');
      loadData();
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

  const handleSwapAndCreate = (activeIdToPark) => {
    handleCreateProject(null, activeIdToPark);
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
        <RefreshCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-sm text-text-muted">Opening project archives...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-heading text-xl font-bold text-text-primary tracking-tight">Track Catalog</h2>
          <p className="text-xs text-text-muted mt-0.5">Explore, search, and manage your active and parked tracks.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Quick Capture Inbox Navigation Button */}
          <button
            onClick={() => onViewChange('inbox')}
            className="flex items-center space-x-2 bg-graphite-800 hover:bg-graphite-700 border border-border-default hover:border-lime-accent/40 text-text-primary text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
            title="Open Quick Capture Inbox"
          >
            <Inbox className="w-4 h-4 text-lime-accent" />
            <span>Inbox</span>
            {inboxCount > 0 && (
              <span className="text-[10px] bg-lime-accent/20 text-lime-accent px-1.5 py-0.5 rounded-full font-mono font-bold leading-none">
                {inboxCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-300 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Track</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Panel */}
      <div className="bg-graphite-800 border border-border-default rounded-2xl p-4 shadow-3xs mb-6 flex flex-col md:flex-row gap-3 transition-colors duration-200">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Tracks..."
            className="w-full bg-graphite-700 border border-border-default pl-9 pr-4 py-2 rounded-xl text-xs text-text-primary placeholder-text-muted outline-none focus:border-lime-accent transition-all duration-300"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-graphite-700 border border-border-default px-3 py-2 pr-8 rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="All" className="bg-graphite-800">All Statuses</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-graphite-800">{s}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => {
                if (e.target.value === '__manage__') {
                  openManageModal();
                  return;
                }
                setCategoryFilter(e.target.value);
              }}
              className="bg-graphite-700 border border-border-default px-3 py-2 pr-8 rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="All" className="bg-graphite-800">All Categories</option>
              {categoryNames.map((c) => (
                <option key={c} value={c} className="bg-graphite-800">{c}</option>
              ))}
              <option disabled className="bg-graphite-800">──────────</option>
              <option value="__manage__" className="bg-graphite-800 text-lime-accent font-semibold">⚙️ Manage Categories...</option>
            </select>
          </div>

          <button
            onClick={openManageModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-graphite-700 hover:bg-graphite-600 border border-border-default hover:border-lime-accent/40 rounded-xl text-xs font-semibold text-text-primary hover:text-lime-accent transition-all cursor-pointer flex-shrink-0"
            title="Manage Categories (Create, Edit, Archive)"
          >
            <Tag className="w-3.5 h-3.5 text-lime-accent" />
            <span className="hidden sm:inline">Categories</span>
          </button>
        </div>
      </div>

      {/* Projects List catalog */}
      {filteredProjects.length === 0 ? (
        <div className="bg-graphite-800 border border-border-default rounded-2xl p-10 text-center text-xs text-text-muted shadow-3xs">
          No Tracks found matching the criteria.
        </div>
      ) : (
        <div className="bg-graphite-800 border border-border-default rounded-2xl divide-y divide-border-subtle overflow-hidden shadow-3xs transition-colors duration-200">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              onClick={() => {
                onSelectProjectId(project._id);
                onViewChange('project-detail', project._id);
              }}
              className="p-4 hover:bg-graphite-700 cursor-pointer flex justify-between items-center transition-all duration-300"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="text-[9px] font-bold bg-graphite-700 text-text-secondary border border-border-default px-2 py-0.5 rounded">
                    {project.category}
                  </span>
                  <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-text-primary truncate">{project.title}</h4>
                <p className="text-xs text-text-muted truncate mt-0.5">{project.description || 'No description.'}</p>
              </div>

              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* New Project Form Drawer */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-text-primary mb-4">Start New Track</h3>
            {createError && (
              <div className="mb-4 text-xs bg-warning/10 border border-warning/20 text-warning p-3 rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. OutboxSyncService"
                  required
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider">Category</label>
                  <button
                    type="button"
                    onClick={openManageModal}
                    className="text-[10px] font-semibold text-lime-accent hover:text-lime-accent-hover transition-colors cursor-pointer"
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    if (e.target.value === '__manage__') {
                      openManageModal();
                      return;
                    }
                    setNewCategory(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  {categoryNames.map((cat) => (
                    <option key={cat} value={cat} className="bg-graphite-800">{cat}</option>
                  ))}
                  <option disabled className="bg-graphite-800">──────────</option>
                  <option value="__manage__" className="bg-graphite-800 text-lime-accent font-semibold">⚙️ Manage Categories...</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Goals, target outcome..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                >
                  <option value="Parked" className="bg-graphite-800">Parked</option>
                  <option value="Active" className="bg-graphite-800">Active (Bring to focus immediately)</option>
                  <option value="Someday" className="bg-graphite-800">Someday</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Next Step {newStatus === 'Active' && <span className="text-warning font-bold">*</span>}
                </label>
                <input
                  type="text"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="What is the single next concrete action?"
                  className="w-full px-4 py-2.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-sm outline-none focus:border-lime-accent transition-all duration-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-sm font-medium rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
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
        onSwap={handleSwapAndCreate}
        onClose={() => {
          setIsSwapOpen(false);
          setSwapTargetProject(null);
        }}
      />
    </div>
  );
};
export default AllProjects;
