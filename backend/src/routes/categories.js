import express from 'express';
import Category from '../models/Category.js';
import Project from '../models/Project.js';
import { auth } from '../middleware/auth.js';
import { bustProjectCaches } from './projects.js';

const router = express.Router();

export const DEFAULT_CATEGORIES = [
  { name: 'Code', color: 'blue', isDefault: true },
  { name: 'Content', color: 'purple', isDefault: true },
  { name: 'Reading', color: 'emerald', isDefault: true },
  { name: 'Music', color: 'pink', isDefault: true },
  { name: 'Animation', color: 'indigo', isDefault: true },
  { name: 'Writing', color: 'amber', isDefault: true },
  { name: 'Research', color: 'teal', isDefault: true },
  { name: 'Course', color: 'cyan', isDefault: true },
  { name: 'Other', color: 'gray', isDefault: true },
];

// Helper: Ensure user has default categories seeded
const ensureUserCategories = async (userId) => {
  const count = await Category.countDocuments({ userId });
  if (count === 0) {
    const docs = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      isDeleted: false,
    }));
    await Category.insertMany(docs);
  }
};

// GET /api/categories - List categories for logged in user
router.get('/', auth, async (req, res) => {
  try {
    await ensureUserCategories(req.user._id);

    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = { userId: req.user._id };
    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    const categories = await Category.find(filter).sort({ createdAt: 1 }).lean();

    // Aggregate track counts by category for this user
    const counts = await Project.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((item) => {
      if (item._id) countMap[item._id] = item.count;
    });

    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      trackCount: countMap[cat.name] || 0,
    }));

    res.json(enrichedCategories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// POST /api/categories - Create a new category
router.post('/', auth, async (req, res) => {
  try {
    const { name, color = 'blue' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 30) {
      return res.status(400).json({ error: 'Category name must be 30 characters or fewer' });
    }

    // Case-insensitive check
    const existing = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      if (!existing.isDeleted) {
        return res.status(400).json({ error: `Category "${existing.name}" already exists` });
      }
      // If soft-deleted, restore it with the chosen color
      existing.isDeleted = false;
      existing.deletedAt = null;
      existing.color = color;
      existing.name = trimmedName; // preserve casing
      await existing.save();

      const trackCount = await Project.countDocuments({ userId: req.user._id, category: existing.name });
      return res.status(201).json({ ...existing.toObject(), trackCount, restored: true });
    }

    const newCategory = new Category({
      userId: req.user._id,
      name: trimmedName,
      color,
      isDeleted: false,
    });

    await newCategory.save();
    res.status(201).json({ ...newCategory.toObject(), trackCount: 0 });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Edit category (name and/or color) with automatic track migration
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, color } = req.body;
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    let tracksUpdated = 0;
    const oldName = category.name;

    if (name && name.trim()) {
      const trimmedName = name.trim();
      if (trimmedName.length > 30) {
        return res.status(400).json({ error: 'Category name must be 30 characters or fewer' });
      }

      // Check for name collision with another active category
      if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
        const conflict = await Category.findOne({
          userId: req.user._id,
          _id: { $ne: category._id },
          name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isDeleted: { $ne: true },
        });

        if (conflict) {
          return res.status(400).json({ error: `Another active category named "${conflict.name}" already exists` });
        }
      }

      // If name changed, update all tracks assigned to oldName
      if (trimmedName !== oldName) {
        const updateRes = await Project.updateMany(
          { userId: req.user._id, category: oldName },
          { $set: { category: trimmedName } }
        );
        tracksUpdated = updateRes.modifiedCount || 0;
        await bustProjectCaches(req.user._id);
        category.name = trimmedName;
      }
    }

    if (color) {
      category.color = color;
    }

    await category.save();

    const trackCount = await Project.countDocuments({ userId: req.user._id, category: category.name });
    res.json({
      category: { ...category.toObject(), trackCount },
      tracksUpdated,
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Soft delete category
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.isDeleted) {
      return res.status(400).json({ error: 'Category is already soft-deleted' });
    }

    const trackCount = await Project.countDocuments({ userId: req.user._id, category: category.name });

    category.isDeleted = true;
    category.deletedAt = new Date();
    await category.save();

    res.json({
      message: `Category "${category.name}" soft-deleted successfully`,
      category: { ...category.toObject(), trackCount },
      trackCount,
    });
  } catch (err) {
    console.error('Error soft-deleting category:', err);
    res.status(500).json({ error: 'Failed to soft delete category' });
  }
});

// PATCH /api/categories/:id/restore - Restore soft-deleted category
router.patch('/:id/restore', auth, async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    category.isDeleted = false;
    category.deletedAt = null;
    await category.save();

    const trackCount = await Project.countDocuments({ userId: req.user._id, category: category.name });
    res.json({
      message: `Category "${category.name}" restored successfully`,
      category: { ...category.toObject(), trackCount },
    });
  } catch (err) {
    console.error('Error restoring category:', err);
    res.status(500).json({ error: 'Failed to restore category' });
  }
});

export default router;

