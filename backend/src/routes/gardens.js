const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// File upload config
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// All routes require auth
router.use(authMiddleware);

// List user's gardens
router.get('/', (req, res) => {
  try {
    const gardens = db.prepare(`
      SELECT g.*, COUNT(gp.id) as plant_count
      FROM gardens g
      LEFT JOIN garden_plants gp ON g.id = gp.garden_id
      WHERE g.user_id = ?
      GROUP BY g.id
      ORDER BY g.updated_at DESC
    `).all(req.user.id);
    res.json({ gardens });
  } catch (err) {
    console.error('List gardens error:', err);
    res.status(500).json({ error: 'Failed to fetch gardens' });
  }
});

// Get single garden with plants
router.get('/:id', (req, res) => {
  try {
    const garden = db.prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    const plants = db.prepare(`
      SELECT gp.*, p.name, p.emoji, p.color, p.category, p.spacing_inches,
             p.days_to_maturity, p.sun_requirement, p.water_needs, p.height_inches,
             p.companions, p.antagonists, p.description, p.planting_tips
      FROM garden_plants gp
      JOIN plants p ON gp.plant_id = p.id
      WHERE gp.garden_id = ?
    `).all(garden.id);

    res.json({ garden, plants });
  } catch (err) {
    console.error('Get garden error:', err);
    res.status(500).json({ error: 'Failed to fetch garden' });
  }
});

// Create garden
router.post('/', upload.single('photo'), (req, res) => {
  try {
    const {
      name, garden_type, location_city, location_state, hardiness_zone,
      width_ft, length_ft, sun_exposure, has_fencing, irrigation_type, notes, layout_data
    } = req.body;

    if (!name || !garden_type) {
      return res.status(400).json({ error: 'Name and garden type are required' });
    }

    const id = uuidv4();
    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO gardens (id, user_id, name, garden_type, location_city, location_state,
        hardiness_zone, width_ft, length_ft, sun_exposure, has_fencing, irrigation_type,
        notes, photo_path, layout_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name, garden_type, location_city || null, location_state || null,
      hardiness_zone || null, parseFloat(width_ft) || null, parseFloat(length_ft) || null,
      sun_exposure || 'full_sun', has_fencing === 'true' ? 1 : 0,
      irrigation_type || 'hand', notes || null, photo_path, layout_data || null);

    const garden = db.prepare('SELECT * FROM gardens WHERE id = ?').get(id);
    res.status(201).json({ garden });
  } catch (err) {
    console.error('Create garden error:', err);
    res.status(500).json({ error: `Failed to create garden: ${err.message}` });
  }
});

// Update garden
router.put('/:id', upload.single('photo'), (req, res) => {
  try {
    const garden = db.prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    const {
      name, garden_type, location_city, location_state, hardiness_zone,
      width_ft, length_ft, sun_exposure, has_fencing, irrigation_type, notes, layout_data
    } = req.body;

    const photo_path = req.file ? `/uploads/${req.file.filename}` : garden.photo_path;

    db.prepare(`
      UPDATE gardens SET
        name = COALESCE(?, name),
        garden_type = COALESCE(?, garden_type),
        location_city = COALESCE(?, location_city),
        location_state = COALESCE(?, location_state),
        hardiness_zone = COALESCE(?, hardiness_zone),
        width_ft = COALESCE(?, width_ft),
        length_ft = COALESCE(?, length_ft),
        sun_exposure = COALESCE(?, sun_exposure),
        has_fencing = COALESCE(?, has_fencing),
        irrigation_type = COALESCE(?, irrigation_type),
        notes = ?,
        photo_path = ?,
        layout_data = COALESCE(?, layout_data),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || null, garden_type || null, location_city || null, location_state || null,
      hardiness_zone || null, parseFloat(width_ft) || null, parseFloat(length_ft) || null,
      sun_exposure || null, has_fencing !== undefined ? (has_fencing === 'true' ? 1 : 0) : null,
      irrigation_type || null, notes !== undefined ? notes : garden.notes,
      photo_path, layout_data || null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM gardens WHERE id = ?').get(req.params.id);
    res.json({ garden: updated });
  } catch (err) {
    console.error('Update garden error:', err);
    res.status(500).json({ error: 'Failed to update garden' });
  }
});

// Delete garden
router.delete('/:id', (req, res) => {
  const garden = db.prepare('SELECT id FROM gardens WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  db.prepare('DELETE FROM gardens WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Add plant to garden
router.post('/:id/plants', (req, res) => {
  try {
    const garden = db.prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    const { plant_id, x_position, y_position, quantity } = req.body;
    if (!plant_id) return res.status(400).json({ error: 'plant_id required' });

    const plant = db.prepare('SELECT id FROM plants WHERE id = ?').get(plant_id);
    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO garden_plants (id, garden_id, plant_id, x_position, y_position, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, plant_id, x_position || 0, y_position || 0, quantity || 1);

    // Update garden timestamp
    db.prepare("UPDATE gardens SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    const gp = db.prepare(`
      SELECT gp.*, p.name, p.emoji, p.color, p.category, p.spacing_inches
      FROM garden_plants gp JOIN plants p ON gp.plant_id = p.id
      WHERE gp.id = ?
    `).get(id);
    res.status(201).json({ garden_plant: gp });
  } catch (err) {
    console.error('Add plant error:', err);
    res.status(500).json({ error: 'Failed to add plant' });
  }
});

// Update plant position in garden
router.put('/:id/plants/:gpId', (req, res) => {
  try {
    const garden = db.prepare('SELECT id FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    const { x_position, y_position, quantity, notes } = req.body;
    db.prepare(`
      UPDATE garden_plants SET
        x_position = COALESCE(?, x_position),
        y_position = COALESCE(?, y_position),
        quantity = COALESCE(?, quantity),
        notes = COALESCE(?, notes)
      WHERE id = ? AND garden_id = ?
    `).run(x_position, y_position, quantity, notes, req.params.gpId, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plant position' });
  }
});

// Remove plant from garden
router.delete('/:id/plants/:gpId', (req, res) => {
  try {
    const garden = db.prepare('SELECT id FROM gardens WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });

    db.prepare('DELETE FROM garden_plants WHERE id = ? AND garden_id = ?')
      .run(req.params.gpId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove plant' });
  }
});

module.exports = router;
