import express from 'express';
import Project from '../models/Project.js';
import CheckIn from '../models/CheckIn.js';
import { auth } from '../middleware/auth.js';
import { getOrSetCache } from '../utils/cache.js';

const router = express.Router();

// GET weekly review statistics
router.get('/', auth, async (req, res) => {
  try {
    const cacheKey = `activecap:review:${req.user._id}`;

    const reviewData = await getOrSetCache(cacheKey, 900, async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // 1. Check-ins this week
      const checkInsThisWeek = await CheckIn.find({
        userId: req.user._id,
        date: { $gte: oneWeekAgo },
      })
        .populate('projectId', 'title category')
        .sort({ date: -1 })
        .lean();

      // 2. Longest Parked projects (Parked longest without being touched/updated)
      const longestParked = await Project.find({
        userId: req.user._id,
        status: 'Parked',
      })
        .sort({ lastTouchedAt: 1, updatedAt: 1 })
        .limit(3)
        .lean();

      // 3. Current active projects
      const activeProjects = await Project.find({
        userId: req.user._id,
        status: 'Active',
      }).lean();

      return {
        checkInsThisWeek,
        longestParked,
        activeProjects,
      };
    });

    res.json(reviewData);
  } catch (err) {
    console.error('Weekly review error:', err);
    res.status(500).json({ error: 'Server error retrieving weekly review data' });
  }
});

export default router;
