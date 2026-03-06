const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const VALID_TABLES = ['dispositifs', 'interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'scoring', 'controle_rm'];

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

    // Dispositifs: inherit from previous month if this instance has no data
    if (type === 'dispositifs') {
      const inst = access.instance;
      const now = new Date();
      const isFutureMonth = inst.year > now.getFullYear() || (inst.year === now.getFullYear() && inst.month > now.getMonth() + 1);
      const locked = isFutureMonth;

      const result = await pool.query(`SELECT * FROM dispositifs WHERE instance_id = $1`, [instanceId]);
      if (result.rows.length > 0) {
        return res.json({ ...result.rows[0], exists: true, locked });
      }
      const inherited = await pool.query(`
        SELECT d.data FROM dispositifs d
        JOIN instances i ON d.instance_id = i.id
        WHERE i.supermarket_id = $1
          AND (i.year < $2 OR (i.year = $2 AND i.month < $3))
        ORDER BY i.year DESC, i.month DESC
        LIMIT 1
      `, [inst.supermarket_id, inst.year, inst.month]);
      if (inherited.rows.length > 0) {
        return res.json({ instance_id: parseInt(instanceId), data: inherited.rows[0].data || {}, exists: false, inherited: true, locked });
      }
      // Fallback: old data may be in supermarket_dispositifs (before instance-level migration)
      const supDisp = await pool.query(
        'SELECT data FROM supermarket_dispositifs WHERE supermarket_id = $1',
        [inst.supermarket_id]
      );
      if (supDisp.rows.length > 0 && supDisp.rows[0].data && Object.keys(supDisp.rows[0].data).length > 0) {
        return res.json({ instance_id: parseInt(instanceId), data: supDisp.rows[0].data, exists: false, inherited: true, locked });
      }
      return res.json({ instance_id: parseInt(instanceId), data: {}, exists: false, locked });
    }

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

    // Dispositifs: never use entries array logic, and propagate to future months only
    if (type === 'dispositifs') {
      const inst = access.instance;
      const now = new Date();
      const isFutureMonth = inst.year > now.getFullYear() || (inst.year === now.getFullYear() && inst.month > now.getMonth() + 1);
      if (isFutureMonth) {
        return res.status(403).json({ message: 'Impossible de modifier les dispositifs pour un mois futur' });
      }
      const dataStr = JSON.stringify(data);

      const existing = await pool.query(`SELECT id FROM dispositifs WHERE instance_id = $1`, [instanceId]);
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE dispositifs SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE instance_id = $2`,
          [dataStr, instanceId]
        );
      } else {
        await pool.query(`INSERT INTO dispositifs (instance_id, data) VALUES ($1, $2)`, [instanceId, dataStr]);
      }

      const futureInstances = await pool.query(`
        SELECT id FROM instances
        WHERE supermarket_id = $1
          AND (year > $2 OR (year = $2 AND month > $3))
      `, [inst.supermarket_id, inst.year, inst.month]);

      for (const row of futureInstances.rows) {
        const fut = await pool.query(`SELECT id FROM dispositifs WHERE instance_id = $1`, [row.id]);
        if (fut.rows.length > 0) {
          await pool.query(`UPDATE dispositifs SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE instance_id = $2`, [dataStr, row.id]);
        } else {
          await pool.query(`INSERT INTO dispositifs (instance_id, data) VALUES ($1, $2)`, [row.id, dataStr]);
        }
      }

      const result = await pool.query(`SELECT * FROM dispositifs WHERE instance_id = $1`, [instanceId]);
      return res.json(result.rows[0]);
    }

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
