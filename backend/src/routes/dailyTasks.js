import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getDailyTaskStats,
  rolloverTasks,
  reorderTasks,
  getDailyTasks,
  createDailyTask,
  getDailyTaskById,
  updateDailyTask,
  toggleDailyTask,
  deleteDailyTask,
} from '../controllers/dailyTasksController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Specialized endpoints (defined before /:id)
router.get('/stats', getDailyTaskStats);
router.post('/rollover', rolloverTasks);
router.patch('/reorder', reorderTasks);

// Core CRUD endpoints
router.get('/', getDailyTasks);
router.post('/', createDailyTask);
router.get('/:id', getDailyTaskById);
router.put('/:id', updateDailyTask);
router.patch('/:id/toggle', toggleDailyTask);
router.delete('/:id', deleteDailyTask);

export default router;
