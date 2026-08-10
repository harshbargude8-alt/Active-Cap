import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

import User from '../models/User.js';
import InboxItem from '../models/InboxItem.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/activecap';

async function test() {
  try {
    await mongoose.connect(MONGODB_URI);
    const user = await User.findOne({});
    if (!user) {
      console.log('No user found!');
      return;
    }

    // Create an inbox item
    const item = new InboxItem({
      userId: user._id,
      text: 'HTTP Delete Test Item',
    });
    await item.save();
    console.log('Created item for HTTP delete test:', item._id);

    // Sign JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'supercalmactivecapsecretkey123!',
      { expiresIn: '30d' }
    );

    // Call DELETE API via node global fetch
    console.log('Sending DELETE request to http://localhost:5000/api/inbox/' + item._id);
    const res = await fetch(`http://localhost:5000/api/inbox/${item._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response body:', data);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
