import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ["Code", "Content", "Music", "Animation", "Writing", "Research", "Other"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Active", "Parked", "Someday", "Done", "Abandoned"],
    default: "Parked",
    required: true,
  },
  activatedAt: {
    type: Date,
  },
  lastTouchedAt: {
    type: Date,
  },
  nextStep: {
    type: String,
    // Custom logic will check for required when Active
  },
  streakCount: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  totalCheckIns: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

projectSchema.pre('save', function () {
  if (this.status === 'Active' && (!this.nextStep || this.nextStep.trim() === '')) {
    throw new Error('A concrete next step is required for Active projects.');
  }
});

export default mongoose.model('Project', projectSchema);
