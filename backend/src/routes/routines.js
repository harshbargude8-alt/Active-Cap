import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getRoutines,
  createRoutine,
  updateRoutine,
  toggleRoutine,
  deleteRoutine,
  syncRoutinesToDate,
} from '../controllers/routinesController.js';

const router = express.Router();

router.use(auth);

router.post('/sync-to-date', syncRoutinesToDate);
router.get('/', getRoutines);
router.post('/', createRoutine);
router.put('/:id', updateRoutine);
router.patch('/:id/toggle', toggleRoutine);
router.delete('/:id', deleteRoutine);

export default router;

