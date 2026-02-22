const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Optional auth — attaches req.user if a valid token is present, otherwise continues
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

// Emoji defaults by category for custom plants
function defaultEmoji(category) {
  return { vegetable: '🥬', herb: '🌿', fruit: '🍓', flower: '🌸' }[category] || '🌱';
}

// GET /plants — global plants + user's custom plants (when authenticated)
router.get('/', optionalAuth, (req, res) => {
  try {
    const { zone, garden_type, category, search } = req.query;

    let query = 'SELECT * FROM plants WHERE (user_id IS NULL OR user_id = ?)';
    const params = [req.user?.id || ''];

    if (zone) {
      const zoneNum = parseInt(zone);
      query += ' AND min_zone <= ? AND max_zone >= ?';
      params.push(zoneNum, zoneNum);
    }

    if (garden_type && garden_type !== 'all') {
      query += ' AND (garden_types = "all" OR garden_types LIKE ?)';
      params.push(`%${garden_type}%`);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY user_id ASC, category, name'; // custom plants float to top

    const plants = db.prepare(query).all(...params);
    res.json({ plants });
  } catch (err) {
    console.error('Get plants error:', err);
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

// GET /plants/:id
router.get('/:id', (req, res) => {
  const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  res.json({ plant });
});

// POST /plants/custom — create a user-specific custom plant
router.post('/custom', authMiddleware, (req, res) => {
  try {
    const { name, category, emoji, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!category)     return res.status(400).json({ error: 'category is required' });

    const id = uuidv4();
    const resolvedEmoji = emoji || defaultEmoji(category);

    db.prepare(`
      INSERT INTO plants
        (id, name, category, emoji, user_id, description,
         spacing_inches, min_zone, max_zone, days_to_maturity,
         sun_requirement, water_needs, garden_types, color)
      VALUES (?, ?, ?, ?, ?, ?, 12, 1, 13, 90, 'full_sun', 'moderate', 'all', '#4ade80')
    `).run(id, name.trim(), category, resolvedEmoji, req.user.id, description || null);

    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(id);
    res.status(201).json({ plant });
  } catch (err) {
    console.error('Create custom plant error:', err);
    res.status(500).json({ error: 'Failed to create custom plant' });
  }
});

// DELETE /plants/custom/:id — remove a user's custom plant
router.delete('/custom/:id', authMiddleware, (req, res) => {
  try {
    const plant = db.prepare('SELECT * FROM plants WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!plant) return res.status(404).json({ error: 'Custom plant not found' });
    db.prepare('DELETE FROM plants WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete custom plant' });
  }
});

module.exports = router;
