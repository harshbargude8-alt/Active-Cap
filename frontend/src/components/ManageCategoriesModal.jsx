import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCategories } from '../context/CategoriesContext';
import { CATEGORY_COLORS, getCategoryColor } from '../constants/project';
import {
  X,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  AlertTriangle,
  Folder,
  Tag,
  Check,
  Layers,
} from 'lucide-react';

export const ManageCategoriesModal = () => {
  const {
    categories,
    allCategoriesWithDeleted,
    isManageModalOpen,
    closeManageModal,
    createCategory,
    updateCategory,
    softDeleteCategory,
    restoreCategory,
  } = useCategories();

  // Tab: 'active' | 'archived'
  const [activeTab, setActiveTab] = useState('active');

  // New Category State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [addError, setAddError] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit State
  const [editingCatId, setEditingCatId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('blue');
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  // Caution prompt for edit
  const [editCautionTarget, setEditCautionTarget] = useState(null);

  // Soft Delete Caution Target
  const [deleteCautionTarget, setDeleteCautionTarget] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Restore state
  const [isRestoringId, setIsRestoringId] = useState(null);

  if (!isManageModalOpen) return null;

  const archivedCategories = allCategoriesWithDeleted.filter((c) => c.isDeleted);

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewName('');
    setNewColor('blue');
    setAddError('');
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewName('');
    setAddError('');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!newName.trim()) {
      setAddError('Category name is required.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await createCategory({ name: newName.trim(), color: newColor });
      setIsAdding(false);
      setNewName('');
      setNewColor('blue');
    } catch (err) {
      setAddError(err.message || 'Failed to create category');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleStartEdit = (cat) => {
    setEditingCatId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color || 'blue');
    setEditError('');
    setEditCautionTarget(null);
  };

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setEditName('');
    setEditError('');
    setEditCautionTarget(null);
  };

  // Check if renaming requires caution before saving
  const handlePreSaveEdit = (cat) => {
    setEditError('');
    if (!editName.trim()) {
      setEditError('Category name cannot be empty.');
      return;
    }

    const nameChanged = editName.trim() !== cat.name;
    if (nameChanged && cat.trackCount > 0) {
      // Trigger caution prompt
      setEditCautionTarget({
        ...cat,
        pendingName: editName.trim(),
        pendingColor: editColor,
      });
    } else {
      executeSaveEdit(cat._id, editName.trim(), editColor);
    }
  };

  const executeSaveEdit = async (catId, finalName, finalColor) => {
    setIsSubmittingEdit(true);
    setEditError('');
    try {
      await updateCategory(catId, { name: finalName, color: finalColor });
      setEditingCatId(null);
      setEditCautionTarget(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update category');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const executeSoftDelete = async (cat) => {
    setIsSubmittingDelete(true);
    try {
      await softDeleteCategory(cat._id);
      setDeleteCautionTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to soft delete category');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const executeRestore = async (cat) => {
    setIsRestoringId(cat._id);
    try {
      await restoreCategory(cat._id);
    } catch (err) {
      alert(err.message || 'Failed to restore category');
    } finally {
      setIsRestoringId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-graphite-800 border border-border-default w-full max-w-xl rounded-2xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col">

        {/* Modal Close Button */}
        <button
          onClick={closeManageModal}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-graphite-700 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4 pr-8">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-accent/10 border border-lime-accent/20 flex items-center justify-center text-lime-accent">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-text-primary leading-tight">
                Manage Track Categories
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Create, customize, and safely archive categories.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs: Active vs Archived */}
        <div className="flex items-center justify-between border-b border-border-subtle mb-4 pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'active'
                  ? 'bg-lime-accent/15 text-lime-accent border border-lime-accent/25'
                  : 'text-text-muted hover:text-text-primary hover:bg-graphite-700/50'
              }`}
            >
              <span>Active Categories</span>
              <span className="text-[10px] bg-graphite-700 px-1.5 py-0.2 rounded-full">
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('archived')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'archived'
                  ? 'bg-warning/15 text-warning border border-warning/25'
                  : 'text-text-muted hover:text-text-primary hover:bg-graphite-700/50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived</span>
              <span className="text-[10px] bg-graphite-700 px-1.5 py-0.2 rounded-full">
                {archivedCategories.length}
              </span>
            </button>
          </div>

          {activeTab === 'active' && !isAdding && (
            <button
              onClick={handleStartAdd}
              className="flex items-center space-x-1 text-xs font-bold text-lime-accent hover:text-lime-accent-hover bg-lime-accent/10 hover:bg-lime-accent/20 px-3 py-1.5 rounded-lg border border-lime-accent/25 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Category</span>
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">

          {/* New Category Form (When open) */}
          {activeTab === 'active' && isAdding && (
            <div className="p-4 bg-graphite-700/60 border border-lime-accent/30 rounded-xl mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-lime-accent uppercase tracking-wider">
                  Create New Category
                </span>
                <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryColor(newName.trim() || 'Preview', newColor)}`}>
                  {newName.trim() || 'Preview'}
                </span>
              </div>

              {addError && (
                <div className="mb-3 p-2 bg-error/10 border border-error/20 text-error rounded-lg text-xs">
                  {addError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Health & Fitness, Marketing, AI Tools"
                    maxLength={30}
                    className="w-full px-3 py-2 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Badge Color
                  </label>
                  <div className="flex items-center flex-wrap gap-2">
                    {CATEGORY_COLORS.map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => setNewColor(col.key)}
                        style={{ backgroundColor: col.preview }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          newColor === col.key
                            ? 'ring-2 ring-lime-accent ring-offset-2 ring-offset-graphite-800 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={col.label}
                      >
                        {newColor === col.key && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd || !newName.trim()}
                    className="px-4 py-1.5 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAdd ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 1: Active Categories List */}
          {activeTab === 'active' && (
            <div className="space-y-2">
              {categories.length === 0 ? (
                <div className="p-8 text-center bg-graphite-700/30 rounded-xl border border-dashed border-border-default text-xs text-text-muted">
                  No active categories. Create one to get started!
                </div>
              ) : (
                categories.map((cat) => {
                  const isEditing = editingCatId === cat._id;

                  if (isEditing) {
                    return (
                      <div
                        key={cat._id}
                        className="p-3.5 bg-graphite-700/80 border border-lime-accent/40 rounded-xl space-y-3 animate-fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary">Edit Category</span>
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryColor(editName.trim() || cat.name, editColor)}`}>
                            {editName.trim() || cat.name}
                          </span>
                        </div>

                        {editError && (
                          <div className="p-2 bg-error/10 border border-error/20 text-error rounded-lg text-xs">
                            {editError}
                          </div>
                        )}

                        <div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Category Name"
                            maxLength={30}
                            className="w-full px-3 py-1.5 bg-graphite-700 border border-border-default rounded-xl text-text-primary text-xs outline-none focus:border-lime-accent"
                          />
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                          {CATEGORY_COLORS.map((col) => (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => setEditColor(col.key)}
                              style={{ backgroundColor: col.preview }}
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                editColor === col.key
                                  ? 'ring-2 ring-lime-accent ring-offset-2 ring-offset-graphite-800 scale-110'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              title={col.label}
                            >
                              {editColor === col.key && <Check className="w-3 h-3 text-black stroke-[3]" />}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-border-subtle">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePreSaveEdit(cat)}
                            disabled={isSubmittingEdit || !editName.trim()}
                            className="px-3 py-1 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat._id}
                      className="flex items-center justify-between p-3 bg-graphite-700/40 hover:bg-graphite-700/70 border border-border-subtle rounded-xl transition-all group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryColor(cat.name, cat.color)}`}>
                          {cat.name}
                        </span>

                        <div className="flex items-center space-x-2 text-[10px] text-text-muted">
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3 h-3" />
                            <span>
                              {cat.trackCount} {cat.trackCount === 1 ? 'track' : 'tracks'}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-text-muted hover:text-lime-accent hover:bg-graphite-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Category Name & Color"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCautionTarget(cat)}
                          className="p-1.5 text-text-muted hover:text-warning hover:bg-warning/10 rounded-lg transition-colors cursor-pointer"
                          title="Soft Delete / Archive Category"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Archived Categories */}
          {activeTab === 'archived' && (
            <div className="space-y-2">
              {archivedCategories.length === 0 ? (
                <div className="p-8 text-center bg-graphite-700/30 rounded-xl border border-dashed border-border-default text-xs text-text-muted">
                  No archived categories. Any soft-deleted categories will appear here and can be restored anytime.
                </div>
              ) : (
                archivedCategories.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center justify-between p-3 bg-graphite-700/30 border border-border-subtle rounded-xl opacity-80 hover:opacity-100 transition-all"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-[10px] font-bold border border-border-default text-text-muted px-2 py-0.5 rounded-full uppercase tracking-wider line-through">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Archived {cat.deletedAt ? new Date(cat.deletedAt).toLocaleDateString() : ''}
                        {' · '}
                        {cat.trackCount} {cat.trackCount === 1 ? 'track' : 'tracks'}
                      </span>
                    </div>

                    <button
                      onClick={() => executeRestore(cat)}
                      disabled={isRestoringId === cat._id}
                      className="flex items-center space-x-1 text-xs font-bold text-lime-accent hover:bg-lime-accent/10 px-2.5 py-1 rounded-lg border border-lime-accent/25 transition-all cursor-pointer disabled:opacity-50"
                      title="Restore Category"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isRestoringId === cat._id ? 'Restoring...' : 'Restore'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted">
          <span>Categories help group and filter tracks in your Catalog.</span>
          <button
            onClick={closeManageModal}
            className="px-4 py-1.5 bg-graphite-700 hover:bg-graphite-600 text-text-primary rounded-xl transition-colors cursor-pointer font-medium"
          >
            Done
          </button>
        </div>

        {/* ── CAUTION MODAL: Edit/Rename with Active Tracks ── */}
        {editCautionTarget && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-graphite-800 border border-warning/40 w-full max-w-md rounded-2xl p-5 shadow-2xl animate-fade-in relative">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning border border-warning/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-text-primary">
                    Caution: Renaming Category
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    This change affects existing tracks.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-graphite-700/70 border border-border-subtle rounded-xl text-xs space-y-2 mb-4">
                <p className="text-text-primary">
                  There are currently <strong className="text-warning font-bold">{editCautionTarget.trackCount} track(s)</strong> assigned to <strong className="text-lime-accent">"{editCautionTarget.name}"</strong>.
                </p>
                <p className="text-text-secondary">
                  Renaming this category to <strong className="text-lime-accent">"{editCautionTarget.pendingName}"</strong> will automatically update all associated tracks to maintain consistent data.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditCautionTarget(null)}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeSaveEdit(editCautionTarget._id, editCautionTarget.pendingName, editCautionTarget.pendingColor)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-1.5 bg-warning hover:brightness-110 text-graphite-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Updating Tracks...' : 'Confirm & Update Tracks'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CAUTION MODAL: Soft Delete Category ── */}
        {deleteCautionTarget && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-graphite-800 border border-warning/40 w-full max-w-md rounded-2xl p-5 shadow-2xl animate-fade-in relative">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning border border-warning/30 flex items-center justify-center flex-shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-text-primary">
                    Caution: Soft Delete Category
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Category will be archived, not permanently destroyed.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-graphite-700/70 border border-border-subtle rounded-xl text-xs space-y-2 mb-4">
                <p className="text-text-primary">
                  Are you sure you want to soft delete category <strong className="text-lime-accent">"{deleteCautionTarget.name}"</strong>?
                </p>
                {deleteCautionTarget.trackCount > 0 ? (
                  <p className="text-warning">
                    ⚠️ <strong className="font-bold">{deleteCautionTarget.trackCount} track(s)</strong> are currently assigned to this category. They will keep their category tag history, but this category will no longer appear in dropdowns for new tracks.
                  </p>
                ) : (
                  <p className="text-text-secondary">
                    This category currently has 0 tracks assigned. It will be hidden from selection menus.
                  </p>
                )}
                <p className="text-[10px] text-text-muted">
                  You can safely restore this category anytime from the "Archived" tab.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteCautionTarget(null)}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeSoftDelete(deleteCautionTarget)}
                  disabled={isSubmittingDelete}
                  className="px-4 py-1.5 bg-warning hover:brightness-110 text-graphite-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDelete ? 'Archiving...' : 'Soft Delete Category'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default ManageCategoriesModal;

