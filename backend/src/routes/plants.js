const express = require('express');
const db = require('../db/schema');

const router = express.Router();

// Get all plants, optionally filtered by zone and garden type
router.get('/', (req, res) => {
  try {
    const { zone, garden_type, category, search } = req.query;

    let query = 'SELECT * FROM plants WHERE 1=1';
    const params = [];

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

    query += ' ORDER BY category, name';

    const plants = db.prepare(query).all(...params);
    res.json({ plants });
  } catch (err) {
    console.error('Get plants error:', err);
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

// Get single plant
router.get('/:id', (req, res) => {
  const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  res.json({ plant });
});

module.exports = router;
