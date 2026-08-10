import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

import User from '../models/User.js';
import InboxItem from '../models/InboxItem.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/activecap';

async function test() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB.');

    // Find a user
    const user = await User.findOne({});
    if (!user) {
      console.log('No user found in database!');
      return;
    }

    // Find an inbox item
    const item = await InboxItem.findOne({ userId: user._id, convertedToProjectId: null });
    if (!item) {
      console.log('No unconverted inbox item found to delete. Creating one...');
      const newItem = new InboxItem({
        userId: user._id,
        text: 'Temporary Test Idea',
      });
      await newItem.save();
      console.log('Created temporary item:', newItem._id);
      return;
    }

    console.log('Found inbox item:', item._id, 'text:', item.text);

    // Try deleting using Mongoose directly first
    const deleted = await InboxItem.findOneAndDelete({ _id: item._id, userId: user._id });
    console.log('Mongoose findOneAndDelete result:', deleted ? 'Success' : 'Failed');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
