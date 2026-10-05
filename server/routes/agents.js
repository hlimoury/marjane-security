const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { CATEGORY_LABELS, monthLabel } = require('../utils/agents');

const router = express.Router();

const regionOnly = (req, res, next) => {
  if (req.user.role !== 'region') {
    return res.status(403).json({ message: 'Réservé aux comptes région' });
  }
  next();
};

const loadOwnedAgent = async (agentId, regionUserId) => {
  const result = await pool.query(
    `SELECT id, username, region, created_at
     FROM users
     WHERE id = $1 AND role = 'agent' AND parent_id = $2`,
    [agentId, regionUserId]
  );
  return result.rows[0] || null;
};

const validRegionStores = async (ids, region) => {
  const storeIds = [...new Set((ids || []).map(Number))].filter(Number.isInteger);
  if (storeIds.length === 0) return { error: 'Sélectionnez au moins un magasin' };
  const result = await pool.query(
    'SELECT id, name FROM supermarkets WHERE id = ANY($1) AND region = $2 ORDER BY name',
    [storeIds, region]
  );
  if (result.rows.length !== storeIds.length) {
    return { error: 'Un ou plusieurs magasins ne font pas partie de votre région' };
  }
  return { stores: result.rows };
};

router.get('/', authMiddleware, regionOnly, async (req, res) => {
  try {
    const agents = await pool.query(
      `SELECT id, username, created_at
       FROM users
       WHERE role = 'agent' AND parent_id = $1
       ORDER BY username`,
      [req.user.id]
    );
    if (agents.rows.length === 0) return res.json([]);
    const stores = await pool.query(
      `SELECT a.agent_id, s.id, s.name
       FROM agent_stores a
       JOIN supermarkets s ON s.id = a.supermarket_id
       WHERE a.agent_id = ANY($1)
       ORDER BY s.name`,
      [agents.rows.map((agent) => agent.id)]
    );
    const byAgent = {};
    stores.rows.forEach((store) => {
      if (!byAgent[store.agent_id]) byAgent[store.agent_id] = [];
      byAgent[store.agent_id].push({ id: store.id, name: store.name });
    });
    res.json(agents.rows.map((agent) => ({
      ...agent,
      supermarkets: byAgent[agent.id] || [],
    })));
  } catch (err) {
    console.error('Erreur liste agents:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/', authMiddleware, regionOnly, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const storeCheck = await validRegionStores(req.body.supermarketIds, req.user.region);
    if (!username || username.length < 3) {
      return res.status(400).json({ message: 'Nom d\'utilisateur trop court' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    if (storeCheck.error) return res.status(400).json({ message: storeCheck.error });

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Ce nom d\'utilisateur existe déjà' });
    }

    const hash = await bcrypt.hash(password, 10);
    const created = await pool.query(
      `INSERT INTO users (username, password_hash, role, region, parent_id)
       VALUES ($1, $2, 'agent', $3, $4)
       RETURNING id, username, created_at`,
      [username, hash, req.user.region, req.user.id]
    );
    const agent = created.rows[0];
    for (const store of storeCheck.stores) {
      await pool.query(
        'INSERT INTO agent_stores (agent_id, supermarket_id) VALUES ($1, $2)',
        [agent.id, store.id]
      );
    }
    res.status(201).json({ ...agent, supermarkets: storeCheck.stores });
  } catch (err) {
    console.error('Erreur creation agent:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id', authMiddleware, regionOnly, async (req, res) => {
  try {
    const agent = await loadOwnedAgent(req.params.id, req.user.id);
    if (!agent) return res.status(404).json({ message: 'Compte agent introuvable' });

    const storeCheck = await validRegionStores(req.body.supermarketIds, req.user.region);
    if (storeCheck.error) return res.status(400).json({ message: storeCheck.error });

    const password = String(req.body.password || '');
    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, agent.id]);
    }

    await pool.query('DELETE FROM agent_stores WHERE agent_id = $1', [agent.id]);
    for (const store of storeCheck.stores) {
      await pool.query(
        'INSERT INTO agent_stores (agent_id, supermarket_id) VALUES ($1, $2)',
        [agent.id, store.id]
      );
    }
    res.json({ ...agent, supermarkets: storeCheck.stores });
  } catch (err) {
    console.error('Erreur modification agent:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', authMiddleware, regionOnly, async (req, res) => {
  try {
    const agent = await loadOwnedAgent(req.params.id, req.user.id);
    if (!agent) return res.status(404).json({ message: 'Compte agent introuvable' });
    await pool.query('DELETE FROM users WHERE id = $1', [agent.id]);
    res.json({ message: 'Compte agent supprimé' });
  } catch (err) {
    console.error('Erreur suppression agent:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/notifications/count', authMiddleware, regionOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM agent_notifications WHERE region_user_id = $1 AND validated_at IS NULL',
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Erreur compte notifications:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/notifications', authMiddleware, regionOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, u.username AS agent_username, s.name AS supermarket_name, i.month, i.year
      FROM agent_notifications n
      JOIN users u ON u.id = n.agent_id
      JOIN supermarkets s ON s.id = n.supermarket_id
      JOIN instances i ON i.id = n.instance_id
      WHERE n.region_user_id = $1
      ORDER BY (n.validated_at IS NULL) DESC, n.created_at DESC
      LIMIT 150
    `, [req.user.id]);
    res.json(result.rows.map((row) => ({
      ...row,
      period: monthLabel(row.month, row.year),
      category_label: row.category ? (CATEGORY_LABELS[row.category] || row.category) : null,
    })));
  } catch (err) {
    console.error('Erreur notifications:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/notifications/:id/seen', authMiddleware, regionOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE agent_notifications
       SET is_seen = TRUE
       WHERE id = $1 AND region_user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Notification introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur notification vue:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/notifications/:id/validate', authMiddleware, regionOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const notice = await client.query(
      `SELECT * FROM agent_notifications
       WHERE id = $1 AND region_user_id = $2
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (notice.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Notification introuvable' });
    }
    const item = notice.rows[0];
    if (item.validated_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Déjà validé' });
    }

    if (item.kind === 'month') {
      await client.query(
        `UPDATE instances
         SET validated_at = CURRENT_TIMESTAMP, validated_by = $1
         WHERE id = $2`,
        [req.user.id, item.instance_id]
      );
    } else {
      await client.query(
        `INSERT INTO data_seals (instance_id, category, validated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (instance_id, category) DO NOTHING`,
        [item.instance_id, item.category, req.user.id]
      );
    }

    const updated = await client.query(
      `UPDATE agent_notifications
       SET validated_at = CURRENT_TIMESTAMP, is_seen = TRUE
       WHERE id = $1
       RETURNING *`,
      [item.id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur validation:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

module.exports = router;
