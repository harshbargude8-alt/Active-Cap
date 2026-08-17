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
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 shadow-xl text-white flex items-center justify-between space-x-4">
        {/* Left: Indicator & Title */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </div>
          <div className="min-w-0 pr-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">
              Focusing Track
            </p>
            <h4 className="text-xs font-semibold truncate text-slate-100">
              {activeTimer.projectTitle}
            </h4>
          </div>
        </div>

        {/* Right: Time, Config & Control Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Bell & Alert Interval Dropdown */}
          <div className="flex items-center space-x-1 border-r border-slate-850 pr-3 mr-0.5 text-slate-400">
            <Bell className="w-3.5 h-3.5" />
            <select
              value={reminderInterval}
              onChange={(e) => setReminderInterval(Number(e.target.value))}
              className="bg-transparent text-slate-300 text-[10px] font-bold outline-none cursor-pointer hover:text-white transition-colors"
              title="Alert Interval"
            >
              <option value="10" className="bg-slate-950 text-slate-100">10m</option>
              <option value="15" className="bg-slate-950 text-slate-100">15m</option>
              <option value="20" className="bg-slate-950 text-slate-100">20m</option>
              <option value="30" className="bg-slate-950 text-slate-100">30m</option>
              <option value="60" className="bg-slate-950 text-slate-100">1h</option>
            </select>
          </div>

          <span className="text-sm font-bold font-mono tracking-wider text-slate-200">
            {formatTime(secondsElapsed)}
          </span>
          
          <button
            onClick={() => stopTimer()}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
            title="Stop & Log Time"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
          
          <button
            onClick={handleDiscardClick}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Discard Session"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
