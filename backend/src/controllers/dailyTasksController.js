import mongoose from 'mongoose';
import DailyTask from '../models/DailyTask.js';
import Project from '../models/Project.js';
import { getOrSetCache, invalidatePattern } from '../utils/cache.js';

// Helper to bust all daily task and stats caches for a user
export const invalidateUserTaskCaches = async (userId) => {
  await Promise.all([
    invalidatePattern(`activecap:tasks:${userId}:*`),
    invalidatePattern(`activecap:tasks:stats:${userId}:*`),
  ]);
};

const priorityWeight = { high: 3, medium: 2, low: 1 };

// Helper to sort tasks: order ASC, startTime ASC (if set), priority DESC (high > medium > low), createdAt ASC
const sortTasks = (tasks) => {
  return tasks.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.startTime && b.startTime && a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    if (a.startTime && !b.startTime) return -1;
    if (!a.startTime && b.startTime) return 1;
    const pA = priorityWeight[a.priority] || 2;
    const pB = priorityWeight[b.priority] || 2;
    if (pB !== pA) return pB - pA;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

// -----------------------------------------------------------------------------
// GET /api/daily-tasks/stats - Aggregated stats, project tracks & completion streak
// -----------------------------------------------------------------------------
export const getDailyTaskStats = async (req, res) => {
  try {
    const daysCount = Math.max(1, parseInt(req.query.days, 10) || 7);
    const cacheKey = `activecap:tasks:stats:${req.user._id}:${daysCount}`;

    const statsData = await getOrSetCache(cacheKey, 600, async () => {
      // Build array of past N date strings: [earliest, ..., today]
      const dates = [];
      const today = new Date();
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const startDateStr = dates[0];
      const endDateStr = dates[dates.length - 1];

      const tasks = await DailyTask.find({
        userId: req.user._id,
        date: { $gte: startDateStr, $lte: endDateStr },
      }).populate('projectId', 'title category status');

      // Aggregate by date
      const dailyStats = dates.map((dStr) => {
        const tasksOnDate = tasks.filter((t) => t.date === dStr);
        const total = tasksOnDate.length;
        const completed = tasksOnDate.filter((t) => t.status === 'completed').length;
        const pending = tasksOnDate.filter((t) => t.status === 'pending').length;
        const inProgress = tasksOnDate.filter((t) => t.status === 'in-progress').length;
        const totalEstimatedMinutes = tasksOnDate.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
        const totalActualMinutes = tasksOnDate.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          date: dStr,
          total,
          completed,
          pending,
          inProgress,
          completionRate,
          totalEstimatedMinutes,
          totalActualMinutes,
        };
      });

      // Group tasks by project track
      const projectMap = {};
      tasks.forEach((task) => {
        const projIdKey = task.projectId ? task.projectId._id.toString() : 'general';
        if (!projectMap[projIdKey]) {
          projectMap[projIdKey] = {
            projectId: task.projectId ? task.projectId._id : null,
            projectTitle: task.projectId ? task.projectId.title : 'General Tasks',
            projectCategory: task.projectId ? task.projectId.category : null,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            totalEstimatedMinutes: 0,
            totalActualMinutes: 0,
          };
        }
        projectMap[projIdKey].totalTasks += 1;
        if (task.status === 'completed') {
          projectMap[projIdKey].completedTasks += 1;
        } else if (task.status === 'pending') {
          projectMap[projIdKey].pendingTasks += 1;
        }
        projectMap[projIdKey].totalEstimatedMinutes += task.estimatedMinutes || 0;
        projectMap[projIdKey].totalActualMinutes += task.actualMinutes || 0;
      });

      const projectStats = Object.values(projectMap);

      // Compute streak across all completed tasks for user
      const completedTasksAll = await DailyTask.find({
        userId: req.user._id,
        status: 'completed',
      }).select('date').lean();

      const completedDatesSet = new Set(completedTasksAll.map((t) => t.date));

      // Calculate current streak
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      let currentStreak = 0;
      let checkDate = null;

      if (completedDatesSet.has(todayStr)) {
        checkDate = new Date(now);
      } else if (completedDatesSet.has(yesterdayStr)) {
        checkDate = yesterdayDate;
      }

      if (checkDate) {
        while (true) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (completedDatesSet.has(dStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Longest streak
      const sortedCompletedDates = Array.from(completedDatesSet).sort();
      let longestStreak = 0;
      let runningStreak = 0;
      let previousDateObj = null;

      for (const dStr of sortedCompletedDates) {
        const [year, month, day] = dStr.split('-').map(Number);
        const currDateObj = new Date(year, month - 1, day);
        if (!previousDateObj) {
          runningStreak = 1;
        } else {
          const diffMs = currDateObj.getTime() - previousDateObj.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            runningStreak++;
          } else if (diffDays > 1) {
            runningStreak = 1;
          }
        }
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
        previousDateObj = currDateObj;
      }

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === 'completed').length;
      const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
      const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      const totalActualMinutes = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);

      const summary = {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate: overallCompletionRate,
        totalEstimatedMinutes,
        totalActualMinutes,
        currentStreak,
        longestStreak,
      };

      return {
        days: daysCount,
        startDate: startDateStr,
        endDate: endDateStr,
        totalTasks,
        completedTasks,
        pendingTasks,
        overallCompletionRate,
        totalEstimatedMinutes,
        totalActualMinutes,
        currentStreak,
        longestStreak,
        summary,
        dailyStats,
        projectStats,
      };
    });

    res.json(statsData);
  } catch (err) {
    console.error('Error fetching daily task stats:', err);
    res.status(500).json({ error: 'Server error retrieving stats' });
  }
};

// -----------------------------------------------------------------------------
// POST /api/daily-tasks/rollover - Move unfinished tasks to new date
// -----------------------------------------------------------------------------
export const rolloverTasks = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    const targetDate = toDate || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'Valid toDate formatted as YYYY-MM-DD is required' });
    }

    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({ error: 'fromDate must be formatted as YYYY-MM-DD' });
    }

    const query = {
      userId: req.user._id,
      status: { $ne: 'completed' },
      ...(fromDate ? { date: fromDate } : { date: { $lt: targetDate } }),
    };

    const updateResult = await DailyTask.updateMany(query, {
      $set: {
        date: targetDate,
        source: 'rollover',
      },
    });

    await invalidateUserTaskCaches(req.user._id);

    res.json({
      message: 'Rollover successful',
      rolledOverCount: updateResult.modifiedCount || 0,
    });
  } catch (err) {
    console.error('Error rolling over tasks:', err);
    res.status(500).json({ error: 'Server error during task rollover' });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/daily-tasks/reorder - Bulk update task order values
// -----------------------------------------------------------------------------
export const reorderTasks = async (req, res) => {
  try {
    const { taskOrders } = req.body;
    if (!Array.isArray(taskOrders)) {
      return res.status(400).json({ error: 'taskOrders array is required' });
    }

    const validOperations = taskOrders
      .filter((item) => item && (item.id || item._id) && typeof item.order === 'number')
      .map((item) => ({
        updateOne: {
          filter: {
            _id: item.id || item._id,
            userId: req.user._id,
          },
          update: {
            $set: { order: item.order },
          },
        },
      }));

    if (validOperations.length > 0) {
      await DailyTask.bulkWrite(validOperations);
      await invalidateUserTaskCaches(req.user._id);
    }

    res.json({
      message: 'Task order updated successfully',
      updatedCount: validOperations.length,
    });
  } catch (err) {
    console.error('Error reordering tasks:', err);
    res.status(500).json({ error: 'Server error reordering tasks' });
  }
};

// -----------------------------------------------------------------------------
// GET /api/daily-tasks - Retrieve daily tasks with filtering & daily summary
// -----------------------------------------------------------------------------
export const getDailyTasks = async (req, res) => {
  try {
    const targetDate = req.query.date ? (req.query.date !== 'all' ? req.query.date : 'all') : new Date().toISOString().split('T')[0];
    const projectId = req.query.projectId || 'all';
    const status = req.query.status || 'all';

    const cacheKey = `activecap:tasks:${req.user._id}:${targetDate}:${projectId}:${status}`;

    const result = await getOrSetCache(cacheKey, 300, async () => {
      const filter = { userId: req.user._id };

      if (targetDate !== 'all') {
        filter.date = targetDate;
      }

      if (projectId !== 'all') {
        if (projectId === 'null' || projectId === 'none') {
          filter.projectId = null;
        } else {
          filter.projectId = projectId;
        }
      }

      if (status !== 'all') {
        filter.status = status;
      }

      const tasks = await DailyTask.find(filter)
        .populate('projectId', 'title category status')
        .lean();

      // Sort order ASC, priority DESC, createdAt ASC
      sortTasks(tasks);

      // Compute summary
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const pending = tasks.filter((t) => t.status === 'pending').length;
      const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
      const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      const totalActualMinutes = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);

      const summary = {
        total,
        completed,
        pending,
        inProgress,
        totalEstimatedMinutes,
        totalActualMinutes,
      };

      return { tasks, summary };
    });

    res.json(result);
  } catch (err) {
    console.error('Error retrieving daily tasks:', err);
    res.status(500).json({ error: 'Server error retrieving daily tasks' });
  }
};

// -----------------------------------------------------------------------------
// POST /api/daily-tasks - Create new daily task
// -----------------------------------------------------------------------------
export const createDailyTask = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      projectId,
      priority,
      timeSlot,
      startTime = '',
      endTime = '',
      estimatedMinutes,
      actualMinutes,
      status,
      order,
      source,
      checklist,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const taskDate = date || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(taskDate)) {
      return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' });
    }

    let validatedProjectId = null;
    if (projectId && projectId !== 'none' && projectId !== 'null') {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ error: 'Invalid projectId' });
      }
      const project = await Project.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(400).json({ error: 'Project not found or does not belong to user' });
      }
      validatedProjectId = project._id;
    }

    const taskData = {
      userId: req.user._id,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      date: taskDate,
      projectId: validatedProjectId,
      priority: priority || 'medium',
      timeSlot: timeSlot || 'anytime',
      startTime: typeof startTime === 'string' ? startTime.trim() : '',
      endTime: typeof endTime === 'string' ? endTime.trim() : '',
      estimatedMinutes: Math.max(0, Number(estimatedMinutes) || 0),
      actualMinutes: Math.max(0, Number(actualMinutes) || 0),
      status: status || 'pending',
      order: Number(order) || 0,
      source: source || 'manual',
      completedAt: status === 'completed' ? new Date() : null,
      checklist: Array.isArray(checklist)
        ? checklist
            .filter((item) => item && typeof item.text === 'string' && item.text.trim())
            .map((item) => ({ text: item.text.trim(), completed: Boolean(item.completed) }))
        : [],
    };

    const task = new DailyTask(taskData);
    await task.save();
    await task.populate('projectId', 'title category status');

    // Invalidate user task and stats caches on create
    await invalidateUserTaskCaches(req.user._id);

    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating daily task:', err);
    res.status(400).json({ error: err.message || 'Error creating daily task' });
  }
};

// -----------------------------------------------------------------------------
// GET /api/daily-tasks/:id - Retrieve single task
// -----------------------------------------------------------------------------
export const getDailyTaskById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await DailyTask.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('projectId', 'title category status');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (err) {
    console.error('Error retrieving task:', err);
    res.status(500).json({ error: 'Server error retrieving task' });
  }
};

// -----------------------------------------------------------------------------
// PUT /api/daily-tasks/:id - Update daily task
// -----------------------------------------------------------------------------
export const updateDailyTask = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await DailyTask.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      title,
      description,
      date,
      projectId,
      priority,
      timeSlot,
      startTime = '',
      endTime = '',
      estimatedMinutes,
      actualMinutes,
      status,
      order,
      source,
      checklist,
    } = req.body;

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Task title cannot be empty' });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = typeof description === 'string' ? description.trim() : '';
    }

    if (date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' });
      }
      task.date = date;
    }

    if (projectId !== undefined) {
      if (projectId === null || projectId === '' || projectId === 'none' || projectId === 'null') {
        task.projectId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
          return res.status(400).json({ error: 'Invalid projectId' });
        }
        const project = await Project.findOne({ _id: projectId, userId: req.user._id });
        if (!project) {
          return res.status(400).json({ error: 'Project not found or does not belong to user' });
        }
        task.projectId = project._id;
      }
    }

    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority value' });
      }
      task.priority = priority;
    }

    if (timeSlot !== undefined) {
      if (!['morning', 'afternoon', 'evening', 'anytime'].includes(timeSlot)) {
        return res.status(400).json({ error: 'Invalid timeSlot value' });
      }
      task.timeSlot = timeSlot;
    }

    if (startTime !== undefined) {
      task.startTime = typeof startTime === 'string' ? startTime.trim() : '';
    }

    if (endTime !== undefined) {
      task.endTime = typeof endTime === 'string' ? endTime.trim() : '';
    }

    if (estimatedMinutes !== undefined) {
      task.estimatedMinutes = Math.max(0, Number(estimatedMinutes) || 0);
    }

    if (actualMinutes !== undefined) {
      task.actualMinutes = Math.max(0, Number(actualMinutes) || 0);
    }

    if (order !== undefined) {
      task.order = Number(order) || 0;
    }

    if (source !== undefined) {
      if (['manual', 'project_next_step', 'routine', 'rollover'].includes(source)) {
        task.source = source;
      }
    }

    if (checklist !== undefined && Array.isArray(checklist)) {
      task.checklist = checklist
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item) => ({
          text: item.text.trim(),
          completed: Boolean(item.completed),
          ...(item._id ? { _id: item._id } : {}),
        }));
      task.markModified('checklist');
    }

    if (status !== undefined) {
      if (!['pending', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      if (status === 'completed' && task.status !== 'completed') {
        task.completedAt = new Date();
      } else if (status !== 'completed' && task.status === 'completed') {
        task.completedAt = null;
      }
      task.status = status;
    }

    await task.save();
    await task.populate('projectId', 'title category status');

    await invalidateUserTaskCaches(req.user._id);

    res.json(task);
  } catch (err) {
    console.error('Error updating daily task:', err);
    res.status(400).json({ error: err.message || 'Error updating daily task' });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/daily-tasks/:id/toggle - Toggle task completion status
// -----------------------------------------------------------------------------
export const toggleDailyTask = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await DailyTask.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'completed') {
      task.status = 'pending';
      task.completedAt = null;
    } else {
      task.status = 'completed';
      task.completedAt = new Date();
    }

    await task.save();
    await task.populate('projectId', 'title category status');

    await invalidateUserTaskCaches(req.user._id);

    res.json(task);
  } catch (err) {
    console.error('Error toggling daily task:', err);
    res.status(500).json({ error: 'Server error toggling daily task' });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/daily-tasks/:id/checklist-toggle - Toggle subtask item completion
// -----------------------------------------------------------------------------
export const toggleDailyTaskSubtask = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await DailyTask.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { itemIndex, subtaskId, completed } = req.body;

    let targetItem = null;
    if (subtaskId && task.checklist) {
      targetItem = task.checklist.id(subtaskId);
    } else if (typeof itemIndex === 'number' && task.checklist && task.checklist[itemIndex]) {
      targetItem = task.checklist[itemIndex];
    }

    if (!targetItem) {
      return res.status(404).json({ error: 'Subtask item not found' });
    }

    targetItem.completed = completed !== undefined ? Boolean(completed) : !targetItem.completed;
    await task.save();
    await task.populate('projectId', 'title category status');

    await invalidateUserTaskCaches(req.user._id);

    res.json(task);
  } catch (err) {
    console.error('Error toggling subtask:', err);
    res.status(500).json({ error: 'Server error toggling subtask' });
  }
};

// -----------------------------------------------------------------------------
// DELETE /api/daily-tasks/:id - Delete daily task
// -----------------------------------------------------------------------------
export const deleteDailyTask = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await DailyTask.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await invalidateUserTaskCaches(req.user._id);

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting daily task:', err);
    res.status(500).json({ error: 'Server error deleting task' });
  }
};

