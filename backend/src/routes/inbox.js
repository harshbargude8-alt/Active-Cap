import express from 'express';
import InboxItem from '../models/InboxItem.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET all unconverted inbox items
router.get('/', auth, async (req, res) => {
  try {
    const items = await InboxItem.find({ userId: req.user._id, convertedToProjectId: null }).sort({ createdAt: -1 });
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
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: 'Error promoting inbox item' });
  }
});

// DELETE discard inbox item
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Deleting inbox item:', req.params.id);
    console.log('User:', req.user);

    const item = await InboxItem.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }
    res.json({ message: 'Inbox item discarded successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error discarding inbox item' });
  }
});

export default router;
