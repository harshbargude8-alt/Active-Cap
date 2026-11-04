/**
 * Project domain constants — single source of truth for categories, statuses,
 * and their associated Tailwind colour classes used across the application.
 */

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Ordered list of all project categories. */
export const PROJECT_CATEGORIES = [
  'Code',
  'Content',
  'Reading',
  'Music',
  'Animation',
  'Writing',
  'Research',
  'Course',
  'Other',
];

/** Ordered list of all project lifecycle statuses. */
export const PROJECT_STATUSES = [
  'Active',
  'Parked',
  'Someday',
  'Done',
  'Abandoned',
];

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Tailwind class string for a given project category badge.
 * @param {string} category
 * @returns {string}
 */
export const getCategoryColor = (category) => {
  switch (category) {
    case 'Code':      return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40';
    case 'Content':   return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40';
    case 'Reading':   return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40';
    case 'Music':     return 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-900/40';
    case 'Animation': return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40';
    case 'Writing':   return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40';
    case 'Research':  return 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900/40';
    case 'Course':    return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/40';
    default:          return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

/**
 * Returns the Tailwind class string for a given project status badge.
 * @param {string} status
 * @returns {string}
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'Active':    return 'bg-sky-50 dark:bg-sky-950/30 text-accent-blue dark:text-sky-300 border-sky-200 dark:border-sky-800/40';
    case 'Parked':    return 'bg-amber-50 dark:bg-amber-950/30 text-accent-amber dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
    case 'Someday':   return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    case 'Done':      return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
    case 'Abandoned': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40';
    default:          return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

