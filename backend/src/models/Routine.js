import mongoose from 'mongoose';

const routineSchema = new mongoose.Schema({
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
    required: [true, 'Routine title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'weekly', 'custom'],
    default: 'daily',
  },
  daysOfWeek: {
    type: [String],
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  timeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'morning',
  },
  startTime: {
    type: String,
    default: '',
    trim: true,
  },
  endTime: {
    type: String,
    default: '',
    trim: true,
  },
  estimatedMinutes: {
    type: Number,
    default: 30,
    min: 0,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  checklist: [
    {
      text: {
        type: String,
        required: true,
        trim: true,
      },
      completed: {
        type: Boolean,
        default: false,
      },
    },
  ],
}, {
  timestamps: true,
});

routineSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model('Routine', routineSchema);

