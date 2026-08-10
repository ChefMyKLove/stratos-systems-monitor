import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// Fail-closed: any missing/invalid/expired token is treated as unauthenticated.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated.' });

  try {
    req.patron = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Invalid or expired session.' });
  }
}
