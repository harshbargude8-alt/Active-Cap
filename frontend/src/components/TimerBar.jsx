import React from 'react';
import { useTimer } from '../context/TimerContext';
import { Square, X, Bell } from 'lucide-react';

export const TimerBar = () => {
  const {
    activeTimer,
    secondsElapsed,
    formatTime,
    stopTimer,
    cancelTimer,
    reminderInterval,
    setReminderInterval
  } = useTimer();

  if (!activeTimer) return null;

  const handleDiscardClick = () => {
    if (window.confirm('Discard this focus session? No progress will be logged.')) {
      cancelTimer();
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-md z-40 animate-slide-up">
      <div className="bg-graphite-800/95 backdrop-blur-md border border-border-default rounded-2xl p-4 shadow-xl text-text-primary flex items-center justify-between space-x-4">
        {/* Left: Indicator & Title */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-accent"></span>
          </div>
          <div className="min-w-0 pr-2">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none mb-0.5">
              Focusing Track
            </p>
            <h4 className="text-xs font-semibold truncate text-text-primary">
              {activeTimer.projectTitle}
            </h4>
          </div>
        </div>

        {/* Right: Time, Config & Control Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Bell & Alert Interval Dropdown */}
          <div className="flex items-center space-x-1 border-r border-border-default pr-3 mr-0.5 text-text-muted">
            <Bell className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={reminderInterval}
              onChange={(e) => setReminderInterval(Number(e.target.value))}
              className="bg-transparent text-text-secondary text-[10px] font-bold outline-none cursor-pointer hover:text-text-primary transition-colors"
              title="Alert Interval"
            >
              <option value="10" className="bg-graphite-800 text-text-primary">10m</option>
              <option value="15" className="bg-graphite-800 text-text-primary">15m</option>
              <option value="20" className="bg-graphite-800 text-text-primary">20m</option>
              <option value="30" className="bg-graphite-800 text-text-primary">30m</option>
              <option value="60" className="bg-graphite-800 text-text-primary">1h</option>
            </select>
          </div>

          <span className="text-sm font-bold font-mono tracking-wider text-lime-accent">
            {formatTime(secondsElapsed)}
          </span>
          
          <button
            onClick={() => stopTimer()}
            className="p-2 bg-error hover:brightness-110 text-graphite-950 rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
            title="Stop & Log Time"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
          
          <button
            onClick={handleDiscardClick}
            className="p-2 bg-graphite-700 hover:bg-graphite-600 text-text-muted hover:text-error rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Discard Session"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
