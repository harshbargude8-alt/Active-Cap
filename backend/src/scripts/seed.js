import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

import User from '../models/User.js';
import Project from '../models/Project.js';
import CheckIn from '../models/CheckIn.js';
import InboxItem from '../models/InboxItem.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/activecap';

async function seed() {
  try {
    console.log('🌱 Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    
    // Clear existing data
    console.log('🧹 Clearing existing database collections...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await CheckIn.deleteMany({});
    await InboxItem.deleteMany({});

    // Create default user
    console.log('👤 Creating default user...');
    const passwordHash = await bcrypt.hash('demo123', 10);
    const user = new User({
      username: 'demo',
      password: passwordHash,
    });
    await user.save();
    console.log(`Created user: ${user.username} (password: demo123)`);

    // Create dates relative to today
    const now = new Date();
    const oneDayAgo = new Date(now); oneDayAgo.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
    const tenDaysAgo = new Date(now); tenDaysAgo.setDate(now.getDate() - 10);
    const twentyDaysAgo = new Date(now); twentyDaysAgo.setDate(now.getDate() - 20);

    // Create projects
    console.log('📂 Creating seed projects...');
    
    // 1. Active Project A: OutboxSyncService
    const projectA = new Project({
      userId: user._id,
      title: 'OutboxSyncService',
      description: 'A microservice that aggregates queue items, batch exports them, and verifies receipt asynchronously.',
      category: 'Code',
      status: 'Active',
      activatedAt: tenDaysAgo,
      lastTouchedAt: now,
      nextStep: 'Define the protocol buffer schema for the queue exporter',
      streakCount: 3,
      longestStreak: 4,
      totalCheckIns: 4,
    });
    await projectA.save();

    // Check-ins for Project A
    const checkInsA = [
      new CheckIn({
        projectId: projectA._id,
        userId: user._id,
        date: threeDaysAgo,
        note: 'Scaffolded the express service and configured mongoose models.',
        minutesSpent: 60,
      }),
      new CheckIn({
        projectId: projectA._id,
        userId: user._id,
        date: twoDaysAgo,
        note: 'Set up worker queue loop and verified job polling.',
        minutesSpent: 45,
      }),
      new CheckIn({
        projectId: projectA._id,
        userId: user._id,
        date: oneDayAgo,
        note: 'Added health check and robust error recovery logs.',
        minutesSpent: 30,
      }),
      new CheckIn({
        projectId: projectA._id,
        userId: user._id,
        date: now,
        note: 'Wrote unit tests for local file queue batching.',
        minutesSpent: 50,
      }),
    ];
    await CheckIn.insertMany(checkInsA);

    // 2. Active Project B: Jantar Mantar video
    const projectB = new Project({
      userId: user._id,
      title: 'Jantar Mantar video',
      description: 'An educational video essay discussing the cosmic architecture, geometries, and astrolabes of Delhi Jantar Mantar.',
      category: 'Content',
      status: 'Active',
      activatedAt: twoDaysAgo,
      lastTouchedAt: now,
      nextStep: 'Rough cut edit of the drone flyover footage',
      streakCount: 1,
      longestStreak: 1,
      totalCheckIns: 1,
    });
    await projectB.save();

    const checkInsB = [
      new CheckIn({
        projectId: projectB._id,
        userId: user._id,
        date: now,
        note: 'Imported raw footage and created timeline structure.',
        minutesSpent: 90,
      }),
    ];
    await CheckIn.insertMany(checkInsB);

    // 3. Parked Project C: Learn Blender Physics
    const projectC = new Project({
      userId: user._id,
      title: 'Learn Blender Physics',
      description: 'Master cloth, fluid, and rigid body simulation tools inside Blender for procedural design.',
      category: 'Animation',
      status: 'Parked',
      lastTouchedAt: twentyDaysAgo,
      nextStep: 'Watch 3D cloth simulator tutorial on YouTube',
      streakCount: 0,
      longestStreak: 2,
      totalCheckIns: 2,
    });
    await projectC.save();

    const checkInsC = [
      new CheckIn({
        projectId: projectC._id,
        userId: user._id,
        date: twentyDaysAgo,
        note: 'Tested basic soft body physics colliders on sphere.',
        minutesSpent: 40,
      }),
    ];
    await CheckIn.insertMany(checkInsC);

    // 4. Someday Project D: Writing a Sci-Fi short
    const projectD = new Project({
      userId: user._id,
      title: 'Writing a Sci-Fi short story',
      description: 'A story about an archivist on a generation ship who discovers the ship is orbiting the destination planet for 50 years without waking anyone.',
      category: 'Writing',
      status: 'Someday',
      nextStep: 'Draft character descriptions for Captain and Archivist',
      streakCount: 0,
      longestStreak: 0,
      totalCheckIns: 0,
    });
    await projectD.save();

    // 5. Done Project E: Synth Patch design
    const projectE = new Project({
      userId: user._id,
      title: 'Synth patch design',
      description: 'Create 12 retro-wave pads and lead patches for Serum synth.',
      category: 'Music',
      status: 'Done',
      lastTouchedAt: oneDayAgo,
      nextStep: 'Pack them in a ZIP file and share on blog',
      streakCount: 0,
      longestStreak: 5,
      totalCheckIns: 1,
    });
    await projectE.save();

    // Inbox Items
    console.log('📥 Creating quick capture ideas...');
    const inboxItems = [
      new InboxItem({
        userId: user._id,
        text: 'Write a quick markdown parser for custom tables',
      }),
      new InboxItem({
        userId: user._id,
        text: 'Explore Web Audio API for custom pitch oscillators in JS',
      }),
      new InboxItem({
        userId: user._id,
        text: 'Refactor old blog layouts with CSS Grid and Outfit fonts',
      }),
    ];
    await InboxItem.insertMany(inboxItems);

    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database.');
  }
}

seed();
