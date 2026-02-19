const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const VALID_TABLES = ['dispositifs', 'interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'scoring'];

// Middleware to validate table name (prevents SQL injection)
const validateTable = (req, res, next) => {
  const { type } = req.params;
  if (!VALID_TABLES.includes(type)) {
    return res.status(400).json({ message: 'Type de caracteristique invalide' });
  }
  next();
};

// Helper: check instance access
const checkInstanceAccess = async (instanceId, user) => {
  const result = await pool.query(`
    SELECT i.*, s.region FROM instances i
    JOIN supermarkets s ON i.supermarket_id = s.id
    WHERE i.id = $1
  `, [instanceId]);

  if (result.rows.length === 0) return { error: 'Instance non trouvee', status: 404 };
  if ((user.role === 'region' || user.role === 'city') && result.rows[0].region !== user.region) {
    return { error: 'Acces refuse', status: 403 };
  }
  return { instance: result.rows[0] };
};

// GET /api/caracteristiques/:type/:instanceId - Get data for a characteristic
router.get('/:type/:instanceId', authMiddleware, validateTable, async (req, res) => {
  try {
    const { type, instanceId } = req.params;

    if (req.user.role === 'city' && type !== 'anomalies') {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const access = await checkInstanceAccess(instanceId, req.user);
    if (access.error) return res.status(access.status).json({ message: access.error });

    const result = await pool.query(`SELECT * FROM ${type} WHERE instance_id = $1`, [instanceId]);

    if (result.rows.length === 0) {
      return res.json({ instance_id: parseInt(instanceId), data: {}, exists: false });
    }

    res.json({ ...result.rows[0], exists: true });
  } catch (err) {
    console.error('Erreur get caracteristique:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/caracteristiques/:type/:instanceId - Create or update data
router.post('/:type/:instanceId', authMiddleware, validateTable, async (req, res) => {
  try {
    const { type, instanceId } = req.params;
    const { data } = req.body;

    if (req.user.role === 'city' && type !== 'anomalies') {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const access = await checkInstanceAccess(instanceId, req.user);
    if (access.error) return res.status(access.status).json({ message: access.error });

    // If entries array is empty, delete the row entirely so status shows "Non rempli"
    const isEmpty = Array.isArray(data.entries) && data.entries.length === 0;

    if (isEmpty) {
      await pool.query(`DELETE FROM ${type} WHERE instance_id = $1`, [instanceId]);
      return res.json({ instance_id: parseInt(instanceId), data: { entries: [] }, deleted: true });
    }

    // Check if record exists
    const existing = await pool.query(`SELECT id FROM ${type} WHERE instance_id = $1`, [instanceId]);

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE ${type} SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE instance_id = $2 RETURNING *`,
        [JSON.stringify(data), instanceId]
      );
    } else {
      result = await pool.query(
        `INSERT INTO ${type} (instance_id, data) VALUES ($1, $2) RETURNING *`,
        [instanceId, JSON.stringify(data)]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur save caracteristique:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/caracteristiques/summary/:instanceId - Get summary of all characteristics for an instance
router.get('/summary/:instanceId', authMiddleware, async (req, res) => {
  try {
    const { instanceId } = req.params;

    const access = await checkInstanceAccess(instanceId, req.user);
    if (access.error) return res.status(access.status).json({ message: access.error });

    const summary = {};
    for (const table of VALID_TABLES) {
      const result = await pool.query(`SELECT id, data FROM ${table} WHERE instance_id = $1`, [instanceId]);
      summary[table] = result.rows.length > 0 ? { exists: true, data: result.rows[0].data } : { exists: false, data: {} };
    }

    res.json(summary);
  } catch (err) {
    console.error('Erreur summary:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
