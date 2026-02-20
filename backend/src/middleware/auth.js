const jwt = require('jsonwebtoken');
const db  = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'chatgrd-dev-secret-change-in-prod';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Confirm user still exists (guards against stale tokens after DB resets)
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'Session expired, please log in again' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
