import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';

// Import Routes
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import inboxRouter from './routes/inbox.js';
import reviewRouter from './routes/review.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/activecap';

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.CORS_ORIGIN) {
  // Support comma-separated origins
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(','));
}

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Connects to Vite app
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/review', reviewRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running smoothly!' });
});

// Connect Database & Start Server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('📦 Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
