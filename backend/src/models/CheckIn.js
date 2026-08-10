import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  note: {
    type: String,
    required: true,
    trim: true,
  },
  minutesSpent: {
    type: Number,
  },
}, {
  timestamps: true,
});

export default mongoose.model('CheckIn', checkInSchema);
