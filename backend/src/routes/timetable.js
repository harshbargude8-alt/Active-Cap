import express from 'express';
import { auth } from '../middleware/auth.js';
import Timetable, { defaultDays, defaultNotes, defaultRule } from '../models/Timetable.js';
import { getOrSetCache, invalidateCache } from '../utils/cache.js';

const router = express.Router();

// GET /api/timetable - Get user's timetable (or create default)
router.get('/', auth, async (req, res) => {
  try {
    const cacheKey = `activecap:timetable:${req.user._id}`;
    const timetable = await getOrSetCache(cacheKey, 86400, async () => {
      let doc = await Timetable.findOne({ userId: req.user._id }).lean();
      if (!doc) {
        doc = await Timetable.create({
          userId: req.user._id,
          schedule: defaultDays,
          notes: defaultNotes,
          goldenRule: defaultRule,
        });
        doc = doc.toObject ? doc.toObject() : doc;
      }
      return doc;
    });
    res.json(timetable);
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).json({ error: 'Server error fetching timetable' });
  }
});

// PUT /api/timetable - Update user's timetable
router.put('/', auth, async (req, res) => {
  try {
    const { schedule, notes, goldenRule } = req.body;

    const updateData = {};
    if (schedule && Array.isArray(schedule)) updateData.schedule = schedule;
    if (notes && Array.isArray(notes)) updateData.notes = notes;
    if (typeof goldenRule === 'string') updateData.goldenRule = goldenRule;

    const timetable = await Timetable.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    // Invalidate timetable cache
    await invalidateCache(`activecap:timetable:${req.user._id}`);

    res.json(timetable);
  } catch (err) {
    console.error('Error updating timetable:', err);
    res.status(400).json({ error: 'Error updating timetable' });
  }
});

// POST /api/timetable/reset - Reset timetable to default template
router.post('/reset', auth, async (req, res) => {
  try {
    const timetable = await Timetable.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          schedule: defaultDays,
          notes: defaultNotes,
          goldenRule: defaultRule,
        },
      },
      { new: true, upsert: true }
    );

    // Invalidate timetable cache
    await invalidateCache(`activecap:timetable:${req.user._id}`);

    res.json(timetable);
  } catch (err) {
    console.error('Error resetting timetable:', err);
    res.status(500).json({ error: 'Error resetting timetable' });
  }
});

export default router;
