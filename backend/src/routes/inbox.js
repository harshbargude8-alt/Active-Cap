import express from 'express';
import InboxItem from '../models/InboxItem.js';
import { auth } from '../middleware/auth.js';
import { getOrSetCache, invalidateCache } from '../utils/cache.js';

const router = express.Router();

// GET all unconverted inbox items
router.get('/', auth, async (req, res) => {
  try {
    const cacheKey = `activecap:inbox:${req.user._id}`;
    const items = await getOrSetCache(cacheKey, 600, async () => {
      return await InboxItem.find({ userId: req.user._id, convertedToProjectId: null })
        .sort({ createdAt: -1 })
        .lean();
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error retrieving inbox items' });
  }
});

// POST create inbox item (quick capture)
router.post('/', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Inbox item text is required.' });
    }

    const item = new InboxItem({
      userId: req.user._id,
      text: text.trim(),
    });
    await item.save();

    await invalidateCache(`activecap:inbox:${req.user._id}`);

    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: 'Error creating inbox item' });
  }
});

// PUT promote inbox item to project
router.put('/:id/promote', auth, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required for promotion.' });
    }

    const item = await InboxItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    item.convertedToProjectId = projectId;
    await item.save();

    await invalidateCache(`activecap:inbox:${req.user._id}`, `activecap:projects:${req.user._id}`);

    res.json(item);
  } catch (err) {
    res.status(400).json({ error: 'Error promoting inbox item' });
  }
});

// DELETE discard inbox item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await InboxItem.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    await invalidateCache(`activecap:inbox:${req.user._id}`);

    res.json({ message: 'Inbox item discarded successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error discarding inbox item' });
  }
});

export default router;
