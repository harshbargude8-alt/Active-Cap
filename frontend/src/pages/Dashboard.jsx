import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { QuickCapture } from '../components/QuickCapture';
import { CheckInModal } from '../components/CheckInModal';
import { SwapModal } from '../components/SwapModal';
import {
  X,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Inbox,
  AlertCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  FolderOpen,
  Play,
  Square
} from 'lucide-react';

export const Dashboard = ({ onViewChange, onSelectProjectId }) => {
  const { apiFetch } = useAuth();
  const { activeTimer, secondsElapsed, formatTime, startTimer, stopTimer } = useTimer();
  const [projects, setProjects] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Swap State
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapTargetProject, setSwapTargetProject] = useState(null);
  const [activeProjectsList, setActiveProjectsList] = useState([]);

  // Create Project Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Code');
  const [newDescription, setNewDescription] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newStatus, setNewStatus] = useState('Parked');
  const [createError, setCreateError] = useState('');

  const categories = ["Code", "Content", "Music", "Animation", "Writing", "Research", "Other"];

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Code': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Content': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Music': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'Animation': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Writing': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Research': return 'bg-teal-50 text-teal-700 border-teal-100';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const projRes = await apiFetch('/projects');
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }

      const revRes = await apiFetch('/review');
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviewData(revData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleCheckinLogged = () => {
      loadData();
    };
    window.addEventListener('project-checkin-logged', handleCheckinLogged);
    return () => window.removeEventListener('project-checkin-logged', handleCheckinLogged);
  }, []);

  const handleCheckInSuccess = () => {
    loadData();
  };

  // Trigger Swap Flow
  const handleSwap = async (activeProjectIdToPark) => {
    try {
      const res = await apiFetch(`/projects/${swapTargetProject._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Active',
          swapProjectId: activeProjectIdToPark,
          nextStep: swapTargetProject.nextStep,
        }),
      });

      if (res.ok) {
        setIsSwapOpen(false);
        setSwapTargetProject(null);
        loadData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Swap failed');
      }
    } catch (err) {
      console.error('Error executing swap:', err);
    }
  };

  // Create Project Submit
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newTitle.trim()) {
      setCreateError('Title is required.');
      return;
    }

    if (newStatus === 'Active' && !newNextStep.trim()) {
      setCreateError('A concrete next step is required to save a project as Active.');
      return;
    }

    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          status: newStatus,
          nextStep: newNextStep.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.capReached) {
          // Trigger swap prompt
          setSwapTargetProject({
            _id: 'pending', // placeholder id since project doesn't exist yet, we will prompt user to park one, then we will create this project
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory,
            nextStep: newNextStep.trim(),
          });
          setActiveProjectsList(data.activeProjects);
          // Wait, since we are creating it, we can create it as Parked first, and then swap it!
          // Let's call another API to create it as Parked, then perform swap on that ID.
          // Creating as Parked first is extremely clean:
          const createParkedRes = await apiFetch('/projects', {
            method: 'POST',
            body: JSON.stringify({
              title: newTitle.trim(),
              description: newDescription.trim(),
              category: newCategory,
              status: 'Parked',
              nextStep: newNextStep.trim(),
            }),
          });
          if (createParkedRes.ok) {
            const parkedProj = await createParkedRes.json();
            setSwapTargetProject(parkedProj);
            setIsCreateOpen(false);
            setIsSwapOpen(true);
          } else {
            const errData = await createParkedRes.json();
            setCreateError(errData.error || 'Failed to create project.');
          }
        } else {
          setCreateError(data.error || 'Failed to create project.');
        }
        return;
      }

      setIsCreateOpen(false);
      resetCreateForm();
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

  // Group projects
  const activeProjects = projects.filter((p) => p.status === 'Active');
  const parkedProjects = projects.filter((p) => p.status === 'Parked');
  const somedayProjects = projects.filter((p) => p.status === 'Someday');

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm text-calm-muted">Gathering your tracks...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      
      {/* Quick capture input at the top */}
      <QuickCapture onSuccess={loadData} />

      {/* Main Grid: Active Focus & Review Banner */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-calm-text tracking-tight flex items-center">
              Active Focus
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-full">
                {activeProjects.length}/2 Active
              </span>
            </h2>
            <p className="text-xs text-calm-muted mt-0.5">The hard cap. No extra pile-on.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 bg-calm-slate hover:bg-calm-slate/95 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-sm transition-all duration-300"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Track</span>
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="bg-white border border-calm-border rounded-3xl p-8 text-center max-w-xl mx-auto shadow-sm">
            <FolderOpen className="w-10 h-10 text-calm-muted mx-auto mb-3" />
            <h3 className="font-semibold text-calm-text">No active Tracks</h3>
            <p className="text-sm text-calm-muted mt-1 max-w-sm mx-auto">
              You currently have 0 active items. Activate a parked Track or start a new one to focus.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 bg-accent-blue text-white text-xs font-semibold px-4 py-2 rounded-xl"
            >
              Start New Track
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProjects.map((project) => (
              <div
                key={project._id}
                className="bg-white border border-calm-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full uppercase tracking-wider ${getCategoryColor(project.category)}`}>
                      {project.category}
                    </span>
                    {project.streakCount > 0 && (
                      <div className="flex items-center space-x-1 text-accent-amber bg-amber-50/50 px-2 py-1 rounded-lg border border-amber-100">
                        <Flame className="w-4 h-4 fill-accent-amber" />
                        <span className="text-xs font-bold">{project.streakCount}d streak</span>
                      </div>
                    )}
                  </div>

                  <h3
                    onClick={() => {
                      onSelectProjectId(project._id);
                      onViewChange('project-detail', project._id);
                    }}
                    className="font-bold text-lg text-calm-text hover:text-accent-blue cursor-pointer transition-colors leading-tight"
                  >
                    {project.title}
                  </h3>
                  <p className="text-sm text-calm-muted mt-2 line-clamp-2">{project.description || 'No description provided.'}</p>

                  <div className="mt-5 p-3.5 bg-slate-50 border border-calm-border/60 rounded-2xl">
                    <span className="block text-[10px] font-bold text-calm-muted uppercase tracking-wider mb-1">
                      Next Step
                    </span>
                    <p className="text-xs font-medium text-calm-text leading-relaxed">
                      {project.nextStep}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-calm-muted font-medium">
                    Touched {project.lastTouchedAt ? new Date(project.lastTouchedAt).toLocaleDateString() : 'never'}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    {activeTimer && activeTimer.projectId === project._id ? (
                      <button
                        onClick={() => stopTimer()}
                        className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300 flex items-center space-x-1 cursor-pointer animate-pulse"
                        title="Stop Timer & Log Time"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop ({formatTime(secondsElapsed)})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startTimer(project._id, project.title)}
                        disabled={activeTimer !== null}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-300 flex items-center space-x-1 cursor-pointer ${
                          activeTimer
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-slate-50 hover:bg-accent-blue/10 border-calm-border hover:border-accent-blue/35 text-calm-text hover:text-accent-blue'
                        }`}
                        title={activeTimer ? 'A timer is already running' : 'Start Focus Timer'}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Focus</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setIsCheckInOpen(true);
                      }}
                      className="bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-300 shadow-sm flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check in</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weekly review prompt banner */}
      {reviewData && (reviewData.checkInsThisWeek.length > 0 || reviewData.longestParked.length > 0) && (
        <section className="mb-12 bg-gradient-to-tr from-slate-100 to-slate-50 border border-calm-border rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-blue/5 rounded-full blur-lg"></div>
          
          <h3 className="font-bold text-sm text-calm-text uppercase tracking-wider flex items-center mb-3">
            <TrendingUp className="w-4 h-4 mr-1.5 text-accent-blue animate-bounce" /> Weekly review helper
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-calm-muted">
              You recorded <span className="font-bold text-calm-text">{reviewData.checkInsThisWeek.length} check-ins</span> this week.
            </p>
            {reviewData.longestParked.length > 0 && (
              <p className="text-xs text-calm-muted">
                📌 Longest parked without touches:{' '}
                <span className="font-semibold text-calm-text">
                  "{reviewData.longestParked[0].title}"
                </span>{' '}
                (since {new Date(reviewData.longestParked[0].lastTouchedAt || reviewData.longestParked[0].updatedAt).toLocaleDateString()}).
              </p>
            )}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-xs font-medium text-calm-text">
                Still focused on the right 2 things, or swap?
              </span>
              <button
                onClick={() => onViewChange('all-projects')}
                className="text-xs font-semibold text-accent-blue hover:underline flex items-center"
              >
                Manage Tracks <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Parked Projects & Someday List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Parked list (2/3 width on desktop) */}
        <section className="md:col-span-2">
          <h3 className="text-lg font-bold text-calm-text mb-4 flex items-center justify-between">
            <span>Parked ({parkedProjects.length})</span>
            <span className="text-xs text-calm-muted font-normal">Visible, not nagged</span>
          </h3>

          {parkedProjects.length === 0 ? (
            <div className="bg-white border border-dashed border-calm-border rounded-3xl p-6 text-center text-calm-muted text-xs">
              No parked Tracks.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {parkedProjects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => {
                    onSelectProjectId(project._id);
                    onViewChange('project-detail', project._id);
                  }}
                  className="bg-white border border-calm-border rounded-2xl p-4 hover:border-slate-300 cursor-pointer shadow-2xs hover:shadow-xs transition-all duration-300 flex justify-between items-center"
                >
                  <div className="min-w-0 pr-4">
                    <span className={`inline-block text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider mb-1.5 ${getCategoryColor(project.category)}`}>
                      {project.category}
                    </span>
                    <h4 className="font-semibold text-sm text-calm-text truncate">{project.title}</h4>
                    <p className="text-xs text-calm-muted truncate mt-0.5">Next step: {project.nextStep || 'Not set'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-calm-muted flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Someday list (1/3 width on desktop) */}
        <section>
          <h3 className="text-lg font-bold text-calm-text mb-4">Someday ({somedayProjects.length})</h3>
          
          {somedayProjects.length === 0 ? (
            <div className="bg-white border border-dashed border-calm-border rounded-3xl p-6 text-center text-calm-muted text-xs">
              No someday items.
            </div>
          ) : (
            <div className="bg-white border border-calm-border rounded-2xl p-4 divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
              {somedayProjects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => {
                    onSelectProjectId(project._id);
                    onViewChange('project-detail', project._id);
                  }}
                  className="py-2.5 hover:text-accent-blue cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <span className="text-xs text-calm-text font-medium truncate group-hover:text-accent-blue transition-colors">
                    {project.title}
                  </span>
                  <span className="text-[9px] text-calm-muted font-normal capitalize">
                    {project.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Dialogs */}
      <CheckInModal
        project={selectedProject}
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setSelectedProject(null);
        }}
        onSuccess={handleCheckInSuccess}
      />

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

      {/* New Project Dialog */}
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
            {createError && <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl">{createError}</div>}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-calm-muted uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Synth patch design"
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
                  placeholder="Brief context or goals..."
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
                  <option value="Parked">Parked (Keep visible but inactive)</option>
                  <option value="Active">Active (Bring to top of focus, max 2)</option>
                  <option value="Someday">Someday</option>
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
                  placeholder="The single next concrete action"
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default Dashboard;
