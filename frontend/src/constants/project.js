/**
 * Project domain constants — single source of truth for categories, statuses,
 * and their associated colour classes used across the application.
 *
 * Redesigned for the Graphite Dark design system.
 */

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Ordered list of default project categories used for fallback/initialization. */
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

/** Pre-defined color palette options available for categories */
export const CATEGORY_COLORS = [
  { key: 'blue', label: 'Blue', preview: '#3b82f6', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25' },
  { key: 'purple', label: 'Purple', preview: '#a855f7', classes: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25' },
  { key: 'emerald', label: 'Emerald', preview: '#10b981', classes: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' },
  { key: 'pink', label: 'Pink', preview: '#ec4899', classes: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25' },
  { key: 'indigo', label: 'Indigo', preview: '#6366f1', classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25' },
  { key: 'amber', label: 'Amber', preview: '#f59e0b', classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25' },
  { key: 'teal', label: 'Teal', preview: '#14b8a6', classes: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25' },
  { key: 'cyan', label: 'Cyan', preview: '#06b6d4', classes: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25' },
  { key: 'rose', label: 'Rose', preview: '#f43f5e', classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' },
  { key: 'violet', label: 'Violet', preview: '#8b5cf6', classes: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25' },
  { key: 'lime', label: 'Lime', preview: '#84cc16', classes: 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/25' },
  { key: 'orange', label: 'Orange', preview: '#f97316', classes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25' },
  { key: 'gray', label: 'Gray', preview: '#94a3b8', classes: 'bg-graphite-600/50 text-text-secondary border-graphite-500/50' },
];

const COLOR_MAP = CATEGORY_COLORS.reduce((acc, c) => {
  acc[c.key] = c.classes;
  return acc;
}, {});

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
 * Works seamlessly with pre-defined colors, custom category color keys, or deterministic fallback.
 * @param {string} category
 * @param {string} [colorKey]
 * @returns {string}
 */
export const getCategoryColor = (category, colorKey) => {
  if (colorKey && COLOR_MAP[colorKey]) {
    return COLOR_MAP[colorKey];
  }

  switch (category) {
    case 'Code':      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25';
    case 'Content':   return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25';
    case 'Reading':   return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
    case 'Music':     return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25';
    case 'Animation': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25';
    case 'Writing':   return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
    case 'Research':  return 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25';
    case 'Course':    return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25';
    case 'Other':     return 'bg-graphite-600/50 text-text-secondary border-graphite-500/50';
    default: {
      if (!category) return 'bg-graphite-600/50 text-text-secondary border-graphite-500/50';
      // Deterministic color assignment based on category name
      let hash = 0;
      for (let i = 0; i < category.length; i++) {
        hash = (hash << 5) - hash + category.charCodeAt(i);
        hash |= 0;
      }
      const paletteKeys = ['blue', 'purple', 'emerald', 'pink', 'indigo', 'amber', 'teal', 'cyan', 'rose', 'violet', 'lime', 'orange'];
      const chosenKey = paletteKeys[Math.abs(hash) % paletteKeys.length];
      return COLOR_MAP[chosenKey] || 'bg-graphite-600/50 text-text-secondary border-graphite-500/50';
    }
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
