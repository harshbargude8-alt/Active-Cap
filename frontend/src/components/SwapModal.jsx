import React from 'react';
import { X, ArrowLeftRight } from 'lucide-react';

export const SwapModal = ({ isOpen, onClose, activeProjects, onSwap, targetProjectName }) => {
  if (!isOpen || !activeProjects || activeProjects.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-graphite-800 border border-border-default w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="inline-flex items-center text-xs font-semibold text-warning bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Active Cap Reached
          </span>
          <h3 className="font-bold text-lg text-text-primary mt-3 leading-tight">
            Swap to activate "{targetProjectName}"?
          </h3>
          <p className="text-sm text-text-secondary mt-2">
            You can only have 2 active projects at once. Select an active project to park and replace:
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {activeProjects.map((project) => (
            <button
              key={project._id}
              onClick={() => onSwap(project._id)}
              className="w-full text-left p-4 border border-border-default hover:border-lime-accent/50 hover:bg-graphite-700/50 rounded-2xl transition-all duration-300 group flex items-center justify-between"
            >
              <div className="flex-1 pr-4">
                <span className="inline-block text-[10px] font-semibold bg-graphite-700 text-text-secondary px-2 py-0.5 rounded mb-1.5 uppercase">
                  {project.category}
                </span>
                <h4 className="font-semibold text-text-primary group-hover:text-lime-accent transition-colors">
                  {project.title}
                </h4>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  Next: {project.nextStep}
                </p>
              </div>
              <span className="text-xs font-medium text-lime-accent bg-lime-accent/10 border border-lime-accent/20 px-3 py-1.5 rounded-xl group-hover:bg-lime-accent group-hover:text-graphite-950 transition-all duration-300 flex-shrink-0">
                Park & Swap
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
export default SwapModal;
