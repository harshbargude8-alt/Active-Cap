/**
 * Project domain constants — single source of truth for categories, statuses,
 * and their associated colour classes used across the application.
 *
 * Redesigned for the Graphite Dark design system.
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
// Colour helpers – Graphite Dark palette
// ---------------------------------------------------------------------------

/**
 * Returns the Tailwind class string for a given project category badge.
 * All variants use the graphite surface with accent-colored text.
 * @param {string} category
 * @returns {string}
 */
export const getCategoryColor = (category) => {
  switch (category) {
    case 'Code':      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Content':   return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'Reading':   return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Music':     return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
    case 'Animation': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'Writing':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Research':  return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    case 'Course':    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    default:          return 'bg-graphite-600/50 text-text-secondary border-graphite-500/50';
  }
};

/**
 * Returns the Tailwind class string for a given project status badge.
 * @param {string} status
 * @returns {string}
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'Active':    return 'bg-lime-accent/10 text-lime-accent border-lime-accent/20';
    case 'Parked':    return 'bg-warning/10 text-warning border-warning/20';
    case 'Someday':   return 'bg-graphite-600/50 text-text-secondary border-graphite-500/50';
    case 'Done':      return 'bg-success/10 text-success border-success/20';
    case 'Abandoned': return 'bg-error/10 text-error border-error/20';
    default:          return 'bg-graphite-600/50 text-text-secondary border-graphite-500/50';
  }
};
