import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Info
} from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Timetable = () => {
  const { apiFetch } = useAuth();

  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form edit state
  const [editedSchedule, setEditedSchedule] = useState([]);
  const [editedNotes, setEditedNotes] = useState([]);
  const [editedGoldenRule, setEditedGoldenRule] = useState('');
  const [toast, setToast] = useState(null);

  // Determine current day abbreviation
  const todayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ...
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayAbbr = dayMap[todayIndex];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/timetable');
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        setEditedSchedule(data.schedule || []);
        setEditedNotes(data.notes || []);
        setEditedGoldenRule(data.goldenRule || '');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
        <span className="text-sm text-calm-muted font-medium">Loading weekly timetable...</span>
      </div>
    );
  }

  const currentSchedule = isEditing ? editedSchedule : timetable?.schedule || [];
  const currentNotes = isEditing ? editedNotes : timetable?.notes || [];
  const currentGoldenRule = isEditing ? editedGoldenRule : timetable?.goldenRule || '';

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 md:pb-12 animate-fade-in">
      {/* Toast alert */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold animate-slide-up flex items-center space-x-2 ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-calm-text tracking-tight">Weekly Rhythm</h2>
          </div>
          <p className="text-xs text-calm-muted mt-1">
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
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-calm-border text-calm-muted hover:text-calm-text hover:bg-slate-100 text-xs font-medium transition-all duration-300"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all duration-300 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-calm-border text-calm-muted hover:text-calm-text hover:bg-slate-100 text-xs font-medium transition-all duration-300"
                title="Reset to default template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
              <button
                onClick={handleStartEdit}
                className="flex items-center space-x-1.5 bg-calm-slate hover:bg-calm-slate/95 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all duration-300"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Timetable Grid */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 border border-calm-border/80 dark:border-slate-800/80 rounded-3xl shadow-2xs overflow-hidden mb-8 transition-colors duration-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-calm-border/80 dark:border-slate-800 text-[11px] font-bold text-calm-muted dark:text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6 w-28">Day</th>
              <th className="py-4 px-6">
                <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400">
                  <Sunrise className="w-4 h-4" />
                  <span>Morning</span>
                </div>
              </th>
              <th className="py-4 px-6">
                <div className="flex items-center space-x-1.5 text-sky-700 dark:text-sky-400">
                  <Sun className="w-4 h-4" />
                  <span>Afternoon</span>
                </div>
              </th>
              <th className="py-4 px-6">
                <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-400">
                  <Sunset className="w-4 h-4" />
                  <span>Evening</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-calm-border/60 dark:divide-slate-800/60 text-xs">
            {currentSchedule.map((row, idx) => {
              const isToday = row.day.toLowerCase() === todayAbbr.toLowerCase();
              return (
                <tr
                  key={row.day || idx}
                  className={`transition-colors duration-200 ${
                    isToday
                      ? 'bg-accent-blue/5 dark:bg-accent-blue/15 hover:bg-accent-blue/8 dark:hover:bg-accent-blue/20 font-medium'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Day Column */}
                  <td className="py-4 px-6 font-bold text-calm-text dark:text-slate-200 align-top">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${isToday ? 'text-accent-blue font-extrabold' : ''}`}>
                        {row.day}
                      </span>
                      {isToday && (
                        <span className="bg-accent-blue text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-2xs">
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
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all"
                        placeholder="Morning task..."
                      />
                    ) : (
                      <div className="text-calm-text dark:text-slate-200 leading-relaxed">
                        {row.morning === '—' || !row.morning ? (
                          <span className="text-calm-muted/60 dark:text-slate-500">—</span>
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
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all"
                        placeholder="Afternoon task..."
                      />
                    ) : (
                      <div className="text-calm-text dark:text-slate-200 leading-relaxed">
                        {row.afternoon === '—' || !row.afternoon ? (
                          <span className="text-calm-muted/60 dark:text-slate-500">—</span>
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
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue transition-all"
                        placeholder="Evening task..."
                      />
                    ) : (
                      <div className="text-calm-text dark:text-slate-200 leading-relaxed">
                        {row.evening === '—' || !row.evening ? (
                          <span className="text-calm-muted/60 dark:text-slate-500">—</span>
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

      {/* Mobile/Tablet Stacked Day Cards View */}
      <div className="lg:hidden space-y-4 mb-8">
        {currentSchedule.map((row, idx) => {
          const isToday = row.day.toLowerCase() === todayAbbr.toLowerCase();
          return (
            <div
              key={row.day || idx}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-2xs transition-all duration-300 ${
                isToday
                  ? 'border-accent-blue/40 bg-gradient-to-br from-white to-accent-blue/5 dark:from-slate-900 dark:to-accent-blue/15 shadow-sm'
                  : 'border-calm-border dark:border-slate-800'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <h3 className={`text-base font-bold ${isToday ? 'text-accent-blue' : 'text-calm-text dark:text-slate-100'}`}>
                    {row.day}
                  </h3>
                  {isToday && (
                    <span className="bg-accent-blue text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Today
                    </span>
                  )}
                </div>
              </div>

              {/* Day Slots */}
              <div className="space-y-3 text-xs">
                {/* Morning */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-900/40 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sunrise className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Morning</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={row.morning}
                      onChange={(e) => handleScheduleCellChange(idx, 'morning', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:border-accent-blue"
                    />
                  ) : (
                    <p className="text-calm-text dark:text-slate-200 font-medium">{row.morning || '—'}</p>
                  )}
                </div>

                {/* Afternoon */}
                <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100/80 dark:border-sky-900/40 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-sky-800 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sun className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Afternoon</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={row.afternoon}
                      onChange={(e) => handleScheduleCellChange(idx, 'afternoon', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:border-accent-blue"
                    />
                  ) : (
                    <p className="text-calm-text dark:text-slate-200 font-medium">{row.afternoon || '—'}</p>
                  )}
                </div>

                {/* Evening */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-indigo-800 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sunset className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Evening</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={row.evening}
                      onChange={(e) => handleScheduleCellChange(idx, 'evening', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:border-accent-blue"
                    />
                  ) : (
                    <p className="text-calm-text dark:text-slate-200 font-medium">{row.evening || '—'}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guidelines & Strategy Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strategy Notes */}
        <div className="bg-white dark:bg-slate-900 border border-calm-border/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center space-x-2 text-calm-text dark:text-slate-100 mb-4">
              <Sparkles className="w-4 h-4 text-accent-blue" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Strategy & Rationale</h3>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                {currentNotes.map((note, nIdx) => (
                  <div key={nIdx} className="flex items-start space-x-2">
                    <textarea
                      rows="2"
                      value={note}
                      onChange={(e) => handleNoteChange(nIdx, e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-calm-border dark:border-slate-700 rounded-xl text-xs text-calm-text dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-accent-blue resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNote(nIdx)}
                      className="p-2 text-calm-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="flex items-center space-x-1.5 text-xs text-accent-blue font-semibold hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add note point</span>
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {currentNotes.map((note, nIdx) => (
                  <li key={nIdx} className="flex items-start space-x-2.5 text-xs text-calm-muted dark:text-slate-400 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-1.5 flex-shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Golden Rule Card */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 border border-amber-200/80 dark:border-amber-700/40 rounded-3xl p-6 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-amber/5 rounded-full blur-xl"></div>
          
          <div>
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 mb-3">
              <ShieldCheck className="w-5 h-5 text-accent-amber" />
              <h3 className="text-sm font-bold uppercase tracking-wider">The Rule That Makes This Stick</h3>
            </div>

            {isEditing ? (
              <textarea
                rows="4"
                value={editedGoldenRule}
                onChange={(e) => setEditedGoldenRule(e.target.value)}
                className="w-full p-3 bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-amber-700/60 rounded-2xl text-xs text-calm-text dark:text-slate-100 outline-none focus:border-accent-amber resize-none"
                placeholder="Golden rule text..."
              />
            ) : (
              <blockquote className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed italic border-l-2 border-accent-amber/60 pl-3 my-2">
                "{currentGoldenRule}"
              </blockquote>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/40 flex items-center space-x-1.5 text-[11px] text-amber-800 dark:text-amber-400">
            <Info className="w-3.5 h-3.5 text-accent-amber" />
            <span>Consistency over compensation — never let missed blocks induce guilt.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Timetable;
