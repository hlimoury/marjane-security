const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { DEMO_REGION, isScopedRole, rejectIfDemo } = require('../utils/access');
const {
  agentCanAccessStore,
  agentCanEditMonth,
  sealedCategories,
  notifyRegion,
  logAgentActivity,
  monthLabel,
} = require('../utils/agents');

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
    if (isScopedRole(req.user.role) && supermarket.rows[0].region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }
    if (!(await agentCanAccessStore(req.user, supermarket.rows[0].id, supermarket.rows[0].region))) {
      return res.status(403).json({ message: 'Acces refuse' });
    }
    if (!isScopedRole(req.user.role) && supermarket.rows[0].region === DEMO_REGION) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    const result = await pool.query(
      'SELECT * FROM instances WHERE supermarket_id = $1 ORDER BY year DESC, month DESC',
      [supermarketId]
    );
    const seals = {};
    if (result.rows.length > 0) {
      const sealed = await pool.query(
        'SELECT instance_id, category FROM data_seals WHERE instance_id = ANY($1)',
        [result.rows.map((row) => row.id)]
      );
      sealed.rows.forEach((row) => {
        if (!seals[row.instance_id]) seals[row.instance_id] = [];
        seals[row.instance_id].push(row.category);
      });
    }

    res.json(result.rows.map((row) => ({
      ...row,
      sealed_categories: seals[row.id] || [],
      can_edit: req.user.role === 'agent' ? agentCanEditMonth(req.user, row) : req.user.role !== 'city' && req.user.role !== 'demo',
    })));
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

    if (isScopedRole(req.user.role) && instance.supermarket_region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }
    if (!(await agentCanAccessStore(req.user, instance.supermarket_id, instance.supermarket_region))) {
      return res.status(403).json({ message: 'Acces refuse' });
    }
    if (!isScopedRole(req.user.role) && instance.supermarket_region === DEMO_REGION) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    // Check which characteristics have actual data (entries array not empty)
    const tables = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'controle_rm'];
    const status = {};

    for (const table of tables) {
      const check = await pool.query(
        `SELECT id FROM ${table} WHERE instance_id = $1 AND jsonb_array_length(COALESCE(data->'entries', '[]'::jsonb)) > 0`,
        [id]
      );
      status[table] = check.rows.length > 0;
    }

    // Dispositifs is instance-level — filled if a row exists for this instance
    const dispCheck = await pool.query(
      "SELECT id FROM dispositifs WHERE instance_id = $1",
      [id]
    );
    status.dispositifs = dispCheck.rows.length > 0;

    // Scoring is stored at supermarket level — check data is not empty

    const scorCheck = await pool.query(
      "SELECT id FROM supermarket_scoring WHERE supermarket_id = $1 AND data IS NOT NULL AND data != '{}'::jsonb",
      [instance.supermarket_id]
    );
    status.scoring = scorCheck.rows.length > 0;

    res.json({
      ...instance,
      caracteristiques_status: status,
      sealed_categories: await sealedCategories(instance.id),
      can_edit: req.user.role === 'agent' ? agentCanEditMonth(req.user, instance) : req.user.role !== 'city' && req.user.role !== 'demo',
    });
  } catch (err) {
    console.error('Erreur detail instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/instances - Create instance
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (rejectIfDemo(req, res)) return;
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
    if (req.user.role === 'agent' && !(await agentCanAccessStore(req.user, supermarket.rows[0].id, supermarket.rows[0].region))) {
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
      'INSERT INTO instances (supermarket_id, month, year, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [supermarket_id, month, year, req.user.role === 'agent' ? req.user.id : null]
    );

    if (req.user.role === 'agent') {
      const created = { ...result.rows[0], supermarket_name: supermarket.rows[0].name, region: supermarket.rows[0].region };
      await notifyRegion({
        agent: req.user,
        instance: created,
        kind: 'month',
        title: `${req.user.username} a créé ${monthLabel(month, year)} — ${supermarket.rows[0].name}`,
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur creation instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/instances/:id - Update instance (month/year)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (rejectIfDemo(req, res)) return;
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
    if (req.user.role === 'agent' && !agentCanEditMonth(req.user, instance.rows[0])) {
      return res.status(403).json({ message: instance.rows[0].validated_at ? 'Ce mois a été validé et ne peut plus être modifié' : 'Vous pouvez modifier seulement les mois que vous avez créés' });
    }
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

    if (req.user.role === 'agent') {
      const store = await pool.query('SELECT name FROM supermarkets WHERE id = $1', [instance.rows[0].supermarket_id]);
      await logAgentActivity({
        agent: req.user,
        action: 'month_updated',
        supermarketName: store.rows[0]?.name || null,
        details: `${req.user.username} a modifié le mois ${monthLabel(instance.rows[0].month, instance.rows[0].year)} en ${monthLabel(month, year)} — ${store.rows[0]?.name || ''}`,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur modification instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/instances/:id - Delete instance
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (rejectIfDemo(req, res)) return;
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
    if (req.user.role === 'agent' && !agentCanEditMonth(req.user, instance.rows[0])) {
      return res.status(403).json({ message: instance.rows[0].validated_at ? 'Ce mois a été validé et ne peut plus être supprimé' : 'Vous pouvez supprimer seulement les mois que vous avez créés' });
    }

    if (req.user.role === 'agent') {
      const store = await pool.query('SELECT name FROM supermarkets WHERE id = $1', [instance.rows[0].supermarket_id]);
      await logAgentActivity({
        agent: req.user,
        action: 'month_deleted',
        supermarketName: store.rows[0]?.name || null,
        details: `${req.user.username} a supprimé ${monthLabel(instance.rows[0].month, instance.rows[0].year)} — ${store.rows[0]?.name || ''}`,
      });
    }

    await pool.query('DELETE FROM instances WHERE id = $1', [id]);
    res.json({ message: 'Instance supprimee' });
  } catch (err) {
    console.error('Erreur suppression instance:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
