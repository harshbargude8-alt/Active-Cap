import mongoose from 'mongoose';

const inboxItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  convertedToProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.model('InboxItem', inboxItemSchema);
