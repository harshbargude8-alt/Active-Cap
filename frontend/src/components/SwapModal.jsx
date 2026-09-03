import React from 'react';
import { X, ArrowLeftRight } from 'lucide-react';

export const SwapModal = ({ isOpen, onClose, activeProjects, onSwap, targetProjectName }) => {
  if (!isOpen || !activeProjects || activeProjects.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-calm-border dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-calm-muted dark:text-slate-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="inline-flex items-center text-xs font-semibold text-accent-amber bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Active Cap Reached
          </span>
          <h3 className="font-bold text-lg text-calm-text dark:text-slate-100 mt-3 leading-tight">
            Swap to activate "{targetProjectName}"?
          </h3>
          <p className="text-sm text-calm-muted dark:text-slate-400 mt-2">
            You can only have 2 active projects at once. Select an active project to park and replace:
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {activeProjects.map((project) => (
            <button
              key={project._id}
              onClick={() => onSwap(project._id)}
              className="w-full text-left p-4 border border-calm-border dark:border-slate-800 hover:border-accent-blue/50 dark:hover:border-accent-blue/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 rounded-2xl transition-all duration-300 group flex items-center justify-between"
            >
              <div className="flex-1 pr-4">
                <span className="inline-block text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-calm-slate dark:text-slate-300 px-2 py-0.5 rounded mb-1.5 uppercase">
                  {project.category}
                </span>
                <h4 className="font-semibold text-calm-text dark:text-slate-100 group-hover:text-accent-blue dark:group-hover:text-accent-blue transition-colors">
                  {project.title}
                </h4>
                <p className="text-xs text-calm-muted dark:text-slate-400 mt-0.5 line-clamp-1">
                  Next: {project.nextStep}
                </p>
              </div>
              <span className="text-xs font-medium text-accent-blue dark:text-sky-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 px-3 py-1.5 rounded-xl group-hover:bg-accent-blue group-hover:text-white transition-all duration-300 flex-shrink-0">
                Park & Swap
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-calm-muted dark:text-slate-400 hover:text-calm-text dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
export default SwapModal;
