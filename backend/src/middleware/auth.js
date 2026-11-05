import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getOrSetCache } from '../utils/cache.js';

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supercalmactivecapsecretkey123!');
    
    // Cache user profile for 15 minutes (900s) to eliminate repetitive DB auth hits
    const cacheKey = `activecap:user:${decoded.id}`;
    const user = await getOrSetCache(cacheKey, 900, async () => {
      return await User.findById(decoded.id).select('-password').lean();
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found, authorization denied' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};
