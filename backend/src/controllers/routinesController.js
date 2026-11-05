import mongoose from 'mongoose';
import Routine from '../models/Routine.js';
import DailyTask from '../models/DailyTask.js';
import Project from '../models/Project.js';

// Helper day mapping
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Standard day frequency sets
const FREQUENCY_DAYS = {
  daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  weekends: ['Sat', 'Sun'],
};

// -----------------------------------------------------------------------------
// GET /api/routines - List all routines for authenticated user
// -----------------------------------------------------------------------------
export const getRoutines = async (req, res) => {
  try {
    const routines = await Routine.find({ userId: req.user._id })
      .populate('projectId', 'title category status')
      .sort({ order: 1, createdAt: 1 });

    res.json(routines);
  } catch (err) {
    console.error('Error fetching routines:', err);
    res.status(500).json({ error: 'Server error retrieving routines' });
  }
};

// -----------------------------------------------------------------------------
// POST /api/routines - Create new routine
// -----------------------------------------------------------------------------
export const createRoutine = async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      frequency = 'daily',
      daysOfWeek,
      timeSlot = 'morning',
      startTime = '',
      endTime = '',
      estimatedMinutes = 30,
      priority = 'medium',
      isActive = true,
      order = 0,
      checklist,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Routine title is required' });
    }

    let validatedProjectId = null;
    if (projectId && projectId !== 'none' && projectId !== 'null') {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ error: 'Invalid projectId' });
      }
      const project = await Project.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(400).json({ error: 'Project not found or not owned by user' });
      }
      validatedProjectId = project._id;
    }

    // Determine days of week based on frequency if not explicitly provided
    let calculatedDays = daysOfWeek;
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      calculatedDays = FREQUENCY_DAYS[frequency] || FREQUENCY_DAYS.daily;
    }

    const newRoutine = new Routine({
      userId: req.user._id,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      projectId: validatedProjectId,
      frequency,
      daysOfWeek: calculatedDays,
      timeSlot,
      startTime: typeof startTime === 'string' ? startTime.trim() : '',
      endTime: typeof endTime === 'string' ? endTime.trim() : '',
      estimatedMinutes: Math.max(0, Number(estimatedMinutes) || 0),
      priority,
      isActive: Boolean(isActive),
      order: Number(order) || 0,
      checklist: Array.isArray(checklist)
        ? checklist
            .filter((item) => item && typeof item.text === 'string' && item.text.trim())
            .map((item) => ({ text: item.text.trim(), completed: false }))
        : [],
    });

    await newRoutine.save();
    await newRoutine.populate('projectId', 'title category status');

    res.status(201).json(newRoutine);
  } catch (err) {
    console.error('Error creating routine:', err);
    res.status(400).json({ error: err.message || 'Error creating routine' });
  }
};

// -----------------------------------------------------------------------------
// PUT /api/routines/:id - Update routine
// -----------------------------------------------------------------------------
export const updateRoutine = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const routine = await Routine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const {
      title,
      description,
      projectId,
      frequency,
      daysOfWeek,
      timeSlot,
      startTime,
      endTime,
      estimatedMinutes,
      priority,
      isActive,
      order,
      checklist,
    } = req.body;

    const previousTitle = routine.title;

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Routine title cannot be empty' });
      }
      routine.title = title.trim();
    }

    if (description !== undefined) {
      routine.description = typeof description === 'string' ? description.trim() : '';
    }

    if (projectId !== undefined) {
      if (projectId === null || projectId === '' || projectId === 'none' || projectId === 'null') {
        routine.projectId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
          return res.status(400).json({ error: 'Invalid projectId' });
        }
        const project = await Project.findOne({ _id: projectId, userId: req.user._id });
        if (!project) {
          return res.status(400).json({ error: 'Project not found' });
        }
        routine.projectId = project._id;
      }
    }

    if (frequency !== undefined) {
      routine.frequency = frequency;
      if (!daysOfWeek && FREQUENCY_DAYS[frequency]) {
        routine.daysOfWeek = FREQUENCY_DAYS[frequency];
      }
    }

    if (daysOfWeek !== undefined && Array.isArray(daysOfWeek)) {
      routine.daysOfWeek = daysOfWeek;
    }

    if (timeSlot !== undefined) {
      routine.timeSlot = timeSlot;
    }

    if (startTime !== undefined) {
      routine.startTime = typeof startTime === 'string' ? startTime.trim() : '';
    }

    if (endTime !== undefined) {
      routine.endTime = typeof endTime === 'string' ? endTime.trim() : '';
    }

    if (estimatedMinutes !== undefined) {
      routine.estimatedMinutes = Math.max(0, Number(estimatedMinutes) || 0);
    }

    if (priority !== undefined) {
      routine.priority = priority;
    }

    if (isActive !== undefined) {
      routine.isActive = Boolean(isActive);
    }

    if (order !== undefined) {
      routine.order = Number(order) || 0;
    }

    if (checklist !== undefined && Array.isArray(checklist)) {
      routine.checklist = checklist
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item) => ({ text: item.text.trim(), completed: false }));
      routine.markModified('checklist');
    }

    await routine.save();
    await routine.populate('projectId', 'title category status');

    // Also update pending synced daily tasks across all days
    const pendingTasks = await DailyTask.find({
      userId: req.user._id,
      $or: [
        { routineId: routine._id },
        { source: 'routine', title: routine.title },
        ...(previousTitle ? [{ source: 'routine', title: previousTitle }] : []),
      ],
      status: 'pending',
    });

    for (const task of pendingTasks) {
      task.title = routine.title;
      task.description = routine.description;
      task.timeSlot = routine.timeSlot;
      task.startTime = routine.startTime;
      task.endTime = routine.endTime;
      task.estimatedMinutes = routine.estimatedMinutes;
      task.priority = routine.priority;
      task.projectId = routine.projectId;
      task.routineId = routine._id;

      if (checklist !== undefined) {
        // Sync checklist items from routine: keep completion state for matching items, remove deleted items
        const existingChecklist = Array.isArray(task.checklist) ? task.checklist : [];
        task.checklist = (routine.checklist || []).map((rItem) => {
          const match = existingChecklist.find(
            (e) => e && e.text && e.text.trim().toLowerCase() === rItem.text.trim().toLowerCase()
          );
          return {
            text: rItem.text,
            completed: match ? Boolean(match.completed) : false,
          };
        });
        task.markModified('checklist');
      }

      await task.save();
    }

    res.json(routine);
  } catch (err) {
    console.error('Error updating routine:', err);
    res.status(400).json({ error: err.message || 'Error updating routine' });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/routines/:id/toggle - Toggle routine active/paused state
// -----------------------------------------------------------------------------
export const toggleRoutine = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const routine = await Routine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    routine.isActive = !routine.isActive;
    await routine.save();
    await routine.populate('projectId', 'title category status');

    res.json(routine);
  } catch (err) {
    console.error('Error toggling routine:', err);
    res.status(500).json({ error: 'Server error toggling routine' });
  }
};

// -----------------------------------------------------------------------------
// DELETE /api/routines/:id - Delete routine and cascade delete across all synced days
// -----------------------------------------------------------------------------
export const deleteRoutine = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const routine = await Routine.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    // Cascade delete: delete this routine from all synced days
    const taskDeleteResult = await DailyTask.deleteMany({
      userId: req.user._id,
      $or: [
        { routineId: routine._id },
        { source: 'routine', title: routine.title },
      ],
    });

    res.json({
      message: `Routine deleted and removed from all synced days (${taskDeleteResult.deletedCount} task instances deleted)`,
      deletedTaskInstancesCount: taskDeleteResult.deletedCount,
    });
  } catch (err) {
    console.error('Error deleting routine:', err);
    res.status(500).json({ error: 'Server error deleting routine' });
  }
};

// -----------------------------------------------------------------------------
// POST /api/routines/sync-to-date - Sync/apply active routines into DailyTasks for a date
// -----------------------------------------------------------------------------
export const syncRoutinesToDate = async (req, res) => {
  try {
    const targetDate = req.body.date || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' });
    }

    // Determine target day of week
    const [year, month, day] = targetDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayAbbr = DAY_NAMES[dateObj.getDay()];

    // Find all active routines matching this day
    const matchingRoutines = await Routine.find({
      userId: req.user._id,
      isActive: true,
      daysOfWeek: dayAbbr,
    });

    if (matchingRoutines.length === 0) {
      return res.json({
        message: 'No active routines scheduled for ' + dayAbbr,
        syncedCount: 0,
        dayAbbr,
        date: targetDate,
      });
    }

    // Find existing daily tasks for this user on this date
    const existingTasks = await DailyTask.find({
      userId: req.user._id,
      date: targetDate,
    });

    const tasksToCreate = [];
    let updatedExistingCount = 0;

    for (const routine of matchingRoutines) {
      // Check if already created by routineId or identical title
      const existingTask = existingTasks.find((t) => {
        if (t.routineId && t.routineId.toString() === routine._id.toString()) return true;
        if (t.title.trim().toLowerCase() === routine.title.trim().toLowerCase()) return true;
        return false;
      });

      if (!existingTask) {
        tasksToCreate.push({
          userId: req.user._id,
          title: routine.title,
          description: routine.description || '',
          date: targetDate,
          projectId: routine.projectId,
          priority: routine.priority,
          timeSlot: routine.timeSlot,
          startTime: routine.startTime || '',
          endTime: routine.endTime || '',
          estimatedMinutes: routine.estimatedMinutes,
          source: 'routine',
          routineId: routine._id,
          checklist: Array.isArray(routine.checklist)
            ? routine.checklist.map((item) => ({ text: item.text, completed: false }))
            : [],
          status: 'pending',
          order: routine.order || 0,
        });
      } else if (existingTask.status === 'pending') {
        // Sync latest routine details to existing pending task
        existingTask.title = routine.title;
        existingTask.description = routine.description || '';
        existingTask.projectId = routine.projectId;
        existingTask.priority = routine.priority;
        existingTask.timeSlot = routine.timeSlot;
        existingTask.startTime = routine.startTime || '';
        existingTask.endTime = routine.endTime || '';
        existingTask.estimatedMinutes = routine.estimatedMinutes;
        existingTask.routineId = routine._id;

        // Sync checklist: keep existing completion state if text matches, remove deleted subtasks
        const existingChecklist = Array.isArray(existingTask.checklist) ? existingTask.checklist : [];
        existingTask.checklist = (routine.checklist || []).map((rItem) => {
          const match = existingChecklist.find(
            (e) => e && e.text && e.text.trim().toLowerCase() === rItem.text.trim().toLowerCase()
          );
          return {
            text: rItem.text,
            completed: match ? Boolean(match.completed) : false,
          };
        });

        existingTask.markModified('checklist');
        await existingTask.save();
        updatedExistingCount++;
      }
    }

    let createdTasks = [];
    if (tasksToCreate.length > 0) {
      createdTasks = await DailyTask.insertMany(tasksToCreate);
      // Populate project information
      await DailyTask.populate(createdTasks, { path: 'projectId', select: 'title category status' });
    }

    res.json({
      message: `Synced routines for ${dayAbbr} (${targetDate}): ${createdTasks.length} created, ${updatedExistingCount} updated`,
      syncedCount: createdTasks.length + updatedExistingCount,
      createdCount: createdTasks.length,
      updatedCount: updatedExistingCount,
      dayAbbr,
      date: targetDate,
      createdTasks,
    });
  } catch (err) {
    console.error('Error syncing routines to date:', err);
    res.status(500).json({ error: 'Server error syncing routines' });
  }
};

