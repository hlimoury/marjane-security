const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/instances/supermarket/:supermarketId - List instances for a supermarket
router.get('/supermarket/:supermarketId', authMiddleware, async (req, res) => {
  try {
    const { supermarketId } = req.params;

    // Check supermarket exists and user has access
    const supermarket = await pool.query('SELECT * FROM supermarkets WHERE id = $1', [supermarketId]);
    if (supermarket.rows.length === 0) {
      return res.status(404).json({ message: 'Supermarche non trouve' });
    }
    if ((req.user.role === 'region' || req.user.role === 'city') && supermarket.rows[0].region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const result = await pool.query(
      'SELECT * FROM instances WHERE supermarket_id = $1 ORDER BY year DESC, month DESC',
      [supermarketId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erreur liste instances:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/instances/:id - Get single instance with its characteristics status
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT i.*, s.name as supermarket_name, s.region as supermarket_region
      FROM instances i
      JOIN supermarkets s ON i.supermarket_id = s.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Instance non trouvee' });
    }

    const instance = result.rows[0];

    if ((req.user.role === 'region' || req.user.role === 'city') && instance.supermarket_region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    // Check which characteristics have data
    const tables = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies'];
    const status = {};

    for (const table of tables) {
      const check = await pool.query(`SELECT id FROM ${table} WHERE instance_id = $1`, [id]);
      status[table] = check.rows.length > 0;
    }

    // Dispositifs and Scoring are stored at supermarket level
    const dispCheck = await pool.query('SELECT id FROM supermarket_dispositifs WHERE supermarket_id = $1', [instance.supermarket_id]);
    status.dispositifs = dispCheck.rows.length > 0;

    const scorCheck = await pool.query('SELECT id FROM supermarket_scoring WHERE supermarket_id = $1', [instance.supermarket_id]);
    status.scoring = scorCheck.rows.length > 0;

    res.json({ ...instance, caracteristiques_status: status });
  } catch (err) {
    console.error('Erreur detail instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/instances - Create instance
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'city') {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const { supermarket_id, month, year } = req.body;

    if (!supermarket_id || !month || !year) {
      return res.status(400).json({ message: 'Supermarche, mois et annee requis' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: 'Mois invalide (1-12)' });
    }

    // Check supermarket exists and user has access
    const supermarket = await pool.query('SELECT * FROM supermarkets WHERE id = $1', [supermarket_id]);
    if (supermarket.rows.length === 0) {
      return res.status(404).json({ message: 'Supermarche non trouve' });
    }
    if (req.user.role === 'region' && supermarket.rows[0].region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM instances WHERE supermarket_id = $1 AND month = $2 AND year = $3',
      [supermarket_id, month, year]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Une instance existe deja pour ce mois/annee' });
    }

    const result = await pool.query(
      'INSERT INTO instances (supermarket_id, month, year) VALUES ($1, $2, $3) RETURNING *',
      [supermarket_id, month, year]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur creation instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/instances/:id - Update instance (month/year)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'city') {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const { id } = req.params;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'Mois et annee requis' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: 'Mois invalide (1-12)' });
    }

    const instance = await pool.query(`
      SELECT i.*, s.region FROM instances i
      JOIN supermarkets s ON i.supermarket_id = s.id
      WHERE i.id = $1
    `, [id]);

    if (instance.rows.length === 0) {
      return res.status(404).json({ message: 'Instance non trouvee' });
    }

    if (req.user.role === 'region' && instance.rows[0].region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    // Check for duplicate (excluding current instance)
    const duplicate = await pool.query(
      'SELECT id FROM instances WHERE supermarket_id = $1 AND month = $2 AND year = $3 AND id != $4',
      [instance.rows[0].supermarket_id, month, year, id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ message: 'Une instance existe deja pour ce mois/annee' });
    }

    const result = await pool.query(
      'UPDATE instances SET month = $1, year = $2 WHERE id = $3 RETURNING *',
      [month, year, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur modification instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/instances/:id - Delete instance
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'city') {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const { id } = req.params;

    const instance = await pool.query(`
      SELECT i.*, s.region FROM instances i
      JOIN supermarkets s ON i.supermarket_id = s.id
      WHERE i.id = $1
    `, [id]);

    if (instance.rows.length === 0) {
      return res.status(404).json({ message: 'Instance non trouvee' });
    }

    if (req.user.role === 'region' && instance.rows[0].region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    await pool.query('DELETE FROM instances WHERE id = $1', [id]);
    res.json({ message: 'Instance supprimee' });
  } catch (err) {
    console.error('Erreur suppression instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
