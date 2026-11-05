import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { clientCache } from '../utils/clientCache';
import {
  Calendar,
  Clock,
  Edit3,
  Check,
  RotateCcw,
  X,
  Sun,
  Sunset,
  Sunrise,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  Zap,
  CalendarDays
} from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Timetable = () => {
  const { apiFetch } = useAuth();

  const cachedTimetable = clientCache.get('/timetable');

  const [timetable, setTimetable] = useState(cachedTimetable || null);
  const [loading, setLoading] = useState(!cachedTimetable);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form edit state
  const [editedSchedule, setEditedSchedule] = useState(cachedTimetable?.schedule || []);
  const [editedNotes, setEditedNotes] = useState(cachedTimetable?.notes || []);
  const [editedGoldenRule, setEditedGoldenRule] = useState(cachedTimetable?.goldenRule || '');
  const [toast, setToast] = useState(null);

  // Determine current day abbreviation
  const todayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ...
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayAbbr = dayMap[todayIndex];

  // Mobile selected day view state (Defaults to today)
  const [selectedDay, setSelectedDay] = useState(todayAbbr);

  // Live time of day calculation
  const getCurrentTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 24) return 'evening';
    return 'morning';
  };
  const currentTimeSlot = getCurrentTimeSlot();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadTimetable = async () => {
    if (!clientCache.get('/timetable')) {
      setLoading(true);
    }
    try {
      const res = await apiFetch('/timetable');
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        setEditedSchedule(data.schedule || []);
        setEditedNotes(data.notes || []);
        setEditedGoldenRule(data.goldenRule || '');
        clientCache.set('/timetable', data, 300);
      }
    } catch (err) {
      console.error('Failed to load timetable:', err);
      showToast('Failed to load timetable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const handleStartEdit = () => {
    if (!timetable) return;
    setEditedSchedule(JSON.parse(JSON.stringify(timetable.schedule || [])));
    setEditedNotes([...(timetable.notes || [])]);
    setEditedGoldenRule(timetable.goldenRule || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!timetable) return;
    setEditedSchedule(timetable.schedule || []);
    setEditedNotes(timetable.notes || []);
    setEditedGoldenRule(timetable.goldenRule || '');
    setIsEditing(false);
  };

  const handleScheduleCellChange = (index, field, value) => {
    const updated = [...editedSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setEditedSchedule(updated);
  };

  const handleNoteChange = (index, value) => {
    const updated = [...editedNotes];
    updated[index] = value;
    setEditedNotes(updated);
  };

  const handleAddNote = () => {
    setEditedNotes([...editedNotes, '']);
  };

  const handleRemoveNote = (index) => {
    setEditedNotes(editedNotes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/timetable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: editedSchedule,
          notes: editedNotes.filter((n) => n.trim().length > 0),
          goldenRule: editedGoldenRule,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        setIsEditing(false);
        showToast('Timetable updated successfully!');
      } else {
        showToast('Failed to save changes.', 'error');
      }
    } catch (err) {
      console.error('Error saving timetable:', err);
      showToast('Error saving timetable.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset timetable back to original recommended structure? Your customizations will be overwritten.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/timetable/reset', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        setEditedSchedule(data.schedule || []);
        setEditedNotes(data.notes || []);
        setEditedGoldenRule(data.goldenRule || '');
        setIsEditing(false);
        showToast('Timetable reset to default template!');
      } else {
        showToast('Failed to reset timetable.', 'error');
      }
    } catch (err) {
      console.error('Error resetting timetable:', err);
      showToast('Error resetting timetable.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrevDay = () => {
    const currentIndex = DAYS_OF_WEEK.indexOf(selectedDay);
    if (currentIndex > 0) {
      setSelectedDay(DAYS_OF_WEEK[currentIndex - 1]);
    } else {
      setSelectedDay(DAYS_OF_WEEK[DAYS_OF_WEEK.length - 1]);
    }
  };

  const handleNextDay = () => {
    const currentIndex = DAYS_OF_WEEK.indexOf(selectedDay);
    if (currentIndex < DAYS_OF_WEEK.length - 1) {
      setSelectedDay(DAYS_OF_WEEK[currentIndex + 1]);
    } else {
      setSelectedDay(DAYS_OF_WEEK[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-accent" />
        <span className="text-sm text-text-muted font-medium">Loading weekly timetable...</span>
      </div>
    );
  }

  const currentSchedule = isEditing ? editedSchedule : timetable?.schedule || [];
  const currentNotes = isEditing ? editedNotes : timetable?.notes || [];
  const currentGoldenRule = isEditing ? editedGoldenRule : timetable?.goldenRule || '';

  // Get active day data for mobile view
  const activeDayRowIndex = currentSchedule.findIndex(
    (row) => row.day.toLowerCase() === selectedDay.toLowerCase()
  );
  const activeDayRow = activeDayRowIndex !== -1 ? currentSchedule[activeDayRowIndex] : currentSchedule[0];
  const isSelectedDayToday = selectedDay.toLowerCase() === todayAbbr.toLowerCase();

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      {/* Toast alert */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold animate-slide-up flex items-center space-x-2 ${
            toast.type === 'error'
              ? 'bg-error/10 text-error border-error/20'
              : 'bg-success/10 text-success border-success/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-lime-accent/10 text-lime-accent">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-text-primary tracking-tight">Weekly Rhythm</h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Protected focus blocks, energy management, and built-in slack buffers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-border-default text-text-muted hover:text-text-primary hover:bg-graphite-700 text-xs font-medium transition-all duration-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all duration-300 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-border-default text-text-muted hover:text-text-primary hover:bg-graphite-700 text-xs font-medium transition-all duration-300 cursor-pointer"
                title="Reset to default template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
              <button
                onClick={handleStartEdit}
                className="flex items-center space-x-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MOBILE DAY SELECTOR RIBBON (Zero-scroll day switcher) */}
      <div className="lg:hidden mb-5">
        <div className="flex items-center justify-between space-x-1.5 p-1.5 bg-graphite-800 border border-border-default rounded-2xl overflow-x-auto custom-scrollbar">
          {DAYS_OF_WEEK.map((day) => {
            const isToday = day.toLowerCase() === todayAbbr.toLowerCase();
            const isCurrentSelected = selectedDay.toLowerCase() === day.toLowerCase();

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center min-w-[42px] cursor-pointer ${
                  isCurrentSelected
                    ? 'bg-lime-accent text-graphite-950 shadow-sm scale-102'
                    : 'text-text-muted hover:text-text-primary hover:bg-graphite-700'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isCurrentSelected ? 'bg-graphite-950 animate-pulse' : 'bg-lime-accent'
                    }`}
                    title="Today"
                  />
                )}
              </button>
            );
          })}

          {/* All Week Toggle Button */}
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 flex items-center justify-center cursor-pointer flex-shrink-0 ${
              selectedDay === 'ALL'
                ? 'bg-graphite-700 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-graphite-700'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1" />
            <span>All</span>
          </button>
        </div>
      </div>

      {/* MOBILE TODAY-FIRST SMART HERO VIEW (When single day is selected) */}
      <div className="lg:hidden mb-8">
        {selectedDay !== 'ALL' && activeDayRow ? (
          <div className="bg-graphite-800 border border-border-default rounded-2xl p-5 shadow-xs transition-colors duration-200 animate-scale-up">
            {/* Day Header Bar with Quick Previous/Next & Today Jump */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-subtle">
              <div className="flex items-center space-x-2.5">
                <h3 className="font-heading text-xl font-bold text-text-primary tracking-tight">
                  {activeDayRow.day} Schedule
                </h3>
                {isSelectedDayToday && (
                  <span className="bg-lime-accent text-graphite-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    Today
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                {!isSelectedDayToday && (
                  <button
                    onClick={() => setSelectedDay(todayAbbr)}
                    className="text-[10px] font-bold text-lime-accent bg-lime-accent/10 px-2.5 py-1 rounded-lg hover:bg-lime-accent hover:text-graphite-950 transition-all mr-1 cursor-pointer"
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 rounded-xl border border-border-default text-text-muted hover:text-text-primary hover:bg-graphite-700 transition-colors cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-1.5 rounded-xl border border-border-default text-text-muted hover:text-text-primary hover:bg-graphite-700 transition-colors cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time Slot Cards */}
            <div className="space-y-3.5">
              {/* Morning Block */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isSelectedDayToday && currentTimeSlot === 'morning'
                    ? 'bg-lime-accent/5 border-lime-accent/30 shadow-xs'
                    : 'bg-graphite-700/60 border-border-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-warning text-xs font-bold uppercase tracking-wider">
                    <Sunrise className="w-4 h-4 text-warning" />
                    <span>Morning Focus</span>
                  </div>
                  {isSelectedDayToday && currentTimeSlot === 'morning' && (
                    <span className="flex items-center text-[10px] font-extrabold text-lime-accent bg-lime-accent/10 px-2 py-0.5 rounded-md animate-pulse">
                      <Zap className="w-3 h-3 mr-1 fill-current" /> Active Now
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={activeDayRow.morning}
                    onChange={(e) => handleScheduleCellChange(activeDayRowIndex, 'morning', e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent"
                    placeholder="Morning focus tasks..."
                  />
                ) : (
                  <p className="text-sm text-text-primary font-semibold leading-relaxed">
                    {activeDayRow.morning || '—'}
                  </p>
                )}
              </div>

              {/* Afternoon Block */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isSelectedDayToday && currentTimeSlot === 'afternoon'
                    ? 'bg-lime-accent/5 border-lime-accent/30 shadow-xs'
                    : 'bg-graphite-700/60 border-border-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-info text-xs font-bold uppercase tracking-wider">
                    <Sun className="w-4 h-4 text-info" />
                    <span>Afternoon Block</span>
                  </div>
                  {isSelectedDayToday && currentTimeSlot === 'afternoon' && (
                    <span className="flex items-center text-[10px] font-extrabold text-lime-accent bg-lime-accent/10 px-2 py-0.5 rounded-md animate-pulse">
                      <Zap className="w-3 h-3 mr-1 fill-current" /> Active Now
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={activeDayRow.afternoon}
                    onChange={(e) => handleScheduleCellChange(activeDayRowIndex, 'afternoon', e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent"
                    placeholder="Afternoon tasks..."
                  />
                ) : (
                  <p className="text-sm text-text-primary font-semibold leading-relaxed">
                    {activeDayRow.afternoon || '—'}
                  </p>
                )}
              </div>

              {/* Evening Block */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isSelectedDayToday && currentTimeSlot === 'evening'
                    ? 'bg-lime-accent/5 border-lime-accent/30 shadow-xs'
                    : 'bg-graphite-700/60 border-border-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider">
                    <Sunset className="w-4 h-4 text-purple-400" />
                    <span>Evening Rhythm</span>
                  </div>
                  {isSelectedDayToday && currentTimeSlot === 'evening' && (
                    <span className="flex items-center text-[10px] font-extrabold text-lime-accent bg-lime-accent/10 px-2 py-0.5 rounded-md animate-pulse">
                      <Zap className="w-3 h-3 mr-1 fill-current" /> Active Now
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={activeDayRow.evening}
                    onChange={(e) => handleScheduleCellChange(activeDayRowIndex, 'evening', e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent"
                    placeholder="Evening tasks..."
                  />
                ) : (
                  <p className="text-sm text-text-primary font-semibold leading-relaxed">
                    {activeDayRow.evening || '—'}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Mobile Stacked All-Days View (When 'ALL' is selected in the ribbon) */
          <div className="space-y-4">
            {currentSchedule.map((row, idx) => {
              const isToday = row.day.toLowerCase() === todayAbbr.toLowerCase();
              return (
                <div
                  key={row.day || idx}
                  className={`bg-graphite-800 border rounded-2xl p-5 shadow-2xs transition-all duration-300 ${
                    isToday
                      ? 'border-lime-accent/40 bg-gradient-to-br from-graphite-800 to-lime-accent/5 shadow-sm'
                      : 'border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-border-subtle">
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-heading text-base font-bold ${isToday ? 'text-lime-accent' : 'text-text-primary'}`}>
                        {row.day}
                      </h3>
                      {isToday && (
                        <span className="bg-lime-accent text-graphite-950 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Today
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-graphite-700/60 border border-border-subtle rounded-xl">
                      <div className="flex items-center space-x-1.5 text-warning text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Sunrise className="w-3.5 h-3.5 text-warning" />
                        <span>Morning</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.morning}
                          onChange={(e) => handleScheduleCellChange(idx, 'morning', e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent"
                        />
                      ) : (
                        <p className="text-text-primary font-medium">{row.morning || '—'}</p>
                      )}
                    </div>

                    <div className="p-3 bg-graphite-700/60 border border-border-subtle rounded-xl">
                      <div className="flex items-center space-x-1.5 text-info text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Sun className="w-3.5 h-3.5 text-info" />
                        <span>Afternoon</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.afternoon}
                          onChange={(e) => handleScheduleCellChange(idx, 'afternoon', e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent"
                        />
                      ) : (
                        <p className="text-text-primary font-medium">{row.afternoon || '—'}</p>
                      )}
                    </div>

                    <div className="p-3 bg-graphite-700/60 border border-border-subtle rounded-xl">
                      <div className="flex items-center space-x-1.5 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Sunset className="w-3.5 h-3.5 text-purple-400" />
                        <span>Evening</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.evening}
                          onChange={(e) => handleScheduleCellChange(idx, 'evening', e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent"
                        />
                      ) : (
                        <p className="text-text-primary font-medium">{row.evening || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP TIMETABLE GRID */}
      <div className="hidden lg:block bg-graphite-800 border border-border-default rounded-2xl shadow-2xs overflow-hidden mb-8 transition-colors duration-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-graphite-700/80 border-b border-border-default text-[11px] font-bold text-text-muted uppercase tracking-wider">
              <th className="py-4 px-6 w-28">Day</th>
              <th className="py-4 px-6">
                <div className="flex items-center space-x-1.5 text-warning">
                  <Sunrise className="w-4 h-4" />
                  <span>Morning</span>
                </div>
              </th>
              <th className="py-4 px-6">
                <div className="flex items-center space-x-1.5 text-info">
                  <Sun className="w-4 h-4" />
                  <span>Afternoon</span>
                </div>
              </th>
              <th className="py-4 px-6">
                <div className="flex items-center space-x-1.5 text-purple-400">
                  <Sunset className="w-4 h-4" />
                  <span>Evening</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-xs">
            {currentSchedule.map((row, idx) => {
              const isToday = row.day.toLowerCase() === todayAbbr.toLowerCase();
              return (
                <tr
                  key={row.day || idx}
                  className={`transition-colors duration-200 ${
                    isToday
                      ? 'bg-lime-accent/5 hover:bg-lime-accent/10 font-medium'
                      : 'hover:bg-graphite-700/60'
                  }`}
                >
                  {/* Day Column */}
                  <td className="py-4 px-6 font-bold text-text-primary align-top">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${isToday ? 'text-lime-accent font-extrabold' : ''}`}>
                        {row.day}
                      </span>
                      {isToday && (
                        <span className="bg-lime-accent/10 text-lime-accent border border-lime-accent/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-2xs">
                          Today
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Morning */}
                  <td className="py-3 px-6 align-top">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.morning}
                        onChange={(e) => handleScheduleCellChange(idx, 'morning', e.target.value)}
                        className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent transition-all"
                        placeholder="Morning task..."
                      />
                    ) : (
                      <div className="text-text-primary leading-relaxed">
                        {row.morning === '—' || !row.morning ? (
                          <span className="text-text-muted/60">—</span>
                        ) : (
                          <span>{row.morning}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Afternoon */}
                  <td className="py-3 px-6 align-top">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.afternoon}
                        onChange={(e) => handleScheduleCellChange(idx, 'afternoon', e.target.value)}
                        className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent transition-all"
                        placeholder="Afternoon task..."
                      />
                    ) : (
                      <div className="text-text-primary leading-relaxed">
                        {row.afternoon === '—' || !row.afternoon ? (
                          <span className="text-text-muted/60">—</span>
                        ) : (
                          <span>{row.afternoon}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Evening */}
                  <td className="py-3 px-6 align-top">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.evening}
                        onChange={(e) => handleScheduleCellChange(idx, 'evening', e.target.value)}
                        className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent transition-all"
                        placeholder="Evening task..."
                      />
                    ) : (
                      <div className="text-text-primary leading-relaxed">
                        {row.evening === '—' || !row.evening ? (
                          <span className="text-text-muted/60">—</span>
                        ) : (
                          <span>{row.evening}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Guidelines & Strategy Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strategy Notes */}
        <div className="bg-graphite-800 border border-border-default rounded-2xl p-6 shadow-2xs flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center space-x-2 text-text-primary mb-4">
              <Sparkles className="w-4 h-4 text-lime-accent" />
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider">Strategy & Rationale</h3>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                {currentNotes.map((note, nIdx) => (
                  <div key={nIdx} className="flex items-start space-x-2">
                    <textarea
                      rows="2"
                      value={note}
                      onChange={(e) => handleNoteChange(nIdx, e.target.value)}
                      className="flex-1 p-2.5 bg-graphite-700 border border-border-default rounded-xl text-xs text-text-primary outline-none focus:border-lime-accent resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNote(nIdx)}
                      className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="flex items-center space-x-1.5 text-xs text-lime-accent font-semibold hover:underline pt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add note point</span>
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {currentNotes.map((note, nIdx) => (
                  <li key={nIdx} className="flex items-start space-x-2.5 text-xs text-text-secondary leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-accent mt-1.5 flex-shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Golden Rule Card */}
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-6 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full blur-xl"></div>
          
          <div>
            <div className="flex items-center space-x-2 text-warning mb-3">
              <ShieldCheck className="w-5 h-5 text-warning" />
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider">The Rule That Makes This Stick</h3>
            </div>

            {isEditing ? (
              <textarea
                rows="4"
                value={editedGoldenRule}
                onChange={(e) => setEditedGoldenRule(e.target.value)}
                className="w-full p-3 bg-graphite-700 border border-warning/40 rounded-xl text-xs text-text-primary outline-none focus:border-warning resize-none"
                placeholder="Golden rule text..."
              />
            ) : (
              <blockquote className="text-xs text-text-primary font-medium leading-relaxed italic border-l-2 border-warning/60 pl-3 my-2">
                "{currentGoldenRule}"
              </blockquote>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center space-x-1.5 text-[11px] text-text-muted">
            <Info className="w-3.5 h-3.5 text-warning" />
            <span>Consistency over compensation — never let missed blocks induce guilt.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Timetable;
