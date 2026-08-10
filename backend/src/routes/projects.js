import express from 'express';
import Project from '../models/Project.js';
import CheckIn from '../models/CheckIn.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Helper to check Active Projects Count and handle Swaps
const handleActiveCap = async (userId, targetProjectId = null, swapProjectId = null) => {
  // Find all active projects for user (excluding the target project itself if it's being updated)
  const query = { userId, status: 'Active' };
  if (targetProjectId) {
    query._id = { $ne: targetProjectId };
  }
  
  const activeProjects = await Project.find(query);
  
  if (activeProjects.length >= 2) {
    if (swapProjectId) {
      // Verify swap project belongs to the user and is Active
      const projectToPark = await Project.findOne({ _id: swapProjectId, userId, status: 'Active' });
      if (!projectToPark) {
        throw new Error('Selected project to swap out is not active or invalid.');
      }
      // Park the swap project
      projectToPark.status = 'Parked';
      await projectToPark.save();
      return true;
    } else {
      // Return false to indicate cap is exceeded and list of active projects is required for swap
      return { capExceeded: true, activeProjects };
    }
  }
  
  return true;
};

// GET all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Server error retrieving projects' });
  }
});

// GET single project details
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error retrieving project details' });
  }
});

// POST create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, status, nextStep, swapProjectId } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required.' });
    }

    const projectData = {
      userId: req.user._id,
      title,
      description,
      category,
      status: status || 'Parked',
      nextStep,
    };

    if (status === 'Active') {
      const capCheck = await handleActiveCap(req.user._id, null, swapProjectId);
      if (capCheck.capExceeded) {
        return res.status(400).json({
          error: 'Active project cap reached (max 2). Select a project to swap.',
          capReached: true,
          activeProjects: capCheck.activeProjects,
        });
      }
      projectData.activatedAt = new Date();
      projectData.lastTouchedAt = new Date();
    }

    const project = new Project(projectData);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error creating project' });
  }
});

// PUT update project details / status
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, category, status, nextStep, swapProjectId } = req.body;
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // If status is being updated to Active
    if (status === 'Active' && project.status !== 'Active') {
      const capCheck = await handleActiveCap(req.user._id, project._id, swapProjectId);
      if (capCheck.capExceeded) {
        return res.status(400).json({
          error: 'Active project cap reached (max 2). Select a project to swap.',
          capReached: true,
          activeProjects: capCheck.activeProjects,
        });
      }
      project.activatedAt = new Date();
      project.lastTouchedAt = new Date();
    }

    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (category) project.category = category;
    if (status) project.status = status;
    if (nextStep !== undefined) project.nextStep = nextStep;

    await project.save();
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error updating project' });
  }
});

// PUT project status swap (explicit action)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, swapProjectId, nextStep } = req.body;
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if (status === 'Active' && project.status !== 'Active') {
      if (nextStep) project.nextStep = nextStep; // allow sending new nextStep in status update
      const capCheck = await handleActiveCap(req.user._id, project._id, swapProjectId);
      if (capCheck.capExceeded) {
        return res.status(400).json({
          error: 'Active project cap reached (max 2). Select a project to swap.',
          capReached: true,
          activeProjects: capCheck.activeProjects,
        });
      }
      project.activatedAt = new Date();
      project.lastTouchedAt = new Date();
    }

    project.status = status;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error updating status' });
  }
});

// DELETE project and its checkins
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    // Delete associated check-ins
    await CheckIn.deleteMany({ projectId: project._id });
    res.json({ message: 'Project and all check-ins deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting project' });
  }
});

// POST log check-in
router.post('/:id/checkin', auth, async (req, res) => {
  try {
    const { note, minutesSpent, date } = req.body;
    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'Check-in note is required.' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const checkInDate = date ? new Date(date) : new Date();

    // Helper to calculate calendar days difference
    const getStartOfDay = (d) => {
      const dateCopy = new Date(d);
      dateCopy.setHours(0, 0, 0, 0);
      return dateCopy;
    };

    // Find the latest check-in for this project before this check-in date
    const lastCheckIn = await CheckIn.findOne({
      projectId: project._id,
      date: { $lt: checkInDate }
    }).sort({ date: -1 });

    let newStreak = 1;
    if (lastCheckIn) {
      const todayStart = getStartOfDay(checkInDate);
      const lastCheckInStart = getStartOfDay(lastCheckIn.date);
      const diffTime = todayStart.getTime() - lastCheckInStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Multiple checkins on the same day -> streak remains the same
        newStreak = project.streakCount;
      } else if (diffDays === 1) {
        // Consecutive calendar day -> increment streak
        newStreak = project.streakCount + 1;
      } else {
        // Gap -> reset streak to 1
        newStreak = 1;
      }
    }

    // Save the checkin
    const checkIn = new CheckIn({
      projectId: project._id,
      userId: req.user._id,
      date: checkInDate,
      note,
      minutesSpent: minutesSpent ? parseInt(minutesSpent, 10) : undefined,
    });
    await checkIn.save();

    // Update project stats
    project.streakCount = newStreak;
    if (newStreak > project.longestStreak) {
      project.longestStreak = newStreak;
    }
    project.totalCheckIns += 1;
    project.lastTouchedAt = checkInDate;

    await project.save();
    res.status(201).json({ checkIn, project });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error logging check-in' });
  }
});

// GET all check-ins for a project
router.get('/:id/checkins', auth, async (req, res) => {
  try {
    const checkIns = await CheckIn.find({
      projectId: req.params.id,
      userId: req.user._id
    }).sort({ date: -1 });
    res.json(checkIns);
  } catch (err) {
    res.status(500).json({ error: 'Server error retrieving check-ins' });
  }
});

export default router;
