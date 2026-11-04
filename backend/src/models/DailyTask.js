import mongoose from 'mongoose';

const dailyTaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  date: {
    type: String,
    required: true,
    index: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  timeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime',
  },
  estimatedMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  actualMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  order: {
    type: Number,
    default: 0,
  },
  source: {
    type: String,
    enum: ['manual', 'project_next_step', 'routine', 'rollover'],
    default: 'manual',
  },
  routineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Routine',
    default: null,
  },
}, {
  timestamps: true,
});

// Compound indexes
dailyTaskSchema.index({ userId: 1, date: 1, status: 1 });
dailyTaskSchema.index({ userId: 1, projectId: 1 });

export default mongoose.model('DailyTask', dailyTaskSchema);
